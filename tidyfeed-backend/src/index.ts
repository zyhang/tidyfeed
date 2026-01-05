/**
 * TidyFeed Backend API
 * Cloudflare Worker with Hono + D1
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sign, verify } from 'hono/jwt';
import bcrypt from 'bcryptjs';
import { createRemoteJWKSet, jwtVerify } from 'jose';
import downloads from './routes/downloads';
import internal from './routes/internal';
import caching from './routes/caching';
import admin from './routes/admin';
import ai from './routes/ai';
import library from './routes/library';
import notes from './routes/notes';
import { TikHubService } from './services/tikhub';

// Google OAuth JWKS endpoint for ID token verification
const GOOGLE_JWKS = createRemoteJWKSet(
	new URL('https://www.googleapis.com/oauth2/v3/certs')
);

type Bindings = {
	DB: D1Database;
	JWT_SECRET: string;
	GOOGLE_CLIENT_ID: string;
	GOOGLE_CLIENT_SECRET: string;
	MEDIA_BUCKET: R2Bucket;
	INTERNAL_SERVICE_KEY: string;
	TIKHUB_API_KEY: string;
	BIGMODEL_API_KEY?: string;
	WEB_APP_URL?: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS middleware - allow specific origins for credentials
// CORS middleware - allow specific origins for credentials
app.use('*', cors({
	origin: (origin) => {
		const allowed = ['https://a.tidyfeed.app', 'https://tidyfeed.app', 'https://admin.tidyfeed.app', 'http://localhost:3000'];
		if (!origin) return allowed[0];
		if (allowed.includes(origin) || origin.startsWith('chrome-extension://')) {
			return origin;
		}
		return allowed[0];
	},
	credentials: true,
}));

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
// Image Serving Routes (for cached tweet images)
// ============================================

/**
 * GET /api/images/:tweetId/:type/:filename
 * Serve cached images from R2 bucket
 * Type: 'media' or 'avatar'
 */
app.get('/api/images/:tweetId/:type/:filename', async (c) => {
	const { tweetId, type, filename } = c.req.param();

	// Validate type
	if (type !== 'media' && type !== 'avatar') {
		return c.json({ error: 'Invalid image type' }, 400);
	}

	const r2Key = `images/${tweetId}/${type}/${filename}`;

	try {
		const object = await c.env.MEDIA_BUCKET.get(r2Key);

		if (!object) {
			return c.json({ error: 'Image not found' }, 404);
		}

		const headers = new Headers();
		headers.set('Content-Type', object.httpMetadata?.contentType || 'image/jpeg');
		headers.set('Cache-Control', 'public, max-age=31536000, immutable'); // 1 year cache
		headers.set('ETag', object.etag);

		return new Response(object.body, {
			status: 200,
			headers,
		});
	} catch (error) {
		console.error(`[Images] Error serving ${r2Key}:`, error);
		return c.json({ error: 'Internal server error' }, 500);
	}
});

/**
 * GET /api/videos/:tweetId/:filename
 * Serve cached videos from R2 bucket
 */
app.get('/api/videos/:tweetId/:filename', async (c) => {
	const { tweetId, filename } = c.req.param();

	const r2Key = `videos/${tweetId}/${filename}`;

	try {
		const rangeHeader = c.req.header('Range');

		// For range requests, use head() first to get size, then single ranged get()
		if (rangeHeader) {
			const headObject = await c.env.MEDIA_BUCKET.head(r2Key);
			if (!headObject) {
				return c.json({ error: 'Video not found' }, 404);
			}

			const match = rangeHeader.match(/bytes=(\d+)-(\d*)/);
			if (match && headObject.size) {
				const start = parseInt(match[1], 10);
				const end = match[2] ? parseInt(match[2], 10) : headObject.size - 1;
				const contentLength = end - start + 1;

				// Single ranged get - no double-fetch
				const rangeObject = await c.env.MEDIA_BUCKET.get(r2Key, {
					range: { offset: start, length: contentLength }
				});

				if (rangeObject) {
					const headers = new Headers();
					headers.set('Content-Type', headObject.httpMetadata?.contentType || 'video/mp4');
					headers.set('Cache-Control', 'public, max-age=31536000, immutable');
					headers.set('Accept-Ranges', 'bytes');
					headers.set('Content-Range', `bytes ${start}-${end}/${headObject.size}`);
					headers.set('Content-Length', contentLength.toString());

					return new Response(rangeObject.body, {
						status: 206,
						headers,
					});
				}
			}
		}

		// Full request - single get
		const object = await c.env.MEDIA_BUCKET.get(r2Key);

		if (!object) {
			return c.json({ error: 'Video not found' }, 404);
		}

		const headers = new Headers();
		headers.set('Content-Type', object.httpMetadata?.contentType || 'video/mp4');
		headers.set('Cache-Control', 'public, max-age=31536000, immutable');
		headers.set('ETag', object.etag);
		headers.set('Accept-Ranges', 'bytes');
		headers.set('Content-Length', (object.size || 0).toString());

		return new Response(object.body, {
			status: 200,
			headers,
		});
	} catch (error) {
		console.error(`[Videos] Error serving ${r2Key}:`, error);
		return c.json({ error: 'Internal server error' }, 500);
	}
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

	// Generate a random state for CSRF protection
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

	// Store state in HttpOnly cookie to prevent CSRF - will be validated in callback
	const cookieOptions = [
		`oauth_state=${state}`,
		'Path=/',
		'HttpOnly',
		'Max-Age=600', // 10 minutes
		'SameSite=Lax', // Allow top-level navigation
	];

	if (!isDev) {
		cookieOptions.push('Secure');
		cookieOptions.push('Domain=.tidyfeed.app'); // Allow cookie to be read by api.tidyfeed.app
	}

	return new Response(null, {
		status: 302,
		headers: {
			'Location': googleAuthUrl,
			'Set-Cookie': cookieOptions.join('; '),
		},
	});
});

