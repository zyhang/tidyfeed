/**
 * Library Routes - User's saved media browser
 * Videos and Images from saved posts and downloads
 */

import { Hono } from 'hono';
import { verify } from 'hono/jwt';

type Bindings = {
    DB: D1Database;
    JWT_SECRET: string;
    MEDIA_BUCKET: R2Bucket;
};

const library = new Hono<{ Bindings: Bindings }>();

// Auth Middleware (Cookie or Bearer Token)
const cookieAuthMiddleware = async (c: any, next: any) => {
    let token: string | undefined;

    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    }

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

/**
 * GET /api/library/videos
 * List user's downloaded videos
 * Query: sort=asc|desc (default: desc), page=1, limit=50
 */
library.get('/videos', cookieAuthMiddleware, async (c) => {
    try {
        const payload = c.get('jwtPayload') as { sub: string };
        const userId = payload.sub;

        const sort = c.req.query('sort') === 'asc' ? 'ASC' : 'DESC';
        const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
        const limit = Math.min(50, parseInt(c.req.query('limit') || '50', 10));
        const offset = (page - 1) * limit;

        // Get completed user downloads (include snapshot videos and older records with NULL task_type)
        const videos = await c.env.DB.prepare(
            `SELECT 
                id, 
                tweet_url, 
                r2_key, 
                metadata, 
                file_size,
                created_at
             FROM video_downloads
             WHERE user_id = ? 
               AND status = 'completed' 
               AND (task_type IS NULL OR task_type IN ('user_download', 'snapshot_video'))
               AND r2_key IS NOT NULL
             ORDER BY created_at ${sort}
             LIMIT ? OFFSET ?`
        ).bind(userId, limit, offset).all();

        // Get total count
        const countResult = await c.env.DB.prepare(
            `SELECT COUNT(*) as total FROM video_downloads
             WHERE user_id = ? 
               AND status = 'completed' 
               AND (task_type IS NULL OR task_type IN ('user_download', 'snapshot_video'))
               AND r2_key IS NOT NULL`
        ).bind(userId).first<{ total: number }>();

        return c.json({
            videos: videos.results?.map((v: any) => ({
                id: v.id,
                tweetUrl: v.tweet_url,
                r2Key: v.r2_key,
                metadata: v.metadata ? JSON.parse(v.metadata) : null,
                fileSize: v.file_size || 0,
                createdAt: v.created_at,
            })) || [],
            pagination: {
                page,
                limit,
                total: countResult?.total || 0,
                hasMore: offset + limit < (countResult?.total || 0),
            },
        });
    } catch (error) {
        console.error('Get library videos error:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

/**
 * GET /api/library/images
 * List unique images from user's saved posts
 * Query: sort=asc|desc (default: desc), page=1, limit=50
 */
library.get('/images', cookieAuthMiddleware, async (c) => {
    try {
        const payload = c.get('jwtPayload') as { sub: string };
        const userId = payload.sub;

        const sort = c.req.query('sort') === 'asc' ? 'ASC' : 'DESC';
        const page = Math.max(1, parseInt(c.req.query('page') || '1', 10));
        const limit = Math.min(50, parseInt(c.req.query('limit') || '50', 10));
        const offset = (page - 1) * limit;

        // Get saved posts with media
        const posts = await c.env.DB.prepare(
            `SELECT 
                id,
                x_post_id,
                media_urls,
                created_at
             FROM saved_posts
             WHERE user_id = ? 
               AND media_urls IS NOT NULL 
               AND media_urls != '[]'
             ORDER BY created_at ${sort}
             LIMIT ? OFFSET ?`
        ).bind(userId, limit, offset).all();

        // Extract images from media_urls (filter out videos)
        const images: {
            id: number;
            postId: string;
            url: string;
            createdAt: string;
        }[] = [];

        for (const post of posts.results || []) {
            const p = post as { id: number; x_post_id: string; media_urls: string; created_at: string };
            try {
                const mediaUrls = JSON.parse(p.media_urls);
                for (const url of mediaUrls) {
                    // Filter for images (exclude video URLs)
                    if (typeof url === 'string' &&
                        (url.includes('pbs.twimg.com/media') ||
                            url.includes('.jpg') ||
                            url.includes('.png') ||
                            url.includes('.webp'))) {
                        images.push({
                            id: p.id,
                            postId: p.x_post_id,
                            url: url,
                            createdAt: p.created_at,
                        });
                    }
                }
            } catch {
                // Skip malformed JSON
            }
        }

        // Get total count of posts with media
        const countResult = await c.env.DB.prepare(
            `SELECT COUNT(*) as total FROM saved_posts
             WHERE user_id = ? 
               AND media_urls IS NOT NULL 
               AND media_urls != '[]'`
        ).bind(userId).first<{ total: number }>();

        return c.json({
            images,
            pagination: {
                page,
                limit,
                total: countResult?.total || 0,
                hasMore: offset + limit < (countResult?.total || 0),
            },
        });
    } catch (error) {
        console.error('Get library images error:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

export default library;
