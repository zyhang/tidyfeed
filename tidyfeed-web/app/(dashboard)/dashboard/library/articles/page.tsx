'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
    BookOpen,
    ArrowUpDown,
    RefreshCw,
    Search,
    Archive,
    ArchiveRestore,
    Trash2,
    ExternalLink,
    Clock,
    Filter,
    X,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

// Design System Components
import { PageHeader } from '@/components/layout'
import { PageLoading, EmptyState, ErrorState } from '@/components/feedback'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app'

interface ArticleItem {
    id: number
    url: string
    title: string
    excerpt: string | null
    author: string | null
    domain: string
    wordCount: number
    readingTimeMinutes: number
    imageUrl: string | null
    createdAt: string
    readAt: string | null
    archivedAt: string | null
}

type FilterType = 'all' | 'unread' | 'archived'
type SortType = 'created' | 'title' | 'domain'

export default function LibraryArticlesPage() {
    const router = useRouter()
    const [articles, setArticles] = useState<ArticleItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    // Filter and sort state
    const [filter, setFilter] = useState<FilterType>('all')
    const [sort, setSort] = useState<SortType>('created')
    const [sortAsc, setSortAsc] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')

    // UI state
    const [showFilters, setShowFilters] = useState(false)
    const [deletingId, setDeletingId] = useState<number | null>(null)

    const fetchArticles = async () => {
        try {
            setLoading(true)
            setError(null)

            const params = new URLSearchParams()
            if (filter !== 'all') params.append('filter', filter)
            params.append('sort', sort)
            params.append('order', sortAsc ? 'asc' : 'desc')

            const response = await fetch(`${API_URL}/api/articles?${params}`, {
                credentials: 'include',
            })

            if (!response.ok) {
                if (response.status === 401) {
                    setError('Please log in to view your library')
                    return
                }
                throw new Error('Failed to fetch articles')
            }

            const data = await response.json()
            setArticles(data.articles || [])
        } catch (err) {
            console.error('Error fetching articles:', err)
            setError('Failed to load articles')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchArticles()
    }, [filter, sort, sortAsc])

    const handleOpenArticle = (id: number) => {
        router.push(`/reader/${id}`)
    }

    const handleToggleRead = async (id: number, currentReadAt: string | null) => {
        try {
            await fetch(`${API_URL}/api/articles/${id}/read?read=${!currentReadAt}`, {
                method: 'PUT',
                credentials: 'include',
            })
            // Update local state
            setArticles((articles) =>
                articles.map((a) =>
                    a.id === id
                        ? { ...a, readAt: !currentReadAt ? new Date().toISOString() : null }
                        : a
                )
            )
        } catch (err) {
            console.error('Failed to toggle read status:', err)
        }
    }

    const handleToggleArchive = async (id: number, currentArchivedAt: string | null) => {
        try {
            await fetch(`${API_URL}/api/articles/${id}/archive?archive=${!currentArchivedAt}`, {
                method: 'PUT',
                credentials: 'include',
            })
            // Update local state
            setArticles((articles) =>
                articles.map((a) =>
                    a.id === id
                        ? { ...a, archivedAt: !currentArchivedAt ? new Date().toISOString() : null }
                        : a
                )
            )
        } catch (err) {
            console.error('Failed to toggle archive:', err)
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this article?')) return

        try {
            setDeletingId(id)
            await fetch(`${API_URL}/api/articles/${id}`, {
                method: 'DELETE',
                credentials: 'include',
            })
            // Remove from local state
            setArticles((articles) => articles.filter((a) => a.id !== id))
        } catch (err) {
            console.error('Failed to delete article:', err)
        } finally {
            setDeletingId(null)
        }
    }

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
        })
    }

    const getRelativeTime = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diffMs = now.getTime() - date.getTime()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

        if (diffDays === 0) return 'Today'
        if (diffDays === 1) return 'Yesterday'
        if (diffDays < 7) return `${diffDays}d ago`
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
        return formatDate(dateStr)
    }

    // Filter articles by search query
    const filteredArticles = articles.filter((article) => {
        if (!searchQuery) return true
        const query = searchQuery.toLowerCase()
        return (
            article.title.toLowerCase().includes(query) ||
            article.domain.toLowerCase().includes(query) ||
            article.excerpt?.toLowerCase().includes(query)
        )
    })

    const activeFilterCount =
        (filter !== 'all' ? 1 : 0) + (searchQuery ? 1 : 0)

    if (loading) {
        return <PageLoading />
    }

    if (error) {
        return <ErrorState message={error} onRetry={fetchArticles} />
    }

    return (
        <>
            <PageHeader
                title="Articles"
                description={
                    searchQuery || filter !== 'all'
                        ? `${filteredArticles.length} found`
                        : `${articles.length} saved`
                }
                actions={
                    <div className="flex gap-2">
                        <Button
                            variant={showFilters ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <Filter className="h-4 w-4 mr-2" />
                            Filters
                            {activeFilterCount > 0 && (
                                <span className="ml-1 px-1.5 py-0.5 bg-primary-foreground/20 rounded-full text-xs">
                                    {activeFilterCount}
                                </span>
                            )}
                        </Button>
                        <Button variant="outline" size="sm" onClick={fetchArticles}>
                            <RefreshCw className="h-4 w-4" />
                        </Button>
                    </div>
                }
            />

            {/* Filters panel */}
            {showFilters && (
                <Card className="mb-4">
                    <CardContent className="p-4 space-y-4">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search articles..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-10 py-2 bg-background border rounded-lg focus:outline-none focus:ring-2 focus:ring-ring"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery('')}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>

                        {/* Filter buttons */}
                        <div className="flex flex-wrap gap-2">
                            <Button
                                variant={filter === 'all' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setFilter('all')}
                            >
                                All
                            </Button>
                            <Button
                                variant={filter === 'unread' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setFilter('unread')}
                            >
                                <Clock className="h-3 w-3 mr-1" />
                                Unread
                            </Button>
                            <Button
                                variant={filter === 'archived' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setFilter('archived')}
                            >
                                <Archive className="h-3 w-3 mr-1" />
                                Archived
                            </Button>
                        </div>

                        {/* Sort options */}
                        <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm text-muted-foreground">Sort by:</span>
                            <Button
                                variant={sort === 'created' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setSort('created')}
                            >
                                Date
                            </Button>
                            <Button
                                variant={sort === 'title' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setSort('title')}
                            >
                                Title
                            </Button>
                            <Button
                                variant={sort === 'domain' ? 'secondary' : 'ghost'}
                                size="sm"
                                onClick={() => setSort('domain')}
                            >
                                Domain
                            </Button>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSortAsc(!sortAsc)}
                            >
                                <ArrowUpDown className="h-4 w-4" />
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Articles list */}
            {filteredArticles.length === 0 ? (
                <EmptyState
                    icon={<BookOpen />}
                    title={
                        searchQuery || filter !== 'all'
                            ? 'No articles found'
                            : 'No articles yet'
                    }
                    description={
                        searchQuery || filter !== 'all'
                            ? 'Try adjusting your filters or search query'
                            : 'Use the TidyFeed browser extension to save articles'
                    }
                />
            ) : (
                <div className="space-y-3">
                    {filteredArticles.map((article) => (
                        <Card
                            key={article.id}
                            className={`group hover:shadow-md transition-shadow cursor-pointer ${
                                !article.readAt ? 'border-l-4 border-l-primary' : ''
                            }`}
                        >
                            <CardContent className="p-4">
                                <div className="flex gap-4">
                                    {/* Thumbnail */}
                                    {article.imageUrl && (
                                        <div
                                            className="flex-shrink-0 w-24 h-24 rounded-md overflow-hidden bg-muted"
                                            onClick={() => handleOpenArticle(article.id)}
                                        >
                                            <img
                                                src={article.imageUrl}
                                                alt=""
                                                className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                                            />
                                        </div>
                                    )}

                                    {/* Content */}
                                    <div className="flex-1 min-w-0">
                                        <div
                                            className="flex items-start justify-between gap-2 mb-1"
                                            onClick={() => handleOpenArticle(article.id)}
                                        >
                                            <h3 className="font-semibold text-base line-clamp-2 group-hover:text-primary transition-colors">
                                                {article.title}
                                            </h3>
                                            {!article.readAt && (
                                                <span className="flex-shrink-0 w-2 h-2 rounded-full bg-primary mt-2" />
                                            )}
                                        </div>

                                        {article.excerpt && (
                                            <p
                                                className="text-sm text-muted-foreground line-clamp-2 mb-2"
                                                onClick={() => handleOpenArticle(article.id)}
                                            >
                                                {article.excerpt}
                                            </p>
                                        )}

                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                                <span className="font-medium">{article.domain}</span>
                                                <span>{getRelativeTime(article.createdAt)}</span>
                                                {article.readingTimeMinutes > 0 && (
                                                    <span>{article.readingTimeMinutes} min read</span>
                                                )}
                                            </div>

                                            {/* Action buttons */}
                                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => handleToggleRead(article.id, article.readAt)}
                                                    title={article.readAt ? 'Mark as unread' : 'Mark as read'}
                                                >
                                                    <Clock className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() =>
                                                        handleToggleArchive(article.id, article.archivedAt)
                                                    }
                                                    title={article.archivedAt ? 'Unarchive' : 'Archive'}
                                                >
                                                    {article.archivedAt ? (
                                                        <ArchiveRestore className="h-4 w-4" />
                                                    ) : (
                                                        <Archive className="h-4 w-4" />
                                                    )}
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => window.open(article.url, '_blank')}
                                                    title="Open original"
                                                >
                                                    <ExternalLink className="h-4 w-4" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="icon-sm"
                                                    onClick={() => handleDelete(article.id)}
                                                    disabled={deletingId === article.id}
                                                    className="hover:text-destructive"
                                                    title="Delete"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}
        </>
    )
}
