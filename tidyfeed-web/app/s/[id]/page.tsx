'use client';

export const runtime = 'edge';

import { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { Sparkles, X, Loader2, ChevronLeft, Wand2, Brain, Zap } from 'lucide-react';
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
    const [buttonHovered, setButtonHovered] = useState(false);

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
            <div className="min-h-screen bg-[#f7f9f9] flex items-center justify-center">
                <div className="flex flex-col items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-full border-2 border-gray-200 border-t-blue-500 animate-spin" />
                    </div>
                    <p className="text-sm text-gray-500 font-medium">Loading snapshot...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-[#f7f9f9] flex items-center justify-center">
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 max-w-sm text-center">
                    <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
                        <X className="h-6 w-6 text-red-500" />
                    </div>
                    <p className="text-gray-900 font-medium mb-1">Unable to load</p>
                    <p className="text-gray-500 text-sm">{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#f7f9f9] relative">
            {/* Custom CSS for animations */}
            <style jsx global>{`
                @keyframes shimmer {
                    0% { background-position: -200% 0; }
                    100% { background-position: 200% 0; }
                }
                @keyframes pulse-ring {
                    0% { transform: scale(0.95); opacity: 1; }
                    50% { transform: scale(1.05); opacity: 0.8; }
                    100% { transform: scale(0.95); opacity: 1; }
                }
                @keyframes float {
                    0%, 100% { transform: translateY(0px); }
                    50% { transform: translateY(-3px); }
                }
                @keyframes sparkle {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.6; transform: scale(0.95); }
                }
                @keyframes typing-dot {
                    0%, 60%, 100% { opacity: 0.3; transform: translateY(0); }
                    30% { opacity: 1; transform: translateY(-4px); }
                }
                .ai-button-glow {
                    box-shadow: 0 0 0 0 rgba(139, 92, 246, 0);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .ai-button-glow:hover {
                    box-shadow: 0 8px 30px -8px rgba(139, 92, 246, 0.5),
                                0 0 20px -5px rgba(139, 92, 246, 0.3);
                }
                .panel-slide {
                    transition: transform 0.4s cubic-bezier(0.32, 0.72, 0, 1);
                }
                .content-shift {
                    transition: margin-right 0.4s cubic-bezier(0.32, 0.72, 0, 1);
                }
                .prose-ai h1, .prose-ai h2, .prose-ai h3 {
                    color: #0f1419;
                    font-weight: 600;
                }
                .prose-ai p {
                    color: #536471;
                    line-height: 1.6;
                }
                .prose-ai strong {
                    color: #0f1419;
                    font-weight: 600;
                }
                .prose-ai ul, .prose-ai ol {
                    color: #536471;
                }
                .prose-ai li {
                    margin-top: 0.25rem;
                    margin-bottom: 0.25rem;
                }
            `}</style>

            {/* AI Summary Floating Button - Premium Design */}
            <button
                onClick={handleGenerateSummary}
                onMouseEnter={() => setButtonHovered(true)}
                onMouseLeave={() => setButtonHovered(false)}
                disabled={summaryLoading}
                className="fixed top-5 right-5 z-50 group ai-button-glow"
            >
                <div className={`
                    relative flex items-center gap-2.5 px-5 py-2.5
                    bg-gradient-to-r from-violet-600 via-purple-600 to-indigo-600
                    text-white rounded-full font-medium text-sm
                    transform transition-all duration-300 ease-out
                    ${buttonHovered ? 'scale-105' : 'scale-100'}
                    ${summaryLoading ? 'opacity-80 cursor-wait' : 'cursor-pointer'}
                `}>
                    {/* Animated background shimmer */}
                    <div className="absolute inset-0 rounded-full overflow-hidden">
                        <div
                            className="absolute inset-0 opacity-30"
                            style={{
                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)',
                                backgroundSize: '200% 100%',
                                animation: buttonHovered ? 'shimmer 1.5s infinite' : 'none'
                            }}
                        />
                    </div>

                    {/* Icon with animation */}
                    <div className="relative">
                        {summaryLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Sparkles
                                className={`h-4 w-4 transition-transform duration-300 ${buttonHovered ? 'animate-pulse' : ''}`}
                                style={{ animation: buttonHovered ? 'sparkle 1s infinite' : 'none' }}
                            />
                        )}
                    </div>

                    {/* Text */}
                    <span className="relative font-semibold tracking-tight">
                        {summaryLoading ? 'Analyzing...' : 'AI Summary'}
                    </span>

                    {/* Subtle indicator dot */}
                    {!summaryLoading && summary && (
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                    )}
                </div>
            </button>

            {/* Snapshot Content with smooth margin transition */}
            <div
                className={`content-shift ${showSummary ? 'mr-[420px]' : ''}`}
                dangerouslySetInnerHTML={{ __html: snapshotHtml }}
            />

            {/* Backdrop overlay for mobile */}
            {showSummary && (
                <div
                    className="fixed inset-0 bg-black/20 z-30 md:hidden transition-opacity duration-300"
                    onClick={() => setShowSummary(false)}
                />
            )}

            {/* AI Summary Panel - Premium Card Design */}
            <div
                className={`
                    fixed top-0 right-0 h-full w-[420px] max-w-full
                    bg-white/95 backdrop-blur-xl
                    border-l border-gray-200/80
                    shadow-2xl
                    panel-slide z-40
                    ${showSummary ? 'translate-x-0' : 'translate-x-full'}
                `}
            >
                {/* Panel Header - Tweet Card Style */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                    <div className="flex items-center gap-3">
                        {/* AI Avatar */}
                        <div className="relative">
                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-500 via-purple-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-purple-500/25">
                                <Brain className="h-5 w-5 text-white" />
                            </div>
                            {/* Online indicator */}
                            <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-white" />
                        </div>

                        <div>
                            <h2 className="font-bold text-[15px] text-gray-900 leading-tight">AI Summary</h2>
                            <p className="text-[13px] text-gray-500">Powered by TidyFeed AI</p>
                        </div>
                    </div>

                    <button
                        onClick={() => setShowSummary(false)}
                        className="p-2 hover:bg-gray-100 rounded-full transition-all duration-200 group"
                    >
                        <X className="h-5 w-5 text-gray-400 group-hover:text-gray-600 transition-colors" />
                    </button>
                </div>

                {/* Panel Content */}
                <div className="overflow-y-auto h-[calc(100%-72px)]">
                    {/* Loading State - Premium */}
                    {summaryLoading && (
                        <div className="p-5">
                            {/* Loading Card */}
                            <div className="bg-gradient-to-br from-violet-50 to-indigo-50 rounded-2xl p-6 border border-violet-100/50">
                                <div className="flex flex-col items-center text-center">
                                    {/* Animated Brain */}
                                    <div className="relative mb-4">
                                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center shadow-xl shadow-violet-500/30">
                                            <Wand2 className="h-8 w-8 text-white animate-pulse" />
                                        </div>
                                        {/* Rotating ring */}
                                        <div className="absolute inset-0 rounded-2xl border-2 border-violet-400/30 animate-ping" style={{ animationDuration: '2s' }} />
                                    </div>

                                    <h3 className="font-semibold text-gray-900 mb-2">Analyzing Content</h3>
                                    <p className="text-sm text-gray-500 mb-4">AI is reading and summarizing this tweet...</p>

                                    {/* Typing indicator */}
                                    <div className="flex items-center gap-1.5">
                                        <div className="w-2 h-2 rounded-full bg-violet-500" style={{ animation: 'typing-dot 1.4s infinite ease-in-out' }} />
                                        <div className="w-2 h-2 rounded-full bg-violet-500" style={{ animation: 'typing-dot 1.4s infinite ease-in-out 0.2s' }} />
                                        <div className="w-2 h-2 rounded-full bg-violet-500" style={{ animation: 'typing-dot 1.4s infinite ease-in-out 0.4s' }} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Error State - Premium */}
                    {summaryError && (
                        <div className="p-5">
                            <div className="bg-red-50 rounded-2xl p-5 border border-red-100">
                                <div className="flex items-start gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                                        <X className="h-5 w-5 text-red-500" />
                                    </div>
                                    <div>
                                        <h3 className="font-semibold text-red-900 mb-1">Unable to Generate</h3>
                                        <p className="text-sm text-red-600">{summaryError}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Summary Content - Tweet Card Style */}
                    {summary && !summaryLoading && (
                        <div className="p-5">
                            {/* Summary Card */}
                            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                                {/* Card Header */}
                                <div className="px-4 py-3 bg-gradient-to-r from-violet-50 to-indigo-50 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <Zap className="h-4 w-4 text-violet-600" />
                                        <span className="text-sm font-semibold text-violet-900">AI Analysis</span>
                                    </div>
                                </div>

                                {/* Card Content */}
                                <div className="p-4">
                                    <div className="prose-ai text-[15px] leading-relaxed">
                                        <ReactMarkdown
                                            components={{
                                                p: ({ children }) => <p className="mb-3 text-gray-600 leading-relaxed">{children}</p>,
                                                strong: ({ children }) => <strong className="text-gray-900 font-semibold">{children}</strong>,
                                                ul: ({ children }) => <ul className="mb-3 space-y-1.5 list-disc list-inside text-gray-600">{children}</ul>,
                                                li: ({ children }) => <li className="text-gray-600">{children}</li>,
                                                h1: ({ children }) => <h1 className="text-lg font-bold text-gray-900 mb-2">{children}</h1>,
                                                h2: ({ children }) => <h2 className="text-base font-bold text-gray-900 mb-2 mt-4">{children}</h2>,
                                                h3: ({ children }) => <h3 className="text-sm font-bold text-gray-900 mb-1 mt-3">{children}</h3>,
                                            }}
                                        >{summary}</ReactMarkdown>
                                    </div>
                                </div>

                                {/* Card Footer */}
                                <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
                                    <div className="flex items-center justify-between text-xs text-gray-500">
                                        <span>Generated by TidyFeed AI</span>
                                        <div className="flex items-center gap-1">
                                            <Sparkles className="h-3 w-3 text-violet-500" />
                                            <span className="text-violet-600 font-medium">GLM-4</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Empty State - Premium */}
                    {!summary && !summaryLoading && !summaryError && (
                        <div className="p-5">
                            <div className="bg-gradient-to-br from-gray-50 to-slate-50 rounded-2xl p-8 border border-gray-100 text-center">
                                <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
                                    <Sparkles className="h-8 w-8 text-gray-400" />
                                </div>
                                <h3 className="font-semibold text-gray-900 mb-2">Ready to Analyze</h3>
                                <p className="text-sm text-gray-500 max-w-[240px] mx-auto">
                                    Click the AI Summary button to get an intelligent analysis of this tweet.
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Collapsed Panel Toggle - Premium */}
            {!showSummary && summary && (
                <button
                    onClick={() => setShowSummary(true)}
                    className="fixed top-1/2 right-0 transform -translate-y-1/2 z-40 group"
                >
                    <div className="flex items-center bg-white rounded-l-xl border border-r-0 border-gray-200 shadow-lg overflow-hidden transition-all duration-300 hover:shadow-xl hover:border-violet-200">
                        <div className="px-2 py-3">
                            <ChevronLeft className="h-5 w-5 text-gray-400 group-hover:text-violet-600 transition-colors" />
                        </div>
                        <div className="pr-3 py-2 border-l border-gray-100">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center">
                                <Brain className="h-4 w-4 text-white" />
                            </div>
                        </div>
                    </div>
                </button>
            )}
        </div>
    );
}
