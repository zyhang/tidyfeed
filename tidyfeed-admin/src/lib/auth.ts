/**
 * Auth utilities for JWT management
 */

const TOKEN_KEY = 'tidyfeed_token';
const EMAIL_KEY = 'tidyfeed_email';

export function setAuth(token: string, email: string): void {
    if (typeof window !== 'undefined') {
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(EMAIL_KEY, email);
    }
}

export function getToken(): string | null {
    if (typeof window !== 'undefined') {
        return localStorage.getItem(TOKEN_KEY);
    }
    return null;
}

export function getEmail(): string | null {
    if (typeof window !== 'undefined') {
        return localStorage.getItem(EMAIL_KEY);
    }
    return null;
}

export function clearAuth(): void {
    if (typeof window !== 'undefined') {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(EMAIL_KEY);
    }
}

export function isAuthenticated(): boolean {
    return !!getToken();
}
