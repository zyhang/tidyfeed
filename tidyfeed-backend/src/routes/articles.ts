/**
 * Articles API Routes
 *
 * REST API for saving and managing web articles for the Reader View feature.
 * Endpoints:
 * - POST /api/articles/save - Save an article from URL
 * - GET /api/articles - List user's saved articles
 * - GET /api/articles/:id - Get article details
 * - GET /api/articles/:id/content - Get article HTML content
 * - DELETE /api/articles/:id - Delete an article
 * - PUT /api/articles/:id/read - Mark as read/unread
 * - PUT /api/articles/:id/archive - Archive/unarchive article
 */

import { Hono } from 'hono';
import { ArticleExtractor } from '../services/articleExtractor';

type Bindings = {
    DB: D1Database;
    JWT_SECRET: string;
    MEDIA_BUCKET: R2Bucket;
    WEB_APP_URL?: string;
};

const articles = new Hono<{ Bindings: Bindings }>();

type ArticleRow = {
    id: number;
    url: string;
    title: string;
    excerpt: string | null;
    author?: string | null;
    published_at?: string | null;
    domain: string;
    word_count?: number;
    reading_time_minutes?: number;
    image_url?: string | null;
    created_at?: string;
    read_at?: string | null;
    archived_at?: string | null;
};

const mapArticleRow = (row: ArticleRow) => ({
    id: row.id,
    url: row.url,
    title: row.title,
    excerpt: row.excerpt ?? null,
    author: row.author ?? null,
    publishedAt: row.published_at ?? null,
    domain: row.domain,
    wordCount: row.word_count ?? 0,
    readingTimeMinutes: row.reading_time_minutes ?? 0,
    imageUrl: row.image_url ?? null,
    createdAt: row.created_at,
    readAt: row.read_at ?? null,
    archivedAt: row.archived_at ?? null,
});

const parseBooleanParam = async (c: any, key: string): Promise<boolean | undefined> => {
    const queryValue = c.req.query(key);
    if (typeof queryValue === 'string') {
        if (['true', '1'].includes(queryValue)) return true;
        if (['false', '0'].includes(queryValue)) return false;
    }

    try {
        const body = await c.req.json();
        if (typeof body?.[key] === 'boolean') return body[key];
        if (typeof body?.[key] === 'string') {
            if (['true', '1'].includes(body[key])) return true;
            if (['false', '0'].includes(body[key])) return false;
        }
    } catch {
        // Ignore parse errors for empty bodies.
    }

    return undefined;
};

const buildArticleFilters = (filter: string, includeArchived: boolean) => {
    const conditions: string[] = [];
    const normalizedFilter = filter || 'all';

    if (normalizedFilter === 'unread') {
        conditions.push('read_at IS NULL', 'archived_at IS NULL');
    } else if (normalizedFilter === 'archived') {
        conditions.push('archived_at IS NOT NULL');
    } else if (!includeArchived) {
        conditions.push('archived_at IS NULL');
    }

    return conditions;
};

// Cookie auth middleware (reused from index.ts)
const cookieAuthMiddleware = async (c: any, next: any) => {
    const cookie = c.req.raw.headers.get('Cookie');
    if (!cookie) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    const tokenMatch = cookie.match(/auth_token=([^;]+)/);
    const token = tokenMatch ? tokenMatch[1] : null;

    if (!token) {
        return c.json({ error: 'Unauthorized' }, 401);
    }

    try {
        const { verify } = await import('hono/jwt');
        const payload = await verify(token, c.env.JWT_SECRET);
        c.set('jwtPayload', payload);
        await next();
    } catch (error) {
        return c.json({ error: 'Invalid token' }, 401);
    }
};

/**
 * POST /api/articles/save
 * Save an article from a URL
 */
