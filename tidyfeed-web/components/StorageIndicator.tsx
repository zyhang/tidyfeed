"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { AlertCircle } from "lucide-react"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app'

interface StorageIndicatorProps extends React.HTMLAttributes<HTMLDivElement> {
    isCollapsed?: boolean
}

function formatBytes(bytes: number, decimals = 1) {
    if (!+bytes) return '0 B'
    const k = 1024
    const dm = decimals < 0 ? 0 : decimals
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`
}

export function StorageIndicator({ isCollapsed, className, ...props }: StorageIndicatorProps) {
    const [usage, setUsage] = React.useState(0)
    const [limit, setLimit] = React.useState(1073741824) // Default 1GB
    const [loading, setLoading] = React.useState(true)

    const fetchUsage = React.useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/api/downloads/usage`, {
                credentials: 'include'
            })
            if (res.ok) {
                const data = await res.json()
                setUsage(data.usage || 0)
                if (data.limit) setLimit(data.limit)
            }
        } catch (error) {
            console.error("Failed to fetch storage usage", error)
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchUsage()
    }, [fetchUsage])

    // Listen for refresh events
    React.useEffect(() => {
        const handleRefresh = () => {
            fetchUsage()
        }
        window.addEventListener('storage-usage-refresh', handleRefresh)
        return () => {
            window.removeEventListener('storage-usage-refresh', handleRefresh)
        }
    }, [fetchUsage])

    const percentage = Math.min(100, Math.max(0, (usage / limit) * 100))

    // Color logic
    let colorClass = "bg-primary/80"
    if (percentage >= 100) colorClass = "bg-destructive shadow-[0_0_8px_rgba(239,68,68,0.5)]"
    else if (percentage > 90) colorClass = "bg-red-500/90"
    else if (percentage > 75) colorClass = "bg-amber-500/90"

    if (loading) return null

    // Tooltip content
    const tooltipText = `${formatBytes(usage)} used of ${formatBytes(limit)}`

    if (isCollapsed) {
        return (
            <TooltipProvider>
                <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                        <div className={cn("px-2 py-3 flex justify-center", className)} {...props}>
                            <div
                                className={cn("w-2 h-2 rounded-full transition-colors duration-500", colorClass)}
                            />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                        <p>{tooltipText}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        )
    }

    return (
        <div className={cn("px-4 py-3", className)} {...props}>
            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-semibold tracking-widest mb-2 select-none">
                <span className="flex items-center gap-1.5 ">
                    STORAGE
                    {percentage >= 100 && <AlertCircle className="w-3 h-3 text-destructive animate-pulse" />}
                </span>
                <span className="text-[10px] font-mono opacity-80">
                    {formatBytes(usage)} / {formatBytes(limit)}
                </span>
            </div>

            <TooltipProvider>
                <Tooltip delayDuration={100}>
                    <TooltipTrigger asChild>
                        <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden cursor-help">
                            <div
                                className={cn("h-full transition-all duration-700 ease-out rounded-full", colorClass)}
                                style={{ width: `${percentage}%` }}
                            />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs font-mono">
                        <p>{tooltipText}</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
        </div>
    )
}
