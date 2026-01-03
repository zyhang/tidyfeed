
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

    try {

        console.log(`[SnapshotProxy] Fetching data from ${tweetsUrl}`);

        const response = await fetch(tweetsUrl, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                // Pass a user-agent to identify this service
                'User-Agent': 'TidyFeed-Web-Proxy/1.0',
            },
            next: { revalidate: 60 } // Cache data fetch for 60 seconds
        });

        if (!response.ok) {
            if (response.status === 404) {
                return new NextResponse('Tweet snapshot not found (not cached yet?)', { status: 404 });
            }
            console.error(`[SnapshotProxy] Backend error: ${response.status}`);
            return new NextResponse(`Error fetching snapshot data: ${response.status}`, { status: response.status });
        }

        const json = await response.json() as {
            success: boolean;
            tweet: {
                data: TikHubTweetData;
                comments?: TikHubComment[] | null;
            }
        };

        if (!json.success || !json.tweet || !json.tweet.data) {
            return new NextResponse('Invalid snapshot data received', { status: 500 });
        }

        // Generate HTML using the local library
        // This allows us to modify the template in tidyfeed-web without redeploying backend
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

    } catch (error) {
        console.error('[SnapshotProxy] Error:', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
