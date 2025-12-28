/**
 * TidyFeed Backend API
 * Cloudflare Worker with Hono + D1
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sign, verify } from 'hono/jwt';
import bcrypt from 'bcryptjs';
import { createRemoteJWKSet, jwtVerify } from 'jose';

// Google OAuth JWKS endpoint for ID token verification
const GOOGLE_JWKS = createRemoteJWKSet(
	new URL('https://www.googleapis.com/oauth2/v3/certs')
);

type Bindings = {
	DB: D1Database;
	JWT_SECRET: string;
	GOOGLE_CLIENT_ID: string;
	GOOGLE_CLIENT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS middleware - allow all origins
app.use('*', cors());

// Health check
app.get('/', (c) => {
	return c.json({
		status: 'ok',
		service: 'TidyFeed API',
		// Debug: show if GOOGLE_CLIENT_ID is configured (only first 20 chars)
		google_client_id_prefix: c.env.GOOGLE_CLIENT_ID?.substring(0, 20) || 'NOT_SET',
	});
});

// ============================================
// Auth Routes
// ============================================

app.post('/auth/login', async (c) => {
	try {
		const { email, password } = await c.req.json();

		if (!email || !password) {
			return c.json({ error: 'Email and password are required' }, 400);
		}

		// Find admin by email
		const admin = await c.env.DB.prepare(
			'SELECT id, email, password_hash FROM admins WHERE email = ?'
		).bind(email).first<{ id: number; email: string; password_hash: string }>();

		if (!admin) {
			return c.json({ error: 'Invalid credentials' }, 401);
		}

		// Verify password
		const isValid = await bcrypt.compare(password, admin.password_hash);
		if (!isValid) {
			return c.json({ error: 'Invalid credentials' }, 401);
		}

		// Generate JWT
		const token = await sign(
			{
				sub: admin.id.toString(),
				email: admin.email,
				exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 7, // 7 days
			},
			c.env.JWT_SECRET
		);

		return c.json({ token, email: admin.email });
	} catch (error) {
		console.error('Login error:', error);
		return c.json({ error: 'Internal server error' }, 500);
	}
});

// Google OAuth login (for Chrome Extension users)
app.post('/auth/google', async (c) => {
	try {
		const { idToken } = await c.req.json();

		if (!idToken) {
			return c.json({ error: 'idToken is required' }, 400);
		}

		// Verify Google ID token via JWKS
		let payload;
		try {
			const result = await jwtVerify(idToken, GOOGLE_JWKS, {
				issuer: ['https://accounts.google.com', 'accounts.google.com'],
				audience: c.env.GOOGLE_CLIENT_ID,
			});
			payload = result.payload;
		} catch (jwtError) {
			console.error('Google token verification failed:', jwtError);
			return c.json({ error: 'Invalid Google ID token' }, 401);
		}

		// Extract user info from Google token
		const googleId = payload.sub as string;
		const email = payload.email as string;
		const name = (payload.name as string) || null;
		const avatarUrl = (payload.picture as string) || null;

		if (!googleId || !email) {
			return c.json({ error: 'Invalid token payload' }, 400);
		}

		// Check if user exists
		let user = await c.env.DB.prepare(
			'SELECT * FROM users WHERE google_id = ?'
		).bind(googleId).first<{ id: string; google_id: string; email: string; name: string; avatar_url: string }>();

		if (!user) {
			// Create new user
			const userId = crypto.randomUUID();
			await c.env.DB.prepare(
				`INSERT INTO users (id, google_id, email, name, avatar_url)
				 VALUES (?, ?, ?, ?, ?)`
			).bind(userId, googleId, email, name, avatarUrl).run();

			user = { id: userId, google_id: googleId, email, name: name || '', avatar_url: avatarUrl || '' };
		} else {
			// Update existing user info (in case name/avatar changed)
			await c.env.DB.prepare(
				`UPDATE users SET email = ?, name = ?, avatar_url = ? WHERE google_id = ?`
			).bind(email, name, avatarUrl, googleId).run();

			user = { ...user, email, name: name || user.name, avatar_url: avatarUrl || user.avatar_url };
		}

		// Generate JWT for our API
		const token = await sign(
			{
				sub: user.id,
				email: user.email,
				role: 'user',
				exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
			},
			c.env.JWT_SECRET
		);

		return c.json({
			token,
			user: {
				id: user.id,
				email: user.email,
				name: user.name,
				avatarUrl: user.avatar_url,
			},
		});
	} catch (error) {
		console.error('Google auth error:', error);
		return c.json({ error: 'Internal server error' }, 500);
	}
});

// ============================================
// Google OAuth Web Application Flow
// ============================================

// Redirect to Google OAuth consent screen
app.get('/auth/login/google', (c) => {
	const isDev = c.req.url.includes('localhost') || c.req.url.includes('127.0.0.1');
	const redirectUri = isDev
		? 'http://localhost:8787/auth/callback/google'
		: 'https://api.tidyfeed.app/auth/callback/google';

	const state = crypto.randomUUID();

	const params = new URLSearchParams({
		client_id: c.env.GOOGLE_CLIENT_ID,
		redirect_uri: redirectUri,
		response_type: 'code',
		scope: 'openid email profile',
		access_type: 'offline',
		state: state,
		prompt: 'consent',
	});

	const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
	return c.redirect(googleAuthUrl);
});

// Handle OAuth callback
app.get('/auth/callback/google', async (c) => {
	try {
		const code = c.req.query('code');
		const error = c.req.query('error');

		if (error) {
			console.error('Google OAuth error:', error);
			return c.redirect('https://tidyfeed.app/?error=oauth_denied');
		}

		if (!code) {
			return c.json({ error: 'Authorization code is required' }, 400);
		}

		const isDev = c.req.url.includes('localhost') || c.req.url.includes('127.0.0.1');
		const redirectUri = isDev
			? 'http://localhost:8787/auth/callback/google'
			: 'https://api.tidyfeed.app/auth/callback/google';

		// Exchange code for tokens
		const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				code: code,
				client_id: c.env.GOOGLE_CLIENT_ID,
				client_secret: c.env.GOOGLE_CLIENT_SECRET,
				redirect_uri: redirectUri,
				grant_type: 'authorization_code',
			}),
		});

		if (!tokenResponse.ok) {
			const errorData = await tokenResponse.text();
			console.error('Token exchange failed:', errorData);
			return c.redirect('https://tidyfeed.app/?error=token_exchange_failed');
		}

		const tokens = await tokenResponse.json<{ access_token: string; id_token: string }>();

		// Verify ID token via JWKS
		let payload;
		try {
			const result = await jwtVerify(tokens.id_token, GOOGLE_JWKS, {
				issuer: ['https://accounts.google.com', 'accounts.google.com'],
				audience: c.env.GOOGLE_CLIENT_ID,
			});
			payload = result.payload;
		} catch (jwtError) {
			console.error('ID token verification failed:', jwtError);
			return c.redirect('https://tidyfeed.app/?error=token_verification_failed');
		}

		// Extract user info
		const googleId = payload.sub as string;
		const email = payload.email as string;
		const name = (payload.name as string) || null;
		const avatarUrl = (payload.picture as string) || null;

		if (!googleId || !email) {
			return c.redirect('https://tidyfeed.app/?error=invalid_token_payload');
		}

		// Upsert user in D1
		let user = await c.env.DB.prepare(
			'SELECT * FROM users WHERE google_id = ?'
		).bind(googleId).first<{ id: string; google_id: string; email: string; name: string; avatar_url: string }>();

		if (!user) {
			const userId = crypto.randomUUID();
			await c.env.DB.prepare(
				`INSERT INTO users (id, google_id, email, name, avatar_url)
				 VALUES (?, ?, ?, ?, ?)`
			).bind(userId, googleId, email, name, avatarUrl).run();

			user = { id: userId, google_id: googleId, email, name: name || '', avatar_url: avatarUrl || '' };
		} else {
			await c.env.DB.prepare(
				`UPDATE users SET email = ?, name = ?, avatar_url = ? WHERE google_id = ?`
			).bind(email, name, avatarUrl, googleId).run();

			user = { ...user, email, name: name || user.name, avatar_url: avatarUrl || user.avatar_url };
		}

		// Generate JWT
		const token = await sign(
			{
				sub: user.id,
				email: user.email,
				role: 'user',
				exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30, // 30 days
			},
			c.env.JWT_SECRET
		);

		// Determine redirect destination
		const dashboardUrl = isDev
			? 'http://localhost:3000/dashboard'
			: 'https://tidyfeed.app/dashboard';

		// Set HttpOnly cookie and redirect
		const cookieOptions = [
			`auth_token=${token}`,
			'Path=/',
			'HttpOnly',
			`Max-Age=${30 * 24 * 60 * 60}`, // 30 days
			'SameSite=Lax',
		];

		if (!isDev) {
			cookieOptions.push('Secure');
			cookieOptions.push('Domain=.tidyfeed.app');
		}

		return new Response(null, {
			status: 302,
			headers: {
				'Location': dashboardUrl,
				'Set-Cookie': cookieOptions.join('; '),
			},
		});
	} catch (error: any) {
		console.error('Google OAuth callback error:', error?.message || error);
		console.error('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
		return c.redirect('https://tidyfeed.app/?error=internal_error');
	}
});

// Cookie-based auth middleware
const cookieAuthMiddleware = async (c: any, next: any) => {
	const cookieHeader = c.req.header('Cookie');

	if (!cookieHeader) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	// Parse auth_token from cookies
	const cookies = Object.fromEntries(
		cookieHeader.split(';').map((c: string) => {
			const [key, ...val] = c.trim().split('=');
			return [key, val.join('=')];
		})
	);

	const token = cookies['auth_token'];

	if (!token) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	try {
		const payload = await verify(token, c.env.JWT_SECRET);
		c.set('jwtPayload', payload);
		await next();
	} catch (error) {
		return c.json({ error: 'Invalid token' }, 401);
	}
};

// Get current user info from cookie
app.get('/auth/me', cookieAuthMiddleware, async (c) => {
	try {
		const payload = c.get('jwtPayload') as { sub: string; email: string; role: string };

		// Fetch fresh user data from DB
		const dbUser = await c.env.DB.prepare(
			'SELECT id, email, name, avatar_url, created_at FROM users WHERE id = ?'
		).bind(payload.sub).first<{ id: string; email: string; name: string; avatar_url: string; created_at: string }>();

		if (!dbUser) {
			return c.json({ error: 'User not found' }, 404);
		}

		return c.json({
			user: {
				id: dbUser.id,
				email: dbUser.email,
				name: dbUser.name,
				avatarUrl: dbUser.avatar_url,
				createdAt: dbUser.created_at,
			},
		});
	} catch (error) {
		console.error('Get user error:', error);
		return c.json({ error: 'Internal server error' }, 500);
	}
});

// ============================================
// Public API Routes
// ============================================

app.post('/api/report', async (c) => {
	try {
		const reporterId = c.req.header('X-User-Id');
		const reporterType = c.req.header('X-User-Type') || 'guest';

		if (!reporterId) {
			return c.json({ error: 'X-User-Id header is required' }, 400);
		}

		if (!['guest', 'google'].includes(reporterType)) {
			return c.json({ error: 'Invalid reporter type' }, 400);
		}

		const { blocked_x_id, blocked_x_name, reason } = await c.req.json();

		if (!blocked_x_id) {
			return c.json({ error: 'blocked_x_id is required' }, 400);
		}

		// Try to insert - handle duplicate gracefully
		try {
			await c.env.DB.prepare(
				`INSERT INTO reports (reporter_id, reporter_type, blocked_x_id, blocked_x_name, reason)
				 VALUES (?, ?, ?, ?, ?)`
			).bind(reporterId, reporterType, blocked_x_id, blocked_x_name || null, reason || null).run();

			return c.json({ success: true, message: 'Report submitted' });
		} catch (dbError: any) {
			// Handle UNIQUE constraint violation
			if (dbError.message?.includes('UNIQUE constraint failed')) {
				return c.json({ success: true, message: 'Already reported' });
			}
			throw dbError;
		}
	} catch (error) {
		console.error('Report error:', error);
		return c.json({ error: 'Internal server error' }, 500);
	}
});

// ============================================
// Protected Admin Routes
// ============================================

// JWT Middleware for admin routes
const jwtMiddleware = async (c: any, next: any) => {
	const authHeader = c.req.header('Authorization');

	if (!authHeader || !authHeader.startsWith('Bearer ')) {
		return c.json({ error: 'Unauthorized' }, 401);
	}

	const token = authHeader.substring(7);

	try {
		const payload = await verify(token, c.env.JWT_SECRET);
		c.set('jwtPayload', payload);
		await next();
	} catch (error) {
		return c.json({ error: 'Invalid token' }, 401);
	}
};

app.get('/api/reports', jwtMiddleware, async (c) => {
	try {
		// Get reports with count per blocked_x_id
		const reports = await c.env.DB.prepare(
			`SELECT 
				blocked_x_id,
				blocked_x_name,
				COUNT(*) as report_count,
				GROUP_CONCAT(DISTINCT reason) as reasons,
				MAX(created_at) as latest_report
			 FROM reports
			 GROUP BY blocked_x_id
			 ORDER BY latest_report DESC
			 LIMIT 100`
		).all();

		return c.json({
			count: reports.results?.length || 0,
			reports: reports.results || [],
		});
	} catch (error) {
		console.error('Get reports error:', error);
		return c.json({ error: 'Internal server error' }, 500);
	}
});

// Get all individual reports (for detailed view)
app.get('/api/reports/all', jwtMiddleware, async (c) => {
	try {
		const reports = await c.env.DB.prepare(
			`SELECT * FROM reports ORDER BY created_at DESC LIMIT 500`
		).all();

		return c.json({
			count: reports.results?.length || 0,
			reports: reports.results || [],
		});
	} catch (error) {
		console.error('Get all reports error:', error);
		return c.json({ error: 'Internal server error' }, 500);
	}
});

export default app;
