# TidyFeed Reader View Feature - Implementation Plan

## Overview

Add a browser extension feature that allows users to save any webpage and view it in a clean, distraction-free reader view (similar to Omnivore, Read It Later, Pocket).

## User Flow

```
1. User visits any webpage
2. Extension detects if page is "article-like" (has substantial text content)
3. Floating "Read" button appears in top-right corner
4. User clicks "Read" button
5. Extension extracts page content and sends to backend
6. Backend processes content (extract article, clean HTML, save to R2)
7. Success notification shown, article saved to library
8. User can view article in clean reader view at https://a.tidyfeed.app/reader/:id
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                        Browser Extension                             │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  Content Script (all pages)                                  │   │
│  │  - Detect article content                                    │   │
│  │  - Inject floating "Read" button                             │   │
│  │  - Extract page HTML/content                                 │   │
│  │  - Send to backend API                                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                          Backend API                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  POST /api/articles/save                                     │   │
│  │  - Validate URL                                              │   │
│  │  - Extract article content (Readability)                     │   │
│  │  - Download and cache images to R2                           │   │
│  │  - Generate clean HTML snapshot                              │   │
│  │  - Save metadata to D1                                       │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  GET /api/articles                                            │   │
│  │  GET /api/articles/:id                                       │   │
│  │  GET /api/articles/:id/content                               │   │
│  │  DELETE /api/articles/:id                                     │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         Frontend Web                                 │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  /reader/[id] - Reader View Page                             │   │
│  │  - Clean typography (reuses snapshot styles)                │   │
│  │  - Dark/light mode toggle                                    │   │
│  │  - Font size adjustment                                      │   │
│  │  - Notes & highlights (existing system)                      │   │
│  │  - Reading progress indicator                                │   │
│  └─────────────────────────────────────────────────────────────┘   │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │  /library/articles - Article Library                         │   │
│  │  - List of saved articles                                    │   │
│  │  - Search and filter                                         │   │
│  │  - Bulk actions                                              │   │
│  └─────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

## Phase 1: Backend - Article Extraction Service

### 1.1 Database Schema

```sql
-- New table for saved articles
CREATE TABLE articles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,  -- FK to users.id
    url TEXT NOT NULL,
    title TEXT NOT NULL,
    excerpt TEXT,
    author TEXT,
    published_at TEXT,
    domain TEXT,
    word_count INTEGER,
    reading_time_minutes INTEGER,
    image_url TEXT,
    snapshot_r2_key TEXT,  -- R2 key for HTML snapshot
    cached_data TEXT,  -- JSON with extracted content
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    read_at DATETIME,
    archived_at DATETIME,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for queries
CREATE INDEX idx_articles_user_id ON articles(user_id);
CREATE INDEX idx_articles_url ON articles(url);
CREATE INDEX idx_articles_created_at ON articles(created_at DESC);

-- Article tags (many-to-many)
CREATE TABLE article_tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article_id INTEGER NOT NULL,
    tag_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE,
    UNIQUE(article_id, tag_id)
);

-- Reuse existing tags table for article tags
```

### 1.2 Article Extraction Service

**File:** `tidyfeed-backend/src/services/articleExtractor.ts`

```typescript
/**
 * Article Extraction Service
 * Uses Mozilla Readability algorithm to extract clean article content
 */

interface ExtractedArticle {
    title: string;
    content: string;       // Clean HTML content
    textContent: string;   // Plain text for analysis
    excerpt: string;
    author: string | null;
    publishedAt: string | null;
    imageUrl: string | null;
    domain: string;
    url: string;
    wordCount: number;
    readingTime: number;
}

export class ArticleExtractor {
    /**
     * Extract article content from URL
     */
    async extractFromUrl(url: string): Promise<ExtractedArticle | null> {
        // 1. Fetch page HTML
        const html = await this.fetchPage(url);

        // 2. Parse with Readability
        const article = this.parseWithReadability(html, url);

        // 3. Extract metadata
        return {
            ...article,
            domain: new URL(url).hostname,
            url,
            wordCount: this.countWords(article.textContent),
            readingTime: this.calculateReadingTime(article.textContent)
        };
    }

