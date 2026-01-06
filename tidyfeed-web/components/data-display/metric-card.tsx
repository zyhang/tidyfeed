import { cn } from '@/lib/utils'
import { ReactNode } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

type Trend = 'up' | 'down' | 'neutral'

interface MetricCardProps {
    label: string
    value: string | number
    change?: number
    changeLabel?: string
    icon?: ReactNode
    trend?: Trend
    className?: string
    size?: 'sm' | 'md' | 'lg'
}

const trendIcons = {
    up: <TrendingUp className="h-3 w-3" />,
    down: <TrendingDown className="h-3 w-3" />,
    neutral: <Minus className="h-3 w-3" />,
}

const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-6',
}

const valueSizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
}

export function MetricCard({
    label,
    value,
    change,
    changeLabel,
    icon,
    trend,
    className,
    size = 'md',
}: MetricCardProps) {
    // Auto-detect trend if change is provided but trend is not
    const autoTrend: Trend =
        trend ?? (change !== undefined ? (change > 0 ? 'up' : change < 0 ? 'down' : 'neutral') : 'neutral')

    const changeColor =
        autoTrend === 'up' ? 'text-green-600 dark:text-green-400' :
        autoTrend === 'down' ? 'text-red-600 dark:text-red-400' :
        'text-muted-foreground'

    return (
        <Card className={className}>
            <CardContent className={sizeClasses[size]}>
                <div className="flex items-center justify-between">
                    <div className="space-y-1 flex-1">
                        <p className="text-sm text-muted-foreground">{label}</p>
                        <p className={cn('font-semibold tracking-tight', valueSizeClasses[size])}>
                            {value}
                        </p>
                        {(change !== undefined || changeLabel) && (
                            <div className="flex items-center gap-1 text-xs">
                                {autoTrend !== 'neutral' && (
                                    <span className={changeColor}>{trendIcons[autoTrend]}</span>
                                )}
                                {change !== undefined && (
                                    <span className={cn('font-medium', changeColor)}>
                                        {change > 0 ? '+' : ''}{change}%
                                    </span>
                                )}
                                {changeLabel && (
                                    <span className="text-muted-foreground">{changeLabel}</span>
                                )}
                            </div>
                        )}
                    </div>
                    {icon && (
                        <div className="text-muted-foreground/50">
                            {icon}
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    )
}

interface MetricGridProps {
    children: ReactNode
    className?: string
    cols?: 1 | 2 | 3 | 4
}

const colsClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 sm:grid-cols-2',
    3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4',
}

export function MetricGrid({ children, className, cols = 4 }: MetricGridProps) {
    return (
        <div className={cn('grid gap-4', colsClasses[cols], className)}>
            {children}
        </div>
    )
}
