/**
 * Internal Service Routes
 * 
 * Protected endpoints for internal services (bot worker, video worker, etc.)
 * All routes require INTERNAL_SERVICE_KEY authentication.
 */

import { Hono } from 'hono';

type Bindings = {
    DB: D1Database;
    INTERNAL_SERVICE_KEY: string;
    TIKHUB_API_KEY?: string;
    MEDIA_BUCKET?: R2Bucket;
};

const internal = new Hono<{ Bindings: Bindings }>();

// ============================================
// Internal Service Auth Middleware
// ============================================
const internalServiceAuth = async (c: any, next: any) => {
    const serviceKey = c.req.header('X-Service-Key');

    if (!serviceKey || serviceKey !== c.env.INTERNAL_SERVICE_KEY) {
        return c.json({ error: 'Forbidden: Invalid service key' }, 403);
    }

    await next();
};

// Apply auth to all routes
internal.use('*', internalServiceAuth);

// ============================================
// Bot Save Endpoint
// ============================================

/**
 * POST /api/internal/bot-save
 * 
 * Called by tidyfeed-bot-worker when a user mentions @tidyfeedapp
 * to save a tweet/thread.
 * 
 * Payload:
 * {
 *   "handle": "elonmusk",           // Twitter handle (without @)
 *   "tweet_url": "https://x.com/...",
 *   "tweet_text": "...",            // Optional: tweet content
 *   "media_urls": ["..."],          // Optional: media URLs
 *   "author_handle": "...",         // Optional: original tweet author
 *   "author_name": "..."            // Optional: author display name
 * }
 */
