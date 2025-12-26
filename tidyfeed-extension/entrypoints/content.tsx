import ReactDOM from 'react-dom/client';
import '../assets/tailwind.css';
import { Sidebar } from './content/components/Sidebar';
import { initAdBlocker } from './content/logic/adBlocker';
import { initTweetInjector } from './content/logic/injector';

// Content script for Twitter/X
export default defineContentScript({
    matches: ['*://*.x.com/*', '*://*.twitter.com/*'],
    cssInjectionMode: 'ui',

    async main(ctx) {
        // Initialize the ad blocker
        initAdBlocker();

        // Initialize the tweet button injector
        initTweetInjector();

        // Create a Shadow DOM UI container for the sidebar
        const ui = await createShadowRootUi(ctx, {
            name: 'tidyfeed-sidebar',
            position: 'inline',
            anchor: 'body',
            onMount: (container) => {
                const app = document.createElement('div');
                app.id = 'tidyfeed-root';
                container.append(app);

                const root = ReactDOM.createRoot(app);
                root.render(<Sidebar />);
                return root;
            },
            onRemove: (root) => {
                root?.unmount();
            },
        });

        ui.mount();
    },
});
