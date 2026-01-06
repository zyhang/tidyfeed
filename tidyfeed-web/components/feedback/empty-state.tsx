import { cn } from '@/lib/utils'
import { ReactNode } from 'react'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
    icon?: ReactNode
    title: string
    description?: string
    action?: {
        label: string
        onClick: () => void
        variant?: 'default' | 'outline' | 'secondary' | 'ghost'
    }
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

export function EmptyState({
    icon,
    title,
    description,
    action,
    className,
    size = 'md',
}: EmptyStateProps) {
    return (
        <div className={cn('flex flex-col items-center justify-center text-center', sizeClasses[size], className)}>
            {icon && (
                <div className={cn('text-muted-foreground/50 mb-4', iconSizes[size])}>
                    {icon}
                </div>
            )}
            <h3 className={cn('font-semibold text-foreground', size === 'sm' ? 'text-sm' : 'text-base')}>
                {title}
            </h3>
            {description && (
                <p className={cn('text-muted-foreground mt-1 max-w-sm', size === 'sm' ? 'text-xs' : 'text-sm')}>
                    {description}
                </p>
            )}
            {action && (
                <Button
                    variant={action.variant || 'default'}
                    onClick={action.onClick}
                    className="mt-4"
                >
                    {action.label}
                </Button>
            )}
        </div>
    )
}
