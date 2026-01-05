
import { Hono } from 'hono';
import { verify } from 'hono/jwt';
import { isValidPlan } from '../services/subscription';

type Bindings = {
    DB: D1Database;
    JWT_SECRET: string;
};

const admin = new Hono<{ Bindings: Bindings }>();

const SYSTEM_SETTINGS = {
    bot_enabled: { type: 'boolean', default: true },
    storage_quota_mb: { type: 'number', default: 500 },
    cache_ttl_hours: { type: 'number', default: 24 },
    cache_comments_limit: { type: 'number', default: 20 },
    auto_cache_on_save: { type: 'boolean', default: true },
    regex_rules_url: { type: 'string', default: 'https://tidyfeed.app/regex_rules.json' },
} as const;

type SystemSettingKey = keyof typeof SYSTEM_SETTINGS;

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
            model: 'glm-4.6'
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

// GET /api/admin/system-settings
admin.get('/system-settings', async (c) => {
    try {
        const keys = Object.keys(SYSTEM_SETTINGS);
        const placeholders = keys.map(() => '?').join(',');
        const rows = await c.env.DB.prepare(
            `SELECT key, value FROM system_settings WHERE key IN (${placeholders})`
        ).bind(...keys).all<{ key: string; value: string }>();

        const result: Record<string, boolean | number | string> = {};
        for (const [key, meta] of Object.entries(SYSTEM_SETTINGS)) {
            result[key] = meta.default;
        }

        for (const row of rows.results || []) {
            const meta = SYSTEM_SETTINGS[row.key as SystemSettingKey];
            if (!meta) continue;
            if (meta.type === 'boolean') {
                result[row.key] = row.value === 'true';
            } else if (meta.type === 'number') {
                const num = Number(row.value);
                result[row.key] = Number.isFinite(num) ? num : meta.default;
            } else {
                result[row.key] = row.value;
            }
        }

        return c.json({ settings: result });
    } catch (error) {
        console.error('Error fetching system settings:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

// PUT /api/admin/system-settings
admin.put('/system-settings', async (c) => {
    try {
        const body = await c.req.json();
        const updates: { key: SystemSettingKey; value: string }[] = [];

        for (const [key, rawValue] of Object.entries(body || {})) {
            if (!(key in SYSTEM_SETTINGS)) continue;
            const meta = SYSTEM_SETTINGS[key as SystemSettingKey];

            if (meta.type === 'boolean') {
                const boolValue = typeof rawValue === 'boolean'
                    ? rawValue
                    : rawValue === 'true'
                        ? true
                        : rawValue === 'false'
                            ? false
                            : null;
                if (boolValue === null) {
                    return c.json({ error: `Invalid value for ${key}` }, 400);
                }
                updates.push({ key: key as SystemSettingKey, value: String(boolValue) });
            } else if (meta.type === 'number') {
                const numValue = typeof rawValue === 'number' ? rawValue : Number(rawValue);
                if (!Number.isFinite(numValue)) {
                    return c.json({ error: `Invalid value for ${key}` }, 400);
                }
                updates.push({ key: key as SystemSettingKey, value: String(numValue) });
            } else if (meta.type === 'string') {
                if (typeof rawValue !== 'string') {
                    return c.json({ error: `Invalid value for ${key}` }, 400);
                }
                updates.push({ key: key as SystemSettingKey, value: rawValue });
            }
        }

        if (updates.length === 0) {
            return c.json({ success: true, message: 'No updates' });
        }

        const statements = updates.map((item) =>
            c.env.DB.prepare(
                `INSERT INTO system_settings (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP)
                 ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP`
            ).bind(item.key, item.value)
        );

        await c.env.DB.batch(statements);

        return c.json({ success: true, updated: updates.map((u) => u.key) });
    } catch (error) {
        console.error('Error updating system settings:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

// GET /api/admin/users
admin.get('/users', async (c) => {
    try {
        const users = await c.env.DB.prepare(
            `SELECT id, email, name, avatar_url, plan, created_at
             FROM users
             ORDER BY created_at DESC`
        ).all<{
            id: string;
            email: string;
            name: string | null;
            avatar_url: string | null;
            plan: string | null;
            created_at: string;
        }>();

        return c.json({ users: users.results || [] });
    } catch (error) {
        console.error('Error fetching users:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

// PUT /api/admin/users/:id/plan
admin.put('/users/:id/plan', async (c) => {
    try {
        const userId = c.req.param('id');
        const { plan } = await c.req.json<{ plan?: string }>();

        if (!plan || !isValidPlan(plan)) {
            return c.json({ error: 'Invalid plan' }, 400);
        }

        const result = await c.env.DB.prepare(
            `UPDATE users SET plan = ?, plan_expires_at = NULL WHERE id = ?`
        ).bind(plan, userId).run();

        if (!result.success) {
            return c.json({ error: 'Failed to update plan' }, 500);
        }

        return c.json({ success: true, plan });
    } catch (error) {
        console.error('Error updating user plan:', error);
        return c.json({ error: 'Internal server error' }, 500);
    }
});

export default admin;
