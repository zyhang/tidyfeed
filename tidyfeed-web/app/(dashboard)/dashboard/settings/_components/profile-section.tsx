'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, User } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app'

interface ProfileSectionProps {
    user: {
        id: string
        name: string
        email: string
        avatarUrl: string
    }
    onUpdate: (newName: string) => void
}

export function ProfileSection({ user, onUpdate }: ProfileSectionProps) {
    const [name, setName] = useState(user.name)
    const [isSaving, setIsSaving] = useState(false)

    const handleSave = async () => {
        if (!name.trim()) return
        if (name === user.name) return

        setIsSaving(true)
        try {
            const response = await fetch(`${API_URL}/api/user/profile`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name }),
            })

            if (!response.ok) throw new Error('Failed to update profile')

            toast.success('Profile updated')
            onUpdate(name)

            // Dispatch event to update UserNav component in sidebar
            window.dispatchEvent(new CustomEvent('user-profile-updated'))
        } catch (error) {
            console.error(error)
            toast.error('Failed to update profile')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle>Profile</CardTitle>
                    <CardDescription>
                        Manage your public profile information.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Avatar & Email */}
                    <div className="flex items-center gap-4">
                        <Avatar className="h-20 w-20">
                            <AvatarImage src={user.avatarUrl} />
                            <AvatarFallback><User className="h-10 w-10" /></AvatarFallback>
                        </Avatar>
                        <div className="space-y-1">
                            <h3 className="font-medium">{user.name}</h3>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                    </div>

                    {/* Nickname Input */}
                    <div className="space-y-2">
                        <Label htmlFor="name">Display Name</Label>
                        <div className="flex gap-2 max-w-md">
                            <Input
                                id="name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                placeholder="Enter your display name"
                            />
                            <Button
                                onClick={handleSave}
                                disabled={isSaving || name === user.name || !name.trim()}
                            >
                                {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Save
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Delete Account Zone */}
            <Card className="border-red-100 dark:border-red-900/20">
                <CardHeader>
                    <CardTitle className="text-red-600">Delete Account</CardTitle>
                    <CardDescription>
                        Permanently remove your account and all of its content.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-md text-sm text-red-600 mb-4">
                        Deleting your account will irreversibly delete all of your data, including your highlights, tags, notes, and more.
                    </div>
                    <Button variant="destructive" disabled>
                        Delete Account
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}
