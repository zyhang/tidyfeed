'use client';

import { useState } from 'react';
import { Trash2, Pencil, X, Check } from 'lucide-react';

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

interface NoteItemProps {
    note: Note;
    isOwner: boolean;
    onEdit: (id: number, content: string) => Promise<void>;
    onDelete: (id: number) => void;
    onHighlightClick?: (note: Note) => void;
}

function formatRelativeTime(dateStr: string): string {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function NoteItem({ note, isOwner, onEdit, onDelete, onHighlightClick }: NoteItemProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(note.note_content);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!editContent.trim() || editContent === note.note_content) {
            setIsEditing(false);
            setEditContent(note.note_content);
            return;
        }

        setIsSaving(true);
        try {
            await onEdit(note.id, editContent.trim());
            setIsEditing(false);
        } catch {
            // Reset on error
            setEditContent(note.note_content);
        } finally {
            setIsSaving(false);
        }
    };

    const handleCancel = () => {
        setIsEditing(false);
        setEditContent(note.note_content);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSave();
        }
        if (e.key === 'Escape') {
            handleCancel();
        }
    };

    return (
        <div className="group bg-white border border-zinc-100 rounded-xl p-4 hover:border-zinc-200 hover:shadow-sm transition-all duration-200">
            {/* Selected Text Preview */}
            <button
                onClick={() => onHighlightClick?.(note)}
                className="w-full text-left mb-3 pb-3 border-b border-zinc-100"
            >
                <p className="text-[13px] text-zinc-500 leading-relaxed line-clamp-2 italic">
                    "{note.selected_text}"
                </p>
            </button>

            {/* Note Content */}
            {isEditing ? (
                <div className="space-y-2">
                    <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        onKeyDown={handleKeyDown}
                        autoFocus
                        rows={3}
                        className="w-full px-3 py-2 text-[15px] text-zinc-800 bg-zinc-50 border border-zinc-200 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-300"
                        placeholder="Enter your note..."
                    />
                    <div className="flex items-center gap-2 justify-end">
                        <button
                            onClick={handleCancel}
                            disabled={isSaving}
                            className="h-7 px-3 text-xs font-medium text-zinc-500 hover:text-zinc-700 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            disabled={isSaving || !editContent.trim()}
                            className="h-7 px-3 text-xs font-medium bg-violet-600 text-white rounded-md hover:bg-violet-700 disabled:opacity-50 transition-colors flex items-center gap-1"
                        >
                            {isSaving ? (
                                <span className="h-3 w-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <Check className="h-3 w-3" />
                            )}
                            Save
                        </button>
                    </div>
                </div>
            ) : (
                <p className="text-[15px] text-zinc-800 leading-relaxed whitespace-pre-wrap">
                    {note.note_content}
                </p>
            )}

            {/* Footer */}
            <div className="mt-3 flex items-center justify-between">
                <span className="text-[11px] text-zinc-400 font-medium">
                    {formatRelativeTime(note.created_at)}
                </span>

                {isOwner && !isEditing && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={() => setIsEditing(true)}
                            className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors"
                            title="Edit note"
                        >
                            <Pencil className="h-3 w-3" />
                        </button>
                        <button
                            onClick={() => onDelete(note.id)}
                            className="h-6 w-6 flex items-center justify-center rounded-md hover:bg-red-50 text-zinc-400 hover:text-red-500 transition-colors"
                            title="Delete note"
                        >
                            <Trash2 className="h-3 w-3" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
