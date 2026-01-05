'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
    Check,
    X,
    Sparkles,
    Zap,
    Crown,
    ArrowRight,
    Loader2,
    ChevronLeft,
    Infinity,
    Database,
    Brain,
    Archive
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app'

interface PlanInfo {
    plan: string
    expiresAt: string | null
}

const plans = [
    {
        id: 'free',
        name: 'Free',
        icon: Sparkles,
        color: 'from-slate-500 to-slate-600',
        bgColor: 'bg-slate-50 dark:bg-slate-900/20',
        borderColor: 'border-slate-200 dark:border-slate-800',
        price: '$0',
        period: 'forever',
        description: 'Perfect for getting started with TidyFeed',
        features: [
            { name: 'Saved tweets', value: '100 per month', icon: Archive },
            { name: 'Storage', value: '500 MB', icon: Database },
            { name: 'AI summaries', value: '5 per month', icon: Brain },
        ],
        limitations: [
            'Basic tweet saving',
            'Limited AI features',
            'Community support'
        ]
    },
    {
        id: 'pro',
        name: 'Pro',
        icon: Zap,
        color: 'from-violet-500 to-purple-600',
        bgColor: 'bg-violet-50 dark:bg-violet-900/20',
        borderColor: 'border-violet-200 dark:border-violet-800',
        price: '$9',
        period: '/month',
        description: 'For power users who need more',
        popular: true,
        features: [
            { name: 'Saved tweets', value: 'Unlimited', icon: Infinity },
            { name: 'Storage', value: '10 GB', icon: Database },
            { name: 'AI summaries', value: '500 per month', icon: Brain },
        ],
        extras: [
            'Priority caching',
            'Advanced AI insights',
            'Email support'
        ]
    },
    {
        id: 'ultra',
        name: 'Ultra',
        icon: Crown,
        color: 'from-amber-500 to-orange-600',
        bgColor: 'bg-amber-50 dark:bg-amber-900/20',
        borderColor: 'border-amber-200 dark:border-amber-800',
        price: '$29',
        period: '/month',
        description: 'Maximum power for professionals',
        features: [
            { name: 'Saved tweets', value: 'Unlimited', icon: Infinity },
            { name: 'Storage', value: '100 GB', icon: Database },
            { name: 'AI summaries', value: '2000 per month', icon: Brain },
        ],
        extras: [
            'Priority caching',
            'Advanced AI insights',
            'Priority support',
            'Early access features',
            'Custom AI prompts'
        ]
    }
]

