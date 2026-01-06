'use client'

import { useState, useEffect } from 'react'
import { CloudVideoPlayer } from '@/components/CloudVideoPlayer'
import { Cloud } from 'lucide-react'

// Design System Components
import { PageHeader } from '@/components/layout'
import { PageLoading, EmptyState, ErrorState } from '@/components/feedback'

interface Download {
    id: number
    tweet_url: string
    status: 'pending' | 'processing' | 'completed' | 'failed'
    r2_key: string | null
    metadata: {
        title?: string
        duration?: string
    } | null
    error_message: string | null
    created_at: number
    completed_at: number | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app'

export default function DownloadsPage() {
    const [downloads, setDownloads] = useState<Download[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchDownloads = async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch(`${API_URL}/api/downloads/list`, {
                credentials: 'include'
            })

            if (!response.ok) {
                if (response.status === 401) {
                    setError('Please log in to view your downloads')
                    return
                }
                throw new Error('Failed to fetch downloads')
            }

            const data = await response.json()
            setDownloads(data.downloads || [])
        } catch (err) {
            console.error('Error fetching downloads:', err)
            setError('Failed to load downloads')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchDownloads()

        // Poll for updates every 10 seconds if there are pending/processing downloads
        const interval = setInterval(() => {
            if (downloads.some(d => d.status === 'pending' || d.status === 'processing')) {
                fetchDownloads()
            }
        }, 10000)

        return () => clearInterval(interval)
    }, [])

    if (loading) {
        return <PageLoading />
    }

    if (error) {
        return <ErrorState message={error} onRetry={fetchDownloads} />
    }

    if (downloads.length === 0) {
        return (
            <>
                <PageHeader
                    title="Cloud Downloads"
                    description="Manage your cloud video downloads"
                />
                <EmptyState
                    icon={<Cloud />}
                    title="No cloud downloads yet"
                    description="Use the Cloud Save button on X.com to download videos"
                />
            </>
        )
    }

    return (
        <>
            <PageHeader
                title="Cloud Downloads"
                description={`${downloads.length} total`}
                actions={
                    <button
                        onClick={fetchDownloads}
                        className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                        Refresh
                    </button>
                }
            />

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {downloads.map((download) => (
                    <CloudVideoPlayer
                        key={download.id}
                        id={download.id}
                        tweetUrl={download.tweet_url}
                        status={download.status}
                        metadata={download.metadata}
                        errorMessage={download.error_message}
                        createdAt={download.created_at}
                        completedAt={download.completed_at}
                    />
                ))}
            </div>
        </>
    )
}
