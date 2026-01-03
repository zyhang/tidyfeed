
import { NextRequest } from 'next/server';

export const runtime = 'edge';

export async function GET(
    request: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    const id = params.id;
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.tidyfeed.app';

    try {
        const res = await fetch(`${apiUrl}/api/tweets/${id}/snapshot`);

        if (!res.ok) {
            if (res.status === 404) {
                return new Response('Snapshot not found', { status: 404 });
            }
            return new Response('Error fetching snapshot', { status: res.status });
        }

        return new Response(res.body, {
            headers: {
                'Content-Type': 'text/html; charset=utf-8',
                'Cache-Control': 'public, max-age=86400, immutable',
            },
        });
    } catch (error) {
        console.error('Snapshot proxy error:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}
