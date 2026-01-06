
/**
 * HTML Snapshot Generator
 * 
 * Generates X-like HTML snapshots of tweets with:
 * - Text content with link highlighting
 * - Multiple images (gallery layout)
 * - Video (poster + embed)
 * - Quote tweets (nested cards)
 * - Comments section
 * - Dark/light mode (system preference)
 */

import type { TikHubTweetData, TikHubComment, TikHubMedia } from './types';

interface SnapshotOptions {
	includeComments?: boolean;
	maxComments?: number;
	theme?: 'light' | 'dark' | 'auto';
}

/**
 * Generate a complete HTML snapshot for a tweet
 */
export function generateTweetSnapshot(
	tweet: TikHubTweetData,
	comments: TikHubComment[] = [],
	options: SnapshotOptions = {}
): string {
	const { theme = 'auto' } = options;

	// Log debug info for quoted tweets
	if (tweet.quoted_tweet) {
		console.log('[Snapshot] Rendering tweet with quoted tweet:', {
			mainTweetId: tweet.id,
			quotedTweetId: tweet.quoted_tweet.id,
			quotedAuthor: tweet.quoted_tweet.author?.screen_name,
			quotedHasMedia: !!tweet.quoted_tweet.media?.length,
		});
	}

	// --- Enforce Cached Video URLs ---
	// We explicitly ignore any video links from the platform (X/Twitter) and force the use of our cached videos.
	// The backend (caching.ts) stores videos sequentially: main tweet videos first, then quoted tweet videos.
	// URL Format: https://api.tidyfeed.app/api/videos/{tweet_id}/{index}.mp4

	// Determine API URL (with fallback for safety)
	const apiUrl = (typeof process !== 'undefined' && process.env.NEXT_PUBLIC_API_URL)
		? process.env.NEXT_PUBLIC_API_URL.replace(/\/$/, '')
		: 'https://api.tidyfeed.app';

	const replaceVideoWithCached = (mediaItems: TikHubMedia[] | undefined, prefix: string = '') => {
		if (!mediaItems) return;
		let localIndex = 0;
		mediaItems.forEach(media => {
			if (media.type === 'video' || media.type === 'animated_gif') {
				// Format: "0.mp4" or "quoted_0.mp4"
				const filename = `${prefix}${localIndex}.mp4`;
				const cachedUrl = `${apiUrl}/api/videos/${tweet.id}/${filename}`;

				// Overwrite video info with a single variant pointing to our cache
				media.video_info = {
					variants: [{
						url: cachedUrl,
						content_type: 'video/mp4',
						bitrate: 9999999 // High bitrate to ensure it's picked as "best"
					}]
				};

				localIndex++;
			}
		});
	};

	// 1. Process main tweet videos (prefix: "") -> 0.mp4, 1.mp4
	replaceVideoWithCached(tweet.media, '');

	// 2. Process quoted tweet videos (prefix: "quoted_") -> quoted_0.mp4, quoted_1.mp4
	if (tweet.quoted_tweet) {
		replaceVideoWithCached(tweet.quoted_tweet.media, 'quoted_');
	}
	// ---------------------------------

	try {
		// Validate required fields
		if (!tweet || !tweet.author) {
			console.error('[Snapshot] Invalid tweet data - missing tweet or author:', JSON.stringify(tweet));
			throw new Error('Invalid tweet data: missing required fields');
		}

		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${escapeHtml(tweet.author.name || 'Unknown')} on X: "${truncateText(tweet.text || '', 60)}"</title>
	<meta name="description" content="${escapeHtml(truncateText(tweet.text || '', 160))}">
	<meta property="og:title" content="${escapeHtml(tweet.author.name || 'Unknown')} (@${tweet.author.screen_name || 'unknown'})">
	<meta property="og:description" content="${escapeHtml(truncateText(tweet.text || '', 160))}">
	<meta property="og:type" content="article">
	${tweet.media?.[0] ? `<meta property="og:image" content="${tweet.media[0].url}">` : ''}
	<style>
${getStyles(theme)}
	</style>
</head>
<body>
	<div class="container">
		<article class="tweet">
			${renderTweetContent(tweet)}
		</article>
		${comments.length > 0 ? renderCommentsSection(comments) : ''}
		<footer class="watermark">
			<span>Cached by</span>
			<a href="https://tidyfeed.app" target="_blank" rel="noopener">TidyFeed</a>
			<span class="dot">·</span>
			<span>${formatDate(new Date().toISOString())}</span>
		</footer>
	</div>
</body>
</html>`;
	} catch (error) {
		console.error('[Snapshot] Error generating snapshot:', error);
		throw error;
	}
}

/**
 * Render the main tweet content as an article
 */
function renderTweetContent(tweet: TikHubTweetData): string {
	const hasVideo = tweet.media?.some(m => m.type === 'video' || m.type === 'animated_gif');
	const images = tweet.media?.filter(m => m.type === 'photo') || [];
	const video = tweet.media?.find(m => m.type === 'video' || m.type === 'animated_gif');

	// Format the date for article metadata
	const formattedDate = formatFullDate(tweet.created_at);

	return `
		<!-- Article metadata header -->
		<div class="article-meta">
			<a href="https://x.com/${tweet.author.screen_name}" class="author-avatar" target="_blank" rel="noopener">
				${tweet.author.profile_image_url
			? `<img src="${tweet.author.profile_image_url.replace('_normal', '_bigger')}" alt="${escapeHtml(tweet.author.name)}" loading="lazy">`
			: `<div class="avatar-placeholder">${tweet.author.name.charAt(0).toUpperCase()}</div>`
		}
			</a>
			<div class="article-meta-info">
				<span class="article-meta-name">${escapeHtml(tweet.author.name)}</span>
				<span class="article-meta-date">${formattedDate}</span>
			</div>
		</div>

		<!-- Article content -->
		<div class="tweet-text">${formatTweetText(tweet.text, tweet.entities)}</div>

		${images.length > 0 && !hasVideo ? renderMediaGallery(images) : ''}
		${video ? renderVideo(video) : ''}
		${tweet.quoted_tweet && tweet.quoted_tweet.id !== tweet.id ? renderQuotedTweet(tweet.quoted_tweet) : ''}
	`;
}

/**
 * Render media gallery
 */
function renderMediaGallery(images: TikHubMedia[]): string {
	const count = Math.min(images.length, 4);
	const gridClass = count === 1 ? 'single' : count === 2 ? 'double' : count === 3 ? 'triple' : 'quad';

	return `
		<div class="media-gallery ${gridClass}">
			${images.slice(0, 4).map((img, i) => `
				<a href="${img.url}" target="_blank" class="media-item" rel="noopener">
					<img src="${img.url}" alt="Image ${i + 1}" loading="lazy">
				</a>
			`).join('')}
		</div>
	`;
}

/**
 * Render video with poster
 */
function renderVideo(video: TikHubMedia): string {
	const videoUrl = getBestVideoUrl(video);
	const posterUrl = video.preview_url || video.url;

	return `
		<div class="video-container">
			<video 
				controls 
				preload="metadata" 
				poster="${posterUrl}"
				${video.type === 'animated_gif' ? 'autoplay loop muted playsinline' : ''}
			>
				${videoUrl ? `<source src="${videoUrl}" type="video/mp4">` : ''}
				Your browser does not support video playback.
			</video>
		</div>
	`;
}

/**
 * Render quoted tweet (X-style card)
 */
function renderQuotedTweet(quoted: TikHubTweetData): string {
	const images = quoted.media?.filter(m => m.type === 'photo') || [];
	const hasVideo = quoted.media?.some(m => m.type === 'video' || m.type === 'animated_gif');
	const video = quoted.media?.find(m => m.type === 'video' || m.type === 'animated_gif');

	// Safe access with fallbacks
	const screenName = quoted.author?.screen_name || 'unknown';
	const authorName = quoted.author?.name || screenName;
	const avatarUrl = quoted.author?.profile_image_url?.replace('_normal', '_bigger') || '';
	const isVerified = !!quoted.author?.verified;

	// Generate avatar HTML with fallback
	const avatarHtml = avatarUrl
		? `<img src="${avatarUrl}" alt="" class="quoted-avatar">`
		: `<div class="quoted-avatar-placeholder">${authorName.charAt(0).toUpperCase()}</div>`;

	return `
		<div class="quoted-tweet">
			<div class="quoted-header">
				${avatarHtml}
				<span class="quoted-name">${escapeHtml(authorName)}</span>
				${isVerified ? `<svg class="verified-badge-sm" viewBox="0 0 22 22"><path fill="currentColor" d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/></svg>` : ''}
				<span class="quoted-handle">@${escapeHtml(screenName)}</span>
			</div>
			<div class="quoted-text">${formatTweetText(truncateText(quoted.text || '', 280), quoted.entities)}</div>
			${images.length > 0 && !hasVideo ? renderMediaGallery(images) : ''}
			${video ? renderQuotedVideo(video) : ''}
		</div>
	`;
}

/**
 * Render video in quoted tweet (smaller, inline)
 */
function renderQuotedVideo(video: TikHubMedia): string {
	const videoUrl = getBestVideoUrl(video);
	const posterUrl = video.preview_url || video.url || '';

	return `
		<div class="quoted-video">
			<video 
				controls 
				preload="metadata" 
				poster="${posterUrl}"
				${video.type === 'animated_gif' ? 'autoplay loop muted playsinline' : ''}
			>
				${videoUrl ? `<source src="${videoUrl}" type="video/mp4">` : ''}
			</video>
		</div>
	`;
}

/**
 * Render comments section
 */
function renderCommentsSection(comments: TikHubComment[]): string {
	return `
		<section class="comments-section">
			<h2 class="comments-title">Replies</h2>
			<div class="comments-list">
				${comments.map(comment => `
					<div class="comment">
						<img src="${comment.author.profile_image_url?.replace('_normal', '_bigger')}" alt="" class="comment-avatar">
						<div class="comment-content">
							<div class="comment-header">
								<span class="comment-name">${escapeHtml(comment.author.name)}</span>
								<span class="comment-handle">@${escapeHtml(comment.author.screen_name)}</span>
								<span class="comment-dot">·</span>
								<time class="comment-time">${formatRelativeTime(comment.created_at)}</time>
							</div>
							<div class="comment-text">${formatTweetText(comment.text)}</div>
						</div>
					</div>
				`).join('')}
			</div>
		</section>
	`;
}

/**
 * Get CSS styles (Article reader theme - Notion-like)
 * Hidden Twitter-specific elements for clean article reader style
 */
function getStyles(theme: 'light' | 'dark' | 'auto'): string {
	return `
		:root {
			/* Notion-like color scheme */
			--bg: #ffffff;
			--text: #37352f;
			--text-secondary: #787774;
			--text-muted: #9b9a97;
			--border: #e9e9e7;
			--border-light: #f1f1ef;
			--link: #2383e2;
			--card-bg: #ffffff;
			--quote-bg: #f7f7f5;
			--quote-border: #e9e9e7;
			--hover: #f1f1ef;
			--highlight: #fbf3db;
			--highlight-border: #d3c5a5;
			--accent-green: #0f7b6c;
			--code-bg: #f7f7f5;
		}

		* { margin: 0; padding: 0; box-sizing: border-box; }

		body {
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, "Apple Color Emoji", Arial, sans-serif, "Segoe UI Emoji", "Segoe UI Symbol";
			background: var(--bg);
			color: var(--text);
			line-height: 1.7;
			-webkit-font-smoothing: antialiased;
			font-size: 16px;
			letter-spacing: -0.003em;
		}

		a { color: var(--link); text-decoration: none; }
		a:hover { text-decoration: underline; }

		.container {
			max-width: 700px;
			margin: 0 auto;
			padding: 0;
		}

		/* Hide Twitter-specific elements for cleaner article look */
		.tweet-header,
		.tweet-time,
		.x-logo,
		.verified-badge,
		.author-handle {
			display: none !important;
		}

		.tweet {
			background: var(--card-bg);
		}

		/* Article metadata header */
		.article-meta {
			display: flex;
			align-items: center;
			gap: 12px;
			margin-bottom: 24px;
			padding-bottom: 20px;
			border-bottom: 1px solid var(--border-light);
		}

		.article-meta .author-avatar {
			width: 40px;
			height: 40px;
			border-radius: 6px;
			object-fit: cover;
			flex-shrink: 0;
			display: block;
		}

		.article-meta .author-avatar img {
			width: 100%;
			height: 100%;
			border-radius: 6px;
			object-fit: cover;
		}

		.article-meta .avatar-placeholder {
			width: 40px;
			height: 40px;
			border-radius: 6px;
			background: linear-gradient(135deg, var(--text-muted) 0%, var(--text-secondary) 100%);
			color: white;
			display: flex;
			align-items: center;
			justify-content: center;
			font-weight: 600;
			font-size: 18px;
		}

		.article-meta-info {
			display: flex;
			flex-direction: column;
			gap: 2px;
		}

		.article-meta-name {
			font-weight: 600;
			font-size: 14px;
			color: var(--text);
		}

		.article-meta-date {
			font-size: 13px;
			color: var(--text-muted);
		}

		.tweet-text {
			font-size: 17px;
			line-height: 1.75;
			margin-bottom: 24px;
			white-space: pre-wrap;
			word-wrap: break-word;
			color: var(--text);
			font-weight: 400;
		}

		.tweet-text p {
			margin-bottom: 1em;
		}

		.tweet-text p:last-child {
			margin-bottom: 0;
		}

		.tweet-text a {
			color: var(--link);
			text-decoration: none;
			border-bottom: 1px solid rgba(45, 170, 219, 0.3);
			transition: border-color 0.15s;
		}
		.tweet-text a:hover {
			border-bottom-color: var(--link);
		}

		/* Highlighted keywords in text - Notion style */
		.tweet-text mark {
			background: var(--highlight);
			color: var(--text);
			padding: 0 2px;
			border-radius: 2px;
		}

		/* Media gallery with cleaner borders */
		.media-gallery {
			display: grid;
			gap: 2px;
			border-radius: 4px;
			overflow: hidden;
			margin: 28px 0;
		}
		.media-gallery.single { grid-template-columns: 1fr; }
		.media-gallery.double { grid-template-columns: 1fr 1fr; aspect-ratio: 16 / 9; }
		.media-gallery.triple { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; aspect-ratio: 16 / 9; }
		.media-gallery.triple .media-item:first-child { grid-row: span 2; }
		.media-gallery.quad { grid-template-columns: 1fr 1fr; grid-template-rows: 1fr 1fr; aspect-ratio: 1 / 1; }

		.media-item { display: block; background: var(--hover); overflow: hidden; }
		.media-item img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			display: block;
		}
		.media-gallery.single .media-item img {
			max-height: 600px;
			object-fit: contain;
			background: var(--bg);
		}

		/* Quoted tweet as blockquote */
		.quoted-tweet {
			display: block;
			border-left: 3px solid var(--border);
			background: var(--quote-bg);
			border-radius: 0 4px 4px 0;
			padding: 20px 20px 20px 17px;
			margin: 28px 0;
		}

		.quoted-tweet:hover {
			background: var(--hover);
		}

		.quoted-header {
			display: none;
		}

		.quoted-text {
			font-size: 16px;
			line-height: 1.7;
			color: var(--text);
		}

		.quoted-avatar, .quoted-name, .quoted-handle, .quoted-avatar-placeholder {
			display: none;
		}

		.quoted-media {
			margin-top: 16px;
			border-radius: 4px;
			overflow: hidden;
		}
		.quoted-media img { width: 100%; max-height: 300px; object-fit: cover; display: block; }

		.quoted-video {
			margin-top: 16px;
			border-radius: 4px;
			overflow: hidden;
			background: #000;
		}
		.quoted-video video { width: 100%; max-height: 300px; display: block; }

		/* Video container */
		.video-container {
			border-radius: 4px;
			overflow: hidden;
			margin: 28px 0;
			background: #000;
		}
		.video-container video { width: 100%; display: block; }

		/* Comments section */
		.comments-section {
			margin-top: 40px;
			padding-top: 32px;
			border-top: 1px solid var(--border);
		}

		.comments-title {
			font-size: 16px;
			font-weight: 600;
			margin-bottom: 20px;
			color: var(--text);
		}

		.comment {
			display: flex;
			gap: 14px;
			padding: 20px 0;
			border-bottom: 1px solid var(--border-light);
		}
		.comment:last-child { border-bottom: none; }

		.comment-avatar {
			width: 36px;
			height: 36px;
			border-radius: 6px;
			flex-shrink: 0;
		}

		.comment-content { flex: 1; min-width: 0; }
		.comment-header {
			display: flex;
			flex-wrap: wrap;
			gap: 6px;
			align-items: center;
			margin-bottom: 6px;
			font-size: 14px;
		}
		.comment-name {
			font-weight: 600;
			color: var(--text);
		}
		.comment-handle, .comment-dot, .comment-time { color: var(--text-muted); }
		.comment-text {
			font-size: 15px;
			line-height: 1.6;
			color: var(--text);
		}

		/* Watermark footer */
		.watermark {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 8px;
			margin-top: 48px;
			padding-top: 32px;
			border-top: 1px solid var(--border-light);
			color: var(--text-muted);
			font-size: 13px;
		}
		.watermark a {
			color: var(--text);
			font-weight: 500;
			background: var(--hover);
			padding: 4px 10px;
			border-radius: 4px;
			transition: background 0.15s;
			text-decoration: none;
		}
		.watermark a:hover {
			background: var(--border);
		}
		.watermark .dot { margin: 0 4px; }
	`;
}

// Helper functions

function escapeHtml(text: string): string {
	return text
		.replace(/&/g, '&amp;')
		.replace(/</g, '&lt;')
		.replace(/>/g, '&gt;')
		.replace(/"/g, '&quot;')
		.replace(/'/g, '&#039;');
}

function truncateText(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return text.substring(0, maxLength).trim() + '...';
}

function formatTweetText(text: string, entities?: { urls: { url: string; expanded_url: string; display_url: string }[] }): string {
	// Debug: Log input to diagnose link issues
	if (entities?.urls && entities.urls.length > 0) {
		console.log('[Snapshot] formatTweetText - entities found:', {
			textLength: text.length,
			urlsCount: entities.urls.length,
			firstUrl: entities.urls[0],
			textContainsTco: text.includes(entities.urls[0].url)
		});
	} else {
		console.log('[Snapshot] formatTweetText - no entities found, will use fallback regex');
	}

	// Step 1: Decode HTML entities if the text is already escaped (fixes &#039; issue)
	let formatted = decodeHtmlEntities(text);

	// Step 2: Escape HTML for safety
	formatted = escapeHtml(formatted);

	// Step 3: Replace URLs using entities
	// IMPORTANT: If the URL in entities doesn't match the URL in text,
	// we need to find and replace ALL t.co URLs in the text
	if (entities && entities.urls && entities.urls.length > 0) {
		entities.urls.forEach((urlEntity, index) => {
			// Build link HTML (use raw values - the URL is from TikHub API which is safe)
			const linkHtml = `<a href="${urlEntity.expanded_url}" target="_blank" rel="noopener">${urlEntity.display_url}</a>`;

			// Try exact match first
			if (formatted.includes(urlEntity.url)) {
				console.log(`[Snapshot] Exact match - replacing ${urlEntity.url}`);
				formatted = formatted.split(urlEntity.url).join(linkHtml);
			} else {
				// Fallback: Find ANY t.co URL and replace it with entity data
				// This handles the case where TikHub API returns mismatched URLs
				const tcoUrlPattern = /https?:\/\/t\.co\/[a-zA-Z0-9]+/g;
				const match = formatted.match(tcoUrlPattern);
				if (match) {
					console.log(`[Snapshot] Fallback - replacing ${match[0]} with entity ${index} data`);
					formatted = formatted.replace(match[0], linkHtml);
				} else {
					console.log(`[Snapshot] WARNING: No t.co URL found to replace for entity ${index}`);
				}
			}
		});
	} else {
		// Fallback: Regex replacement with intelligent display text
		// Exclude trailing punctuation: , . : ; ! ? ) ] } ' " >
		// Also exclude CJK punctuation: ， 。 ： ； ！？ ） 】 "
		formatted = formatted.replace(
			/(https?:\/\/[a-zA-Z0-9.\-_/~%]+)/g, // Basic match
			(match) => {
				// Trim trailing punctuation (common issue in mixed text)
				const cleanUrl = match.replace(/[.,:;!?)}\]'">，。：；！？）】"]+$/, '');
				const trailing = match.substring(cleanUrl.length);
				// Generate friendly display text
				const displayText = generateLinkDisplayText(cleanUrl, cleanUrl);
				return `<a href="${cleanUrl}" target="_blank" rel="noopener">${displayText}</a>${trailing}`;
			}
		);
	}

	// Step 4: Convert @mentions to links (regex is generally safe for screen_names)
	formatted = formatted.replace(
		/@(\w+)/g,
		'<a href="https://x.com/$1" target="_blank" rel="noopener">@$1</a>'
	);

	// Step 5: Convert #hashtags to links
	formatted = formatted.replace(
		/#(\w+)/g,
		'<a href="https://x.com/hashtag/$1" target="_blank" rel="noopener">#$1</a>'
	);

	return formatted;
}

/**
 * Generate friendly display text for links
 * Prefers expanded_url title, falls back to display_url, then domain
 */
function generateLinkDisplayText(expandedUrl: string, displayUrl: string): string {
	// If display_url is not a full URL, use it directly
	if (!displayUrl.startsWith('http')) {
		return displayUrl;
	}

	// Extract domain from expanded URL for cleaner display
	try {
		const urlObj = new URL(expandedUrl);
		const domain = urlObj.hostname;

		// For well-known sites, just show domain
		// For others, show domain + path (truncated)
		const path = urlObj.pathname;
		if (path.length > 1) {
			// Show domain + first part of path (max 30 chars total)
			const maxLength = 30;
			const display = domain + path;
			return display.length > maxLength
				? domain + path.substring(0, maxLength - domain.length - 3) + '...'
				: display;
		}

		return domain;
	} catch {
		// Fallback to display_url if URL parsing fails
		return displayUrl;
	}
}

function decodeHtmlEntities(text: string): string {
	return text
		.replace(/&lt;/g, '<')
		.replace(/&gt;/g, '>')
		.replace(/&quot;/g, '"')
		.replace(/&#039;/g, "'")
		.replace(/&apos;/g, "'")
		.replace(/&amp;/g, '&');
}

function formatDate(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleDateString('en-US', {
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}

function formatFullDate(dateStr: string): string {
	const date = new Date(dateStr);
	return date.toLocaleString('en-US', {
		hour: 'numeric',
		minute: '2-digit',
		hour12: true,
		month: 'short',
		day: 'numeric',
		year: 'numeric',
	});
}

function formatRelativeTime(dateStr: string): string {
	const date = new Date(dateStr);
	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60000);
	const diffHours = Math.floor(diffMs / 3600000);
	const diffDays = Math.floor(diffMs / 86400000);

	if (diffMins < 1) return 'now';
	if (diffMins < 60) return `${diffMins}m`;
	if (diffHours < 24) return `${diffHours}h`;
	if (diffDays < 7) return `${diffDays}d`;
	return formatDate(dateStr);
}

function getBestVideoUrl(media: TikHubMedia): string | null {
	if (media.type !== 'video' && media.type !== 'animated_gif') return null;

	const variants = media.video_info?.variants || [];
	const mp4Variants = variants.filter(v => v.content_type === 'video/mp4');

	if (mp4Variants.length === 0) return null;

	// Sort by bitrate descending, get highest quality
	const sorted = mp4Variants.sort((a, b) => (b.bitrate || 0) - (a.bitrate || 0));
	return sorted[0]?.url || null;
}
