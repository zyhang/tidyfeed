import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, ExternalLink, ChevronDown, ChevronUp, X, Hash, Pin } from 'lucide-react'
import { TagInput } from '@/components/TagInput'
import { cn } from '@/lib/utils'

interface Author {
    name?: string
    handle?: string
    avatar?: string
}

interface Tag {
    id: number
    name: string
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
    tags?: Tag[]
    pinnedAt?: string | null
    onDelete: (xId: string) => void
    onPin?: (xId: string, pinned: boolean) => void
    onRemoveTag?: (xId: string, tagId: number) => void
}

export function TweetCard({
    xId,
    content,
    author,
    media,
    url,
    platform,
    createdAt,
    tags: initialTags = [],
    pinnedAt,
    onDelete,
    onPin,
    onRemoveTag,
}: TweetCardProps) {
    const [expanded, setExpanded] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [pinning, setPinning] = useState(false)
    const [lightboxImage, setLightboxImage] = useState<string | null>(null)
    const [tags, setTags] = useState<Tag[]>(initialTags)
    const [removingTagId, setRemovingTagId] = useState<number | null>(null)

    const isPinned = !!pinnedAt

    useEffect(() => {
        setTags(initialTags)
    }, [initialTags])

    const handleDelete = async () => {
        if (deleting) return
        setDeleting(true)
        try {
            await onDelete(xId)
        } finally {
            setDeleting(false)
        }
    }

    const handlePin = async () => {
        if (pinning || !onPin) return
        setPinning(true)
        try {
            await onPin(xId, !isPinned)
        } finally {
            setPinning(false)
        }
    }

    const handleRemoveTag = async (tagId: number) => {
        if (!onRemoveTag || removingTagId) return
        setRemovingTagId(tagId)
        try {
            await onRemoveTag(xId, tagId)
        } finally {
            setRemovingTagId(null)
        }
    }

    const handleTagAdded = (tagName: string) => {
        // Optimistically add tag if not already present
        if (!tags.some(t => t.name === tagName)) {
            // We don't have the ID yet, but for display purposes it's fine.
            // Ideally we should refetch or the API should return the tag object.
            // For now, use a temporary ID or just ignore ID for key
            setTags([...tags, { id: Date.now(), name: tagName }])
        }
    }

    // ... existing date formatting and truncation logic ...

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
            {/* ... existing Lightbox code ... */}
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

            <Card className={cn(
                "overflow-hidden hover:shadow-md transition-all break-inside-avoid mb-4 relative group",
                isPinned && "border-blue-500/50 shadow-sm bg-blue-50/10 dark:bg-blue-900/10"
            )}>
                {/* ... existing Pin Indicator code ... */}
                {isPinned && (
                    <div className="absolute top-0 right-0 p-2">
                        <Pin className="h-3 w-3 text-blue-500 rotate-45 fill-current" />
                    </div>
                )}

                <CardContent className="p-4">
                    {/* ... existing Author code ... */}
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

                    {/* ... existing Content code ... */}
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

                    {/* ... existing Media Grid code ... */}
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

                    {/* Tags */}
                    {tags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                            {tags.map((tag) => (
                                <Badge
                                    key={tag.id || tag.name}
                                    variant="secondary"
                                    className="text-xs font-normal group/tag pr-1.5 transition-colors hover:bg-secondary/80"
                                >
                                    <Hash className="h-3 w-3 mr-0.5 opacity-70" />
                                    {tag.name}
                                    {onRemoveTag && (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation()
                                                handleRemoveTag(tag.id)
                                            }}
                                            className="ml-1 opacity-0 group-hover/tag:opacity-100 hover:text-red-500 transition-all focus:opacity-100 -mr-0.5"
                                            title="Remove tag"
                                            disabled={removingTagId === tag.id}
                                        >
                                            {removingTagId === tag.id ? (
                                                <span className="animate-spin h-3 w-3 block border-2 border-current border-t-transparent rounded-full" />
                                            ) : (
                                                <X className="h-3 w-3" />
                                            )}
                                        </button>
                                    )}
                                </Badge>
                            ))}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t">
                        <div className="flex items-center gap-1">
                            {url && (
                                <Button variant="ghost" size="sm" asChild>
                                    <a href={url} target="_blank" rel="noopener noreferrer" className="text-xs">
                                        <ExternalLink className="h-3 w-3 mr-1" />
                                        View on {platformLabel}
                                    </a>
                                </Button>
                            )}
                            <TagInput
                                tweetId={xId}
                                tweetData={{ content, author, media, url, platform }}
                                onTagAdded={handleTagAdded}
                            />
                        </div>
                        <div className="flex items-center gap-1">
                            {/* Pin Button */}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handlePin}
                                disabled={pinning}
                                className={cn(
                                    "text-muted-foreground hover:text-foreground",
                                    isPinned && "text-blue-500 hover:text-blue-600"
                                )}
                                title={isPinned ? "Unpin post" : "Pin post"}
                            >
                                <Pin className={cn("h-3 w-3 mr-1", isPinned && "fill-current rotate-45")} />
                                {pinning ? '...' : (isPinned ? 'Unpin' : 'Pin')}
                            </Button>

                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleDelete}
                                disabled={deleting}
                                className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            >
                                <Trash2 className="h-3 w-3 mr-1" />
                                {deleting ? 'Deleting...' : 'Delete'}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </>
    )
}
