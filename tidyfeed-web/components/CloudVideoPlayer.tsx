'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Cloud, ExternalLink, Loader2, Play, AlertCircle } from 'lucide-react'

interface CloudVideoProps {
    id: number
    tweetUrl: string
    status: 'pending' | 'processing' | 'completed' | 'failed'
    metadata?: {
        title?: string
        duration?: string
    } | null
    errorMessage?: string | null
    createdAt: number
    completedAt?: number | null
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app'

export function CloudVideoPlayer({
    id,
    tweetUrl,
    status,
    metadata,
    errorMessage,
    createdAt,
    completedAt
}: CloudVideoProps) {
    const [isPlaying, setIsPlaying] = useState(false)

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleString()
    }

    // Extract tweet ID from URL for display
    const tweetId = tweetUrl.match(/status\/(\d+)/)?.[1] || 'Unknown'

    return (
        <Card className="overflow-hidden">
            <CardContent className="p-4">
                {/* Status Badge */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Cloud className="h-4 w-4 text-purple-500" />
                        <span className="text-sm text-muted-foreground">Cloud Video</span>
                    </div>
                    <Badge
                        variant={
                            status === 'completed' ? 'default' :
                                status === 'failed' ? 'destructive' :
                                    'secondary'
                        }
                    >
                        {status === 'pending' && 'Queued'}
                        {status === 'processing' && 'Processing...'}
                        {status === 'completed' && 'Ready'}
                        {status === 'failed' && 'Failed'}
                    </Badge>
                </div>

                {/* Video Player or Status Display */}
                <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                    {status === 'completed' && !isPlaying && (
                        <button
                            onClick={() => setIsPlaying(true)}
                            className="absolute inset-0 flex items-center justify-center bg-black/50 hover:bg-black/40 transition-colors"
                        >
                            <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center">
                                <Play className="h-8 w-8 text-black ml-1" />
                            </div>
                        </button>
                    )}

                    {status === 'completed' && isPlaying && (
                        <video
                            src={`${API_URL}/api/downloads/media/${id}`}
                            controls
                            autoPlay
                            className="w-full h-full"
                            onLoadedMetadata={() => console.log('Video loaded')}
                        />
                    )}

                    {status === 'pending' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin mb-2" />
                            <span className="text-sm">Waiting in queue...</span>
                        </div>
                    )}

                    {status === 'processing' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                            <Loader2 className="h-8 w-8 animate-spin mb-2" />
                            <span className="text-sm">Downloading video...</span>
                        </div>
                    )}

                    {status === 'failed' && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-destructive">
                            <AlertCircle className="h-8 w-8 mb-2" />
                            <span className="text-sm">{errorMessage || 'Download failed'}</span>
                        </div>
                    )}
                </div>

                {/* Metadata */}
                <div className="mt-3 space-y-2">
                    {metadata?.title && (
                        <p className="text-sm font-medium truncate">{metadata.title}</p>
                    )}

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Tweet: {tweetId.slice(0, 8)}...</span>
                        <span>{formatDate(createdAt)}</span>
                    </div>

                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full"
                        onClick={() => window.open(tweetUrl, '_blank')}
                    >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        View Original Tweet
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
