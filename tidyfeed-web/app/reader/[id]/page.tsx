'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import {
    Loader2,
    Sun,
    Moon,
    BookOpen,
    Minus,
    Plus,
    RotateCcw,
    ExternalLink,
    Trash2,
    ChevronLeft,
    Archive,
    ArchiveRestore,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app'

type ReaderTheme = 'light' | 'dark' | 'sepia'

interface ArticleData {
    id: number
    url: string
    title: string
    excerpt: string | null
    author: string | null
    publishedAt: string | null
    domain: string
    wordCount: number
    readingTimeMinutes: number
    imageUrl: string | null
    createdAt: string
    readAt: string | null
    archivedAt: string | null
}

// Theme CSS variables to inject into iframe
const themeStyles: Record<ReaderTheme, string> = {
    light: `
        :root {
            --bg: #ffffff;
            --text: #37352f;
            --text-secondary: #787774;
            --text-muted: #9b9a97;
            --border: #e9e9e7;
            --link: #2383e2;
            --quote-bg: #f7f7f5;
            --quote-border: #e9e9e7;
        }
    `,
    dark: `
        :root {
            --bg: #1a1a1a;
            --text: #e8e6e3;
            --text-secondary: #9b9a97;
            --text-muted: #6b6a67;
            --border: #3a3a3a;
            --link: #4a9eff;
            --quote-bg: #2a2a2a;
            --quote-border: #3a3a3a;
        }
    `,
    sepia: `
        :root {
            --bg: #f4ecd8;
            --text: #5c4b37;
            --text-secondary: #8b7355;
            --text-muted: #a89070;
            --border: #d4c4a8;
            --link: #2d6fd4;
            --quote-bg: #ebe3d1;
            --quote-border: #d4c4a8;
        }
    `,
}

