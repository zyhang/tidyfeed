import { cn } from '@/lib/utils'
import { ReactNode } from 'react'

interface PageHeaderProps {
    title: string
    description?: string
    actions?: ReactNode
    className?: string
    breadcrumbs?: Array<{ label: string; href?: string }>
}

export function PageHeader({
    title,
    description,
    actions,
    className,
    breadcrumbs,
}: PageHeaderProps) {
    return (
        <div className={cn('flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between', className)}>
            <div className="space-y-1.5">
                {breadcrumbs && breadcrumbs.length > 0 && (
                    <nav className="flex items-center gap-1 text-sm text-muted-foreground">
                        {breadcrumbs.map((crumb, index) => (
                            <span key={index} className="flex items-center gap-1">
                                {crumb.href ? (
                                    <a
                                        href={crumb.href}
                                        className="hover:text-foreground transition-colors"
                                    >
                                        {crumb.label}
                                    </a>
                                ) : (
                                    <span>{crumb.label}</span>
                                )}
                                {index < breadcrumbs.length - 1 && (
                                    <span className="text-muted-foreground/50">/</span>
                                )}
                            </span>
                        ))}
                    </nav>
                )}
                <div className="space-y-0.5">
                    <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
                    {description && (
                        <p className="text-sm text-muted-foreground">{description}</p>
                    )}
                </div>
            </div>
            {actions && <div className="flex items-center gap-2">{actions}</div>}
        </div>
    )
}
