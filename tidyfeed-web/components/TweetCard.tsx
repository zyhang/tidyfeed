'use client'

import { useState } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Trash2, ExternalLink, ChevronDown, ChevronUp, X } from 'lucide-react'

interface Author {
    name?: string
    handle?: string
    avatar?: string
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
    platform,
    createdAt,
    onDelete,
}: TweetCardProps) {
    const [expanded, setExpanded] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [lightboxImage, setLightboxImage] = useState<string | null>(null)

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

    // Get platform label
    const platformLabel = platform === 'x' ? 'X' : platform.charAt(0).toUpperCase() + platform.slice(1)

    return (
        <>
            {/* Lightbox */}
            {lightboxImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
                    onClick={() => setLightboxImage(null)}
                >
                    <button
                        onClick={() => setLightboxImage(null)}
                        className="absolute top-4 right-4 text-white hover:text-gray-300"
                    >
                        <X className="h-8 w-8" />
                    </button>
                    <img
                        src={lightboxImage}
                        alt="Enlarged view"
                        className="max-h-[90vh] max-w-[90vw] object-contain rounded-lg"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            <Card className="overflow-hidden hover:shadow-md transition-shadow break-inside-avoid mb-4">
                <CardContent className="p-4">
                    {/* Author */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            {author?.avatar ? (
                                <img
                                    src={author.avatar}
                                    alt={author.name || author.handle || 'Avatar'}
                                    className="w-10 h-10 rounded-full object-cover"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                    {author?.name?.charAt(0) || author?.handle?.replace('@', '').charAt(0) || '?'}
                                </div>
                            )}
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
                            {media.slice(0, 4).map((imgUrl, idx) => (
                                <div
                                    key={idx}
                                    className="relative rounded-lg overflow-hidden bg-muted cursor-pointer hover:opacity-90 transition-opacity"
                                    onClick={() => setLightboxImage(imgUrl)}
                                >
                                    <img
                                        src={imgUrl}
                                        alt={`Media ${idx + 1}`}
                                        className="w-full h-auto object-cover"
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
                                    View on {platformLabel}
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
        </>
    )
}