export default function PricingPage() {
    const router = useRouter()
    const [currentPlan, setCurrentPlan] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [upgrading, setUpgrading] = useState<string | null>(null)

    useEffect(() => {
        fetchCurrentPlan()
    }, [])

    const fetchCurrentPlan = async () => {
        try {
            const response = await fetch(`${API_URL}/api/user/plan`, {
                credentials: 'include'
            })
            if (response.ok) {
                const data = await response.json()
                setCurrentPlan(data.plan)
            }
        } catch (error) {
            console.error('Failed to fetch plan:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleUpgrade = async (planId: string) => {
        setUpgrading(planId)
        try {
            // For now, this will redirect to Stripe checkout
            // In production, this would call your backend to create a checkout session
            toast.info(`Upgrade to ${planId.charAt(0).toUpperCase() + planId.slice(1)} coming soon!`)
            // TODO: Implement actual Stripe checkout
            // const response = await fetch(`${API_URL}/api/subscription/checkout`, {
            //     method: 'POST',
            //     headers: { 'Content-Type': 'application/json' },
            //     credentials: 'include',
            //     body: JSON.stringify({ plan: planId })
            // })
            // const { checkoutUrl } = await response.json()
            // window.location.href = checkoutUrl
        } catch (error) {
            toast.error('Failed to initiate upgrade')
        } finally {
            setUpgrading(null)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-violet-50/30 to-orange-50/30 dark:from-slate-950 dark:via-violet-950/30 dark:to-orange-950/30">
            {/* Header */}
            <div className="border-b bg-white/50 dark:bg-slate-900/50 backdrop-blur-xl">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex h-16 items-center justify-between">
                        <Link
                            href="/dashboard"
                            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 transition-colors"
                        >
                            <ChevronLeft className="h-4 w-4" />
                            Back to Dashboard
                        </Link>
                        {currentPlan && (
                            <Badge variant="outline" className="capitalize">
                                Current plan: {currentPlan}
                            </Badge>
                        )}
                    </div>
                </div>
            </div>

            {/* Hero Section */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
                <div className="text-center max-w-3xl mx-auto">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-300 text-sm font-medium mb-6">
                        <Sparkles className="h-4 w-4" />
                        Simple, transparent pricing
                    </div>
                    <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 dark:text-slate-100 mb-4">
                        Choose your perfect plan
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400">
                        Start free and upgrade as you grow. No hidden fees, cancel anytime.
                    </p>
                </div>
            </div>

            {/* Pricing Cards */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-24">
                <div className="grid md:grid-cols-3 gap-8">
                    {plans.map((plan) => {
                        const Icon = plan.icon
                        const isCurrentPlan = currentPlan === plan.id
                        const isUpgrade = currentPlan && currentPlan !== plan.id

                        return (
                            <Card
                                key={plan.id}
                                className={`relative transition-all duration-300 hover:shadow-xl ${
                                    plan.popular
                                        ? 'border-violet-400 shadow-violet-500/10 scale-105 md:scale-105'
                                        : ''
                                } ${plan.bgColor} ${plan.borderColor}`}
                            >
                                {plan.popular && (
                                    <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                                        <Badge className="bg-gradient-to-r from-violet-500 to-purple-600 text-white border-0 px-4 py-1">
                                            Most Popular
                                        </Badge>
                                    </div>
                                )}

                                <CardHeader className="text-center pb-4">
                                    <div className={`inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br ${plan.color} text-white shadow-lg mb-4 mx-auto`}>
                                        <Icon className="h-7 w-7" />
                                    </div>
                                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                                    <CardDescription className="text-base">
                                        {plan.description}
                                    </CardDescription>
                                    <div className="pt-4">
                                        <span className="text-4xl font-bold text-slate-900 dark:text-slate-100">
                                            {plan.price}
                                        </span>
                                        <span className="text-slate-500 dark:text-slate-400 ml-1">
                                            {plan.period}
                                        </span>
                                    </div>
                                </CardHeader>

                                <CardContent className="space-y-6">
                                    {/* Features */}
                                    <div className="space-y-4">
                                        {plan.features.map((feature) => {
                                            const FeatureIcon = feature.icon
                                            return (
                                                <div key={feature.name} className="flex items-center justify-between">
                                                    <div className="flex items-center gap-3">
                                                        <div className={`h-9 w-9 rounded-xl ${plan.bgColor} flex items-center justify-center`}>
                                                                    <FeatureIcon className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                                                            {feature.name}
                                                        </span>
                                                    </div>
                                                    <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                                                        {feature.value}
                                                    </span>
                                                </div>
                                            )
                                        })}
                                    </div>

                                    <div className="border-t border-slate-200 dark:border-slate-800" />

                                    {/* Extras / Limitations */}
                                    <ul className="space-y-2">
                                        {plan.extras?.map((extra) => (
                                            <li key={extra} className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                                                <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                                                <span>{extra}</span>
                                            </li>
                                        ))}
                                        {plan.limitations?.map((limit) => (
                                            <li key={limit} className="flex items-start gap-2 text-sm text-slate-500">
                                                <X className="h-4 w-4 text-slate-300 mt-0.5 flex-shrink-0" />
                                                <span>{limit}</span>
                                            </li>
                                        ))}
                                    </ul>

                                    {/* CTA Button */}
                                    <Button
                                        className={`w-full h-12 text-base font-semibold transition-all ${
                                            plan.popular
                                                ? 'bg-gradient-to-r from-violet-500 to-purple-600 hover:from-violet-600 hover:to-purple-700 text-white shadow-lg shadow-violet-500/30'
                                                : `bg-slate-900 dark:bg-slate-100 hover:bg-slate-800 dark:hover:bg-slate-200 text-white dark:text-slate-900`
                                        }`}
                                        disabled={isCurrentPlan || loading || upgrading !== null}
                                        onClick={() => isUpgrade && handleUpgrade(plan.id)}
                                    >
                                        {upgrading === plan.id ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Processing...
                                            </>
                                        ) : isCurrentPlan ? (
                                            'Current Plan'
                                        ) : isUpgrade ? (
                                            <>
                                                Upgrade to {plan.name}
                                                <ArrowRight className="ml-2 h-4 w-4" />
                                            </>
                                        ) : (
                                            'Get Started'
                                        )}
                                    </Button>

                                    {plan.id !== 'free' && (
                                        <p className="text-xs text-center text-slate-500">
                                            Secure payment via Stripe. Cancel anytime.
                                        </p>
                                    )}
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>

                {/* Feature Comparison */}
                <div className="mt-20">
                    <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-slate-100 mb-8">
                        Compare all features
                    </h2>
                    <Card>
                        <CardContent className="p-6">
                            <div className="overflow-x-auto">
                                <table className="w-full">
                                    <thead>
                                        <tr className="border-b">
                                            <th className="text-left py-4 px-4 font-semibold text-slate-900 dark:text-slate-100">Feature</th>
                                            <th className="py-4 px-4 font-semibold text-center text-slate-900 dark:text-slate-100">Free</th>
                                            <th className="py-4 px-4 font-semibold text-center text-violet-600">Pro</th>
                                            <th className="py-4 px-4 font-semibold text-center text-amber-600">Ultra</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {[
                                            { feature: 'Saved tweets per month', free: '100', pro: 'Unlimited', ultra: 'Unlimited' },
                                            { feature: 'Storage space', free: '500 MB', pro: '10 GB', ultra: '100 GB' },
                                            { feature: 'AI summaries per month', free: '5', pro: '500', ultra: '2,000' },
                                            { feature: 'Video downloads', free: 'No', pro: 'Yes', ultra: 'Yes' },
                                            { feature: 'AI-powered insights', free: 'Basic', pro: 'Advanced', ultra: 'Advanced' },
                                            { feature: 'Priority tweet caching', free: '', pro: 'Yes', ultra: 'Yes' },
                                            { feature: 'Custom AI prompts', free: '', pro: '', ultra: 'Yes' },
                                            { feature: 'Early access features', free: '', pro: '', ultra: 'Yes' },
                                            { feature: 'Support', free: 'Community', pro: 'Email', ultra: 'Priority' },
                                        ].map((row, i) => (
                                            <tr key={i} className="border-b border-slate-100 dark:border-slate-800">
                                                <td className="py-4 px-4 text-sm text-slate-700 dark:text-slate-300">{row.feature}</td>
                                                <td className="py-4 px-4 text-center text-sm text-slate-600 dark:text-slate-400">{row.free || <X className="h-4 w-4 mx-auto text-slate-300" />}</td>
                                                <td className="py-4 px-4 text-center text-sm text-slate-600 dark:text-slate-400">{row.pro || <X className="h-4 w-4 mx-auto text-slate-300" />}</td>
                                                <td className="py-4 px-4 text-center text-sm text-slate-600 dark:text-slate-400">{row.ultra || <X className="h-4 w-4 mx-auto text-slate-300" />}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* FAQ Section */}
                <div className="mt-20 max-w-3xl mx-auto">
                    <h2 className="text-2xl font-bold text-center text-slate-900 dark:text-slate-100 mb-8">
                        Frequently asked questions
                    </h2>
                    <div className="space-y-4">
                        {[
                            {
                                q: 'Can I change plans later?',
                                a: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately.'
                            },
                            {
                                q: 'What happens if I exceed my limits?',
                                a: 'You\'ll receive a notification when you\'re approaching your limits. You can upgrade to continue using the service.'
                            },
                            {
                                q: 'How is storage calculated?',
                                a: 'Storage includes cached images, videos, and HTML snapshots of tweets you save.'
                            },
                            {
                                q: 'Can I cancel anytime?',
                                a: 'Yes, you can cancel your subscription at any time. You\'ll retain access until the end of your billing period.'
                            }
                        ].map((faq, i) => (
                            <Card key={i}>
                                <CardHeader>
                                    <CardTitle className="text-base">{faq.q}</CardTitle>
                                    <CardDescription className="text-sm">{faq.a}</CardDescription>
                                </CardHeader>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