internal.post('/bot-save', async (c) => {
    try {
        const body = await c.req.json();
        const { handle, tweet_url, tweet_text, media_urls, author_handle, author_name, mention_id } = body;

        // Validate required fields
        if (!handle) {
            return c.json({ error: 'handle is required' }, 400);
        }
        if (!tweet_url) {
            return c.json({ error: 'tweet_url is required' }, 400);
        }

        // Check if this mention was already processed (database-based deduplication)
        if (mention_id) {
            const alreadyProcessed = await c.env.DB.prepare(
                'SELECT 1 FROM bot_processed_mentions WHERE mention_id = ?'
            ).bind(mention_id).first();

            if (alreadyProcessed) {
                console.log(`[Bot] Mention ${mention_id} already processed, skipping`);
                return c.json({
                    success: true,
                    already_processed: true,
                    message: 'Mention already processed'
                });
            }
        }

        // Normalize handle: remove @ and lowercase
        const normalizedHandle = handle.replace(/^@/, '').toLowerCase();

        console.log(`[Bot] Save request: @${normalizedHandle} -> ${tweet_url}`);

        // Look up user by X account in social_accounts table
        const socialAccount = await c.env.DB.prepare(
            `SELECT user_id FROM social_accounts 
             WHERE platform = 'x' AND LOWER(platform_username) = ?`
        ).bind(normalizedHandle).first<{ user_id: string }>();

        // Mark mention as processed regardless of outcome (if mention_id provided)
        if (mention_id) {
            await c.env.DB.prepare(
                'INSERT OR IGNORE INTO bot_processed_mentions (mention_id) VALUES (?)'
            ).bind(mention_id).run();
        }

        if (!socialAccount) {
            console.log(`[Bot] User not found for handle: @${normalizedHandle}`);
            return c.json({
                success: true,
                user_found: false,
                message: 'Twitter handle not linked to any TidyFeed account'
            });
        }

        const userId = socialAccount.user_id;

        // Extract tweet ID from URL
        const tweetIdMatch = tweet_url.match(/status\/(\d+)/);
        const xPostId = tweetIdMatch ? tweetIdMatch[1] : tweet_url;

        // Check if already saved
        const existing = await c.env.DB.prepare(
            'SELECT id FROM saved_posts WHERE user_id = ? AND x_post_id = ?'
        ).bind(userId, xPostId).first();

        if (existing) {
            console.log(`[Bot] Tweet already saved for user ${userId}`);
            return c.json({
                success: true,
                user_found: true,
                already_saved: true,
                message: 'Tweet was already saved'
            });
        }

        // Build author info JSON
        const authorInfo = author_handle || author_name ? JSON.stringify({
            handle: author_handle || null,
            name: author_name || null
        }) : null;

        // Build media URLs JSON
        const mediaJson = media_urls && media_urls.length > 0
            ? JSON.stringify(media_urls)
            : null;

        // Insert into saved_posts
        await c.env.DB.prepare(
            `INSERT INTO saved_posts (user_id, x_post_id, content, media_urls, author_info, url)
             VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(
            userId,
            xPostId,
            tweet_text || null,
            mediaJson,
            authorInfo,
            tweet_url
        ).run();

        console.log(`[Bot] Saved tweet ${xPostId} for user ${userId}`);

        // Trigger auto-caching in background (non-blocking)
        if (c.env.TIKHUB_API_KEY && c.env.MEDIA_BUCKET) {
            c.executionCtx.waitUntil((async () => {
                try {
                    // Check if already cached
                    const existing = await c.env.DB.prepare(
                        `SELECT snapshot_r2_key FROM cached_tweets WHERE tweet_id = ?`
                    ).bind(xPostId).first<{ snapshot_r2_key: string | null }>();

                    if (existing?.snapshot_r2_key) {
                        console.log(`[Bot/AutoCache] Tweet ${xPostId} already cached, skipping`);
                        return;
                    }

                    const { TikHubService } = await import('../services/tikhub');
                    const { generateTweetSnapshot } = await import('../services/snapshot');
                    const { cacheMediaToR2, replaceMediaUrls } = await import('../services/imageCache');

                    const tikhub = new TikHubService(c.env.TIKHUB_API_KEY!);
                    const tweetData = await tikhub.fetchTweetDetail(xPostId);

                    if (!tweetData) {
                        console.log(`[Bot/AutoCache] Failed to fetch tweet ${xPostId}`);
                        return;
                    }

                    // Collect all media items and avatar URLs
                    const allMedia = [...(tweetData.media || [])];
                    const avatarUrls: string[] = [];

                    if (tweetData.author?.profile_image_url) {
                        avatarUrls.push(tweetData.author.profile_image_url.replace('_normal', '_bigger'));
                    }

                    if (tweetData.quoted_tweet) {
                        if (tweetData.quoted_tweet.media) {
                            allMedia.push(...tweetData.quoted_tweet.media);
                        }
                        if (tweetData.quoted_tweet.author?.profile_image_url) {
                            avatarUrls.push(tweetData.quoted_tweet.author.profile_image_url.replace('_normal', '_bigger'));
                        }
                    }

                    // Cache all images to R2
                    const urlMap = await cacheMediaToR2(c.env.MEDIA_BUCKET!, xPostId, allMedia, avatarUrls);

                    // Replace URLs in tweet data with cached URLs
                    const cachedTweetData = replaceMediaUrls(tweetData, urlMap);

                    const snapshotHtml = generateTweetSnapshot(cachedTweetData, [], {
                        includeComments: false,
                        theme: 'auto',
                    });

                    const r2Key = `snapshots/${xPostId}.html`;
                    await c.env.MEDIA_BUCKET!.put(r2Key, snapshotHtml, {
                        httpMetadata: { contentType: 'text/html; charset=utf-8' },
                    });

                    const hasMedia = !!(tweetData.media && tweetData.media.length > 0);
                    const hasVideo = tweetData.media?.some(m => m.type === 'video' || m.type === 'animated_gif') || false;
                    const hasQuotedTweet = !!tweetData.quoted_tweet;

                    await c.env.DB.prepare(`
                        INSERT INTO cached_tweets (tweet_id, cached_data, snapshot_r2_key, comments_data, comments_count, has_media, has_video, has_quoted_tweet)
                        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                        ON CONFLICT(tweet_id) DO UPDATE SET cached_data = excluded.cached_data, snapshot_r2_key = excluded.snapshot_r2_key, updated_at = CURRENT_TIMESTAMP
                    `).bind(xPostId, JSON.stringify(tweetData), r2Key, null, 0, hasMedia ? 1 : 0, hasVideo ? 1 : 0, hasQuotedTweet ? 1 : 0).run();

                    console.log(`[Bot/AutoCache] Successfully cached tweet ${xPostId} with ${urlMap.size} images`);
                } catch (err) {
                    console.error(`[Bot/AutoCache] Error caching ${xPostId}:`, err);
                }
            })());
        }

        return c.json({
            success: true,
            user_found: true,
            saved: true,
            message: 'Tweet saved successfully'
        });

    } catch (error) {
        console.error('[Bot] Error in bot-save:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

/**
 * GET /api/internal/health
 * 
 * Simple health check for internal services.
 */
internal.get('/health', async (c) => {
    return c.json({ status: 'ok', service: 'tidyfeed-backend' });
});

export default internal;
