'use client'

import { useState, useEffect } from 'react'
import { Loader2, Video, RefreshCw, ArrowUpDown, Play, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app'

interface VideoItem {
    id: number
    tweetUrl: string
    r2Key: string
    metadata: {
        title?: string
        duration?: string
        thumbnail_url?: string
    } | null
    thumbnailUrl: string | null
    fileSize: number
    createdAt: number
}

export default function LibraryVideosPage() {
    const [videos, setVideos] = useState<VideoItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [sortAsc, setSortAsc] = useState(false)
    const [playingId, setPlayingId] = useState<number | null>(null)

    const fetchVideos = async () => {
        try {
            setLoading(true)
            setError(null)

            const params = new URLSearchParams({ sort: sortAsc ? 'asc' : 'desc' })
            const response = await fetch(`${API_URL}/api/library/videos?${params}`, {
                credentials: 'include'
            })

            if (!response.ok) {
                if (response.status === 401) {
                    setError('Please log in to view your library')
                    return
                }
                throw new Error('Failed to fetch videos')
            }

            const data = await response.json()
            setVideos(data.videos || [])
        } catch (err) {
            console.error('Error fetching videos:', err)
            setError('Failed to load videos')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchVideos()
    }, [sortAsc])

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return ''
        const mb = bytes / (1024 * 1024)
        return mb >= 1 ? `${mb.toFixed(1)} MB` : `${(bytes / 1024).toFixed(0)} KB`
    }

    const extractTweetId = (url: string) => {
        return url.match(/status\/(\d+)/)?.[1]?.slice(0, 8) || ''
    }

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
                <Button variant="outline" onClick={fetchVideos}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                </Button>
            </div>
        )
    }

    if (videos.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
                <Video className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg mb-2">No videos yet</p>
                <p className="text-sm">Use the Cloud Save button on X.com to save videos</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Videos</h1>
                    <p className="text-sm text-muted-foreground">{videos.length} saved</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSortAsc(!sortAsc)}
                    >
                        <ArrowUpDown className="h-4 w-4 mr-2" />
                        {sortAsc ? 'Oldest First' : 'Newest First'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={fetchVideos}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {videos.map((video) => (
                    <Card key={video.id} className="overflow-hidden group">
                        <CardContent className="p-0">
                            <div className="relative aspect-video bg-muted">
                                {/* Thumbnail background */}
                                {video.thumbnailUrl && playingId !== video.id && (
                                    <img
                                        src={video.thumbnailUrl}
                                        alt=""
                                        className="absolute inset-0 w-full h-full object-cover"
                                        loading="lazy"
                                    />
                                )}
                                {playingId === video.id ? (
                                    <video
                                        src={`${API_URL}/api/downloads/media/${video.id}`}
                                        controls
                                        autoPlay
                                        className="w-full h-full"
                                    />
                                ) : (
                                    <button
                                        onClick={() => setPlayingId(video.id)}
                                        className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                                    >
                                        <div className="w-14 h-14 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
                                            <Play className="h-6 w-6 text-black ml-1" />
                                        </div>
                                    </button>
                                )}
                            </div>
                            <div className="p-3 space-y-2">
                                <div className="flex items-center justify-between text-xs text-muted-foreground">
                                    <span>{formatDate(video.createdAt)}</span>
                                    {video.fileSize > 0 && (
                                        <span>{formatFileSize(video.fileSize)}</span>
                                    )}
                                </div>
                                {video.metadata?.title && (
                                    <p className="text-sm font-medium truncate">{video.metadata.title}</p>
                                )}
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="w-full text-xs"
                                    onClick={() => window.open(video.tweetUrl, '_blank')}
                                >
                                    <ExternalLink className="h-3 w-3 mr-1" />
                                    {extractTweetId(video.tweetUrl)}...
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