// Handle OAuth callback
app.get('/auth/callback/google', async (c) => {
	try {
		const code = c.req.query('code');
		const error = c.req.query('error');
		const callbackState = c.req.query('state');

		if (error) {
			console.error('Google OAuth error:', error);
			return c.redirect('https://a.tidyfeed.app/?error=oauth_denied');
		}

		if (!code) {
			return c.json({ error: 'Authorization code is required' }, 400);
		}

		// Validate state parameter to prevent CSRF attacks
		const cookieHeader = c.req.header('Cookie');
		let savedState = null;

		if (cookieHeader) {
			const cookies = Object.fromEntries(
				cookieHeader.split(';').map((cookie) => {
					const [key, ...val] = cookie.trim().split('=');
					return [key, val.join('=')];
				})
			);
			savedState = cookies['oauth_state'];
		}

		if (!callbackState || !savedState || callbackState !== savedState) {
			console.error('State mismatch or missing:', { callbackState, savedState, hasCookie: !!cookieHeader });
			return c.redirect('https://a.tidyfeed.app/?error=invalid_state');
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
			return c.redirect('https://a.tidyfeed.app/?error=token_exchange_failed');
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
			return c.redirect('https://a.tidyfeed.app/?error=token_verification_failed');
		}

		// Extract user info
		const googleId = payload.sub as string;
		const email = payload.email as string;
		const name = (payload.name as string) || null;
		const avatarUrl = (payload.picture as string) || null;

		if (!googleId || !email) {
			return c.redirect('https://a.tidyfeed.app/?error=invalid_token_payload');
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
			: 'https://a.tidyfeed.app/dashboard';

		// Set HttpOnly cookie and redirect
		const cookieOptions = [
			`auth_token=${token}`,
			'Path=/',
			'HttpOnly',
			`Max-Age=${30 * 24 * 60 * 60}`, // 30 days
		];

		// Clear the state cookie
		const clearStateCookie = [
			'oauth_state=',
			'Path=/',
			'HttpOnly',
			'Max-Age=0',
			isDev ? 'SameSite=Lax' : 'SameSite=Lax; Secure'
		].join('; ');

		if (!isDev) {
			cookieOptions.push('Secure');
			cookieOptions.push('Domain=.tidyfeed.app');
			cookieOptions.push('SameSite=None'); // Required for cross-origin requests
		} else {
			// Dev environment: use Lax without Secure for localhost HTTP
			cookieOptions.push('SameSite=Lax');
		}

		const response = new Response(null, {
			status: 302,
			headers: {
				'Location': dashboardUrl,
				'Set-Cookie': cookieOptions.join('; '),
			},
		});

		// Add the clear state cookie header
		response.headers.append('Set-Cookie', clearStateCookie);

		return response;
	} catch (error: any) {
		console.error('Google OAuth callback error:', error?.message || error);
		console.error('Full error:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
		return c.redirect('https://a.tidyfeed.app/?error=internal_error');
	}
});

// Auth middleware (Cookie or Bearer Token)
const cookieAuthMiddleware = async (c: any, next: any) => {
	let token: string | undefined;

	// 1. Try Authorization Header
	const authHeader = c.req.header('Authorization');
	if (authHeader && authHeader.startsWith('Bearer ')) {
		token = authHeader.substring(7);
	}

	// 2. Try Cookie if header missing
	if (!token) {
		const cookieHeader = c.req.header('Cookie');
		if (cookieHeader) {
			const cookies = Object.fromEntries(
				cookieHeader.split(';').map((c: string) => {
					const [key, ...val] = c.trim().split('=');
					return [key, val.join('=')];
				})
			);
			token = cookies['auth_token'];
		}
	}

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
		console.log('[/auth/me] Handler started');
		const payload = c.get('jwtPayload') as { sub: string; email: string; role: string };
		console.log('[/auth/me] JWT payload:', { sub: payload.sub, email: payload.email });

		// Fetch fresh user data from DB
		console.log('[/auth/me] Fetching user from DB...');
		const dbUser = await c.env.DB.prepare(
			'SELECT id, email, name, avatar_url, created_at, storage_usage, preferences, custom_ai_prompt FROM users WHERE id = ?'
		).bind(payload.sub).first<{
			id: string;
			email: string;
			name: string;
			avatar_url: string;
			created_at: string;
			storage_usage: number;
			preferences: string;
			custom_ai_prompt: string;
		}>();

		console.log('[/auth/me] DB query complete, user found:', !!dbUser);

		if (!dbUser) {
			console.log('[/auth/me] User not found, returning 404');
			return c.json({ error: 'User not found' }, 404);
		}

		// Fetch saved posts count
		console.log('[/auth/me] Fetching saved posts count...');
		const savedCount = await c.env.DB.prepare(
			'SELECT COUNT(*) as count FROM saved_posts WHERE user_id = ?'
		).bind(payload.sub).first<{ count: number }>();

		console.log('[/auth/me] Saved posts count:', savedCount?.count);

		// Parse preferences safely
		let parsedPreferences = {};
		try {
			if (dbUser.preferences) {
				parsedPreferences = JSON.parse(dbUser.preferences);
			}
		} catch (e) {
			console.error('[/auth/me] Failed to parse preferences:', e);
		}

		console.log('[/auth/me] Building response...');
		const response = {
			user: {
				id: dbUser.id,
				email: dbUser.email,
				name: dbUser.name,
				avatarUrl: dbUser.avatar_url,
				createdAt: dbUser.created_at,
				storageUsage: dbUser.storage_usage || 0,
				savedPostsCount: savedCount?.count || 0,
				preferences: parsedPreferences,
				customAiPrompt: dbUser.custom_ai_prompt
			},
		};

		console.log('[/auth/me] Returning success response');
		return c.json(response);
	} catch (error: any) {
		console.error('[/auth/me] CRITICAL ERROR:', error?.message || error);
		console.error('[/auth/me] Error stack:', error?.stack);
		return c.json({ error: 'Internal server error' }, 500);
	}
});

// Link a social account
app.post('/api/auth/link-social', cookieAuthMiddleware, async (c) => {
	try {
		const payload = c.get('jwtPayload') as { sub: string };
		const userId = payload.sub;

		let body;
		try {
			body = await c.req.json();
		} catch (e) {
			console.error('Link social - JSON parse error:', e);
			return c.json({ error: 'Invalid JSON body' }, 400);
		}

		const { platform, platform_user_id, platform_username, display_name, avatar_url } = body;

		console.log('Link social request:', { userId, platform, platform_user_id, platform_username });

		if (!platform || !platform_user_id) {
			return c.json({ error: 'Platform and Platform User ID are required' }, 400);
		}

		// Check if account is already linked to another user
		const existing = await c.env.DB.prepare(
			'SELECT user_id FROM social_accounts WHERE platform = ? AND platform_user_id = ?'
		).bind(platform, String(platform_user_id)).first<{ user_id: string }>();

		if (existing && existing.user_id !== userId) {
			return c.json({ error: 'Account already linked to another user' }, 409);
		}

		// Atomic Upsert (include platform_username_lower for case-insensitive lookups)
		const normalizedUsername = platform_username ? platform_username.toLowerCase() : null;
		await c.env.DB.prepare(
			`INSERT INTO social_accounts (user_id, platform, platform_user_id, platform_username, platform_username_lower, display_name, avatar_url, updated_at, last_synced_at)
			 VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			 ON CONFLICT(platform, platform_user_id) DO UPDATE SET
				platform_username = COALESCE(excluded.platform_username, social_accounts.platform_username),
				platform_username_lower = COALESCE(excluded.platform_username_lower, social_accounts.platform_username_lower),
				display_name = COALESCE(excluded.display_name, social_accounts.display_name),
				avatar_url = COALESCE(excluded.avatar_url, social_accounts.avatar_url),
				updated_at = CURRENT_TIMESTAMP,
				last_synced_at = CURRENT_TIMESTAMP`
		).bind(userId, platform, String(platform_user_id), platform_username || null, normalizedUsername, display_name || null, avatar_url || null).run();

		console.log('Link social success:', { userId, platform, platform_user_id });
		return c.json({ success: true, message: 'Social account linked' });
	} catch (error) {
		console.error('Link social account error:', error);
		return c.json({ error: 'Internal server error', details: String(error) }, 500);
	}
});

