'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Loader2, User, Sparkles, Zap, Crown, ArrowRight, Gem } from 'lucide-react'

// Design System Components
import { Section } from '@/components/layout'
import { Progress } from '@/components/ui/progress'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app'

interface ProfileSectionProps {
    user: {
        id: string
        name: string
        email: string
        avatarUrl: string
    }
    onUpdate: (newName: string) => void
}

interface PlanInfo {
    plan: string
    expiresAt: string | null
    usage: {
        collection: { used: number; limit: number; remaining: number; allowed: boolean }
        aiSummary: { used: number; limit: number; remaining: number; allowed: boolean }
        storage: { used: number; limit: number; remaining: number; allowed: boolean }
    }
}

const planConfig = {
    free: { name: 'Free', icon: Sparkles, color: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300' },
    pro: { name: 'Pro', icon: Zap, color: 'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300' },
    ultra: { name: 'Ultra', icon: Crown, color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' }
}

function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 B'
    const k = 1024
    const sizes = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getPlanIcon(plan: string) {
    switch (plan) {
        case 'pro': return Zap
        case 'ultra': return Crown
        default: return Sparkles
    }
}

export function ProfileSection({ user, onUpdate }: ProfileSectionProps) {
    const [name, setName] = useState(user.name)
    const [isSaving, setIsSaving] = useState(false)
    const [planInfo, setPlanInfo] = useState<PlanInfo | null>(null)
    const [loadingPlan, setLoadingPlan] = useState(true)

    useEffect(() => {
        fetchPlanInfo()
    }, [])

    const fetchPlanInfo = async () => {
        try {
            const response = await fetch(`${API_URL}/api/user/plan`, {
                credentials: 'include'
            })
            if (response.ok) {
                const data = await response.json()
                setPlanInfo(data)
            }
        } catch (error) {
            console.error('Failed to fetch plan info:', error)
        } finally {
            setLoadingPlan(false)
        }
    }

    const handleSave = async () => {
        if (!name.trim()) return
        if (name === user.name) return

        setIsSaving(true)
        try {
            const response = await fetch(`${API_URL}/api/user/profile`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name }),
            })

            if (!response.ok) throw new Error('Failed to update profile')

            toast.success('Profile updated')
            onUpdate(name)

            // Dispatch event to update UserNav component in sidebar
            window.dispatchEvent(new CustomEvent('user-profile-updated'))
        } catch (error) {
            console.error(error)
            toast.error('Failed to update profile')
        } finally {
            setIsSaving(false)
        }
    }

    const PlanIcon = planInfo ? getPlanIcon(planInfo.plan) : Sparkles
    const isPaidPlan = planInfo?.plan === 'pro' || planInfo?.plan === 'ultra'

    return (
        <div className="space-y-6">
            {/* Subscription Plan Section */}
            {loadingPlan ? (
                <Section>
                    <div className="flex items-center justify-center h-24">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                </Section>
            ) : planInfo ? (
                <Section
                    title={
                        <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${planConfig[planInfo.plan as keyof typeof planConfig]?.color || planConfig.free.color}`}>
                                <PlanIcon className="h-5 w-5" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold">
                                    {planConfig[planInfo.plan as keyof typeof planConfig]?.name || 'Free'} Plan
                                </h2>
                                <p className="text-sm text-muted-foreground">
                                    {isPaidPlan && planInfo.expiresAt
                                        ? `Renews on ${new Date(planInfo.expiresAt).toLocaleDateString()}`
                                        : 'Upgrade anytime for more features'
                                    }
                                </p>
                            </div>
                        </div>
                    }
                    actions={
                        <Badge variant={isPaidPlan ? 'default' : 'secondary'} className="capitalize">
                            {planInfo.plan}
                        </Badge>
                    }
                    className={isPaidPlan ? 'border-violet-200 dark:border-violet-800 bg-gradient-to-br from-violet-50/50 to-purple-50/50 dark:from-violet-950/20 dark:to-purple-950/20' : ''}
                    noPadding
                >
                    <div className="p-6 space-y-6">
                        {/* Usage Bars */}
                        <div className="space-y-4">
                            {/* Collections */}
                            {planInfo.usage.collection.limit !== Infinity && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Saved this month</span>
                                        <span className="font-medium">
                                            {planInfo.usage.collection.used} / {planInfo.usage.collection.limit}
                                        </span>
                                    </div>
                                    <Progress
                                        value={(planInfo.usage.collection.used / planInfo.usage.collection.limit) * 100}
                                        className="h-2"
                                    />
                                </div>
                            )}

                            {/* Storage */}
                            {planInfo.usage.storage.limit !== Infinity && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Storage used</span>
                                        <span className="font-medium">
                                            {formatBytes(planInfo.usage.storage.used)} / {formatBytes(planInfo.usage.storage.limit)}
                                        </span>
                                    </div>
                                    <Progress
                                        value={(planInfo.usage.storage.used / planInfo.usage.storage.limit) * 100}
                                        className="h-2 [&>div]:bg-amber-500"
                                    />
                                </div>
                            )}

                            {/* AI Summaries */}
                            {planInfo.usage.aiSummary.limit !== Infinity && (
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">AI summaries this month</span>
                                        <span className="font-medium">
                                            {planInfo.usage.aiSummary.used} / {planInfo.usage.aiSummary.limit}
                                        </span>
                                    </div>
                                    <Progress
                                        value={(planInfo.usage.aiSummary.used / planInfo.usage.aiSummary.limit) * 100}
                                        className="h-2 [&>div]:bg-emerald-500"
                                    />
                                </div>
                            )}
                        </div>

                        {/* Upgrade Button */}
                        {planInfo.plan !== 'ultra' && (
                            <Link href="/pricing">
                                <Button className="w-full bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white">
                                    <Gem className="mr-2 h-4 w-4" />
                                    Upgrade to {planInfo.plan === 'free' ? 'Pro' : 'Ultra'}
                                    <ArrowRight className="ml-2 h-4 w-4" />
                                </Button>
                            </Link>
                        )}
                    </div>
                </Section>
            ) : null}

            {/* Profile Section */}
            <Section title="Profile" description="Manage your public profile information.">
                <div className="space-y-6">
                    {/* Avatar & Email */}
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={user.avatarUrl} />
                            <AvatarFallback><User className="h-8 w-8" /></AvatarFallback>
                        </Avatar>
                        <div className="space-y-0.5">
                            <h3 className="font-medium">{user.name}</h3>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                    </div>

                    {/* Nickname Input */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium">Display Name</label>
                        <div className="flex gap-2 max-w-md">
                            <Input
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your display name"
                            />
                            <Button
                                onClick={handleSave}
                                disabled={isSaving || name === user.name || !name.trim()}
                            >
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save
                            </Button>
                        </div>
                    </div>
                </div>
            </Section>

            {/* Delete Account Section */}
            <Section
                title="Delete Account"
                description="Permanently remove your account and all of its content."
                className="border-red-100 dark:border-red-900/20"
            >
                <div className="space-y-4">
                    <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-md text-sm text-red-600">
                        Deleting your account will irreversibly delete all of your data, including your highlights, tags, notes, and more.
                    </div>
                    <Button variant="destructive" disabled>
                        Delete Account
                    </Button>
                </div>
            </Section>
        </div>
    )
}
