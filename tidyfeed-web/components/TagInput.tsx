'use client'

import * as React from 'react'
import { Check, ChevronsUpDown, Hash, Plus, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command'
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover'
import { toast } from 'sonner'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app'

interface Tag {
    id: number
    name: string
    tweet_count: number
}

interface TagInputProps {
    tweetId: string
    tweetData?: object
    onTagAdded?: (tagName: string) => void
}

export function TagInput({ tweetId, tweetData, onTagAdded }: TagInputProps) {
    const [open, setOpen] = React.useState(false)
    const [tags, setTags] = React.useState<Tag[]>([])
    const [loading, setLoading] = React.useState(false)
    const [submitting, setSubmitting] = React.useState(false)
    const [searchValue, setSearchValue] = React.useState('')

    // Fetch tags when popover opens
    React.useEffect(() => {
        if (open && tags.length === 0) {
            setLoading(true)
            fetch(`${API_URL}/api/tags`, { credentials: 'include' })
                .then(res => res.json())
                .then(data => setTags(data.tags || []))
                .catch(console.error)
                .finally(() => setLoading(false))
        }
    }, [open, tags.length])

    const handleSelectTag = async (tagName: string) => {
        if (submitting) return
        setSubmitting(true)

        try {
            const response = await fetch(`${API_URL}/api/tweets/tag`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({
                    tweet_id: tweetId,
                    tag_name: tagName,
                    tweet_data: tweetData,
                }),
            })

            if (!response.ok) throw new Error('Failed to tag tweet')

            toast.success(`Tagged with #${tagName}`)
            onTagAdded?.(tagName)
            setOpen(false)
            setSearchValue('')
        } catch (error) {
            console.error('Error tagging tweet:', error)
            toast.error('Failed to tag tweet')
        } finally {
            setSubmitting(false)
        }
    }

    const handleCreateAndTag = async () => {
        if (!searchValue.trim()) return
        await handleSelectTag(searchValue.trim())
    }

    const filteredTags = tags.filter(tag =>
        tag.name.toLowerCase().includes(searchValue.toLowerCase())
    )

    const showCreateOption = searchValue.trim() &&
        !tags.some(tag => tag.name.toLowerCase() === searchValue.toLowerCase())

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-muted-foreground hover:text-foreground"
                    disabled={submitting}
                >
                    {submitting ? (
                        <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                        <Hash className="h-3 w-3 mr-1" />
                    )}
                    Tag
                    <ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0" align="start">
                <Command>
                    <CommandInput
                        placeholder="Search or create tag..."
                        value={searchValue}
                        onValueChange={setSearchValue}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && showCreateOption) {
                                e.preventDefault()
                                handleCreateAndTag()
                            }
                        }}
                    />
                    <CommandList>
                        {loading && (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-4 w-4 animate-spin" />
                            </div>
                        )}

                        {!loading && filteredTags.length === 0 && !showCreateOption && (
                            <CommandEmpty>No tags found.</CommandEmpty>
                        )}

                        {showCreateOption && (
                            <CommandGroup heading="Create new">
                                <CommandItem
                                    onSelect={() => handleCreateAndTag()}
                                    className="cursor-pointer"
                                    value={`create-${searchValue}`} // Unique value to prevent filtering issues
                                >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Create &quot;{searchValue.trim()}&quot;
                                </CommandItem>
                            </CommandGroup>
                        )}

                        {filteredTags.length > 0 && (
                            <CommandGroup heading="Existing tags">
                                {filteredTags.map((tag) => (
                                    <CommandItem
                                        key={tag.id}
                                        value={tag.name}
                                        onSelect={() => handleSelectTag(tag.name)}
                                        className="cursor-pointer"
                                    >
                                        <Hash className="mr-2 h-4 w-4 text-muted-foreground" />
                                        {tag.name}
                                        <span className="ml-auto text-xs text-muted-foreground">
                                            {tag.tweet_count}
                                        </span>
                                    </CommandItem>
                                ))}
                            </CommandGroup>
                        )}
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
