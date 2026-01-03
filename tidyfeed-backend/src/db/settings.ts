/**
 * System Settings DB Helper
 */

// We use the D1Database type which is available in Cloudflare Workers
// If not using full types, we can use any
export async function getSetting(db: any, key: string): Promise<string | null> {
    try {
        const result = await db.prepare(
            'SELECT value FROM system_settings WHERE key = ?'
        ).bind(key).first<{ value: string }>();
        return result?.value || null;
    } catch (error) {
        console.error(`[DB] Error getting setting ${key}:`, error);
        return null;
    }
}

export async function setSetting(db: any, key: string, value: string): Promise<void> {
    try {
        await db.prepare(
            `INSERT INTO system_settings (key, value) 
             VALUES (?, ?) 
             ON CONFLICT(key) DO UPDATE SET 
             value = excluded.value, 
             updated_at = CURRENT_TIMESTAMP`
        ).bind(key, value).run();
    } catch (error) {
        console.error(`[DB] Error setting ${key}:`, error);
        throw error;
    }
}
