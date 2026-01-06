import { cn } from '@/lib/utils'
import { AlertCircle, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ErrorStateProps {
    title?: string
    message: string
    onRetry?: () => void
    retryText?: string
    className?: string
    size?: 'sm' | 'md' | 'lg'
}

const sizeClasses = {
    sm: 'py-8',
    md: 'py-12',
    lg: 'py-16',
}

const iconSizes = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16',
}

export function ErrorState({
    title = 'Something went wrong',
    message,
    onRetry,
    retryText = 'Try again',
    className,
    size = 'md',
}: ErrorStateProps) {
    return (
        <div className={cn('flex flex-col items-center justify-center text-center', sizeClasses[size], className)}>
            <div className={cn('text-destructive/50 mb-4', iconSizes[size])}>
                <AlertCircle className="h-full w-full" />
            </div>
            <h3 className={cn('font-semibold', size === 'sm' ? 'text-sm' : 'text-base')}>
                {title}
            </h3>
            <p className={cn('text-muted-foreground mt-1 max-w-sm', size === 'sm' ? 'text-xs' : 'text-sm')}>
                {message}
            </p>
            {onRetry && (
                <Button variant="outline" onClick={onRetry} className="mt-4">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    {retryText}
                </Button>
            )}
        </div>
    )
}
