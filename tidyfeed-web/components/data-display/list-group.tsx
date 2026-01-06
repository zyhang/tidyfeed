import { cn } from '@/lib/utils'
import { ReactNode } from 'react'
import { Card } from '@/components/ui/card'

interface ListGroupProps {
    children: ReactNode
    className?: string
    divided?: boolean
}

export function ListGroup({ children, className, divided = true }: ListGroupProps) {
    return (
        <Card className={className}>
            <div className={cn('divide-y', !divided && 'divide-y-0')}>
                {children}
            </div>
        </Card>
    )
}

interface ListItemProps {
    children: ReactNode
    className?: string
    onClick?: () => void
    disabled?: boolean
}

export function ListItem({ children, className, onClick, disabled }: ListItemProps) {
    return (
        <div
            className={cn(
                'px-6 py-4',
                onClick && !disabled && 'cursor-pointer hover:bg-muted/50 transition-colors',
                disabled && 'opacity-50 cursor-not-allowed',
                className
            )}
            onClick={disabled ? undefined : onClick}
        >
            {children}
        </div>
    )
}

interface ListHeaderProps {
    children: ReactNode
    className?: string
}

export function ListHeader({ children, className }: ListHeaderProps) {
    return (
        <div className={cn('px-6 py-3 bg-muted/50 border-b text-xs font-medium uppercase text-muted-foreground', className)}>
            {children}
        </div>
    )
}
