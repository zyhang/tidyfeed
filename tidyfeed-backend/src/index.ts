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

// CORS middleware - allow specific origins for credentials
// CORS middleware - allow specific origins for credentials
app.use('*', cors({
	origin: (origin) => {
		const allowed = ['https://a.tidyfeed.app', 'https://tidyfeed.app', 'http://localhost:3000'];
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
			return c.redirect('https://a.tidyfeed.app/?error=oauth_denied');
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

		if (!isDev) {
			cookieOptions.push('Secure');
			cookieOptions.push('Domain=.tidyfeed.app');
			cookieOptions.push('SameSite=None'); // Required for cross-origin requests
		} else {
			cookieOptions.push('SameSite=None');
			cookieOptions.push('Secure');
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

		// Atomic Upsert
		await c.env.DB.prepare(
			`INSERT INTO social_accounts (user_id, platform, platform_user_id, platform_username, display_name, avatar_url, updated_at, last_synced_at)
			 VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
			 ON CONFLICT(platform, platform_user_id) DO UPDATE SET
				platform_username = COALESCE(excluded.platform_username, social_accounts.platform_username),
				display_name = COALESCE(excluded.display_name, social_accounts.display_name),
				avatar_url = COALESCE(excluded.avatar_url, social_accounts.avatar_url),
				updated_at = CURRENT_TIMESTAMP,
				last_synced_at = CURRENT_TIMESTAMP`
		).bind(userId, platform, String(platform_user_id), platform_username || null, display_name || null, avatar_url || null).run();

		console.log('Link social success:', { userId, platform, platform_user_id });
		return c.json({ success: true, message: 'Social account linked' });
	} catch (error) {
		console.error('Link social account error:', error);
		return c.json({ error: 'Internal server error', details: String(error) }, 500);
	}
});

// Logout - clear auth cookie
app.get('/auth/logout', (c) => {
	const isDev = c.req.url.includes('localhost') || c.req.url.includes('127.0.0.1');
	const redirectUrl = isDev ? 'http://localhost:3000' : 'https://a.tidyfeed.app';

	// Clear the auth cookie by setting it to expire immediately
	const cookieOptions = [
		'auth_token=',
		'Path=/',
		'HttpOnly',
		'Max-Age=0', // Expire immediately
	];

	if (!isDev) {
		cookieOptions.push('Secure');
		cookieOptions.push('Domain=.tidyfeed.app');
		cookieOptions.push('SameSite=None');
	} else {
		cookieOptions.push('SameSite=None');
		cookieOptions.push('Secure');
	}

	return new Response(null, {
		status: 302,
		headers: {
			'Location': redirectUrl,
			'Set-Cookie': cookieOptions.join('; '),
		},
	});
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
// Posts API Routes (Authenticated via Cookie)
// ============================================

// Create a saved post
app.post('/api/posts', cookieAuthMiddleware, async (c) => {
	try {
		const payload = c.get('jwtPayload') as { sub: string };
		const userId = payload.sub;

		const { x_id, content, author, media, url, platform } = await c.req.json();

		if (!x_id) {
			return c.json({ error: 'x_id is required' }, 400);
		}

		// Serialize author and media to JSON strings
		const authorInfo = author ? JSON.stringify(author) : null;
		const mediaUrls = media ? JSON.stringify(media) : null;

		try {
			await c.env.DB.prepare(
				`INSERT INTO saved_posts (user_id, x_post_id, content, author_info, media_urls, url, platform)
				 VALUES (?, ?, ?, ?, ?, ?, ?)`
			).bind(userId, x_id, content || null, authorInfo, mediaUrls, url || null, platform || 'x').run();

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

		const result = await c.env.DB.prepare(
			'DELETE FROM saved_posts WHERE user_id = ? AND x_post_id = ?'
		).bind(userId, xId).run();

		if (result.meta.changes === 0) {
			return c.json({ error: 'Post not found' }, 404);
		}

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

		let query = 'SELECT * FROM saved_posts WHERE user_id = ?';
		const params: any[] = [userId];

		if (search) {
			query += ' AND (content LIKE ? OR author_info LIKE ?)';
			params.push(`%${search}%`, `%${search}%`);
		}

		// Sort by pinned_at DESC first (pinned items), then created_at DESC
		query += ' ORDER BY pinned_at DESC, created_at DESC LIMIT ? OFFSET ?';
		params.push(limit, offset);

		const posts = await c.env.DB.prepare(query).bind(...params).all<any>();

		// If no posts, return early
		if (!posts.results || posts.results.length === 0) {
			return c.json({
				count: 0,
				posts: [],
			});
		}

		// Parse JSON fields and extract IDs for tag fetching
		const formattedPosts = posts.results.map((post) => ({
			id: post.id,
			xId: post.x_post_id,
			content: post.content,
			author: post.author_info ? JSON.parse(post.author_info) : null,
			media: post.media_urls ? JSON.parse(post.media_urls) : null,
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

		return c.json({
			count: formattedPosts.length,
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
				COUNT(ttr.tweet_id) as tweet_count
			 FROM tags t
			 LEFT JOIN tweet_tag_refs ttr ON t.id = ttr.tag_id
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

		// Use INSERT OR IGNORE to prevent duplicates for this user
		await c.env.DB.prepare(
			'INSERT OR IGNORE INTO tags (name, user_id) VALUES (?, ?)'
		).bind(tagName, userId).run();

		// Fetch the tag
		const tag = await c.env.DB.prepare(
			'SELECT id, name FROM tags WHERE name = ? AND user_id = ?'
		).bind(tagName, userId).first<{ id: number; name: string }>();

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
		const tweets = await c.env.DB.prepare(
			`SELECT tc.tweet_id, tc.data_json, tc.updated_at
			 FROM tweet_cache tc
			 INNER JOIN tweet_tag_refs ttr ON tc.tweet_id = ttr.tweet_id
			 INNER JOIN tags t ON ttr.tag_id = t.id
			 WHERE ttr.tag_id = ? AND t.user_id = ?
			 ORDER BY tc.updated_at DESC`
		).bind(tagId, userId).all<{ tweet_id: string; data_json: string; updated_at: string }>();

		// Parse data_json for each tweet
		const formattedTweets = (tweets.results || []).map((tweet) => ({
			tweetId: tweet.tweet_id,
			data: JSON.parse(tweet.data_json || '{}'),
			updatedAt: tweet.updated_at,
		}));

		return c.json({
			success: true,
			tweets: formattedTweets,
		});
	} catch (error) {
		console.error('Get tweets by tag error:', error);
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

export default app;
