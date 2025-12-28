import { cookies } from 'next/headers'

export async function fetchFromBackend(path: string, options: RequestInit = {}) {
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')

    const headers = new Headers(options.headers)
    if (token) {
        headers.set('Cookie', `auth_token=${token.value}`)
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787'
    // Remove leading slash if present in path
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;

    const response = await fetch(`${apiUrl}/${cleanPath}`, {
        ...options,
        headers,
    })

    if (response.status === 401) {
        // Let the calling code handle redirect or throwing
        console.error('Unauthorized request to backend')
    }

    return response
}
