'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'

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
        <Card>
            <CardHeader>
                <CardTitle>Preferences</CardTitle>
                <CardDescription>
                    Manage your application preferences.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="flex items-center justify-between space-x-2">
                    <div className="space-y-0.5">
                        <Label htmlFor="auto-download" className="text-base">Auto-download Videos</Label>
                        <p className="text-sm text-muted-foreground">
                            Automatically download videos from saved tweets to your library.
                        </p>
                    </div>
                    <Switch
                        id="auto-download"
                        checked={autoDownload}
                        onCheckedChange={handleToggle}
                    />
                </div>
            </CardContent>
        </Card>
    )
}
