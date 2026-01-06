/**
 * Article Extraction Tests
 *
 * Test the ArticleExtractor service with various article types.
 */

import { describe, it, expect } from 'vitest';
import { ArticleExtractor } from '../src/services/articleExtractor';

describe('ArticleExtractor', () => {
    const extractor = new ArticleExtractor();

    describe('extractFromHtml', () => {
        it('should extract article content from a simple HTML page', () => {
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Test Article</title>
                    <meta name="author" content="John Doe">
                    <meta property="og:description" content="A test article description">
                </head>
                <body>
                    <article>
                        <h1>Main Heading</h1>
                        <p>This is the first paragraph of the article. It contains multiple sentences to ensure we have enough content.</p>
                        <p>This is the second paragraph. Articles need substantial content to be considered readable.</p>
                        <p>This is the third paragraph with even more content to reach the character threshold for extraction.</p>
                    </article>
                </body>
                </html>
            `;

            const result = extractor.extractFromHtml(html, 'https://example.com/article');

            expect(result).not.toBeNull();
            expect(result?.title).toBe('Test Article');
            expect(result?.author).toBe('John Doe');
            expect(result?.excerpt).toContain('test article description');
            expect(result?.wordCount).toBeGreaterThan(20);
            expect(result?.readingTime).toBeGreaterThan(0);
            expect(result?.content).toContain('Main Heading');
            expect(result?.domain).toBe('example.com');
        });

        it('should handle article with OpenGraph metadata', () => {
            const html = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>Page Title</title>
                    <meta property="og:title" content="OG Title">
                    <meta property="og:description" content="OG Description">
                    <meta property="og:image" content="https://example.com/image.jpg">
                    <meta property="article:author" content="Jane Smith">
                    <meta property="article:published_time" content="2024-01-15T10:00:00Z">
                </head>
                <body>
                    <article>
                        <h1>Article Heading</h1>
                        <p>Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.</p>
                        <p>Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.</p>
                        <p>Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur.</p>
                        <p>Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.</p>
                    </article>
                </body>
                </html>
            `;

            const result = extractor.extractFromHtml(html, 'https://example.com/article');

            expect(result).not.toBeNull();
            expect(result?.title).toBe('OG Title'); // OG title should override
            expect(result?.excerpt).toContain('OG Description');
            expect(result?.imageUrl).toBe('https://example.com/image.jpg');
            expect(result?.author).toBe('Jane Smith');
            expect(result?.publishedAt).toBe('2024-01-15T10:00:00.000Z');
        });

        it('should return null for content without substantial text', () => {
            const html = `
                <!DOCTYPE html>
                <html>
                <head><title>Empty Page</title></head>
                <body>
                    <p>Short text.</p>
                </body>
                </html>
            `;

            const result = extractor.extractFromHtml(html, 'https://example.com');

            expect(result).toBeNull();
        });

        it('should handle Chinese content', () => {
            const html = `
                <!DOCTYPE html>
                <html>
                <head><title>测试文章</title></head>
                <body>
                    <article>
                        <h1>中文标题</h1>
                        <p>这是一篇中文文章。为了达到足够的字符数，我们需要更多的内容。这篇文章主要测试中文内容的提取功能。</p>
                        <p>中文是世界上使用人数最多的语言之一。简体中文和繁体中文都有广泛的使用。文章提取器应该能够正确处理中文字符。</p>
                        <p>继续添加更多的中文内容以确保我们超过了字符阈值。这样可以让提取器识别这是一篇有实质内容的文章。</p>
                    </article>
                </body>
                </html>
            `;

            const result = extractor.extractFromHtml(html, 'https://example.com/zh/article');

            expect(result).not.toBeNull();
            expect(result?.lang).toBe('zh');
            expect(result?.title).toBe('测试文章');
            expect(result?.wordCount).toBeGreaterThan(10);
        });

        it('should create excerpt from text when metadata is missing', () => {
            const html = `
                <!DOCTYPE html>
                <html>
                <head><title>Test</title></head>
                <body>
                    <article>
                        <h1>Article Heading</h1>
                        <p>This is the first paragraph with substantial content that should be used for the excerpt when no metadata is available.</p>
                        <p>Additional paragraph with more content to ensure we pass the character threshold.</p>
                        <p>Even more content to make sure this is recognized as a valid article.</p>
                    </article>
                </body>
                </html>
            `;

            const result = extractor.extractFromHtml(html, 'https://example.com/article');

            expect(result).not.toBeNull();
            expect(result?.excerpt).toBeDefined();
            expect(result?.excerpt?.length).toBeGreaterThan(50);
        });

        it('should extract title from URL as fallback', () => {
            const html = `
                <!DOCTYPE html>
                <html>
                <head></head>
                <body>
                    <article>
                        <h1>Article Content</h1>
                        <p>First paragraph with enough content to pass the threshold.</p>
                        <p>Second paragraph with additional content to ensure extraction works correctly.</p>
                        <p>Third paragraph with even more content for good measure.</p>
                        <p>Fourth paragraph to be absolutely sure we have enough content.</p>
                    </article>
                </body>
                </html>
            `;

            const result = extractor.extractFromHtml(html, 'https://blog.example.com/my-interesting-article');

            expect(result).not.toBeNull();
            // Should have some title, either extracted or from URL
            expect(result?.title).toBeDefined();
            expect(result?.title?.length).toBeGreaterThan(0);
        });
    });

    describe('generateSnapshot', () => {
        it('should generate clean HTML snapshot', () => {
            const article = {
                title: 'Test Article',
                content: '<p>Test content</p>',
                textContent: 'Test content',
                excerpt: 'Test excerpt',
                author: 'Test Author',
                publishedAt: '2024-01-15T10:00:00Z',
                imageUrl: 'https://example.com/image.jpg',
                domain: 'example.com',
                url: 'https://example.com/article',
                wordCount: 100,
                readingTime: 1,
                lang: 'en'
            };

            const extractor = new ArticleExtractor();
            const snapshot = extractor.generateSnapshot(article);

            expect(snapshot).toContain('<!DOCTYPE html>');
            expect(snapshot).toContain('<title>Test Article</title>');
            expect(snapshot).toContain('<p>Test content</p>');
            expect(snapshot).toContain('Test Author');
            expect(snapshot).toContain('1 min read');
            expect(snapshot).toContain('example.com');
            expect(snapshot).toContain('https://example.com/image.jpg');
            expect(snapshot).toContain('lang="en"');
        });

        it('should generate snapshot without optional fields', () => {
            const article = {
                title: 'Test Article',
                content: '<p>Test content</p>',
                textContent: 'Test content',
                excerpt: 'Test excerpt',
                author: null,
                publishedAt: null,
                imageUrl: null,
                domain: 'example.com',
                url: 'https://example.com/article',
                wordCount: 100,
                readingTime: 1,
                lang: 'en'
            };

            const extractor = new ArticleExtractor();
            const snapshot = extractor.generateSnapshot(article);

            expect(snapshot).toContain('<!DOCTYPE html>');
            expect(snapshot).toContain('<title>Test Article</title>');
            expect(snapshot).toContain('<p>Test content</p>');
            // Should not contain image tag
            expect(snapshot).not.toContain('<img');
        });
    });

    describe('countWords', () => {
        it('should count words correctly', () => {
            const html = `
                <!DOCTYPE html>
                <html>
                <body>
                    <article>
                        <h1>Title</h1>
                        <p>One two three four five six seven eight nine ten.</p>
                        <p>Eleven twelve thirteen fourteen fifteen.</p>
                    </article>
                </body>
                </html>
            `;

            const result = extractor.extractFromHtml(html, 'https://example.com');

            expect(result).not.toBeNull();
            expect(result?.wordCount).toBe(18); // 15 + "Title"
        });
    });

    describe('calculateReadingTime', () => {
        it('should calculate reading time based on word count', () => {
            const html = `
                <!DOCTYPE html>
                <html>
                <body>
                    <article>
                        ${Array(25).fill('<p>Word1 word2 word3 word4 word5 word6 word7 word8 word9 word10.</p>').join('\n                        ')}
                    </article>
                </body>
                </html>
            `;

            const result = extractor.extractFromHtml(html, 'https://example.com');

            expect(result).not.toBeNull();
            expect(result?.wordCount).toBe(250); // 25 paragraphs × 10 words
            expect(result?.readingTime).toBe(2); // 250 / 200 = 1.25, ceil = 2
        });

        it('should return minimum 1 minute for short articles', () => {
            const html = `
                <!DOCTYPE html>
                <html>
                <body>
                    <article>
                        <p>This is a short article, but it includes enough repeated content to pass the minimum length threshold for extraction.</p>
                        <p>This is a short article, but it includes enough repeated content to pass the minimum length threshold for extraction.</p>
                    </article>
                </body>
                </html>
            `;

            const result = extractor.extractFromHtml(html, 'https://example.com');

            expect(result).not.toBeNull();
            expect(result?.readingTime).toBe(1); // Minimum 1 minute
        });
    });
});
