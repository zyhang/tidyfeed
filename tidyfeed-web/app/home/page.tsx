'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion, useScroll, useTransform, useSpring } from 'framer-motion'
import { useRef, useEffect, useState } from 'react'
import {
    Shield,
    Sparkles,
    Download,
    Video,
    ArrowRight,
    Chrome,
    X,
    Check,
    Zap,
    Bookmark,
    Filter,
    Star,
    Quote,
    Twitter
} from 'lucide-react'

// Animation variants
const fadeInUp = {
    initial: { opacity: 0, y: 30 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }
}

const staggerContainer = {
    animate: {
        transition: {
            staggerChildren: 0.12
        }
    }
}

const scaleIn = {
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
}

// Floating animation for cards
const floatAnimation = {
    animate: {
        y: [0, -10, 0],
    },
    transition: {
        duration: 4,
        repeat: Infinity,
        times: [0, 0.5, 1]
    }
}

// Glow pulse for CTA
const glowPulse = {
    animate: {
        boxShadow: [
            '0 0 20px rgba(139, 92, 246, 0.3)',
            '0 0 40px rgba(139, 92, 246, 0.5)',
            '0 0 20px rgba(139, 92, 246, 0.3)'
        ]
    },
    transition: {
        duration: 2,
        repeat: Infinity,
        times: [0, 0.5, 1]
    }
}

// Animated Counter Component
function Counter({ end, suffix = '', duration = 2 }: { end: number, suffix?: string, duration?: number }) {
    const [count, setCount] = useState(0)
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        if (!isVisible) return
        let startTime: number
        let animationFrame: number

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime
            const progress = Math.min((currentTime - startTime) / (duration * 1000), 1)
            const easeOut = 1 - Math.pow(1 - progress, 3)
            setCount(Math.floor(easeOut * end))

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate)
            }
        }

        animationFrame = requestAnimationFrame(animate)
        return () => cancelAnimationFrame(animationFrame)
    }, [isVisible, end, duration])

    return (
        <span ref={(el) => {
            if (el && !isVisible) setIsVisible(true)
        }}>
            {count}{suffix}
        </span>
    )
}

// Glass Card Component
function GlassCard({
    children,
    className = '',
    delay = 0
}: {
    children: React.ReactNode
    className?: string
    delay?: number
}) {
    return (
        <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeInUp}
            transition={{ delay }}
            className={`
                relative overflow-hidden rounded-2xl
                bg-white/70 dark:bg-zinc-900/70
                backdrop-blur-xl
                border border-white/20 dark:border-white/10
                shadow-xl shadow-zinc-200/50 dark:shadow-black/50
                ${className}
            `}
        >
            <div className="absolute inset-0 bg-gradient-to-br from-white/40 to-transparent dark:from-white/5" />
            <div className="relative z-10">
                {children}
            </div>
        </motion.div>
    )
}

// Feature Card with Hover Effect
function FeatureCard({
    icon: Icon,
    title,
    description,
    gradient,
    size = 'default',
    delay = 0
}: {
    icon: React.ElementType
    title: string
    description: string
    gradient: string
    size?: 'default' | 'large' | 'wide'
    delay?: number
}) {
    return (
        <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-100px' }}
            variants={scaleIn}
            transition={{ delay }}
            whileHover={{ scale: 1.02, y: -4 }}
            className={`
                group relative overflow-hidden rounded-2xl
                bg-white/80 dark:bg-zinc-900/80
                backdrop-blur-xl
                border border-white/20 dark:border-white/10
                p-6 cursor-pointer
                transition-all duration-300
                hover:shadow-2xl hover:shadow-violet-500/10
                ${size === 'large' ? 'md:col-span-2 md:row-span-2 p-8' : ''}
                ${size === 'wide' ? 'md:col-span-2' : ''}
            `}
        >
            {/* Gradient background on hover */}
            <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />

            {/* Icon container */}
            <div className={`
                relative mb-4 inline-flex items-center justify-center
                rounded-xl bg-gradient-to-br ${gradient}
                p-3
                ${size === 'large' ? 'p-4' : 'p-3'}
            `}>
                <Icon className={`text-white ${size === 'large' ? 'h-7 w-7' : 'h-6 w-6'}`} />
            </div>

            {/* Content */}
            <div className="relative">
                <h3 className={`font-bold text-zinc-900 dark:text-white mb-2 ${size === 'large' ? 'text-xl' : 'text-lg'}`}>
                    {title}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                    {description}
                </p>
            </div>

            {/* Subtle shine effect */}
            <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out">
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent skew-x-12" />
            </div>
        </motion.div>
    )
}

