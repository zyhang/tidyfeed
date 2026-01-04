'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2, ImageIcon, RefreshCw, ArrowUpDown, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app'

interface ImageItem {
    id: number
    postId: string
    url: string
    createdAt: string
}

export default function LibraryImagesPage() {
    const [images, setImages] = useState<ImageItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [sortAsc, setSortAsc] = useState(false)
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null)

    const fetchImages = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)

            const params = new URLSearchParams({ sort: sortAsc ? 'asc' : 'desc' })
            const response = await fetch(`${API_URL}/api/library/images?${params}`, {
                credentials: 'include'
            })

            if (!response.ok) {
                if (response.status === 401) {
                    setError('Please log in to view your library')
                    return
                }
                throw new Error('Failed to fetch images')
            }

            const data = await response.json()
            setImages(data.images || [])
        } catch (err) {
            console.error('Error fetching images:', err)
            setError('Failed to load images')
        } finally {
            setLoading(false)
        }
    }, [sortAsc])

    useEffect(() => {
        fetchImages()
    }, [fetchImages])

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        })
    }

    // Close lightbox on Escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setLightboxUrl(null)
        }
        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [])

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
                <p className="mb-4">{error}</p>
                <Button variant="outline" onClick={fetchImages}>
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Retry
                </Button>
            </div>
        )
    }

    if (images.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground">
                <ImageIcon className="h-12 w-12 mb-4 opacity-50" />
                <p className="text-lg mb-2">No images yet</p>
                <p className="text-sm">Save posts with images using TidyFeed</p>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Images</h1>
                    <p className="text-sm text-muted-foreground">{images.length} saved</p>
                </div>
                <div className="flex gap-2">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSortAsc(!sortAsc)}
                    >
                        <ArrowUpDown className="h-4 w-4 mr-2" />
                        {sortAsc ? 'Oldest First' : 'Newest First'}
                    </Button>
                    <Button variant="outline" size="sm" onClick={fetchImages}>
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            {/* Masonry Grid */}
            <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
                {images.map((image, index) => (
                    <div
                        key={`${image.id}-${index}`}
                        className="break-inside-avoid group relative cursor-pointer"
                        onClick={() => setLightboxUrl(image.url)}
                    >
                        <img
                            src={image.url}
                            alt=""
                            loading="lazy"
                            className="w-full rounded-lg hover:opacity-90 transition-opacity"
                        />
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/60 to-transparent rounded-b-lg opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-xs text-white">{formatDate(image.createdAt)}</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Lightbox */}
            {lightboxUrl && (
                <div
                    className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4"
                    onClick={() => setLightboxUrl(null)}
                >
                    <button
                        className="absolute top-4 right-4 text-white hover:text-gray-300"
                        onClick={() => setLightboxUrl(null)}
                    >
                        <X className="h-8 w-8" />
                    </button>
                    <img
                        src={lightboxUrl}
                        alt=""
                        className="max-w-full max-h-full object-contain"
                        onClick={(e) => e.stopPropagation()}
                    />
                </div>
            )}
        </div>
    )
}
