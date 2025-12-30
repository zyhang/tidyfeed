'use client'

import { Suspense } from 'react'
import { useState, useEffect, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Input } from '@/components/ui/input'
import { TweetCard } from '@/components/TweetCard'
import { Search, Loader2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app'

interface Author {
    name?: string
    handle?: string
}

interface Post {
    id: number
    xId: string
    content: string | null
    author: Author | null
    media: string[] | null
    url: string | null
    platform: string
    createdAt: string
    pinnedAt?: string | null
    tags?: { id: number; name: string }[]
}

import { toast } from 'sonner'

function DashboardContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const initialQuery = searchParams.get('q') || ''

    const [query, setQuery] = useState(initialQuery)
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchPosts = useCallback(async (searchQuery: string = '') => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams()
            if (searchQuery) params.append('search', searchQuery)

            const response = await fetch(`${API_URL}/api/posts?${params.toString()}`, {
                credentials: 'include',
            })

            if (!response.ok) {
                if (response.status === 401) {
                    router.push('/')
                    return
                }
                throw new Error('Failed to fetch posts')
            }

            const data = await response.json()
            setPosts(data.posts || [])
        } catch (err) {
            console.error('Fetch error:', err)
            setError('Failed to load posts. Please try again.')
        } finally {
            setLoading(false)
        }
    }, [router])

    useEffect(() => {
        fetchPosts(initialQuery)
    }, [fetchPosts, initialQuery])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        fetchPosts(query)
    }

    const handlePin = async (xId: string, pinned: boolean) => {
        // Optimistic update
        const currentPosts = [...posts]
        const postIndex = currentPosts.findIndex(p => p.xId === xId)
        if (postIndex === -1) return

        const updatedPost = {
            ...currentPosts[postIndex],
            pinnedAt: pinned ? new Date().toISOString() : null
        }

        // Create new list and re-sort
        // 1. Remove the post
        currentPosts.splice(postIndex, 1)
        // 2. Add modified post back
        currentPosts.push(updatedPost)

        // 3. Sort: Pinned first (descending timestamp), then CreatedAt desc
        currentPosts.sort((a, b) => {
            if (a.pinnedAt && b.pinnedAt) {
                return new Date(b.pinnedAt).getTime() - new Date(a.pinnedAt).getTime()
            }
            if (a.pinnedAt) return -1
            if (b.pinnedAt) return 1
            return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        })

        setPosts(currentPosts)

        try {
            const response = await fetch(`${API_URL}/api/posts/${xId}/pin`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ pinned }),
            })

            if (!response.ok) {
                // Revert on error
                // We could implement a full revert, but for now just fetching again or showing error is safer
                throw new Error('Failed to update pin status')
            }

            toast.success(pinned ? 'Post pinned' : 'Post unpinned')
        } catch (error) {
            console.error('Pin error:', error)
            toast.error('Failed to update pin status')
            // Revert by re-fetching (simpler than manual revert logic)
            fetchPosts(query)
        }
    }

    const handleDelete = async (xId: string) => {
        try {
            const response = await fetch(`${API_URL}/api/posts/x/${xId}`, {
                method: 'DELETE',
                credentials: 'include',
            })

            if (!response.ok) throw new Error('Failed to delete post')

            // Remove from local state
            setPosts(prev => prev.filter(p => p.xId !== xId))
            toast.success('Post deleted')
        } catch (error) {
            console.error('Delete error:', error)
            toast.error('Failed to delete post')
        }
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col gap-2">
                <h1 className="text-2xl font-bold">Saved Posts</h1>
                <p className="text-muted-foreground">
                    Your bookmarked posts from across platforms
                </p>
            </div>

            {/* Search Bar */}
            <form onSubmit={handleSearch} className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Search posts..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-10"
                />
            </form>

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            )}

            {/* Error State */}
            {error && !loading && (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">{error}</p>
                </div>
            )}

            {/* Empty State */}
            {!loading && !error && posts.length === 0 && (
                <div className="text-center py-12">
                    <p className="text-muted-foreground">
                        {initialQuery ? 'No posts match your search' : 'No saved posts yet. Use the TidyFeed extension to bookmark tweets!'}
                    </p>
                </div>
            )}

            {/* Posts Masonry Grid */}
            {!loading && !error && posts.length > 0 && (
                <div className="columns-1 md:columns-2 lg:columns-3 gap-4">
                    {posts.map((post) => (
                        <TweetCard
                            key={post.id}
                            id={post.id}
                            xId={post.xId}
                            content={post.content}
                            author={post.author}
                            media={post.media}
                            url={post.url}
                            platform={post.platform}
                            createdAt={post.createdAt}
                            tags={post.tags}
                            pinnedAt={post.pinnedAt}
                            onDelete={handleDelete}
                            onPin={handlePin}
                        />
                    ))}
                </div>
            )}
        </div>
    )
}

export default function DashboardPage() {
    return (
        <Suspense fallback={
            <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        }>
            <DashboardContent />
        </Suspense>
    )
}
