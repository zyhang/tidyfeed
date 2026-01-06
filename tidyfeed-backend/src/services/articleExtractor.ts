/**
 * Article Extraction Service
 *
 * Extracts clean article content from web pages for the Reader View feature.
 * Uses linkedom for HTML parsing (Cloudflare Workers compatible).
 *
 * Based on Mozilla Readability algorithm principles.
 */

import { parseHTML, HTMLElement } from 'linkedom';

export interface ExtractedArticle {
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
    lang: string;
}

export interface ArticleMetadata {
    ogTitle?: string;
    ogDescription?: string;
    ogImage?: string;
    ogType?: string;
    twitterTitle?: string;
    twitterDescription?: string;
    twitterImage?: string;
    articleAuthor?: string;
    articlePublishedTime?: string;
    articleModifiedTime?: string;
    metaDescription?: string;
    metaAuthor?: string;
    canonicalUrl?: string;
}

const UNLIKELY_CANDIDATES = [
    '-ad-', '-ads', '-banner', '-cookie', '-footer', '-header', '-popup', '-sidebar',
    '-social', '-subscribe', '-tracking', 'ad-', 'ads-', 'banner-', 'cookie-', 'footer-',
    'header-', 'popup-', 'sidebar-', 'social-', 'subscribe-', 'tracking-',
    'adbox', 'adcontainer', 'adsbox', 'adscontainer', 'adv', 'advertisement',
    'breadcrumb', 'comments', 'cookie-notice', 'copyright', 'disclaimer', 'footer',
    'header', 'login', 'menu', 'meta', 'nav', 'navigation', 'newsletter', 'popup',
    'related', 'search', 'share', 'sidebar', 'social', 'subscribe', 'tracking',
    'comment', 'pagination', 'pager', 'sponsor', 'syndication', 'tags', 'toolbar',
];

const GOOD_CANDIDATES = [
    'article', 'blog', 'content', 'entry', 'main', 'post', 'story', 'text',
    'article-body', 'article-content', 'blog-post', 'entry-content', 'entry-body',
    'main-content', 'post-content', 'post-body', 'story-content', 'text-content',
];

const DIV_TO_P_ELEMS = new Set(['address', 'article', 'aside', 'blockquote', 'canvas', 'dd', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'li', 'main', 'nav', 'noscript', 'ol', 'output', 'p', 'pre', 'section', 'table', 'tfoot', 'ul', 'video']);

const TEXT_NODE_TAGS = new Set(['p', 'span', 'a', 'strong', 'em', 'b', 'i', 'u', 'code', 'pre', 'blockquote', 'li', 'td', 'th', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'title']);

export class ArticleExtractor {
    private userAgent = 'Mozilla/5.0 (compatible; TidyFeed/1.0; +https://tidyfeed.app)';
    private minContentLength = 200;
    private minScore = 20;

    /**
     * Extract article content from URL
     */
    async extractFromUrl(url: string): Promise<ExtractedArticle | null> {
        try {
            new URL(url);

            const html = await this.fetchPage(url);
            return this.extractFromHtml(html, url);
        } catch (error) {
            console.error('[ArticleExtractor] Failed to extract article:', error);
            return null;
        }
    }

