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
