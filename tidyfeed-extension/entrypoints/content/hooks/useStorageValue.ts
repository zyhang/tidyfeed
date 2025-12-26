import { useEffect, useState } from 'react';

/**
 * Hook to read and subscribe to chrome.storage.local changes
 */
export function useStorageValue<T>(key: string, defaultValue: T): T {
    const [value, setValue] = useState<T>(defaultValue);

    useEffect(() => {
        // Initial read
        chrome.storage.local.get(key).then((result) => {
            if (result[key] !== undefined) {
                setValue(result[key]);
            }
        });

        // Listen for changes
        const handleStorageChange = (
            changes: { [key: string]: chrome.storage.StorageChange },
            areaName: string
        ) => {
            if (areaName === 'local' && changes[key]) {
                setValue(changes[key].newValue);
            }
        };

        chrome.storage.onChanged.addListener(handleStorageChange);

        return () => {
            chrome.storage.onChanged.removeListener(handleStorageChange);
        };
    }, [key]);

    return value;
}
