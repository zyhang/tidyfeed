'use client'

export const runtime = 'edge'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { TweetCard } from '@/components/TweetCard'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ArrowLeft, Hash, Loader2, ExternalLink, X } from 'lucide-react'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app'

interface TweetData {
    content?: string
    author?: {
        name?: string
        handle?: string
        avatar?: string
    }
    media?: string[]
    url?: string
    platform?: string
}

interface Tweet {
    tweetId: string
    data: TweetData
    updatedAt: string
    cacheInfo?: {
        cached: boolean
        snapshotUrl?: string
    }
}

interface Tag {
    id: number
    name: string
    created_at: string
    tweet_count: number
}

export default function TagDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params)
    const router = useRouter()
    const [tag, setTag] = useState<Tag | null>(null)
    const [tweets, setTweets] = useState<Tweet[]>([])
    const [loading, setLoading] = useState(true)
    const [lightboxImage, setLightboxImage] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            try {
                // Fetch tag info
                const tagsResponse = await fetch(`${API_URL}/api/tags`, {
                    credentials: 'include',
                })
                if (tagsResponse.ok) {
                    const tagsData = await tagsResponse.json()
                    const foundTag = tagsData.tags?.find((t: Tag) => t.id === parseInt(id))
                    setTag(foundTag || null)
                }

                // Fetch tweets for this tag
                const tweetsResponse = await fetch(`${API_URL}/api/tweets/by-tag/${id}`, {
                    credentials: 'include',
                })
                if (tweetsResponse.ok) {
                    const tweetsData = await tweetsResponse.json()
                    setTweets(tweetsData.tweets || [])
                }
            } catch (error) {
                console.error('Error fetching data:', error)
            } finally {
                setLoading(false)
            }
        }

        fetchData()
    }, [id])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

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

            <div className="flex flex-col gap-6">
                {/* Header */}
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => router.back()}>
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="flex items-center gap-2">
                        <Hash className="h-6 w-6 text-muted-foreground" />
                        <h1 className="text-2xl font-bold">{tag?.name || 'Tag'}</h1>
                        <Badge variant="secondary">{tweets.length} tweets</Badge>
                    </div>
                </div>

                {/* Empty State */}
                {tweets.length === 0 && (
                    <div className="text-center py-12">
                        <p className="text-muted-foreground">
                            No tweets with this tag yet.
                        </p>
                        <Link href="/dashboard" className="text-primary hover:underline text-sm mt-2 inline-block">
                            Go to My Feed
                        </Link>
                    </div>
                )}

                {/* Tweets Grid */}
                {tweets.length > 0 && (
                    <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
                        {tweets.map((tweet) => (
                            <TweetCard
                                key={tweet.tweetId}
                                id={0} // Not used for actions
                                xId={tweet.tweetId}
                                content={tweet.data.content || null}
                                author={tweet.data.author ? {
                                    name: tweet.data.author.name,
                                    handle: tweet.data.author.handle,
                                    avatar: tweet.data.author.avatar
                                } : null}
                                media={tweet.data.media || null}
                                url={tweet.data.url || null}
                                platform={tweet.data.platform || 'x'}
                                createdAt={tweet.updatedAt} // Using updatedAt as we sort by it
                                tags={[]} // Tag page doesn't need to show tags inside card necessarily, or we can pass the current tag
                                cacheInfo={tweet.cacheInfo ? {
                                    ...tweet.cacheInfo,
                                    snapshotUrl: tweet.cacheInfo.snapshotUrl
                                } : null}
                                onDelete={async (xId: string) => {
                                    if (confirm('Are you sure you want to delete this post?')) {
                                        try {
                                            await fetch(`${API_URL}/api/posts/x/${xId}`, { method: 'DELETE', credentials: 'include' })
                                            setTweets(prev => prev.filter(t => t.tweetId !== xId))
                                        } catch (e) { console.error(e) }
                                    }
                                }}
                                // Optional props
                                onPin={undefined}
                                onRemoveTag={undefined}
                            />
                        ))}
                    </div>
                )}
            </div>
        </>
    )
}
