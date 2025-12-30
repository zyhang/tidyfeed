'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Twitter, Instagram, Hash, Smartphone, Link2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app'

interface SocialAccount {
    platform: string
    platform_user_id: string
    platform_username: string | null
    display_name: string | null
    avatar_url: string | null
    last_synced_at: string | null
}

function getPlatformIcon(platform: string) {
    switch (platform) {
        case 'x':
            return <Twitter className="h-5 w-5" />
        case 'instagram':
            return <Instagram className="h-5 w-5" />
        default:
            return <Hash className="h-5 w-5" />
    }
}

function getPlatformName(platform: string) {
    switch (platform) {
        case 'x':
            return 'X (Twitter)'
        case 'instagram':
            return 'Instagram'
        case 'reddit':
            return 'Reddit'
        default:
            return platform
    }
}

export default function SettingsPage() {
    const router = useRouter()
    const [accounts, setAccounts] = useState<SocialAccount[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchAccounts() {
            try {
                const response = await fetch(`${API_URL}/api/auth/social-accounts`, {
                    credentials: 'include',
                })

                if (!response.ok) {
                    if (response.status === 401) {
                        router.push('/')
                        return
                    }
                    throw new Error('Failed to fetch accounts')
                }

                const data = await response.json()
                setAccounts(data.accounts || [])
            } catch (err) {
                console.error('Fetch error:', err)
                setError('Failed to load linked accounts.')
            } finally {
                setLoading(false)
            }
        }

        fetchAccounts()
    }, [router])

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold tracking-tight">Settings</h1>
                <p className="text-muted-foreground">
                    Manage your account settings and linked social accounts.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Link2 className="h-5 w-5 text-primary" />
                        <CardTitle>Linked Social Accounts</CardTitle>
                    </div>
                    <CardDescription className="flex items-start gap-2 mt-2 p-3 bg-muted/50 rounded-lg">
                        <Smartphone className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
                        <span>
                            <strong>Save on Mobile:</strong> Mention <code className="px-1 py-0.5 bg-muted rounded text-sm">@tidyfeed</code> in a reply to any post on mobile, and we'll instantly archive it to your TidyFeed library. This feature requires a linked account.
                        </span>
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="space-y-4">
                            {[1, 2].map((i) => (
                                <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                                    <Skeleton className="h-10 w-10 rounded-full" />
                                    <div className="space-y-2 flex-1">
                                        <Skeleton className="h-4 w-32" />
                                        <Skeleton className="h-3 w-24" />
                                    </div>
                                    <Skeleton className="h-6 w-20" />
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-destructive">
                            {error}
                        </div>
                    ) : accounts.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <Link2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                            <p className="font-medium">No accounts linked yet</p>
                            <p className="text-sm mt-1">
                                Use the TidyFeed extension to log in on X/Instagram to enable mobile saving.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {accounts.map((account) => (
                                <div
                                    key={`${account.platform}-${account.platform_user_id}`}
                                    className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                                >
                                    {/* Platform Icon */}
                                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-muted">
                                        {getPlatformIcon(account.platform)}
                                    </div>

                                    {/* Account Info */}
                                    <div className="flex items-center gap-3 flex-1 min-w-0">
                                        <Avatar className="h-10 w-10">
                                            <AvatarImage src={account.avatar_url || undefined} />
                                            <AvatarFallback>
                                                {account.display_name?.[0] || account.platform_username?.[0] || '?'}
                                            </AvatarFallback>
                                        </Avatar>
                                        <div className="min-w-0">
                                            <p className="font-medium truncate">
                                                {account.display_name || account.platform_username || 'Unknown'}
                                            </p>
                                            {account.platform_username && (
                                                <p className="text-sm text-muted-foreground truncate">
                                                    @{account.platform_username}
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    {/* Platform Name */}
                                    <div className="hidden sm:block text-sm text-muted-foreground">
                                        {getPlatformName(account.platform)}
                                    </div>

                                    {/* Account ID */}
                                    <div className="hidden md:block">
                                        <code className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                                            {account.platform_user_id}
                                        </code>
                                    </div>

                                    {/* Status */}
                                    <Badge variant="outline" className="text-green-600 border-green-600">
                                        Connected
                                    </Badge>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
