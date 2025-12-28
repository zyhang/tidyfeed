'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, ExternalLink, ChevronDown, ChevronUp } from 'lucide-react'

interface Author {
    name?: string
    handle?: string
}

interface TweetCardProps {
    id: number
    xId: string
    content: string | null
    author: Author | null
    media: string[] | null
    url: string | null
    platform: string
    createdAt: string
    onDelete: (xId: string) => void
}

export function TweetCard({
    xId,
    content,
    author,
    media,
    url,
    createdAt,
    onDelete,
}: TweetCardProps) {
    const [expanded, setExpanded] = useState(false)
    const [deleting, setDeleting] = useState(false)

    const handleDelete = async () => {
        if (deleting) return
        setDeleting(true)
        try {
            await onDelete(xId)
        } finally {
            setDeleting(false)
        }
    }

    const formattedDate = new Date(createdAt).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })

    const shouldTruncate = content && content.length > 280

    return (
        <Card className="overflow-hidden hover:shadow-md transition-shadow">
            <CardContent className="p-4">
                {/* Author */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                            {author?.name?.charAt(0) || author?.handle?.replace('@', '').charAt(0) || '?'}
                        </div>
                        <div>
                            <p className="font-semibold text-sm">{author?.name || 'Unknown'}</p>
                            <p className="text-xs text-muted-foreground">{author?.handle || '@unknown'}</p>
                        </div>
                    </div>
                    <span className="text-xs text-muted-foreground">{formattedDate}</span>
                </div>

                {/* Content */}
                {content && (
                    <div className="mb-3">
                        <p className={`text-sm whitespace-pre-wrap ${!expanded && shouldTruncate ? 'line-clamp-4' : ''}`}>
                            {content}
                        </p>
                        {shouldTruncate && (
                            <button
                                onClick={() => setExpanded(!expanded)}
                                className="text-xs text-blue-500 hover:underline mt-1 flex items-center gap-1"
                            >
                                {expanded ? (
                                    <>Show less <ChevronUp className="h-3 w-3" /></>
                                ) : (
                                    <>Show more <ChevronDown className="h-3 w-3" /></>
                                )}
                            </button>
                        )}
                    </div>
                )}

                {/* Media Grid */}
                {media && media.length > 0 && (
                    <div className={`grid gap-2 mb-3 ${media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                        {media.slice(0, 4).map((url, idx) => (
                            <div key={idx} className="relative aspect-video rounded-lg overflow-hidden bg-muted">
                                <img
                                    src={url}
                                    alt={`Media ${idx + 1}`}
                                    className="w-full h-full object-cover"
                                    loading="lazy"
                                />
                            </div>
                        ))}
                    </div>
                )}

                {/* Actions */}
                <div className="flex items-center justify-between pt-2 border-t">
                    {url && (
                        <Button variant="ghost" size="sm" asChild>
                            <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                View on X
                            </a>
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleDelete}
                        disabled={deleting}
                        className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                    >
                        <Trash2 className="h-3 w-3 mr-1" />
                        {deleting ? 'Deleting...' : 'Delete'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
