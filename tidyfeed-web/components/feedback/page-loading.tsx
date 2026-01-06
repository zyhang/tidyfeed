import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface PageLoadingProps {
    size?: 'sm' | 'md' | 'lg'
    text?: string
    className?: string
}

const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-8 w-8',
    lg: 'h-12 w-12',
}

export function PageLoading({ size = 'md', text, className }: PageLoadingProps) {
    return (
        <div className={cn('flex flex-col items-center justify-center py-12', className)}>
            <Loader2 className={cn('animate-spin text-muted-foreground', sizeClasses[size])} />
            {text && <p className="mt-3 text-sm text-muted-foreground">{text}</p>}
        </div>
    )
}

interface SkeletonProps {
    className?: string
}

export function Skeleton({ className }: SkeletonProps) {
    return <div className={cn('animate-pulse rounded-md bg-muted', className)} />
}

interface PageSkeletonProps {
    type?: 'list' | 'grid' | 'table'
    items?: number
}

export function PageSkeleton({ type = 'list', items = 5 }: PageSkeletonProps) {
    if (type === 'grid') {
        return (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: items }).map((_, i) => (
                    <div key={i} className="rounded-lg border p-4 space-y-3">
                        <Skeleton className="h-5 w-3/4" />
                        <Skeleton className="h-4 w-1/2" />
                        <Skeleton className="h-20 w-full" />
                    </div>
                ))}
            </div>
        )
    }

    if (type === 'table') {
        return (
            <div className="rounded-lg border">
                <div className="border-b px-6 py-4">
                    <Skeleton className="h-5 w-32" />
                </div>
                <div className="divide-y">
                    {Array.from({ length: items }).map((_, i) => (
                        <div key={i} className="flex items-center px-6 py-4 gap-4">
                            <Skeleton className="h-10 w-10 rounded-full" />
                            <Skeleton className="h-4 w-48" />
                            <Skeleton className="h-4 w-24 ml-auto" />
                        </div>
                    ))}
                </div>
            </div>
        )
    }

    // Default list type
    return (
        <div className="space-y-3">
            {Array.from({ length: items }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 rounded-lg border p-4">
                    <Skeleton className="h-12 w-12 rounded-lg" />
                    <div className="flex-1 space-y-2">
                        <Skeleton className="h-4 w-3/4" />
                        <Skeleton className="h-3 w-1/2" />
                    </div>
                </div>
            ))}
        </div>
    )
}
