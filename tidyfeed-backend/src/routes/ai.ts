/**
 * AI Routes
 * 
 * Endpoints for AI-powered features like tweet summarization.
 */

import { Hono } from 'hono';
import { verify } from 'hono/jwt';
import { AIService } from '../services/ai';

type Bindings = {
    DB: D1Database;
    JWT_SECRET: string;
    MEDIA_BUCKET: R2Bucket;
    BIGMODEL_API_KEY?: string;
    WEB_APP_URL?: string;
};

const ai = new Hono<{ Bindings: Bindings }>();

// Cookie/Bearer Auth Middleware
const authMiddleware = async (c: any, next: any) => {
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
                cookieHeader.split(';').map((cookie: string) => {
                    const [key, ...val] = cookie.trim().split('=');
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
 * POST /api/ai/summarize
 * Generate or retrieve a cached summary for a saved tweet.
 * 
 * Body: { tweet_id: string }
 */
ai.post('/summarize', authMiddleware, async (c) => {
    try {
        const { tweet_id } = await c.req.json();

        if (!tweet_id) {
            return c.json({ error: 'tweet_id is required' }, 400);
        }

        const payload = c.get('jwtPayload') as { sub: string };
        const userId = payload.sub;

        // Check if BIGMODEL_API_KEY is configured
        if (!c.env.BIGMODEL_API_KEY) {
            return c.json({ error: 'AI service not configured' }, 500);
        }

        // Check saved_posts for the tweet
        const savedPost = await c.env.DB.prepare(
            `SELECT id, summary FROM saved_posts WHERE user_id = ? AND x_post_id = ?`
        ).bind(userId, tweet_id).first<{ id: number; summary: string | null }>();

        if (!savedPost) {
            return c.json({ error: 'Tweet not found in saved posts' }, 404);
        }

        // Cache hit - return existing summary
        if (savedPost.summary) {
            return c.json({
                success: true,
                cached: true,
                summary: savedPost.summary
            });
        }

        // Cache miss - generate summary
        // First, check if we have a cached snapshot
        const cachedTweet = await c.env.DB.prepare(
            `SELECT snapshot_r2_key FROM cached_tweets WHERE tweet_id = ?`
        ).bind(tweet_id).first<{ snapshot_r2_key: string | null }>();

        if (!cachedTweet?.snapshot_r2_key) {
            return c.json({
                error: 'No snapshot available for this tweet. Cache the tweet first.'
            }, 400);
        }

        // Check if user has custom prompt
        const user = await c.env.DB.prepare(
            'SELECT custom_ai_prompt FROM users WHERE id = ?'
        ).bind(userId).first<{ custom_ai_prompt: string | null }>();

        // Generate summary using AIService
        const aiService = new AIService(c.env.BIGMODEL_API_KEY);
        const webAppUrl = c.env.WEB_APP_URL || 'https://tidyfeed.app';

        const summary = await aiService.generateSummary(
            cachedTweet.snapshot_r2_key,
            c.env.MEDIA_BUCKET,
            c.env.DB,
            webAppUrl,
            user?.custom_ai_prompt || undefined
        );

        // Save the summary to saved_posts
        await c.env.DB.prepare(
            `UPDATE saved_posts SET summary = ? WHERE id = ?`
        ).bind(summary, savedPost.id).run();

        return c.json({
            success: true,
            cached: false,
            summary: summary
        });
    } catch (error) {
        console.error('[AI] Summarize error:', error);
        return c.json({ error: 'Failed to generate summary' }, 500);
    }
});

export default ai;
