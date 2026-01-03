/**
 * Cloud Video Downloader Routes
 * Handles video download tasks with temporary cookie escrow
 */

import { Hono } from 'hono';
import { verify } from 'hono/jwt';

type Bindings = {
    DB: D1Database;
    JWT_SECRET: string;
    MEDIA_BUCKET: R2Bucket;
    INTERNAL_SERVICE_KEY: string;
};

const downloads = new Hono<{ Bindings: Bindings }>();

// ============================================
// Auth Middleware (Cookie or Bearer Token)
// ============================================
const cookieAuthMiddleware = async (c: any, next: any) => {
    let token: string | undefined;

    // 1. Try Authorization Header
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    }

    // 2. Try Cookie if header missing
    if (!token) {
        const cookieHeader = c.req.header('Cookie');
        if (cookieHeader) {
            const cookies = Object.fromEntries(
                cookieHeader.split(';').map((c: string) => {
                    const [key, ...val] = c.trim().split('=');
                    return [key, val.join('=')];
                })
            );
            token = cookies['auth_token'];
        }
    }

    if (!token) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
        const payload = await verify(token, c.env.JWT_SECRET);
        c.set('jwtPayload', payload);
        await next();
    } catch (error) {
        return c.json({ error: 'Invalid token' }, 401);
    }
};

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

// ============================================
// User Endpoints
// ============================================

/**
 * POST /api/downloads/queue
 * Queue a new video download task
 * Auth: User (Cookie/Bearer)
 */
