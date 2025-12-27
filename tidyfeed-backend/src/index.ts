/**
 * TidyFeed Backend API
 * Cloudflare Worker with Hono + D1
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { sign, verify } from 'hono/jwt';
import bcrypt from 'bcryptjs';

type Bindings = {
	DB: D1Database;
	JWT_SECRET: string;
};

const app = new Hono<{ Bindings: Bindings }>();

// CORS middleware - allow all origins
app.use('*', cors());

// Health check
app.get('/', (c) => {
	return c.json({ status: 'ok', service: 'TidyFeed API' });
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
