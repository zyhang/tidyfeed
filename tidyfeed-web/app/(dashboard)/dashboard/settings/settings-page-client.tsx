'use client'

import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import { ProfileSection } from './_components/profile-section'
import { PreferencesSection } from './_components/preferences-section'
import { SocialAccountsSection } from './_components/social-accounts-section'
import { AIInsightSection } from './_components/ai-insight-section'
import { BillingSection } from './_components/billing-section'

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

const TAB_ITEMS = [
    { id: 'profile', label: 'Profile' },
    { id: 'preferences', label: 'Preferences' },
    { id: 'social', label: 'Social Accounts' },
    { id: 'ai', label: 'AI Insight' },
    { id: 'billing', label: 'Billing' },
] as const

type TabId = (typeof TAB_ITEMS)[number]['id']

export function SettingsPageClient() {
    const [user, setUser] = useState<UserData | null>(null)
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<TabId>('profile')

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

            <div className="rounded-2xl border bg-card/60 backdrop-blur">
                <div className="border-b px-3 py-3 sm:px-6">
                    <div
                        role="tablist"
                        aria-label="Settings tabs"
                        className="flex flex-wrap items-center gap-2"
                    >
                        {TAB_ITEMS.map((tab) => {
                            const isActive = activeTab === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    role="tab"
                                    aria-selected={isActive}
                                    aria-controls={`settings-panel-${tab.id}`}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={
                                        `px-3 py-1.5 text-sm font-medium rounded-full transition-colors ` +
                                        (isActive
                                            ? 'bg-primary text-primary-foreground shadow-sm'
                                            : 'text-muted-foreground hover:text-foreground hover:bg-muted')
                                    }
                                >
                                    {tab.label}
                                </button>
                            )
                        })}
                    </div>
                </div>
                <div className="p-6">
                    {activeTab === 'profile' && (
                        <div id="settings-panel-profile" role="tabpanel">
                            <ProfileSection
                                user={user}
                                onUpdate={(newName) => setUser({ ...user, name: newName })}
                            />
                        </div>
                    )}

                    {activeTab === 'preferences' && (
                        <div id="settings-panel-preferences" role="tabpanel">
                            <PreferencesSection
                                preferences={user.preferences || {}}
                                onUpdate={(newPrefs) => setUser({ ...user, preferences: newPrefs })}
                            />
                        </div>
                    )}

                    {activeTab === 'social' && (
                        <div id="settings-panel-social" role="tabpanel">
                            <SocialAccountsSection />
                        </div>
                    )}

                    {activeTab === 'ai' && (
                        <div id="settings-panel-ai" role="tabpanel">
                            <AIInsightSection
                                customPrompt={user.customAiPrompt || ''}
                                onUpdate={(newPrompt) => setUser({ ...user, customAiPrompt: newPrompt })}
                            />
                        </div>
                    )}

                    {activeTab === 'billing' && (
                        <div id="settings-panel-billing" role="tabpanel">
                            <BillingSection />
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
