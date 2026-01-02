/**
 * HTML Snapshot Generator
 * 
 * Generates beautiful, self-contained HTML snapshots of tweets
 * with premium Twitter-like design, supporting:
 * - Text content with link highlighting
 * - Multiple images (gallery layout)
 * - Video (poster + embed)
 * - Quote tweets (nested cards)
 * - Comments section
 * - Dark/light mode
 */

import type { TikHubTweetData, TikHubComment, TikHubMedia } from './tikhub';
import { TikHubService } from './tikhub';

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

	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>${escapeHtml(tweet.author.name)} on X: "${truncateText(tweet.text, 60)}"</title>
	<meta name="description" content="${escapeHtml(truncateText(tweet.text, 160))}">
	<meta property="og:title" content="${escapeHtml(tweet.author.name)} (@${tweet.author.screen_name})">
	<meta property="og:description" content="${escapeHtml(truncateText(tweet.text, 160))}">
	<meta property="og:type" content="article">
	${tweet.media?.[0] ? `<meta property="og:image" content="${tweet.media[0].url}">` : ''}
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
	<style>
${getStyles(theme)}
	</style>
</head>
<body>
	<div class="container">
		<div class="tweet-card">
			${renderTweetContent(tweet)}
		</div>
		${comments.length > 0 ? renderCommentsSection(comments) : ''}
		<div class="watermark">
			<span>Cached by</span>
			<a href="https://tidyfeed.app" target="_blank" rel="noopener">TidyFeed</a>
			<span class="dot">•</span>
			<span>${formatDate(new Date().toISOString())}</span>
		</div>
	</div>
</body>
</html>`;
}

/**
 * Render the main tweet content
 */
function renderTweetContent(tweet: TikHubTweetData, isQuote: boolean = false): string {
	const hasVideo = tweet.media?.some(m => m.type === 'video' || m.type === 'animated_gif');
	const images = tweet.media?.filter(m => m.type === 'photo') || [];
	const video = tweet.media?.find(m => m.type === 'video' || m.type === 'animated_gif');

	return `
		<div class="tweet-header">
			<div class="author-avatar">
				${tweet.author.profile_image_url
			? `<img src="${tweet.author.profile_image_url.replace('_normal', '_bigger')}" alt="${escapeHtml(tweet.author.name)}" loading="lazy" onerror="this.onerror=null; this.outerHTML='<div class=\\'avatar-placeholder\\'>${tweet.author.name.charAt(0).toUpperCase()}</div>';">`
			: `<div class="avatar-placeholder">${tweet.author.name.charAt(0).toUpperCase()}</div>`
		}
			</div>
			<div class="author-info">
				<div class="author-name">
					${escapeHtml(tweet.author.name)}
					${tweet.author.verified ? '<svg class="verified-badge" viewBox="0 0 22 22"><path fill="currentColor" d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"/></svg>' : ''}
				</div>
				<div class="author-handle">@${escapeHtml(tweet.author.screen_name)}</div>
			</div>
			<a href="https://x.com/${tweet.author.screen_name}/status/${tweet.id}" class="x-logo" target="_blank" rel="noopener" title="View on X">
				<svg viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
			</a>
		</div>

		<div class="tweet-text">${formatTweetText(tweet.text)}</div>

		${images.length > 0 && !hasVideo ? renderMediaGallery(images) : ''}
		${video ? renderVideo(video) : ''}
		${tweet.quoted_tweet ? renderQuotedTweet(tweet.quoted_tweet) : ''}

		<div class="tweet-time">
			<time datetime="${tweet.created_at}">${formatFullDate(tweet.created_at)}</time>
		</div>

		${!isQuote ? renderMetrics(tweet) : ''}
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
					<img src="${img.url}" alt="Image ${i + 1}" loading="lazy" 
						onerror="this.onerror=null; this.style.display='none'; this.parentElement.innerHTML='<div class=\\'placeholder-img\\'><svg width=\\'24\\' height=\\'24\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'2\\'><rect x=\\'3\\' y=\\'3\\' width=\\'18\\' height=\\'18\\' rx=\\'2\\'/><circle cx=\\'8.5\\' cy=\\'8.5\\' r=\\'1.5\\'/><path d=\\'M21 15l-5-5L5 21\\'/></svg><span>Image loading... Refresh to view</span></div>';">
				</a>
			`).join('')}
		</div>
	`;
}

