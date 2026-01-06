'use client'

import { useState } from 'react'
import { toast } from 'sonner'

// Design System Components
import { Section } from '@/components/layout'
import { ToggleSetting } from '@/components/forms'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app'

interface PreferencesSectionProps {
    preferences: {
        autoDownloadVideo?: boolean
    }
    onUpdate: (newPreferences: any) => void
}

export function PreferencesSection({ preferences, onUpdate }: PreferencesSectionProps) {
    const [autoDownload, setAutoDownload] = useState(preferences.autoDownloadVideo || false)

    const handleToggle = async (checked: boolean) => {
        // Optimistic update
        setAutoDownload(checked)

        try {
            const newPrefs = { ...preferences, autoDownloadVideo: checked }
            const response = await fetch(`${API_URL}/api/user/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ preferences: newPrefs }),
            })

            if (!response.ok) throw new Error('Failed to update settings')

            toast.success('Preferences saved')
            onUpdate(newPrefs)
        } catch (error) {
            console.error(error)
            toast.error('Failed to update preferences')
            // Revert
            setAutoDownload(!checked)
        }
    }

    return (
        <Section
            title="Preferences"
            description="Manage your application preferences."
        >
            <ToggleSetting
                label="Auto-download Videos"
                description="Automatically download videos from saved tweets to your library."
                checked={autoDownload}
                onCheckedChange={handleToggle}
            />
        </Section>
    )
}
