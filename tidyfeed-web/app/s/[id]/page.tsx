'use client';

export const runtime = 'edge';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import {
    ArrowLeft, Sparkles, MessageSquare, Trash2, Pencil, Copy, Check, ChevronRight,
    Loader2, X, Highlighter, BookOpen, FileText, Zap, Clock
} from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { toast } from 'sonner';

// ============================================================================
// TYPES
// ============================================================================

interface Note {
    id: number;
    tweet_id: string;
    user_id: string;
    selected_text: string;
    note_content: string;
    text_offset_start: number | null;
    text_offset_end: number | null;
    created_at: string;
    updated_at: string;
    highlight_color?: 'yellow' | 'purple' | 'blue' | 'green';
}

interface SelectionInfo {
    text: string;
    offsetStart: number;
    offsetEnd: number;
    rect: DOMRect;
}

type TabType = 'ai' | 'notes';

// Agent execution step types
interface AgentStep {
    id: string;
    label: string;
    status: 'pending' | 'running' | 'completed' | 'error';
}

// ============================================================================
// TABS COMPONENT
// ============================================================================

interface TabsProps {
    value: TabType;
    onChange: (value: TabType) => void;
    children: React.ReactNode;
}

function Tabs({ value, onChange, children }: TabsProps) {
    return (
        <div className="flex flex-col h-full">
            {React.Children.map(children, child => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child as React.ReactElement<any>, { value, onChange });
                }
                return child;
            })}
        </div>
    );
}

interface TabsListProps {
    value: TabType;
    onChange: (value: TabType) => void;
    children: React.ReactNode;
}

function TabsList({ value, onChange, children }: TabsListProps) {
    return (
        <div className="flex border-b border-border/40 bg-muted/30">
            {React.Children.map(children, child => {
                if (React.isValidElement(child)) {
                    return React.cloneElement(child as React.ReactElement<any>, { value, onChange });
                }
                return child;
            })}
        </div>
    );
}

interface TabsTriggerProps {
    value: TabType;
    onChange: (value: TabType) => void;
    children: React.ReactNode;
    icon?: React.ReactNode;
    count?: number;
}