/**
 * Render video with poster
 */
function renderVideo(video: TikHubMedia): string {
	const videoUrl = TikHubService.getBestVideoUrl(video);
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
 * Render quoted tweet
 */
function renderQuotedTweet(quoted: TikHubTweetData): string {
	return `
		<div class="quoted-tweet">
			<div class="quoted-header">
				<img src="${quoted.author.profile_image_url?.replace('_normal', '_bigger')}" alt="" class="quoted-avatar">
				<span class="quoted-name">${escapeHtml(quoted.author.name)}</span>
				<span class="quoted-handle">@${escapeHtml(quoted.author.screen_name)}</span>
			</div>
			<div class="quoted-text">${formatTweetText(quoted.text)}</div>
			${quoted.media && quoted.media.length > 0 ? renderMediaGallery(quoted.media.slice(0, 1)) : ''}
		</div>
	`;
}

/**
 * Render tweet metrics (likes, retweets, views)
 */
function renderMetrics(tweet: TikHubTweetData): string {
	const { metrics } = tweet;
	if (!metrics) return '';

	return `
		<div class="tweet-metrics">
			${metrics.reply_count ? `<span class="metric"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067c-4.49.1-8.183-3.51-8.183-8.01zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.37 2.77 6.08 6.138 6.01l.351-.01h1.761v2.3l5.087-2.81c1.951-1.08 3.163-3.13 3.163-5.36 0-3.39-2.744-6.13-6.129-6.13H9.756z"/></svg>${formatNumber(metrics.reply_count)}</span>` : ''}
			${metrics.retweet_count ? `<span class="metric"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z"/></svg>${formatNumber(metrics.retweet_count)}</span>` : ''}
			${metrics.like_count ? `<span class="metric"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91zm4.187 7.69c-1.351 2.48-4.001 5.12-8.379 7.67l-.503.3-.504-.3c-4.379-2.55-7.029-5.19-8.382-7.67-1.36-2.5-1.41-4.86-.514-6.67.887-1.79 2.647-2.91 4.601-3.01 1.651-.09 3.368.56 4.798 2.01 1.429-1.45 3.146-2.1 4.796-2.01 1.954.1 3.714 1.22 4.601 3.01.896 1.81.846 4.17-.514 6.67z"/></svg>${formatNumber(metrics.like_count)}</span>` : ''}
			${metrics.view_count ? `<span class="metric views"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M8.75 21V3h2v18h-2zM18 21V8.5h2V21h-2zM4 21l.004-10h2L6 21H4zm9.248 0v-7h2v7h-2z"/></svg>${formatNumber(metrics.view_count)} views</span>` : ''}
		</div>
	`;
}

/**
 * Render comments section
 */
function renderCommentsSection(comments: TikHubComment[]): string {
	return `
		<div class="comments-section">
			<h3 class="comments-title">Replies</h3>
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
							${comment.like_count ? `<div class="comment-likes"><svg viewBox="0 0 24 24"><path fill="currentColor" d="M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C9.984 6.01 8.526 5.44 7.304 5.5c-1.243.07-2.349.78-2.91 1.91-.552 1.12-.633 2.78.479 4.82 1.074 1.97 3.257 4.27 7.129 6.61 3.87-2.34 6.052-4.64 7.126-6.61 1.111-2.04 1.03-3.7.477-4.82-.561-1.13-1.666-1.84-2.908-1.91z"/></svg>${comment.like_count}</div>` : ''}
						</div>
					</div>
				`).join('')}
			</div>
		</div>
	`;
}

/**
 * Get CSS styles
 */
function getStyles(theme: 'light' | 'dark' | 'auto'): string {
	const themeSelector = theme === 'auto'
		? '@media (prefers-color-scheme: dark)'
		: theme === 'dark' ? ':root' : '';

	return `
		:root {
			--bg: #ffffff;
			--text: #0f1419;
			--text-secondary: #536471;
			--border: #eff3f4;
			--link: #1d9bf0;
			--card-bg: #ffffff;
			--hover: #f7f9f9;
		}
		${theme === 'dark' ? '' : `${themeSelector} {`}
		${theme === 'auto' ? `
			:root {
				--bg: #000000;
				--text: #e7e9ea;
				--text-secondary: #71767b;
				--border: #2f3336;
				--link: #1d9bf0;
				--card-bg: #16181c;
				--hover: #1d1f23;
			}
		` : theme === 'dark' ? `
			--bg: #000000;
			--text: #e7e9ea;
			--text-secondary: #71767b;
			--border: #2f3336;
			--link: #1d9bf0;
			--card-bg: #16181c;
			--hover: #1d1f23;
		` : ''}
		${theme === 'auto' ? '}' : ''}

		* {
			margin: 0;
			padding: 0;
			box-sizing: border-box;
		}

		body {
			font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
			background: var(--bg);
			color: var(--text);
			line-height: 1.5;
			-webkit-font-smoothing: antialiased;
		}

		.container {
			max-width: 600px;
			margin: 0 auto;
			padding: 20px;
		}

		.tweet-card {
			background: var(--card-bg);
			border: 1px solid var(--border);
			border-radius: 16px;
			padding: 16px;
		}

		.tweet-header {
			display: flex;
			align-items: flex-start;
			gap: 12px;
			margin-bottom: 12px;
		}

		.author-avatar img,
		.avatar-placeholder {
			width: 48px;
			height: 48px;
			border-radius: 50%;
			object-fit: cover;
		}

		.avatar-placeholder {
			background: linear-gradient(135deg, #1d9bf0, #1a8cd8);
			display: flex;
			align-items: center;
			justify-content: center;
			color: white;
			font-weight: 700;
			font-size: 20px;
		}

		.author-info {
			flex: 1;
			min-width: 0;
		}

		.author-name {
			font-weight: 700;
			font-size: 15px;
			display: flex;
			align-items: center;
			gap: 4px;
		}

		.verified-badge {
			width: 18px;
			height: 18px;
			color: #1d9bf0;
		}

		.author-handle {
			color: var(--text-secondary);
			font-size: 15px;
		}

		.x-logo {
			color: var(--text);
			opacity: 0.8;
			transition: opacity 0.2s;
		}

		.x-logo:hover {
			opacity: 1;
		}

		.x-logo svg {
			width: 24px;
			height: 24px;
		}

		.tweet-text {
			font-size: 17px;
			line-height: 1.6;
			margin-bottom: 12px;
			white-space: pre-wrap;
			word-wrap: break-word;
		}

		.tweet-text a {
			color: var(--link);
			text-decoration: none;
		}

		.tweet-text a:hover {
			text-decoration: underline;
		}

		.media-gallery {
			display: grid;
			gap: 2px;
			border-radius: 16px;
			overflow: hidden;
			margin-bottom: 12px;
		}

		.media-gallery.single {
			grid-template-columns: 1fr;
		}

		.media-gallery.double {
			grid-template-columns: 1fr 1fr;
		}

		.media-gallery.triple {
			grid-template-columns: 1fr 1fr;
			grid-template-rows: 1fr 1fr;
		}

		.media-gallery.triple .media-item:first-child {
			grid-row: span 2;
		}

		.media-gallery.quad {
			grid-template-columns: 1fr 1fr;
			grid-template-rows: 1fr 1fr;
		}

		.media-item {
			display: block;
			aspect-ratio: 16/9;
			overflow: hidden;
		}

		.media-gallery.single .media-item {
			aspect-ratio: auto;
			max-height: 500px;
		}

		.media-item img {
			width: 100%;
			height: 100%;
			object-fit: cover;
			transition: transform 0.3s;
		}

		.media-item:hover img {
			transform: scale(1.02);
		}

		.placeholder-img {
			display: flex;
			flex-direction: column;
			align-items: center;
			justify-content: center;
			gap: 8px;
			background: linear-gradient(135deg, rgba(29, 155, 240, 0.1) 0%, rgba(29, 155, 240, 0.05) 100%);
			color: var(--text-secondary);
			font-size: 13px;
			padding: 32px 16px;
			border-radius: 12px;
			min-height: 120px;
			height: 100%;
			text-align: center;
		}

		.placeholder-img svg {
			opacity: 0.5;
		}

		.video-container {
			border-radius: 16px;
			overflow: hidden;
			margin-bottom: 12px;
		}

		.video-container video {
			width: 100%;
			display: block;
			background: #000;
		}

		.quoted-tweet {
			border: 1px solid var(--border);
			border-radius: 16px;
			padding: 12px;
			margin-bottom: 12px;
			transition: background 0.2s;
		}

		.quoted-tweet:hover {
			background: var(--hover);
		}

		.quoted-header {
			display: flex;
			align-items: center;
			gap: 8px;
			margin-bottom: 8px;
		}

		.quoted-avatar {
			width: 20px;
			height: 20px;
			border-radius: 50%;
		}

		.quoted-name {
			font-weight: 700;
			font-size: 14px;
		}

		.quoted-handle {
			color: var(--text-secondary);
			font-size: 14px;
		}

		.quoted-text {
			font-size: 15px;
			line-height: 1.5;
		}

		.tweet-time {
			color: var(--text-secondary);
			font-size: 15px;
			padding: 12px 0;
			border-bottom: 1px solid var(--border);
		}

		.tweet-metrics {
			display: flex;
			gap: 20px;
			padding-top: 12px;
			flex-wrap: wrap;
		}

		.metric {
			display: flex;
			align-items: center;
			gap: 4px;
			color: var(--text-secondary);
			font-size: 14px;
		}

		.metric svg {
			width: 18px;
			height: 18px;
		}

		.metric.views {
			margin-left: auto;
		}

		.comments-section {
			margin-top: 24px;
		}

		.comments-title {
			font-size: 20px;
			font-weight: 700;
			margin-bottom: 16px;
			padding-bottom: 12px;
			border-bottom: 1px solid var(--border);
		}

		.comment {
			display: flex;
			gap: 12px;
			padding: 12px 0;
			border-bottom: 1px solid var(--border);
		}

		.comment-avatar {
			width: 40px;
			height: 40px;
			border-radius: 50%;
			flex-shrink: 0;
		}

		.comment-content {
			flex: 1;
			min-width: 0;
		}

		.comment-header {
			display: flex;
			align-items: center;
			gap: 4px;
			flex-wrap: wrap;
			margin-bottom: 4px;
		}

		.comment-name {
			font-weight: 700;
			font-size: 15px;
		}

		.comment-handle,
		.comment-dot,
		.comment-time {
			color: var(--text-secondary);
			font-size: 15px;
		}

		.comment-text {
			font-size: 15px;
			line-height: 1.5;
		}

		.comment-likes {
			display: flex;
			align-items: center;
			gap: 4px;
			color: var(--text-secondary);
			font-size: 13px;
			margin-top: 8px;
		}

		.comment-likes svg {
			width: 16px;
			height: 16px;
		}

		.watermark {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 6px;
			margin-top: 24px;
			padding-top: 16px;
			border-top: 1px solid var(--border);
			color: var(--text-secondary);
			font-size: 13px;
		}

		.watermark a {
			color: var(--link);
			text-decoration: none;
			font-weight: 600;
		}

		.watermark a:hover {
			text-decoration: underline;
		}

		.watermark .dot {
			opacity: 0.5;
		}
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

function formatTweetText(text: string): string {
	let formatted = escapeHtml(text);

	// Convert URLs to links
	formatted = formatted.replace(
		/(https?:\/\/[^\s]+)/g,
		'<a href="$1" target="_blank" rel="noopener">$1</a>'
	);

	// Convert @mentions to links
	formatted = formatted.replace(
		/@(\w+)/g,
		'<a href="https://x.com/$1" target="_blank" rel="noopener">@$1</a>'
	);

	// Convert #hashtags to links
	formatted = formatted.replace(
		/#(\w+)/g,
		'<a href="https://x.com/hashtag/$1" target="_blank" rel="noopener">#$1</a>'
	);

	return formatted;
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

function formatNumber(num: number): string {
	if (num >= 1000000) {
		return (num / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
	}
	if (num >= 1000) {
		return (num / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
	}
	return num.toString();
}