    /**
     * Extract article content from raw HTML
     */
    extractFromHtml(html: string, url: string): ExtractedArticle | null {
        try {
            const { document } = parseHTML(html);

            // Extract metadata before modifications
            const metadata = this.extractMetadata(document);

            // Find main content
            const contentResult = this.extractMainContent(document);

            if (!contentResult || contentResult.score < this.minScore) {
                console.error('[ArticleExtractor] Content score too low:', contentResult?.score);
                return null;
            }

            // Clean up the content
            const cleanedContent = this.cleanContent(contentResult.element);

            // Get text content
            const textContent = cleanedContent.textContent;

            if (textContent.length < this.minContentLength) {
                console.error('[ArticleExtractor] Content too short:', textContent.length);
                return null;
            }

            // Build article object
            const domain = new URL(url).hostname;
            const title = this.extractTitle(document, metadata);
            const excerpt = this.extractExcerpt(document, metadata, textContent);

            const wordCount = this.countWords(textContent);
            const readingTime = this.calculateReadingTime(wordCount);

            return {
                title,
                content: cleanedContent.innerHTML,
                textContent,
                excerpt,
                author: metadata.articleAuthor || metadata.metaAuthor || null,
                publishedAt: this.parsePublishedDate(metadata.articlePublishedTime),
                imageUrl: this.extractImageUrl(document, metadata),
                domain,
                url,
                wordCount,
                readingTime,
                lang: this.detectLanguage(textContent),
            };
        } catch (error) {
            console.error('[ArticleExtractor] Failed to parse HTML:', error);
            return null;
        }
    }

    /**
     * Fetch page HTML
     */
    private async fetchPage(url: string): Promise<string> {
        const response = await fetch(url, {
            headers: {
                'User-Agent': this.userAgent,
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.9',
            },
            redirect: 'follow',
        });

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        return await response.text();
    }

    /**
     * Extract metadata from HTML head
     */
    private extractMetadata(document: Document): ArticleMetadata {
        const meta: ArticleMetadata = {};

        const getMetaContent = (names: string[]): string | undefined => {
            for (const name of names) {
                // Try property attribute
                const el = document.querySelector(`meta[property="${name}"]`) as HTMLMetaElement;
                if (el?.content) return el.content;
                // Try name attribute
                const el2 = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement;
                if (el2?.content) return el2.content;
            }
            return undefined;
        };

        // OpenGraph
        meta.ogTitle = getMetaContent(['og:title']);
        meta.ogDescription = getMetaContent(['og:description']);
        meta.ogImage = getMetaContent(['og:image', 'og:image:url']);
        meta.ogType = getMetaContent(['og:type']);

        // Twitter Card
        meta.twitterTitle = getMetaContent(['twitter:title']);
        meta.twitterDescription = getMetaContent(['twitter:description']);
        meta.twitterImage = getMetaContent(['twitter:image']);

        // Article specific
        meta.articleAuthor = getMetaContent(['article:author', 'author']);
        meta.articlePublishedTime = getMetaContent(['article:published_time', 'article:published']);
        meta.articleModifiedTime = getMetaContent(['article:modified_time', 'article:modified']);

        // Standard metadata
        meta.metaDescription = getMetaContent(['description']);
        meta.metaAuthor = getMetaContent(['author']);

        // Canonical URL
        const canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
        meta.canonicalUrl = canonical?.href;

        return meta;
    }

    /**
     * Extract article title
     */
    private extractTitle(document: Document, metadata: ArticleMetadata): string {
        // Priority: OG title, Twitter title, h1, title tag
        if (metadata.ogTitle) return metadata.ogTitle;
        if (metadata.twitterTitle) return metadata.twitterTitle;

        const h1 = document.querySelector('h1');
        if (h1?.textContent) {
            const text = h1.textContent.trim();
            if (text.length > 5 && text.length < 200) return text;
        }

        const titleTag = document.querySelector('title');
        if (titleTag?.textContent) {
            return titleTag.textContent.trim();
        }

        return this.extractTitleFromUrl(document.URL);
    }

    /**
     * Extract article excerpt
     */
    private extractExcerpt(document: Document, metadata: ArticleMetadata, textContent: string): string {
        if (metadata.ogDescription) return metadata.ogDescription;
        if (metadata.metaDescription) return metadata.metaDescription;
        return this.createExcerpt(textContent);
    }

