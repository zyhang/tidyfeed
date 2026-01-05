'use client';

export const runtime = 'edge';

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, X, Loader2, StickyNote, Plus, MessageSquarePlus, Brain, BookMarked, ChevronRight, PanelRightClose, PanelRightOpen } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import NoteItem from '@/components/NoteItem';
import DeleteConfirmDialog from '@/components/DeleteConfirmDialog';

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
                    transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
                    min-h-screen
                `}
                style={{ marginRight: `${panelWidth}px` }}
                dangerouslySetInnerHTML={{ __html: html }}
            />
        )
    )
);
SnapshotContent.displayName = 'SnapshotContent';

type TabType = 'all' | 'insights' | 'notes';

export default function SnapshotViewerPage() {
    const params = useParams();
    const router = useRouter();
    const tweetId = params.id as string;
    const contentRef = useRef<HTMLDivElement>(null);

    const [snapshotHtml, setSnapshotHtml] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showPanel, setShowPanel] = useState(false);
    const [activeTab, setActiveTab] = useState<TabType>('all');

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
        return 440;
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
        setActiveTab('all');

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
        if (target.closest('.note-action-btn') || target.closest('.note-input-popup') || target.closest('.sidebar-panel')) {
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
                setActiveTab('all');
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
        setActiveTab('all');
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
            const textNodes: Text[] = [];
            let node: Node | null;
            while ((node = walker.nextNode())) {
                textNodes.push(node as Text);
            }
            const fullText = textNodes.map((textNode) => textNode.textContent || '').join('');
            return { textNodes, fullText };
        };

        const { fullText } = buildTextIndex();

        const resolveRange = (note: Note) => {
            const start = note.text_offset_start;
            const end = note.text_offset_end;
            if (typeof start === 'number' && typeof end === 'number' && end > start) {
                return { start, end };
            }

            if (!note.selected_text) return null;
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
            const walker = doc.createTreeWalker(body, NodeFilter.SHOW_TEXT, null);
            let node: Node | null = walker.nextNode();
            let offset = 0;

            while (node) {
                const textNode = node as Text;
                const nodeText = textNode.textContent || '';
                const nodeStart = offset;
                const nodeEnd = offset + nodeText.length;
                const nextNode = walker.nextNode();

                if (nodeEnd > startPos && nodeStart < endPos) {
                    const localStart = Math.max(0, startPos - nodeStart);
                    const localEnd = Math.min(nodeText.length, endPos - nodeStart);

                    if (localStart < localEnd) {
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
                }

                offset = nodeEnd;
                node = nextNode;
            }
        };

        for (const { note, range } of sortedNotes) {
            applyHighlight(note, range.start, range.end);
        }

        const style = doc.createElement('style');
        style.textContent = `
            .note-highlight {
                background: linear-gradient(to bottom, rgba(139, 92, 246, 0.12) 0%, rgba(139, 92, 246, 0.18) 100%);
                border-bottom: 2px solid rgba(139, 92, 246, 0.35);
                cursor: pointer;
                transition: all 0.2s ease;
                padding: 1px 0;
                border-radius: 2px;
            }
            .note-highlight:hover {
                background: linear-gradient(to bottom, rgba(139, 92, 246, 0.18) 0%, rgba(139, 92, 246, 0.25) 100%);
                border-bottom-color: rgba(139, 92, 246, 0.5);
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
                    background: linear-gradient(to bottom, rgba(99, 102, 241, 0.10) 0%, rgba(99, 102, 241, 0.20) 100%);
                    border-bottom: 2px solid rgba(99, 102, 241, 0.35);
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
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-sans">
                <Loader2 className="h-6 w-6 text-zinc-400 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center font-sans">
                <p className="text-zinc-500 text-sm font-medium">{error}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] relative overflow-hidden font-sans">
            {/* Top Control Bar */}
            <div className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-xl border-b border-zinc-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6">
                    <div className="h-14 flex items-center justify-between gap-4">
                        {/* Left - Breadcrumb */}
                        <div className="flex items-center gap-2 text-sm">
                            <button
                                onClick={() => router.push('/dashboard')}
                                className="text-zinc-500 hover:text-zinc-900 transition-colors"
                            >
                                Dashboard
                            </button>
                            <ChevronRight className="h-4 w-4 text-zinc-300" />
                            <span className="text-zinc-900 font-medium">Snapshot</span>
                        </div>

                        {/* Right - Controls */}
                        <div className="flex items-center gap-2">
                            {/* Panel Toggle */}
                            <button
                                onClick={() => setShowPanel(!showPanel)}
                                className={`
                                    h-9 px-4 rounded-xl text-sm font-medium
                                    flex items-center gap-2 transition-all duration-200
                                    border
                                    ${showPanel
                                        ? 'bg-zinc-900 text-white border-zinc-800'
                                        : 'bg-white text-zinc-600 border-zinc-200 hover:text-zinc-900 hover:border-zinc-300'
                                    }
                                `}
                            >
                                {showPanel ? (
                                    <>
                                        <PanelRightClose className="h-4 w-4" />
                                        <span className="hidden sm:inline">Hide Panel</span>
                                    </>
                                ) : (
                                    <>
                                        <PanelRightOpen className="h-4 w-4" />
                                        <span className="hidden sm:inline">Show Panel</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Spacer for fixed header */}
            <div className="h-14" />

            {/* Floating Action Button for Text Selection */}
            {selection && currentUserId && (
                <button
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setShowNoteInput(true)}
                    tabIndex={-1}
                    className="note-action-btn fixed z-[70] h-11 w-11 bg-violet-600 text-white rounded-2xl shadow-lg shadow-violet-600/20 flex items-center justify-center hover:bg-violet-700 hover:shadow-xl hover:shadow-violet-600/30 hover:scale-105 transition-all duration-200 animate-in fade-in zoom-in-50"
                    style={{
                        top: selection.rect.top + window.scrollY - 52,
                        left: selection.rect.left + selection.rect.width / 2 - 22,
                    }}
                    title="Add a note"
                >
                    <MessageSquarePlus className="h-5 w-5" />
                </button>
            )}

            {/* Note Input Popup */}
            {selection && showNoteInput && currentUserId && (
                <div
                    className="note-input-popup fixed z-[80] bg-white rounded-2xl shadow-2xl shadow-zinc-900/10 border border-zinc-200 p-5 w-[380px] animate-in fade-in slide-in-from-top-2 duration-200"
                    style={{
                        top: selection.rect.bottom + window.scrollY + 12,
                        left: Math.max(12, Math.min(selection.rect.left + selection.rect.width / 2 - 190, window.innerWidth - 392)),
                    }}
                >
                    <button
                        onClick={() => {
                            setShowNoteInput(false);
                            setSelection(null);
                            setNoteInput('');
                            window.getSelection()?.removeAllRanges();
                        }}
                        className="absolute top-4 right-4 h-7 w-7 rounded-full flex items-center justify-center hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>

                    <h3 className="text-sm font-semibold text-zinc-900 mb-3">Add Note</h3>
                    <p className="text-xs text-zinc-500 mb-3 line-clamp-2">{selection.text}</p>

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
                        placeholder="Write your note..."
                        className="w-full px-3 py-2.5 text-sm text-zinc-800 bg-zinc-50 border border-zinc-200 rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-300 placeholder:text-zinc-400 transition-all"
                    />
                    <div className="mt-3 flex items-center justify-between">
                        <span className="text-[11px] text-zinc-400">Press Enter to save</span>
                        <button
                            onClick={handleCreateNote}
                            disabled={!noteInput.trim() || isCreatingNote}
                            className="h-9 px-4 text-sm font-medium bg-violet-600 text-white rounded-xl hover:bg-violet-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-sm shadow-violet-600/20"
                        >
                            {isCreatingNote ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <Plus className="h-4 w-4" />
                            )}
                            Save Note
                        </button>
                    </div>
                </div>
            )}

            {/* Snapshot Content Container */}
            <div className="relative">
                <SnapshotContent
                    ref={contentRef}
                    html={highlightedHtml}
                    panelWidth={panelWidth}
                />
            </div>

            {/* Side Panel */}
            <div
                className={`
                    sidebar-panel fixed top-14 right-0 bottom-0 z-40
                    bg-white border-l border-zinc-200
                    shadow-2xl shadow-zinc-900/5
                    flex flex-col
                    transition-all duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
                `}
                style={{
                    width: `${panelWidth}px`,
                    transform: showPanel ? 'translateX(0)' : 'translateX(100%)'
                }}
            >
                {/* Panel Header with Tabs */}
                <div className="border-b border-zinc-100 bg-white/95 backdrop-blur-sm">
                    <div className="px-5 pt-4">
                        {/* Tab Navigation */}
                        <div className="flex gap-1 bg-zinc-100 rounded-xl p-1">
                            <button
                                onClick={() => {
                                    setActiveTab('all');
                                    if (!summary && !summaryLoading) {
                                        handleGenerateSummary();
                                    }
                                }}
                                className={`
                                    flex-1 h-9 px-3 rounded-lg text-sm font-medium
                                    flex items-center justify-center gap-1.5
                                    transition-all duration-200
                                    ${activeTab === 'all'
                                        ? 'bg-white text-zinc-900 shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-700'
                                    }
                                `}
                            >
                                <BookMarked className="h-3.5 w-3.5" />
                                <span>All</span>
                            </button>
                            <button
                                onClick={() => {
                                    setActiveTab('insights');
                                    if (!summary && !summaryLoading) {
                                        handleGenerateSummary();
                                    }
                                }}
                                className={`
                                    flex-1 h-9 px-3 rounded-lg text-sm font-medium
                                    flex items-center justify-center gap-1.5
                                    transition-all duration-200
                                    ${activeTab === 'insights'
                                        ? 'bg-white text-zinc-900 shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-700'
                                    }
                                `}
                            >
                                <Brain className="h-3.5 w-3.5" />
                                <span>Insights</span>
                            </button>
                            <button
                                onClick={() => setActiveTab('notes')}
                                className={`
                                    relative flex-1 h-9 px-3 rounded-lg text-sm font-medium
                                    flex items-center justify-center gap-1.5
                                    transition-all duration-200
                                    ${activeTab === 'notes'
                                        ? 'bg-white text-zinc-900 shadow-sm'
                                        : 'text-zinc-500 hover:text-zinc-700'
                                    }
                                `}
                            >
                                <StickyNote className="h-3.5 w-3.5" />
                                <span>Notes</span>
                                {notes.length > 0 && (
                                    <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full text-[10px] font-semibold flex items-center justify-center bg-violet-500 text-white">
                                        {notes.length}
                                    </span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Panel Content */}
                <div className="flex-1 overflow-y-auto px-5 py-5 bg-zinc-50/50">
                    {(activeTab === 'all' || activeTab === 'insights') && (
                        <div className={activeTab === 'all' ? 'mb-4' : ''}>
                            {/* Bento Card - AI Insights */}
                            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-zinc-100">
                                    <div className="flex items-center gap-2.5">
                                        <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
                                            <Brain className="h-4 w-4 text-white" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-zinc-900">AI Insights</h3>
                                            <p className="text-xs text-zinc-500">Summary & analysis</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5">
                                    {summaryLoading && (
                                        <div className="flex flex-col items-center justify-center py-10 space-y-3">
                                            <div className="relative">
                                                <div className="h-11 w-11 rounded-xl bg-violet-50 flex items-center justify-center">
                                                    <Brain className="h-5.5 w-5.5 text-violet-500 animate-pulse" />
                                                </div>
                                                <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-white rounded-full flex items-center justify-center shadow-sm border border-zinc-100">
                                                    <Loader2 className="h-2.5 w-2.5 text-violet-600 animate-spin" />
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <p className="text-sm font-medium text-zinc-800">Analyzing content...</p>
                                                <p className="text-xs text-zinc-500 mt-1">Extracting key insights</p>
                                            </div>
                                        </div>
                                    )}

                                    {summaryError && !summaryLoading && (
                                        <div className="rounded-xl bg-red-50/80 border border-red-100 p-4">
                                            <div className="flex items-start gap-3">
                                                <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                                                    <X className="h-4 w-4 text-red-600" />
                                                </div>
                                                <div className="flex-1">
                                                    <h3 className="text-sm font-semibold text-red-900 mb-1">Analysis Failed</h3>
                                                    <p className="text-xs text-red-600 leading-relaxed">{summaryError}</p>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {summary && !summaryLoading && (
                                        <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                                            <ReactMarkdown
                                                components={{
                                                    p: ({ children }) => (
                                                        <p className="text-sm leading-[1.75] text-zinc-700 mb-4 last:mb-0">{children}</p>
                                                    ),
                                                    strong: ({ children }) => (
                                                        <strong className="font-semibold text-zinc-900">{children}</strong>
                                                    ),
                                                    em: ({ children }) => (
                                                        <em className="text-zinc-600 font-medium">{children}</em>
                                                    ),
                                                    ul: ({ children }) => (
                                                        <ul className="space-y-2.5 mb-4 pl-0">{children}</ul>
                                                    ),
                                                    ol: ({ children }) => (
                                                        <ol className="space-y-2.5 mb-4 pl-0">{children}</ol>
                                                    ),
                                                    li: ({ children }) => (
                                                        <li className="flex gap-2.5 text-sm leading-[1.7] text-zinc-700">
                                                            <span className="flex-shrink-0 mt-[6px] w-1 h-1 rounded-full bg-violet-400"></span>
                                                            <span className="flex-1">{children}</span>
                                                        </li>
                                                    ),
                                                    h2: ({ children }) => (
                                                        <h2 className="text-sm font-bold text-zinc-900 mt-5 mb-3 flex items-center gap-2">
                                                            {children}
                                                        </h2>
                                                    ),
                                                    h3: ({ children }) => (
                                                        <h3 className="text-sm font-semibold text-zinc-900 mt-4 mb-2">{children}</h3>
                                                    ),
                                                    blockquote: ({ children }) => (
                                                        <blockquote className="border-l-2 border-violet-200 pl-3.5 py-2 my-4 text-zinc-600 text-sm leading-[1.75] bg-violet-50/50 rounded-r-lg">
                                                            {children}
                                                        </blockquote>
                                                    ),
                                                    a: ({ href, children }) => (
                                                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:text-violet-700 underline underline-offset-2 decoration-violet-200 hover:decoration-violet-400 transition-colors font-medium">
                                                            {children}
                                                        </a>
                                                    ),
                                                    code: ({ children }) => (
                                                        <code className="bg-zinc-100 px-2 py-1 rounded-md text-xs font-mono text-zinc-800 border border-zinc-200">{children}</code>
                                                    ),
                                                }}
                                            >{summary}</ReactMarkdown>
                                        </div>
                                    )}

                                    {!summary && !summaryLoading && !summaryError && (
                                        <div className="flex flex-col items-center justify-center text-center py-8">
                                            <button
                                                onClick={handleGenerateSummary}
                                                className="h-13 w-13 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-md hover:shadow-lg hover:scale-105 transition-all duration-200 mb-4"
                                            >
                                                <Sparkles className="h-6 w-6 text-white" />
                                            </button>
                                            <p className="text-sm font-medium text-zinc-900 mb-1">Generate AI Insights</p>
                                            <p className="text-xs text-zinc-500 max-w-[180px] leading-relaxed">
                                                Get an AI-powered summary and analysis
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {(activeTab === 'all' || activeTab === 'notes') && (
                        <div className={activeTab === 'all' ? '' : ''}>
                            {/* Bento Card - Notes */}
                            <div className="bg-white rounded-2xl border border-zinc-200 shadow-sm overflow-hidden">
                                <div className="px-5 py-4 border-b border-zinc-100">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2.5">
                                            <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-sm">
                                                <StickyNote className="h-4 w-4 text-white" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-semibold text-zinc-900">Notes</h3>
                                                <p className="text-xs text-zinc-500">
                                                    {notes.length > 0 ? `${notes.length} note${notes.length > 1 ? 's' : ''}` : 'Add annotations'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-5">
                                    {notesLoading && (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className="h-5 w-5 text-zinc-400 animate-spin" />
                                        </div>
                                    )}

                                    {!notesLoading && notes.length > 0 && (
                                        <div className="space-y-3">
                                            {notes.map(note => (
                                                <div
                                                    key={note.id}
                                                    id={`note-${note.id}`}
                                                    className={`
                                                        transition-all duration-200
                                                        ${highlightedNoteId === note.id ? 'ring-2 ring-violet-400 ring-offset-2 rounded-xl' : ''}
                                                    `}
                                                >
                                                    <NoteItem
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
                                        <div className="flex flex-col items-center justify-center text-center py-8">
                                            <div className="h-13 w-13 rounded-2xl bg-zinc-100 border border-zinc-200 flex items-center justify-center mb-3">
                                                <MessageSquarePlus className="h-6 w-6 text-zinc-400" />
                                            </div>
                                            <p className="text-sm font-medium text-zinc-900 mb-1">No Notes Yet</p>
                                            <p className="text-xs text-zinc-500 max-w-[180px] leading-relaxed">
                                                {currentUserId
                                                    ? 'Select text to add notes'
                                                    : 'Log in to add notes'}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            </div>
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
