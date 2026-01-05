'use client';

export const runtime = 'edge';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { X, Loader2, Plus, ChevronLeft, Sparkles, MessageSquareText, Trash2, Pencil, Copy } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';
import { toast } from 'sonner';

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
}

interface SelectionInfo {
    text: string;
    offsetStart: number;
    offsetEnd: number;
    rect: DOMRect;
}

const SnapshotContent = React.memo(
    React.forwardRef<HTMLDivElement, { html: string; panelWidth: number }>(
        ({ html, panelWidth }, ref) => (
            <div
                ref={ref}
                className={`transition-all duration-300 min-h-screen`}
                style={{ marginRight: `${panelWidth}px` }}
                dangerouslySetInnerHTML={{ __html: html }}
            />
        )
    )
);
SnapshotContent.displayName = 'SnapshotContent';

type TabType = 'ai' | 'notes';

// Notion-style Note Card
function NoteCard({ note, isOwner, onEdit, onDelete, onHighlightClick }: {
    note: Note;
    isOwner: boolean;
    onEdit: (id: number, content: string) => Promise<void>;
    onDelete: (id: number) => void;
    onHighlightClick: (note: Note) => void;
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
        <div className="group bg-white rounded-lg border border-gray-200 hover:border-gray-300 hover:shadow-sm transition-all">
            {/* Quote section */}
            <button
                onClick={() => onHighlightClick(note)}
                className="w-full text-left p-4 pb-3 border-b border-gray-100 hover:bg-gray-50 transition-colors"
            >
                <p className="text-sm text-gray-500 leading-relaxed line-clamp-2 font-serif">
                    "{note.selected_text}"
                </p>
            </button>

            {/* Note content */}
            <div className="p-4">
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
                            rows={4}
                            className="w-full px-3 py-2 text-sm text-gray-900 bg-gray-50 border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-gray-200 focus:bg-white placeholder:text-gray-400"
                            placeholder="Your note..."
                        />
                        <div className="flex items-center justify-end gap-2">
                            <button
                                onClick={() => {
                                    setIsEditing(false);
                                    setEditContent(note.note_content);
                                }}
                                disabled={isSaving}
                                className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving || !editContent.trim()}
                                className="px-3 py-1.5 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center gap-2"
                            >
                                {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
                                Save
                            </button>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
                        {note.note_content}
                    </p>
                )}
            </div>

            {/* Footer */}
            <div className="px-4 py-2 flex items-center justify-between border-t border-gray-100">
                <span className="text-xs text-gray-400">
                    {formatTime(note.created_at)}
                </span>

                {isOwner && !isEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => setIsEditing(true)}
                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                            onClick={() => onDelete(note.id)}
                            className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-500 transition-colors"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function SnapshotViewerPage() {
    const params = useParams();
    const router = useRouter();
    const tweetId = params.id as string;
    const contentRef = useRef<HTMLDivElement>(null);

    const [snapshotHtml, setSnapshotHtml] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showPanel, setShowPanel] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('notes');

    const [summary, setSummary] = useState<string | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState<string | null>(null);
    const [copiedKey, setCopiedKey] = useState<string | null>(null);
    const copyResetRef = useRef<number | null>(null);

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

    const getPanelWidth = () => {
        if (!showPanel) return 0;
        return 380;
    };

    const panelWidth = getPanelWidth();

    useEffect(() => {
        if (!tweetId) return;

        const fetchSnapshot = async () => {
            try {
                const response = await fetch(`/api/s/${tweetId}`);
                if (response.ok) {
                    const html = await response.text();
                    setSnapshotHtml(html);
                } else {
                    setError('Failed to load snapshot');
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
            } else if (response.status === 401) {
                router.push('/login');
            } else {
                const data = await response.json();
                setSummaryError(data.error || 'Failed to generate summary');
            }
        } catch (err) {
            setSummaryError('Error connecting to AI service');
        } finally {
            setSummaryLoading(false);
        }
    };

    const handleMouseUp = useCallback((e: MouseEvent) => {
        const target = e.target as HTMLElement;
        if (target.closest('.note-toolbar') || target.closest('.sidebar-panel')) {
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
            } else if (response.status === 401) {
                router.push('/login');
            }
        } catch (err) {
            console.error('Failed to create note:', err);
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
            }
        } catch (err) {
            console.error('Failed to delete note:', err);
        } finally {
            setIsDeleting(false);
        }
    };

    const handleHighlightClick = (note: Note) => {
        setShowPanel(true);
        setActiveTab('notes');
        setTimeout(() => {
            const noteElement = document.getElementById(`note-${note.id}`);
            noteElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
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
                wrapper.className = 'note-highlight';
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

        const style = doc.createElement('style');
        style.textContent = `
            .note-highlight {
                background: #fef3c7;
                border-bottom: 2px solid #f59e0b;
                cursor: pointer;
                padding: 1px 0;
                border-radius: 2px;
            }
            .note-highlight:hover {
                background: #fde68a;
            }
        `;
        doc.head.appendChild(style);

        return doc.documentElement.outerHTML;
    }, [snapshotHtml, notes]);

    useEffect(() => {
        const handleHighlightClicks = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            if (target.classList.contains('note-highlight')) {
                const noteId = target.getAttribute('data-note-id');
                if (noteId) {
                    const note = notes.find(n => n.id === parseInt(noteId));
                    if (note) {
                        handleHighlightClick(note);
                    }
                }
            }
        };

        const container = contentRef.current;
        if (container) {
            container.addEventListener('click', handleHighlightClicks);
            return () => container.removeEventListener('click', handleHighlightClicks);
        }
    }, [notes]);

    useEffect(() => {
        const container = contentRef.current;
        if (!container) return;

        const clearActiveSelection = () => {
            const existing = container.querySelectorAll('.active-selection');
            existing.forEach((el) => {
                const parent = el.parentNode;
                if (!parent) return;
                while (el.firstChild) {
                    parent.insertBefore(el.firstChild, el);
                }
                parent.removeChild(el);
            });
        };

        clearActiveSelection();

        const styleEl = document.createElement('style');
        styleEl.id = 'active-selection-style';
        styleEl.textContent = `
            .active-selection {
                background: #e0f2fe;
                border-bottom: 2px solid #0ea5e9;
                border-radius: 2px;
                padding: 1px 0;
            }
        `;
        if (!document.getElementById('active-selection-style')) {
            document.head.appendChild(styleEl);
        }

        return () => {
            clearActiveSelection();
        };
    }, [highlightedHtml]);

    if (loading) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-5 w-5 text-gray-400 animate-spin" />
                    <p className="text-sm text-gray-500">Loading...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-white flex items-center justify-center">
                <p className="text-gray-500 text-sm">{error}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-white relative">
            {/* Notion-style Header */}
            <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-200">
                <div className="max-w-4xl mx-auto px-4 h-12 flex items-center">
                    <button
                        onClick={() => router.push('/dashboard')}
                        className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        <span>Back</span>
                    </button>
                    <div className="ml-auto flex items-center gap-2">
                        <button
                            onClick={() => setShowPanel(!showPanel)}
                            className={`px-3 py-1.5 text-sm rounded-md transition-colors flex items-center gap-2 ${
                                showPanel
                                    ? 'bg-gray-100 text-gray-700'
                                    : 'bg-gray-900 text-white hover:bg-gray-800'
                            }`}
                        >
                            {showPanel ? (
                                <>
                                    <X className="h-4 w-4" />
                                    <span className="hidden sm:inline">Close</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles className="h-4 w-4" />
                                    <span className="hidden sm:inline">AI & Notes</span>
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </header>

            {/* Note Toolbar */}
            {selection && currentUserId && (() => {
                const toolbarWidth = showNoteInput ? 360 : 180;
                const spaceOnRight = window.innerWidth - selection.rect.right;
                const positionOnRight = spaceOnRight >= toolbarWidth + 24;
                const left = positionOnRight
                    ? Math.min(selection.rect.right + window.scrollX + 12, window.innerWidth - toolbarWidth - 12)
                    : Math.max(12, selection.rect.left + window.scrollX - toolbarWidth - 12);
                const verticalCenter = selection.rect.top + window.scrollY + selection.rect.height / 2;
                const toolbarHeight = showNoteInput ? 200 : 44;
                const top = Math.max(60, Math.min(verticalCenter - toolbarHeight / 2, window.innerHeight + window.scrollY - toolbarHeight - 12));

                return (
                    <div
                        className="note-toolbar fixed z-[70] animate-in fade-in duration-200"
                        style={{ left, top }}
                    >
                        <div className={`bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden ${showNoteInput ? 'w-[360px]' : 'w-[180px]'}`}>
                            {!showNoteInput ? (
                                <div className="flex items-center p-1.5">
                                    <button
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => {
                                            setShowNoteInput(true);
                                            setShowPanel(true);
                                            setActiveTab('notes');
                                        }}
                                        className="flex-1 h-8 flex items-center justify-center gap-1.5 px-3 rounded bg-gray-900 text-white text-sm hover:bg-gray-800 transition-colors"
                                    >
                                        <Plus className="h-3.5 w-3.5" />
                                        <span>Add note</span>
                                    </button>
                                    <button
                                        onClick={() => {
                                            setSelection(null);
                                            window.getSelection()?.removeAllRanges();
                                        }}
                                        className="h-8 w-8 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 transition-colors"
                                    >
                                        <X className="h-3.5 w-3.5" />
                                    </button>
                                </div>
                            ) : (
                                <div className="p-3">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-medium text-gray-700">New note</span>
                                        <button
                                            onClick={() => {
                                                setShowNoteInput(false);
                                                setSelection(null);
                                                setNoteInput('');
                                                window.getSelection()?.removeAllRanges();
                                            }}
                                            className="h-6 w-6 flex items-center justify-center rounded hover:bg-gray-100 text-gray-400 transition-colors"
                                        >
                                            <X className="h-3.5 w-3.5" />
                                        </button>
                                    </div>
                                    <div className="mb-2 p-2 bg-gray-50 rounded text-xs text-gray-500 line-clamp-2">
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
                                        placeholder="Write a note..."
                                        className="w-full px-3 py-2 text-sm bg-white border border-gray-200 rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-gray-200 placeholder:text-gray-400"
                                    />
                                    <div className="mt-2 flex items-center justify-between">
                                        <span className="text-[10px] text-gray-400">Enter to save</span>
                                        <button
                                            onClick={handleCreateNote}
                                            disabled={!noteInput.trim() || isCreatingNote}
                                            className="h-7 px-3 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                                        >
                                            {isCreatingNote ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                                            Save
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })()}

            {/* Main Content */}
            <main className="max-w-4xl mx-auto">
                <SnapshotContent
                    ref={contentRef}
                    html={highlightedHtml}
                    panelWidth={panelWidth}
                />
            </main>

            {/* Side Panel - Notion Style */}
            <div
                className="sidebar-panel fixed top-12 right-0 bottom-0 z-40 bg-white border-l border-gray-200 flex flex-col transition-all duration-300"
                style={{
                    width: `${panelWidth}px`,
                    transform: showPanel ? 'translateX(0)' : 'translateX(100%)'
                }}
            >
                {/* Panel Header */}
                <div className="flex border-b border-gray-200">
                    <button
                        onClick={() => setActiveTab('ai')}
                        className={`flex-1 h-11 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors relative ${
                            activeTab === 'ai' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <Sparkles className="h-4 w-4" />
                        <span>AI</span>
                        {activeTab === 'ai' && <span className="absolute bottom-0 left-0 right-0 h-px bg-gray-900" />}
                    </button>
                    <button
                        onClick={() => setActiveTab('notes')}
                        className={`flex-1 h-11 text-sm font-medium flex items-center justify-center gap-1.5 transition-colors relative ${
                            activeTab === 'notes' ? 'text-gray-900' : 'text-gray-400 hover:text-gray-600'
                        }`}
                    >
                        <MessageSquareText className="h-4 w-4" />
                        <span>Notes</span>
                        {notes.length > 0 && (
                            <span className={`h-5 min-w-5 px-1 rounded-full text-[11px] flex items-center justify-center ${
                                activeTab === 'notes' ? 'bg-gray-900 text-white' : 'bg-gray-200 text-gray-600'
                            }`}>
                                {notes.length}
                            </span>
                        )}
                        {activeTab === 'notes' && <span className="absolute bottom-0 left-0 right-0 h-px bg-gray-900" />}
                    </button>
                </div>

                {/* Panel Content */}
                <div className="flex-1 overflow-y-auto">
                    {/* AI Tab */}
                    {activeTab === 'ai' && (
                        <div className="p-4">
                            {!summary && !summaryLoading && !summaryError && (
                                <div className="flex flex-col items-center text-center py-12 px-4">
                                    <button
                                        onClick={handleGenerateSummary}
                                        className="mb-4 group"
                                    >
                                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-200 group-hover:from-gray-200 group-hover:to-gray-300 flex items-center justify-center transition-all">
                                            <Sparkles className="h-7 w-7 text-gray-600" />
                                        </div>
                                    </button>
                                    <h3 className="text-sm font-semibold text-gray-900 mb-1">Generate AI Summary</h3>
                                    <p className="text-xs text-gray-500 max-w-[200px]">
                                        Get an intelligent analysis with key points and takeaways
                                    </p>
                                </div>
                            )}

                            {summaryLoading && (
                                <div className="space-y-3 py-4">
                                    <div className="flex items-center gap-2 mb-4">
                                        <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                            <Sparkles className="h-4 w-4 text-gray-400 animate-pulse" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="h-3.5 w-24 bg-gray-200 rounded animate-pulse mb-1" />
                                            <div className="h-3 w-32 bg-gray-100 rounded animate-pulse" />
                                        </div>
                                    </div>
                                    {['Summary', 'Key Points', 'Topics'].map((item, i) => (
                                        <div key={item} className="bg-gray-50 rounded-lg p-4">
                                            <div className="h-3.5 w-20 bg-gray-200 rounded animate-pulse mb-2" />
                                            <div className="space-y-1.5">
                                                {[1, 2, 3].map((j) => (
                                                    <div key={j} className="h-2.5 bg-gray-100 rounded animate-pulse" style={{ width: `${60 + Math.random() * 40}%` }} />
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {summaryError && !summaryLoading && (
                                <div className="text-center py-12">
                                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-500 mb-3">
                                        <X className="h-5 w-5" />
                                    </div>
                                    <h3 className="text-sm font-medium text-gray-900 mb-1">Generation Failed</h3>
                                    <p className="text-xs text-gray-500 mb-4">{summaryError}</p>
                                    <button
                                        onClick={handleGenerateSummary}
                                        className="px-4 py-2 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors"
                                    >
                                        Try Again
                                    </button>
                                </div>
                            )}

                            {summary && !summaryLoading && (
                                <div className="space-y-3">
                                    {/* Header */}
                                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                                        <div className="flex items-center gap-2">
                                            <div className="h-8 w-8 rounded-lg bg-gray-100 flex items-center justify-center">
                                                <Sparkles className="h-4 w-4 text-gray-600" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-semibold text-gray-900">AI Summary</h3>
                                                <p className="text-[10px] text-gray-400">Generated by AI</p>
                                            </div>
                                        </div>
                                        <button
                                            onClick={() => handleCopy('all', summary)}
                                            className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
                                            title={copiedKey === 'all' ? 'Copied' : 'Copy'}
                                        >
                                            {copiedKey === 'all' ? (
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            ) : (
                                                <Copy className="h-4 w-4" />
                                            )}
                                        </button>
                                    </div>

                                    {/* Summary content */}
                                    <div className="bg-gray-50 rounded-lg p-4">
                                        <ReactMarkdown
                                            components={{
                                                p: ({ children }) => <p className="text-sm text-gray-700 leading-relaxed mb-2 last:mb-0">{children}</p>,
                                                strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                                                ul: ({ children }) => <ul className="space-y-1 my-2">{children}</ul>,
                                                ol: ({ children }) => <ol className="space-y-1 my-2">{children}</ol>,
                                                li: ({ children }) => (
                                                    <li className="text-sm text-gray-700 flex items-start gap-2">
                                                        <span className="flex-shrink-0 w-1 h-1 rounded-full bg-gray-400 mt-1.5" />
                                                        <span>{children}</span>
                                                    </li>
                                                ),
                                                h1: ({ children }) => <h1 className="text-sm font-semibold text-gray-900 mb-2">{children}</h1>,
                                                h2: ({ children }) => <h2 className="text-sm font-semibold text-gray-900 mb-2">{children}</h2>,
                                                h3: ({ children }) => <h3 className="text-sm font-medium text-gray-900 mb-2">{children}</h3>,
                                            }}
                                        >
                                            {summary}
                                        </ReactMarkdown>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 pt-2">
                                        <button
                                            onClick={handleGenerateSummary}
                                            className="flex-1 h-9 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            <Loader2 className="h-3.5 w-3.5" />
                                            Regenerate
                                        </button>
                                        <button
                                            onClick={() => handleCopy('all', summary)}
                                            className="flex-1 h-9 text-sm bg-gray-900 text-white rounded-md hover:bg-gray-800 transition-colors flex items-center justify-center gap-1.5"
                                        >
                                            {copiedKey === 'all' ? (
                                                <>
                                                    <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                    Copied
                                                </>
                                            ) : (
                                                <>
                                                    <Copy className="h-3.5 w-3.5" />
                                                    Copy All
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Notes Tab */}
                    {activeTab === 'notes' && (
                        <div className="p-4">
                            {notesLoading && (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-5 w-5 text-gray-300 animate-spin" />
                                </div>
                            )}

                            {!notesLoading && notes.length > 0 && (
                                <div className="space-y-3">
                                    {notes.map(note => (
                                        <div key={note.id} id={`note-${note.id}`}>
                                            <NoteCard
                                                note={note}
                                                isOwner={isOwner}
                                                onEdit={handleEditNote}
                                                onDelete={handleDeleteNote}
                                                onHighlightClick={handleHighlightClick}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            {!notesLoading && notes.length === 0 && (
                                <div className="flex flex-col items-center text-center py-12">
                                    <div className="h-12 w-12 rounded-xl bg-gray-100 flex items-center justify-center mb-3">
                                        <MessageSquareText className="h-5 w-5 text-gray-400" />
                                    </div>
                                    <h3 className="text-sm font-medium text-gray-900 mb-1">No notes yet</h3>
                                    <p className="text-xs text-gray-500 max-w-[180px]">
                                        {currentUserId
                                            ? 'Select any text to add a note'
                                            : 'Log in to add notes'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

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
