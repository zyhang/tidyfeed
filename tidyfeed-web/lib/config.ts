export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export function getToken() {
    if (typeof window === 'undefined') return null;
    const match = document.cookie.match(new RegExp('(^| )auth_token=([^;]+)'));
    if (match) return match[2];
    return null;
}
