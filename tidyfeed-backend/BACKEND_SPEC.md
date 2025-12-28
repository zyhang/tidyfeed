# TidyFeed Backend API Specification

> **Version**: 1.0.0  
> **Runtime**: Cloudflare Workers (Hono + D1)  
> **Base URL**: `https://api.tidyfeed.app`

---

## Quick Reference

| Endpoint | Method | Auth | Description |
|----------|--------|------|-------------|
| `/` | GET | ❌ | Health check |
| `/auth/login` | POST | ❌ | Admin login |
| `/auth/google` | POST | ❌ | Google OAuth (Chrome Extension) |
| `/auth/login/google` | GET | ❌ | Google OAuth redirect (Web) |
| `/auth/callback/google` | GET | ❌ | Google OAuth callback (Web) |
| `/auth/me` | GET | Cookie | Get current user |
| `/api/report` | POST | Header | Submit user report |
| `/api/reports` | GET | JWT | Get aggregated reports |
| `/api/reports/all` | GET | JWT | Get all individual reports |

---

## Authentication

### Header-Based Auth (Public API)

For `/api/report` endpoint, include these headers:

```http
X-User-Id: <unique_user_identifier>
X-User-Type: guest | google
```

### JWT Bearer Token (Admin API)

For protected endpoints, include:

```http
Authorization: Bearer <jwt_token>
```

JWT expires in **7 days**.

---

## API Endpoints

### 1. Health Check

```
GET /
```

**Response**:
```json
{
  "status": "ok",
  "service": "TidyFeed API"
}
```

---

### 2. Admin Login

```
POST /auth/login
Content-Type: application/json
```

**Request Body**:
```json
{
  "email": "admin@example.com",
  "password": "your_password"
}
```

**Success Response** (200):
```json
{
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "email": "admin@example.com"
}
```

**Error Responses**:
| Code | Body |
|------|------|
| 400 | `{"error": "Email and password are required"}` |
| 401 | `{"error": "Invalid credentials"}` |
| 500 | `{"error": "Internal server error"}` |

---

### 3. Google OAuth Login (Web)

Redirect users to Google OAuth consent screen.

```
GET /auth/login/google
```

**Flow**:
1. User is redirected to Google's OAuth consent screen
2. After consent, Google redirects to `/auth/callback/google`
3. Callback exchanges code, creates/updates user, sets cookie
4. User is redirected to `https://tidyfeed.app/dashboard`

---

### 4. Google OAuth Callback (Web)

Handles OAuth callback from Google. **Do not call directly.**

```
GET /auth/callback/google?code=xxx&state=xxx
```

**On Success**:
- Sets `auth_token` HttpOnly cookie (30 days)
- Redirects to `https://tidyfeed.app/dashboard`

**On Error**: Redirects to `https://tidyfeed.app/?error=<error_code>`

---

### 5. Get Current User

Returns authenticated user info from cookie.

```
GET /auth/me
Cookie: auth_token=<jwt>
```

**Success Response** (200):
```json
{
  "user": {
    "id": "uuid",
    "email": "user@example.com",
    "name": "John Doe",
    "avatarUrl": "https://...",
    "createdAt": "2025-12-28T10:00:00Z"
  }
}
```

**Error Responses**:
| Code | Body |
|------|------|
| 401 | `{"error": "Unauthorized"}` |
| 401 | `{"error": "Invalid token"}` |
| 404 | `{"error": "User not found"}` |

---

### 6. Submit Report

Report a blocked X (Twitter) user.

```
POST /api/report
Content-Type: application/json
X-User-Id: <reporter_unique_id>
X-User-Type: guest | google
```

