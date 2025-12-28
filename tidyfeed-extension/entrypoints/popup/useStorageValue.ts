import { useEffect, useState } from 'react';

/**
 * Hook to read and subscribe to browser.storage.local changes
 * Works in popup context
 */
export function useStorageValue<T>(key: string, defaultValue: T): T {
    const [value, setValue] = useState<T>(defaultValue);

    useEffect(() => {
        // Initial read
        browser.storage.local.get(key).then((result: Record<string, unknown>) => {
            if (result[key] !== undefined && result[key] !== null) {
                setValue(result[key] as T);
            }
        });

        // Listen for changes
        const handleStorageChange = (
            changes: Record<string, { newValue?: unknown; oldValue?: unknown }>,
            areaName: string
        ) => {
            if (areaName === 'local' && changes[key]?.newValue !== undefined) {
                setValue(changes[key].newValue as T);
            }
        };

        browser.storage.onChanged.addListener(handleStorageChange);

        return () => {
            browser.storage.onChanged.removeListener(handleStorageChange);
        };
    }, [key]);

    return value;
}

