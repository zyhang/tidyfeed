/**
 * Content Script - Reader View Button
 *
 * Runs on all HTTP/HTTPS pages to inject a floating "Read" button
 * for saving articles to the Reader View library.
 */

export default defineContentScript({
    matches: ['<all_urls>'],
    excludeMatches: [
        '*://*.x.com/*',
        '*://*.twitter.com/*',
        '*://a.tidyfeed.app/*',
        '*://tidyfeed.app/*',
    ],
    runAt: 'document_idle',

    main() {
        // API Configuration
        const API_URL = 'https://api.tidyfeed.app';

        // Button styles
        const BUTTON_STYLES = `
          .tidyfeed-read-btn {
            position: fixed !important;
            top: 16px !important;
            right: 16px !important;
            z-index: 2147483647 !important;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important;
            color: white !important;
            border: none !important;
            border-radius: 50px !important;
            padding: 10px 20px !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            font-size: 14px !important;
            font-weight: 500 !important;
            cursor: pointer !important;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3) !important;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
            opacity: 0;
            transform: translateY(-10px);
            animation: tidyfeed-fade-in 0.3s forwards !important;
          }

          .tidyfeed-read-btn:hover {
            transform: translateY(-2px) !important;
            box-shadow: 0 6px 20px rgba(102, 126, 234, 0.4) !important;
          }

          .tidyfeed-read-btn:active {
            transform: translateY(0) !important;
          }

          .tidyfeed-read-btn.loading {
            pointer-events: none !important;
            opacity: 0.8 !important;
          }

          .tidyfeed-read-btn.loading .tidyfeed-icon {
            display: none !important;
          }

          .tidyfeed-read-btn .spinner {
            display: none !important;
            width: 14px !important;
            height: 14px !important;
            border: 2px solid rgba(255,255,255,0.3) !important;
            border-top-color: white !important;
            border-radius: 50% !important;
            animation: tidyfeed-spin 0.8s linear infinite !important;
          }

          .tidyfeed-read-btn.loading .spinner {
            display: block !important;
          }

          .tidyfeed-read-btn.success {
            background: linear-gradient(135deg, #10b981 0%, #059669 100%) !important;
          }

          .tidyfeed-read-btn.error {
            background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
          }

          .tidyfeed-read-btn .tidyfeed-icon {
            display: block;
            width: 16px;
            height: 16px;
          }

          @keyframes tidyfeed-spin {
            to { transform: rotate(360deg); }
          }

          @keyframes tidyfeed-fade-in {
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          .tidyfeed-toast {
            position: fixed !important;
            top: 20px !important;
            right: 20px !important;
            background: #1a1a1a !important;
            color: white !important;
            padding: 12px 20px !important;
            border-radius: 8px !important;
            font-size: 14px !important;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
            z-index: 2147483647 !important;
            animation: tidyfeed-slide-in 0.3s ease-out !important;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2) !important;
            max-width: 300px !important;
          }

          .tidyfeed-toast.success {
            background: #10b981 !important;
          }

          .tidyfeed-toast.error {
            background: #ef4444 !important;
          }

          .tidyfeed-toast a {
            color: white !important;
            text-decoration: underline !important;
            font-weight: 500 !important;
          }

          @keyframes tidyfeed-slide-in {
            from {
              transform: translateX(100%);
              opacity: 0;
            }
            to {
              transform: translateX(0);
              opacity: 1;
            }
          }

          @keyframes tidyfeed-slide-out {
            to {
              transform: translateX(100%);
              opacity: 0;
            }
          }

          .tidyfeed-toast.hiding {
            animation: tidyfeed-slide-out 0.3s ease-in forwards !important;
          }

          /* Dark mode support */
          @media (prefers-color-scheme: dark) {
            .tidyfeed-read-btn {
              box-shadow: 0 4px 12px rgba(102, 126, 234, 0.5) !important;
            }
          }
        `;

        // Read button icon SVG
        const READ_ICON = `
          <svg class="tidyfeed-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
          </svg>
        `;

        // Check icon SVG
        const CHECK_ICON = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        `;

        // Error icon SVG
        const ERROR_ICON = `
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="15" y1="9" x2="9" y2="15"></line>
            <line x1="9" y1="9" x2="15" y2="15"></line>
          </svg>
        `;

        let readButton: HTMLButtonElement | null = null;
        let originalHTML = READ_ICON + '<span>Read</span>';

        /**
         * Check if current page has readable content
         */
        function isReadablePage(): boolean {
            const bodyText = document.body?.innerText || '';
            const textLength = bodyText.length;
            const hasArticle = !!document.querySelector('article, [role="article"], .post, .article, .blog-post, .entry-content');
            const hasHeading = !!document.querySelector('h1, h2');
            const hasParagraphs = document.querySelectorAll('p').length >= 2;

            return textLength > 500 && (hasArticle || (hasHeading && hasParagraphs));
        }

        /**
         * Show toast notification
         */
        function showToast(message: string, type: 'success' | 'error' = 'success', duration = 4000) {
            const existingToast = document.querySelector('.tidyfeed-toast');
            if (existingToast) {
                existingToast.remove();
            }

            const toast = document.createElement('div');
            toast.className = `tidyfeed-toast ${type}`;
            toast.innerHTML = message;
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.classList.add('hiding');
                setTimeout(() => toast.remove(), 300);
            }, duration);
        }

        /**
         * Handle read button click
         */
        async function handleReadClick(e: MouseEvent) {
            if (!readButton) return;

            const currentUrl = window.location.href;

            readButton.classList.add('loading');
            readButton.innerHTML = `<div class="spinner"></div><span>Saving...</span>`;

            try {
                const response = await fetch(`${API_URL}/api/articles/save`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    credentials: 'include',
                    body: JSON.stringify({ url: currentUrl }),
                });

                const data = await response.json();

                if (data.success) {
                    if (data.alreadySaved) {
                        readButton.classList.remove('loading');
                        readButton.classList.add('success');
                        readButton.innerHTML = `${CHECK_ICON}<span>Saved</span>`;
                        showToast('Already saved to your <a href="https://a.tidyfeed.app/library/articles" target="_blank">library</a>', 'success');
                    } else {
                        readButton.classList.remove('loading');
                        readButton.classList.add('success');
                        readButton.innerHTML = `${CHECK_ICON}<span>Saved</span>`;

                        const articleId = data.articleId;
                        showToast(
                            `Article saved! <a href="https://a.tidyfeed.app/reader/${articleId}" target="_blank">Open reader view</a>`,
                            'success',
                            5000
                        );
                    }

                    setTimeout(() => {
                        if (readButton) {
                            readButton.classList.remove('success');
                            readButton.innerHTML = originalHTML;
                        }
                    }, 5000);
                } else {
                    throw new Error(data.error || 'Failed to save article');
                }
            } catch (error) {
                console.error('[TidyFeed] Failed to save article:', error);

                readButton.classList.remove('loading');
                readButton.classList.add('error');
                readButton.innerHTML = `${ERROR_ICON}<span>Failed</span>`;

                if (error instanceof TypeError && error.message.includes('fetch')) {
                    showToast('Please <a href="https://a.tidyfeed.app/login" target="_blank">sign in</a> to save articles', 'error', 6000);
                } else {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to save article';
                    showToast(`${errorMessage}. <a href="https://a.tidyfeed.app/login" target="_blank">Sign in</a> or try again.`, 'error', 6000);
                }

                setTimeout(() => {
                    if (readButton) {
                        readButton.classList.remove('error');
                        readButton.innerHTML = originalHTML;
                    }
                }, 3000);
            }
        }

        /**
         * Create read button
         */
        function createReadButton(): HTMLButtonElement {
            const button = document.createElement('button');
            button.className = 'tidyfeed-read-btn';
            button.innerHTML = originalHTML;
            button.setAttribute('aria-label', 'Save to TidyFeed Reader View');
            button.setAttribute('title', 'Save to TidyFeed Reader View');
            button.addEventListener('click', handleReadClick);
            return button;
        }

        /**
         * Inject styles
         */
        function injectStyles() {
            if (document.querySelector('#tidyfeed-reader-styles')) {
                return;
            }

            const style = document.createElement('style');
            style.id = 'tidyfeed-reader-styles';
            style.textContent = BUTTON_STYLES;
            document.head.appendChild(style);
        }

        /**
         * Initialize the reader button
         */
        function initReaderButton() {
            if (!isReadablePage()) {
                console.log('[TidyFeed Reader] Page not readable, skipping');
                return;
            }

            console.log('[TidyFeed Reader] Page is readable, injecting button');

            injectStyles();
            readButton = createReadButton();
            document.body.appendChild(readButton);
        }

        // Wait for page to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(initReaderButton, 1000);
            });
        } else {
            setTimeout(initReaderButton, 1000);
        }

        // Also check after page load for dynamic content
        window.addEventListener('load', () => {
            setTimeout(initReaderButton, 2000);
        });
    },
});
