/**
 * Tweet Caching Routes
 * 
 * API endpoints for caching tweets via TikHub and serving HTML snapshots.
 */

import { Hono } from 'hono';
import { TikHubService } from '../services/tikhub';
import { generateTweetSnapshot } from '../services/snapshot';
import { cacheMediaToR2, replaceMediaUrls } from '../services/imageCache';

type Bindings = {
    DB: D1Database;
    MEDIA_BUCKET: R2Bucket;
    TIKHUB_API_KEY: string;
    JWT_SECRET: string;
    WEB_APP_URL?: string;
};

const caching = new Hono<{ Bindings: Bindings }>();

// ============================================
// Public Routes (no auth required)
// ============================================

/**
 * GET /api/tweets/:tweet_id/snapshot
 * Serve the HTML snapshot for a cached tweet
 */
caching.get('/:tweet_id/snapshot', async (c) => {
    const tweetId = c.req.param('tweet_id');

    try {
        // Check if we have a cached snapshot
        const cached = await c.env.DB.prepare(
            'SELECT snapshot_r2_key FROM cached_tweets WHERE tweet_id = ?'
        ).bind(tweetId).first<{ snapshot_r2_key: string | null }>();

        if (!cached?.snapshot_r2_key) {
            return c.json({ error: 'Snapshot not found' }, 404);
        }

        // Fetch from R2
        const object = await c.env.MEDIA_BUCKET.get(cached.snapshot_r2_key);

        if (!object) {
            return c.json({ error: 'Snapshot file not found in storage' }, 404);
        }

        const html = await object.text();

        return new Response(html, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, max-age=86400, immutable', // Cache for 24 hours
            },
        });
    } catch (error) {
        console.error('[Caching] Error serving snapshot:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

/**
 * GET /api/tweets/:tweet_id/cached
 * Get cached tweet data as JSON (requires auth via middleware in main router)
 */
caching.get('/:tweet_id/cached', async (c) => {
    const tweetId = c.req.param('tweet_id');

    try {
        const cached = await c.env.DB.prepare(
            `SELECT 
				tweet_id,
				cached_data,
				comments_data,
				comments_count,
				has_media,
				has_video,
				has_quoted_tweet,
				cached_at,
				updated_at,
				snapshot_r2_key
			FROM cached_tweets WHERE tweet_id = ?`
        ).bind(tweetId).first();

        if (!cached) {
            return c.json({ error: 'Cached tweet not found' }, 404);
        }

        return c.json({
            success: true,
            tweet: {
                tweetId: cached.tweet_id,
                data: JSON.parse(cached.cached_data as string),
                comments: cached.comments_data ? JSON.parse(cached.comments_data as string) : null,
                commentsCount: cached.comments_count,
                hasMedia: !!cached.has_media,
                hasVideo: !!cached.has_video,
                hasQuotedTweet: !!cached.has_quoted_tweet,
                cachedAt: cached.cached_at,
                updatedAt: cached.updated_at,
                snapshotUrl: cached.snapshot_r2_key
                    ? `${c.env.WEB_APP_URL || 'https://tidyfeed.app'}/s/${tweetId}`
                    : null,
            },
        });
    } catch (error) {
        console.error('[Caching] Error fetching cached tweet:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

// ============================================
// Authenticated Routes (auth will be applied when mounting)
// ============================================

/**
 * POST /api/tweets/cache
 * Cache a tweet by fetching from TikHub API
 * 
 * Body: { tweet_id: string, include_comments?: boolean }
 */
caching.post('/cache', async (c) => {
    try {
        const { tweet_id, include_comments = false, force = false } = await c.req.json();

        if (!tweet_id) {
            return c.json({ error: 'tweet_id is required' }, 400);
        }

        // Check if TIKHUB_API_KEY is configured
        if (!c.env.TIKHUB_API_KEY) {
            return c.json({ error: 'TikHub API key not configured' }, 500);
        }

        // Clean tweet ID (extract from URL if needed)
        const cleanTweetId = tweet_id.trim().match(/status\/(\d+)/)?.[1] || tweet_id.trim();

        // Check if already cached and fresh (within 24 hours) - skip if force=true
        if (!force) {
            const existing = await c.env.DB.prepare(
                `SELECT cached_at, snapshot_r2_key FROM cached_tweets 
				 WHERE tweet_id = ? AND cached_at > datetime('now', '-24 hours')`
            ).bind(cleanTweetId).first<{ cached_at: string; snapshot_r2_key: string }>();

            if (existing?.snapshot_r2_key) {
                return c.json({
                    success: true,
                    cached: true,
                    message: 'Tweet already cached',
                    snapshotUrl: `${c.env.WEB_APP_URL || 'https://tidyfeed.app'}/s/${cleanTweetId}`,
                });
            }
        }

        // Fetch from TikHub
        const tikhub = new TikHubService(c.env.TIKHUB_API_KEY);
        const tweetData = await tikhub.fetchTweetDetail(cleanTweetId);

        if (!tweetData) {
            return c.json({ error: 'Failed to fetch tweet from TikHub' }, 502);
        }

        // Fetch comments if requested
        let comments: any[] = [];
        if (include_comments) {
            const commentsResult = await tikhub.fetchTweetComments(cleanTweetId);
            comments = commentsResult.comments;
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

        // Add comment author avatars
        for (const comment of comments) {
            if (comment.author?.profile_image_url) {
                avatarUrls.push(comment.author.profile_image_url.replace('_normal', '_bigger'));
            }
        }

        // Cache all images to R2
        const { urlMap, totalSize } = await cacheMediaToR2(c.env.MEDIA_BUCKET, cleanTweetId, allMedia, avatarUrls);

        // Replace URLs in tweet data with cached URLs
        const cachedTweetData = replaceMediaUrls(tweetData, urlMap);

        // Generate HTML snapshot with cached URLs
        const snapshotHtml = generateTweetSnapshot(cachedTweetData, comments, {
            includeComments: include_comments,
            theme: 'auto',
        });

        // Upload snapshot to R2
        const r2Key = `snapshots/${cleanTweetId}.html`;
        await c.env.MEDIA_BUCKET.put(r2Key, snapshotHtml, {
            httpMetadata: {
                contentType: 'text/html; charset=utf-8',
            },
        });

        // Determine metadata flags
        const hasMedia = !!(tweetData.media && tweetData.media.length > 0);
        const hasVideo = tweetData.media?.some(m => m.type === 'video' || m.type === 'animated_gif') || false;
        const hasQuotedVideo = tweetData.quoted_tweet?.media?.some(m => m.type === 'video' || m.type === 'animated_gif') || false;
        const hasQuotedTweet = !!tweetData.quoted_tweet;

        // Upsert into database
        await c.env.DB.prepare(`
			INSERT INTO cached_tweets (
				tweet_id, cached_data, snapshot_r2_key, comments_data, 
				comments_count, has_media, has_video, has_quoted_tweet, media_size
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(tweet_id) DO UPDATE SET
				cached_data = excluded.cached_data,
				snapshot_r2_key = excluded.snapshot_r2_key,
				comments_data = excluded.comments_data,
				comments_count = excluded.comments_count,
				has_media = excluded.has_media,
				has_video = excluded.has_video,
				has_quoted_tweet = excluded.has_quoted_tweet,
				media_size = excluded.media_size,
				updated_at = CURRENT_TIMESTAMP
		`).bind(
            cleanTweetId,
            JSON.stringify(cachedTweetData),
            r2Key,
            comments.length > 0 ? JSON.stringify(comments) : null,
            comments.length,
            hasMedia ? 1 : 0,
            hasVideo || hasQuotedVideo ? 1 : 0,
            hasQuotedTweet ? 1 : 0,
            totalSize
        ).run();

        // Queue video downloads for Python worker (if any videos detected)
        if (hasVideo || hasQuotedVideo) {
            const videosToQueue: { videoUrl: string; key: string; thumbnailUrl?: string }[] = [];

            // Main tweet videos
            const mainMedia = tweetData.media || [];
            mainMedia.forEach((media, index) => {
                if (media.type === 'video' || media.type === 'animated_gif') {
                    const videoUrl = TikHubService.getBestVideoUrl(media);
                    if (videoUrl) {
                        // Get cached thumbnail URL from urlMap
                        const thumbnailUrl = media.preview_url ? (urlMap.get(media.preview_url) || media.preview_url) : undefined;
                        videosToQueue.push({ videoUrl, key: `${index}`, thumbnailUrl });
                    }
                }
            });

            // Quoted tweet videos
            const quotedMedia = tweetData.quoted_tweet?.media || [];
            quotedMedia.forEach((media, index) => {
                if (media.type === 'video' || media.type === 'animated_gif') {
                    const videoUrl = TikHubService.getBestVideoUrl(media);
                    if (videoUrl) {
                        // Get cached thumbnail URL from urlMap
                        const thumbnailUrl = media.preview_url ? (urlMap.get(media.preview_url) || media.preview_url) : undefined;
                        videosToQueue.push({ videoUrl, key: `quoted_${index}`, thumbnailUrl });
                    }
                }
            });

            // Update tweetData with predicted URLs immediately
            // For tidyfeed.app, use api.tidyfeed.app; otherwise prepend 'api.' to domain
            const webAppUrl = c.env.WEB_APP_URL || 'https://tidyfeed.app';
            const apiUrl = webAppUrl.includes('tidyfeed.app')
                ? 'https://api.tidyfeed.app'
                : webAppUrl.replace(/^(https?:\/\/)([^/]+)/, '$1api.$2');
            let dataUpdated = false;

            videosToQueue.forEach(({ videoUrl, key }) => {
                // key is now "0", "1", ... or "quoted_0", "quoted_1", ...
                const predictedUrl = `${apiUrl}/api/videos/${cleanTweetId}/${key}.mp4`;

                // Helper to update media URL
                const updateMedia = (mediaList: any[]) => {
                    mediaList.forEach(m => {
                        if ((m.type === 'video' || m.type === 'animated_gif') && m.video_info?.variants) {
                            const hasMatchingVariant = m.video_info.variants.some((v: any) => v.url === videoUrl);

                            if (hasMatchingVariant) {
                                // Replace ALL mp4 variants with our cached URL
                                // This ensures the snapshot will pick it up regardless of bitrate sorting
                                m.video_info.variants.forEach((v: any) => {
                                    if (v.content_type === 'video/mp4') {
                                        v.url = predictedUrl;
                                        dataUpdated = true;
                                    }
                                });
                            }
                        }
                    });
                };

                if (cachedTweetData.media) updateMedia(cachedTweetData.media);
                if (cachedTweetData.quoted_tweet?.media) updateMedia(cachedTweetData.quoted_tweet.media);
            });

            // If we updated URLs, re-generate snapshot IMMEDIATELY with predicted URLs
            if (dataUpdated) {
                // Update cached_data in DB with the updated cachedTweetData
                await c.env.DB.prepare(
                    `UPDATE cached_tweets SET cached_data = ?, updated_at = CURRENT_TIMESTAMP WHERE tweet_id = ?`
                ).bind(JSON.stringify(cachedTweetData), cleanTweetId).run();

                // Regenerate snapshot with cachedTweetData (has both cached image URLs and predicted video URLs)
                const snapshotHtml = generateTweetSnapshot(cachedTweetData, comments, {
                    includeComments: include_comments,
                    theme: 'auto',
                });

                // Upload updated snapshot
                await c.env.MEDIA_BUCKET.put(r2Key, snapshotHtml, {
                    httpMetadata: { contentType: 'text/html; charset=utf-8' },
                });
                console.log(`[Caching] Regenerated snapshot with predicted video URLs for ${cleanTweetId}`);
            } else {
                // debugLogs.push removed
            }

            for (const { videoUrl, key, thumbnailUrl } of videosToQueue) {
                try {
                    // Build metadata with video_index and optional thumbnail_url
                    const metadata = { video_index: key, ...(thumbnailUrl && { thumbnail_url: thumbnailUrl }) };

                    // Check if task already exists
                    const existingTask = await c.env.DB.prepare(
                        `SELECT id, metadata, status, r2_key FROM video_downloads WHERE tweet_id = ? AND video_url = ? AND task_type = 'snapshot_video' AND status != 'invalid' LIMIT 1`
                    ).bind(cleanTweetId, videoUrl).first<{ id: number; metadata: string | null; status: string; r2_key: string | null }>();

                    if (!existingTask) {
                        await c.env.DB.prepare(
                            `INSERT INTO video_downloads (user_id, tweet_url, task_type, tweet_id, video_url, status, metadata)
                             VALUES (?, ?, 'snapshot_video', ?, ?, 'pending', ?)`
                        ).bind('system', `https://x.com/i/status/${cleanTweetId}`, cleanTweetId, videoUrl, JSON.stringify(metadata)).run();
                        console.log(`[Caching] Queued video download for tweet ${cleanTweetId} (index ${key})`);
                    } else {
                        // Check if R2 key matches expected key
                        // Expected: videos/{tweet_id}/{key}.mp4
                        // Use a loose check on extension since it might be m3u8 or something else in theory, 
                        // but strictly we expect internal uploads to match `key`.
                        // The worker uploads to `videos/{tweet_id}/{videoIndex}.{ext}`.
                        // So checking if r2_key contains `/${key}.` is sufficient.

                        const expectedKeyPart = `/${key}.`;
                        const needsRedownload = !existingTask.r2_key || !existingTask.r2_key.includes(expectedKeyPart);

                        if (needsRedownload) {
                            console.log(`[Caching] Existing video has wrong filename (${existingTask.r2_key}), forcing re-download as ${key}`);
                            await c.env.DB.prepare(
                                `UPDATE video_downloads SET metadata = ?, status = 'pending', r2_key = NULL WHERE id = ?`
                            ).bind(JSON.stringify(metadata), existingTask.id).run();
                        } else {
                            // Key matches, just update metadata (idempotent)
                            await c.env.DB.prepare(
                                `UPDATE video_downloads SET metadata = ? WHERE id = ?`
                            ).bind(JSON.stringify(metadata), existingTask.id).run();
                            console.log(`[Caching] Updated metadata for existing task ${existingTask.id} (index ${key})`);
                        }
                    }
                } catch (err) {
                    console.error(`[Caching] Failed to queue video:`, err);
                }
            }
        }

        console.log(`[Caching] Cached tweet ${cleanTweetId} with ${urlMap.size} images and ${comments.length} comments`);

        const webAppUrl = c.env.WEB_APP_URL || 'https://tidyfeed.app';

        return c.json({
            success: true,
            cached: true,
            tweetId: cleanTweetId,
            snapshotUrl: `${webAppUrl}/s/${cleanTweetId}`,
            hasMedia,
            hasVideo,
            hasQuotedTweet,
            commentsCount: comments.length,
        });
    } catch (error) {
        console.error('[Caching] Error caching tweet:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

/**
 * DELETE /api/tweets/:tweet_id/cache
 * Remove a cached tweet and its snapshot
 */
caching.delete('/:tweet_id/cache', async (c) => {
    const tweetId = c.req.param('tweet_id');

    try {
        // Get R2 key before deleting
        const cached = await c.env.DB.prepare(
            'SELECT snapshot_r2_key FROM cached_tweets WHERE tweet_id = ?'
        ).bind(tweetId).first<{ snapshot_r2_key: string | null }>();

        if (!cached) {
            return c.json({ error: 'Cached tweet not found' }, 404);
        }

        // Delete from R2 if exists
        if (cached.snapshot_r2_key) {
            await c.env.MEDIA_BUCKET.delete(cached.snapshot_r2_key);
        }

        // Delete from database
        await c.env.DB.prepare(
            'DELETE FROM cached_tweets WHERE tweet_id = ?'
        ).bind(tweetId).run();

        return c.json({ success: true, message: 'Cache deleted' });
    } catch (error) {
        console.error('[Caching] Error deleting cache:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

/**
 * GET /api/tweets/cached/stats
 * Get caching statistics (for user dashboard)
 */
caching.get('/cached/stats', async (c) => {
    try {
        const stats = await c.env.DB.prepare(`
			SELECT 
				COUNT(*) as total_cached,
				SUM(has_media) as with_media,
				SUM(has_video) as with_video,
				SUM(has_quoted_tweet) as with_quotes,
				SUM(comments_count) as total_comments
			FROM cached_tweets
		`).first<{
            total_cached: number;
            with_media: number;
            with_video: number;
            with_quotes: number;
            total_comments: number;
        }>();

        return c.json({
            success: true,
            stats: {
                totalCached: stats?.total_cached || 0,
                withMedia: stats?.with_media || 0,
                withVideo: stats?.with_video || 0,
                withQuotes: stats?.with_quotes || 0,
                totalComments: stats?.total_comments || 0,
            },
        });
    } catch (error) {
        console.error('[Caching] Error fetching stats:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

export default caching;
