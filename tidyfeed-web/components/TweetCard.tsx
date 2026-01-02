import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Trash2, ExternalLink, ChevronDown, ChevronUp, X, Hash, Pin, Play, Cloud, Loader2, Plus, Archive, CheckCircle2, AlertTriangle } from 'lucide-react'
import { TagInput } from '@/components/TagInput'
import { cn } from '@/lib/utils'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog'

interface Author {
    name?: string
    handle?: string
    avatar?: string
}

interface Tag {
    id: number
    name: string
}

interface VideoInfo {
    id: number
    status: 'pending' | 'processing' | 'completed' | 'failed'
    r2_key?: string | null
    metadata?: any
}

interface CacheInfo {
    cached: boolean
    snapshotUrl?: string
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
    videoInfo?: VideoInfo | null
    cacheInfo?: CacheInfo | null
    onDelete: (xId: string) => void
    onPin?: (xId: string, pinned: boolean) => void
    onRemoveTag?: (xId: string, tagId: number) => void
    onCache?: (xId: string) => Promise<{ snapshotUrl?: string } | void>
}

export function TweetCard({
    id,
    xId,
    content,
    author,
    media,
    url,
    platform,
    createdAt,
    tags: initialTags = [],
    pinnedAt,
    videoInfo,
    cacheInfo,
    onDelete,
    onPin,
    onRemoveTag,
    onCache,
}: TweetCardProps) {
    const [expanded, setExpanded] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [pinning, setPinning] = useState(false)
    const [lightboxImage, setLightboxImage] = useState<string | null>(null)
    const [tags, setTags] = useState<Tag[]>(initialTags)
    const [removingTagId, setRemovingTagId] = useState<number | null>(null)
    const [isPlayingVideo, setIsPlayingVideo] = useState(false)
    const [isCaching, setIsCaching] = useState(false)
    const [cachedSnapshotUrl, setCachedSnapshotUrl] = useState<string | null>(cacheInfo?.snapshotUrl || null)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    const isPinned = !!pinnedAt
    const isCached = !!cacheInfo?.cached || !!cachedSnapshotUrl

    useEffect(() => {
        setTags(initialTags)
    }, [initialTags])

    // Show confirmation dialog before deleting
    const handleDeleteClick = () => {
        setShowDeleteConfirm(true)
    }

    // Actually perform the deletion after confirmation
    const confirmDelete = async () => {
        if (deleting) return
        setShowDeleteConfirm(false)
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

    const handleCache = async () => {
        if (isCaching || isCached || !onCache) return
        setIsCaching(true)
        try {
            const result = await onCache(xId)
            if (result?.snapshotUrl) {
                setCachedSnapshotUrl(result.snapshotUrl)
            }
        } finally {
            setIsCaching(false)
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
            {lightboxImage && (
                <div
                    className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 cursor-pointer backdrop-blur-sm"
                    onClick={() => setLightboxImage(null)}
                >
                    <button
                        onClick={() => setLightboxImage(null)}
                        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors"
                    >
                        <X className="h-8 w-8 drop-shadow-md" />
                    </button>
                    <img
                        src={lightboxImage}
                        alt="Enlarged view"
                        className="max-h-[85vh] max-w-[90vw] object-contain rounded-lg shadow-2xl"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}

            <Card className={cn(
                "overflow-hidden hover:shadow-lg transition-all duration-300 break-inside-avoid mb-4 relative group border-transparent hover:border-border/50 bg-card/50 hover:bg-card",
                isPinned && "border-blue-500/30 bg-blue-50/10 dark:bg-blue-900/10 shadow-sm"
            )}>
                {/* Top Right Floating Actions */}
                <div className={cn(
                    "absolute top-3 right-3 flex items-center gap-1.5 z-20 transition-all duration-200",
                    isPinned ? "opacity-100" : "opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0"
                )}>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handlePin}
                        disabled={pinning}
                        className={cn(
                            "h-7 w-7 rounded-full bg-background/80 backdrop-blur-md shadow-sm border border-border/10 transition-all hover:scale-105",
                            isPinned
                                ? "text-blue-500 hover:text-blue-600 bg-blue-50/80 dark:bg-blue-900/20 ring-1 ring-blue-500/20"
                                : "text-muted-foreground hover:text-foreground hover:bg-background"
                        )}
                        title={isPinned ? "Unpin post" : "Pin post"}
                    >
                        <Pin className={cn("h-3.5 w-3.5", isPinned && "fill-current rotate-45")} />
                    </Button>

                    {/* Cache Button */}
                    {onCache && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={isCached && cachedSnapshotUrl ? () => window.open(cachedSnapshotUrl, '_blank') : handleCache}
                            disabled={isCaching}
                            className={cn(
                                "h-7 w-7 rounded-full bg-background/80 backdrop-blur-md shadow-sm border border-border/10 transition-all hover:scale-105",
                                isCached
                                    ? "text-emerald-500 hover:text-emerald-600 bg-emerald-50/80 dark:bg-emerald-900/20 ring-1 ring-emerald-500/20"
                                    : "text-muted-foreground hover:text-foreground hover:bg-background"
                            )}
                            title={isCached ? "View cached snapshot" : "Cache this tweet"}
                        >
                            {isCaching ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : isCached ? (
                                <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                                <Archive className="h-3.5 w-3.5" />
                            )}
                        </Button>
                    )}

                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleDeleteClick}
                        disabled={deleting}
                        className="h-7 w-7 rounded-full bg-background/80 backdrop-blur-md text-muted-foreground hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 shadow-sm border border-border/10 transition-all hover:scale-105"
                        title="Delete post"
                    >
                        {deleting ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                        )}
                    </Button>
                </div>

                <CardContent className="p-5">
                    {/* Author Info */}
                    <div className="flex items-center justify-between mb-3.5 pr-16">
                        <div className="flex items-center gap-3">
                            {author?.avatar ? (
                                <img
                                    src={author.avatar}
                                    alt={author.name || author.handle || 'Avatar'}
                                    className="w-10 h-10 rounded-full object-cover ring-2 ring-background shadow-sm"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white font-bold text-sm shadow-inner ring-2 ring-background">
                                    {author?.name?.charAt(0) || author?.handle?.replace('@', '').charAt(0) || '?'}
                                </div>
                            )}
                            <div className="flex flex-col">
                                <p className="font-semibold text-sm leading-tight text-foreground tracking-tight">{author?.name || 'Unknown'}</p>
                                <p className="text-xs text-muted-foreground font-medium">{author?.handle || '@unknown'}</p>
                            </div>
                        </div>
                        <span className="text-[10px] text-muted-foreground/50 font-medium uppercase tracking-wider">{formattedDate}</span>
                    </div>

                    {/* Content */}
                    {content && (
                        <div className="mb-4">
                            <p className={`text-[15px] leading-7 text-foreground/90 whitespace-pre-wrap ${!expanded && shouldTruncate ? 'line-clamp-4' : ''}`}>
                                {content}
                                {url && (
                                    <span className="inline-block ml-1.5 align-baseline text-muted-foreground/40 hover:text-blue-500 transition-colors cursor-pointer select-none">
                                        <a
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center justify-center p-0.5" // Increased hit area slightly
                                            onClick={(e) => e.stopPropagation()}
                                            title="View original tweet"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5" />
                                        </a>
                                    </span>
                                )}
                            </p>
                            {shouldTruncate && (
                                <button
                                    onClick={() => setExpanded(!expanded)}
                                    className="text-xs font-medium text-muted-foreground hover:text-foreground mt-2 flex items-center gap-1 transition-colors"
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
                    {media && media.length > 0 && !videoInfo && (
                        <div className={`grid gap-2 mb-4 ${media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                            {media.slice(0, 4).map((imgUrl, idx) => (
                                <div
                                    key={idx}
                                    className="relative rounded-xl overflow-hidden bg-muted cursor-zoom-in group/media shadow-sm ring-1 ring-black/5 dark:ring-white/5"
                                    onClick={() => setLightboxImage(imgUrl)}
                                >
                                    <img
                                        src={imgUrl}
                                        alt={`Media ${idx + 1}`}
                                        className="w-full h-auto object-cover transition-transform duration-500 group-hover/media:scale-105"
                                        loading="lazy"
                                    />
                                    <div className="absolute inset-0 bg-black/0 group-hover/media:bg-black/5 transition-colors pointer-events-none" />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Cloud Video Player */}
                    {videoInfo && (
                        <div className="mb-4 rounded-xl overflow-hidden bg-black/5 border border-black/5 dark:border-white/5 relative shadow-sm">
                            {videoInfo.status === 'completed' && !isPlayingVideo && (
                                <button
                                    onClick={() => setIsPlayingVideo(true)}
                                    className="w-full aspect-video flex items-center justify-center relative group/video cursor-pointer"
                                >
                                    {media && media[0] && (
                                        <img
                                            src={media[0]}
                                            alt="Video thumbnail"
                                            className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover/video:scale-105"
                                        />
                                    )}
                                    <div className="absolute inset-0 bg-black/10 group-hover/video:bg-black/20 transition-colors duration-300" />

                                    <div className="relative z-10 w-14 h-14 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center shadow-lg border border-white/20 transition-all duration-300 group-hover/video:scale-110 group-hover/video:bg-white/30">
                                        <Play className="h-6 w-6 text-white ml-1 fill-white drop-shadow-sm" />
                                    </div>

                                    <div className="absolute top-3 left-3 flex items-center gap-1.5 text-[10px] font-semibold text-white/90 bg-black/30 backdrop-blur-md px-2 py-1 rounded-full border border-white/10 shadow-sm">
                                        <Cloud className="h-3 w-3" />
                                        <span>Cloud Video</span>
                                    </div>
                                </button>
                            )}
                            {videoInfo.status === 'completed' && isPlayingVideo && (
                                <video
                                    src={`${process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app'}/api/downloads/media/${videoInfo.id}`}
                                    controls
                                    autoPlay
                                    preload="metadata"
                                    poster={media?.[0]}
                                    className="w-full aspect-video bg-black"
                                />
                            )}
                            {(videoInfo.status === 'pending' || videoInfo.status === 'processing') && (
                                <div className="w-full aspect-video flex flex-col items-center justify-center text-muted-foreground relative bg-muted/30">
                                    {media && media[0] && (
                                        <img src={media[0]} alt="" className="absolute inset-0 w-full h-full object-cover opacity-20 blur-sm scale-110" />
                                    )}
                                    <div className="relative flex flex-col items-center z-10 p-5 bg-background/60 backdrop-blur-xl rounded-2xl border border-white/20 shadow-lg">
                                        {videoInfo.status === 'processing' ? (
                                            <Loader2 className="h-6 w-6 animate-spin mb-3 text-blue-500" />
                                        ) : (
                                            <Cloud className="h-6 w-6 mb-3 text-muted-foreground" />
                                        )}
                                        <span className="text-xs font-semibold tracking-wide text-foreground/80">
                                            {videoInfo.status === 'processing' ? 'Processing Video...' : 'Queued for Download...'}
                                        </span>
                                    </div>
                                </div>
                            )}
                            {videoInfo.status === 'failed' && (
                                <div className="w-full aspect-video flex flex-col items-center justify-center text-muted-foreground bg-muted/30">
                                    <Cloud className="h-8 w-8 mb-2 text-destructive/50" />
                                    <span className="text-xs text-destructive font-medium">Download Failed</span>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Footer Integrated Tags */}
                    <div className="flex flex-wrap items-center gap-2 min-h-[24px]">
                        {tags.map((tag) => (
                            <Badge
                                key={tag.id || tag.name}
                                variant="outline"
                                className="px-2 py-0.5 rounded-md text-[11px] font-normal text-muted-foreground bg-transparent hover:bg-secondary border-border/60 hover:border-border transition-all group/tag cursor-default gap-1"
                            >
                                <Hash className="h-2.5 w-2.5 opacity-40" />
                                {tag.name}
                                {onRemoveTag && (
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation()
                                            handleRemoveTag(tag.id)
                                        }}
                                        className="opacity-0 group-hover/tag:opacity-100 hover:text-destructive transition-all focus:opacity-100 w-0 group-hover/tag:w-3 overflow-hidden"
                                        title="Remove tag"
                                        disabled={removingTagId === tag.id}
                                    >
                                        {removingTagId === tag.id ? (
                                            <Loader2 className="h-2.5 w-2.5 animate-spin" />
                                        ) : (
                                            <X className="h-2.5 w-2.5" />
                                        )}
                                    </button>
                                )}
                            </Badge>
                        ))}

                        <TagInput
                            tweetId={xId}
                            tweetData={{ content, author, media, url, platform }}
                            onTagAdded={handleTagAdded}
                            trigger={
                                <button className={cn(
                                    "inline-flex items-center justify-center h-5 px-2 rounded-md text-[10px] font-medium border border-dashed transition-all outline-none focus-visible:ring-2 focus-visible:ring-ring gap-1",
                                    tags.length === 0
                                        ? "text-muted-foreground border-border hover:border-blue-400 hover:text-blue-500 hover:bg-blue-50/50 dark:hover:bg-blue-900/10"
                                        : "text-muted-foreground/40 border-transparent hover:border-border hover:text-muted-foreground bg-transparent hover:bg-secondary/50"
                                )}>
                                    <Plus className="h-2.5 w-2.5" />
                                    {tags.length === 0 ? "Add Tag" : ""}
                                </button>
                            }
                        />
                    </div>
                </CardContent>
            </Card>

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            Delete this post?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-left">
                            This action cannot be undone. All cached content including:
                            <ul className="list-disc list-inside mt-2 space-y-1 text-muted-foreground">
                                <li>Saved images and media</li>
                                <li>Downloaded videos</li>
                                <li>HTML snapshot</li>
                            </ul>
                            <span className="block mt-2 font-medium text-foreground/80">
                                will be permanently deleted.
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmDelete}
                            className="bg-red-500 hover:bg-red-600 text-white"
                        >
                            Delete
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    )
}
