'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { User, Settings, Share2, Sparkles, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ProfileSection } from './_components/profile-section'
import { PreferencesSection } from './_components/preferences-section'
import { AIInsightSection } from './_components/ai-insight-section'
import { SocialAccountsSection } from './_components/social-accounts-section'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app'

const SIDEBAR_ITEMS = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'preferences', label: 'Preferences', icon: Settings },
    { id: 'social', label: 'Social Accounts', icon: Share2 },
    { id: 'ai', label: 'AI Insight', icon: Sparkles },
]

export default function SettingsPage() {
    const router = useRouter()
    const searchParams = useSearchParams()

    // Allow linking to specific tab ?tab=ai
    const initialTab = searchParams.get('tab') || 'profile'

    const [activeTab, setActiveTab] = useState(initialTab)
    const [user, setUser] = useState<any>(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchUser() {
            try {
                const response = await fetch(`${API_URL}/auth/me`, {
                    credentials: 'include',
                })

                if (!response.ok) {
                    if (response.status === 401) {
                        router.push('/')
                        return
                    }
                    throw new Error('Failed to fetch user')
                }

                const data = await response.json()
                setUser(data.user)
            } catch (error) {
                console.error('Fetch user error:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchUser()
    }, [router])

    useEffect(() => {
        // Sync URL with Tab
        const params = new URLSearchParams(window.location.search)
        if (params.get('tab') !== activeTab) {
            router.push(`/dashboard/settings?tab=${activeTab}`, { scroll: false })
        }
    }, [activeTab, router])

    if (loading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!user) return null

    return (
        <div className="space-y-6 pb-16">
            <div className="space-y-0.5">
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your account settings and preferences.
                </p>
            </div>

            <div className="flex flex-col space-y-8 lg:flex-row lg:space-x-12 lg:space-y-0">
                <aside className="-mx-4 lg:w-1/5">
                    <nav className="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
                        {SIDEBAR_ITEMS.map((item) => (
                            <button
                                key={item.id}
                                onClick={() => setActiveTab(item.id)}
                                className={cn(
                                    "flex items-center gap-2 justify-start rounded-md px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground transition-colors text-left",
                                    activeTab === item.id
                                        ? "bg-muted hover:bg-muted"
                                        : "hover:bg-transparent hover:underline",
                                    "justify-start"
                                )}
                            >
                                <item.icon className="h-4 w-4" />
                                {item.label}
                            </button>
                        ))}
                    </nav>
                </aside>

                <div className="flex-1 lg:max-w-2xl text-left">
                    {activeTab === 'profile' && (
                        <ProfileSection
                            user={user}
                            onUpdate={(newName) => setUser({ ...user, name: newName })}
                        />
                    )}

                    {activeTab === 'preferences' && (
                        <PreferencesSection
                            preferences={user.preferences || {}}
                            onUpdate={(newPrefs) => setUser({ ...user, preferences: newPrefs })}
                        />
                    )}

                    {activeTab === 'social' && (
                        <SocialAccountsSection />
                    )}

                    {activeTab === 'ai' && (
                        <AIInsightSection
                            customPrompt={user.customAiPrompt}
                            onUpdate={(newPrompt) => setUser({ ...user, customAiPrompt: newPrompt })}
                        />
                    )}
                </div>
            </div>
        </div>
    )
}
