'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { ProfileSection } from './_components/profile-section'
import { PreferencesSection } from './_components/preferences-section'
import { SocialAccountsSection } from './_components/social-accounts-section'
import { AIInsightSection } from './_components/ai-insight-section'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app'

interface UserData {
    id: string
    name: string
    email: string
    avatarUrl: string
    preferences: {
        autoDownloadVideo?: boolean
    }
    customAiPrompt: string
}

export function SettingsPageClient() {
    const [user, setUser] = useState<UserData | null>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchUser() {
            try {
                const response = await fetch(`${API_URL}/auth/me`, {
                    credentials: 'include',
                })
                if (response.ok) {
                    const data = await response.json()
                    setUser(data.user)
                }
            } catch (error) {
                console.error('Failed to fetch user:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchUser()
    }, [])

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!user) {
        return (
            <div className="flex h-[50vh] items-center justify-center text-muted-foreground">
                Please log in to view settings.
            </div>
        )
    }

    return (
        <div className="container max-w-4xl py-8 px-4">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground mt-2">
                    Manage your account settings and preferences.
                </p>
            </div>

            <div className="space-y-8">
                <ProfileSection
                    user={user}
                    onUpdate={(newName) => setUser({ ...user, name: newName })}
                />

                <PreferencesSection
                    preferences={user.preferences || {}}
                    onUpdate={(newPrefs) => setUser({ ...user, preferences: newPrefs })}
                />

                <SocialAccountsSection />

                <AIInsightSection
                    customPrompt={user.customAiPrompt || ''}
                    onUpdate={(newPrompt) => setUser({ ...user, customAiPrompt: newPrompt })}
                />
            </div>
        </div>
    )
}
