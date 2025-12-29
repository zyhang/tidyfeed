'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import {
    Shield,
    Sparkles,
    Download,
    Video,
    ArrowRight,
    Chrome,
    X,
    Check
} from 'lucide-react'

// Animation variants
const fadeInUp = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5 }
}

const stagger = {
    animate: {
        transition: {
            staggerChildren: 0.1
        }
    }
}

// Abstracted Tweet Card Component
function AbstractTweetCard({
    isClean = false,
    isAd = false,
    isBlocked = false
}: {
    isClean?: boolean
    isAd?: boolean
    isBlocked?: boolean
}) {
    return (
        <div className={`
      relative rounded-xl border p-4 transition-all duration-300
      ${isBlocked ? 'opacity-30 scale-95' : ''}
      ${isClean ? 'border-zinc-200 bg-white dark:border-zinc-700 dark:bg-zinc-800' : 'border-zinc-300 bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-900'}
    `}>
            {isAd && (
                <span className="absolute -top-2 -right-2 bg-amber-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">
                    AD
                </span>
            )}
            {isBlocked && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-red-500/90 text-white text-xs px-3 py-1 rounded-full font-medium flex items-center gap-1">
                        <Shield className="h-3 w-3" />
                        Blocked
                    </div>
                </div>
            )}
            <div className="flex gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-300 to-zinc-400 dark:from-zinc-600 dark:to-zinc-700 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                        <div className="h-3 w-20 bg-zinc-300 dark:bg-zinc-600 rounded" />
                        <div className="h-3 w-12 bg-zinc-200 dark:bg-zinc-700 rounded" />
                    </div>
                    <div className="space-y-1.5">
                        <div className="h-2.5 w-full bg-zinc-200 dark:bg-zinc-700 rounded" />
                        <div className="h-2.5 w-4/5 bg-zinc-200 dark:bg-zinc-700 rounded" />
                        <div className="h-2.5 w-2/3 bg-zinc-200 dark:bg-zinc-700 rounded" />
                    </div>
                    {isAd && (
                        <div className="h-24 w-full bg-gradient-to-br from-amber-100 to-amber-50 dark:from-amber-900/30 dark:to-amber-800/20 rounded-lg border border-amber-200 dark:border-amber-700/50" />
                    )}
                </div>
            </div>
        </div>
    )
}

// Feature Card Component
function FeatureCard({
    icon: Icon,
    title,
    description,
    className = '',
    size = 'default'
}: {
    icon: React.ElementType
    title: string
    description: string
    className?: string
    size?: 'default' | 'large'
}) {
    return (
        <motion.div
            variants={fadeInUp}
            className={`
        group relative overflow-hidden rounded-2xl border border-zinc-200 bg-white p-6
        dark:border-zinc-800 dark:bg-zinc-900
        hover:border-zinc-300 dark:hover:border-zinc-700
        transition-all duration-300 hover:shadow-lg hover:shadow-zinc-200/50 dark:hover:shadow-zinc-900/50
        ${size === 'large' ? 'md:col-span-2 md:row-span-2 p-8' : ''}
        ${className}
      `}
        >
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-zinc-100 to-transparent dark:from-zinc-800 rounded-bl-full opacity-50 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
                <div className="mb-4 inline-flex items-center justify-center rounded-xl bg-zinc-100 p-3 dark:bg-zinc-800 group-hover:bg-zinc-200 dark:group-hover:bg-zinc-700 transition-colors">
                    <Icon className="h-6 w-6 text-zinc-700 dark:text-zinc-300" />
                </div>
                <h3 className={`font-semibold text-zinc-900 dark:text-white mb-2 ${size === 'large' ? 'text-xl' : 'text-lg'}`}>
                    {title}
                </h3>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm leading-relaxed">
                    {description}
                </p>
            </div>
        </motion.div>
    )
}

