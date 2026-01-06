import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface PageContainerProps {
    children: ReactNode
    className?: string
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full'
}

const sizeClasses = {
    sm: 'max-w-2xl',
    md: 'max-w-4xl',
    lg: 'max-w-5xl',
    xl: 'max-w-7xl',
    full: 'max-w-full',
}

export function PageContainer({
    children,
    className,
    size = 'xl',
}: PageContainerProps) {
    return (
        <div className={cn('mx-auto h-full', sizeClasses[size], className)}>
            {children}
        </div>
    )
}
