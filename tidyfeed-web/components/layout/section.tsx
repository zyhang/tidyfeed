import { cn } from '@/lib/utils'
import { ReactNode, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface SectionProps {
    children: ReactNode
    className?: string
    title?: ReactNode
    description?: ReactNode
    actions?: ReactNode
    collapsible?: boolean
    defaultCollapsed?: boolean
    noPadding?: boolean
}

export function Section({
    children,
    className,
    title,
    description,
    actions,
    collapsible,
    defaultCollapsed = false,
    noPadding = false,
}: SectionProps) {
    const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed)

    return (
        <div className={cn('rounded-lg border bg-card', className)}>
            {(title || description || actions) && (
                <div className="flex items-center justify-between border-b px-6 py-4">
                    <div className="space-y-1 flex-1">
                        {title && (
                            typeof title === 'string' ? (
                                <div className="flex items-center gap-2">
                                    {collapsible && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => setIsCollapsed(!isCollapsed)}
                                        >
                                            <ChevronDown
                                                className={cn(
                                                    'h-4 w-4 transition-transform',
                                                    isCollapsed && '-rotate-90'
                                                )}
                                            />
                                        </Button>
                                    )}
                                    <h2 className="text-lg font-semibold">{title}</h2>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2">
                                    {collapsible && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6"
                                            onClick={() => setIsCollapsed(!isCollapsed)}
                                        >
                                            <ChevronDown
                                                className={cn(
                                                    'h-4 w-4 transition-transform',
                                                    isCollapsed && '-rotate-90'
                                                )}
                                            />
                                        </Button>
                                    )}
                                    {title}
                                </div>
                            )
                        )}
                        {description && (
                            typeof description === 'string' ? (
                                <p className="text-sm text-muted-foreground">{description}</p>
                            ) : (
                                description
                            )
                        )}
                    </div>
                    {actions && <div className="flex items-center gap-2">{actions}</div>}
                </div>
            )}
            {!isCollapsed && (
                <div className={cn(noPadding ? '' : 'p-6')}>{children}</div>
            )}
        </div>
    )
}
