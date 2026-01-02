'use client'

export const runtime = 'edge'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, ExternalLink, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app'

export default function SnapshotPage() {
    const params = useParams()
    const router = useRouter()
    const tweetId = params.id as string

    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [snapshotHtml, setSnapshotHtml] = useState<string | null>(null)

    useEffect(() => {
        if (!tweetId) return

        const fetchSnapshot = async () => {
            try {
                setLoading(true)
                setError(null)

                const response = await fetch(`${API_URL}/api/tweets/${tweetId}/snapshot`)

                if (!response.ok) {
                    if (response.status === 404) {
                        setError('Snapshot not found. This tweet may not have been cached yet.')
                    } else {
                        setError('Failed to load snapshot')
                    }
                    return
                }

                const html = await response.text()
                setSnapshotHtml(html)
            } catch (err) {
                console.error('Error fetching snapshot:', err)
                setError('Failed to load snapshot. Please try again.')
            } finally {
                setLoading(false)
            }
        }

        fetchSnapshot()
    }, [tweetId])

    // Auto-redirect to dashboard when snapshot not found
    useEffect(() => {
        if (error && error.includes('not found')) {
            const timer = setTimeout(() => {
                router.push('/dashboard')
            }, 5000)
            return () => clearTimeout(timer)
        }
    }, [error, router])

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Loading snapshot...</p>
                </div>
            </div>
        )
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center p-4">
                <div className="max-w-md w-full text-center space-y-6">
                    <div className="w-16 h-16 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto">
                        <AlertCircle className="h-8 w-8 text-amber-500" />
                    </div>
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold">Snapshot Not Available</h1>
                        <p className="text-muted-foreground">
                            {error.includes('not found')
                                ? 'This post has been unsaved and its cached content has been deleted.'
                                : error}
                        </p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button asChild variant="default">
                            <Link href="/dashboard">
                                <ArrowLeft className="h-4 w-4 mr-2" />
                                Go to Dashboard
                            </Link>
                        </Button>
                        <Button asChild variant="outline">
                            <Link
                                href={`https://x.com/i/status/${tweetId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                View on X
                                <ExternalLink className="h-4 w-4 ml-2" />
                            </Link>
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground/60">
                        Redirecting to dashboard in 5 seconds...
                    </p>
                </div>
            </div>
        )
    }

    // Render snapshot in an iframe for isolation
    return (
        <div className="min-h-screen bg-background">
            {/* Header bar */}
            <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b">
                <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.back()}
                        className="gap-2"
                    >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                    </Button>

                    <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground px-2 py-1 bg-muted rounded-full">
                            Cached Snapshot
                        </span>
                        <Button asChild variant="outline" size="sm">
                            <Link
                                href={`https://x.com/i/status/${tweetId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="gap-2"
                            >
                                Original
                                <ExternalLink className="h-3.5 w-3.5" />
                            </Link>
                        </Button>
                    </div>
                </div>
            </header>

            {/* Snapshot content */}
            <main className="max-w-4xl mx-auto py-8">
                {snapshotHtml && (
                    <iframe
                        srcDoc={snapshotHtml}
                        className="w-full min-h-[80vh] border-0"
                        title="Tweet Snapshot"
                        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox"
                    />
                )}
            </main>
        </div>
    )
}
