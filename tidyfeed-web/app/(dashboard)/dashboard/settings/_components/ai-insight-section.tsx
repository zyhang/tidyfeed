'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Sparkles, Loader2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app'

interface AIInsightSectionProps {
    customPrompt: string
    onUpdate: (newPrompt: string) => void
}

export function AIInsightSection({ customPrompt, onUpdate }: AIInsightSectionProps) {
    const [prompt, setPrompt] = useState(customPrompt || '')
    const [isSaving, setIsSaving] = useState(false)

    const handleSave = async () => {
        if (prompt === customPrompt) return

        setIsSaving(true)
        try {
            const response = await fetch(`${API_URL}/api/user/settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ customAiPrompt: prompt }),
            })

            if (!response.ok) throw new Error('Failed to update settings')

            toast.success('AI Prompt updated')
            onUpdate(prompt)
        } catch (error) {
            console.error(error)
            toast.error('Failed to update prompt')
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-purple-500" />
                    <CardTitle>AI Insight Configuration</CardTitle>
                </div>
                <CardDescription>
                    Customize the prompt used by AI to summarize your saved tweets.
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <Textarea
                    placeholder="Enter your custom prompt here... (e.g., 'Summarize this tweet in bullet points, highlighting key takeaways.')"
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="min-h-[150px] font-mono text-sm"
                />
                <div className="flex justify-end">
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || prompt === customPrompt}
                    >
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Prompt
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}
