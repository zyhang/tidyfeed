'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, X, Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import { useParams } from 'next/navigation';

export default function SnapshotViewerPage() {
    const params = useParams();
    const tweetId = params.id as string;

    const [snapshotHtml, setSnapshotHtml] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // AI Summary state
    const [showSummary, setShowSummary] = useState(false);
    const [summary, setSummary] = useState<string | null>(null);
    const [summaryLoading, setSummaryLoading] = useState(false);
    const [summaryError, setSummaryError] = useState<string | null>(null);

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app';

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

    // Generate AI Summary
    const handleGenerateSummary = async () => {
        if (summaryLoading) return;

        setSummaryLoading(true);
        setSummaryError(null);
        setShowSummary(true);

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
                setSummaryError('Please login to use AI Summary');
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

    if (loading) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center">
                <Loader2 className="h-8 w-8 text-white animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-black flex items-center justify-center text-white">
                <p>{error}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-black relative">
            {/* AI Summary Button - Floating */}
            <button
                onClick={handleGenerateSummary}
                className="fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full shadow-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200 hover:scale-105"
            >
                <Sparkles className="h-4 w-4" />
                <span className="font-medium">AI Summary</span>
            </button>

            {/* Snapshot Content */}
            <div
                className={`transition-all duration-300 ${showSummary ? 'mr-96' : ''}`}
                dangerouslySetInnerHTML={{ __html: snapshotHtml }}
            />

            {/* AI Summary Panel - Slide-in from right */}
            <div
                className={`fixed top-0 right-0 h-full w-96 bg-zinc-900 border-l border-zinc-800 shadow-2xl transform transition-transform duration-300 ease-in-out z-40 ${showSummary ? 'translate-x-0' : 'translate-x-full'
                    }`}
            >
                {/* Panel Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-800">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-5 w-5 text-purple-400" />
                        <h2 className="font-semibold text-white">AI Summary</h2>
                    </div>
                    <button
                        onClick={() => setShowSummary(false)}
                        className="p-1 hover:bg-zinc-800 rounded-full transition-colors"
                    >
                        <X className="h-5 w-5 text-zinc-400" />
                    </button>
                </div>

                {/* Panel Content */}
                <div className="p-4 overflow-y-auto h-[calc(100%-64px)]">
                    {summaryLoading && (
                        <div className="flex flex-col items-center justify-center py-12">
                            <Loader2 className="h-8 w-8 text-purple-400 animate-spin mb-4" />
                            <p className="text-zinc-400 text-sm">AI analyzing content...</p>
                        </div>
                    )}

                    {summaryError && (
                        <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-4 text-red-400 text-sm">
                            {summaryError}
                        </div>
                    )}

                    {summary && !summaryLoading && (
                        <div className="prose prose-invert prose-sm max-w-none">
                            <ReactMarkdown>{summary}</ReactMarkdown>
                        </div>
                    )}

                    {!summary && !summaryLoading && !summaryError && (
                        <div className="text-center py-12">
                            <Sparkles className="h-12 w-12 text-zinc-600 mx-auto mb-4" />
                            <p className="text-zinc-500 text-sm">Click the button to generate an AI summary of this tweet.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Toggle button when panel is closed */}
            {!showSummary && summary && (
                <button
                    onClick={() => setShowSummary(true)}
                    className="fixed top-1/2 right-0 transform -translate-y-1/2 z-40 p-2 bg-zinc-800 rounded-l-lg border border-r-0 border-zinc-700 hover:bg-zinc-700 transition-colors"
                >
                    <ChevronLeft className="h-5 w-5 text-zinc-400" />
                </button>
            )}
        </div>
    );
}
