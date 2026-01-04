/**
 * Notes Routes
 * 
 * CRUD endpoints for snapshot notes (text highlights with user notes).
 */

import { Hono } from 'hono';
import { verify } from 'hono/jwt';

type Bindings = {
    DB: D1Database;
    JWT_SECRET: string;
};

type Variables = {
    jwtPayload?: any;
    userId?: string | null;
};

type Note = {
    id: number;
    tweet_id: string;
    user_id: string;
    selected_text: string;
    note_content: string;
    text_offset_start: number | null;
    text_offset_end: number | null;
    created_at: string;
    updated_at: string;
};

const notes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

// Optional auth middleware - allows both authenticated and anonymous access
const optionalAuthMiddleware = async (c: any, next: any) => {
    let token: string | undefined;

    // Try Authorization Header
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    }

    // Try Cookie if header missing
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

    if (token) {
        try {
            const payload = await verify(token, c.env.JWT_SECRET);
            c.set('jwtPayload', payload);
            c.set('userId', payload.sub);
        } catch {
            // Token invalid, but we still allow access (read-only)
            c.set('userId', null);
        }
    } else {
        c.set('userId', null);
    }

    await next();
};

// Required auth middleware - only allows authenticated access
const requiredAuthMiddleware = async (c: any, next: any) => {
    let token: string | undefined;

    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
    }

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
        c.set('userId', payload.sub);
        await next();
    } catch {
        return c.json({ error: 'Invalid token' }, 401);
    }
};

/**
 * GET /api/notes/:tweet_id
 * List all notes for a tweet (public read)
 */
notes.get('/:tweet_id', optionalAuthMiddleware, async (c) => {
    try {
        const tweetId = c.req.param('tweet_id');
        const currentUserId = c.get('userId');

        const result = await c.env.DB.prepare(
            `SELECT id, tweet_id, user_id, selected_text, note_content, 
                    text_offset_start, text_offset_end, created_at, updated_at
             FROM snapshot_notes 
             WHERE tweet_id = ?
             ORDER BY created_at DESC`
        ).bind(tweetId).all<Note>();

        // Check if user is the owner of this tweet (saved_posts)
        let isOwner = false;
        if (currentUserId) {
            const savedPost = await c.env.DB.prepare(
                `SELECT id FROM saved_posts WHERE user_id = ? AND x_post_id = ?`
            ).bind(currentUserId, tweetId).first<{ id: number }>();
            isOwner = !!savedPost;
        }

        return c.json({
            success: true,
            notes: result.results || [],
            isOwner,
            userId: currentUserId
        });
    } catch (error) {
        console.error('[Notes] Get notes error:', error);
        return c.json({ error: 'Failed to fetch notes' }, 500);
    }
});

/**
 * POST /api/notes
 * Create a note (owner only)
 */
notes.post('/', requiredAuthMiddleware, async (c) => {
    try {
        const userId = c.get('userId');
        const { tweet_id, selected_text, note_content, text_offset_start, text_offset_end } = await c.req.json();

        if (!tweet_id || !selected_text || !note_content) {
            return c.json({ error: 'tweet_id, selected_text, and note_content are required' }, 400);
        }

        // Verify user owns this tweet
        const savedPost = await c.env.DB.prepare(
            `SELECT id FROM saved_posts WHERE user_id = ? AND x_post_id = ?`
        ).bind(userId, tweet_id).first<{ id: number }>();

        if (!savedPost) {
            return c.json({ error: 'You can only add notes to your own saved posts' }, 403);
        }

        // Insert the note
        const result = await c.env.DB.prepare(
            `INSERT INTO snapshot_notes (tweet_id, user_id, selected_text, note_content, text_offset_start, text_offset_end)
             VALUES (?, ?, ?, ?, ?, ?)`
        ).bind(tweet_id, userId, selected_text, note_content, text_offset_start ?? null, text_offset_end ?? null).run();

        // Fetch the created note
        const newNote = await c.env.DB.prepare(
            `SELECT id, tweet_id, user_id, selected_text, note_content, 
                    text_offset_start, text_offset_end, created_at, updated_at
             FROM snapshot_notes 
             WHERE id = ?`
        ).bind(result.meta.last_row_id).first<Note>();

        return c.json({
            success: true,
            note: newNote
        });
    } catch (error) {
        console.error('[Notes] Create note error:', error);
        return c.json({ error: 'Failed to create note' }, 500);
    }
});

/**
 * PUT /api/notes/:id
 * Update a note (owner only)
 */
notes.put('/:id', requiredAuthMiddleware, async (c) => {
    try {
        const userId = c.get('userId');
        const noteId = c.req.param('id');
        const { note_content } = await c.req.json();

        if (!note_content) {
            return c.json({ error: 'note_content is required' }, 400);
        }

        // Verify user owns this note
        const note = await c.env.DB.prepare(
            `SELECT id, user_id FROM snapshot_notes WHERE id = ?`
        ).bind(noteId).first<{ id: number; user_id: string }>();

        if (!note) {
            return c.json({ error: 'Note not found' }, 404);
        }

        if (note.user_id !== userId) {
            return c.json({ error: 'You can only edit your own notes' }, 403);
        }

        // Update the note
        await c.env.DB.prepare(
            `UPDATE snapshot_notes SET note_content = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
        ).bind(note_content, noteId).run();

        // Fetch the updated note
        const updatedNote = await c.env.DB.prepare(
            `SELECT id, tweet_id, user_id, selected_text, note_content, 
                    text_offset_start, text_offset_end, created_at, updated_at
             FROM snapshot_notes 
             WHERE id = ?`
        ).bind(noteId).first<Note>();

        return c.json({
            success: true,
            note: updatedNote
        });
    } catch (error) {
        console.error('[Notes] Update note error:', error);
        return c.json({ error: 'Failed to update note' }, 500);
    }
});

/**
 * DELETE /api/notes/:id
 * Delete a note (owner only)
 */
notes.delete('/:id', requiredAuthMiddleware, async (c) => {
    try {
        const userId = c.get('userId');
        const noteId = c.req.param('id');

        // Verify user owns this note
        const note = await c.env.DB.prepare(
            `SELECT id, user_id FROM snapshot_notes WHERE id = ?`
        ).bind(noteId).first<{ id: number; user_id: string }>();

        if (!note) {
            return c.json({ error: 'Note not found' }, 404);
        }

        if (note.user_id !== userId) {
            return c.json({ error: 'You can only delete your own notes' }, 403);
        }

        // Delete the note
        await c.env.DB.prepare(
            `DELETE FROM snapshot_notes WHERE id = ?`
        ).bind(noteId).run();

        return c.json({
            success: true,
            message: 'Note deleted'
        });
    } catch (error) {
        console.error('[Notes] Delete note error:', error);
        return c.json({ error: 'Failed to delete note' }, 500);
    }
});

export default notes;
