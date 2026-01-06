'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog'
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { Hash, Plus, Edit2, Trash2 } from 'lucide-react'
import { toast, Toaster } from 'sonner'
import Link from 'next/link'

// Design System Components
import { PageHeader } from '@/components/layout'
import { PageLoading, EmptyState, PageSkeleton } from '@/components/feedback'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app'

interface Tag {
    id: number
    name: string
    created_at: string
    tweet_count: number
}

export default function TagsPage() {
    const [tags, setTags] = useState<Tag[]>([])
    const [loading, setLoading] = useState(true)
    const [newTagName, setNewTagName] = useState('')
    const [editingTag, setEditingTag] = useState<Tag | null>(null)
    const [editName, setEditName] = useState('')
    const [isCreateOpen, setIsCreateOpen] = useState(false)
    const [isEditOpen, setIsEditOpen] = useState(false)

    const fetchTags = async () => {
        try {
            const response = await fetch(`${API_URL}/api/tags`, {
                credentials: 'include',
            })
            if (!response.ok) throw new Error('Failed to fetch tags')
            const data = await response.json()
            setTags(data.tags || [])
        } catch (error) {
            console.error('Error fetching tags:', error)
            toast.error('Failed to load tags')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchTags()
    }, [])

    const handleCreateTag = async () => {
        if (!newTagName.trim()) return

        try {
            const response = await fetch(`${API_URL}/api/tags`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: newTagName.trim() }),
            })

            if (!response.ok) throw new Error('Failed to create tag')

            toast.success('Tag created successfully')
            setNewTagName('')
            setIsCreateOpen(false)
            fetchTags()
        } catch (error) {
            console.error('Error creating tag:', error)
            toast.error('Failed to create tag')
        }
    }

    const handleRenameTag = async () => {
        if (!editingTag || !editName.trim()) return

        try {
            const response = await fetch(`${API_URL}/api/tags/${editingTag.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name: editName.trim() }),
            })

            if (!response.ok) {
                const data = await response.json()
                throw new Error(data.error || 'Failed to rename tag')
            }

            toast.success('Tag renamed successfully')
            setEditingTag(null)
            setEditName('')
            setIsEditOpen(false)
            fetchTags()
        } catch (error: any) {
            console.error('Error renaming tag:', error)
            toast.error(error.message || 'Failed to rename tag')
        }
    }

    const handleDeleteTag = async (tagId: number) => {
        try {
            const response = await fetch(`${API_URL}/api/tags/${tagId}`, {
                method: 'DELETE',
                credentials: 'include',
            })

            if (!response.ok) throw new Error('Failed to delete tag')

            toast.success('Tag deleted successfully')
            setTags(prev => prev.filter(t => t.id !== tagId))
        } catch (error) {
            console.error('Error deleting tag:', error)
            toast.error('Failed to delete tag')
        }
    }

    const openEditDialog = (tag: Tag) => {
        setEditingTag(tag)
        setEditName(tag.name)
        setIsEditOpen(true)
    }

    if (loading) {
        return <PageSkeleton type="grid" items={6} />
    }

    return (
        <>
            <Toaster position="top-right" />

            {/* Page Header */}
            <PageHeader
                title="Tags"
                description="Organize your tweets with tags"
                actions={
                    <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="h-4 w-4 mr-2" />
                                New Tag
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Create New Tag</DialogTitle>
                                <DialogDescription>
                                    Enter a name for your new tag.
                                </DialogDescription>
                            </DialogHeader>
                            <Input
                                placeholder="Tag name"
                                value={newTagName}
                                onChange={(e) => setNewTagName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleCreateTag()
                                }}
                                autoFocus
                            />
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
                                    Cancel
                                </Button>
                                <Button onClick={handleCreateTag}>
                                    Create
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                }
            />

            {/* Empty State */}
            {tags.length === 0 && (
                <EmptyState
                    icon={<Hash />}
                    title="No tags yet"
                    description="Create your first tag to organize tweets!"
                    action={{
                        label: 'Create Tag',
                        onClick: () => setIsCreateOpen(true),
                    }}
                />
            )}

            {/* Tags Grid */}
            {tags.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tags.map((tag) => (
                        <Card key={tag.id} className="hover:shadow-md transition-shadow group">
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between gap-2">
                                    <Link
                                        href={`/dashboard/tags/${tag.id}`}
                                        className="flex items-center gap-2 hover:text-primary transition-colors flex-1 min-w-0"
                                    >
                                        <Hash className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                        <span className="font-medium truncate">{tag.name}</span>
                                        <Badge variant="secondary" className="ml-2 flex-shrink-0">
                                            {tag.tweet_count}
                                        </Badge>
                                    </Link>

                                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openEditDialog(tag)}
                                        >
                                            <Edit2 className="h-4 w-4" />
                                        </Button>

                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Tag</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        Are you sure you want to delete &quot;{tag.name}&quot;?
                                                        This will remove the tag from all associated tweets.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction
                                                        onClick={() => handleDeleteTag(tag.id)}
                                                        className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                    >
                                                        Delete
                                                    </AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Edit Tag Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Rename Tag</DialogTitle>
                        <DialogDescription>
                            Enter a new name for the tag.
                        </DialogDescription>
                    </DialogHeader>
                    <Input
                        placeholder="Tag name"
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') handleRenameTag()
                        }}
                        autoFocus
                    />
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                            Cancel
                        </Button>
                        <Button onClick={handleRenameTag}>
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    )
}
