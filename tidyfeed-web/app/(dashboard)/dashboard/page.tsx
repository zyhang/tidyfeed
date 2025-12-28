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
}

function DashboardContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const initialQuery = searchParams.get('q') || ''

    const [query, setQuery] = useState(initialQuery)
    const [posts, setPosts] = useState<Post[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchPosts = useCallback(async (search: string) => {
        setLoading(true)
        setError(null)
        try {
            const url = new URL(`${API_URL}/api/posts`)
            if (search) url.searchParams.set('search', search)

            const response = await fetch(url.toString(), {
                credentials: 'include',
            })

            if (!response.ok) {
                if (response.status === 401) {
                    setError('Please log in to view your saved posts')
                    setPosts([])
                    return
                }
                throw new Error('Failed to fetch posts')
            }

            const data = await response.json()
            setPosts(data.posts || [])
        } catch (err) {
            console.error('Error fetching posts:', err)
            setError('Failed to load posts')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchPosts(initialQuery)
    }, [initialQuery, fetchPosts])

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault()
        const params = new URLSearchParams()
        if (query) params.set('q', query)
        router.push(`/dashboard${params.toString() ? `?${params.toString()}` : ''}`)
    }

    const handleDelete = async (xId: string) => {
        try {
            const response = await fetch(`${API_URL}/api/posts/x/${xId}`, {
                method: 'DELETE',
                credentials: 'include',
            })

            if (!response.ok) {
                throw new Error('Failed to delete post')
            }

            // Remove from local state
            setPosts(prev => prev.filter(p => p.xId !== xId))
        } catch (err) {
            console.error('Error deleting post:', err)
            alert('Failed to delete post')
        }
    }

    return (
        <div className="flex flex-col gap-6">
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
                            onDelete={handleDelete}
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
