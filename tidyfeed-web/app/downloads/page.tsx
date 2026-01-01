'use client'

import { useState, useEffect } from 'react'
import { CloudVideoPlayer } from '@/components/CloudVideoPlayer'
import { Loader2, Cloud, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

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
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
                <p className="mb-4">{error}</p>
                <Button variant="outline" onClick={fetchDownloads}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                </Button>
            </div>
        )
    }

    if (downloads.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
                <Cloud className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg mb-2">No cloud downloads yet</p>
                <p className="text-sm">Use the Cloud Save button on X.com to download videos</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold">Cloud Downloads</h1>
                <Button variant="outline" size="sm" onClick={fetchDownloads}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                </Button>
            </div>

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
        </div>
    )
}
