/**
 * Storage utility for managing saved post IDs
 * Uses browser.storage.local with key 'saved_x_ids'
 */

const STORAGE_KEY = 'saved_x_ids';

/**
 * Get all saved post IDs from storage
 */
export async function getSavedIds(): Promise<string[]> {
    const result = await browser.storage.local.get(STORAGE_KEY);
    return (result[STORAGE_KEY] as string[]) || [];
}

/**
 * Check if a post ID is saved
 */
export async function isSaved(xId: string): Promise<boolean> {
    const ids = await getSavedIds();
    return ids.includes(xId);
}

/**
 * Add a post ID to saved list
 */
export async function addId(xId: string): Promise<void> {
    const ids = await getSavedIds();
    if (!ids.includes(xId)) {
        ids.push(xId);
        await browser.storage.local.set({ [STORAGE_KEY]: ids });
    }
}

/**
 * Remove a post ID from saved list
 */
export async function removeId(xId: string): Promise<void> {
    const ids = await getSavedIds();
    const newIds = ids.filter(id => id !== xId);
    await browser.storage.local.set({ [STORAGE_KEY]: newIds });
}

/**
 * Replace all saved IDs (used for sync from API)
 */
export async function setSavedIds(ids: string[]): Promise<void> {
    await browser.storage.local.set({ [STORAGE_KEY]: ids });
}
