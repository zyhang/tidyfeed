
import { Hono } from 'hono';
import { verify } from 'hono/jwt';

type Bindings = {
    DB: D1Database;
    JWT_SECRET: string;
};

const admin = new Hono<{ Bindings: Bindings }>();

// Admin Authentication Middleware
admin.use('*', async (c, next) => {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return c.json({ error: 'Unauthorized: Missing token' }, 401);
    }

    const token = authHeader.substring(7);

    try {
        const payload = await verify(token, c.env.JWT_SECRET);

        // Verify user is an admin
        const adminUser = await c.env.DB.prepare(
            'SELECT id FROM admins WHERE id = ?'
        ).bind(payload.sub).first();

        if (!adminUser) {
            return c.json({ error: 'Unauthorized: Admin access required' }, 403);
        }

        // Pass admin info to next handlers if needed
        c.set('jwtPayload', payload);
        await next();
    } catch (error) {
        return c.json({ error: 'Unauthorized: Invalid token' }, 401);
    }
});

// GET /api/admin/ai-config
admin.get('/ai-config', async (c) => {
    try {
        const settings = await c.env.DB.prepare(
            `SELECT key, value FROM system_settings 
             WHERE key IN ('ai_prompt_template', 'ai_output_format', 'ai_model')`
        ).all<{ key: string; value: string }>();

        // Default values
        const config = {
            prompt_template: '',
            output_format: '',
            model: 'glm-4-flash'
        };

        if (settings.results) {
            for (const setting of settings.results) {
                if (setting.key === 'ai_prompt_template') config.prompt_template = setting.value;
                if (setting.key === 'ai_output_format') config.output_format = setting.value;
                if (setting.key === 'ai_model') config.model = setting.value;
            }
        }

        return c.json(config);
    } catch (error) {
        console.error('Error fetching AI config:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

// PUT /api/admin/ai-config
admin.put('/ai-config', async (c) => {
    try {
        const { prompt_template, output_format, model } = await c.req.json();

        if (prompt_template !== undefined) {
            await c.env.DB.prepare(
                `INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
            ).bind('ai_prompt_template', prompt_template).run();
        }

        if (output_format !== undefined) {
            await c.env.DB.prepare(
                `INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
            ).bind('ai_output_format', output_format).run();
        }

        if (model !== undefined) {
            await c.env.DB.prepare(
                `INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
            ).bind('ai_model', model).run();
        }

        return c.json({ success: true, message: 'AI configuration updated' });
    } catch (error) {
        console.error('Error updating AI config:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

export default admin;
