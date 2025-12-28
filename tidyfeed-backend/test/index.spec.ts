import { env, SELF } from 'cloudflare:test';
import { describe, it, expect } from 'vitest';
import app from '../src/index';

describe('TidyFeed API', () => {
	it('GET / returns health check', async () => {
		const res = await app.request('/', {}, env);
		expect(res.status).toBe(200);
		const json = await res.json();
		expect(json).toHaveProperty('status', 'ok');
	});

	it('POST /auth/login returns 400 without credentials', async () => {
		const res = await app.request('/auth/login', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({}),
		}, env);
		expect(res.status).toBe(400);
	});

	it('POST /api/report returns 400 without X-User-Id', async () => {
		const res = await app.request('/api/report', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ blocked_x_id: '123' }),
		}, env);
		expect(res.status).toBe(400);
	});

	it('GET /api/reports returns 401 without auth', async () => {
		const res = await app.request('/api/reports', {}, env);
		expect(res.status).toBe(401);
	});

	it('GET /auth/login/google redirects to Google OAuth', async () => {
		const res = await app.request('/auth/login/google', {}, env);
		expect(res.status).toBe(302);
		const location = res.headers.get('Location');
		expect(location).toContain('accounts.google.com');
		expect(location).toContain('scope=openid+email+profile');
	});

	it('GET /auth/callback/google returns 400 without code', async () => {
		const res = await app.request('/auth/callback/google', {}, env);
		expect(res.status).toBe(400);
	});

	it('GET /auth/me returns 401 without cookie', async () => {
		const res = await app.request('/auth/me', {}, env);
		expect(res.status).toBe(401);
	});
});
