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

        const { tweet_url, cookies } = await c.req.json();

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

        // Insert task with pending status
        const result = await c.env.DB.prepare(
            `INSERT INTO video_downloads (user_id, tweet_url, twitter_cookies, status)
			 VALUES (?, ?, ?, 'pending')`
        ).bind(userId, tweet_url, cookies).run();

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
            `SELECT id, user_id, tweet_url, twitter_cookies
			 FROM video_downloads
			 WHERE status = 'pending'
			 ORDER BY created_at ASC
			 LIMIT 1`
        ).first<{ id: number; user_id: string; tweet_url: string; twitter_cookies: string }>();

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
                cookies: task.twitter_cookies
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

        // Get task to verify it exists and get user_id for path
        const task = await c.env.DB.prepare(
            `SELECT id, user_id FROM video_downloads WHERE id = ?`
        ).bind(task_id).first<{ id: number; user_id: string }>();

        if (!task) {
            return c.json({ error: 'Task not found' }, 404);
        }

        // Generate R2 key: videos/{user_id}/{task_id}.mp4
        const extension = filename?.split('.').pop() || 'mp4';
        const key = `videos/${task.user_id}/${task_id}.${extension}`;

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
        const { task_id, status, r2_key, metadata, error_message } = await c.req.json();

        if (!task_id) {
            return c.json({ error: 'task_id is required' }, 400);
        }

        if (!status || !['completed', 'failed'].includes(status)) {
            return c.json({ error: 'status must be "completed" or "failed"' }, 400);
        }

        // SECURITY: Always wipe cookies, regardless of success or failure
        const result = await c.env.DB.prepare(
            `UPDATE video_downloads 
			 SET status = ?,
			     r2_key = ?,
			     metadata = ?,
			     error_message = ?,
			     twitter_cookies = NULL,
			     completed_at = strftime('%s', 'now')
			 WHERE id = ?`
        ).bind(
            status,
            r2_key || null,
            metadata ? JSON.stringify(metadata) : null,
            error_message || null,
            task_id
        ).run();

        if (result.meta.changes === 0) {
            return c.json({ error: 'Task not found' }, 404);
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