    /**
     * Extract best image URL
     */
    private extractImageUrl(document: Document, metadata: ArticleMetadata): string | null {
        if (metadata.ogImage) return metadata.ogImage;
        if (metadata.twitterImage) return metadata.twitterImage;

        // Try to find image in article content
        const article = document.querySelector('article');
        if (article) {
            const img = article.querySelector('img[src]') as HTMLImageElement;
            if (img?.src) return img.src;
        }

        // First large image in main content
        const imgs = Array.from(document.querySelectorAll('img[src]'));
        for (const img of imgs) {
            const i = img as HTMLImageElement;
            if (i.naturalWidth > 300 && i.naturalHeight > 200) {
                return i.src;
            }
        }

        return null;
    }

    /**
     * Extract main content using scoring algorithm
     */
    private extractMainContent(document: Document): { element: HTMLElement; score: number } | null {
        const candidates: Array<{ element: HTMLElement; score: number }> = [];

        // Score all potential content elements
        const allElements = document.querySelectorAll('*');
        for (const el of allElements) {
            if (!(el instanceof HTMLElement)) continue;

            const score = this.scoreElement(el);
            if (score > 0) {
                candidates.push({ element: el, score });
            }
        }

        if (candidates.length === 0) {
            return null;
        }

        // Sort by score descending
        candidates.sort((a, b) => b.score - a.score);

        // Get the best candidate
        let best = candidates[0];
        let bestElement = best.element;
        let bestScore = best.score;

        // Merge with adjacent high-scoring elements
        const merged = this.mergeAdjacentContent(document, bestElement, candidates);

        return { element: merged.element, score: merged.score };
    }

    /**
     * Score an element for likelihood of containing main content
     */
    private scoreElement(element: HTMLElement): number {
        let score = 0;
        const classList = element.classList.toString().toLowerCase();
        const id = element.id.toLowerCase();

        // Skip unlikely candidates early
        for (const unlikely of UNLIKELY_CANDIDATES) {
            if (classList.includes(unlikely) || id.includes(unlikely)) {
                return -1;
            }
        }

        // Boost good candidates
        for (const good of GOOD_CANDIDATES) {
            if (classList.includes(good) || id.includes(good)) {
                score += 10;
            }
        }

        const tagName = element.tagName.toLowerCase();

        // Content tags get base score
        if (tagName === 'article') score += 20;
        if (tagName === 'main') score += 15;
        if (tagName === 'section') score += 5;
        if (tagName === 'div') score += 1;

        // Paragraphs and text containers
        const textLength = element.textContent?.length || 0;
        if (textLength > 0) {
            // Boost for substantial text content
            if (textLength > 200) score += 5;
            if (textLength > 500) score += 5;
            if (textLength > 1000) score += 5;

            // Penalize very short content
            if (textLength < 50) score -= 5;
        }

        // Count direct children that are paragraphs
        const pChildren = element.querySelectorAll(':scope > p');
        if (pChildren.length > 0) {
            score += pChildren.length * 2;
        }

        // Count direct text content length
        let ownTextLength = 0;
        for (const child of element.childNodes) {
            if (child.nodeType === 3) { // Text node
                ownTextLength += child.nodeValue?.length || 0;
            }
        }
        if (ownTextLength > 50) score += 3;

        // Links density check - too many links is bad
        const links = element.querySelectorAll(':scope > a').length;
        const words = element.textContent?.split(/\s+/).length || 0;
        if (words > 0 && links / words > 0.3) {
            score -= 10;
        }

        return score;
    }

    /**
     * Merge adjacent high-scoring elements
     */
    private mergeAdjacentContent(
        document: Document,
        bestElement: HTMLElement,
        candidates: Array<{ element: HTMLElement; score: number }>
    ): { element: HTMLElement; score: number } {
        // For now, just return the best element
        // TODO: Implement smart merging of sibling elements
        return { element: bestElement, score: candidates[0]?.score || 0 };
    }