export default function LandingPage() {
    return (
        <div className="min-h-screen bg-white dark:bg-zinc-950">
            {/* Subtle Background Gradient */}
            <div className="fixed inset-0 bg-gradient-to-b from-zinc-50 via-white to-zinc-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 pointer-events-none" />

            {/* Navigation */}
            <nav className="relative z-10 flex items-center justify-between px-6 py-4 md:px-12 lg:px-24">
                <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-lg bg-zinc-900 dark:bg-white flex items-center justify-center">
                        <span className="text-white dark:text-zinc-900 font-bold text-sm">T</span>
                    </div>
                    <span className="font-semibold text-lg">TidyFeed</span>
                </div>
                <Link
                    href="https://chrome.google.com/webstore"
                    className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-800 transition-colors dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100"
                >
                    <Chrome className="h-4 w-4" />
                    Add to Chrome
                </Link>
            </nav>

            {/* Hero Section */}
            <section className="relative z-10 px-6 pt-12 pb-20 md:px-12 lg:px-24 md:pt-20 md:pb-32">
                <motion.div
                    initial="initial"
                    animate="animate"
                    variants={stagger}
                    className="max-w-4xl mx-auto text-center"
                >
                    <motion.div
                        variants={fadeInUp}
                        className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-sm text-zinc-600 dark:text-zinc-400 mb-6"
                    >
                        <Sparkles className="h-4 w-4" />
                        Free Chrome Extension
                    </motion.div>

                    <motion.h1
                        variants={fadeInUp}
                        className="text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight text-zinc-900 dark:text-white mb-6"
                    >
                        Your social feed,
                        <br />
                        <span className="bg-gradient-to-r from-zinc-600 via-zinc-500 to-zinc-600 dark:from-zinc-400 dark:via-zinc-300 dark:to-zinc-400 bg-clip-text text-transparent">
                            finally under control.
                        </span>
                    </motion.h1>

                    <motion.p
                        variants={fadeInUp}
                        className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto mb-10"
                    >
                        TidyFeed removes ads, filters noise with AI, and lets you save what matters.
                        Take back your X/Twitter experience.
                    </motion.p>

                    <motion.div
                        variants={fadeInUp}
                        className="flex flex-col sm:flex-row items-center justify-center gap-4"
                    >
                        <Link
                            href="https://chrome.google.com/webstore"
                            className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-zinc-900 text-white font-medium hover:bg-zinc-800 transition-all hover:scale-105 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 shadow-lg shadow-zinc-900/20 dark:shadow-white/10"
                        >
                            <Chrome className="h-5 w-5" />
                            Add to Chrome — It&apos;s Free
                            <ArrowRight className="h-4 w-4" />
                        </Link>
                    </motion.div>
                </motion.div>
            </section>

            {/* Social Proof Stats */}
            <section className="relative z-10 px-6 py-16 md:px-12 lg:px-24 border-y border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8"
                >
                    {[
                        { value: '1M+', label: 'Ads Blocked' },
                        { value: '50K+', label: 'Users' },
                        { value: '4.9★', label: 'Rating' },
                        { value: '100%', label: 'Free' },
                    ].map((stat) => (
                        <div key={stat.label} className="text-center">
                            <div className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-1">
                                {stat.value}
                            </div>
                            <div className="text-sm text-zinc-500 dark:text-zinc-400">
                                {stat.label}
                            </div>
                        </div>
                    ))}
                </motion.div>
            </section>

            {/* The Noise Problem - Before/After */}
            <section className="relative z-10 px-6 py-20 md:px-12 lg:px-24 md:py-32">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="max-w-5xl mx-auto"
                >
                    <div className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
                            Your feed is full of noise
                        </h2>
                        <p className="text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
                            Ads, promoted posts, and algorithmic clutter fight for your attention.
                            TidyFeed filters them out instantly.
                        </p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 md:gap-12">
                        {/* Before */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                                <X className="h-5 w-5 text-red-500" />
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">Without TidyFeed</span>
                            </div>
                            <div className="space-y-3 opacity-80">
                                <AbstractTweetCard />
                                <AbstractTweetCard isAd />
                                <AbstractTweetCard />
                                <AbstractTweetCard isAd />
                            </div>
                        </div>

                        {/* After */}
                        <div className="space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                                <Check className="h-5 w-5 text-emerald-500" />
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">With TidyFeed</span>
                            </div>
                            <div className="space-y-3">
                                <AbstractTweetCard isClean />
                                <AbstractTweetCard isAd isBlocked />
                                <AbstractTweetCard isClean />
                                <AbstractTweetCard isAd isBlocked />
                            </div>
                        </div>
                    </div>
                </motion.div>
            </section>

            {/* Feature Bento Grid */}
            <section className="relative z-10 px-6 py-20 md:px-12 lg:px-24 bg-zinc-50 dark:bg-zinc-900/50">
                <motion.div
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true }}
                    variants={stagger}
                    className="max-w-5xl mx-auto"
                >
                    <motion.div variants={fadeInUp} className="text-center mb-12">
                        <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
                            Everything you need
                        </h2>
                        <p className="text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto">
                            Powerful features to clean up your feed and capture valuable content.
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                        <FeatureCard
                            icon={Shield}
                            title="Ad Blocker"
                            description="Automatically detects and collapses promoted tweets, ads, and sponsored content. Works silently in the background."
                            size="large"
                            className="lg:col-span-2"
                        />
                        <FeatureCard
                            icon={Sparkles}
                            title="AI Smart Filter"
                            description="Cloud-synced regex patterns powered by AI to filter low-quality content and engagement bait."
                        />
                        <FeatureCard
                            icon={Download}
                            title="Media Downloader"
                            description="One-click download of tweet images and text as organized ZIP files. Perfect for research."
                        />
                        <FeatureCard
                            icon={Video}
                            title="Video Extraction"
                            description="Download videos in the highest quality available. Supports quote tweets and threads."
                            className="lg:col-span-2"
                        />
                    </div>
                </motion.div>
            </section>

            {/* CTA Section */}
            <section className="relative z-10 px-6 py-20 md:px-12 lg:px-24 md:py-32">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    className="max-w-3xl mx-auto text-center"
                >
                    <h2 className="text-3xl md:text-4xl font-bold text-zinc-900 dark:text-white mb-4">
                        Ready to clean up your feed?
                    </h2>
                    <p className="text-zinc-600 dark:text-zinc-400 mb-8 max-w-xl mx-auto">
                        Join thousands of users who&apos;ve taken back control of their social media experience.
                    </p>
                    <Link
                        href="https://chrome.google.com/webstore"
                        className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-zinc-900 text-white font-medium hover:bg-zinc-800 transition-all hover:scale-105 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 shadow-lg shadow-zinc-900/20 dark:shadow-white/10"
                    >
                        <Chrome className="h-5 w-5" />
                        Add to Chrome — It&apos;s Free
                        <ArrowRight className="h-4 w-4" />
                    </Link>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 px-6 py-12 md:px-12 lg:px-24 border-t border-zinc-100 dark:border-zinc-800">
                <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
                    <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-lg bg-zinc-900 dark:bg-white flex items-center justify-center">
                            <span className="text-white dark:text-zinc-900 font-bold text-xs">T</span>
                        </div>
                        <span className="font-medium text-zinc-700 dark:text-zinc-300">TidyFeed</span>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-zinc-500 dark:text-zinc-400">
                        <Link href="https://a.tidyfeed.app/privacy" className="hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
                            Privacy Policy
                        </Link>
                        <Link href="https://a.tidyfeed.app/terms" className="hover:text-zinc-700 dark:hover:text-zinc-200 transition-colors">
                            Terms of Service
                        </Link>
                    </div>

                    <div className="text-sm text-zinc-500 dark:text-zinc-400">
                        © 2025 TidyFeed. All rights reserved.
                    </div>
                </div>
            </footer>
        </div>
    )
}