export default function ReaderPage() {
    const params = useParams()
    const router = useRouter()
    const iframeRef = useRef<HTMLIFrameElement>(null)

    const [article, setArticle] = useState<ArticleData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [htmlContent, setHtmlContent] = useState<string>('')

    // Reader settings
    const [theme, setTheme] = useState<ReaderTheme>('light')
    const [fontSize, setFontSize] = useState(18) // Base font size in px
    const [readProgress, setReadProgress] = useState(0)

    // params.id is a string or string[] in client components with useParams
    const articleId = typeof params.id === 'string' ? params.id : params.id?.[0] || ''

    // Fetch article data
    const fetchArticle = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const response = await fetch(`${API_URL}/api/articles/${articleId}`, {
                credentials: 'include',
            })

            if (!response.ok) {
                if (response.status === 401) {
                    setError('Please log in to view this article')
                    return
                }
                if (response.status === 404) {
                    setError('Article not found')
                    return
                }
                throw new Error('Failed to fetch article')
            }

            const data = await response.json()
            setArticle(data.article)

            // Fetch HTML content
            const contentResponse = await fetch(`${API_URL}/api/articles/${articleId}/content`, {
                credentials: 'include',
            })

            if (!contentResponse.ok) {
                throw new Error('Failed to fetch article content')
            }

            const html = await contentResponse.text()
            setHtmlContent(html)
        } catch (err) {
            console.error('Error fetching article:', err)
            setError('Failed to load article')
        } finally {
            setLoading(false)
        }
    }, [articleId])

    // Mark article as read
    const markAsRead = useCallback(async () => {
        if (!article || article.readAt) return

        try {
            await fetch(`${API_URL}/api/articles/${articleId}/read?read=true`, {
                method: 'PUT',
                credentials: 'include',
            })
        } catch (err) {
            console.error('Failed to mark as read:', err)
        }
    }, [articleId, article])

    // Delete article
    const deleteArticle = async () => {
        if (!confirm('Are you sure you want to delete this article?')) return

        try {
            await fetch(`${API_URL}/api/articles/${articleId}`, {
                method: 'DELETE',
                credentials: 'include',
            })
            router.push('/dashboard')
        } catch (err) {
            console.error('Failed to delete article:', err)
        }
    }

    // Toggle archive status
    const toggleArchive = async () => {
        if (!article) return

        try {
            const isArchived = !!article.archivedAt
            await fetch(`${API_URL}/api/articles/${articleId}/archive?archive=${!isArchived}`, {
                method: 'PUT',
                credentials: 'include',
            })
            setArticle({
                ...article,
                archivedAt: isArchived ? null : new Date().toISOString(),
            })
        } catch (err) {
            console.error('Failed to toggle archive:', err)
        }
    }

    // Inject theme and styles into iframe
    useEffect(() => {
        const iframe = iframeRef.current
        if (!iframe || !htmlContent) return

        let cleanupScroll: (() => void) | undefined

        const injectStyles = () => {
            const doc = iframe.contentDocument
            if (!doc) return

            // Create or update theme style element
            const themeElId = 'tidyfeed-reader-theme'
            const existingTheme = doc.getElementById(themeElId) as HTMLStyleElement | null
            if (existingTheme) {
                existingTheme.textContent = themeStyles[theme]
            } else {
                const styleEl = doc.createElement('style')
                styleEl.id = themeElId
                styleEl.textContent = themeStyles[theme]
                doc.head.appendChild(styleEl)
            }

            // Create or update font size style element
            const fontElId = 'tidyfeed-reader-font'
            const existingFont = doc.getElementById(fontElId) as HTMLStyleElement | null
            if (existingFont) {
                existingFont.textContent = `body { font-size: ${fontSize}px !important; }`
            } else {
                const fontSizeEl = doc.createElement('style')
                fontSizeEl.id = fontElId
                fontSizeEl.textContent = `body { font-size: ${fontSize}px !important; }`
                doc.head.appendChild(fontSizeEl)
            }

            // Track reading progress
            const handleScroll = () => {
                const scrollTop = doc.documentElement.scrollTop || doc.body.scrollTop
                const scrollHeight = doc.documentElement.scrollHeight || doc.body.scrollHeight
                const clientHeight = doc.documentElement.clientHeight || doc.body.clientHeight
                const progress = (scrollTop / (scrollHeight - clientHeight)) * 100
                setReadProgress(Math.min(100, Math.max(0, progress)))
            }

            const win = iframe.contentWindow
            if (win) {
                win.addEventListener('scroll', handleScroll)
                handleScroll()
                cleanupScroll = () => {
                    win.removeEventListener('scroll', handleScroll)
                }
            }
        }

        // Wait for iframe to load
        if (iframe.contentDocument?.readyState === 'complete') {
            injectStyles()
        } else {
            iframe.addEventListener('load', injectStyles, { once: true })
        }

        return () => {
            if (cleanupScroll) cleanupScroll()
        }
    }, [htmlContent, theme, fontSize])

    useEffect(() => {
        fetchArticle()
    }, [fetchArticle])

    // Mark as read when user scrolls past 50%
    useEffect(() => {
        if (readProgress > 50) {
            markAsRead()
        }
    }, [readProgress, markAsRead])

    // Load saved preferences
    useEffect(() => {
        const savedTheme = localStorage.getItem('reader-theme') as ReaderTheme | null
        const savedFontSize = localStorage.getItem('reader-font-size')

        if (savedTheme) setTheme(savedTheme)
        if (savedFontSize) setFontSize(parseInt(savedFontSize, 10))
    }, [])

    // Save preferences
    useEffect(() => {
        localStorage.setItem('reader-theme', theme)
    }, [theme])

    useEffect(() => {
        localStorage.setItem('reader-font-size', fontSize.toString())
    }, [fontSize])

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Escape to go back to dashboard
            if (e.key === 'Escape') {
                router.push('/dashboard')
            }
            // Alt+T to toggle theme
            if (e.altKey && e.key === 't') {
                setTheme((t) => (t === 'light' ? 'dark' : t === 'dark' ? 'sepia' : 'light'))
            }
            // Alt+Plus/Minus to adjust font size
            if (e.altKey && (e.key === '=' || e.key === '+')) {
                setFontSize((s) => Math.min(28, s + 2))
            }
            if (e.altKey && e.key === '-') {
                setFontSize((s) => Math.max(12, s - 2))
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [router])

    const adjustFontSize = (delta: number) => {
        setFontSize((s) => Math.min(28, Math.max(12, s + delta)))
    }

    const resetFontSize = () => {
        setFontSize(18)
    }

    const isLoading = loading || !htmlContent

    return (
        <div className="fixed inset-0 bg-background flex flex-col">
            {/* Progress bar at top */}
            <div className="h-1 bg-border">
                <div
                    className="h-full bg-primary transition-all duration-150 ease-out"
                    style={{ width: `${readProgress}%` }}
                />
            </div>

            {/* Header bar */}
            <header className="flex items-center justify-between px-4 py-3 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="p-2 hover:bg-accent rounded-lg transition-colors"
                        title="Back to dashboard (Esc)"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>
                    {article && (
                        <div className="hidden sm:block">
                            <h1 className="text-sm font-medium truncate max-w-md">{article.title}</h1>
                            <p className="text-xs text-muted-foreground">{article.domain}</p>
                        </div>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    {/* Theme buttons */}
                    <div className="flex items-center bg-muted rounded-lg p-1 mr-2">
                        <button
                            onClick={() => setTheme('light')}
                            className={`p-2 rounded-md transition-colors ${
                                theme === 'light'
                                    ? 'bg-background shadow-sm'
                                    : 'hover:bg-background/50'
                            }`}
                            title="Light theme (Alt+T)"
                        >
                            <Sun className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setTheme('sepia')}
                            className={`p-2 rounded-md transition-colors ${
                                theme === 'sepia'
                                    ? 'bg-background shadow-sm'
                                    : 'hover:bg-background/50'
                            }`}
                            title="Sepia theme"
                        >
                            <BookOpen className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => setTheme('dark')}
                            className={`p-2 rounded-md transition-colors ${
                                theme === 'dark'
                                    ? 'bg-background shadow-sm'
                                    : 'hover:bg-background/50'
                            }`}
                            title="Dark theme"
                        >
                            <Moon className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Font size controls */}
                    <div className="hidden md:flex items-center bg-muted rounded-lg p-1 mr-2">
                        <button
                            onClick={() => adjustFontSize(-2)}
                            className="p-2 hover:bg-background/50 rounded-md transition-colors"
                            title="Smaller font (Alt+-)"
                        >
                            <Minus className="h-4 w-4" />
                        </button>
                        <button
                            onClick={resetFontSize}
                            className="px-2 text-xs font-medium hover:bg-background/50 rounded-md transition-colors"
                            title="Reset font size"
                        >
                            {fontSize}px
                        </button>
                        <button
                            onClick={() => adjustFontSize(2)}
                            className="p-2 hover:bg-background/50 rounded-md transition-colors"
                            title="Larger font (Alt++)"
                        >
                            <Plus className="h-4 w-4" />
                        </button>
                    </div>

                    {/* Actions */}
                    <button
                        onClick={() => window.open(article?.url, '_blank')}
                        disabled={!article}
                        className="p-2 hover:bg-accent rounded-lg transition-colors hidden sm:block"
                        title="Open original"
                    >
                        <ExternalLink className="h-4 w-4" />
                    </button>
                    <button
                        onClick={toggleArchive}
                        disabled={!article}
                        className="p-2 hover:bg-accent rounded-lg transition-colors"
                        title={article?.archivedAt ? 'Unarchive' : 'Archive'}
                    >
                        {article?.archivedAt ? (
                            <ArchiveRestore className="h-4 w-4" />
                        ) : (
                            <Archive className="h-4 w-4" />
                        )}
                    </button>
                    <button
                        onClick={deleteArticle}
                        disabled={!article}
                        className="p-2 hover:bg-destructive/10 hover:text-destructive rounded-lg transition-colors"
                        title="Delete"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            </header>

            {/* Mobile settings bar */}
            <div className="md:hidden flex items-center justify-between px-4 py-2 border-b bg-muted/30">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => adjustFontSize(-2)}
                        className="p-1.5 hover:bg-background rounded-md transition-colors"
                    >
                        <Minus className="h-4 w-4" />
                    </button>
                    <span className="text-sm px-2">{fontSize}px</span>
                    <button
                        onClick={() => adjustFontSize(2)}
                        className="p-1.5 hover:bg-background rounded-md transition-colors"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                    <button
                        onClick={resetFontSize}
                        className="p-1.5 hover:bg-background rounded-md transition-colors ml-1"
                    >
                        <RotateCcw className="h-4 w-4" />
                    </button>
                </div>
                <span className="text-xs text-muted-foreground">{Math.round(readProgress)}%</span>
            </div>

            {/* Content area */}
            <div className="flex-1 overflow-hidden">
                {isLoading ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-muted-foreground" />
                            <p className="text-sm text-muted-foreground">Loading article...</p>
                        </div>
                    </div>
                ) : error ? (
                    <div className="h-full flex items-center justify-center p-4">
                        <div className="text-center max-w-md">
                            <div className="text-destructive text-lg font-medium mb-2">Error</div>
                            <p className="text-muted-foreground mb-4">{error}</p>
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                            >
                                Back to Dashboard
                            </button>
                        </div>
                    </div>
                ) : (
                    <iframe
                        ref={iframeRef}
                        srcDoc={htmlContent}
                        className="w-full h-full border-0"
                        title="Article content"
                        sandbox="allow-same-origin"
                    />
                )}
            </div>

            {/* Keyboard shortcuts hint - shown on hover */}
            <div className="hidden lg:block fixed bottom-4 left-4 text-xs text-muted-foreground bg-background/80 backdrop-blur px-2 py-1 rounded opacity-0 hover:opacity-100 transition-opacity">
                Esc: Back | Alt+T: Theme | Alt±: Font size
            </div>
        </div>
    )
}