// Update user profile (name)
app.patch('/api/user/profile', cookieAuthMiddleware, async (c) => {
	try {
		const payload = c.get('jwtPayload') as { sub: string };
		const userId = payload.sub;
		const { name } = await c.req.json();

		if (name === undefined) {
			return c.json({ error: 'Name is required' }, 400);
		}

		await c.env.DB.prepare(
			'UPDATE users SET name = ? WHERE id = ?'
		).bind(name, userId).run();

		return c.json({ success: true });
	} catch (error) {
		console.error('Update profile error:', error);
		return c.json({ error: 'Internal server error' }, 500);
	}
});

// Update user settings (preferences, custom AI prompt)
app.patch('/api/user/settings', cookieAuthMiddleware, async (c) => {
	try {
		const payload = c.get('jwtPayload') as { sub: string };
		const userId = payload.sub;
		const body = await c.req.json();

		const { preferences, customAiPrompt } = body;

		// Build dynamic update query
		const updates: string[] = [];
		const values: any[] = [];

		if (preferences !== undefined) {
			updates.push('preferences = ?');
			values.push(JSON.stringify(preferences));
		}

		if (customAiPrompt !== undefined) {
			updates.push('custom_ai_prompt = ?');
			values.push(customAiPrompt);
		}

		if (updates.length > 0) {
			values.push(userId);
			const query = `UPDATE users SET ${updates.join(', ')} WHERE id = ?`;
			await c.env.DB.prepare(query).bind(...values).run();
		}

		return c.json({ success: true });
	} catch (error) {
		console.error('Update settings error:', error);
		return c.json({ error: 'Internal server error' }, 500);
	}
});

// GET /api/auth/social-accounts - Fetch user's linked social accounts
app.get('/api/auth/social-accounts', cookieAuthMiddleware, async (c) => {
	try {
		const payload = c.get('jwtPayload') as { sub: string };
		const userId = payload.sub;

		const results = await c.env.DB.prepare(
			`SELECT platform, platform_user_id, platform_username, display_name, avatar_url, last_synced_at
			 FROM social_accounts 
			 WHERE user_id = ?
			 ORDER BY created_at DESC`
		).bind(userId).all();

		return c.json({
			accounts: results.results || []
		});
	} catch (error) {
		console.error('Get social accounts error:', error);
		return c.json({ error: 'Internal server error' }, 500);
	}
});

// Logout - clear auth cookie
// Supports both GET (for web redirect) and POST (for extension)
const logoutHandler = (c: any) => {
	const isDev = c.req.url.includes('localhost') || c.req.url.includes('127.0.0.1');

	// Determine appropriate redirect URL
	const redirectUrl = isDev ? 'http://localhost:3000' : 'https://a.tidyfeed.app';

	// Clear the auth cookie by setting it to expire immediately
	// These options must match the ones used when setting the cookie
	const cookieOptions = [
		'auth_token=', // Empty value to clear
		'Path=/',
		'HttpOnly',
		'Max-Age=0', // Expire immediately
	];

	if (!isDev) {
		cookieOptions.push('Secure');
		cookieOptions.push('Domain=.tidyfeed.app');
		cookieOptions.push('SameSite=None'); // Must match the setting
	} else {
		// In dev, use Lax without Secure to match login cookie settings
		// localhost doesn't support Secure/SameSite=None without https
		cookieOptions.push('SameSite=Lax');
	}

	// For GET requests, redirect to home page
	// For POST requests, just clear the cookie and return OK
	if (c.req.method === 'POST') {
		return c.json({ success: true, message: 'Logged out successfully' }, {
			headers: {
				'Set-Cookie': cookieOptions.join('; '),
			},
		});
	} else {
		// GET request - redirect
		return new Response(null, {
			status: 302,
			headers: {
				'Location': redirectUrl,
				'Set-Cookie': cookieOptions.join('; '),
			},
		});
	}
};

app.get('/auth/logout', logoutHandler);
app.post('/auth/logout', logoutHandler);

// ============================================
// Public API Routes
// ============================================

