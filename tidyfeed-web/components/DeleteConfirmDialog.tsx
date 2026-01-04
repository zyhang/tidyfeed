'use client';

import { X, AlertTriangle } from 'lucide-react';

interface DeleteConfirmDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isDeleting?: boolean;
}

export default function DeleteConfirmDialog({
    isOpen,
    onClose,
    onConfirm,
    isDeleting = false
}: DeleteConfirmDialogProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Dialog */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-[360px] overflow-hidden animate-in zoom-in-95 fade-in duration-200">
                {/* Header */}
                <div className="px-6 pt-6 pb-4">
                    <div className="flex items-start gap-4">
                        <div className="h-10 w-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                            <AlertTriangle className="h-5 w-5 text-red-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-[16px] font-semibold text-zinc-900 mb-1">
                                Delete Note
                            </h3>
                            <p className="text-[14px] text-zinc-500 leading-relaxed">
                                Are you sure you want to delete this note? This action cannot be undone.
                            </p>
                        </div>
                        <button
                            onClick={onClose}
                            className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-zinc-100 text-zinc-400 hover:text-zinc-600 transition-colors -mt-1 -mr-1"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Actions */}
                <div className="px-6 pb-6 pt-2 flex items-center gap-3 justify-end">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="h-9 px-4 text-sm font-medium text-zinc-600 hover:text-zinc-800 hover:bg-zinc-100 rounded-lg transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="h-9 px-4 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors flex items-center gap-2"
                    >
                        {isDeleting ? (
                            <>
                                <span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Deleting...
                            </>
                        ) : (
                            'Delete'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