    /**
     * Clean up content element
     */
    private cleanContent(element: HTMLElement): HTMLElement {
        const clone = element.cloneNode(true) as HTMLElement;

        // Remove unwanted elements
        const unwantedSelectors = [
            'script', 'style', 'nav', 'header', 'footer', 'aside',
            '.ad', '.ads', '.advertisement', '.banner', '.cookie-notice',
            '.social-share', '.subscribe', '.newsletter', '.comments',
            '.related', '.pagination', '.sidebar', '.toolbar',
            '[class*="ad-"]', '[class*="-ad"]', '[id*="ad-"]', '[id*="-ad"]',
        ];

        for (const selector of unwantedSelectors) {
            const elements = clone.querySelectorAll(selector);
            for (const el of elements) {
                el.remove();
            }
        }

        // Convert divs that only contain text to paragraphs
        this.convertDivsToParagraphs(clone);

        // Clean up class attributes (keep them for styling, but could be removed)
        // For now, keep classes for potential styling

        return clone;
    }

    /**
     * Convert divs that contain only text/inline elements to paragraphs
     */
    private convertDivsToParagraphs(element: HTMLElement): void {
        const divs = element.querySelectorAll('div');
        for (const div of divs) {
            if (!div.parentElement) continue;

            let hasBlockChildren = false;
            for (const child of div.children) {
                if (child instanceof HTMLElement && !TEXT_NODE_TAGS.has(child.tagName.toLowerCase())) {
                    hasBlockChildren = true;
                    break;
                }
            }

            if (!hasBlockChildren && div.textContent?.trim()) {
                const p = element.ownerDocument?.createElement('p');
                if (p) {
                    p.innerHTML = div.innerHTML;
                    div.replaceWith(p);
                }
            }
        }
    }

    /**
     * Count words in text
     */
    private countWords(text: string): number {
        // For languages with spaces between words
        const words = text.trim().split(/\s+/).filter(w => w.length > 0 && /[\w\u4e00-\u9fa5]/.test(w));
        return words.length;
    }

    /**
     * Calculate reading time
     */
    private calculateReadingTime(wordCount: number): number {
        return Math.max(1, Math.ceil(wordCount / 200));
    }

    /**
     * Create excerpt from text
     */
    private createExcerpt(text: string, maxLength: number = 200): string {
        const cleaned = text.trim().replace(/\s+/g, ' ');
        if (cleaned.length <= maxLength) {
            return cleaned;
        }
        return cleaned.substring(0, maxLength).trim() + '...';
    }

    /**
     * Extract title from URL as fallback
     */
    private extractTitleFromUrl(url: string): string {
        try {
            const pathname = new URL(url).pathname;
            const segments = pathname.split('/').filter(s => s);
            if (segments.length > 0) {
                const lastSegment = segments[segments.length - 1];
                return lastSegment
                    .replace(/[-_]/g, ' ')
                    .replace(/\b\w/g, l => l.toUpperCase());
            }
        } catch {
            // Invalid URL
        }
        return 'Untitled Article';
    }

    /**
     * Parse published date
     */
    private parsePublishedDate(dateStr: string | null | undefined): string | null {
        if (!dateStr) return null;

        try {
            const date = new Date(dateStr);
            if (!isNaN(date.getTime())) {
                return date.toISOString();
            }
        } catch {
            // Invalid date
        }

        return null;
    }

    /**
     * Detect language from text
     */
    private detectLanguage(text: string): string {
        const words = text.trim().split(/\s+/).filter(w => w.length > 0 && /^[a-zA-Z]+$/.test(w));
        const englishWords = words.length;

        // Korean
        if (/[\uac00-\ud7af]{10,}/.test(text)) {
            return 'ko';
        }

        // Japanese (hiragana/katakana - not kanji)
        if (/[\u3040-\u309f\u30a0-\u30ff]{5,}/.test(text)) {
            return 'ja';
        }

        // Chinese
        if (/[\u4e00-\u9fa5]{5,}/.test(text)) {
            return 'zh';
        }

        return 'en';
    }

