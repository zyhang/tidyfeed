"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Settings, LogOut, User } from "lucide-react"

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app'

interface UserData {
    id: string
    name: string
    email: string
    avatarUrl: string
}

export function UserNav() {
    const router = useRouter()
    const [user, setUser] = React.useState<UserData | null>(null)
    const [loading, setLoading] = React.useState(true)

    const fetchUser = React.useCallback(async () => {
        try {
            const response = await fetch(`${API_URL}/auth/me`, {
                credentials: 'include',
            })
            if (response.ok) {
                const data = await response.json()
                setUser(data.user)
            }
        } catch (error) {
            console.error('Failed to fetch user:', error)
        } finally {
            setLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchUser()
    }, [fetchUser])

    // Listen for profile updates
    React.useEffect(() => {
        const handleProfileUpdate = () => {
            fetchUser()
        }
        window.addEventListener('user-profile-updated', handleProfileUpdate)
        return () => {
            window.removeEventListener('user-profile-updated', handleProfileUpdate)
        }
    }, [fetchUser])

    const handleLogout = async () => {
        try {
            await fetch(`${API_URL}/auth/logout`, {
                method: 'POST',
                credentials: 'include',
            })
            router.push('/login')
        } catch (error) {
            console.error('Failed to logout:', error)
        }
    }

    if (loading) {
        return (
            <div className="flex items-center gap-3 p-3">
                <div className="h-9 w-9 rounded-full bg-muted animate-pulse" />
                <div className="flex-1">
                    <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                </div>
            </div>
        )
    }

    if (!user) {
        return (
            <div className="p-3">
                <Link href="/login">
                    <Button variant="ghost" className="w-full justify-start">
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign In
                    </Button>
                </Link>
            </div>
        )
    }

    const initials = user.name
        ? user.name
              .split(' ')
              .map((n) => n[0])
              .join('')
              .toUpperCase()
              .slice(0, 2)
        : 'U'

    return (
        <div className="p-3">
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button
                        variant="ghost"
                        className="w-full justify-start gap-3 px-3 h-auto py-2"
                    >
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={user.avatarUrl} alt={user.name} />
                            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col items-start text-sm">
                            <span className="font-medium truncate max-w-[140px]">{user.name || 'User'}</span>
                            <span className="text-muted-foreground text-xs truncate max-w-[140px]">
                                {user.email}
                            </span>
                        </div>
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel>
                        <div className="flex flex-col">
                            <span>{user.name || 'User'}</span>
                            <span className="text-xs font-normal text-muted-foreground">
                                {user.email}
                            </span>
                        </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                        <Link href="/dashboard/settings" className="cursor-pointer">
                            <Settings className="h-4 w-4 mr-2" />
                            Settings
                        </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                        className="cursor-pointer text-destructive focus:text-destructive"
                        onClick={handleLogout}
                    >
                        <LogOut className="h-4 w-4 mr-2" />
                        Sign out
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </div>
    )
}
