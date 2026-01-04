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
            {/* AI Summary Trigger Button - Enhanced Animation */}
            <button
                onClick={() => {
                    if (!summary && !summaryLoading) {
                        handleGenerateSummary();
                    } else if (summary) {
                        setShowSummary(!showSummary);
                    }
                }}
                disabled={summaryLoading}
                title={summary ? (showSummary ? "Close Summary" : "View Summary") : "AI Summary"}
                className={`
                    fixed top-6 right-6 z-50
                    h-14 w-14 rounded-2xl shadow-lg
                    flex items-center justify-center
                    transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]
                    border
                    ${summary
                        ? showSummary
                            ? 'bg-zinc-900 text-white border-zinc-800 hover:bg-zinc-800 shadow-zinc-900/20'
                            : 'bg-violet-600 text-white border-violet-500 hover:bg-violet-700 shadow-violet-500/30 sparkle-btn-glow'
                        : 'bg-white/90 backdrop-blur-sm text-zinc-600 border-zinc-200/80 hover:text-violet-600 hover:border-violet-200 hover:shadow-xl'
                    }
                    ${summaryLoading ? 'cursor-wait opacity-90' : 'cursor-pointer active:scale-95'}
                    ${!summaryLoading && !summary ? 'hover:scale-105' : ''}
                `}
            >
                {summaryLoading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                ) : showSummary ? (
                    <X className="h-5 w-5 transition-transform duration-200" />
                ) : (
                    <Sparkles className={`h-5 w-5 transition-all duration-300 ${summary ? 'fill-current' : ''}`} />
                )}
            </button>

            {/* Snapshot Content Container */}
            <div
                className={`
                    transition-all duration-500 ease-[cubic-bezier(0.32,0.72,0,1)]
                    ${showSummary ? 'mr-[440px] opacity-100' : 'mr-0'}
                    min-h-screen
                `}
                dangerouslySetInnerHTML={{ __html: snapshotHtml }}
            />

            {/* AI Summary Panel - Premium Drawer Design with Enhanced Animation */}
            <div
                className={`
                    fixed top-0 right-0 h-full w-[440px] z-40
                    bg-white/98 backdrop-blur-2xl border-l border-zinc-200/40
                    shadow-2xl shadow-zinc-900/8
                    flex flex-col
                    ${showSummary ? 'panel-enter' : 'translate-x-full'}
                `}
            >
                {/* Header */}
                <div className="h-16 px-6 border-b border-zinc-100 flex items-center justify-between bg-white/50 backdrop-blur-md sticky top-0 z-10">
                    <div className="flex items-center gap-2.5">
                        <div className="h-8 w-8 rounded-lg bg-violet-50 flex items-center justify-center">
                            <Sparkles className="h-4 w-4 text-violet-600 fill-violet-600/20" />
                        </div>
                        <div>
                            <h2 className="font-semibold text-[15px] text-zinc-900 tracking-tight leading-none mb-0.5">AI Insights</h2>
                            <p className="text-[11px] text-zinc-500 font-medium">Powered by TidyFeed Setup</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowSummary(false)}
                        className="h-8 w-8 rounded-full flex items-center justify-center hover:bg-zinc-100/80 text-zinc-400 hover:text-zinc-600 transition-colors"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>

                {/* Content Area - Enhanced Typography */}
                <div className="flex-1 overflow-y-auto ai-summary-scrollbar px-10 py-10 pb-36">

                    {/* Loading State - Thinking Animation */}
                    {summaryLoading && (
                        <div className="flex flex-col items-center justify-center py-20 space-y-4">
                            <div className="relative">
                                <div className="h-12 w-12 rounded-xl bg-violet-50 flex items-center justify-center animate-pulse">
                                    <Sparkles className="h-6 w-6 text-violet-400" />
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
                    {summaryError && (
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

                    {/* Summary Content - Optimized Reading Experience */}
                    {summary && !summaryLoading && (
                        <div className="content-appear">
                            <ReactMarkdown
                                components={{
                                    p: ({ children }) => (
                                        <p className="text-[17px] leading-[1.85] text-zinc-700 mb-7 last:mb-0 font-normal tracking-[0.01em]">{children}</p>
                                    ),
                                    strong: ({ children }) => (
                                        <strong className="font-semibold text-zinc-900">{children}</strong>
                                    ),
                                    em: ({ children }) => (
                                        <em className="text-zinc-600 not-italic font-medium">{children}</em>
                                    ),
                                    ul: ({ children }) => (
                                        <ul className="space-y-5 mb-8 pl-0">{children}</ul>
                                    ),
                                    ol: ({ children }) => (
                                        <ol className="space-y-5 mb-8 list-none ml-0 counter-reset-item">{children}</ol>
                                    ),
                                    li: ({ children }) => (
                                        <li className="flex gap-4 text-[17px] leading-[1.8] text-zinc-700 tracking-[0.01em]">
                                            <span className="flex-shrink-0 mt-[11px] w-1.5 h-1.5 rounded-full bg-violet-400/60"></span>
                                            <span className="flex-1">{children}</span>
                                        </li>
                                    ),
                                    h1: ({ children }) => (
                                        <h1 className="text-[22px] font-bold text-zinc-900 mb-7 pb-4 border-b border-zinc-100 tracking-tight">{children}</h1>
                                    ),
                                    h2: ({ children }) => (
                                        <h2 className="text-[18px] font-bold text-zinc-900 mt-12 mb-5 flex items-center gap-2 tracking-tight">
                                            {children}
                                        </h2>
                                    ),
                                    h3: ({ children }) => (
                                        <h3 className="text-[17px] font-semibold text-zinc-900 mt-10 mb-4">{children}</h3>
                                    ),
                                    blockquote: ({ children }) => (
                                        <blockquote className="border-l-[3px] border-violet-300 pl-6 py-3 my-8 text-zinc-600 text-[17px] leading-[1.85] bg-violet-50/30 rounded-r-xl">
                                            {children}
                                        </blockquote>
                                    ),
                                    a: ({ href, children }) => (
                                        <a href={href} target="_blank" rel="noopener noreferrer" className="text-violet-600 hover:text-violet-700 underline underline-offset-4 decoration-violet-200/80 hover:decoration-violet-400 transition-colors font-medium">
                                            {children}
                                        </a>
                                    ),
                                    code: ({ children }) => (
                                        <code className="bg-zinc-100/80 px-2 py-1 rounded-md text-[14px] font-mono text-zinc-800 border border-zinc-200/40">{children}</code>
                                    ),
                                    hr: () => (
                                        <hr className="my-12 border-zinc-100" />
                                    ),
                                }}
                            >{summary}</ReactMarkdown>
                        </div>
                    )}

                    {/* Empty State */}
                    {!summary && !summaryLoading && !summaryError && (
                        <div className="h-full flex flex-col items-center justify-center text-center opacity-60 mt-12 pb-32">
                            <div className="h-16 w-16 rounded-2xl bg-zinc-50 border border-zinc-100 flex items-center justify-center mb-4 rotate-3">
                                <Sparkles className="h-8 w-8 text-zinc-300" />
                            </div>
                            <p className="text-sm font-medium text-zinc-900 mb-1">Unlock Insights</p>
                            <p className="text-xs text-zinc-500 max-w-[200px] leading-relaxed">
                                Get a concise AI-generated summary of this thread and linked content.
                            </p>
                        </div>
                    )}
                </div>

                {/* Footer Gradient Fade */}
                {summary && (
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white to-transparent pointer-events-none z-10" />
                )}
            </div>

            {/* Collapsed Panel Toggle (Visible when panel hidden but summary exists) */}
            {!showSummary && summary && (
                <button
                    onClick={() => setShowSummary(true)}
                    className="fixed top-24 right-0 z-40 
                               h-10 w-8 bg-white border border-r-0 border-zinc-200 
                               rounded-l-lg shadow-md flex items-center justify-center
                               hover:w-10 hover:bg-zinc-50 transition-all duration-200 group"
                >
                    <ChevronLeft className="h-4 w-4 text-zinc-400 group-hover:text-zinc-600" />
                </button>
            )}
        </div>
    );
}
