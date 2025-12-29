'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
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
                            <Card key={tweet.tweetId} className="overflow-hidden hover:shadow-md transition-shadow break-inside-avoid mb-4">
                                <CardContent className="p-4">
                                    {/* Author */}
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            {tweet.data.author?.avatar ? (
                                                <img
                                                    src={tweet.data.author.avatar}
                                                    alt={tweet.data.author.name || 'Avatar'}
                                                    className="w-10 h-10 rounded-full object-cover"
                                                    referrerPolicy="no-referrer"
                                                />
                                            ) : (
                                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-500 flex items-center justify-center text-white font-bold text-sm">
                                                    {tweet.data.author?.name?.charAt(0) || '?'}
                                                </div>
                                            )}
                                            <div>
                                                <p className="font-semibold text-sm">{tweet.data.author?.name || 'Unknown'}</p>
                                                <p className="text-xs text-muted-foreground">{tweet.data.author?.handle || '@unknown'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    {tweet.data.content && (
                                        <p className="text-sm whitespace-pre-wrap mb-3 line-clamp-4">
                                            {tweet.data.content}
                                        </p>
                                    )}

                                    {/* Media */}
                                    {tweet.data.media && tweet.data.media.length > 0 && (
                                        <div className={`grid gap-2 mb-3 ${tweet.data.media.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
                                            {tweet.data.media.slice(0, 4).map((imgUrl, idx) => (
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
                                    {tweet.data.url && (
                                        <div className="pt-2 border-t">
                                            <Button variant="ghost" size="sm" asChild>
                                                <a href={tweet.data.url} target="_blank" rel="noopener noreferrer" className="text-xs">
                                                    <ExternalLink className="h-3 w-3 mr-1" />
                                                    View on {tweet.data.platform === 'x' ? 'X' : tweet.data.platform || 'X'}
                                                </a>
                                            </Button>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </>
    )
}
