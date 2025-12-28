"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { Home, Tag, Settings, ChevronLeft, ChevronRight, Menu } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

interface SidebarProps extends React.HTMLAttributes<HTMLElement> { }

export function Sidebar({ className, ...props }: SidebarProps) {
    const [isCollapsed, setIsCollapsed] = React.useState(false)
    const pathname = usePathname()

    const navItems = [
        { title: "My Feed", icon: Home, href: "/dashboard" },
        { title: "Tags", icon: Tag, href: "/dashboard/tags" },
        { title: "Settings", icon: Settings, href: "/dashboard/settings" },
    ]

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

            <nav className="flex-1 p-2 space-y-2">
                {navItems.map((item) => (
                    <Link
                        key={item.href}
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
                ))}
            </nav>
        </aside>
    )
}