function TabsTrigger({ value, onChange, children, icon, count }: TabsTriggerProps) {
    const isActive = (childValue: TabType) => value === childValue;

    return (
        <button
            onClick={() => onChange(children as TabType)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium transition-colors relative ${
                isActive(children as TabType)
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
            }`}
        >
            {icon}
            <span>{children}</span>
            {count !== undefined && count > 0 && (
                <Badge variant="secondary" className="ml-1 h-5 min-w-5 px-1.5 text-xs">
                    {count}
                </Badge>
            )}
            {isActive(children as TabType) && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-foreground" />
            )}
        </button>
    );
}

interface TabsContentProps {
    value: TabType;
    currentValue: TabType;
    children: React.ReactNode;
    className?: string;
}

function TabsContent({ value, currentValue, children, className = '' }: TabsContentProps) {
    if (value !== currentValue) return null;
    return (
        <div className={`flex-1 overflow-y-auto ${className}`}>
            {children}
        </div>
    );
}

// ============================================================================
// SCROLL AREA COMPONENT (simplified)
// ============================================================================

interface ScrollAreaProps {
    children: React.ReactNode;
    className?: string;
}

function ScrollArea({ children, className = '' }: ScrollAreaProps) {
    return (
        <div className={`overflow-y-auto ${className}`}>
            {children}
        </div>
    );
}

// ============================================================================
// SEPARATOR COMPONENT
// ============================================================================

function Separator({ className = '' }: { className?: string }) {
    return <div className={`h-px bg-border/40 ${className}`} />;
}

// ============================================================================
// HIGHLIGHT NOTE CARD COMPONENT
// ============================================================================

const highlightColors = {
    yellow: 'bg-yellow-100 border-l-yellow-400',
    purple: 'bg-purple-100 border-l-purple-400',
    blue: 'bg-blue-100 border-l-blue-400',
    green: 'bg-green-100 border-l-green-400',
};

function HighlightNoteCard({
    note,
    isOwner,
    onEdit,
    onDelete,
    onJumpToContext
}: {
    note: Note;
    isOwner: boolean;
    onEdit: (id: number, content: string) => Promise<void>;
    onDelete: (id: number) => void;
    onJumpToContext: (note: Note) => void;
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(note.note_content);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!editContent.trim() || editContent === note.note_content) {
            setIsEditing(false);
            return;
        }
        setIsSaving(true);
        try {
            await onEdit(note.id, editContent.trim());
            setIsEditing(false);
        } catch {
            setEditContent(note.note_content);
        } finally {
            setIsSaving(false);
        }
    };

    const colorClass = note.highlight_color
        ? highlightColors[note.highlight_color]
        : highlightColors.yellow;

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diff = now.getTime() - date.getTime();
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);
        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <Card className="overflow-hidden border-border/40 shadow-sm">
            {/* Quote section with highlight */}
            <button
                onClick={() => onJumpToContext(note)}
                className="w-full text-left p-4 pb-3 border-b border-border/40 hover:bg-muted/30 transition-colors group"
            >
                <div className={`pl-3 py-2 rounded-r-md ${colorClass}`}>
                    <p className="text-sm text-foreground/80 leading-relaxed line-clamp-3 font-medium">
                        "{note.selected_text}"
                    </p>
                </div>
                <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">
                    <ChevronRight className="h-3 w-3" />
                    <span>Jump to context</span>
                </div>
            </button>

            {/* Note content */}
            <CardContent className="p-4 pt-3">
                {isEditing ? (
                    <div className="space-y-3">
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSave();
                                }
                                if (e.key === 'Escape') {
                                    setIsEditing(false);
                                    setEditContent(note.note_content);
                                }
                            }}
                            autoFocus
                            rows={3}
                            className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring/50 placeholder:text-muted-foreground"
                            placeholder="Add your thoughts..."
                        />
                        <div className="flex items-center justify-end gap-2">
                            <Button
                                variant="ghost" size="sm"
                                onClick={() => {
                                    setIsEditing(false);
                                    setEditContent(note.note_content);
                                }}
                                disabled={isSaving}
                            >
                                Cancel
                            </Button>
                            <Button
                                size="sm"
                                onClick={handleSave}
                                disabled={isSaving || !editContent.trim()}
                            >
                                {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : null}
                                Save
                            </Button>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                        {note.note_content}
                    </p>
                )}
            </CardContent>

            {/* Footer */}
            <div className="px-4 py-2 flex items-center justify-between border-t border-border/40 bg-muted/20">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>{formatTime(note.created_at)}</span>
                </div>

                {isOwner && !isEditing && (
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => setIsEditing(true)}
                            title="Edit note"
                        >
                            <Pencil className="h-3 w-3" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() => onDelete(note.id)}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            title="Delete note"
                        >
                            <Trash2 className="h-3 w-3" />
                        </Button>
                    </div>
                )}
            </div>
        </Card>
    );
}

// ============================================================================
// AGENT EXECUTION VISUAL COMPONENT
// ============================================================================

function AgentExecutionCard({
    steps,
    title,
    description
}: {
    steps: AgentStep[];
    title: string;
    description?: string;
}) {
    return (
        <Card className="border-border/40 bg-muted/30">
            <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Zap className="h-4 w-4 text-amber-500" />
                    {title}
                </CardTitle>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                )}
            </CardHeader>
            <CardContent className="space-y-2">
                {steps.map((step) => (
                    <div
                        key={step.id}
                        className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                            step.status === 'completed'
                                ? 'bg-green-50 border-green-200 dark:bg-green-950/20 dark:border-green-900'
                                : step.status === 'running'
                                ? 'bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900'
                                : step.status === 'error'
                                ? 'bg-red-50 border-red-200 dark:bg-red-950/20 dark:border-red-900'
                                : 'bg-background border-border/40'
                        }`}
                    >
                        {step.status === 'completed' ? (
                            <div className="h-5 w-5 rounded-full bg-green-500 flex items-center justify-center flex-shrink-0">
                                <Check className="h-3 w-3 text-white" />
                            </div>
                        ) : step.status === 'running' ? (
                            <div className="h-5 w-5 rounded-full bg-amber-500 flex items-center justify-center flex-shrink-0">
                                <Loader2 className="h-3 w-3 text-white animate-spin" />
                            </div>
                        ) : step.status === 'error' ? (
                            <div className="h-5 w-5 rounded-full bg-red-500 flex items-center justify-center flex-shrink-0">
                                <X className="h-3 w-3 text-white" />
                            </div>
                        ) : (
                            <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                                <div className="h-2 w-2 rounded-full bg-muted-foreground/30" />
                            </div>
                        )}
                        <span className={`text-sm font-mono ${
                            step.status === 'completed' ? 'text-green-700 dark:text-green-400' :
                            step.status === 'running' ? 'text-amber-700 dark:text-amber-400' :
                            step.status === 'error' ? 'text-red-700 dark:text-red-400' :
                            'text-muted-foreground'
                        }`}>
                            {step.label}
                        </span>
                    </div>
                ))}
            </CardContent>
        </Card>
    );
}