    /**
     * Parse HTML using Mozilla Readability algorithm
     */
    private parseWithReadability(html: string, url: string): Partial<ExtractedArticle> {
        // Use JSDOM + Readability or custom implementation
        // See implementation details below
    }

    /**
     * Calculate reading time (200 words per minute average)
     */
    private calculateReadingTime(text: string): number {
        return Math.ceil(this.countWords(text) / 200);
    }
}
```

**Options for Readability implementation:**

1. **Use @mozilla/readability** npm package (recommended)
   - Battle-tested, used by Firefox Reader View
   - Requires JSDOM

2. **Use readability-server** (Node.js port)
   - Pre-built service, can run as microservice

3. **Custom lightweight implementation**
   - For more control, less dependencies

### 1.3 New API Routes

**File:** `tidyfeed-backend/src/routes/articles.ts`

```typescript
import { Hono } from 'hono';
import { ArticleExtractor } from '../services/articleExtractor';

const articles = new Hono<{ Bindings: Bindings }>();

/**
 * POST /api/articles/save
 * Save an article from a URL
 */
articles.post('/save', cookieAuthMiddleware, async (c) => {
    const { url } = await c.req.json<{ url: string }>();
    const userId = c.get('jwtPayload').sub;

    // Check if already saved
    const existing = await c.env.DB.prepare(
        'SELECT id FROM articles WHERE user_id = ? AND url = ?'
    ).bind(userId, url).first();

    if (existing) {
        return c.json({ success: true, articleId: existing.id, alreadySaved: true });
    }

    // Extract article
    const extractor = new ArticleExtractor();
    const article = await extractor.extractFromUrl(url);

    if (!article) {
        return c.json({ error: 'Failed to extract article content' }, 400);
    }

    // Generate snapshot HTML
    const snapshotHtml = generateArticleSnapshot(article);

    // Save to R2
    const r2Key = `articles/${userId}/${Date.now()}.html`;
    await c.env.MEDIA_BUCKET.put(r2Key, snapshotHtml, {
        httpMetadata: { contentType: 'text/html; charset=utf-8' }
    });

    // Save to database
    const result = await c.env.DB.prepare(
        `INSERT INTO articles (user_id, url, title, excerpt, author, published_at,
         domain, word_count, reading_time_minutes, image_url, snapshot_r2_key)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).bind(
        userId, article.url, article.title, article.excerpt, article.author,
        article.publishedAt, article.domain, article.wordCount, article.readingTime,
        article.imageUrl, r2Key
    ).run();

    return c.json({
        success: true,
        articleId: result.meta.last_row_id,
        article: {
            id: result.meta.last_row_id,
            title: article.title,
            excerpt: article.excerpt,
            readingTime: article.readingTime
        }
    });
});

/**
 * GET /api/articles
 * List user's saved articles
 */
articles.get('/', cookieAuthMiddleware, async (c) => {
    const userId = c.get('jwtPayload').sub;
    const limit = parseInt(c.req.query('limit') || '20');
    const offset = parseInt(c.req.query('offset') || '0');

    const articles = await c.env.DB.prepare(
        `SELECT id, title, excerpt, domain, image_url, reading_time_minutes,
         created_at, read_at, archived_at
         FROM articles WHERE user_id = ? AND archived_at IS NULL
         ORDER BY created_at DESC LIMIT ? OFFSET ?`
    ).bind(userId, limit, offset).all();

    return c.json({ articles: articles.results });
});

/**
 * GET /api/articles/:id
 * Get article details
 */
articles.get('/:id', cookieAuthMiddleware, async (c) => {
    const userId = c.get('jwtPayload').sub;
    const articleId = c.req.param('id');

    const article = await c.env.DB.prepare(
        `SELECT * FROM articles WHERE id = ? AND user_id = ?`
    ).bind(articleId, userId).first();

    if (!article) {
        return c.json({ error: 'Article not found' }, 404);
    }

    return c.json({ article });
});

/**
 * GET /api/articles/:id/content
 * Get article HTML content from R2
 */
articles.get('/:id/content', cookieAuthMiddleware, async (c) => {
    const userId = c.get('jwtPayload').sub;
    const articleId = c.req.param('id');

    const article = await c.env.DB.prepare(
        `SELECT snapshot_r2_key FROM articles WHERE id = ? AND user_id = ?`
    ).bind(articleId, userId).first<{ snapshot_r2_key: string }>();

    if (!article) {
        return c.json({ error: 'Article not found' }, 404);
    }

    const object = await c.env.MEDIA_BUCKET.get(article.snapshot_r2_key);
    if (!object) {
        return c.json({ error: 'Content not found' }, 404);
    }

    const html = await object.text();
    return new Response(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
});

/**
 * DELETE /api/articles/:id
 * Delete an article
 */
articles.delete('/:id', cookieAuthMiddleware, async (c) => {
    const userId = c.get('jwtPayload').sub;
    const articleId = c.req.param('id');

    await c.env.DB.prepare(
        'DELETE FROM articles WHERE id = ? AND user_id = ?'
    ).bind(articleId, userId).run();

    return c.json({ success: true });
});

/**
 * PUT /api/articles/:id/read
 * Mark article as read
 */
articles.put('/:id/read', cookieAuthMiddleware, async (c) => {
    const userId = c.get('jwtPayload').sub;
    const articleId = c.req.param('id');
    const { read } = await c.req.json<{ read: boolean }>();

    await c.env.DB.prepare(
        `UPDATE articles SET read_at = ? WHERE id = ? AND user_id = ?`
    ).bind(read ? new Date().toISOString() : null, articleId, userId).run();

    return c.json({ success: true });
});

/**
 * PUT /api/articles/:id/archive
 * Archive/unarchive article
 */
articles.put('/:id/archive', cookieAuthMiddleware, async (c) => {
    const userId = c.get('jwtPayload').sub;
    const articleId = c.req.param('id');
    const { archive } = await c.req.json<{ archive: boolean }>();

    await c.env.DB.prepare(
        `UPDATE articles SET archived_at = ? WHERE id = ? AND user_id = ?`
    ).bind(archive ? new Date().toISOString() : null, articleId, userId).run();

    return c.json({ success: true });
});

export default articles;
```

### 1.4 Update Main Index

```typescript
// In tidyfeed-backend/src/index.ts
import articles from './routes/articles';

// Mount articles routes
app.route('/api/articles', articles);
```

## Phase 2: Browser Extension - Reader Button

### 2.1 New Content Script for All Pages

**File:** `tidyfeed-extension/entrypoints/content-reader.tsx`

```typescript
/**
 * Content Script - Reader View Button
 * Runs on all HTTP/HTTPS pages to inject "Read" button
 */

import { storage } from 'wxt/storage';

const API_URL = 'https://api.tidyfeed.app';

// Button styles
const BUTTON_STYLES = `
  .tidyfeed-read-btn {
    position: fixed;
    top: 16px;
    right: 16px;
    z-index: 2147483647;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 50px;
    padding: 10px 20px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    font-size: 14px;
    font-weight: 500;
    cursor: pointer;
    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .tidyfeed-read-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4);
  }

  .tidyfeed-read-btn:active {
    transform: translateY(0);
  }

  .tidyfeed-read-btn.loading {
    pointer-events: none;
    opacity: 0.8;
  }

  .tidyfeed-read-btn .spinner {
    width: 14px;
    height: 14px;
    border: 2px solid rgba(255,255,255,0.3);
    border-top-color: white;
    border-radius: 50%;
    animation: tidyfeed-spin 0.8s linear infinite;
  }

  @keyframes tidyfeed-spin {
    to { transform: rotate(360deg); }
  }

  .tidyfeed-toast {
    position: fixed;
    top: 20px;
    right: 20px;
    background: #1a1a1a;
    color: white;
    padding: 12px 20px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 2147483647;
    animation: tidyfeed-slide-in 0.3s ease-out;
    box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  }

  .tidyfeed-toast.success { background: #10b981; }
  .tidyfeed-toast.error { background: #ef4444; }

  @keyframes tidyfeed-slide-in {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
`;

export default defineContentScript({
    matches: ['<all_urls>'],
    excludeMatches: [
        '*://*.x.com/*',
        '*://*.twitter.com/*',
        '*://a.tidyfeed.app/*',
        '*://tidyfeed.app/*'
    ],
    runAt: 'document_idle',

    main() {
        // Don't run on non-content pages
        if (!isArticlePage()) return;

        // Inject styles
        injectStyles();

        // Create and inject button
        const button = createReaderButton();
        document.body.appendChild(button);
    },
});

function isArticlePage(): boolean {
    // Check if page has substantial text content
    const textLength = document.body?.innerText?.length || 0;
    const hasArticle = document.querySelector('article') ||
                      document.querySelector('[role="article"]') ||
                      document.querySelector('.post') ||
                      document.querySelector('.article');

    return textLength > 500 || !!hasArticle;
}

function injectStyles() {
    const style = document.createElement('style');
    style.textContent = BUTTON_STYLES;
    document.head.appendChild(style);
}

function createReaderButton(): HTMLElement {
    const button = document.createElement('button');
    button.className = 'tidyfeed-read-btn';
    button.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
      </svg>
      <span>Read</span>
    `;

    button.addEventListener('click', handleReadClick);
    return button;
}

async function handleReadClick(e: MouseEvent) {
    const button = e.currentTarget as HTMLElement;

    // Check auth
    const authInfo = await chrome.cookies.get({
        url: 'https://api.tidyfeed.app',
        name: 'auth_token'
    });

    if (!authInfo) {
        showToast('Please sign in to TidyFeed first', 'error');
        chrome.runtime.sendMessage({ action: 'openTab', url: 'https://a.tidyfeed.app/login' });
        return;
    }

    // Show loading state
    button.classList.add('loading');
    button.innerHTML = `<div class="spinner"></div><span>Saving...</span>`;

    try {
        const response = await fetch(`${API_URL}/api/articles/save`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
            body: JSON.stringify({ url: window.location.href })
        });

        const data = await response.json();

        if (data.success) {
            if (data.alreadySaved) {
                showToast('Already saved to your library', 'success');
            } else {
                showToast('Article saved! Opening reader view...', 'success');

                // Open reader view in new tab after short delay
                setTimeout(() => {
                    chrome.runtime.sendMessage({
                        action: 'openTab',
                        url: `https://a.tidyfeed.app/reader/${data.articleId}`
                    });
                }, 1000);
            }
            button.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg><span>Saved</span>`;
        } else {
            showToast(data.error || 'Failed to save article', 'error');
            resetButton(button);
        }
    } catch (error) {
        console.error('Failed to save article:', error);
        showToast('Failed to save article. Please try again.', 'error');
        resetButton(button);
    }
}

function resetButton(button: HTMLElement) {
    setTimeout(() => {
        button.classList.remove('loading');
        button.innerHTML = `
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
          </svg>
          <span>Read</span>
        `;
    }, 2000);
}

function showToast(message: string, type: 'success' | 'error' = 'success') {
    const toast = document.createElement('div');
    toast.className = `tidyfeed-toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
```

### 2.2 Update Extension Manifest

**File:** `tidyfeed-extension/wxt.config.ts`

```typescript
manifest: {
    // ... existing config

    permissions: [
        'storage',
        'activeTab',
        'scripting',
        'alarms',
        'cookies',
        'tabs'  // Add tabs permission for opening reader view
    ],

    host_permissions: [
        '*://*.x.com/*',
        '*://*.twitter.com/*',
        '*://cdn.syndication.twimg.com/*',
        '*://video.twimg.com/*',
        '*://pbs.twimg.com/*',
        '*://*.tidyfeed.app/*',
        'https://*.googleusercontent.com/*',
        '<all_urls>'  // For article extraction on all sites
    ],
}
```

### 2.3 Update Background Script

**File:** `tidyfeed-extension/entrypoints/background.ts`

```typescript
// Add handler for opening reader view
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === 'openTab') {
        chrome.tabs.create({ url: message.url });
    }
});
```

## Phase 3: Frontend - Reader View

### 3.1 Reader View Page

**File:** `tidyfeed-web/app/reader/[id]/page.tsx`

```typescript
/**
 * Reader View Page
 * Clean, distraction-free reading experience
 */
"use client"

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Settings, Clock, Calendar, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import NotePanel from '@/components/NotePanel'

interface Article {
    id: string
    title: string
    excerpt: string
    author: string | null
    publishedAt: string | null
    domain: string
    imageUrl: string | null
    readingTime: number
    createdAt: string
}

export default function ReaderPage() {
    const params = useParams()
    const router = useRouter()
    const articleId = params.id as string

    const [article, setArticle] = useState<Article | null>(null)
    const [content, setContent] = useState<string>('')
    const [loading, setLoading] = useState(true)
    const [fontSize, setFontSize] = useState(18)
    const [theme, setTheme] = useState<'light' | 'dark' | 'sepia'>('light')
    const [showSettings, setShowSettings] = useState(false)

    useEffect(() => {
        fetchArticle()
    }, [articleId])

    const fetchArticle = async () => {
        try {
            const [articleRes, contentRes] = await Promise.all([
                fetch(`/api/articles/${articleId}`),
                fetch(`/api/articles/${articleId}/content`)
            ])

            if (articleRes.ok) {
                const data = await articleRes.json()
                setArticle(data.article)
            }

            if (contentRes.ok) {
                const html = await contentRes.text()
                setContent(html)
            }
        } catch (error) {
            console.error('Failed to fetch article:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleBack = () => {
        router.push('/library/articles')
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
            </div>
        )
    }

    if (!article) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <h1 className="text-2xl font-bold mb-4">Article not found</h1>
                    <Button onClick={handleBack}>Go back to library</Button>
                </div>
            </div>
        )
    }

    const themeClasses = {
        light: 'bg-white text-gray-900',
        dark: 'bg-gray-900 text-gray-100',
        sepia: 'bg-amber-50 text-amber-950'
    }

    return (
        <div className={`min-h-screen ${themeClasses[theme]} transition-colors duration-300`}>
            {/* Header */}
            <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm border-b">
                <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
                    <Button variant="ghost" size="sm" onClick={handleBack}>
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Back
                    </Button>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowSettings(!showSettings)}
                        >
                            <Settings className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {/* Settings Panel */}
                {showSettings && (
                    <div className="border-t px-4 py-3">
                        <div className="max-w-4xl mx-auto space-y-4">
                            {/* Font Size */}
                            <div>
                                <label className="text-sm font-medium">Font Size</label>
                                <div className="flex items-center gap-2 mt-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setFontSize(Math.max(14, fontSize - 2))}
                                    >
                                        A-
                                    </Button>
                                    <span className="text-sm w-12 text-center">{fontSize}px</span>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setFontSize(Math.min(24, fontSize + 2))}
                                    >
                                        A+
                                    </Button>
                                </div>
                            </div>

                            {/* Theme */}
                            <div>
                                <label className="text-sm font-medium">Theme</label>
                                <div className="flex gap-2 mt-2">
                                    {(['light', 'dark', 'sepia'] as const).map((t) => (
                                        <Button
                                            key={t}
                                            variant={theme === t ? 'default' : 'outline'}
                                            size="sm"
                                            onClick={() => setTheme(t)}
                                            className="capitalize"
                                        >
                                            {t}
                                        </Button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </header>

            {/* Article Header */}
            <article className="max-w-4xl mx-auto px-4 py-8">
                <header className="mb-8">
                    {article.imageUrl && (
                        <img
                            src={article.imageUrl}
                            alt={article.title}
                            className="w-full h-64 object-cover rounded-lg mb-6"
                        />
                    )}

                    <h1 className="text-4xl font-bold mb-4">{article.title}</h1>

                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                        {article.author && (
                            <span className="flex items-center gap-1">
                                <User className="h-4 w-4" />
                                {article.author}
                            </span>
                        )}
                        <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {article.readingTime} min read
                        </span>
                        <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(article.publishedAt || article.createdAt).toLocaleDateString()}
                        </span>
                        <span className="text-gray-500">
                            {article.domain}
                        </span>
                    </div>

                    {article.excerpt && (
                        <p className="text-lg text-muted-foreground mt-4 italic border-l-4 border-gray-300 pl-4">
                            {article.excerpt}
                        </p>
                    )}
                </header>

                {/* Article Content */}
                <div
                    className="prose prose-lg max-w-none"
                    style={{ fontSize: `${fontSize}px` }}
                    dangerouslySetInnerHTML={{ __html: content }}
                />
            </article>

            {/* Notes Panel */}
            <NotePanel articleId={articleId} />
        </div>
    )
}
```

### 3.2 Article Library Page

**File:** `tidyfeed-web/app/library/articles/page.tsx`

```typescript
/**
 * Article Library Page
 * List all saved articles with search and filter
 */
"use client"

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Search, Trash2, Archive, ExternalLink } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface Article {
    id: string
    title: string
    excerpt: string
    domain: string
    imageUrl: string | null
    readingTime: number
    createdAt: string
    readAt: string | null
}

export default function ArticlesLibraryPage() {
    const [articles, setArticles] = useState<Article[]>([])
    const [filtered, setFiltered] = useState<Article[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState('')

    useEffect(() => {
        fetchArticles()
    }, [])

    useEffect(() => {
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            setFiltered(articles.filter(a =>
                a.title.toLowerCase().includes(query) ||
                a.excerpt?.toLowerCase().includes(query) ||
                a.domain.toLowerCase().includes(query)
            ))
        } else {
            setFiltered(articles)
        }
    }, [searchQuery, articles])

    const fetchArticles = async () => {
        try {
            const res = await fetch('/api/articles')
            const data = await res.json()
            setArticles(data.articles || [])
            setFiltered(data.articles || [])
        } catch (error) {
            console.error('Failed to fetch articles:', error)
        } finally {
            setLoading(false)
        }
    }

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this article?')) return

        try {
            await fetch(`/api/articles/${id}`, { method: 'DELETE' })
            setArticles(articles.filter(a => a.id !== id))
        } catch (error) {
            console.error('Failed to delete article:', error)
        }
    }

    const handleArchive = async (id: string) => {
        try {
            await fetch(`/api/articles/${id}/archive`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ archive: true })
            })
            setArticles(articles.filter(a => a.id !== id))
        } catch (error) {
            console.error('Failed to archive article:', error)
        }
    }

    if (loading) {
        return <div className="p-8 text-center">Loading articles...</div>
    }

    return (
        <div className="max-w-6xl mx-auto p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-3xl font-bold">Library</h1>
                <div className="relative w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search articles..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-9"
                    />
                </div>
            </div>

            {filtered.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                    {searchQuery ? 'No articles match your search' : 'No articles saved yet'}
                </div>
            ) : (
                <div className="grid gap-4">
                    {filtered.map((article) => (
                        <div
                            key={article.id}
                            className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                        >
                            <div className="flex gap-4">
                                {article.imageUrl && (
                                    <img
                                        src={article.imageUrl}
                                        alt=""
                                        className="w-24 h-24 object-cover rounded"
                                    />
                                )}

                                <div className="flex-1 min-w-0">
                                    <Link
                                        href={`/reader/${article.id}`}
                                        className="text-xl font-semibold hover:underline block"
                                    >
                                        {article.title}
                                    </Link>

                                    {article.excerpt && (
                                        <p className="text-muted-foreground line-clamp-2 mt-1">
                                            {article.excerpt}
                                        </p>
                                    )}

                                    <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                        <span>{article.domain}</span>
                                        <span>{article.readingTime} min read</span>
                                        <span>{new Date(article.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>

                                <div className="flex gap-2">
                                    <Link href={`/reader/${article.id}`}>
                                        <Button variant="ghost" size="sm">
                                            <ExternalLink className="h-4 w-4" />
                                        </Button>
                                    </Link>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleArchive(article.id)}
                                    >
                                        <Archive className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDelete(article.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
```

## Phase 4: Integration & Polish

### 4.1 Update Navigation

Add "Articles" link to main navigation:

**File:** `tidyfeed-web/components/sidebar.tsx` or navigation component

```typescript
<Link href="/library/articles" className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted">
    <BookOpen className="h-5 w-5" />
    Articles
</Link>
```

### 4.2 Reading Progress Indicator

Add scroll progress bar to reader view:

```typescript
const [progress, setProgress] = useState(0)

useEffect(() => {
    const handleScroll = () => {
        const windowHeight = window.innerHeight
        const documentHeight = document.documentElement.scrollHeight
        const scrolled = window.scrollY
        const progress = (scrolled / (documentHeight - windowHeight)) * 100
        setProgress(Math.min(100, Math.max(0, progress)))
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
}, [])

// Render progress bar at top of page
<div className="h-1 bg-gray-200">
    <div
        className="h-full bg-blue-500 transition-all duration-150"
        style={{ width: `${progress}%` }}
    />
</div>
```

## Implementation Order

### Sprint 1: Backend Foundation (2-3 days)
1. Add `articles` table to D1 schema
2. Implement `ArticleExtractor` service with Readability
3. Create `/api/articles` routes
4. Test extraction with various article types

### Sprint 2: Extension Integration (2-3 days)
1. Create `content-reader.tsx` content script
2. Implement floating "Read" button
3. Add save functionality with API calls
4. Test on various websites

### Sprint 3: Frontend Reader View (3-4 days)
1. Create `/reader/[id]` page with clean layout
2. Add theme toggle (light/dark/sepia)
3. Add font size controls
4. Implement reading progress indicator

### Sprint 4: Library & Polish (2-3 days)
1. Create `/library/articles` page
2. Add search and filter functionality
3. Implement archive/delete actions
4. Add keyboard shortcuts

### Sprint 5: Testing & Bug Fixes (2-3 days)
1. Cross-browser testing (Chrome, Firefox)
2. Test with various article types
3. Performance optimization
4. Edge case handling

## Dependencies to Add

### Backend
```bash
npm install @mozilla/readability jsdom
npm install --save-dev @types/jsdom
```

### Extension
```bash
# No additional dependencies needed
# Uses existing fetch and DOM APIs
```

### Frontend
```bash
# Uses existing components and Tailwind
# No additional dependencies needed
```

## Success Metrics

- **Extraction accuracy**: 95%+ of articles correctly extracted
- **Loading time**: < 2 seconds for article save
- **Reader view**: < 1 second load time for cached articles
- **Cross-browser**: Works on Chrome, Firefox, Safari
- **User engagement**: % of saved articles that are read

## Future Enhancements

1. **Full-text search** across all saved articles
2. **AI-powered summaries** for long articles
3. **Text-to-speech** for audio listening
4. **Highlight sharing** to social media
5. **Newsletter integration** (save from email)
6. **PDF export** for offline reading
7. **Reading statistics** (articles read, reading streak)
8. **Recommendations** based on reading history