    /**
     * Generate clean HTML snapshot for reader view
     */
    generateSnapshot(article: ExtractedArticle): string {
        const { title, content, author, publishedAt, domain, imageUrl, readingTime, lang } = article;

        // Calculate reading time if not set
        const finalReadingTime = readingTime || this.calculateReadingTime(article.wordCount);

        const escapeHtml = (str: string): string => {
            const map: Record<string, string> = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;',
            };
            return str.replace(/[&<>"']/g, m => map[m] || m);
        };

        const e = (str: string | null): string => str ? escapeHtml(str) : '';

        return `<!DOCTYPE html>
<html lang="${lang}">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${e(title)}</title>
    <meta name="description" content="${e(article.excerpt)}">
    <style>
        :root {
            --bg: #ffffff;
            --text: #37352f;
            --text-secondary: #787774;
            --text-muted: #9b9a97;
            --border: #e9e9e7;
            --link: #2383e2;
            --quote-bg: #f7f7f5;
            --quote-border: #e9e9e7;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
            background: var(--bg);
            color: var(--text);
            line-height: 1.7;
            font-size: 18px;
            -webkit-font-smoothing: antialiased;
        }

        .container {
            max-width: 700px;
            margin: 0 auto;
            padding: 40px 20px;
        }

        .article-header {
            margin-bottom: 40px;
            padding-bottom: 20px;
            border-bottom: 1px solid var(--border);
        }

        .article-title {
            font-size: 2.5em;
            font-weight: 700;
            line-height: 1.2;
            margin-bottom: 20px;
        }

        .article-meta {
            color: var(--text-secondary);
            font-size: 0.9em;
            display: flex;
            flex-wrap: wrap;
            gap: 16px;
        }

        .article-domain {
            text-transform: uppercase;
            font-size: 0.75em;
            letter-spacing: 0.5px;
        }

        .article-image {
            width: 100%;
            height: auto;
            border-radius: 8px;
            margin-bottom: 30px;
        }

        .article-content {
            font-size: 1.1em;
        }

        .article-content p {
            margin-bottom: 1.5em;
        }

        .article-content h1, .article-content h2, .article-content h3 {
            margin-top: 1.5em;
            margin-bottom: 0.75em;
            line-height: 1.3;
        }

        .article-content h1 { font-size: 2em; }
        .article-content h2 { font-size: 1.5em; }
        .article-content h3 { font-size: 1.25em; }

        .article-content a {
            color: var(--link);
            text-decoration: none;
        }

        .article-content a:hover {
            text-decoration: underline;
        }

        .article-content blockquote {
            margin: 1.5em 0;
            padding: 1em 1.5em;
            background: var(--quote-bg);
            border-left: 4px solid var(--quote-border);
            font-style: italic;
        }

        .article-content img {
            max-width: 100%;
            height: auto;
            border-radius: 4px;
            margin: 1.5em 0;
        }

        .article-content pre {
            background: #f5f5f5;
            padding: 1em;
            border-radius: 4px;
            overflow-x: auto;
            margin: 1.5em 0;
        }

        .article-content code {
            background: #f5f5f5;
            padding: 0.2em 0.4em;
            border-radius: 3px;
            font-size: 0.9em;
        }

        .article-content ul, .article-content ol {
            margin-bottom: 1.5em;
            padding-left: 2em;
        }

        .article-content li {
            margin-bottom: 0.5em;
        }

        @media (max-width: 600px) {
            .container { padding: 20px 16px; }
            .article-title { font-size: 2em; }
            body { font-size: 16px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header class="article-header">
            <div class="article-meta">
                <span class="article-domain">${e(domain)}</span>
                ${author ? `<span>${e(author)}</span>` : ''}
                <span>${finalReadingTime} min read</span>
                ${publishedAt ? `<span>${new Date(publishedAt).toLocaleDateString()}</span>` : ''}
            </div>
            <h1 class="article-title">${e(title)}</h1>
        </header>

        ${imageUrl ? `<img src="${e(imageUrl)}" alt="" class="article-image">` : ''}

        <article class="article-content">
            ${content}
        </article>
    </div>
</body>
</html>`;
    }
}
