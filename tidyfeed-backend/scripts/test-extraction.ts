/**
 * Manual test script for ArticleExtractor
 * Run with: npx tsx scripts/test-extraction.ts
 */

import { ArticleExtractor } from '../src/services/articleExtractor';

const extractor = new ArticleExtractor();

async function testExtraction() {
    console.log('=== Article Extraction Test ===\n');

    // Test 1: Extract from a real URL
    console.log('Test 1: Extracting from a sample URL...');
    try {
        // Using a known article URL for testing
        const testUrl = 'https://www.example.com/article';
        console.log(`  URL: ${testUrl}`);

        // For now, test with HTML string since we can't fetch arbitrary URLs in tests
        const testHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <title>Example Article Title</title>
                <meta name="author" content="Jane Doe">
                <meta property="og:description" content="This is a test article for the Reader View feature.">
                <meta property="og:image" content="https://example.com/image.jpg">
            </head>
            <body>
                <main>
                    <article>
                        <h1>Understanding the Reader View Feature</h1>
                        <p>The Reader View feature allows users to save any webpage and view it in a clean, distraction-free environment. This is similar to popular services like Pocket, Instapaper, or Omnivore.</p>
                        <p>When you click the "Read" button in your browser extension, the system extracts the main content from the page, removing ads, navigation, and other clutter. The extracted content is then saved to your library.</p>
                        <p>The article extraction uses Mozilla's Readability algorithm, which is the same technology used by Firefox's Reader View. This ensures high-quality extraction from a wide variety of websites.</p>
                        <h2>Key Features</h2>
                        <ul>
                            <li>Clean typography optimized for reading</li>
                            <li>Dark and light theme options</li>
                            <li>Adjustable font sizes</li>
                            <li>Reading time estimation</li>
                            <li>Offline access to saved articles</li>
                        </ul>
                        <p>Whether you're saving blog posts, news articles, or long-form content, Reader View provides a consistent and pleasant reading experience across all your devices.</p>
                    </article>
                </main>
            </body>
            </html>
        `;

        const result = extractor.extractFromHtml(testHtml, testUrl);

        if (result) {
            console.log('  ✓ Extraction successful!');
            console.log(`  Title: ${result.title}`);
            console.log(`  Author: ${result.author || 'N/A'}`);
            console.log(`  Domain: ${result.domain}`);
            console.log(`  Word count: ${result.wordCount}`);
            console.log(`  Reading time: ${result.readingTime} minutes`);
            console.log(`  Language: ${result.lang}`);
            console.log(`  Excerpt: ${result.excerpt?.substring(0, 100)}...`);
            console.log(`  Content length: ${result.content.length} characters`);
        } else {
            console.log('  ✗ Extraction failed');
        }
    } catch (error) {
        console.error('  ✗ Test failed:', error);
    }

    console.log('\nTest 2: Generating snapshot...');
    try {
        const article = {
            title: 'Test Article',
            content: '<p>This is a test article with some content.</p><p>It has multiple paragraphs.</p>',
            textContent: 'This is a test article with some content. It has multiple paragraphs.',
            excerpt: 'A brief excerpt of the article.',
            author: 'Test Author',
            publishedAt: '2024-01-15T10:00:00Z',
            imageUrl: 'https://example.com/image.jpg',
            domain: 'example.com',
            url: 'https://example.com/test',
            wordCount: 14,
            readingTime: 1,
            lang: 'en'
        };

        const snapshot = extractor.generateSnapshot(article);
        console.log(`  ✓ Snapshot generated (${snapshot.length} characters)`);
        console.log(`  Contains title: ${snapshot.includes('<title>' + article.title + '</title>')}`);
        console.log(`  Contains content: ${snapshot.includes(article.content)}`);
        console.log(`  Contains author: ${snapshot.includes(article.author)}`);
    } catch (error) {
        console.error('  ✗ Snapshot generation failed:', error);
    }

    console.log('\nTest 3: Chinese content detection...');
    try {
        const chineseHtml = `
            <!DOCTYPE html>
            <html>
            <head><title>中文测试文章</title></head>
            <body>
                <article>
                    <h1>这是一篇中文文章</h1>
                    <p>中文内容测试。为了达到足够的字符数，我们需要添加更多的中文内容。文章提取器应该能够正确识别中文语言。</p>
                    <p>继续添加内容以确保超过字符阈值。这样可以确保文章被正确提取和保存。</p>
                    <p>第三段内容，确保我们有足够的文字来进行语言检测。</p>
                </article>
            </body>
            </html>
        `;

        const result = extractor.extractFromHtml(chineseHtml, 'https://example.cn/article');
        if (result) {
            console.log(`  ✓ Chinese content detected`);
            console.log(`  Language: ${result.lang}`);
            console.log(`  Word count: ${result.wordCount}`);
            console.log(`  Title: ${result.title}`);
        } else {
            console.log('  ✗ Failed to extract Chinese content');
        }
    } catch (error) {
        console.error('  ✗ Chinese content test failed:', error);
    }

    console.log('\nTest 4: Content too short...');
    try {
        const shortHtml = `
            <!DOCTYPE html>
            <html>
            <head><title>Short</title></head>
            <body>
                <p>Not enough content here.</p>
            </body>
            </html>
        `;

        const result = extractor.extractFromHtml(shortHtml, 'https://example.com/short');
        if (result === null) {
            console.log('  ✓ Correctly rejected short content');
        } else {
            console.log('  ✗ Should have rejected short content');
        }
    } catch (error) {
        console.error('  ✗ Short content test failed:', error);
    }

    console.log('\n=== Tests Complete ===');
}

testExtraction().catch(console.error);
