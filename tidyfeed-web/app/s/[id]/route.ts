
import { NextRequest, NextResponse } from 'next/server';
import { generateTweetSnapshot } from '../../../lib/snapshot';
import { TikHubTweetData, TikHubComment } from '../../../lib/types';

export const runtime = 'edge';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app').replace(/\/$/, '');
    const tweetsUrl = `${apiUrl}/api/tweets/${id}/cached`;
    const staticSnapshotUrl = `${apiUrl}/api/tweets/${id}/snapshot`;

    const MAX_RETRIES = 3;
    let lastError: any = null;

    // --- Step 1: Try to fetch JSON data with retries ---
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            // Attempt 1: revalidate 60s (standard)
            // Retry attempts: revalidate 0 (fresh)
            const nextConfig = attempt > 1 ? { revalidate: 0 } : { revalidate: 60 };

            console.log(`[SnapshotProxy] Attempt ${attempt}: Fetching JSON from ${tweetsUrl}`);
            const response = await fetch(tweetsUrl, {
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'User-Agent': 'TidyFeed-Web-Proxy/1.0',
                },
                next: nextConfig
            });

            if (response.ok) {
                const json = await response.json() as any;
                if (json.success && json.tweet?.data) {
                    // Success! Generate HTML locally
                    const html = generateTweetSnapshot(
                        json.tweet.data,
                        json.tweet.comments || [],
                        { theme: 'auto' }
                    );

                    return new NextResponse(html, {
                        headers: {
                            'Content-Type': 'text/html; charset=utf-8',
                            'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=3600',
                        },
                    });
                }
            } else if (response.status === 404) {
                // Not found is likely permanent or at least doesn't need retries/fallback
                return new NextResponse('Tweet snapshot not found (not cached yet?)', { status: 404 });
            }

            console.warn(`[SnapshotProxy] Attempt ${attempt} failed with status: ${response.status}`);
        } catch (error) {
            lastError = error;
            console.error(`[SnapshotProxy] Attempt ${attempt} exception:`, error);
        }

        // Small delay before retry (except for last attempt)
        if (attempt < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 500 * attempt));
        }
    }

    // --- Step 2: Fallback to static R2 snapshot ---
    console.log(`[SnapshotProxy] JSON path failed. Falling back to static snapshot: ${staticSnapshotUrl}`);
    try {
        const fallbackResponse = await fetch(staticSnapshotUrl, {
            method: 'GET',
            headers: { 'User-Agent': 'TidyFeed-Web-Proxy/1.0' },
            next: { revalidate: 0 }
        });

        if (fallbackResponse.ok) {
            const staticHtml = await fallbackResponse.text();
            console.log(`[SnapshotProxy] Successfully served static fallback for ${id}`);
            return new NextResponse(staticHtml, {
                headers: {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'public, s-maxage=300', // Short cache for fallbacks
                },
            });
        }
    } catch (fallbackError) {
        console.error(`[SnapshotProxy] Fallback also failed:`, fallbackError);
    }

    // --- Final Failure ---
    return new NextResponse(
        `Error loading snapshot. Please try again later. (Error: ${lastError?.message || 'Upstream Error'})`,
        { status: 500 }
    );
}
