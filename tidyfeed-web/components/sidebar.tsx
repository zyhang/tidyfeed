"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Tag, Settings, ChevronLeft, Menu, Hash, ChevronDown, ChevronRight, Loader2, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { StorageIndicator } from "./StorageIndicator"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app'

interface TagItem {
    id: number
    name: string
    tweet_count: number
}

interface SidebarProps extends React.HTMLAttributes<HTMLElement> { }

export function Sidebar({ className, ...props }: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = React.useState(false)
    const [tagsExpanded, setTagsExpanded] = React.useState(false)
    const [tags, setTags] = React.useState<TagItem[]>([])
    const [loadingTags, setLoadingTags] = React.useState(false)
    const pathname = usePathname()

    const navItems = [
        { title: "My Feed", icon: Home, href: "/dashboard" },
        { title: "Tags", icon: Tag, href: "/dashboard/tags", hasSubmenu: true },
        { title: "Settings", icon: Settings, href: "/dashboard/settings" },
    ]

    // Fetch tags when Tags menu is expanded
    React.useEffect(() => {
        if (tagsExpanded && tags.length === 0) {
            setLoadingTags(true)
            fetch(`${API_URL}/api/tags`, { credentials: 'include' })
                .then(res => res.json())
                .then(data => {
                    setTags(data.tags || [])
                })
                .catch(console.error)
                .finally(() => setLoadingTags(false))
        }
    }, [tagsExpanded, tags.length])

    return (
        <aside
            className={cn(
                "relative flex flex-col border-r bg-background transition-all duration-300",
                isCollapsed ? "w-[64px]" : "w-[240px]",
                className
            )}
            {...props}
        >
            <div className="flex items-center p-4 h-16 border-b">
                {!isCollapsed && <span className="text-xl font-bold ml-2">TidyFeed</span>}
                <Button
                    variant="ghost"
                    size="icon"
                    className={cn("ml-auto", isCollapsed && "mx-auto")}
                    onClick={() => setIsCollapsed(!isCollapsed)}
                >
                    {isCollapsed ? <Menu className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
            </div>

            <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <div key={item.href}>
                        {item.hasSubmenu ? (
                            <>
                                {/* Tags with expandable submenu */}
                                <button
                                    onClick={() => !isCollapsed && setTagsExpanded(!tagsExpanded)}
                                    className={cn(
                                        "w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
                                        pathname.startsWith('/dashboard/tags') && "bg-accent text-accent-foreground",
                                        isCollapsed && "justify-center px-2"
                                    )}
                                >
                                    <item.icon className="h-5 w-5" />
                                    {!isCollapsed && (
                                        <>
                                            <span className="flex-1 text-left">{item.title}</span>
                                            {tagsExpanded ? (
                                                <ChevronDown className="h-4 w-4" />
                                            ) : (
                                                <ChevronRight className="h-4 w-4" />
                                            )}
                                        </>
                                    )}
                                </button>

                                {/* Tags submenu */}
                                {!isCollapsed && tagsExpanded && (
                                    <div className="ml-4 mt-1 space-y-1">
                                        <Link
                                            href="/dashboard/tags"
                                            className={cn(
                                                "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                                                pathname === '/dashboard/tags' && "bg-accent/50"
                                            )}
                                        >
                                            <Tag className="h-4 w-4" />
                                            <span>All Tags</span>
                                        </Link>

                                        {loadingTags && (
                                            <div className="flex items-center gap-2 px-3 py-1.5">
                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                <span className="text-sm text-muted-foreground">Loading...</span>
                                            </div>
                                        )}

                                        {tags.map((tag) => (
                                            <Link
                                                key={tag.id}
                                                href={`/dashboard/tags/${tag.id}`}
                                                className={cn(
                                                    "flex items-center gap-2 px-3 py-1.5 rounded-md text-sm hover:bg-accent hover:text-accent-foreground transition-colors",
                                                    pathname === `/dashboard/tags/${tag.id}` && "bg-accent/50"
                                                )}
                                            >
                                                <Hash className="h-4 w-4 text-muted-foreground" />
                                                <span className="truncate flex-1">{tag.name}</span>
                                                <span className="text-xs text-muted-foreground">{tag.tweet_count}</span>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </>
                        ) : (
                            <Link
                                href={item.href}
                                className={cn(
                                    "flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors",
                                    pathname === item.href && "bg-accent text-accent-foreground",
                                    isCollapsed && "justify-center px-2"
                                )}
                            >
                                <item.icon className="h-5 w-5" />
                                {!isCollapsed && <span>{item.title}</span>}
                            </Link>
                        )}
                    </div>
                ))}
            </nav>

            <div className="border-t bg-background z-10">
                <StorageIndicator isCollapsed={isCollapsed} />

                <div className="p-2">
                    <a
                        href={`${API_URL}/auth/logout`}
                        className={cn(
                            "flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-muted-foreground",
                            isCollapsed && "justify-center px-2"
                        )}
                    >
                        <LogOut className="h-5 w-5" />
                        {!isCollapsed && <span>Sign Out</span>}
                    </a>
                </div>
            </div>
        </aside>
    )
}