**Request Body**:
```json
{
  "blocked_x_id": "123456789",
  "blocked_x_name": "spam_user",
  "reason": "spam"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `blocked_x_id` | string | ✅ | X user ID being reported |
| `blocked_x_name` | string | ❌ | X username/handle |
| `reason` | string | ❌ | Report reason |

**Success Response** (200):
```json
{
  "success": true,
  "message": "Report submitted"
}
```

**Duplicate Report** (200):
```json
{
  "success": true,
  "message": "Already reported"
}
```

**Error Responses**:
| Code | Body |
|------|------|
| 400 | `{"error": "X-User-Id header is required"}` |
| 400 | `{"error": "Invalid reporter type"}` |
| 400 | `{"error": "blocked_x_id is required"}` |
| 500 | `{"error": "Internal server error"}` |

---

### 4. Get Aggregated Reports (Admin)

Get reports grouped by `blocked_x_id` with counts.

```
GET /api/reports
Authorization: Bearer <jwt_token>
```

**Response** (200):
```json
{
  "count": 10,
  "reports": [
    {
      "blocked_x_id": "123456789",
      "blocked_x_name": "spam_user",
      "report_count": 5,
      "reasons": "spam,harassment",
      "latest_report": "2025-12-28T10:00:00Z"
    }
  ]
}
```

**Error Responses**:
| Code | Body |
|------|------|
| 401 | `{"error": "Unauthorized"}` |
| 401 | `{"error": "Invalid token"}` |
| 500 | `{"error": "Internal server error"}` |

---

### 5. Get All Individual Reports (Admin)

Get all individual report records.

```
GET /api/reports/all
Authorization: Bearer <jwt_token>
```

**Response** (200):
```json
{
  "count": 50,
  "reports": [
    {
      "id": 1,
      "reporter_id": "guest_abc123",
      "reporter_type": "guest",
      "blocked_x_id": "123456789",
      "blocked_x_name": "spam_user",
      "reason": "spam",
      "created_at": "2025-12-28T10:00:00Z"
    }
  ]
}
```

---

## Database Schema

### `admins` Table

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| email | TEXT | UNIQUE NOT NULL |
| password_hash | TEXT | NOT NULL |

### `reports` Table

| Column | Type | Constraints |
|--------|------|-------------|
| id | INTEGER | PRIMARY KEY AUTOINCREMENT |
| reporter_id | TEXT | NOT NULL |
| reporter_type | TEXT | NOT NULL, CHECK IN ('guest', 'google') |
| blocked_x_id | TEXT | NOT NULL |
| blocked_x_name | TEXT | nullable |
| reason | TEXT | nullable |
| created_at | DATETIME | DEFAULT CURRENT_TIMESTAMP |

**Unique Constraint**: `(reporter_id, blocked_x_id)` - prevents duplicate reports from same user.

---

## Code Examples

### JavaScript/TypeScript - Submit Report

```typescript
const API_BASE = 'https://tidyfeed-backend.workers.dev';

async function submitReport(blockedUserId: string, blockedUserName?: string, reason?: string) {
  const response = await fetch(`${API_BASE}/api/report`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Id': getUserId(), // Your unique user identifier
      'X-User-Type': 'guest',   // or 'google' if authenticated
    },
    body: JSON.stringify({
      blocked_x_id: blockedUserId,
      blocked_x_name: blockedUserName,
      reason: reason,
    }),
  });
  return response.json();
}
```

### JavaScript/TypeScript - Admin Login & Fetch Reports

```typescript
// Login
async function adminLogin(email: string, password: string) {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await response.json();
  if (data.token) {
    localStorage.setItem('adminToken', data.token);
  }
  return data;
}

// Fetch Reports (requires auth)
async function fetchReports() {
  const token = localStorage.getItem('adminToken');
  const response = await fetch(`${API_BASE}/api/reports`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.json();
}
```

### cURL Examples

```bash
# Health check
curl https://tidyfeed-backend.workers.dev/

# Submit report
curl -X POST https://tidyfeed-backend.workers.dev/api/report \
  -H "Content-Type: application/json" \
  -H "X-User-Id: guest_12345" \
  -H "X-User-Type: guest" \
  -d '{"blocked_x_id": "123456789", "blocked_x_name": "spammer", "reason": "spam"}'

# Admin login
curl -X POST https://tidyfeed-backend.workers.dev/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@example.com", "password": "password123"}'

# Get reports (with token)
curl https://tidyfeed-backend.workers.dev/api/reports \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIs..."
```

---

## Error Handling

All error responses follow this format:

```json
{
  "error": "Human-readable error message"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad Request - Missing or invalid parameters |
| 401 | Unauthorized - Missing or invalid auth |
| 500 | Internal Server Error |

---

## CORS

CORS is enabled for **all origins** (`*`). No preflight configuration needed for frontend/extension integration.

---

## Development

```bash
# Install dependencies
npm install

# Run local dev server
npm run dev

# Deploy to Cloudflare
npm run deploy
```

---

## Rate Limits

Cloudflare Workers default limits apply:
- **100,000 requests/day** (free tier)
- **10ms CPU time** per request (free tier)

---

## Changelog

### v1.0.0 (2025-12-28)
- Initial release
- Auth endpoints: login
- Report endpoints: submit, list aggregated, list all
