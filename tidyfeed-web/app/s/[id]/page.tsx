'use client';

export const runtime = 'edge';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, X, Loader2, StickyNote, Plus, MessageSquarePlus, Brain, BookMarked, ChevronRight, PanelRightClose, PanelRightOpen, Lightbulb, Quote, MoreVertical, Pencil, Trash2, Wand2 } from 'lucide-react';
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
                className={`
                    transition-all duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]
                    min-h-screen
                `}
                style={{ marginRight: `${panelWidth}px` }}
                dangerouslySetInnerHTML={{ __html: html }}
            />
        )
    )
);
SnapshotContent.displayName = 'SnapshotContent';

type TabType = 'insights' | 'notes';

// Note Card Component - Redesigned
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
    const [showActions, setShowActions] = useState(false);

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
        if (minutes < 1) return 'now';
        if (minutes < 60) return `${minutes}m`;
        if (hours < 24) return `${hours}h`;
        if (days < 7) return `${days}d`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    return (
        <div
            className="group relative pl-4 pr-2 py-3 hover:bg-white/50 rounded-r-2xl transition-all duration-200 border-l-2 border-transparent hover:border-violet-400"
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            {/* Timeline Dot */}
            <div className="absolute left-0 top-5 -translate-x-1/2 w-3 h-3 rounded-full bg-violet-200 ring-4 ring-white group-hover:bg-violet-500 group-hover:ring-violet-100 transition-all duration-200" />

            {/* Selected Text Quote */}
            <button
                onClick={() => onHighlightClick(note)}
                className="w-full text-left mb-2 group/btn"
            >
                <div className="flex items-start gap-2">
                    <Quote className="h-3.5 w-3.5 text-violet-300 mt-0.5 flex-shrink-0" />
                    <p className="text-xs text-zinc-500 leading-relaxed line-clamp-2 font-serif italic">
                        {note.selected_text}
                    </p>
                </div>
            </button>

            {/* Note Content */}
            {isEditing ? (
                <div className="mt-2 space-y-2">
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
                        className="w-full px-3 py-2.5 text-sm text-zinc-800 bg-white border border-zinc-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 placeholder:text-zinc-400 transition-all shadow-sm"
                        placeholder="Your note..."
                    />
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={() => {
                                setIsEditing(false);
                                setEditContent(note.note_content);
                            }}
                            disabled={isSaving}
                            className="px-3 py-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-700 hover:bg-zinc-100 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !editContent.trim()}
                            className="px-3 py-1.5 text-xs font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-all flex items-center gap-1.5 shadow-sm shadow-violet-600/20"
                        >
                            {isSaving ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                                <Plus className="h-3 w-3" />
                            )}
                            Save
                        </button>
                    </div>
                </div>
            ) : (
                <div className="mt-2">
                    <p className="text-sm text-zinc-800 leading-relaxed whitespace-pre-wrap">
                        {note.note_content}
                    </p>
                </div>
            )}

            {/* Footer */}
            <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-zinc-400 font-medium tracking-wide uppercase">
                    {formatTime(note.created_at)}
                </span>

                {isOwner && !isEditing && (
                    <div className={`flex items-center gap-0.5 transition-opacity duration-200 ${showActions ? 'opacity-100' : 'opacity-0'}`}>
                        <button
                            onClick={() => setIsEditing(true)}
                            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-violet-50 text-zinc-400 hover:text-violet-600 transition-colors"
                            title="Edit"
                        >
                            <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                            onClick={() => onDelete(note.id)}
                            className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors"
                            title="Delete"
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
    const [activeTab, setActiveTab] = useState<TabType>('insights');

    const [summary, setSummary] = useState<string | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState<string | null>(null);

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

    const [highlightedNoteId, setHighlightedNoteId] = useState<number | null>(null);
    const selectionRangeRef = useRef<Range | null>(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app';

    const getPanelWidth = () => {
        if (!showPanel) return 0;
        return 420;
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
        setActiveTab('insights');

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
        // Exclude clicks on the new toolbar
        if (target.closest('.note-toolbar') || target.closest('.sidebar-panel')) {
            return;
        }

        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.toString().trim()) {
            setSelection(null);
            setShowNoteInput(false);
            selectionRangeRef.current = null;
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

        selectionRangeRef.current = range.cloneRange();

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
                selectionRangeRef.current = null;
                setShowNoteInput(false);
                setNoteInput('');
                setShowPanel(true);
                setActiveTab('notes');
                window.getSelection()?.removeAllRanges();
                fetchNotes();
            } else if (response.status === 401) {
                router.push('/login');
            } else if (response.status === 403) {
                alert('You can only add notes to your own saved posts.');
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
        setHighlightedNoteId(note.id);
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
                background: linear-gradient(to bottom, rgba(139, 92, 246, 0.15) 0%, rgba(139, 92, 246, 0.20) 100%);
                border-bottom: 2px solid rgb(139, 92, 246);
                cursor: pointer;
                transition: all 0.2s ease;
                padding: 1px 0;
                border-radius: 2px;
            }
            .note-highlight:hover {
                background: linear-gradient(to bottom, rgba(139, 92, 246, 0.25) 0%, rgba(139, 92, 246, 0.30) 100%);
                border-bottom-width: 3px;
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

        const STYLE_ID = 'active-selection-style';
        if (!document.getElementById(STYLE_ID)) {
            const styleEl = document.createElement('style');
            styleEl.id = STYLE_ID;
            styleEl.textContent = `
                .active-selection {
                    background: linear-gradient(to bottom, rgba(99, 102, 241, 0.15) 0%, rgba(99, 102, 241, 0.25) 100%);
                    border-bottom: 2px solid rgb(99, 102, 241);
                    border-radius: 2px;
                    padding: 1px 0;
                    transition: background 0.2s ease;
                }
            `;
            document.head.appendChild(styleEl);
        }

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

        if (!selection || !selectionRangeRef.current) {
            return;
        }

        try {
            const range = selectionRangeRef.current.cloneRange();
            const wrapper = document.createElement('span');
            wrapper.className = 'active-selection';
            wrapper.setAttribute('data-active-selection', 'true');
            wrapper.appendChild(range.extractContents());
            range.insertNode(wrapper);
        } catch (err) {
            console.warn('Failed to apply active selection highlight:', err);
        }

        return () => {
            clearActiveSelection();
        };
    }, [selection, highlightedHtml]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-zinc-100 flex items-center justify-center font-sans">
                <div className="flex flex-col items-center gap-3">
                    <Loader2 className="h-6 w-6 text-violet-500 animate-spin" />
                    <p className="text-sm text-zinc-500 font-medium">Loading snapshot...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-50 to-zinc-100 flex items-center justify-center font-sans">
                <p className="text-zinc-500 text-sm font-medium">{error}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-zinc-100 relative overflow-hidden font-sans">
            {/* Top Control Bar - Simplified */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-white/70 backdrop-blur-xl border-b border-zinc-200/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="h-14 flex items-center gap-4">
                        {/* Breadcrumb */}
                        <div className="flex items-center gap-2 text-sm">
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="text-zinc-500 hover:text-zinc-900 transition-colors font-medium"
                            >
                                Dashboard
                            </button>
                            <ChevronRight className="h-4 w-4 text-zinc-300" />
                            <span className="text-zinc-900 font-semibold">Snapshot</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Spacer for fixed header */}
            <div className="h-14" />

            {/* Floating Panel Toggle Button - Redesigned */}
            <button
                onClick={() => setShowPanel(!showPanel)}
                className={`
                    fixed z-[60] h-12 px-4 rounded-2xl shadow-lg
                    flex items-center justify-center gap-2
                    transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]
                    ${showPanel
                        ? 'bg-white text-zinc-700 border border-zinc-200 hover:shadow-xl'
                        : 'bg-gradient-to-br from-violet-600 to-purple-600 text-white hover:scale-105'
                    }
                `}
                style={{
                    right: showPanel ? `${panelWidth + 16}px` : '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                }}
                title={showPanel ? 'Hide panel' : 'Show panel'}
            >
                {showPanel ? (
                    <>
                        <PanelRightClose className="h-5 w-5" />
                        <span className="text-sm font-semibold">Hide</span>
                    </>
                ) : (
                    <PanelRightOpen className="h-5 w-5" />
                )}
            </button>

            {/* Smart Inline Toolbar - Positioned to avoid covering text */}
            {selection && currentUserId && (() => {
                // Calculate position - try right side first, fall back to left
                const toolbarWidth = showNoteInput ? 400 : 200;
                const spaceOnRight = window.innerWidth - selection.rect.right;
                const spaceOnLeft = selection.rect.left;
                const positionOnRight = spaceOnRight >= toolbarWidth + 24;
                const left = positionOnRight
                    ? Math.min(
                        selection.rect.right + window.scrollX + 12,
                        window.innerWidth - toolbarWidth - 12
                    )
                    : Math.max(
                        12,
                        selection.rect.left + window.scrollX - toolbarWidth - 12
                    );
                const verticalCenter = selection.rect.top + window.scrollY + selection.rect.height / 2;
                const toolbarHeight = showNoteInput ? 220 : 48;
                const top = Math.max(
                    60,
                    Math.min(
                        verticalCenter - toolbarHeight / 2,
                        window.innerHeight + window.scrollY - toolbarHeight - 12
                    )
                );

                return (
                    <div
                        className="note-toolbar fixed z-[70] animate-in fade-in duration-200"
                        style={{ left, top }}
                    >
                        <div className={`
                            bg-white rounded-2xl shadow-2xl shadow-zinc-900/10 border border-zinc-200/60 overflow-hidden
                            transition-all duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]
                            ${showNoteInput ? 'w-[400px]' : 'w-[200px]'}
                        `}>
                            {/* Connection line to selection */}
                            {!showNoteInput && (
                                <div className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 border-zinc-200/60 ${
                                    positionOnRight
                                        ? '-left-3 border-l-2 border-t-2 rounded-tl-sm'
                                        : '-right-3 border-r-2 border-t-2 rounded-tr-sm'
                                }`} />
                            )}

                        {!showNoteInput ? (
                            // Collapsed State - Quick Action Bar
                            <div className="flex items-center gap-1 px-2 py-2">
                                <button
                                    onMouseDown={(e) => e.preventDefault()}
                                    onClick={() => {
                                        setShowNoteInput(true);
                                        // Auto-open panel to notes tab
                                        setShowPanel(true);
                                        setActiveTab('notes');
                                    }}
                                    className="flex-1 h-10 flex items-center justify-center gap-2 px-3 rounded-xl bg-violet-600 text-white hover:bg-violet-700 transition-all font-medium text-sm shadow-md shadow-violet-600/20"
                                >
                                    <Plus className="h-4 w-4" />
                                    <span>Add Note</span>
                                </button>
                                <button
                                    onClick={() => {
                                        setSelection(null);
                                        window.getSelection()?.removeAllRanges();
                                    }}
                                    className="h-10 w-10 flex items-center justify-center rounded-xl hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
                                    title="Cancel"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ) : (
                            // Expanded State - Inline Note Input
                            <div className="p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                                            <StickyNote className="h-4 w-4 text-white" />
                                        </div>
                                        <span className="text-sm font-bold text-zinc-900">New Note</span>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setShowNoteInput(false);
                                            setSelection(null);
                                            setNoteInput('');
                                            window.getSelection()?.removeAllRanges();
                                        }}
                                        className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
                                    >
                                        <X className="h-4 w-4" />
                                    </button>
                                </div>

                                {/* Selected Text Preview */}
                                <div className="mb-3 p-2.5 bg-zinc-50 rounded-xl border border-zinc-100">
                                    <p className="text-xs text-zinc-500 line-clamp-2 font-serif italic leading-relaxed">
                                        "{selection.text}"
                                    </p>
                                </div>

                                {/* Input Field */}
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
                                    placeholder="Write your thoughts..."
                                    className="w-full px-3 py-2.5 text-sm text-zinc-800 bg-white border border-zinc-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-400 placeholder:text-zinc-400 transition-all shadow-sm"
                                />

                                {/* Action Bar */}
                                <div className="mt-3 flex items-center justify-between">
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[10px] text-zinc-400 font-medium">Press</span>
                                        <kbd className="px-1.5 py-0.5 text-[10px] font-semibold text-zinc-500 bg-zinc-100 rounded border border-zinc-200">Enter</kbd>
                                        <span className="text-[10px] text-zinc-400 font-medium">to save</span>
                                    </div>
                                    <button
                                        onClick={handleCreateNote}
                                        disabled={!noteInput.trim() || isCreatingNote}
                                        className="h-9 px-4 text-sm font-semibold bg-gradient-to-r from-violet-600 to-purple-600 text-white rounded-xl hover:from-violet-700 hover:to-purple-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-violet-600/20"
                                    >
                                        {isCreatingNote ? (
                                            <Loader2 className="h-4 w-4 animate-spin" />
                                        ) : (
                                            <>
                                                <Plus className="h-4 w-4" />
                                                Save
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>
                        )}
                        </div>
                    </div>
                );
            })()}

            {/* Snapshot Content Container */}
            <div className="relative">
                <SnapshotContent
                    ref={contentRef}
                    html={highlightedHtml}
                    panelWidth={panelWidth}
                />
            </div>

            {/* Side Panel - Completely Redesigned */}
            <div
                className={`
                    sidebar-panel fixed top-14 right-0 bottom-0 z-40
                    bg-gradient-to-b from-white to-zinc-50/80
                    border-l border-zinc-200/60
                    shadow-2xl shadow-zinc-900/5
                    flex flex-col
                    transition-all duration-400 ease-[cubic-bezier(0.25,0.46,0.45,0.94)]
                `}
                style={{
                    width: `${panelWidth}px`,
                    transform: showPanel ? 'translateX(0)' : 'translateX(100%)'
                }}
            >
                {/* Panel Header - Minimalist Tabs */}
                <div className="border-b border-zinc-200/50 bg-white/80 backdrop-blur-xl">
                    <div className="flex">
                        <button
                            onClick={() => {
                                setActiveTab('insights');
                                if (!summary && !summaryLoading) {
                                    handleGenerateSummary();
                                }
                            }}
                            className={`
                                flex-1 h-14 text-sm font-semibold
                                flex items-center justify-center gap-2
                                transition-all duration-200 relative
                                ${activeTab === 'insights'
                                    ? 'text-violet-700'
                                    : 'text-zinc-400 hover:text-zinc-600'
                                }
                            `}
                        >
                            <Brain className="h-4 w-4" />
                            <span>AI Insights</span>
                            {activeTab === 'insights' && (
                                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-violet-500 rounded-full" />
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('notes')}
                            className={`
                                flex-1 h-14 text-sm font-semibold
                                flex items-center justify-center gap-2 relative
                                transition-all duration-200
                                ${activeTab === 'notes'
                                    ? 'text-amber-700'
                                    : 'text-zinc-400 hover:text-zinc-600'
                                }
                            `}
                        >
                            <StickyNote className="h-4 w-4" />
                            <span>Notes</span>
                            {notes.length > 0 && (
                                <span className={`h-5 min-w-5 px-1.5 rounded-full text-[11px] font-bold flex items-center justify-center ${activeTab === 'notes' ? 'bg-amber-500 text-white' : 'bg-zinc-200 text-zinc-600'}`}>
                                    {notes.length}
                                </span>
                            )}
                            {activeTab === 'notes' && (
                                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-0.5 bg-amber-500 rounded-full" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Panel Content */}
                <div className="flex-1 overflow-y-auto">
                    {/* AI Insights Tab */}
                    {activeTab === 'insights' && (
                        <div className="p-4">
                            {!summary && !summaryLoading && !summaryError && (
                                // Empty State - New Interactive Design
                                <div className="flex flex-col items-center justify-center text-center py-10 px-4">
                                    {/* Animated AI Orb */}
                                    <button
                                        onClick={handleGenerateSummary}
                                        className="group relative mb-6"
                                    >
                                        {/* Outer glow ring */}
                                        <div className="absolute inset-0 -m-4 rounded-full bg-gradient-to-r from-violet-500/20 via-purple-500/30 to-fuchsia-500/20 blur-xl group-hover:blur-2xl transition-all duration-500 animate-pulse" />
                                        {/* Spinning dashed ring */}
                                        <div className="absolute inset-0 -m-2 rounded-full border-2 border-dashed border-violet-300/50 group-hover:border-violet-400/70 transition-all duration-500 animate-[spin_8s_linear_infinite]" />
                                        {/* Main button */}
                                        <div className="relative h-24 w-24 rounded-full bg-gradient-to-br from-violet-500 via-purple-600 to-fuchsia-600 flex items-center justify-center shadow-2xl shadow-violet-500/40 group-hover:shadow-violet-500/60 group-hover:scale-110 transition-all duration-300">
                                            <Brain className="h-10 w-10 text-white group-hover:scale-110 transition-transform duration-300" />
                                        </div>
                                        {/* Floating particles */}
                                        <div className="absolute -top-2 -right-2 h-3 w-3 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: '0s' }} />
                                        <div className="absolute -bottom-1 -left-3 h-2 w-2 rounded-full bg-purple-400 animate-bounce" style={{ animationDelay: '0.2s' }} />
                                        <div className="absolute top-1/2 -right-4 h-2.5 w-2.5 rounded-full bg-fuchsia-400 animate-bounce" style={{ animationDelay: '0.4s' }} />
                                    </button>

                                    <h3 className="text-lg font-bold bg-gradient-to-r from-violet-600 to-purple-600 bg-clip-text text-transparent mb-2">
                                        Unlock AI Insights
                                    </h3>
                                    <p className="text-sm text-zinc-500 max-w-[240px] leading-relaxed mb-4">
                                        Get an intelligent analysis with summaries, key points, and takeaways
                                    </p>

                                    {/* Feature hints */}
                                    <div className="flex flex-wrap justify-center gap-2 mt-4">
                                        {['Summary', 'Key Points', 'Topics', 'Sentiment'].map((feature, i) => (
                                            <span
                                                key={feature}
                                                className="px-2.5 py-1 text-[10px] font-medium bg-zinc-100 text-zinc-600 rounded-full animate-in fade-in slide-in-from-bottom-2"
                                                style={{ animationDelay: `${i * 100}ms` }}
                                            >
                                                {feature}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {summaryLoading && (
                                // Loading State - New Skeleton Design
                                <div className="space-y-4 py-4">
                                    {/* Header skeleton */}
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                                            <Brain className="h-5 w-5 text-white animate-pulse" />
                                        </div>
                                        <div className="flex-1">
                                            <div className="h-4 w-24 bg-zinc-200 rounded animate-pulse mb-1" />
                                            <div className="h-3 w-32 bg-zinc-100 rounded animate-pulse" />
                                        </div>
                                    </div>

                                    {/* Insight card skeletons */}
                                    {[
                                        { title: 'Summary', lines: 3, icon: '📝' },
                                        { title: 'Key Points', lines: 4, icon: '🎯' },
                                        { title: 'Topics', lines: 3, icon: '🏷️' },
                                    ].map((card, i) => (
                                        <div
                                            key={card.title}
                                            className="bg-white rounded-2xl border border-zinc-200 p-4 animate-in fade-in slide-in-from-right-4"
                                            style={{ animationDelay: `${i * 100}ms` }}
                                        >
                                            <div className="flex items-center gap-2 mb-3">
                                                <span className="text-sm">{card.icon}</span>
                                                <div className="h-4 w-20 bg-zinc-200 rounded animate-pulse" />
                                            </div>
                                            <div className="space-y-2">
                                                {Array.from({ length: card.lines }).map((_, j) => (
                                                    <div
                                                        key={j}
                                                        className="h-3 bg-zinc-100 rounded animate-pulse"
                                                        style={{ width: `${60 + Math.random() * 40}%`, animationDelay: `${j * 150}ms` }}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    ))}

                                    {/* Loading text */}
                                    <div className="text-center mt-6">
                                        <p className="text-sm text-zinc-500 animate-pulse">
                                            AI is analyzing the content...
                                        </p>
                                    </div>
                                </div>
                            )}

                            {summaryError && !summaryLoading && (
                                // Error State - New Design
                                <div className="bg-gradient-to-br from-red-50 to-orange-50 dark:from-red-950/20 dark:to-orange-950/20 rounded-3xl border border-red-100 dark:border-red-900/30 p-6">
                                    <div className="text-center">
                                        <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 text-white shadow-lg mb-4">
                                            <X className="h-7 w-7" />
                                        </div>
                                        <h3 className="text-base font-bold text-red-900 dark:text-red-100 mb-2">
                                            Analysis Failed
                                        </h3>
                                        <p className="text-sm text-red-600 dark:text-red-300 mb-6 max-w-[280px] mx-auto leading-relaxed">
                                            {summaryError}
                                        </p>
                                        <button
                                            onClick={handleGenerateSummary}
                                            className="h-10 px-6 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-xl font-medium text-sm shadow-lg shadow-red-500/30 transition-all flex items-center gap-2 mx-auto"
                                        >
                                            <Loader2 className="h-4 w-4" />
                                            Try Again
                                        </button>
                                    </div>
                                </div>
                            )}

                            {summary && !summaryLoading && (
                                // New Insight Cards Design
                                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                                    {/* Header with actions */}
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="flex items-center gap-3">
                                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
                                                <Sparkles className="h-5 w-5 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-bold text-zinc-900">AI Insights</h3>
                                                <p className="text-[10px] text-zinc-500">Generated by Claude</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <button
                                                onClick={() => {
                                                    navigator.clipboard.writeText(summary)
                                                    toast.success('Copied to clipboard')
                                                }}
                                                className="h-8 w-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-colors"
                                                title="Copy all"
                                            >
                                                <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                </svg>
                                            </button>
                                            <button
                                                onClick={handleGenerateSummary}
                                                className="h-8 w-8 rounded-lg hover:bg-zinc-100 flex items-center justify-center text-zinc-400 hover:text-zinc-600 transition-colors"
                                                title="Regenerate"
                                            >
                                                <Loader2 className="h-4 w-4" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Insight Cards */}
                                    <div className="space-y-3">
                                        {/* Summary Card */}
                                        <div className="group bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-950/30 dark:to-purple-950/30 rounded-2xl border border-violet-100 dark:border-violet-900/30 overflow-hidden transition-all hover:shadow-lg hover:shadow-violet-500/10">
                                            <div className="p-4">
                                                <div className="flex items-center justify-between mb-3">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-7 w-7 rounded-lg bg-violet-500 flex items-center justify-center">
                                                            <span className="text-white text-sm">📝</span>
                                                        </div>
                                                        <span className="text-sm font-semibold text-violet-900 dark:text-violet-100">Summary</span>
                                                    </div>
                                                    <button
                                                        onClick={() => {
                                                            // Extract summary paragraph (first paragraph before list or heading)
                                                            const firstParagraph = summary.split(/\n\n|\n#|\n-/)[0]?.trim() || summary
                                                            navigator.clipboard.writeText(firstParagraph)
                                                            toast.success('Summary copied')
                                                        }}
                                                        className="h-7 w-7 rounded-lg hover:bg-violet-200/50 flex items-center justify-center text-violet-400 hover:text-violet-600 opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    </button>
                                                </div>
                                                <div className="text-sm text-violet-800 dark:text-violet-200 leading-relaxed prose prose-sm prose-violet dark:prose-invert">
                                                    {summary.split('\n\n')[0]?.replace(/^#+\s.*$/gm, '').trim() || summary}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Key Points Card */}
                                        {summary.includes('-') && (
                                            <div className="group bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/30 overflow-hidden transition-all hover:shadow-lg hover:shadow-emerald-500/10">
                                                <div className="p-4">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <div className="flex items-center gap-2">
                                                            <div className="h-7 w-7 rounded-lg bg-emerald-500 flex items-center justify-center">
                                                                <span className="text-white text-sm">🎯</span>
                                                            </div>
                                                            <span className="text-sm font-semibold text-emerald-900 dark:text-emerald-100">Key Points</span>
                                                        </div>
                                                        <button
                                                            onClick={() => {
                                                                // Extract list items
                                                                const listMatch = summary.match(/(?:^|\n)(?:-\s+(.+?)$|\d+\.\s+(.+?)$)/gm)
                                                                const points = listMatch ? listMatch.map(m => m.replace(/^[-\d.]+\s+/, '')).join('\n') : ''
                                                                navigator.clipboard.writeText(points)
                                                                toast.success('Key points copied')
                                                            }}
                                                            className="h-7 w-7 rounded-lg hover:bg-emerald-200/50 flex items-center justify-center text-emerald-400 hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-all"
                                                        >
                                                            <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                            </svg>
                                                        </button>
                                                    </div>
                                                    <ul className="space-y-2">
                                                        {summary.match(/(?:^|\n)(?:-\s+(.+?)$|\d+\.\s+(.+?)$)/gm)?.slice(0, 5).map((point, i) => (
                                                            <li key={i} className="flex items-start gap-2 text-sm text-emerald-800 dark:text-emerald-200">
                                                                <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5" />
                                                                <span className="flex-1">{point.replace(/^[-\d.]+\s+/, '')}</span>
                                                            </li>
                                                        ))}
                                                    </ul>
                                                </div>
                                            </div>
                                        )}

                                        {/* Topics/Sentiment Card */}
                                        <div className="group bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 rounded-2xl border border-amber-100 dark:border-amber-900/30 overflow-hidden transition-all hover:shadow-lg hover:shadow-amber-500/10">
                                            <div className="p-4">
                                                <div className="flex items-center gap-2 mb-3">
                                                    <div className="h-7 w-7 rounded-lg bg-amber-500 flex items-center justify-center">
                                                        <span className="text-white text-sm">💡</span>
                                                    </div>
                                                    <span className="text-sm font-semibold text-amber-900 dark:text-amber-100">Quick Actions</span>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <button
                                                        onClick={() => {
                                                            handleGenerateSummary()
                                                            toast.info('Regenerating insights...')
                                                        }}
                                                        className="h-10 px-3 rounded-xl bg-white dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors flex items-center justify-center gap-1.5"
                                                    >
                                                        <Loader2 className="h-3 w-3" />
                                                        Regenerate
                                                    </button>
                                                    <button
                                                        onClick={() => {
                                                            navigator.clipboard.writeText(summary)
                                                            toast.success('All insights copied')
                                                        }}
                                                        className="h-10 px-3 rounded-xl bg-white dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 text-xs font-medium text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/30 transition-colors flex items-center justify-center gap-1.5"
                                                    >
                                                        <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                        Copy All
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                                                    {/* Notes Tab */}
                                                    {activeTab === 'notes' && (
                                                        <div className="p-5">
                                                            {notesLoading && (
                                                                <div className="flex items-center justify-center py-16">
                                                                    <Loader2 className="h-6 w-6 text-zinc-300 animate-spin" />
                                                                </div>
                                                            )}

                                                            {!notesLoading && notes.length > 0 && (
                                                                <div className="space-y-1">
                                                                    {notes.map(note => (
                                                                        <div
                                                                            key={note.id}
                                                                            id={`note-${note.id}`}
                                                                        >
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
                                                                <div className="flex flex-col items-center justify-center text-center py-16">
                                                                    <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 border border-amber-200 flex items-center justify-center mb-5">
                                                                        <StickyNote className="h-8 w-8 text-amber-500" />
                                                                    </div>
                                                                    <h3 className="text-sm font-bold text-zinc-900 mb-2">
                                                                        No Notes Yet
                                                                    </h3>
                                                                    <p className="text-sm text-zinc-500 max-w-[200px] leading-relaxed mb-4">
                                                                        {currentUserId
                                                                            ? 'Select any text in the tweet to add your first note'
                                                                            : 'Log in to add notes to this tweet'}
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
