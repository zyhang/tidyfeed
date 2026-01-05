'use client';

export const runtime = 'edge';

import React, { useState, useEffect, useRef, useCallback, useMemo, memo, forwardRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, X, Loader2, ChevronLeft, StickyNote, Plus, MessageSquarePlus, FileText, Brain, BookMarked } from 'lucide-react';
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

// Memoized snapshot content component - only re-renders when html or panelWidth changes
const SnapshotContent = memo(
    React.forwardRef<HTMLDivElement, { html: string; panelWidth: number }>(
        ({ html, panelWidth }, ref) => (
            <div
                ref={ref}
                className={`
                    transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                    min-h-screen
                `}
                style={{ marginRight: `${panelWidth}px` }}
                dangerouslySetInnerHTML={{ __html: html }}
            />
        )
    )
);
SnapshotContent.displayName = 'SnapshotContent';

type PanelSection = 'content' | 'insights' | 'notes' | 'all';

export default function SnapshotViewerPage() {
    const params = useParams();
    const router = useRouter();
    const tweetId = params.id as string;
    const contentRef = useRef<HTMLDivElement>(null);

    const [snapshotHtml, setSnapshotHtml] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Panel state - 'all' shows both insights and notes
    const [showPanel, setShowPanel] = useState(false);
    const [panelSection, setPanelSection] = useState<PanelSection>('all');

    // AI Summary state
    const [summary, setSummary] = useState<string | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState<string | null>(null);

    // Notes state
    const [notes, setNotes] = useState<Note[]>([]);
    const [notesLoading, setNotesLoading] = useState(false);
    const [isOwner, setIsOwner] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    // Text selection state
    const [selection, setSelection] = useState<SelectionInfo | null>(null);
    const [showNoteInput, setShowNoteInput] = useState(false);
    const [noteInput, setNoteInput] = useState('');
    const [isCreatingNote, setIsCreatingNote] = useState(false);

    // Delete dialog state
    const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
    const [noteToDelete, setNoteToDelete] = useState<number | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    // Highlighted note state
    const [highlightedNoteId, setHighlightedNoteId] = useState<number | null>(null);
    const selectionRangeRef = useRef<Range | null>(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app';

    // Calculate panel width based on section
    const getPanelWidth = () => {
        if (!showPanel) return 0;
        if (panelSection === 'content') return 0;
        if (panelSection === 'all') return 480; // Wider panel for both sections
        return 400; // Single section panel
    };

    const panelWidth = getPanelWidth();

    // Fetch snapshot HTML on mount
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

    // Fetch notes on mount
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

    // Generate AI Summary
    const handleGenerateSummary = async () => {
        if (summaryLoading) return;

        setSummaryLoading(true);
        setSummaryError(null);
        setShowPanel(true);
        setPanelSection('all');

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

    // Handle text selection - show floating action button
    const handleMouseUp = useCallback((e: MouseEvent) => {
        // Ignore if clicking on our UI elements - preserve existing selection
        const target = e.target as HTMLElement;
        if (target.closest('.note-action-btn') || target.closest('.note-input-popup') || target.closest('.sidebar-panel')) {
            return; // Don't touch selection state at all
        }

        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || !sel.toString().trim()) {
            // Only clear selection if not clicking on note UI
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

        // Check if selection is within the snapshot content
        const range = sel.getRangeAt(0);
        const container = contentRef.current;
        if (!container || !container.contains(range.commonAncestorContainer)) {
            setSelection(null);
            return;
        }

        // Persist the DOM range so we can re-apply a highlight even after focus moves
        selectionRangeRef.current = range.cloneRange();

        const rect = range.getBoundingClientRect();

        // Calculate text offset (simplified - using character position in text content)
        const textContent = container.textContent || '';
        const offsetStart = textContent.indexOf(text);
        const offsetEnd = offsetStart + text.length;

        setSelection({
            text,
            offsetStart,
            offsetEnd,
            rect,
        });
        setShowNoteInput(false); // Reset input state when new selection
        setNoteInput('');
    }, []);

    // Add event listeners
    useEffect(() => {
        document.addEventListener('mouseup', handleMouseUp);
        return () => {
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseUp]);

    // Create note
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
                setPanelSection('all');
                // Clear browser selection
                window.getSelection()?.removeAllRanges();
                // Re-fetch to update isOwner status
                fetchNotes();
            } else if (response.status === 401) {
                router.push('/login');
            } else if (response.status === 403) {
                // User is not the owner
                alert('You can only add notes to your own saved posts.');
            }
        } catch (err) {
            console.error('Failed to create note:', err);
        } finally {
            setIsCreatingNote(false);
        }
    };

    // Edit note
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

    // Delete note
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

    // Handle clicking on a highlighted note
    const handleHighlightClick = (note: Note) => {
        setHighlightedNoteId(note.id);
        setShowPanel(true);
        setPanelSection('all');
        // Scroll to note in sidebar after a short delay
        setTimeout(() => {
            const noteElement = document.getElementById(`note-${note.id}`);
            noteElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
    };

    // Apply highlighting to snapshot content - memoized to prevent re-computation on unrelated state changes
    const highlightedHtml = useMemo(() => {
        if (notes.length === 0 || !snapshotHtml) return snapshotHtml;

        // Create a temporary DOM to manipulate
        const parser = new DOMParser();
        const doc = parser.parseFromString(snapshotHtml, 'text/html');
        const body = doc.body;

        // Get text content and find positions
        const walker = document.createTreeWalker(body, NodeFilter.SHOW_TEXT, null);
        const textNodes: Text[] = [];
        let node: Node | null;
        while ((node = walker.nextNode())) {
            textNodes.push(node as Text);
        }

        // Build full text content with node mapping
        let fullText = '';
        const nodeMapping: { node: Text; start: number; end: number }[] = [];
        for (const textNode of textNodes) {
            const start = fullText.length;
            fullText += textNode.textContent || '';
            nodeMapping.push({ node: textNode, start, end: fullText.length });
        }

        // Apply highlights in reverse order to not mess up offsets
        const sortedNotes = [...notes]
            .filter(n => n.selected_text && n.selected_text.length > 0)
            .sort((a, b) => {
                // Find position of selected text in full text
                const posA = fullText.indexOf(a.selected_text);
                const posB = fullText.indexOf(b.selected_text);
                return posB - posA; // Reverse order
            });

        for (const note of sortedNotes) {
            const textToFind = note.selected_text;
            const pos = fullText.indexOf(textToFind);
            if (pos === -1) continue;

            // Find which text nodes contain this range
            const startPos = pos;
            const endPos = pos + textToFind.length;

            for (const mapping of nodeMapping) {
                if (mapping.end <= startPos || mapping.start >= endPos) continue;

                // This node contains part of the highlight
                const nodeText = mapping.node.textContent || '';
                const localStart = Math.max(0, startPos - mapping.start);
                const localEnd = Math.min(nodeText.length, endPos - mapping.start);

                if (localStart >= localEnd) continue;

                // Split the text node and wrap the highlighted part
                const before = nodeText.slice(0, localStart);
                const highlighted = nodeText.slice(localStart, localEnd);
                const after = nodeText.slice(localEnd);

                const wrapper = doc.createElement('span');
                wrapper.className = 'note-highlight';
                wrapper.setAttribute('data-note-id', note.id.toString());
                wrapper.textContent = highlighted;

                const parent = mapping.node.parentNode;
                if (!parent) continue;

                const fragment = doc.createDocumentFragment();
                if (before) fragment.appendChild(doc.createTextNode(before));
                fragment.appendChild(wrapper);
                if (after) fragment.appendChild(doc.createTextNode(after));

                parent.replaceChild(fragment, mapping.node);
                break; // Only highlight first occurrence
            }
        }

        // Add highlight styles
        const style = doc.createElement('style');
        style.textContent = `
            .note-highlight {
                background: linear-gradient(to bottom, rgba(147, 51, 234, 0.15) 0%, rgba(147, 51, 234, 0.25) 100%);
                border-bottom: 2px solid rgba(147, 51, 234, 0.4);
                cursor: pointer;
                transition: all 0.2s ease;
                padding: 1px 0;
            }
            .note-highlight:hover {
                background: linear-gradient(to bottom, rgba(147, 51, 234, 0.25) 0%, rgba(147, 51, 234, 0.35) 100%);
                border-bottom-color: rgba(147, 51, 234, 0.6);
            }
        `;
        doc.head.appendChild(style);

        return doc.documentElement.outerHTML;
    }, [snapshotHtml, notes]);

    // Handle clicks on highlighted text
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

    // Keep the user's selection visually highlighted even after focus moves to the note UI
    useEffect(() => {
        const container = contentRef.current;
        if (!container) return;

        // Ensure highlight styles exist once
        const STYLE_ID = 'active-selection-style';
        if (!document.getElementById(STYLE_ID)) {
            const styleEl = document.createElement('style');
            styleEl.id = STYLE_ID;
            styleEl.textContent = `
                .active-selection {
                    background: linear-gradient(to bottom, rgba(104, 117, 245, 0.12) 0%, rgba(104, 117, 245, 0.24) 100%);
                    border-bottom: 2px solid rgba(104, 117, 245, 0.4);
                    border-radius: 2px;
                    padding: 1px 0;
                    transition: background 0.2s ease;
                }
            `;
            document.head.appendChild(styleEl);
        }

        // Cleanup any existing active selection spans
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

        // Apply a persistent wrapper around the selected range
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
            <div className="min-h-screen bg-[#f7f9f9] flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-zinc-400 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#f7f9f9] flex items-center justify-center">
                <p className="text-zinc-500 text-sm font-medium">{error}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f7f9f9] relative overflow-hidden">
            {/* Section Toggle Buttons - Floating Top Right */}
            <div className="fixed top-6 right-6 z-50 flex items-center gap-2">
                {/* Content Focus Button */}
                <button
                    onClick={() => {
                        setShowPanel(false);
                        setPanelSection('content');
                    }}
                    title="Content Only"
                    className={`
                        h-11 px-4 rounded-xl shadow-lg font-medium text-sm
                        flex items-center gap-2 transition-all duration-200
                        border
                        ${!showPanel
                            ? 'bg-zinc-900 text-white border-zinc-800'
                            : 'bg-white/90 backdrop-blur-sm text-zinc-600 border-zinc-200/80 hover:text-zinc-900 hover:bg-white'
                        }
                    `}
                >
                    <FileText className="h-4 w-4" />
                    <span>Content</span>
                </button>

                {/* AI Insights Button */}
                <button
                    onClick={() => {
                        setShowPanel(true);
                        setPanelSection('insights');
                        if (!summary && !summaryLoading) {
                            handleGenerateSummary();
                        }
                    }}
                    title="AI Insights"
                    disabled={summaryLoading}
                    className={`
                        h-11 px-4 rounded-xl shadow-lg font-medium text-sm
                        flex items-center gap-2 transition-all duration-200
                        border
                        ${showPanel && panelSection === 'insights'
                            ? 'bg-violet-600 text-white border-violet-500'
                            : summary && !summaryLoading
                                ? 'bg-violet-50/90 text-violet-700 border-violet-200 hover:bg-violet-100'
                                : 'bg-white/90 backdrop-blur-sm text-zinc-600 border-zinc-200/80 hover:text-violet-600 hover:bg-violet-50'
                        }
                        ${summaryLoading ? 'cursor-wait opacity-80' : 'cursor-pointer hover:scale-105 active:scale-95'}
                    `}
                >
                    {summaryLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Brain className="h-4 w-4" />
                    )}
                    <span className="hidden sm:inline">Insights</span>
                </button>

                {/* Notes Button */}
                <button
                    onClick={() => {
                        setShowPanel(true);
                        setPanelSection('notes');
                    }}
                    title="Notes"
                    className={`
                        h-11 px-4 rounded-xl shadow-lg font-medium text-sm
                        flex items-center gap-2 transition-all duration-200
                        border relative
                        ${showPanel && panelSection === 'notes'
                            ? 'bg-violet-600 text-white border-violet-500'
                            : notes.length > 0
                                ? 'bg-violet-50/90 text-violet-700 border-violet-200 hover:bg-violet-100'
                                : 'bg-white/90 backdrop-blur-sm text-zinc-600 border-zinc-200/80 hover:text-violet-600 hover:bg-violet-50'
                        }
                        cursor-pointer hover:scale-105 active:scale-95
                    `}
                >
                    <StickyNote className="h-4 w-4" />
                    <span className="hidden sm:inline">Notes</span>
                    {notes.length > 0 && (
                        <span className="absolute -top-1 -right-1 h-5 min-w-5 px-1.5 rounded-full text-[11px] font-semibold flex items-center justify-center bg-violet-500 text-white">
                            {notes.length}
                        </span>
                    )}
                </button>

                {/* All Sections Button */}
                <button
                    onClick={() => {
                        setShowPanel(true);
                        setPanelSection('all');
                        if (!summary && !summaryLoading) {
                            handleGenerateSummary();
                        }
                    }}
                    title="View All Sections"
                    disabled={summaryLoading}
                    className={`
                        h-11 w-11 rounded-xl shadow-lg
                        flex items-center justify-center
                        transition-all duration-200
                        border
                        ${showPanel && panelSection === 'all'
                            ? 'bg-zinc-900 text-white border-zinc-800'
                            : 'bg-white/90 backdrop-blur-sm text-zinc-600 border-zinc-200/80 hover:text-zinc-900 hover:bg-white'
                        }
                        ${summaryLoading ? 'cursor-wait opacity-80' : 'cursor-pointer hover:scale-105 active:scale-95'}
                    `}
                >
                    {summaryLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <Sparkles className="h-4 w-4" />
                    )}
                </button>
            </div>

            {/* Floating Action Button for Text Selection */}
            {selection && currentUserId && (
                <button
                    onMouseDown={(e) => e.preventDefault()} // Prevent losing text selection
                    onClick={() => setShowNoteInput(true)}
                    tabIndex={-1} // Prevent focus from stealing selection
                    className="note-action-btn fixed z-[70] h-10 w-10 bg-violet-600 text-white rounded-full shadow-lg flex items-center justify-center hover:bg-violet-700 hover:scale-110 transition-all duration-200 animate-in fade-in zoom-in-50"
                    style={{
                        top: selection.rect.top + window.scrollY - 48,
                        left: selection.rect.left + selection.rect.width / 2 - 20,
                    }}
                    title="Add a note"
                >
                    <MessageSquarePlus className="h-5 w-5" />
                </button>
            )}

            {/* Note Input Popup (shown after clicking action button) */}
            {selection && showNoteInput && currentUserId && (
                <div
                    className="note-input-popup fixed z-[80] bg-white rounded-xl shadow-2xl border border-zinc-200 p-4 w-[340px] animate-in fade-in slide-in-from-top-2 duration-200"
                    style={{
                        top: selection.rect.bottom + window.scrollY + 12,
                        left: Math.max(12, Math.min(selection.rect.left + selection.rect.width / 2 - 170, window.innerWidth - 352)),
                    }}
                >
                    {/* Close button */}
                    <button
                        onClick={() => {
                            setShowNoteInput(false);
                            setSelection(null);
                            setNoteInput('');
                            window.getSelection()?.removeAllRanges();
                        }}
                        className="absolute top-3 right-3 h-6 w-6 rounded-full flex items-center justify-center hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                        <X className="h-3.5 w-3.5" />
                    </button>

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
                        className="w-full px-3 py-2.5 text-[14px] text-zinc-800 bg-zinc-50 border border-zinc-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300 placeholder:text-zinc-400"
                    />
                    <div className="mt-3 flex items-center justify-between">
                        <span className="text-[11px] text-zinc-400">Press Enter to save, Esc to cancel</span>
                        <button
                            onClick={handleCreateNote}
                            disabled={!noteInput.trim() || isCreatingNote}
                            className="h-8 px-4 text-[13px] font-medium bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                        >
                            {isCreatingNote ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <Plus className="h-3.5 w-3.5" />
                            )}
                            Add Note
                        </button>
                    </div>
                </div>
            )}

            {/* Snapshot Content Container - memoized to prevent selection loss */}
            <SnapshotContent
                ref={contentRef}
                html={highlightedHtml}
                panelWidth={panelWidth}
            />

            {/* Side Panel */}
            <div
                className={`
                    sidebar-panel fixed top-0 right-0 h-full z-40
                    bg-white/98 backdrop-blur-2xl border-l border-zinc-200/40
                    shadow-2xl shadow-zinc-900/8
                    flex flex-col
                    transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                `}
                style={{
                    width: `${panelWidth}px`,
                    transform: showPanel ? 'translateX(0)' : 'translateX(100%)'
                }}
            >
                {/* Panel Header */}
                <div className="border-b border-zinc-100 bg-white/50 backdrop-blur-md sticky top-0 z-10">
                    <div className="h-14 px-5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            {panelSection === 'all' && (
                                <>
                                    <BookMarked className="h-4 w-4 text-violet-600" />
                                    <h2 className="font-semibold text-[14px] text-zinc-900 tracking-tight">
                                        All Sections
                                    </h2>
                                </>
                            )}
                            {panelSection === 'insights' && (
                                <>
                                    <Brain className="h-4 w-4 text-violet-600" />
                                    <h2 className="font-semibold text-[14px] text-zinc-900 tracking-tight">
                                        AI Insights
                                    </h2>
                                </>
                            )}
                            {panelSection === 'notes' && (
                                <>
                                    <StickyNote className="h-4 w-4 text-violet-600" />
                                    <h2 className="font-semibold text-[14px] text-zinc-900 tracking-tight">
                                        Notes {notes.length > 0 && `(${notes.length})`}
                                    </h2>
                                </>
                            )}
                        </div>
                        <button
                            onClick={() => setShowPanel(false)}
                            className="h-7 w-7 rounded-full flex items-center justify-center hover:bg-zinc-100/80 text-zinc-400 hover:text-zinc-600 transition-colors"
                        >
                            <X className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>

                {/* Panel Content */}
                <div className="flex-1 overflow-y-auto ai-summary-scrollbar">
                    {/* Show both sections in 'all' mode */}
                    {panelSection === 'all' && (
                        <div className="divide-y divide-zinc-100">
                            {/* AI Insights Section */}
                            <div className="px-5 py-6">
                                {/* Loading State */}
                                {summaryLoading && (
                                    <div className="flex flex-col items-center justify-center py-12 space-y-3">
                                        <div className="relative">
                                            <div className="h-10 w-10 rounded-xl bg-violet-50 flex items-center justify-center animate-pulse">
                                                <Brain className="h-5 w-5 text-violet-400" />
                                            </div>
                                            <div className="absolute -bottom-1 -right-1 h-3 w-3 bg-white rounded-full flex items-center justify-center shadow-sm">
                                                <Loader2 className="h-2 w-2 text-violet-600 animate-spin" />
                                            </div>
                                        </div>
                                        <div className="text-center space-y-1">
                                            <p className="text-sm font-medium text-zinc-800">Analyzing content...</p>
                                            <p className="text-xs text-zinc-400">Extracting key insights</p>
                                        </div>
                                    </div>
                                )}

                                {/* Error State */}
                                {summaryError && !summaryLoading && (
                                    <div className="rounded-xl bg-red-50/50 border border-red-100 p-3 flex items-start gap-2">
                                        <div className="h-5 w-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                            <X className="h-3 w-3 text-red-600" />
                                        </div>
                                        <div>
                                            <h3 className="text-sm font-semibold text-red-900 mb-1">Analysis Failed</h3>
                                            <p className="text-[13px] text-red-600 leading-relaxed">{summaryError}</p>
                                        </div>
                                    </div>
                                )}

                                {/* Summary Content */}
                                {summary && !summaryLoading && (
                                    <div className="content-appear">
                                        <ReactMarkdown
                                            components={{
                                                p: ({ children }) => (
                                                    <p className="text-[14px] leading-[1.8] text-zinc-700 mb-4 last:mb-0">{children}</p>
                                                ),
                                                strong: ({ children }) => (
                                                    <strong className="font-semibold text-zinc-900">{children}</strong>
                                                ),
                                                em: ({ children }) => (
                                                    <em className="text-zinc-600 not-italic font-medium">{children}</em>
                                                ),
                                                ul: ({ children }) => (
                                                    <ul className="space-y-2 mb-4 pl-0">{children}</ul>
                                                ),
                                                ol: ({ children }) => (
                                                    <ol className="space-y-2 mb-4 list-none ml-0">{children}</ol>
                                                ),
                                                li: ({ children }) => (
                                                    <li className="flex gap-2 text-[14px] leading-[1.7] text-zinc-700">
                                                        <span className="flex-shrink-0 mt-[7px] w-1.5 h-1.5 rounded-full bg-violet-400/60"></span>
                                                        <span className="flex-1">{children}</span>
                                                    </li>
                                                ),
                                                h2: ({ children }) => (
                                                    <h2 className="text-[15px] font-bold text-zinc-900 mt-5 mb-3 tracking-tight">
                                                        {children}
                                                    </h2>
                                                ),
                                                h3: ({ children }) => (
                                                    <h3 className="text-[14px] font-semibold text-zinc-900 mt-4 mb-2">{children}</h3>
                                                ),
                                                blockquote: ({ children }) => (
                                                    <blockquote className="border-l-[3px] border-violet-300 pl-3 py-2 my-4 text-zinc-600 text-[14px] leading-[1.7] bg-violet-50/30 rounded-r-lg">
                                                        {children}
                                                    </blockquote>
                                                ),
                                                a: ({ href, children }) => (
                                                    <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:text-violet-700 underline underline-offset-2 decoration-violet-200/80 hover:decoration-violet-400 transition-colors">
                                                        {children}
                                                    </a>
                                                ),
                                                code: ({ children }) => (
                                                    <code className="bg-zinc-100/80 px-2 py-1 rounded-md text-[13px] font-mono text-zinc-800 border border-zinc-200/40">{children}</code>
                                                ),
                                            }}
                                        >{summary}</ReactMarkdown>
                                    </div>
                                )}

                                {/* Empty State */}
                                {!summary && !summaryLoading && !summaryError && (
                                    <div className="flex flex-col items-center justify-center text-center py-12">
                                        <button
                                            onClick={handleGenerateSummary}
                                            className="h-12 w-12 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 mb-3"
                                        >
                                            <Brain className="h-6 w-6 text-white" />
                                        </button>
                                        <p className="text-sm font-medium text-zinc-900 mb-1">Generate AI Insights</p>
                                        <p className="text-xs text-zinc-500 max-w-[180px] leading-relaxed">
                                            Get an AI-powered summary of this content
                                        </p>
                                    </div>
                                )}
                            </div>

                            {/* Notes Section */}
                            <div className="px-5 py-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="h-7 w-7 rounded-lg bg-violet-50 flex items-center justify-center">
                                        <StickyNote className="h-3.5 w-3.5 text-violet-600" />
                                    </div>
                                    <h3 className="font-semibold text-[13px] text-zinc-900 tracking-tight">
                                        Notes {notes.length > 0 && `(${notes.length})`}
                                    </h3>
                                </div>

                                {/* Loading State */}
                                {notesLoading && (
                                    <div className="flex items-center justify-center py-8">
                                        <Loader2 className="h-5 w-5 text-zinc-400 animate-spin" />
                                    </div>
                                )}

                                {/* Notes List */}
                                {!notesLoading && notes.length > 0 && (
                                    <div className="space-y-3">
                                        {notes.map(note => (
                                            <div
                                                key={note.id}
                                                id={`note-${note.id}`}
                                                className={`transition-all duration-300 ${highlightedNoteId === note.id ? 'ring-2 ring-violet-400 ring-offset-2 rounded-xl' : ''}`}
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

                                {/* Empty State */}
                                {!notesLoading && notes.length === 0 && (
                                    <div className="flex flex-col items-center justify-center text-center py-12">
                                        <div className="h-12 w-12 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-3">
                                            <MessageSquarePlus className="h-6 w-6 text-zinc-300" />
                                        </div>
                                        <p className="text-sm font-medium text-zinc-900 mb-1">No Notes Yet</p>
                                        <p className="text-xs text-zinc-500 max-w-[200px] leading-relaxed">
                                            {currentUserId
                                                ? 'Select text to add notes'
                                                : 'Log in to add notes'}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Show only insights in 'insights' mode */}
                    {panelSection === 'insights' && (
                        <div className="px-6 py-6">
                            {/* Loading State */}
                            {summaryLoading && (
                                <div className="flex flex-col items-center justify-center py-20 space-y-4">
                                    <div className="relative">
                                        <div className="h-12 w-12 rounded-xl bg-violet-50 flex items-center justify-center animate-pulse">
                                            <Brain className="h-6 w-6 text-violet-400" />
                                        </div>
                                        <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-white rounded-full flex items-center justify-center shadow-sm">
                                            <Loader2 className="h-2.5 w-2.5 text-violet-600 animate-spin" />
                                        </div>
                                    </div>
                                    <div className="text-center space-y-1">
                                        <p className="text-sm font-medium text-zinc-800">Analyzing content...</p>
                                        <p className="text-xs text-zinc-400">Extracting key insights from the thread</p>
                                    </div>
                                </div>
                            )}

                            {/* Error State */}
                            {summaryError && !summaryLoading && (
                                <div className="rounded-xl bg-red-50/50 border border-red-100 p-4 flex items-start gap-3">
                                    <div className="h-5 w-5 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                                        <X className="h-3 w-3 text-red-600" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-semibold text-red-900 mb-1">Analysis Failed</h3>
                                        <p className="text-[13px] text-red-600 leading-relaxed">{summaryError}</p>
                                    </div>
                                </div>
                            )}

                            {/* Summary Content */}
                            {summary && !summaryLoading && (
                                <div className="content-appear">
                                    <ReactMarkdown
                                        components={{
                                            p: ({ children }) => (
                                                <p className="text-[15px] leading-[1.85] text-zinc-700 mb-5 last:mb-0 font-normal tracking-[0.01em]">{children}</p>
                                            ),
                                            strong: ({ children }) => (
                                                <strong className="font-semibold text-zinc-900">{children}</strong>
                                            ),
                                            em: ({ children }) => (
                                                <em className="text-zinc-600 not-italic font-medium">{children}</em>
                                            ),
                                            ul: ({ children }) => (
                                                <ul className="space-y-3 mb-6 pl-0">{children}</ul>
                                            ),
                                            ol: ({ children }) => (
                                                <ol className="space-y-3 mb-6 list-none ml-0 counter-reset-item">{children}</ol>
                                            ),
                                            li: ({ children }) => (
                                                <li className="flex gap-3 text-[15px] leading-[1.8] text-zinc-700 tracking-[0.01em]">
                                                    <span className="flex-shrink-0 mt-[10px] w-1.5 h-1.5 rounded-full bg-violet-400/60"></span>
                                                    <span className="flex-1">{children}</span>
                                                </li>
                                            ),
                                            h1: ({ children }) => (
                                                <h1 className="text-[20px] font-bold text-zinc-900 mb-5 pb-3 border-b border-zinc-100 tracking-tight">{children}</h1>
                                            ),
                                            h2: ({ children }) => (
                                                <h2 className="text-[16px] font-bold text-zinc-900 mt-8 mb-4 flex items-center gap-2 tracking-tight">
                                                    {children}
                                                </h2>
                                            ),
                                            h3: ({ children }) => (
                                                <h3 className="text-[15px] font-semibold text-zinc-900 mt-6 mb-3">{children}</h3>
                                            ),
                                            blockquote: ({ children }) => (
                                                <blockquote className="border-l-[3px] border-violet-300 pl-4 py-2 my-6 text-zinc-600 text-[15px] leading-[1.85] bg-violet-50/30 rounded-r-xl">
                                                    {children}
                                                </blockquote>
                                            ),
                                            a: ({ href, children }) => (
                                                <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:text-violet-700 underline underline-offset-4 decoration-violet-200/80 hover:decoration-violet-400 transition-colors font-medium">
                                                    {children}
                                                </a>
                                            ),
                                            code: ({ children }) => (
                                                <code className="bg-zinc-100/80 px-2 py-1 rounded-md text-[13px] font-mono text-zinc-800 border border-zinc-200/40">{children}</code>
                                            ),
                                            hr: () => (
                                                <hr className="my-8 border-zinc-100" />
                                            ),
                                        }}
                                    >{summary}</ReactMarkdown>
                                </div>
                            )}

                            {/* Empty State */}
                            {!summary && !summaryLoading && !summaryError && (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-60 mt-12 pb-32">
                                    <div className="h-16 w-16 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-4 rotate-3">
                                        <Brain className="h-8 w-8 text-zinc-300" />
                                    </div>
                                    <p className="text-sm font-medium text-zinc-900 mb-1">Unlock Insights</p>
                                    <p className="text-xs text-zinc-500 max-w-[200px] leading-relaxed">
                                        Get a concise AI-generated summary of this thread and linked content.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Show only notes in 'notes' mode */}
                    {panelSection === 'notes' && (
                        <div className="px-6 py-6">
                            {/* Loading State */}
                            {notesLoading && (
                                <div className="flex items-center justify-center py-12">
                                    <Loader2 className="h-5 w-5 text-zinc-400 animate-spin" />
                                </div>
                            )}

                            {/* Notes List */}
                            {!notesLoading && notes.length > 0 && (
                                <div className="space-y-3">
                                    {notes.map(note => (
                                        <div
                                            key={note.id}
                                            id={`note-${note.id}`}
                                            className={`transition-all duration-300 ${highlightedNoteId === note.id ? 'ring-2 ring-violet-400 ring-offset-2 rounded-xl' : ''}`}
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

                            {/* Empty State */}
                            {!notesLoading && notes.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-60 mt-12 pb-32">
                                    <div className="h-16 w-16 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-4 -rotate-3">
                                        <MessageSquarePlus className="h-8 w-8 text-zinc-300" />
                                    </div>
                                    <p className="text-sm font-medium text-zinc-900 mb-1">No Notes Yet</p>
                                    <p className="text-xs text-zinc-500 max-w-[220px] leading-relaxed">
                                        {currentUserId
                                            ? 'Select any text in the snapshot to add your first note.'
                                            : 'Log in to add notes to this snapshot.'}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Gradient Fade */}
                {((summary && (panelSection === 'insights' || panelSection === 'all')) || (notes.length > 0 && (panelSection === 'notes' || panelSection === 'all'))) && (
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
                )}
            </div>

            {/* Collapsed Panel Toggle */}
            {!showPanel && (summary || notes.length > 0) && (
                <button
                    onClick={() => setShowPanel(true)}
                    className="fixed top-24 right-0 z-40
                               h-10 w-8 bg-white border border-r-0 border-zinc-200
                               rounded-l-lg shadow-md flex items-center justify-center
                               hover:w-10 hover:bg-zinc-50 transition-all duration-200 group"
                >
                    <ChevronLeft className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600" />
                </button>
            )}

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