// Testimonial Card
function TestimonialCard({
    name,
    role,
    content,
    avatar,
    rating,
    delay
}: {
    name: string
    role: string
    content: string
    avatar: string
    rating: number
    delay: number
}) {
    return (
        <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeInUp}
            transition={{ delay }}
            className="relative"
        >
            <div className="absolute -top-3 -left-3 text-6xl text-violet-500/20 dark:text-violet-400/20">
                <Quote fill="currentColor" />
            </div>
            <GlassCard className="p-6 pt-8 h-full">
                <div className="flex items-center gap-1 mb-3">
                    {[...Array(5)].map((_, i) => (
                        <Star
                            key={i}
                            className={`h-4 w-4 ${i < rating ? 'fill-amber-400 text-amber-400' : 'text-zinc-300 dark:text-zinc-600'}`}
                        />
                    ))}
                </div>
                <p className="text-zinc-700 dark:text-zinc-300 mb-4 leading-relaxed">
                    "{content}"
                </p>
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white font-semibold">
                        {avatar}
                    </div>
                    <div>
                        <div className="font-semibold text-zinc-900 dark:text-white text-sm">{name}</div>
                        <div className="text-xs text-zinc-500 dark:text-zinc-400">{role}</div>
                    </div>
                </div>
            </GlassCard>
        </motion.div>
    )
}

// Step indicator for "How it works"
function StepIndicator({
    step,
    title,
    description,
    icon: Icon,
    delay
}: {
    step: number
    title: string
    description: string
    icon: React.ElementType
    delay: number
}) {
    return (
        <motion.div
            initial="initial"
            whileInView="animate"
            viewport={{ once: true, margin: '-100px' }}
            variants={fadeInUp}
            transition={{ delay }}
            className="relative flex gap-6 group"
        >
            {/* Step number */}
            <div className="relative flex flex-col items-center">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-500 to-blue-500 flex items-center justify-center text-white font-bold text-lg shadow-lg shadow-violet-500/30 group-hover:scale-110 transition-transform duration-300">
                    {step}
                </div>
                {step !== 4 && (
                    <div className="w-0.5 h-16 bg-gradient-to-b from-violet-500/50 to-transparent mt-2" />
                )}
            </div>

            {/* Content */}
            <div className="pt-2 pb-8">
                <div className="flex items-center gap-2 mb-1">
                    <Icon className="h-5 w-5 text-violet-500" />
                    <h3 className="font-semibold text-zinc-900 dark:text-white">{title}</h3>
                </div>
                <p className="text-sm text-zinc-600 dark:text-zinc-400">{description}</p>
            </div>
        </motion.div>
    )
}

// Hero Mockup - Floating Tweet Cards
function FloatingMockup() {
    return (
        <div className="relative h-[400px] w-full max-w-lg mx-auto">
            {/* Background glow */}
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 via-blue-500/20 to-cyan-500/20 rounded-full blur-3xl" />

            {/* Floating cards */}
            <motion.div
                animate={floatAnimation.animate}
                transition={{ ...floatAnimation.transition, delay: 0 }}
                className="absolute top-0 left-0 right-0 mx-auto w-[90%] max-w-xs"
            >
                <GlassCard className="p-4">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-red-400 to-red-600" />
                        <div>
                            <div className="font-semibold text-sm">Promoted Post</div>
                            <div className="text-xs text-zinc-500">Sponsored</div>
                        </div>
                        <div className="ml-auto bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-full font-medium">AD</div>
                    </div>
                    <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded mb-2" />
                    <div className="h-2 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded mb-3" />
                    <div className="h-24 w-full bg-gradient-to-br from-red-100 to-red-50 dark:from-red-900/30 dark:to-red-800/20 rounded-lg border border-red-200 dark:border-red-700/50" />
                </GlassCard>
            </motion.div>

            <motion.div
                animate={floatAnimation.animate}
                transition={{ ...floatAnimation.transition, delay: 1.3 }}
                className="absolute top-24 left-0 right-0 mx-auto w-[90%] max-w-xs"
            >
                <GlassCard className="p-4 opacity-60">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-zinc-400 to-zinc-600" />
                        <div>
                            <div className="font-semibold text-sm">Random User</div>
                            <div className="text-xs text-zinc-500">@randomuser</div>
                        </div>
                    </div>
                    <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded mb-2" />
                    <div className="h-2 w-5/6 bg-zinc-200 dark:bg-zinc-700 rounded" />
                </GlassCard>
            </motion.div>

            {/* Clean card overlay */}
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
                className="absolute bottom-0 left-0 right-0 mx-auto w-[95%] max-w-xs z-10"
            >
                <div className="relative rounded-2xl border-2 border-emerald-500/50 bg-white dark:bg-zinc-900 p-4 shadow-2xl shadow-emerald-500/20">
                    <div className="absolute -top-3 -right-3 bg-emerald-500 text-white text-xs px-3 py-1 rounded-full font-semibold flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Clean
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600" />
                        <div>
                            <div className="font-semibold text-sm text-zinc-900 dark:text-white">Quality Content</div>
                            <div className="text-xs text-zinc-500">@creator</div>
                        </div>
                    </div>
                    <div className="h-2 w-full bg-zinc-200 dark:bg-zinc-700 rounded mb-2" />
                    <div className="h-2 w-4/5 bg-zinc-200 dark:bg-zinc-700 rounded" />
                </div>
            </motion.div>
        </div>
    )
}