downloads.post('/queue', cookieAuthMiddleware, async (c) => {
    try {
        const payload = c.get('jwtPayload') as { sub: string };
        const userId = payload.sub;

        const { tweet_url, cookies, saved_post_id } = await c.req.json();

        // Validate URL
        if (!tweet_url) {
            return c.json({ error: 'tweet_url is required' }, 400);
        }

        // Basic URL validation for Twitter/X
        const urlPattern = /^https?:\/\/(twitter\.com|x\.com)\/\w+\/status\/\d+/i;
        if (!urlPattern.test(tweet_url)) {
            return c.json({ error: 'Invalid tweet URL format' }, 400);
        }

        if (!cookies) {
            return c.json({ error: 'cookies are required for video download' }, 400);
        }

        // Check Storage Quota (1GB)
        const user = await c.env.DB.prepare('SELECT storage_usage FROM users WHERE id = ?').bind(userId).first<{ storage_usage: number }>();
        const STORAGE_LIMIT = 1073741824; // 1 GB
        if ((user?.storage_usage || 0) >= STORAGE_LIMIT) {
            return c.json({ error: 'Storage quota exceeded (1GB limit). Please delete some videos to free up space.' }, 403);
        }

        // Check if this video has already been downloaded (completed)
        const existingDownload = await c.env.DB.prepare(
            `SELECT r2_key, metadata FROM video_downloads 
             WHERE tweet_url = ? AND status = 'completed' 
             ORDER BY id DESC LIMIT 1`
        ).bind(tweet_url).first<{ r2_key: string; metadata: string }>();

        let result;

        if (existingDownload && existingDownload.r2_key) {
            // Reuse existing download
            result = await c.env.DB.prepare(
                `INSERT INTO video_downloads (user_id, tweet_url, twitter_cookies, status, saved_post_id, r2_key, metadata)
                 VALUES (?, ?, ?, 'completed', ?, ?, ?)`
            ).bind(
                userId,
                tweet_url,
                cookies, // Still keeping cookies for record, or could be null if schema allows
                saved_post_id || null,
                existingDownload.r2_key,
                existingDownload.metadata
            ).run();
        } else {
            // New download task
            result = await c.env.DB.prepare(
                `INSERT INTO video_downloads (user_id, tweet_url, twitter_cookies, status, saved_post_id)
                 VALUES (?, ?, ?, 'pending', ?)`
            ).bind(userId, tweet_url, cookies, saved_post_id || null).run();
        }

        const taskId = result.meta.last_row_id;

        return c.json({
            success: true,
            task_id: taskId,
            message: 'Video download queued'
        });
    } catch (error) {
        console.error('Queue download error:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

/**
 * GET /api/downloads/status/:id
 * Get download task status (for polling by extension)
 * Auth: User (Cookie/Bearer)
 */
downloads.get('/status/:id', cookieAuthMiddleware, async (c) => {
    try {
        const payload = c.get('jwtPayload') as { sub: string };
        const userId = payload.sub;
        const taskId = c.req.param('id');

        const task = await c.env.DB.prepare(
            `SELECT id, status, r2_key, metadata, error_message, created_at, completed_at
			 FROM video_downloads
			 WHERE id = ? AND user_id = ?`
        ).bind(taskId, userId).first();

        if (!task) {
            return c.json({ error: 'Task not found' }, 404);
        }

        return c.json({ task });
    } catch (error) {
        console.error('Get status error:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

/**
 * GET /api/downloads/list
 * Get all download tasks for the user
 * Auth: User (Cookie/Bearer)
 */
downloads.get('/list', cookieAuthMiddleware, async (c) => {
    try {
        const payload = c.get('jwtPayload') as { sub: string };
        const userId = payload.sub;

        const tasks = await c.env.DB.prepare(
            `SELECT id, tweet_url, status, r2_key, metadata, error_message, created_at, completed_at
             FROM video_downloads
             WHERE user_id = ?
             ORDER BY created_at DESC
             LIMIT 50`
        ).bind(userId).all();

        return c.json({
            downloads: tasks.results?.map((task: any) => ({
                ...task,
                metadata: task.metadata ? JSON.parse(task.metadata) : null
            })) || []
        });
    } catch (error) {
        console.error('Get downloads list error:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

/**
 * GET /api/downloads/media/:id
 * Get presigned URL for video playback
 * Auth: User (Cookie/Bearer)
 */
downloads.get('/media/:id', cookieAuthMiddleware, async (c) => {
    try {
        const payload = c.get('jwtPayload') as { sub: string };
        const userId = payload.sub;
        const taskId = c.req.param('id');

        // Check ownership and get R2 key
        const task = await c.env.DB.prepare(
            `SELECT id, r2_key, status FROM video_downloads
             WHERE id = ? AND user_id = ?`
        ).bind(taskId, userId).first<{ id: number; r2_key: string; status: string }>();

        if (!task) {
            return c.json({ error: 'Download not found' }, 404);
        }

        if (task.status !== 'completed') {
            return c.json({ error: 'Download not ready', status: task.status }, 400);
        }

        if (!task.r2_key) {
            return c.json({ error: 'No media file available' }, 404);
        }

        // Get object from R2 and redirect or stream
        // For simplicity, we'll use a signed URL approach via R2 public bucket or direct streaming

        // Option 1: If bucket is public, return direct URL
        // Option 2: Stream the file through the worker

        // For now, let's stream directly through the worker
        const object = await c.env.MEDIA_BUCKET.get(task.r2_key);

        if (!object) {
            return c.json({ error: 'Video file not found in storage' }, 404);
        }

        // Return video stream with proper headers
        const headers = new Headers();
        headers.set('Content-Type', 'video/mp4');
        headers.set('Content-Length', String(object.size));
        headers.set('Accept-Ranges', 'bytes');
        headers.set('Cache-Control', 'private, max-age=3600');

        return new Response(object.body, {
            status: 200,
            headers
        });
    } catch (error) {
        console.error('Get media error:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

/**
 * GET /api/downloads/usage
 * Get user storage usage info
 * Auth: User (Cookie/Bearer)
 */
downloads.get('/usage', cookieAuthMiddleware, async (c) => {
    try {
        const payload = c.get('jwtPayload') as { sub: string };
        const userId = payload.sub;

        const user = await c.env.DB.prepare('SELECT storage_usage FROM users WHERE id = ?').bind(userId).first<{ storage_usage: number }>();
        const STORAGE_LIMIT = 1073741824; // 1 GB

        return c.json({
            usage: user?.storage_usage || 0,
            limit: STORAGE_LIMIT
        });
    } catch (error) {
        console.error('Get usage error:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

// ============================================
// Internal Service Endpoints (Python Worker)
// ============================================

/**
 * GET /api/internal/next-task
 * Get next pending task for processing
 * Auth: Internal Service Key
 */
downloads.get('/internal/next-task', internalServiceAuth, async (c) => {
    try {
        // Find one pending task and atomically update to processing
        const task = await c.env.DB.prepare(
            `SELECT id, user_id, tweet_url, twitter_cookies, task_type, tweet_id, video_url
			 FROM video_downloads
			 WHERE status = 'pending'
			 ORDER BY created_at ASC
			 LIMIT 1`
        ).first<{
            id: number;
            user_id: string;
            tweet_url: string;
            twitter_cookies: string;
            task_type: string;
            tweet_id: string;
            video_url: string;
        }>();

        if (!task) {
            return c.json({ task: null, message: 'No pending tasks' });
        }

        // Update status to processing
        await c.env.DB.prepare(
            `UPDATE video_downloads SET status = 'processing' WHERE id = ?`
        ).bind(task.id).run();

        return c.json({
            task: {
                id: task.id,
                user_id: task.user_id,
                tweet_url: task.tweet_url,
                cookies: task.twitter_cookies,
                task_type: task.task_type || 'user_download',
                tweet_id: task.tweet_id,
                video_url: task.video_url
            }
        });
    } catch (error) {
        console.error('Get next task error:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

/**
 * PUT /api/internal/upload-url
 * Generate presigned URL for R2 upload
 * Auth: Internal Service Key
 */
downloads.put('/internal/upload-url', internalServiceAuth, async (c) => {
    try {
        const { task_id, filename } = await c.req.json();

        if (!task_id) {
            return c.json({ error: 'task_id is required' }, 400);
        }

        // Get task to verify it exists and get user_id/tweet_id for path
        const task = await c.env.DB.prepare(
            `SELECT id, user_id, task_type, tweet_id FROM video_downloads WHERE id = ?`
        ).bind(task_id).first<{ id: number; user_id: string; task_type: string; tweet_id: string }>();

        if (!task) {
            return c.json({ error: 'Task not found' }, 404);
        }

        // Generate R2 key based on task type
        const extension = filename?.split('.').pop() || 'mp4';
        let key: string;

        if (task.task_type === 'snapshot_video' && task.tweet_id) {
            // For snapshot videos, use tweet_id so the /api/videos/:tweetId/:filename endpoint works
            key = `videos/${task.tweet_id}/${task_id}.${extension}`;
        } else {
            // For user downloads, use user_id
            key = `videos/${task.user_id}/${task_id}.${extension}`;
        }

        // Note: R2 presigned URLs require additional setup.
        // For now, we return the key and the Python worker will upload directly
        // using R2's S3-compatible API with credentials.

        return c.json({
            key,
            bucket: 'tidyfeed-media',
            message: 'Use S3-compatible API to upload to this key'
        });
    } catch (error) {
        console.error('Generate upload URL error:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

/**
 * POST /api/internal/complete
 * Mark task as completed and WIPE cookies immediately
 * Auth: Internal Service Key
 * 
 * SECURITY: This endpoint MUST set twitter_cookies = NULL
 */
downloads.post('/internal/complete', internalServiceAuth, async (c) => {
    try {
        const { task_id, status, r2_key, metadata, error_message, file_size } = await c.req.json();

        if (!task_id) {
            return c.json({ error: 'task_id is required' }, 400);
        }

        if (!status || !['completed', 'failed'].includes(status)) {
            return c.json({ error: 'status must be "completed" or "failed"' }, 400);
        }

        // SECURITY: Always wipe cookies, regardless of success or failure
        // Transaction to update task and increment user storage usage if completed
        const statements = [
            c.env.DB.prepare(
                `UPDATE video_downloads 
                 SET status = ?,
                     r2_key = ?,
                     metadata = ?,
                     error_message = ?,
                     file_size = ?,
                     twitter_cookies = NULL,
                     completed_at = strftime('%s', 'now')
                 WHERE id = ? AND status != 'invalid'`
            ).bind(
                status,
                r2_key || null,
                metadata ? JSON.stringify(metadata) : null,
                error_message || null,
                file_size || 0,
                task_id
            )
        ];

        // If completed successfully and file size is provided, increment user storage
        if (status === 'completed' && file_size && file_size > 0) {
            statements.push(
                c.env.DB.prepare(
                    `UPDATE users 
                     SET storage_usage = storage_usage + ? 
                     WHERE id = (SELECT user_id FROM video_downloads WHERE id = ?)`
                ).bind(file_size, task_id)
            );
        }

        const results = await c.env.DB.batch(statements);

        // batch returns array of results. the first one is the update to video_downloads
        if (results[0].meta.changes === 0) {
            return c.json({ error: 'Task not found' }, 404);
        }

        // For snapshot_video tasks, update the cached_tweets table with the R2 video URL
        if (status === 'completed' && r2_key) {
            // Get task details
            const task = await c.env.DB.prepare(
                `SELECT task_type, tweet_id, video_url FROM video_downloads WHERE id = ?`
            ).bind(task_id).first<{ task_type: string; tweet_id: string; video_url: string }>();

            if (task?.task_type === 'snapshot_video' && task.tweet_id) {
                try {
                    // Construct the cached video URL
                    const filename = r2_key.split('/').pop();
                    const cachedVideoUrl = `https://api.tidyfeed.app/api/videos/${task.tweet_id}/${filename}`;

                    // Get current cached_data and update video URLs
                    const cachedTweet = await c.env.DB.prepare(
                        `SELECT cached_data FROM cached_tweets WHERE tweet_id = ?`
                    ).bind(task.tweet_id).first<{ cached_data: string }>();

                    if (cachedTweet?.cached_data) {
                        const tweetData = JSON.parse(cachedTweet.cached_data);
                        let updated = false;

                        // Helper function to update video URLs in media array
                        const updateMediaVideoUrls = (mediaArray: any[]) => {
                            for (const m of mediaArray) {
                                if ((m.type === 'video' || m.type === 'animated_gif') && m.video_info?.variants) {
                                    // Check if any variant URL matches the task video_url
                                    const hasMatchingVariant = m.video_info.variants.some(
                                        (v: any) => v.url === task.video_url
                                    );
                                    if (hasMatchingVariant) {
                                        // Update ALL variants to use cached URL (replace high-quality one)
                                        for (const variant of m.video_info.variants) {
                                            if (variant.content_type === 'video/mp4') {
                                                variant.url = cachedVideoUrl;
                                                updated = true;
                                            }
                                        }
                                    }
                                }
                            }
                        };

                        // Update video URLs in main tweet media
                        if (tweetData.media) {
                            updateMediaVideoUrls(tweetData.media);
                        }

                        // Also check quoted_tweet media
                        if (tweetData.quoted_tweet?.media) {
                            updateMediaVideoUrls(tweetData.quoted_tweet.media);
                        }

                        if (updated) {
                            await c.env.DB.prepare(
                                `UPDATE cached_tweets SET cached_data = ?, updated_at = CURRENT_TIMESTAMP WHERE tweet_id = ?`
                            ).bind(JSON.stringify(tweetData), task.tweet_id).run();
                            console.log(`[SnapshotVideo] Updated cached_tweets with R2 video URL for tweet ${task.tweet_id}`);

                            // Regenerate HTML snapshot with new video URLs
                            try {
                                const { generateTweetSnapshot } = await import('../services/snapshot');

                                // Get comments if any
                                const commentsRow = await c.env.DB.prepare(
                                    `SELECT comments_data FROM cached_tweets WHERE tweet_id = ?`
                                ).bind(task.tweet_id).first<{ comments_data: string | null }>();

                                const comments = commentsRow?.comments_data
                                    ? JSON.parse(commentsRow.comments_data)
                                    : [];

                                // Generate new snapshot HTML with cached video URLs
                                const snapshotHtml = generateTweetSnapshot(tweetData, comments, {
                                    includeComments: comments.length > 0,
                                    theme: 'auto',
                                });

                                // Upload regenerated snapshot to R2
                                const r2SnapshotKey = `snapshots/${task.tweet_id}.html`;
                                await c.env.MEDIA_BUCKET.put(r2SnapshotKey, snapshotHtml, {
                                    httpMetadata: {
                                        contentType: 'text/html; charset=utf-8',
                                    },
                                });
                                console.log(`[SnapshotVideo] Regenerated HTML snapshot for tweet ${task.tweet_id} with cached video URLs`);
                            } catch (snapshotErr) {
                                console.error(`[SnapshotVideo] Failed to regenerate snapshot:`, snapshotErr);
                                // Don't fail - the video is still cached, just the snapshot won't have the new URL
                            }
                        }
                    }
                } catch (err) {
                    console.error(`[SnapshotVideo] Failed to update cached_tweets:`, err);
                    // Don't fail the whole request, the video is still cached
                }
            }
        }

        console.log(`[SECURITY] Task ${task_id} completed. Cookies wiped.`);

        return c.json({
            success: true,
            message: status === 'completed'
                ? 'Download completed, cookies wiped'
                : 'Download failed, cookies wiped'
        });
    } catch (error) {
        console.error('Complete task error:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

/**
 * POST /api/downloads/internal/queue-snapshot-video
 * Queue a video download for snapshot caching (no cookies needed)
 * Auth: Internal Service Key
 * 
 * Used by triggerCacheInBackground when a tweet contains video
 */
downloads.post('/internal/queue-snapshot-video', internalServiceAuth, async (c) => {
    try {
        const { tweet_id, video_url, user_id } = await c.req.json();

        if (!tweet_id) {
            return c.json({ error: 'tweet_id is required' }, 400);
        }
        if (!video_url) {
            return c.json({ error: 'video_url is required' }, 400);
        }

        // Check if this video is already queued or completed for this tweet
        const existing = await c.env.DB.prepare(
            `SELECT id, status, r2_key FROM video_downloads 
             WHERE tweet_id = ? AND task_type = 'snapshot_video'
             ORDER BY id DESC LIMIT 1`
        ).bind(tweet_id).first<{ id: number; status: string; r2_key: string }>();

        if (existing) {
            if (existing.status === 'completed' && existing.r2_key) {
                return c.json({
                    success: true,
                    task_id: existing.id,
                    message: 'Video already cached',
                    r2_key: existing.r2_key
                });
            }
            if (existing.status === 'pending' || existing.status === 'processing') {
                return c.json({
                    success: true,
                    task_id: existing.id,
                    message: 'Video download already in progress',
                    status: existing.status
                });
            }
        }

        // Create new snapshot video task
        const result = await c.env.DB.prepare(
            `INSERT INTO video_downloads (user_id, tweet_url, task_type, tweet_id, video_url, status)
             VALUES (?, ?, 'snapshot_video', ?, ?, 'pending')`
        ).bind(
            user_id || 'system',
            `https://x.com/i/status/${tweet_id}`,  // Placeholder URL
            tweet_id,
            video_url
        ).run();

        const taskId = result.meta.last_row_id;
        console.log(`[SnapshotVideo] Queued task ${taskId} for tweet ${tweet_id}`);

        return c.json({
            success: true,
            task_id: taskId,
            message: 'Snapshot video download queued'
        });
    } catch (error) {
        console.error('Queue snapshot video error:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

/**
 * GET /api/internal/stats
 * Get download queue statistics
 * Auth: Internal Service Key
 */
downloads.get('/internal/stats', internalServiceAuth, async (c) => {
    try {
        const stats = await c.env.DB.prepare(
            `SELECT 
				status,
				COUNT(*) as count
			 FROM video_downloads
			 GROUP BY status`
        ).all<{ status: string; count: number }>();

        return c.json({ stats: stats.results || [] });
    } catch (error) {
        console.error('Get stats error:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

export default downloads;