app.post('/api/report', async (c) => {
	try {
		let reporterId = c.req.header('X-User-Id');
		const reporterType = c.req.header('X-User-Type') || 'guest';
		const authHeader = c.req.header('Authorization');

		// 1. If user claims to be logged in (google type), verify JWT
		if (reporterType === 'google' || (authHeader && authHeader.startsWith('Bearer '))) {
			let token = authHeader ? authHeader.substring(7) : null;

			// If no header, check cookie
			if (!token) {
				const cookieHeader = c.req.header('Cookie');
				if (cookieHeader) {
					const cookies = Object.fromEntries(
						cookieHeader.split(';').map((c) => {
							const [key, ...val] = c.trim().split('=');
							return [key, val.join('=')];
						})
					);
					token = cookies['auth_token'];
				}
			}

			if (token) {
				try {
					const payload = await verify(token, c.env.JWT_SECRET);
					// Trust the ID from the validated token over the header
					reporterId = payload.sub as string;
					// console.log('Verified reporter ID from JWT:', reporterId);
				} catch (e) {
					console.warn('Invalid JWT for report:', e);
					// Fallback to guest if token invalid? Or fail?
					// For security, if they claim to be google/auth but fail, we should probably fail or treat as guest
					return c.json({ error: 'Invalid authentication' }, 401);
				}
			} else if (reporterType === 'google') {
				// Claimed google but no token
				return c.json({ error: 'Authentication required for this user type' }, 401);
			}
		}

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
// Posts API Routes (Authenticated via Cookie)
// ============================================

// Helper: Trigger caching in background (non-blocking)
async function triggerCacheInBackground(
	env: Bindings,
	tweetId: string,
	userId?: string
): Promise<void> {
	try {
		// Check if already cached
		const existing = await env.DB.prepare(
			`SELECT snapshot_r2_key FROM cached_tweets WHERE tweet_id = ?`
		).bind(tweetId).first<{ snapshot_r2_key: string | null }>();

		if (existing?.snapshot_r2_key) {
			console.log(`[AutoCache] Tweet ${tweetId} already cached, skipping`);
			return;
		}

		// Check if TIKHUB_API_KEY is configured
		if (!env.TIKHUB_API_KEY) {
			console.log('[AutoCache] TIKHUB_API_KEY not configured, skipping cache');
			return;
		}

		// Import services
		const { TikHubService } = await import('./services/tikhub');
		const { generateTweetSnapshot } = await import('./services/snapshot');
		const { cacheMediaToR2, replaceMediaUrls } = await import('./services/imageCache');

		const tikhub = new TikHubService(env.TIKHUB_API_KEY);
		const tweetData = await tikhub.fetchTweetDetail(tweetId);

		if (!tweetData) {
			console.log(`[AutoCache] Failed to fetch tweet ${tweetId} from TikHub`);
			return;
		}

		// If no quoted_tweet but text contains t.co URL, try to fetch quoted tweet
		if (!tweetData.quoted_tweet && tweetData.text) {
			const quotedTweetId = await extractQuotedTweetId(tweetData.text);
			if (quotedTweetId) {
				console.log(`[AutoCache] Found quoted tweet ID in text: ${quotedTweetId}`);
				try {
					const quotedTweet = await tikhub.fetchTweetDetail(quotedTweetId);
					if (quotedTweet) {
						console.log(`[AutoCache] Successfully fetched quoted tweet: ${quotedTweetId}`);
						tweetData.quoted_tweet = quotedTweet;
					}
				} catch (err) {
					console.log(`[AutoCache] Failed to fetch quoted tweet ${quotedTweetId}:`, err);
				}
			}
		}

		// Collect all media items and avatar URLs
		const allMedia = [...(tweetData.media || [])];
		const avatarUrls: string[] = [];

		// Add main author avatar
		if (tweetData.author?.profile_image_url) {
			avatarUrls.push(tweetData.author.profile_image_url.replace('_normal', '_bigger'));
		}

		// Add quoted tweet media and avatar
		if (tweetData.quoted_tweet) {
			if (tweetData.quoted_tweet.media) {
				allMedia.push(...tweetData.quoted_tweet.media);
			}
			if (tweetData.quoted_tweet.author?.profile_image_url) {
				avatarUrls.push(tweetData.quoted_tweet.author.profile_image_url.replace('_normal', '_bigger'));
			}
		}

		// Fetch comments/replies (top 20)
		let comments: any[] = [];
		try {
			const commentsResult = await tikhub.fetchTweetComments(tweetId, undefined, 20);
			comments = commentsResult.comments || [];
			// Add comment author avatars for caching
			for (const comment of comments) {
				if (comment.author?.profile_image_url) {
					avatarUrls.push(comment.author.profile_image_url.replace('_normal', '_bigger'));
				}
			}
		} catch (err) {
			console.log(`[AutoCache] Failed to fetch comments for ${tweetId}:`, err);
		}

		// Cache all images to R2 (videos are handled separately by Python worker)
		const { urlMap, totalSize } = await cacheMediaToR2(env.MEDIA_BUCKET, tweetId, allMedia, avatarUrls);

		// Replace URLs in tweet data with cached URLs
		const cachedTweetData = replaceMediaUrls(tweetData, urlMap);

		// Generate HTML snapshot with cached URLs and comments
		const snapshotHtml = generateTweetSnapshot(cachedTweetData, comments, {
			includeComments: comments.length > 0,
			theme: 'auto',
		});

		// Upload snapshot to R2
		const r2Key = `snapshots/${tweetId}.html`;
		await env.MEDIA_BUCKET.put(r2Key, snapshotHtml, {
			httpMetadata: {
				contentType: 'text/html; charset=utf-8',
			},
		});

		// Determine metadata flags
		const hasMedia = !!(tweetData.media && tweetData.media.length > 0);
		const hasVideo = tweetData.media?.some(m => m.type === 'video' || m.type === 'animated_gif') || false;
		const hasQuotedVideo = tweetData.quoted_tweet?.media?.some(m => m.type === 'video' || m.type === 'animated_gif') || false;
		const hasQuotedTweet = !!tweetData.quoted_tweet;

		// Upsert into database
		await env.DB.prepare(`
			INSERT INTO cached_tweets (
				tweet_id, cached_data, snapshot_r2_key, comments_data, 
				comments_count, has_media, has_video, has_quoted_tweet,
				media_size
			) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
			ON CONFLICT(tweet_id) DO UPDATE SET
				cached_data = excluded.cached_data,
				snapshot_r2_key = excluded.snapshot_r2_key,
				comments_data = excluded.comments_data,
				comments_count = excluded.comments_count,
				has_media = excluded.has_media,
				has_video = excluded.has_video,
				has_quoted_tweet = excluded.has_quoted_tweet,
				media_size = excluded.media_size,
				updated_at = CURRENT_TIMESTAMP
		`).bind(
			tweetId,
			JSON.stringify(cachedTweetData), // Store data with cached image URLs
			r2Key,
			comments.length > 0 ? JSON.stringify(comments) : null,
			comments.length,
			hasMedia ? 1 : 0,
			hasVideo || hasQuotedVideo ? 1 : 0,
			hasQuotedTweet ? 1 : 0,
			totalSize
		).run();

		// Increment user storage usage if userId provided
		if (userId && totalSize > 0) {
			await env.DB.prepare(
				'UPDATE users SET storage_usage = storage_usage + ? WHERE id = ?'
			).bind(totalSize, userId).run();
			console.log(`[AutoCache] Incremented storage usage for user ${userId} by ${totalSize} bytes`);
		}

		console.log(`[AutoCache] Successfully cached tweet ${tweetId} with ${urlMap.size} images and ${comments.length} comments`);

		// Queue video downloads for Python worker (if any videos detected)
		if (hasVideo || hasQuotedVideo) {
			const videosToQueue: { tweetId: string; videoUrl: string; videoIndex: string }[] = [];

			// Check main tweet for videos
			let mainVideoIndex = 0;
			for (const media of (tweetData.media || [])) {
				if (media.type === 'video' || media.type === 'animated_gif') {
					const videoUrl = TikHubService.getBestVideoUrl(media);
					if (videoUrl) {
						videosToQueue.push({ tweetId, videoUrl, videoIndex: `${mainVideoIndex}` });
						mainVideoIndex++;
					}
				}
			}

			// Check quoted tweet for videos
			if (tweetData.quoted_tweet?.media) {
				let quotedVideoIndex = 0;
				for (const media of tweetData.quoted_tweet.media) {
					if (media.type === 'video' || media.type === 'animated_gif') {
						const videoUrl = TikHubService.getBestVideoUrl(media);
						if (videoUrl) {
							// Use main tweetId so video is associated with the snapshot
							videosToQueue.push({ tweetId, videoUrl, videoIndex: `quoted_${quotedVideoIndex}` });
							quotedVideoIndex++;
						}
					}
				}
			}

			// Queue each video for Python worker (with duplicate check)
			for (const { tweetId: tid, videoUrl, videoIndex } of videosToQueue) {
				try {
					// Check if a task already exists for this tweet_id and video_url
					const existingTask = await env.DB.prepare(
						`SELECT id, status FROM video_downloads 
						 WHERE tweet_id = ? AND video_url = ? AND task_type = 'snapshot_video' AND status != 'invalid'
						 LIMIT 1`
					).bind(tid, videoUrl).first<{ id: number; status: string }>();

					if (existingTask) {
						console.log(`[AutoCache] Video task already exists for tweet ${tid} (status: ${existingTask.status})`);
						continue;
					}

					await env.DB.prepare(
						`INSERT INTO video_downloads (user_id, tweet_url, task_type, tweet_id, video_url, status, metadata)
						 VALUES (?, ?, 'snapshot_video', ?, ?, 'pending', ?)`
					).bind(
						userId || 'system',
						`https://x.com/i/status/${tid}`,
						tid,
						videoUrl,
						JSON.stringify({ video_index: videoIndex })
					).run();
					console.log(`[AutoCache] Queued video download for tweet ${tid} (index ${videoIndex})`);
				} catch (err) {
					console.error(`[AutoCache] Failed to queue video for tweet ${tid}:`, err);
				}
			}
		}
	} catch (error) {
		console.error(`[AutoCache] Error caching tweet ${tweetId}:`, error);
	}
}


// Create a saved post
app.post('/api/posts', cookieAuthMiddleware, async (c) => {
	try {
		const payload = c.get('jwtPayload') as { sub: string };
		const userId = payload.sub;

		const { x_id, content, author, media, url, platform } = await c.req.json();

		if (!x_id) {
			return c.json({ error: 'x_id is required' }, 400);
		}

		// Check if author info is complete, if not, fetch from TikHub API
		let finalAuthor = author;
		if (!author || !author.name || !author.handle) {
			console.log(`[SavePost] Author info incomplete for ${x_id}, fetching from TikHub...`);
			try {
				const tikhubService = new TikHubService(c.env.TIKHUB_API_KEY);
				const tweetData = await tikhubService.fetchTweetDetail(x_id);

				if (tweetData && tweetData.author) {
					finalAuthor = {
						name: tweetData.author.name,
						handle: tweetData.author.screen_name,
						avatar: tweetData.author.profile_image_url || author?.avatar || ''
					};
					console.log(`[SavePost] Fetched author info from TikHub: ${finalAuthor.name} (@${finalAuthor.handle})`);
				} else {
					console.warn(`[SavePost] Failed to fetch author info from TikHub for ${x_id}`);
					// Keep the original author data even if incomplete
					finalAuthor = author || { name: '', handle: '', avatar: '' };
				}
			} catch (tikhubError) {
				console.error(`[SavePost] TikHub API error for ${x_id}:`, tikhubError);
				// Keep the original author data even if incomplete
				finalAuthor = author || { name: '', handle: '', avatar: '' };
			}
		}

		// Serialize author and media to JSON strings
		const authorInfo = finalAuthor ? JSON.stringify(finalAuthor) : null;
		const mediaUrls = media ? JSON.stringify(media) : null;

		try {
			await c.env.DB.prepare(
				`INSERT INTO saved_posts (user_id, x_post_id, content, author_info, media_urls, url, platform)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`
			).bind(userId, x_id, content || null, authorInfo, mediaUrls, url || null, platform || 'x').run();

			// Trigger caching in background (non-blocking)
			c.executionCtx.waitUntil(triggerCacheInBackground(c.env, x_id, userId));

			return c.json({ success: true, message: 'Post saved' });
		} catch (dbError: any) {
			if (dbError.message?.includes('UNIQUE constraint failed')) {
				return c.json({ success: true, message: 'Post already saved' });
			}
			throw dbError;
		}
	} catch (error) {
		console.error('Save post error:', error);
		return c.json({ error: 'Internal server error' }, 500);
	}
});

// Delete a saved post by X ID
app.delete('/api/posts/x/:x_id', cookieAuthMiddleware, async (c) => {
	try {
		const payload = c.get('jwtPayload') as { sub: string };
		const userId = payload.sub;
		const xId = c.req.param('x_id');

		// Check if there are other saved posts referencing this tweet (for shared cache cleanup)
		const otherPostsCount = await c.env.DB.prepare(
			'SELECT COUNT(*) as count FROM saved_posts WHERE x_post_id = ? AND user_id != ?'
		).bind(xId, userId).first<{ count: number }>();

		const isLastReference = !otherPostsCount || otherPostsCount.count === 0;

		// Check if there are associated video downloads to clean up
		const savedPost = await c.env.DB.prepare('SELECT id FROM saved_posts WHERE user_id = ? AND x_post_id = ?').bind(userId, xId).first<{ id: number }>();

		if (savedPost) {
			// Find completed download associated with this post (user-initiated downloads only)
			const download = await c.env.DB.prepare(
				'SELECT r2_key, file_size FROM video_downloads WHERE saved_post_id = ? AND status = "completed" AND task_type = "user_download"'
			).bind(savedPost.id).first<{ r2_key: string; file_size: number }>();

			if (download) {
				// Delete from R2
				if (download.r2_key) {
					try {
						await c.env.MEDIA_BUCKET.delete(download.r2_key);
						console.log(`Deleted R2 object: ${download.r2_key}`);
					} catch (e) {
						console.error(`Failed to delete R2 object ${download.r2_key}:`, e);
					}
				}

				// Decrement Usage (only for user-initiated downloads that were charged to this user)
				if (download.file_size && download.file_size > 0) {
					await c.env.DB.prepare(
						'UPDATE users SET storage_usage = MAX(0, storage_usage - ?) WHERE id = ?'
					).bind(download.file_size, userId).run();
				}
			}
		}

		// Only decrement storage for cached media if this is the last reference
		// Cached media is shared across users, so we shouldn't decrement if others still reference it
		if (isLastReference) {
			// Find and decrement snapshot_video storage that was charged to this user
			const snapshotVideoDownload = await c.env.DB.prepare(
				'SELECT file_size FROM video_downloads WHERE tweet_id = ? AND task_type = "snapshot_video" AND status = "completed"'
			).bind(xId).first<{ file_size: number }>();

			if (snapshotVideoDownload && snapshotVideoDownload.file_size && snapshotVideoDownload.file_size > 0) {
				await c.env.DB.prepare(
					'UPDATE users SET storage_usage = MAX(0, storage_usage - ?) WHERE id = ?'
				).bind(snapshotVideoDownload.file_size, userId).run();
				console.log(`[Delete] Decremented storage usage for user ${userId} by ${snapshotVideoDownload.file_size} bytes (snapshot_video)`);
			}
		}

		// Delete the saved post
		const result = await c.env.DB.prepare(
			'DELETE FROM saved_posts WHERE user_id = ? AND x_post_id = ?'
		).bind(userId, xId).run();

		if (result.meta.changes === 0) {
			return c.json({ error: 'Post not found' }, 404);
		}

		// Clean up cached content (background, non-blocking)
		// Only clean up shared cache if this was the last reference
		c.executionCtx.waitUntil((async () => {
			try {
				// Only delete shared cached content if no other users reference this tweet
				if (isLastReference) {
					// Delete cached_tweets entry
					await c.env.DB.prepare('DELETE FROM cached_tweets WHERE tweet_id = ?').bind(xId).run();

					// Delete tag references
					await c.env.DB.prepare('DELETE FROM tweet_tag_refs WHERE tweet_id = ?').bind(xId).run();

					// Delete all R2 images for this tweet
					const imagesList = await c.env.MEDIA_BUCKET.list({ prefix: `images/${xId}/` });
					for (const obj of imagesList.objects) {
						await c.env.MEDIA_BUCKET.delete(obj.key);
					}
					console.log(`[Cleanup] Deleted ${imagesList.objects.length} cached images for tweet ${xId}`);

					// Delete all R2 videos for this tweet (excluding user downloads which are handled above)
					const videosList = await c.env.MEDIA_BUCKET.list({ prefix: `videos/${xId}/` });
					for (const obj of videosList.objects) {
						await c.env.MEDIA_BUCKET.delete(obj.key);
					}
					if (videosList.objects.length > 0) {
						console.log(`[Cleanup] Deleted ${videosList.objects.length} cached videos for tweet ${xId}`);
					}

					// Mark snapshot_video downloads as 'invalid' for this tweet
					const videoUpdateResult = await c.env.DB.prepare(
						`UPDATE video_downloads SET status = 'invalid' WHERE tweet_id = ? AND task_type = 'snapshot_video'`
					).bind(xId).run();
					if (videoUpdateResult.meta.changes > 0) {
						console.log(`[Cleanup] Marked ${videoUpdateResult.meta.changes} snapshot_video downloads as invalid for tweet ${xId}`);
					}

					// Delete R2 snapshot (shared content, only delete when last reference is removed)
					await c.env.MEDIA_BUCKET.delete(`snapshots/${xId}.html`);
					console.log(`[Cleanup] Deleted snapshot for tweet ${xId}`);
				}

				// Always delete this user's snapshot notes for this tweet (user-specific, not shared)
				const notesDeleteResult = await c.env.DB.prepare('DELETE FROM snapshot_notes WHERE tweet_id = ? AND user_id = ?').bind(xId, userId).run();
				if (notesDeleteResult.meta.changes > 0) {
					console.log(`[Cleanup] Deleted ${notesDeleteResult.meta.changes} notes for user ${userId} on tweet ${xId}`);
				}
			} catch (err) {
				console.error(`[Cleanup] Error cleaning cached content for ${xId}:`, err);
			}
		})());

		return c.json({ success: true, message: 'Post deleted' });
	} catch (error) {
		console.error('Delete post error:', error);
		return c.json({ error: 'Internal server error' }, 500);
	}
});

// Get all post IDs for the user (for extension sync)
app.get('/api/posts/ids', cookieAuthMiddleware, async (c) => {
	try {
		const payload = c.get('jwtPayload') as { sub: string };
		const userId = payload.sub;

		const posts = await c.env.DB.prepare(
			'SELECT x_post_id FROM saved_posts WHERE user_id = ?'
		).bind(userId).all<{ x_post_id: string }>();

		const ids = posts.results?.map((p) => p.x_post_id) || [];

		return c.json({ ids });
	} catch (error) {
		console.error('Get post IDs error:', error);
		return c.json({ error: 'Internal server error' }, 500);
	}
});

// Get full posts with search and pagination
// Get all saved posts (with pagination, search, and tags)
// Get all saved posts (with pagination, search, and tags)
app.get('/api/posts', cookieAuthMiddleware, async (c) => {
	try {
		const payload = c.get('jwtPayload') as { sub: string };
		const userId = payload.sub;

		const search = c.req.query('search') || '';
		const limit = Math.min(parseInt(c.req.query('limit') || '20'), 100);
		const offset = parseInt(c.req.query('offset') || '0');

		let baseQuery = 'FROM saved_posts WHERE user_id = ?';
		const baseParams: any[] = [userId];

		if (search) {
			baseQuery += ' AND (content LIKE ? OR author_info LIKE ?)';
			baseParams.push(`%${search}%`, `%${search}%`);
		}

		// Get total count for pagination
		const countResult = await c.env.DB.prepare(`SELECT COUNT(*) as total ${baseQuery}`)
			.bind(...baseParams)
			.first<{ total: number }>();
		const total = countResult?.total || 0;

		// If no posts, return early
		if (total === 0) {
			return c.json({
				count: 0,
				total: 0,
				posts: [],
			});
		}

		// Sort by pinned_at DESC first (pinned items), then created_at DESC
		const query = `SELECT * ${baseQuery} ORDER BY pinned_at DESC, created_at DESC LIMIT ? OFFSET ?`;
		const params = [...baseParams, limit, offset];

		const posts = await c.env.DB.prepare(query).bind(...params).all<any>();

		// Parse JSON fields and extract IDs for tag fetching
		// Helper function for safe JSON parsing
		const safeParse = (value: string | null) => {
			if (!value) return null;
			try {
				return JSON.parse(value);
			} catch (e) {
				console.error('[API] Failed to parse JSON field:', e);
				return null;
			}
		};

		const formattedPosts = posts.results.map((post) => ({
			id: post.id,
			xId: post.x_post_id,
			content: post.content,
			author: safeParse(post.author_info),
			media: safeParse(post.media_urls),
			url: post.url,
			platform: post.platform,
			createdAt: post.created_at,
			pinnedAt: post.pinned_at,
			tags: [] as { id: number; name: string }[], // Initialize empty tags
		}));

		// Fetch tags for these posts
		const xIds = formattedPosts.map(p => p.xId);
		if (xIds.length > 0) {
			const placeholders = xIds.map(() => '?').join(',');
			const tagsQuery = `
				SELECT ttr.tweet_id, t.id, t.name 
				FROM tags t 
				JOIN tweet_tag_refs ttr ON t.id = ttr.tag_id 
				WHERE ttr.tweet_id IN (${placeholders}) AND t.user_id = ?
			`;

			const tagsResult = await c.env.DB.prepare(tagsQuery)
				.bind(...xIds, userId)
				.all<{ tweet_id: string; id: number; name: string }>();

			// Map tags to posts
			if (tagsResult.results && tagsResult.results.length > 0) {
				const tagsMap = new Map<string, { id: number; name: string }[]>();

				tagsResult.results.forEach(row => {
					if (!tagsMap.has(row.tweet_id)) {
						tagsMap.set(row.tweet_id, []);
					}
					tagsMap.get(row.tweet_id)!.push({ id: row.id, name: row.name });
				});

				formattedPosts.forEach(post => {
					if (tagsMap.has(post.xId)) {
						post.tags = tagsMap.get(post.xId)!;
					}
				});
			}
		}

		// Fetch cache status for these posts
		if (xIds.length > 0) {
			const placeholders = xIds.map(() => '?').join(',');
			const cacheQuery = `
				SELECT tweet_id, snapshot_r2_key 
				FROM cached_tweets 
				WHERE tweet_id IN (${placeholders})
			`;

			const cacheResult = await c.env.DB.prepare(cacheQuery)
				.bind(...xIds)
				.all<{ tweet_id: string; snapshot_r2_key: string | null }>();

			if (cacheResult.results && cacheResult.results.length > 0) {
				const cacheMap = new Map<string, { cached: boolean; snapshotUrl?: string }>();

				cacheResult.results.forEach(row => {
					if (row.snapshot_r2_key) {
						const webAppUrl = c.env.WEB_APP_URL || 'https://tidyfeed.app';
						cacheMap.set(row.tweet_id, {
							cached: true,
							snapshotUrl: `${webAppUrl}/s/${row.tweet_id}`
						});
					}
				});

				formattedPosts.forEach(post => {
					if (cacheMap.has(post.xId)) {
						// @ts-ignore
						post.cacheInfo = cacheMap.get(post.xId);
					}
				});
			}
		}

		// Fetch video download status for posts with URLs
		const urlsForVideoLookup = formattedPosts
			.filter(p => p.url)
			.map(p => p.url);

		if (urlsForVideoLookup.length > 0) {
			const placeholders = urlsForVideoLookup.map(() => '?').join(',');
			const videoQuery = `
				SELECT tweet_url, id, status, r2_key, metadata
				FROM video_downloads
				WHERE user_id = ? AND tweet_url IN (${placeholders})
			`;

			const videoResult = await c.env.DB.prepare(videoQuery)
				.bind(userId, ...urlsForVideoLookup)
				.all<{ tweet_url: string; id: number; status: string; r2_key: string | null; metadata: string | null }>();

			// Map video info to posts
			if (videoResult.results && videoResult.results.length > 0) {
				const videoMap = new Map<string, { id: number; status: string; r2_key: string | null; metadata: any }>();

				videoResult.results.forEach(row => {
					videoMap.set(row.tweet_url, {
						id: row.id,
						status: row.status,
						r2_key: row.r2_key,
						metadata: row.metadata ? JSON.parse(row.metadata) : null
					});
				});

				formattedPosts.forEach(post => {
					if (post.url && videoMap.has(post.url)) {
						(post as any).videoInfo = videoMap.get(post.url);
					}
				});
			}
		}

		return c.json({
			count: formattedPosts.length,
			total,
			posts: formattedPosts,
		});
	} catch (error) {
		console.error('Get posts error:', error);
		return c.json({ error: 'Internal server error' }, 500);
	}
});

// Pin/Unpin a post
app.patch('/api/posts/:x_id/pin', cookieAuthMiddleware, async (c) => {
	try {
		const payload = c.get('jwtPayload') as { sub: string };
		const userId = payload.sub;
		const xId = c.req.param('x_id');
		const { pinned } = await c.req.json();

		if (typeof pinned !== 'boolean') {
			return c.json({ error: 'Pinned status (boolean) is required' }, 400);
		}

		// Update pinned_at timestamp
		// If pinned is true, set to current time. If false, set to NULL.
		const query = pinned
			? 'UPDATE saved_posts SET pinned_at = CURRENT_TIMESTAMP WHERE user_id = ? AND x_post_id = ?'
			: 'UPDATE saved_posts SET pinned_at = NULL WHERE user_id = ? AND x_post_id = ?';

		const result = await c.env.DB.prepare(query)
			.bind(userId, xId)
			.run();

		if (result.meta.changes === 0) {
			return c.json({ error: 'Post not found' }, 404);
		}

		return c.json({ success: true, message: pinned ? 'Post pinned' : 'Post unpinned' });
	} catch (error) {
		console.error('Pin post error:', error);
		return c.json({ error: 'Internal server error' }, 500);
	}
});

// ============================================
// Tagging System API Routes (Authenticated via Cookie)
// ============================================

// Get all tags with tweet count
app.get('/api/tags', cookieAuthMiddleware, async (c) => {
	try {
		const payload = c.get('jwtPayload') as { sub: string };
		const userId = payload.sub;

		const tags = await c.env.DB.prepare(
			`SELECT 
				t.id, 
				t.name, 
				COUNT(sp.x_post_id) as tweet_count
			 FROM tags t
			 LEFT JOIN tweet_tag_refs ttr ON t.id = ttr.tag_id
             LEFT JOIN saved_posts sp ON ttr.tweet_id = sp.x_post_id AND sp.user_id = t.user_id
			 WHERE t.user_id = ?
			 GROUP BY t.id, t.name
			 ORDER BY t.name ASC`
		).bind(userId).all<{ id: number; name: string; tweet_count: number }>();

		return c.json({
			success: true,
			tags: tags.results || [],
		});
	} catch (error) {
		console.error('Get tags error:', error);
		return c.json({ error: 'Internal server error' }, 500);
	}
});

// Create a new tag
app.post('/api/tags', cookieAuthMiddleware, async (c) => {
	try {
		const payload = c.get('jwtPayload') as { sub: string };
		const userId = payload.sub;
		const { name } = await c.req.json();

		if (!name || typeof name !== 'string' || name.trim().length === 0) {
			return c.json({ error: 'Tag name is required' }, 400);
		}

		const tagName = name.trim();


		// Check if tag already exists for this user
		let tag = await c.env.DB.prepare(
			'SELECT id, name FROM tags WHERE name = ? AND user_id = ?'
		).bind(tagName, userId).first<{ id: number; name: string }>();

		if (!tag) {
			// Create new tag if not exists
			try {
				const result = await c.env.DB.prepare(
					'INSERT INTO tags (name, user_id) VALUES (?, ?)'
				).bind(tagName, userId).run();

				// Get the created tag
				if (result.success) {
					tag = await c.env.DB.prepare(
						'SELECT id, name FROM tags WHERE id = ?'
					).bind(result.meta.last_row_id).first<{ id: number; name: string }>();
				}
			} catch (e: any) {
				// Handle race condition where insert fails due to unique constraint
				if (e.message?.includes('UNIQUE constraint failed')) {
					tag = await c.env.DB.prepare(
						'SELECT id, name FROM tags WHERE name = ? AND user_id = ?'
					).bind(tagName, userId).first<{ id: number; name: string }>();
				} else {
					throw e;
				}
			}
		}

		return c.json({
			success: true,
			tag,
		});
	} catch (error) {
		console.error('Create tag error:', error);
		return c.json({ error: 'Internal server error' }, 500);
	}
});

// Delete a tag by ID
app.delete('/api/tags/:id', cookieAuthMiddleware, async (c) => {
	try {
		const payload = c.get('jwtPayload') as { sub: string };
		const userId = payload.sub;
		const tagId = parseInt(c.req.param('id'));

		if (isNaN(tagId)) {
			return c.json({ error: 'Invalid tag ID' }, 400);
		}

		// Delete tag and its references (CASCADE should handle references, but we filter by user_id)
		const result = await c.env.DB.prepare(
			'DELETE FROM tags WHERE id = ? AND user_id = ?'
		).bind(tagId, userId).run();

		if (result.meta.changes === 0) {
			return c.json({ error: 'Tag not found' }, 404);
		}

		// Note: tweet_tag_refs entries are automatically deleted via CASCADE

		return c.json({ success: true, message: 'Tag deleted' });
	} catch (error) {
		console.error('Delete tag error:', error);
		return c.json({ error: 'Internal server error' }, 500);
	}
});

// Rename a tag
app.patch('/api/tags/:id', cookieAuthMiddleware, async (c) => {
	try {
		const payload = c.get('jwtPayload') as { sub: string };
		const userId = payload.sub;
		const tagId = parseInt(c.req.param('id'));
		const { name } = await c.req.json();

		if (isNaN(tagId)) return c.json({ error: 'Invalid tag ID' }, 400);
		if (!name || typeof name !== 'string' || !name.trim()) {
			return c.json({ error: 'Tag name is required' }, 400);
		}

		const tagName = name.trim();

		// Check for duplicate name for this user (excluding current tag)
		const existing = await c.env.DB.prepare(
			'SELECT id FROM tags WHERE name = ? AND user_id = ? AND id != ?'
		).bind(tagName, userId, tagId).first();

		if (existing) {
			return c.json({ error: 'Tag name already exists' }, 409);
		}

		const result = await c.env.DB.prepare(
			'UPDATE tags SET name = ? WHERE id = ? AND user_id = ?'
		).bind(tagName, tagId, userId).run();

		if (!result.success || result.meta.changes === 0) {
			return c.json({ error: 'Tag not found or update failed' }, 404);
		}

		return c.json({ success: true });
	} catch (error) {
		console.error('Rename tag error:', error);
		return c.json({ error: 'Internal server error' }, 500);
	}
});

// Tag a tweet (atomic operation)
app.post('/api/tweets/tag', cookieAuthMiddleware, async (c) => {
	try {
		const { tweet_id, tag_name, tweet_data } = await c.req.json();

		if (!tweet_id || typeof tweet_id !== 'string') {
			return c.json({ error: 'tweet_id is required' }, 400);
		}

		if (!tag_name || typeof tag_name !== 'string' || tag_name.trim().length === 0) {
			return c.json({ error: 'tag_name is required' }, 400);
		}

		const payload = c.get('jwtPayload') as { sub: string };
		const userId = payload.sub;

		const tagName = tag_name.trim();
		const dataJson = tweet_data ? JSON.stringify(tweet_data) : '{}';

		// Use DB.batch() for atomic operations
		const statements = [
			// 1. Upsert tweet into tweet_cache
			c.env.DB.prepare(
				`INSERT OR REPLACE INTO tweet_cache (tweet_id, data_json, updated_at)
				 VALUES (?, ?, CURRENT_TIMESTAMP)`
			).bind(tweet_id, dataJson),

			// 2. Insert tag if not exists for this user
			c.env.DB.prepare(
				'INSERT OR IGNORE INTO tags (name, user_id) VALUES (?, ?)'
			).bind(tagName, userId),

			// 3. Create relationship using subquery to get tag_id
			c.env.DB.prepare(
				`INSERT OR IGNORE INTO tweet_tag_refs (tweet_id, tag_id)
				 VALUES (?, (SELECT id FROM tags WHERE name = ? AND user_id = ?))`
			).bind(tweet_id, tagName, userId),
		];

		await c.env.DB.batch(statements);

		return c.json({ success: true, message: 'Tweet tagged successfully' });
	} catch (error) {
		console.error('Tag tweet error:', error);
		return c.json({ error: 'Internal server error' }, 500);
	}
});

// Get tweets by tag
app.get('/api/tweets/by-tag/:tagId', cookieAuthMiddleware, async (c) => {
	try {
		const payload = c.get('jwtPayload') as { sub: string };
		const userId = payload.sub;
		const tagId = parseInt(c.req.param('tagId'));

		if (isNaN(tagId)) {
			return c.json({ error: 'Invalid tag ID' }, 400);
		}

		// Verify tag ownership & fetch tweets
		// Using cached_tweets as the source of truth for tweet data
		const tweets = await c.env.DB.prepare(
			`SELECT tc.tweet_id, tc.cached_data as data_json, tc.updated_at, tc.snapshot_r2_key
			 FROM cached_tweets tc
			 INNER JOIN tweet_tag_refs ttr ON tc.tweet_id = ttr.tweet_id
			 INNER JOIN tags t ON ttr.tag_id = t.id
			 WHERE ttr.tag_id = ? AND t.user_id = ?
			 ORDER BY tc.updated_at DESC`
		).bind(tagId, userId).all<{ tweet_id: string; data_json: string; updated_at: string; snapshot_r2_key: string | null }>();

		// Parse data_json for each tweet
		const formattedTweets = (tweets.results || []).map((tweet) => {
			const parsedData = JSON.parse(tweet.data_json);
			return {
				tweetId: tweet.tweet_id,
				data: parsedData,
				updatedAt: tweet.updated_at,
				cacheInfo: tweet.snapshot_r2_key ? {
					cached: true,
					snapshotUrl: `${c.env.WEB_APP_URL || 'https://tidyfeed.app'}/s/${tweet.tweet_id}`
				} : null
			};
		});

		return c.json({
			success: true,
			tweets: formattedTweets,
		});
	} catch (error) {
		return c.json({ error: 'Internal server error' }, 500);
	}
});

// Remove tag from tweet
app.delete('/api/tweets/:tweetId/tags/:tagId', cookieAuthMiddleware, async (c) => {
	try {
		const tweetId = c.req.param('tweetId');
		const tagId = parseInt(c.req.param('tagId'));

		if (!tweetId) {
			return c.json({ error: 'Tweet ID is required' }, 400);
		}

		if (isNaN(tagId)) {
			return c.json({ error: 'Invalid tag ID' }, 400);
		}

		const result = await c.env.DB.prepare(
			'DELETE FROM tweet_tag_refs WHERE tweet_id = ? AND tag_id = ?'
		).bind(tweetId, tagId).run();

		if (result.meta.changes === 0) {
			return c.json({ error: 'Tag relationship not found' }, 404);
		}

		return c.json({ success: true, message: 'Tag removed from tweet' });
	} catch (error) {
		console.error('Remove tag from tweet error:', error);
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

// Mount downloads routes
app.route('/api/downloads', downloads);

// Mount internal service routes (bot worker, etc.)
app.route('/api/internal', internal);

// Mount tweet caching routes
app.route('/api/tweets', caching);

// Mount admin routes
app.route('/api/admin', admin);

// Mount AI routes
app.route('/api/ai', ai);

// Mount library routes
app.route('/api/library', library);

// Mount notes routes
app.route('/api/notes', notes);

export default app;

// Helper: Extract quoted tweet ID from t.co URLs in text
async function extractQuotedTweetId(text: string): Promise<string | null> {
	try {
		// Find all t.co links
		const tcoMatches = text.match(/https:\/\/t\.co\/[a-zA-Z0-9]+/g);
		if (!tcoMatches) return null;

		for (const tcoUrl of tcoMatches) {
			try {
				// Resolve URL (HEAD request not always supported by t.co, use GET with redirect: manual or follow)
				const response = await fetch(tcoUrl, {
					method: 'GET',
					redirect: 'manual',
					headers: {
						'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
					}
				});

				const locationHeader = response.headers.get('location');
				let targetUrl = locationHeader;

				if (!targetUrl) {
					const text = await response.text();
					// Try to find URL in meta refresh or script
					const metaMatch = text.match(/URL=([^"]+)"/i);
					if (metaMatch) targetUrl = metaMatch[1];

					if (!targetUrl) {
						const scriptMatch = text.match(/location\.replace\("([^"]+)"\)/);
						if (scriptMatch) targetUrl = scriptMatch[1].replace(/\\/g, '');
					}
				}

				if (targetUrl) {
					// Check if it matches a tweet URL
					// https://twitter.com/username/status/1234567890
					// https://x.com/username/status/1234567890
					const tweetMatch = targetUrl.match(/(?:twitter\.com|x\.com)\/(?:\w+)\/status\/(\d+)/);
					if (tweetMatch && tweetMatch[1]) {
						return tweetMatch[1];
					}
				}
			} catch (e) {
				console.log(`[AutoCache] Error resolving ${tcoUrl}: `, e);
			}
		}
		return null;
	} catch (e) {
		console.error('[AutoCache] Error extracting quoted tweet ID:', e);
		return null;
	}
}