// ============================================================================
// SNAPSHOT CONTENT COMPONENT
// ============================================================================

const SnapshotContent = React.memo(
    React.forwardRef<HTMLDivElement, { html: string }>(
        ({ html }, ref) => (
            <div
                ref={ref}
                className="prose prose-slate max-w-none"
                dangerouslySetInnerHTML={{ __html: html }}
            />
        )
    )
);
SnapshotContent.displayName = 'SnapshotContent';

// ============================================================================
// MAIN PAGE
// ============================================================================

export default function SnapshotViewerPage() {
    const params = useParams();
    const router = useRouter();
    const tweetId = params.id as string;
    const contentRef = useRef<HTMLDivElement>(null);

    const [snapshotHtml, setSnapshotHtml] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [redirectToDashboard, setRedirectToDashboard] = useState(false);

    const [showPanel, setShowPanel] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('notes');

    const [summary, setSummary] = useState<string | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const copyResetRef = useRef<number | null>(null);

    // Agent steps for AI generation
    const [agentSteps, setAgentSteps] = useState<AgentStep[]>([
        { id: '1', label: 'Analyzing content structure...', status: 'pending' },
        { id: '2', label: 'Extracting key information...', status: 'pending' },
        { id: '3', label: 'Generating summary...', status: 'pending' },
    ]);

    const [notes, setNotes] = useState<Note[]>([]);
    const [notesLoading, setNotesLoading] = useState(false);
    const [isOwner, setIsOwner] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const [selection, setSelection] = useState<SelectionInfo | null>(null);
    const [showNoteInput, setShowNoteInput] = useState(false);
    const [noteInput, setNoteInput] = useState('');
    const [isCreatingNote, setIsCreatingNote] = useState(false);

    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app';

    const handleCopy = async (key: string, text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedKey(key);
            toast.success('Copied to clipboard');
            if (copyResetRef.current) {
                window.clearTimeout(copyResetRef.current);
            }
            copyResetRef.current = window.setTimeout(() => {
                setCopiedKey(null);
                copyResetRef.current = null;
            }, 2000);
        } catch (err) {
            toast.error('Copy failed');
        }
    };

    useEffect(() => {
        if (!tweetId) return;

        const fetchSnapshot = async () => {
            try {
                setLoading(true);
                setError(null);
                setRedirectToDashboard(false);
                const response = await fetch(`/api/s/${tweetId}`);
                if (response.ok) {
                    const html = await response.text();
                    setSnapshotHtml(html);
                } else {
                    if (response.status === 404) {
                        setError('Snapshot not found. Redirecting to dashboard...');
                        setRedirectToDashboard(true);
                    } else {
                        setError('Failed to load snapshot');
                    }
                }
            } catch (err) {
                setError('Error loading snapshot');
            } finally {
                setLoading(false);
            }
        };

        fetchSnapshot();
    }, [tweetId]);

    useEffect(() => {
        return () => {
            if (copyResetRef.current) {
                window.clearTimeout(copyResetRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!redirectToDashboard) return;
        const timeout = window.setTimeout(() => {
            router.push('/dashboard');
        }, 2000);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [redirectToDashboard, router]);

    useEffect(() => {
        if (!tweetId) return;
        fetchNotes();
    }, [tweetId]);

    const fetchNotes = async () => {
        setNotesLoading(true);
        try {
            const response = await fetch(`${apiUrl}/api/notes/${tweetId}`, {
                credentials: 'include',
            });
            if (response.ok) {
                const data = await response.json();
                setNotes(data.notes || []);
                setIsOwner(data.isOwner || false);
                setCurrentUserId(data.userId || null);
            }
        } catch (err) {
            console.error('Failed to fetch notes:', err);
        } finally {
            setNotesLoading(false);
        }
    };

    const handleGenerateSummary = async () => {
        if (summaryLoading) return;

        setSummaryLoading(true);
        setSummaryError(null);
        setShowPanel(true);
        setActiveTab('ai');

        // Reset and start agent steps
        setAgentSteps([
            { id: '1', label: 'Analyzing content structure...', status: 'pending' },
            { id: '2', label: 'Extracting key information...', status: 'pending' },
            { id: '3', label: 'Generating summary...', status: 'pending' },
        ]);

        // Simulate agent execution steps
        setTimeout(() => {
            setAgentSteps(prev => prev.map(s =>
                s.id === '1' ? { ...s, status: 'running' as const } : s
            ));
        }, 300);

        setTimeout(() => {
            setAgentSteps(prev => prev.map(s =>
                s.id === '1' ? { ...s, status: 'completed' as const } :
                s.id === '2' ? { ...s, status: 'running' as const } : s
            ));
        }, 1500);

        setTimeout(() => {
            setAgentSteps(prev => prev.map(s =>
                s.id === '2' ? { ...s, status: 'completed' as const } :
                s.id === '3' ? { ...s, status: 'running' as const } : s
            ));
        }, 3000);

        try {
            const response = await fetch(`${apiUrl}/api/ai/summarize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({ tweet_id: tweetId }),
            });

            if (response.ok) {
                const data = await response.json();
                setSummary(data.summary);
                setAgentSteps(prev => prev.map(s => ({ ...s, status: 'completed' as const })));
            } else if (response.status === 401) {
                router.push('/login');
            } else {
                const data = await response.json();
                setSummaryError(data.error || 'Failed to generate summary');
                setAgentSteps(prev => prev.map(s => ({ ...s, status: 'error' as const })));
            }
        } catch (err) {
            setSummaryError('Error connecting to AI service');
            setAgentSteps(prev => prev.map(s => ({ ...s, status: 'error' as const })));
        } finally {
            setSummaryLoading(false);
        }
    };

    const handleMouseUp = useCallback((e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('.selection-toolbar') || target.closest('.sidebar-panel')) {
            return;
        }

        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.toString().trim()) {
            setSelection(null);
            setShowNoteInput(false);
            return;
        }

        const text = sel.toString().trim();
        if (text.length < 3) {
            setSelection(null);
            return;
        }

        const range = sel.getRangeAt(0);
        const container = contentRef.current;
        if (!container || !container.contains(range.commonAncestorContainer)) {
            setSelection(null);
            return;
        }

        const rect = range.getBoundingClientRect();
        const rawText = range.toString();
        const preRange = range.cloneRange();
        preRange.selectNodeContents(container);
        preRange.setEnd(range.startContainer, range.startOffset);
        const offsetStart = preRange.toString().length;
        const offsetEnd = offsetStart + rawText.length;

        setSelection({
            text,
            offsetStart,
            offsetEnd,
            rect,
        });
        setShowNoteInput(false);
        setNoteInput('');
    }, []);

    useEffect(() => {
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseUp]);

    const handleCreateNote = async () => {
        if (!selection || !noteInput.trim() || isCreatingNote) return;

        setIsCreatingNote(true);
        try {
            const response = await fetch(`${apiUrl}/api/notes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify({
                    tweet_id: tweetId,
                    selected_text: selection.text,
                    note_content: noteInput.trim(),
                    text_offset_start: selection.offsetStart,
                    text_offset_end: selection.offsetEnd,
                }),
            });

            if (response.ok) {
                const data = await response.json();
                setNotes(prev => [data.note, ...prev]);
                setSelection(null);
                setShowNoteInput(false);
                setNoteInput('');
                setShowPanel(true);
                setActiveTab('notes');
                window.getSelection()?.removeAllRanges();
                fetchNotes();
                toast.success('Note added successfully');
            } else if (response.status === 401) {
                router.push('/login');
            }
        } catch (err) {
            console.error('Failed to create note:', err);
            toast.error('Failed to add note');
        } finally {
            setIsCreatingNote(false);
        }
    };

    const handleEditNote = async (id: number, content: string) => {
        const response = await fetch(`${apiUrl}/api/notes/${id}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ note_content: content }),
        });

        if (response.ok) {
            const data = await response.json();
            setNotes(prev => prev.map(n => n.id === id ? data.note : n));
            toast.success('Note updated');
        } else {
            throw new Error('Failed to edit note');
        }
    };

    const handleDeleteNote = (id: number) => {
        setNoteToDelete(id);
        setDeleteDialogOpen(true);
    };

    const confirmDelete = async () => {
        if (!noteToDelete) return;

        setIsDeleting(true);
        try {
            const response = await fetch(`${apiUrl}/api/notes/${noteToDelete}`, {
                method: 'DELETE',
                credentials: 'include',
            });

            if (response.ok) {
                setNotes(prev => prev.filter(n => n.id !== noteToDelete));
                setDeleteDialogOpen(false);
                setNoteToDelete(null);
                toast.success('Note deleted');
            }
        } catch (err) {
            console.error('Failed to delete note:', err);
            toast.error('Failed to delete note');
        } finally {
            setIsDeleting(false);
        }
    };

    const handleJumpToContext = (note: Note) => {
        // Scroll to highlighted text
        const noteElement = document.querySelector(`[data-note-id="${note.id}"]`);
        if (noteElement) {
            noteElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
            noteElement.classList.add('ring-2', 'ring-primary');
            setTimeout(() => {
                noteElement.classList.remove('ring-2', 'ring-primary');
            }, 2000);
        }
    };

    const highlightedHtml = useMemo(() => {
        if (!snapshotHtml) return snapshotHtml;

        const parser = new DOMParser();
        const doc = parser.parseFromString(snapshotHtml, 'text/html');
        const body = doc.body;

        const buildTextIndex = () => {
            const walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT, null);
            const textNodes: { node: Text; start: number; end: number }[] = [];
            let node: Node | null;
            let offset = 0;
            while ((node = walker.nextNode())) {
                const textNode = node as Text;
                const len = (textNode.textContent || '').length;
                textNodes.push({ node: textNode, start: offset, end: offset + len });
                offset += len;
            }
            return { textNodes, totalLength: offset };
        };

        const { textNodes, totalLength } = buildTextIndex();

        const resolveRange = (note: Note) => {
            const start = note.text_offset_start;
            const end = note.text_offset_end;
            if (typeof start === 'number' && typeof end === 'number' && end > start && end <= totalLength) {
                return { start, end };
            }

            if (!note.selected_text) return null;
            const fullText = textNodes.map(t => t.node.textContent || '').join('');
            const pos = fullText.indexOf(note.selected_text);
            if (pos === -1) return null;
            return { start: pos, end: pos + note.selected_text.length };
        };

        const sortedNotes = [...notes]
            .map((note) => {
                const range = resolveRange(note);
                return range ? { note, range } : null;
            })
            .filter((item): item is { note: Note; range: { start: number; end: number } } => !!item)
            .sort((a, b) => b.range.start - a.range.start);

        const applyHighlight = (note: Note, startPos: number, endPos: number) => {
            const currentWalker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT, null);
            const currentNodes: { node: Text; start: number; end: number }[] = [];
            let n: Node | null;
            let off = 0;
            while ((n = currentWalker.nextNode())) {
                const textNode = n as Text;
                const len = (textNode.textContent || '').length;
                currentNodes.push({ node: textNode, start: off, end: off + len });
                off += len;
            }

            const nodesToProcess = currentNodes.filter(
                ({ start, end }) => end > startPos && start < endPos
            );

            for (const { node: textNode, start: nodeStart, end: nodeEnd } of nodesToProcess) {
                const nodeText = textNode.textContent || '';
                const localStart = Math.max(0, startPos - nodeStart);
                const localEnd = Math.min(nodeText.length, endPos - nodeStart);

                if (localStart >= localEnd) continue;

                const before = nodeText.slice(0, localStart);
                const highlighted = nodeText.slice(localStart, localEnd);
                const after = nodeText.slice(localEnd);

                const wrapper = doc.createElement('span');
                const colorClass = note.highlight_color
                    ? highlightColors[note.highlight_color].split(' ')[0]
                    : 'bg-yellow-200';
                wrapper.className = `${colorClass} rounded-sm px-0.5 cursor-pointer transition-colors hover:opacity-80`;
                wrapper.setAttribute('data-note-id', note.id.toString());
                wrapper.textContent = highlighted;

                const parent = textNode.parentNode;
                if (parent) {
                    const fragment = doc.createDocumentFragment();
                    if (before) fragment.appendChild(doc.createTextNode(before));
                    fragment.appendChild(wrapper);
                    if (after) fragment.appendChild(doc.createTextNode(after));
                    parent.replaceChild(fragment, textNode);
                }
            }
        };

        for (const { note, range } of sortedNotes) {
            applyHighlight(note, range.start, range.end);
        }

        return doc.documentElement.outerHTML;
    }, [snapshotHtml, notes]);

    // ============================================================================
    // LOADING & ERROR STATES
    // ============================================================================

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                    <p className="text-sm text-muted-foreground">Loading snapshot...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="h-screen flex items-center justify-center bg-background">
                <Card className="max-w-md">
                    <CardContent className="pt-6 text-center">
                        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                            <X className="h-6 w-6 text-destructive" />
                        </div>
                        <h3 className="font-semibold mb-2">Failed to Load</h3>
                        <p className="text-sm text-muted-foreground mb-4">{error}</p>
                        <Button
                            onClick={() => redirectToDashboard ? router.push('/dashboard') : router.back()}
                            variant="outline"
                        >
                            {redirectToDashboard ? 'Go to Dashboard' : 'Go Back'}
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ============================================================================
    // RENDER
    // ============================================================================

    return (
        <div className="h-screen flex flex-col bg-background">
            {/* Header */}
            <header className="h-14 border-b border-border/40 bg-background flex items-center px-4 flex-shrink-0">
                <div className="flex items-center gap-3">
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => router.back()}
                    >
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground">TidyFeed</span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Snapshot</span>
                    </div>
                </div>

                <div className="ml-auto flex items-center gap-2">
                    <Button
                        variant={showPanel ? 'secondary' : 'default'}
                        size="sm"
                        onClick={() => setShowPanel(!showPanel)}
                    >
                        {showPanel ? (
                            <>
                                <X className="h-4 w-4 mr-1" />
                                Hide Panel
                            </>
                        ) : (
                            <>
                                <Sparkles className="h-4 w-4 mr-1" />
                                AI & Notes
                            </>
                        )}
                    </Button>
                </div>
            </header>

            {/* Main Content Area - Split Pane */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel - Content Viewer (65-70%) */}
                <div
                    className={`transition-all duration-300 ease-in-out ${
                        showPanel ? 'flex-1 max-w-[70%]' : 'w-full max-w-full'
                    }`}
                >
                    <ScrollArea className="h-full">
                        <div className="max-w-3xl mx-auto px-8 py-8">
                            {/* Document toolbar */}
                            <div className="flex items-center justify-between mb-8 pb-4 border-b border-border/40">
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <FileText className="h-4 w-4" />
                                    <span>Snapshot View</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Badge variant="outline" className="text-xs">
                                        Read-only
                                    </Badge>
                                </div>
                            </div>

                            {/* Content */}
                            <article className="min-h-[50vh]">
                                <SnapshotContent ref={contentRef} html={highlightedHtml} />
                            </article>
                        </div>
                    </ScrollArea>
                </div>

                {/* Right Panel - Sidebar (30-35%) */}
                <div
                    className={`border-l border-border/40 bg-muted/20 transition-all duration-300 ease-in-out ${
                        showPanel ? 'w-[30%] min-w-[350px] max-w-[450px]' : 'w-0'
                    }`}
                >
                    <div className="sidebar-panel h-full flex flex-col">
                        <Tabs value={activeTab} onChange={setActiveTab}>
                            <TabsList value={activeTab} onChange={setActiveTab}>
                                <TabsTrigger value="ai" onChange={setActiveTab} icon={<Sparkles className="h-4 w-4" />}>
                                    AI Insight
                                </TabsTrigger>
                                <TabsTrigger value="notes" onChange={setActiveTab} icon={<MessageSquare className="h-4 w-4" />} count={notes.length}>
                                    Highlights
                                </TabsTrigger>
                            </TabsList>

                            {/* AI Insight Tab Content */}
                            <TabsContent value="ai" currentValue={activeTab} className="p-4">
                                {!summary && !summaryLoading && !summaryError && (
                                    <div className="flex flex-col items-center text-center py-12 px-6">
                                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/30 dark:to-orange-950/30 flex items-center justify-center mb-4">
                                            <Sparkles className="h-8 w-8 text-amber-600 dark:text-amber-400" />
                                        </div>
                                        <h3 className="font-semibold text-foreground mb-2">AI-Powered Insights</h3>
                                        <p className="text-sm text-muted-foreground max-w-xs mb-6">
                                            Get intelligent summaries, extract key points, and understand the core message of this content.
                                        </p>
                                        <Button onClick={handleGenerateSummary} size="default">
                                            <Zap className="h-4 w-4 mr-2" />
                                            Generate Summary
                                        </Button>
                                    </div>
                                )}

                                {summaryLoading && (
                                    <div className="space-y-4 py-4">
                                        <div className="flex items-center gap-3 px-2">
                                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 dark:from-amber-950/30 dark:to-orange-950/30 flex items-center justify-center">
                                                <Sparkles className="h-5 w-5 text-amber-600 animate-pulse" />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium">AI Agent Working</p>
                                                <p className="text-xs text-muted-foreground">Analyzing content...</p>
                                            </div>
                                        </div>
                                        <AgentExecutionCard
                                            steps={agentSteps}
                                            title="Execution Progress"
                                            description="Running AI analysis pipeline"
                                        />
                                    </div>
                                )}

                                {summaryError && !summaryLoading && (
                                    <div className="flex flex-col items-center text-center py-12 px-6">
                                        <div className="h-12 w-12 rounded-full bg-destructive/10 flex items-center justify-center mb-4">
                                            <X className="h-6 w-6 text-destructive" />
                                        </div>
                                        <h3 className="font-semibold text-foreground mb-2">Generation Failed</h3>
                                        <p className="text-sm text-muted-foreground mb-6 max-w-xs">{summaryError}</p>
                                        <Button onClick={handleGenerateSummary} variant="outline">
                                            <Sparkles className="h-4 w-4 mr-2" />
                                            Try Again
                                        </Button>
                                    </div>
                                )}

                                {summary && !summaryLoading && (
                                    <div className="space-y-4 py-4">
                                        <div className="flex items-center justify-between px-2">
                                            <div className="flex items-center gap-2">
                                                <div className="h-8 w-8 rounded-lg bg-green-100 dark:bg-green-950/30 flex items-center justify-center">
                                                    <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
                                                </div>
                                                <span className="font-medium text-sm">Summary Complete</span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon-sm"
                                                onClick={() => handleCopy('summary', summary)}
                                            >
                                                {copiedKey === 'summary' ? (
                                                    <Check className="h-4 w-4 text-green-600" />
                                                ) : (
                                                    <Copy className="h-4 w-4" />
                                                )}
                                            </Button>
                                        </div>

                                        <AgentExecutionCard
                                            steps={agentSteps}
                                            title="Completed Steps"
                                        />

                                        <Card className="border-border/40">
                                            <CardContent className="p-4">
                                                <div className="prose prose-sm max-w-none dark:prose-invert">
                                                    <ReactMarkdown
                                                        components={{
                                                            p: ({ children }) => <p className="text-foreground leading-relaxed mb-3 last:mb-0">{children}</p>,
                                                            strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
                                                            ul: ({ children }) => <ul className="space-y-2 my-3 pl-4">{children}</ul>,
                                                            ol: ({ children }) => <ol className="space-y-2 my-3 pl-4">{children}</ol>,
                                                            li: ({ children }) => (
                                                                <li className="text-foreground flex items-start gap-2">
                                                                    <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-foreground/60 mt-2" />
                                                                    <span>{children}</span>
                                                                </li>
                                                            ),
                                                            h1: ({ children }) => <h1 className="text-base font-semibold text-foreground mb-2 mt-4">{children}</h1>,
                                                            h2: ({ children }) => <h2 className="text-base font-semibold text-foreground mb-2 mt-4">{children}</h2>,
                                                            h3: ({ children }) => <h3 className="text-sm font-semibold text-foreground mb-2 mt-3">{children}</h3>,
                                                        }}
                                                    >
                                                        {summary}
                                                    </ReactMarkdown>
                                                </div>
                                            </CardContent>
                                        </Card>

                                        <div className="flex gap-2">
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="flex-1"
                                                onClick={handleGenerateSummary}
                                                disabled={summaryLoading}
                                            >
                                                <Loader2 className="h-4 w-4 mr-2" />
                                                Regenerate
                                            </Button>
                                            <Button
                                                size="sm"
                                                className="flex-1"
                                                onClick={() => handleCopy('summary', summary)}
                                            >
                                                {copiedKey === 'summary' ? (
                                                    <>
                                                        <Check className="h-4 w-4 mr-2" />
                                                        Copied
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy className="h-4 w-4 mr-2" />
                                                        Copy
                                                    </>
                                                )}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </TabsContent>

                            {/* Highlight Notes Tab Content */}
                            <TabsContent value="notes" currentValue={activeTab} className="p-4">
                                {notesLoading && (
                                    <div className="flex items-center justify-center py-20">
                                        <div className="flex flex-col items-center gap-3">
                                            <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                                            <p className="text-sm text-muted-foreground">Loading highlights...</p>
                                        </div>
                                    </div>
                                )}

                                {!notesLoading && notes.length > 0 && (
                                    <ScrollArea className="h-full">
                                        <div className="space-y-3 pb-4">
                                            {notes.map(note => (
                                                <HighlightNoteCard
                                                    key={note.id}
                                                    note={note}
                                                    isOwner={isOwner}
                                                    onEdit={handleEditNote}
                                                    onDelete={handleDeleteNote}
                                                    onJumpToContext={handleJumpToContext}
                                                />
                                            ))}
                                        </div>
                                    </ScrollArea>
                                )}

                                {!notesLoading && notes.length === 0 && (
                                    <div className="flex flex-col items-center text-center py-16 px-6">
                                        <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-purple-100 to-pink-100 dark:from-purple-950/30 dark:to-pink-950/30 flex items-center justify-center mb-4">
                                            <Highlighter className="h-7 w-7 text-purple-600 dark:text-purple-400" />
                                        </div>
                                        <h3 className="font-semibold text-foreground mb-2">No Highlights Yet</h3>
                                        <p className="text-sm text-muted-foreground max-w-xs mb-6">
                                            {currentUserId
                                                ? 'Select any text in the article to create a highlight with notes.'
                                                : 'Log in to add highlights and notes.'}
                                        </p>
                                        {currentUserId && (
                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                <BookOpen className="h-4 w-4" />
                                                <span>Highlight text to get started</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </TabsContent>
                        </Tabs>
                    </div>
                </div>
            </div>

            {/* Selection Toolbar */}
            {selection && currentUserId && (() => {
                const toolbarWidth = showNoteInput ? 380 : 200;
                const spaceOnRight = window.innerWidth - selection.rect.right;
                const positionOnRight = spaceOnRight >= toolbarWidth + 24;
                const left = positionOnRight
                    ? Math.min(selection.rect.right + window.scrollX + 12, window.innerWidth - toolbarWidth - 12)
                    : Math.max(12, selection.rect.left + window.scrollX - toolbarWidth - 12);
                const verticalCenter = selection.rect.top + window.scrollY + selection.rect.height / 2;
                const toolbarHeight = showNoteInput ? 220 : 48;
                const top = Math.max(70, Math.min(verticalCenter - toolbarHeight / 2, window.innerHeight + window.scrollY - toolbarHeight - 12));

                return (
                    <div
                        className="selection-toolbar fixed z-50 animate-in fade-in zoom-in-95 duration-200"
                        style={{ left, top }}
                    >
                        <Card className="shadow-lg border-border/60 overflow-hidden">
                            {!showNoteInput ? (
                                <div className="flex items-center p-1.5 gap-1.5 bg-background">
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setShowNoteInput(true);
                                            setShowPanel(true);
                                            setActiveTab('notes');
                                        }}
                                        className="h-9"
                                    >
                                        <Highlighter className="h-4 w-4 mr-1.5" />
                                        Add Note
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        onClick={() => {
                                            setSelection(null);
                                            window.getSelection()?.removeAllRanges();
                                        }}
                                    >
                                        <X className="h-4 w-4" />
                                    </Button>
                                </div>
                            ) : (
                                <div className="w-[380px] p-4 bg-background">
                                    <div className="flex items-center justify-between mb-3">
                                        <div className="flex items-center gap-2">
                                            <Highlighter className="h-4 w-4 text-primary" />
                                            <span className="font-medium text-sm">New Highlight</span>
                                        </div>
                                        <Button
                                            variant="ghost"
                                            size="icon-sm"
                                            onClick={() => {
                                                setShowNoteInput(false);
                                                setSelection(null);
                                                setNoteInput('');
                                                window.getSelection()?.removeAllRanges();
                                            }}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>

                                    <div className="mb-3 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground line-clamp-3 border border-border/40">
                                        "{selection.text}"
                                    </div>

                                    <textarea
                                        value={noteInput}
                                        onChange={(e) => setNoteInput(e.target.value)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' && !e.shiftKey) {
                                                e.preventDefault();
                                                handleCreateNote();
                                            }
                                            if (e.key === 'Escape') {
                                                setShowNoteInput(false);
                                                setSelection(null);
                                                setNoteInput('');
                                                window.getSelection()?.removeAllRanges();
                                            }
                                        }}
                                        autoFocus
                                        rows={3}
                                        placeholder="Add your thoughts..."
                                        className="w-full px-3 py-2 text-sm bg-background border border-input rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-ring/50 placeholder:text-muted-foreground"
                                    />

                                    <div className="mt-3 flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">
                                            Press <kbd className="px-1.5 py-0.5 bg-muted rounded text-xs">Enter</kbd> to save
                                        </span>
                                        <Button
                                            size="sm"
                                            onClick={handleCreateNote}
                                            disabled={!noteInput.trim() || isCreatingNote}
                                        >
                                            {isCreatingNote ? (
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            ) : (
                                                <Check className="h-4 w-4 mr-2" />
                                            )}
                                            Save Note
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </Card>
                    </div>
                );
            })()}

            {/* Delete Confirmation Dialog */}
            <DeleteConfirmDialog
                isOpen={deleteDialogOpen}
                onClose={() => {
                    setDeleteDialogOpen(false);
                    setNoteToDelete(null);
                }}
                onConfirm={confirmDelete}
                isDeleting={isDeleting}
            />
        </div>
    );
}
