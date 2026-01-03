'use client';

export const runtime = 'edge';

import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, X, Loader2, ChevronLeft } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';

export default function SnapshotViewerPage() {
    const params = useParams();
    const router = useRouter();
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
                // Redirect to login page
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

    if (loading) {
        return (
            <div className="min-h-screen bg-[#f7f9f9] flex items-center justify-center">
                <Loader2 className="h-6 w-6 text-gray-400 animate-spin" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#f7f9f9] flex items-center justify-center">
                <p className="text-gray-500 text-sm">{error}</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f7f9f9] relative">
            {/* AI Summary Button - Tweet Card Style (Circular Icon) */}
            <button
                onClick={handleGenerateSummary}
                disabled={summaryLoading}
                title="AI Summary"
                className={`
                    fixed top-4 right-4 z-50
                    w-10 h-10 rounded-full
                    flex items-center justify-center
                    transition-all duration-200
                    ${summary
                        ? 'bg-violet-100 text-violet-600 hover:bg-violet-200'
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                    }
                    ${summaryLoading ? 'cursor-wait' : 'cursor-pointer'}
                `}
            >
                {summaryLoading ? (
                    <Loader2 className="h-[18px] w-[18px] animate-spin" />
                ) : (
                    <Sparkles className="h-[18px] w-[18px]" />
                )}
            </button>

            {/* Snapshot Content */}
            <div
                className={`transition-all duration-300 ease-out ${showSummary ? 'mr-[380px]' : ''}`}
                dangerouslySetInnerHTML={{ __html: snapshotHtml }}
            />

            {/* AI Summary Panel - Clean Minimal Style */}
            <div
                className={`
                    fixed top-0 right-0 h-full w-[380px]
                    bg-white border-l border-gray-200
                    transform transition-transform duration-300 ease-out z-40
                    ${showSummary ? 'translate-x-0' : 'translate-x-full'}
                `}
            >
                {/* Panel Header - Minimal */}
                <div className="flex items-center justify-between h-14 px-4 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                        <Sparkles className="h-4 w-4 text-violet-500" />
                        <span className="font-medium text-[15px] text-gray-900">AI Summary</span>
                    </div>
                    <button
                        onClick={() => setShowSummary(false)}
                        className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition-colors"
                    >
                        <X className="h-4 w-4 text-gray-400" />
                    </button>
                </div>

                {/* Panel Content */}
                <div className="overflow-y-auto h-[calc(100%-56px)] p-4">
                    {/* Loading State - Simple */}
                    {summaryLoading && (
                        <div className="flex flex-col items-center justify-center py-16">
                            <Loader2 className="h-6 w-6 text-violet-500 animate-spin mb-3" />
                            <p className="text-sm text-gray-500">Analyzing...</p>
                        </div>
                    )}

                    {/* Error State */}
                    {summaryError && (
                        <div className="rounded-lg bg-red-50 p-4">
                            <p className="text-sm text-red-600">{summaryError}</p>
                        </div>
                    )}

                    {/* Summary Content - Clean Typography */}
                    {summary && !summaryLoading && (
                        <div className="space-y-4">
                            <ReactMarkdown
                                components={{
                                    p: ({ children }) => (
                                        <p className="text-[15px] text-gray-700 leading-relaxed">{children}</p>
                                    ),
                                    strong: ({ children }) => (
                                        <strong className="font-semibold text-gray-900">{children}</strong>
                                    ),
                                    ul: ({ children }) => (
                                        <ul className="space-y-2 text-[15px] text-gray-700">{children}</ul>
                                    ),
                                    li: ({ children }) => (
                                        <li className="flex items-start gap-2">
                                            <span className="text-gray-400 mt-1.5">•</span>
                                            <span className="flex-1">{children}</span>
                                        </li>
                                    ),
                                    h1: ({ children }) => (
                                        <h1 className="text-base font-semibold text-gray-900 pb-2 border-b border-gray-100">{children}</h1>
                                    ),
                                    h2: ({ children }) => (
                                        <h2 className="text-[15px] font-semibold text-gray-900 mt-4">{children}</h2>
                                    ),
                                    h3: ({ children }) => (
                                        <h3 className="text-sm font-semibold text-gray-800">{children}</h3>
                                    ),
                                }}
                            >{summary}</ReactMarkdown>
                        </div>
                    )}

                    {/* Empty State */}
                    {!summary && !summaryLoading && !summaryError && (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                            <Sparkles className="h-8 w-8 text-gray-300 mb-3" />
                            <p className="text-sm text-gray-400">
                                Click to generate AI summary
                            </p>
                        </div>
                    )}
                </div>

                {/* Panel Footer - Subtle branding */}
                {summary && !summaryLoading && (
                    <div className="absolute bottom-0 left-0 right-0 px-4 py-3 border-t border-gray-100 bg-gray-50/80">
                        <p className="text-xs text-gray-400 text-center">
                            Powered by TidyFeed AI
                        </p>
                    </div>
                )}
            </div>

            {/* Collapsed Panel Toggle - Minimal */}
            {!showSummary && summary && (
                <button
                    onClick={() => setShowSummary(true)}
                    className="fixed top-1/2 right-0 -translate-y-1/2 z-40 
                               h-12 w-6 bg-white border border-r-0 border-gray-200 
                               rounded-l-md flex items-center justify-center
                               hover:bg-gray-50 transition-colors"
                >
                    <ChevronLeft className="h-4 w-4 text-gray-400" />
                </button>
            )}
        </div>
    );
}
