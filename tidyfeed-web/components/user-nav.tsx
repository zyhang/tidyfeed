"use client"

import * as React from "react"
import Link from "next/link"
import { LogOut, Settings, MoreHorizontal, Download, User } from "lucide-react"

import { cn } from "@/lib/utils"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuGroup,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app'

interface UserNavProps {
    isCollapsed: boolean
}

export function UserNav({ isCollapsed }: UserNavProps) {
    const [user, setUser] = React.useState<{ name: string; email: string; avatarUrl: string } | null>(null)
    const [loading, setLoading] = React.useState(true)

    const fetchUser = React.useCallback(() => {
        fetch(`${API_URL}/auth/me`, { credentials: 'include' })
            .then(res => {
                if (res.ok) return res.json()
                throw new Error('Failed to fetch user')
            })
            .then(data => {
                if (data.user) {
                    setUser(data.user)
                }
            })
            .catch(err => {
                console.error('Error fetching user:', err)
            })
            .finally(() => setLoading(false))
    }, [])

    React.useEffect(() => {
        fetchUser()
    }, [fetchUser])

    // Listen for profile updates from settings page
    React.useEffect(() => {
        const handleProfileUpdate = () => {
            fetchUser()
        }
        window.addEventListener('user-profile-updated', handleProfileUpdate)
        return () => {
            window.removeEventListener('user-profile-updated', handleProfileUpdate)
        }
    }, [fetchUser])

    if (loading) {
        return (
            <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-md transition-colors",
                isCollapsed && "justify-center px-2"
            )}>
                <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                {!isCollapsed && (
                    <div className="flex-1 space-y-1">
                        <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                    </div>
                )}
            </div>
        )
    }

    if (!user) {
        return null
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <button
                    className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors outline-none",
                        isCollapsed && "justify-center px-2"
                    )}
                >
                    <Avatar className="h-8 w-8">
                        <AvatarImage src={user.avatarUrl} alt={user.name} />
                        <AvatarFallback>{user.name?.charAt(0) || <User className="h-4 w-4" />}</AvatarFallback>
                    </Avatar>

                    {!isCollapsed && (
                        <>
                            <div className="flex-1 text-left truncate">
                                <p className="text-sm font-medium leading-none truncate">{user.name || 'User'}</p>
                                {/* <p className="text-xs text-muted-foreground truncate">{user.email}</p> */}
                            </div>
                            <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                        </>
                    )}
                </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                        <p className="text-sm font-medium leading-none">{user.name}</p>
                        <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/settings" className="w-full cursor-pointer">
                            <Settings className="mr-2 h-4 w-4" />
                            <span>Settings</span>
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                        onClick={() => window.open('https://chromewebstore.google.com/detail/tidyfeed/your-extension-id', '_blank')}
                        className="cursor-pointer"
                    >
                        <Download className="mr-2 h-4 w-4" />
                        <span>Install Extension</span>
                    </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                    className="text-red-600 focus:text-red-600 focus:bg-red-100 dark:focus:bg-red-900/10 cursor-pointer"
                    onClick={() => window.location.href = `${API_URL}/auth/logout`}
                >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Sign Out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
