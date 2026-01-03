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
			--text: #1a1a1a;
			--text-secondary: #666;
			--border: #f0f0f0;
			--link: #000000;
			--card-bg: #ffffff;
			--quote-bg: #fafafa;
			--hover: #f5f5f5;
			--accent: #222;
		}
		${theme === 'dark' ? '' : `${themeSelector} {`}
		${theme === 'auto' ? `
			:root {
				--bg: #111111;
				--text: #ededed;
				--text-secondary: #888;
				--border: #222;
				--link: #ffffff;
				--card-bg: #111111;
				--quote-bg: #1a1a1a;
				--hover: #1f1f1f;
				--accent: #eee;
			}
		` : theme === 'dark' ? `
			--bg: #111111;
			--text: #ededed;
			--text-secondary: #888;
			--border: #222;
			--link: #ffffff;
			--card-bg: #111111;
			--quote-bg: #1a1a1a;
			--hover: #1f1f1f;
			--accent: #eee;
		` : ''}
		${theme === 'auto' ? '}' : ''}

		* { margin: 0; padding: 0; box-sizing: border-box; }

		body {
			font-family: 'Georgia', 'Cambria', 'Times New Roman', serif; /* Editorial feel */
			background: var(--bg);
			color: var(--text);
			line-height: 1.6;
			-webkit-font-smoothing: antialiased;
			padding: 40px 20px;
		}
		
		/* Switch back to sans-serif for UI elements if preferred, but let's keep it consistent */
		.sans { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }

		.container {
			max-width: 640px;
			margin: 0 auto;
		}

		.tweet-card {
			/* No border for the main card, just clean reading layout */
			padding: 0;
			margin-bottom: 40px;
		}

		.tweet-header {
			display: flex;
			align-items: center;
			gap: 12px;
			margin-bottom: 24px;
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
		}

		.author-avatar img, .avatar-placeholder {
			width: 44px;
			height: 44px;
			border-radius: 50%;
			object-fit: cover;
		}
		
		.avatar-placeholder {
			background: #333;
			color: #fff;
			display: flex; align-items: center; justify-content: center;
			font-weight: 600;
		}

		.author-info { flex: 1; }

		.author-name {
			font-weight: 600;
			font-size: 16px;
			color: var(--text);
			display: flex; align-items: center; gap: 4px;
		}
		
		.verified-badge { color: var(--text); width: 16px; height: 16px; }

		.author-handle {
			color: var(--text-secondary);
			font-size: 14px;
			font-weight: 400;
		}
		
		.tweet-date-header {
			color: var(--text-secondary);
			font-size: 14px;
			margin-top: 2px;
		}

		.tweet-text {
			font-size: 20px; /* Larger reading size */
			line-height: 1.65;
			margin-bottom: 20px;
			white-space: pre-wrap;
			word-wrap: break-word;
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; /* Keep tweets sans-serif usually, or change to serif if purely editorial */
			font-weight: 400;
			color: var(--text);
		}

		.tweet-text a {
			color: var(--link);
			text-decoration: underline;
			text-decoration-thickness: 1px;
			text-underline-offset: 2px;
			text-decoration-color: var(--text-secondary);
		}

		.tweet-text a:hover {
			text-decoration-color: var(--link);
		}

		.media-gallery {
			display: grid;
			gap: 8px; /* More spacing */
			border-radius: 12px;
			overflow: hidden;
			margin-bottom: 24px;
		}
		.media-gallery.single .media-item { max-height: 600px; }
		.media-item { background: var(--hover); }
		.media-item img { width: 100%; height: 100%; object-fit: cover; }

		.video-container {
			border-radius: 12px;
			overflow: hidden;
			margin-bottom: 24px;
			background: #000;
		}

		.quoted-tweet {
			border: 1px solid var(--border);
			background: var(--quote-bg);
			border-radius: 12px;
			padding: 16px;
			margin-top: 24px;
			margin-bottom: 12px;
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
		}

		.quoted-header {
			display: flex;
			align-items: center;
			gap: 8px;
			margin-bottom: 12px;
		}

		.quoted-avatar { width: 24px; height: 24px; border-radius: 50%; }
		.quoted-name { font-weight: 600; font-size: 14px; color: var(--text); }
		.quoted-handle { color: var(--text-secondary); font-size: 14px; }

		.quoted-text {
			font-size: 16px;
			line-height: 1.5;
			color: var(--text);
			margin-bottom: 12px;
		}
		
		.comments-section {
			margin-top: 40px;
			padding-top: 40px;
			border-top: 1px solid var(--border);
		}
		
		.comments-title {
			font-size: 16px;
			font-weight: 600;
			margin-bottom: 24px;
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
		}

		.watermark {
			display: flex;
			align-items: center;
			justify-content: center;
			gap: 6px;
			margin-top: 60px;
			padding-top: 20px;
			border-top: 1px dashed var(--border);
			color: var(--text-secondary);
			font-size: 12px;
			font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
			opacity: 0.6;
		}
		
		.watermark:hover { opacity: 1; transition: opacity 0.2s; }
		.watermark a { color: var(--text); text-decoration: none; font-weight: 500; }
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
	if (diffMins < 60) return `${diffMins} m`;
	if (diffHours < 24) return `${diffHours} h`;
	if (diffDays < 7) return `${diffDays} d`;
	return formatDate(dateStr);
}