articles.post('/save', cookieAuthMiddleware, async (c) => {
    const userId = c.get('jwtPayload').sub;
    const { url } = await c.req.json<{ url: string }>();

    if (!url) {
        return c.json({ error: 'URL is required' }, 400);
    }

    try {
        new URL(url);
    } catch {
        return c.json({ error: 'Invalid URL' }, 400);
    }

    console.log(`[Articles] Saving article for user ${userId}: ${url}`);

    // Check if already saved
    const existing = await c.env.DB.prepare(
        'SELECT id, title, excerpt, reading_time_minutes FROM articles WHERE user_id = ? AND url = ?'
    ).bind(userId, url).first<{
        id: number;
        title: string;
        excerpt: string;
        reading_time_minutes: number;
    }>();

    if (existing) {
        console.log(`[Articles] Article already saved: ${existing.id}`);
        return c.json({
            success: true,
            articleId: existing.id,
            alreadySaved: true,
            article: {
                id: existing.id,
                title: existing.title,
                excerpt: existing.excerpt,
                readingTime: existing.reading_time_minutes
            }
        });
    }

    // Extract article content
    const extractor = new ArticleExtractor();
    const article = await extractor.extractFromUrl(url);

    if (!article) {
        console.error(`[Articles] Failed to extract article from: ${url}`);
        return c.json({ error: 'Failed to extract article content. The page may not have readable content.' }, 400);
    }

    console.log(`[Articles] Extracted article: "${article.title}" (${article.wordCount} words)`);

    // Generate snapshot HTML
    const snapshotHtml = extractor.generateSnapshot(article);

    // Save to R2
    const timestamp = Date.now();
    const r2Key = `articles/${userId}/${timestamp}.html`;
    await c.env.MEDIA_BUCKET.put(r2Key, snapshotHtml, {
        httpMetadata: {
            contentType: 'text/html; charset=utf-8',
            cacheControl: 'public, max-age=86400',
        },
    });

    // Save to database
    const result = await c.env.DB.prepare(
        `INSERT INTO articles (user_id, url, title, excerpt, author, published_at,
         domain, word_count, reading_time_minutes, image_url, snapshot_r2_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        userId,
        article.url,
        article.title,
        article.excerpt,
        article.author,
        article.publishedAt,
        article.domain,
        article.wordCount,
        article.readingTime,
        article.imageUrl,
        r2Key
    ).run();

    const articleId = result.meta.last_row_id;
    console.log(`[Articles] Article saved with ID: ${articleId}`);

    return c.json({
        success: true,
        articleId,
        article: {
            id: articleId,
            title: article.title,
            excerpt: article.excerpt,
            readingTime: article.readingTime
        }
    });
});

/**
 * GET /api/articles
 * List user's saved articles with pagination and filters
 */
articles.get('/', cookieAuthMiddleware, async (c) => {
    const userId = c.get('jwtPayload').sub;
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');
    const filter = (c.req.query('filter') || 'all').toLowerCase();
    const includeArchived = c.req.query('include_archived') === 'true';
    const sort = (c.req.query('sort') || 'created').toLowerCase();
    const order = (c.req.query('order') || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    let query = `
        SELECT id, url, title, excerpt, domain, image_url, reading_time_minutes,
               created_at, read_at, archived_at
        FROM articles
        WHERE user_id = ?
    `;
    const params: any[] = [userId];

    const conditions = buildArticleFilters(filter, includeArchived);
    if (conditions.length > 0) {
        query += ` AND ${conditions.join(' AND ')}`;
    }

    const sortColumn = sort === 'title'
        ? 'title'
        : sort === 'domain'
            ? 'domain'
            : 'created_at';

    query += ` ORDER BY ${sortColumn} ${order} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const result = await c.env.DB.prepare(query).bind(...params).all();

    // Get total count with same filters
    let countQuery = 'SELECT COUNT(*) as count FROM articles WHERE user_id = ?';
    if (conditions.length > 0) {
        countQuery += ` AND ${conditions.join(' AND ')}`;
    }

    const countResult = await c.env.DB.prepare(countQuery).bind(userId).first<{ count: number }>();

    return c.json({
        articles: (result.results || []).map((row: ArticleRow) => mapArticleRow(row)),
        total: countResult?.count || 0,
        limit,
        offset
    });
});

/**
 * GET /api/articles/:id
 * Get article details
 */
articles.get('/:id', cookieAuthMiddleware, async (c) => {
    const userId = c.get('jwtPayload').sub;
    const articleId = c.req.param('id');

    const article = await c.env.DB.prepare(
        `SELECT id, url, title, excerpt, author, published_at, domain,
                word_count, reading_time_minutes, image_url, created_at,
                read_at, archived_at
         FROM articles WHERE id = ? AND user_id = ?`
    ).bind(articleId, userId).first<ArticleRow>();

    if (!article) {
        return c.json({ error: 'Article not found' }, 404);
    }

    return c.json({ article: mapArticleRow(article) });
});

/**
 * GET /api/articles/:id/content
 * Get article HTML content from R2
 */
articles.get('/:id/content', cookieAuthMiddleware, async (c) => {
    const userId = c.get('jwtPayload').sub;
    const articleId = c.req.param('id');

    const article = await c.env.DB.prepare(
        'SELECT snapshot_r2_key FROM articles WHERE id = ? AND user_id = ?'
    ).bind(articleId, userId).first<{ snapshot_r2_key: string }>();

    if (!article) {
        return c.json({ error: 'Article not found' }, 404);
    }

    const object = await c.env.MEDIA_BUCKET.get(article.snapshot_r2_key);
    if (!object) {
        return c.json({ error: 'Content not found' }, 404);
    }

    const html = await object.text();
    return new Response(html, {
        headers: {
            'Content-Type': 'text/html; charset=utf-8',
            'Cache-Control': 'public, max-age=86400',
        },
    });
});

/**
 * DELETE /api/articles/:id
 * Delete an article
 */
articles.delete('/:id', cookieAuthMiddleware, async (c) => {
    const userId = c.get('jwtPayload').sub;
    const articleId = c.req.param('id');

    // Get article to delete R2 file
    const article = await c.env.DB.prepare(
        'SELECT snapshot_r2_key FROM articles WHERE id = ? AND user_id = ?'
    ).bind(articleId, userId).first<{ snapshot_r2_key: string }>();

    // Delete from database
    await c.env.DB.prepare(
        'DELETE FROM articles WHERE id = ? AND user_id = ?'
    ).bind(articleId, userId).run();

    // Delete R2 file
    if (article?.snapshot_r2_key) {
        await c.env.MEDIA_BUCKET.delete(article.snapshot_r2_key);
    }

    console.log(`[Articles] Article ${articleId} deleted by user ${userId}`);

    return c.json({ success: true });
});

/**
 * PUT /api/articles/:id/read
 * Mark article as read/unread
 */
articles.put('/:id/read', cookieAuthMiddleware, async (c) => {
    const userId = c.get('jwtPayload').sub;
    const articleId = c.req.param('id');
    const read = await parseBooleanParam(c, 'read');
    if (read === undefined) {
        return c.json({ error: 'Missing read parameter' }, 400);
    }

    await c.env.DB.prepare(
        `UPDATE articles SET read_at = ? WHERE id = ? AND user_id = ?`
    ).bind(read ? new Date().toISOString() : null, articleId, userId).run();

    console.log(`[Articles] Article ${articleId} marked as ${read ? 'read' : 'unread'}`);

    return c.json({ success: true });
});

/**
 * PUT /api/articles/:id/archive
 * Archive/unarchive article
 */
articles.put('/:id/archive', cookieAuthMiddleware, async (c) => {
    const userId = c.get('jwtPayload').sub;
    const articleId = c.req.param('id');
    const archive = await parseBooleanParam(c, 'archive');
    if (archive === undefined) {
        return c.json({ error: 'Missing archive parameter' }, 400);
    }

    await c.env.DB.prepare(
        `UPDATE articles SET archived_at = ? WHERE id = ? AND user_id = ?`
    ).bind(archive ? new Date().toISOString() : null, articleId, userId).run();

    console.log(`[Articles] Article ${articleId} ${archive ? 'archived' : 'unarchived'}`);

    return c.json({ success: true });
});

/**
 * PUT /api/articles/:id/tags
 * Update article tags
 */
articles.put('/:id/tags', cookieAuthMiddleware, async (c) => {
    const userId = c.get('jwtPayload').sub;
    const articleId = c.req.param('id');
    const { tags } = await c.req.json<{ tags: string[] }>();

    // Verify article ownership
    const article = await c.env.DB.prepare(
        'SELECT id FROM articles WHERE id = ? AND user_id = ?'
    ).bind(articleId, userId).first();

    if (!article) {
        return c.json({ error: 'Article not found' }, 404);
    }

    // Delete existing tags
    await c.env.DB.prepare(
        'DELETE FROM article_tags WHERE article_id = ?'
    ).bind(articleId).run();

    // Add new tags
    for (const tagName of tags) {
        // Find or create tag
        let tag = await c.env.DB.prepare(
            'SELECT id FROM tags WHERE user_id = ? AND name = ?'
        ).bind(userId, tagName).first<{ id: number }>();

        if (!tag) {
            const insertResult = await c.env.DB.prepare(
                'INSERT INTO tags (user_id, name) VALUES (?, ?)'
            ).bind(userId, tagName).run();
            tag = { id: insertResult.meta.last_row_id };
        }

        // Link tag to article
        await c.env.DB.prepare(
            'INSERT OR IGNORE INTO article_tags (article_id, tag_id) VALUES (?, ?)'
        ).bind(articleId, tag.id).run();
    }

    return c.json({ success: true });
});

/**
 * GET /api/articles/:id/tags
 * Get article tags
 */
articles.get('/:id/tags', cookieAuthMiddleware, async (c) => {
    const userId = c.get('jwtPayload').sub;
    const articleId = c.req.param('id');

    const tags = await c.env.DB.prepare(
        `SELECT t.id, t.name, t.color
         FROM tags t
         INNER JOIN article_tags at ON t.id = at.tag_id
         WHERE at.article_id = ? AND t.user_id = ?`
    ).bind(articleId, userId).all();

    return c.json({ tags: tags.results || [] });
});

export default articles;