export default function LandingPage() {
    const { scrollY } = useScroll()
    const y1 = useTransform(scrollY, [0, 500], [0, 150])
    const y2 = useTransform(scrollY, [0, 500], [0, -150])
    const opacity = useTransform(scrollY, [0, 300], [1, 0])
    const scale = useSpring(useTransform(scrollY, [0, 500], [1, 0.9]), { stiffness: 100, damping: 20 })

    return (
        <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-950 dark:to-zinc-900 overflow-hidden">
            {/* Animated background orbs */}
            <div className="fixed inset-0 pointer-events-none overflow-hidden">
                <motion.div
                    style={{ y: y1, opacity }}
                    className="absolute top-1/4 -left-32 w-96 h-96 bg-violet-500/20 dark:bg-violet-500/10 rounded-full blur-3xl"
                />
                <motion.div
                    style={{ y: y2, opacity }}
                    className="absolute top-1/3 -right-32 w-96 h-96 bg-blue-500/20 dark:bg-blue-500/10 rounded-full blur-3xl"
                />
                <motion.div
                    style={{ y: useTransform(scrollY, [0, 500], [0, 100]), opacity }}
                    className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-500/10 dark:bg-cyan-500/5 rounded-full blur-3xl"
                />
            </div>

            {/* Navigation */}
            <motion.nav
                style={{ opacity }}
                className="relative z-50 flex items-center justify-between px-4 sm:px-6 py-4 max-w-7xl mx-auto"
            >
                <Link href="/" className="flex items-center gap-2.5 group">
                    <div className="relative">
                        <Image
                            src="/logo.jpg"
                            alt="TidyFeed Logo"
                            width={36}
                            height={36}
                            className="rounded-xl group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-tr from-violet-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    </div>
                    <span className="font-bold text-lg bg-gradient-to-r from-zinc-900 to-zinc-600 dark:from-white dark:to-zinc-300 bg-clip-text text-transparent">
                        TidyFeed
                    </span>
                </Link>

                <div className="flex items-center gap-3">
                    <Link
                        href="https://a.tidyfeed.app"
                        className="hidden sm:block text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200"
                    >
                        Dashboard
                    </Link>
                    <Link
                        href="https://chrome.google.com/webstore"
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 text-white text-sm font-medium hover:from-violet-600 hover:to-blue-600 transition-all duration-300 shadow-lg shadow-violet-500/25 hover:shadow-violet-500/40 hover:scale-105"
                    >
                        <Chrome className="h-4 w-4" />
                        <span className="hidden sm:inline">Add to Chrome</span>
                        <span className="sm:hidden">Install</span>
                    </Link>
                </div>
            </motion.nav>

            {/* Hero Section */}
            <section className="relative z-10 px-4 sm:px-6 pt-12 pb-20 md:pt-20 md:pb-32 max-w-7xl mx-auto">
                <motion.div
                    initial="initial"
                    animate="animate"
                    variants={staggerContainer}
                    className="grid lg:grid-cols-2 gap-12 items-center"
                >
                    <motion.div variants={fadeInUp} className="text-center lg:text-left">
                        {/* Badge */}
                        <motion.div
                            variants={fadeInUp}
                            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/80 dark:bg-zinc-800/80 backdrop-blur-sm border border-violet-200 dark:border-violet-500/20 text-sm text-zinc-700 dark:text-zinc-300 mb-6 shadow-lg"
                        >
                            <div className="relative">
                                <Sparkles className="h-4 w-4 text-violet-500" />
                                <div className="absolute inset-0 animate-ping bg-violet-500/30 rounded-full" />
                            </div>
                            Free Chrome Extension
                        </motion.div>

                        {/* Main headline */}
                        <motion.h1
                            variants={fadeInUp}
                            className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-bold tracking-tight text-zinc-900 dark:text-white mb-6 leading-[1.1]"
                        >
                            Your feed,
                            <br />
                            <span className="inline-block bg-gradient-to-r from-violet-500 via-blue-500 to-cyan-500 bg-clip-text text-transparent animate-gradient bg-[length:200%_auto]">
                                finally clean.
                            </span>
                        </motion.h1>

                        {/* Subheadline */}
                        <motion.p
                            variants={fadeInUp}
                            className="text-lg md:text-xl text-zinc-600 dark:text-zinc-400 max-w-xl mx-auto lg:mx-0 mb-8 leading-relaxed"
                        >
                            Remove ads, filter noise with AI, and save what matters. Take back control of your X/Twitter experience in seconds.
                        </motion.p>

                        {/* CTA Buttons */}
                        <motion.div
                            variants={fadeInUp}
                            className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4"
                        >
                            <motion.div
                                variants={glowPulse}
                                animate={glowPulse.animate}
                                transition={glowPulse.transition}
                                className="rounded-full"
                            >
                                <Link
                                    href="https://chrome.google.com/webstore"
                                    className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-gradient-to-r from-violet-500 to-blue-500 text-white font-semibold hover:from-violet-600 hover:to-blue-600 transition-all duration-300 shadow-xl shadow-violet-500/30 hover:shadow-violet-500/50 hover:-translate-y-0.5"
                                >
                                    <Chrome className="h-5 w-5" />
                                    Add to Chrome — Free
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </motion.div>
                        </motion.div>

                        {/* Trust indicators */}
                        <motion.div
                            variants={fadeInUp}
                            className="flex items-center justify-center lg:justify-start gap-6 mt-8 text-sm text-zinc-500 dark:text-zinc-400"
                        >
                            <div className="flex items-center gap-1.5">
                                <Shield className="h-4 w-4 text-emerald-500" />
                                <span>Privacy first</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Zap className="h-4 w-4 text-amber-500" />
                                <span>Instant setup</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Check className="h-4 w-4 text-blue-500" />
                                <span>No account needed</span>
                            </div>
                        </motion.div>
                    </motion.div>

                    {/* Hero Mockup */}
                    <motion.div
                        variants={scaleIn}
                        style={{ scale }}
                        className="relative"
                    >
                        <FloatingMockup />
                    </motion.div>
                </motion.div>
            </section>

            {/* Animated Stats */}
            <section className="relative z-10 px-4 sm:px-6 py-16 max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="rounded-3xl bg-gradient-to-br from-violet-500/10 via-blue-500/10 to-cyan-500/10 backdrop-blur-xl border border-white/20 dark:border-white/10 p-8 md:p-12"
                >
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
                        {[
                            { value: 1000000, suffix: '+', label: 'Ads Blocked', icon: Shield },
                            { value: 50000, suffix: '+', label: 'Active Users', icon: Users },
                            { value: 4.9, suffix: '★', label: 'Average Rating', icon: Star },
                            { value: 100, suffix: '%', label: 'Free Forever', icon: Sparkles },
                        ].map((stat, index) => (
                            <motion.div
                                key={stat.label}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: index * 0.1 }}
                                className="text-center"
                            >
                                <stat.icon className="h-8 w-8 mx-auto mb-3 text-violet-500 dark:text-violet-400" />
                                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-violet-500 to-blue-500 bg-clip-text text-transparent mb-1">
                                    <Counter end={stat.value} suffix={stat.suffix} />
                                </div>
                                <div className="text-sm text-zinc-600 dark:text-zinc-400">
                                    {stat.label}
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
            </section>

            {/* Features Bento Grid */}
            <section className="relative z-10 px-4 sm:px-6 py-20 max-w-7xl mx-auto">
                <motion.div
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true }}
                    variants={staggerContainer}
                    className="text-center mb-12"
                >
                    <motion.h2
                        variants={fadeInUp}
                        className="text-3xl md:text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-white mb-4"
                    >
                        Everything you need
                    </motion.h2>
                    <motion.p
                        variants={fadeInUp}
                        className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto"
                    >
                        Powerful features to clean up your feed and capture valuable content.
                    </motion.p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    <FeatureCard
                        icon={Shield}
                        title="Ad Blocker"
                        description="Automatically detects and collapses promoted tweets, ads, and sponsored content. Works silently in the background."
                        gradient="from-emerald-500 to-teal-500"
                        size="large"
                        delay={0}
                    />
                    <FeatureCard
                        icon={Sparkles}
                        title="AI Smart Filter"
                        description="Cloud-synced regex patterns powered by AI to filter low-quality content and engagement bait."
                        gradient="from-violet-500 to-purple-500"
                        delay={0.1}
                    />
                    <FeatureCard
                        icon={Filter}
                        title="Custom Filters"
                        description="Create your own filter rules. Block by keywords, hashtags, users, or engagement metrics."
                        gradient="from-blue-500 to-cyan-500"
                        delay={0.15}
                    />
                    <FeatureCard
                        icon={Bookmark}
                        title="Save & Organize"
                        description="Save tweets with tags and notes. Build your personal library of valuable content."
                        gradient="from-amber-500 to-orange-500"
                        size="wide"
                        delay={0.2}
                    />
                    <FeatureCard
                        icon={Download}
                        title="Media Downloader"
                        description="One-click download of tweet images and text as organized ZIP files. Perfect for research and archiving."
                        gradient="from-pink-500 to-rose-500"
                        delay={0.25}
                    />
                    <FeatureCard
                        icon={Video}
                        title="Video Extraction"
                        description="Download videos in the highest quality available. Supports quote tweets, threads, and galleries."
                        gradient="from-indigo-500 to-blue-500"
                        size="large"
                        delay={0.3}
                    />
                </div>
            </section>

            {/* How It Works */}
            <section className="relative z-10 px-4 sm:px-6 py-20 max-w-7xl mx-auto">
                <motion.div
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true }}
                    variants={staggerContainer}
                    className="text-center mb-12"
                >
                    <motion.h2
                        variants={fadeInUp}
                        className="text-3xl md:text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-white mb-4"
                    >
                        How it works
                    </motion.h2>
                    <motion.p
                        variants={fadeInUp}
                        className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto"
                    >
                        Get started in under 30 seconds. No account required.
                    </motion.p>
                </motion.div>

                <div className="max-w-2xl mx-auto">
                    <StepIndicator
                        step={1}
                        title="Install the Extension"
                        description="Add TidyFeed from the Chrome Web Store. It's free and takes just a click."
                        icon={Chrome}
                        delay={0}
                    />
                    <StepIndicator
                        step={2}
                        title="Pin to Toolbar"
                        description="Click the puzzle icon and pin TidyFeed for easy access to settings."
                        icon={Zap}
                        delay={0.1}
                    />
                    <StepIndicator
                        step={3}
                        title="Browse X as Usual"
                        description="TidyFeed automatically works in the background, blocking ads and filtering content."
                        icon={Shield}
                        delay={0.2}
                    />
                    <StepIndicator
                        step={4}
                        title="Save What Matters"
                        description="Use the save button to bookmark tweets, download media, or add notes."
                        icon={Bookmark}
                        delay={0.3}
                    />
                </div>
            </section>

            {/* Testimonials */}
            <section className="relative z-10 px-4 sm:px-6 py-20 max-w-7xl mx-auto">
                <motion.div
                    initial="initial"
                    whileInView="animate"
                    viewport={{ once: true }}
                    variants={staggerContainer}
                    className="text-center mb-12"
                >
                    <motion.h2
                        variants={fadeInUp}
                        className="text-3xl md:text-4xl lg:text-5xl font-bold text-zinc-900 dark:text-white mb-4"
                    >
                        Loved by users
                    </motion.h2>
                    <motion.p
                        variants={fadeInUp}
                        className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto"
                    >
                        Join thousands of happy users who've transformed their feed.
                    </motion.p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <TestimonialCard
                        name="Sarah Chen"
                        role="Product Manager"
                        content="Finally, my Twitter feed is usable again. The AI filter is incredibly accurate at removing spam while keeping the good stuff."
                        avatar="SC"
                        rating={5}
                        delay={0}
                    />
                    <TestimonialCard
                        name="Marcus Johnson"
                        role="Developer"
                        content="I use it daily for research. The ability to save tweets with tags and download media is a game changer."
                        avatar="MJ"
                        rating={5}
                        delay={0.1}
                    />
                    <TestimonialCard
                        name="Emma Williams"
                        role="Content Creator"
                        content="The video download feature alone is worth it. High quality, no watermarks, and it just works."
                        avatar="EW"
                        rating={5}
                        delay={0.2}
                    />
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative z-10 px-4 sm:px-6 py-20 max-w-7xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    whileInView={{ opacity: 1, scale: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.5 }}
                    className="relative rounded-3xl overflow-hidden"
                >
                    {/* Background gradient */}
                    <div className="absolute inset-0 bg-gradient-to-br from-violet-500 via-blue-500 to-cyan-500" />
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yIDItNCAyLTRzLTItMi00LTJoLTJjLTIgMC00IDItNCA0czIgNCA0IDJoMmM2IDAgMTItNiAxMi0xMnMyLTYtMTItMTJ6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-30" />

                    {/* Content */}
                    <div className="relative px-8 py-16 md:px-16 md:py-20 text-center">
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-3xl md:text-4xl lg:text-5xl font-bold text-white mb-4"
                        >
                            Ready to clean up your feed?
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="text-lg text-white/80 max-w-xl mx-auto mb-8"
                        >
                            Join thousands of users who've taken back control of their social media experience.
                        </motion.p>
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="flex flex-col sm:flex-row items-center justify-center gap-4"
                        >
                            <motion.div
                                animate={glowPulse.animate}
                                transition={glowPulse.transition}
                            >
                                <Link
                                    href="https://chrome.google.com/webstore"
                                    className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white text-violet-600 font-semibold hover:bg-zinc-100 transition-all duration-300 shadow-xl hover:scale-105"
                                >
                                    <Chrome className="h-5 w-5" />
                                    Add to Chrome — Free
                                    <ArrowRight className="h-4 w-4" />
                                </Link>
                            </motion.div>
                        </motion.div>
                    </div>
                </motion.div>
            </section>

            {/* Footer */}
            <footer className="relative z-10 px-4 sm:px-6 py-12 border-t border-zinc-200 dark:border-zinc-800">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                        <Link href="/" className="flex items-center gap-2">
                            <Image
                                src="/favicon.png"
                                alt="TidyFeed Logo"
                                width={28}
                                height={28}
                                className="rounded-lg"
                            />
                            <span className="font-semibold text-zinc-900 dark:text-white">TidyFeed</span>
                        </Link>

                        <div className="flex items-center gap-6 text-sm text-zinc-600 dark:text-zinc-400">
                            <Link href="https://a.tidyfeed.app/privacy" className="hover:text-zinc-900 dark:hover:text-white transition-colors duration-200">
                                Privacy
                            </Link>
                            <Link href="https://a.tidyfeed.app/terms" className="hover:text-zinc-900 dark:hover:text-white transition-colors duration-200">
                                Terms
                            </Link>
                            <Link href="https://a.tidyfeed.app" className="hover:text-zinc-900 dark:hover:text-white transition-colors duration-200">
                                Dashboard
                            </Link>
                        </div>

                        <div className="flex items-center gap-4">
                            <a href="https://twitter.com/tidyfeedapp" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors duration-200">
                                <Twitter className="h-5 w-5" />
                            </a>
                        </div>
                    </div>

                    <div className="mt-8 text-center text-sm text-zinc-500 dark:text-zinc-400">
                        © 2025 TidyFeed. All rights reserved.
                    </div>
                </div>
            </footer>

            {/* Gradient animation CSS */}
            <style jsx global>{`
                @keyframes gradient {
                    0%, 100% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                }
                .animate-gradient {
                    animation: gradient 4s ease infinite;
                }
            `}</style>
        </div>
    )
}

// Missing Users icon for stats
function Users({ className }: { className?: string }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    )
}
