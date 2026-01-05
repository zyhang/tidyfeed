
'use client'

import { useState, useEffect } from 'react'
import { Check, Loader2, CreditCard, Zap, Database, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface PlanInfo {
    plan: 'free' | 'pro' | 'ultra'
    expiresAt: string | null
    limits: {
        collectionPerMonth: number
        storageBytes: number
        aiSummaryPerMonth: number
    }
    usage: {
        collection: { used: number; limit: number; remaining: number }
        aiSummary: { used: number; limit: number; remaining: number }
        storage: { used: number; limit: number; remaining: number }
    }
}

const PLANS = {
    free: {
        name: 'Free',
        price: '0',
        features: ['100 posts/month', '500MB storage', '5 AI summaries/month'],
        description: 'For casual users',
    },
    pro: {
        name: 'Pro',
        price: '9',
        features: [
            'Unlimited posts',
            '10GB storage',
            '500 AI summaries/month',
            'Priority support',
        ],
        description: 'For power users',
    },
    ultra: {
        name: 'Ultra',
        price: '29',
        features: [
            'Unlimited posts',
            '100GB storage',
            '2000 AI summaries/month',
            'Early access to features',
        ],
        description: 'For creators',
    },
}

export function BillingSection() {
    const [info, setInfo] = useState<PlanInfo | null>(null)
    const [loading, setLoading] = useState(true)
    const [processing, setProcessing] = useState<string | null>(null)

    useEffect(() => {
        fetchPlanInfo()
    }, [])

    const fetchPlanInfo = async () => {
        try {
            // Note: Ensure /api/user/plan is accessible.
            // Using relative path assuming Next.js rewrites or same domain, otherwise use env var
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app'
            const res = await fetch(`${apiUrl}/api/user/plan`, {
                credentials: 'include',
            })
            if (res.ok) {
                const data = await res.json()
                setInfo(data)
            }
        } catch (error) {
            console.error('Failed to fetch plan info:', error)
            toast.error('Failed to load billing information')
        } finally {
            setLoading(false)
        }
    }

    const handleUpgrade = async (plan: 'pro' | 'ultra') => {
        setProcessing(plan)
        try {
            const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app'
            const res = await fetch(`${apiUrl}/api/stripe/checkout`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    plan,
                    returnUrl: window.location.origin + '/dashboard/settings',
                }),
            })

            const data = await res.json()

            if (!res.ok) {
                throw new Error(data.error || 'Failed to start checkout')
            }

            if (data.url) {
                window.location.href = data.url
            }
        } catch (error: any) {
            console.error('Upgrade error:', error)
            toast.error(error.message)
            setProcessing(null)
        }
    }

    if (loading) {
        return (
            <div className="flex h-40 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (!info) return null

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B'
        const k = 1024
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
        const i = Math.floor(Math.log(bytes) / Math.log(k))
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
    }

    const getProgress = (used: number, limit: number) => {
        if (limit === Infinity || limit === 0) return 0
        return Math.min(100, (used / limit) * 100)
    }

    return (
        <div className="space-y-8">
            {/* Current Plan & Usage */}
            <div className="grid gap-6 md:grid-cols-2">
                <div className="rounded-xl border bg-card p-6 shadow-sm">
                    <h3 className="flex items-center gap-2 font-semibold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent text-lg">
                        <Zap className="h-5 w-5 text-blue-600" /> Current Plan
                    </h3>
                    <div className="mt-4 flex items-baseline gap-2">
                        <span className="text-3xl font-bold capitalize">{info.plan}</span>
                        {info.plan !== 'free' && (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                Active
                            </Badge>
                        )}
                    </div>
                    {info.expiresAt && (
                        <p className="text-sm text-muted-foreground mt-2">
                            Renews on {new Date(info.expiresAt).toLocaleDateString()}
                        </p>
                    )}
                </div>

                <div className="space-y-4 rounded-xl border bg-card p-6 shadow-sm">
                    <h3 className="font-semibold flex items-center gap-2">
                        <Database className="h-4 w-4" /> Usage
                    </h3>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Storage</span>
                            <span>
                                {formatBytes(info.usage.storage.used)} / {formatBytes(info.usage.storage.limit)}
                            </span>
                        </div>
                        <Progress value={getProgress(info.usage.storage.used, info.usage.storage.limit)} className="h-2" />
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">AI Summaries</span>
                            <span>
                                {info.usage.aiSummary.used} / {info.usage.aiSummary.limit === Infinity ? '∞' : info.usage.aiSummary.limit}
                            </span>
                        </div>
                        <Progress value={getProgress(info.usage.aiSummary.used, info.usage.aiSummary.limit)} className="h-2" />
                    </div>
                </div>
            </div>

            {/* Upgrade Options */}
            <div>
                <h3 className="mb-4 text-lg font-semibold">Available Plans</h3>
                <div className="grid gap-6 md:grid-cols-3">
                    {(Object.keys(PLANS) as Array<keyof typeof PLANS>).map((planKey) => {
                        const plan = PLANS[planKey]
                        const isCurrent = info.plan === planKey
                        const isPopular = planKey === 'pro'

                        return (
                            <div
                                key={planKey}
                                className={cn(
                                    "relative flex flex-col rounded-xl border bg-card p-6 shadow-sm transition-all hover:shadow-md",
                                    isCurrent && "border-blue-200 ring-1 ring-blue-200 bg-blue-50/10",
                                    isPopular && !isCurrent && "border-primary/20 shadow-primary/5"
                                )}
                            >
                                {isPopular && (
                                    <div className="absolute -top-3 left-0 right-0 mx-auto w-fit rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground font-medium">
                                        Most Popular
                                    </div>
                                )}

                                <div className="mb-4">
                                    <h4 className="font-bold text-lg">{plan.name}</h4>
                                    <p className="text-sm text-muted-foreground">{plan.description}</p>
                                </div>
                                <div className="mb-6 flex items-baseline">
                                    <span className="text-3xl font-bold">${plan.price}</span>
                                    <span className="text-muted-foreground">/mo</span>
                                </div>

                                <ul className="mb-6 flex-1 space-y-2 text-sm">
                                    {plan.features.map((feature) => (
                                        <li key={feature} className="flex items-center gap-2">
                                            <Check className="h-4 w-4 text-green-500 shrink-0" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <Button
                                    className="w-full"
                                    variant={isCurrent ? "outline" : isPopular ? "default" : "secondary"}
                                    disabled={isCurrent || processing !== null}
                                    onClick={() => !isCurrent && handleUpgrade(planKey as 'pro' | 'ultra')}
                                >
                                    {processing === planKey ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    ) : isCurrent ? (
                                        "Current Plan"
                                    ) : (
                                        "Upgrade"
                                    )}
                                </Button>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
