import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = {
    title: "Privacy Policy",
    description: "Privacy Policy for TidyFeed Browser Extension and Services",
}

export default function PrivacyPage() {
    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <div className="mx-auto max-w-3xl px-4 py-12">
                {/* Back Link */}
                <Link
                    href="/"
                    className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Home
                </Link>

                {/* Title */}
                <h1 className="text-3xl font-bold tracking-tight mb-2">Privacy Policy</h1>
                <p className="text-muted-foreground mb-8">Last updated: January 5, 2026</p>

                {/* Content */}
                <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8">
                    <section>
                        <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            TidyFeed (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our browser extensions (Chrome, Firefox), web dashboard, and related services.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>

                        <h3 className="text-lg font-medium mt-4 mb-2">2.1 Google Account Information</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            When you sign in with Google, we collect:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Your Google account email address</li>
                            <li>Your display name</li>
                            <li>Your profile picture URL</li>
                            <li>A unique Google identifier</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            This information is used solely for account authentication and displaying your profile within the app.
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">2.2 Social Media Account Information</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            When you link your X/Twitter account, we collect:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Your Twitter username and display name</li>
                            <li>Your profile picture URL</li>
                            <li>Your Twitter user ID</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            This information is used for bot interactions and saving tweets on your behalf.
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">2.3 Saved Content</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            When you save posts from social media platforms, we store:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Tweet text and metadata</li>
                            <li>Author information (name, username, avatar)</li>
                            <li>Media URLs (images, videos)</li>
                            <li>HTML snapshots of tweets</li>
                            <li>Your personal notes and annotations</li>
                            <li>Tags and categorization data</li>
                        </ul>

                        <h3 className="text-lg font-medium mt-4 mb-2">2.4 Local Storage Data</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            The extension stores preferences locally on your device, including:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Filter settings and blocked keywords</li>
                            <li>Usage statistics (e.g., number of ads blocked)</li>
                            <li>Extension preferences</li>
                            <li>Authentication tokens (using chrome.cookies API)</li>
                        </ul>

                        <h3 className="text-lg font-medium mt-4 mb-2">2.5 AI Features Data</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            When you use AI features like tweet summarization:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Tweet content is sent to our AI service provider</li>
                            <li>Generated summaries are stored and associated with the tweet</li>
                            <li>Custom AI prompts you configure are saved in your account</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                            <li>To authenticate your account and provide personalized services</li>
                            <li>To save, organize, and sync your content across devices</li>
                            <li>To generate AI summaries and insights from saved content</li>
                            <li>To download and store media files you request</li>
                            <li>To process bot commands for saving tweets on your behalf</li>
                            <li>To improve our extension and services</li>
                            <li>To respond to support requests</li>
                            <li>To enforce storage quotas (currently 500MB per user)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">4. Data Storage and Security</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Your data is stored securely using Cloudflare infrastructure:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li><strong>Database</strong>: Cloudflare D1 (SQLite) for structured data</li>
                            <li><strong>Media Storage</strong>: Cloudflare R2 for images, videos, and snapshots</li>
                            <li><strong>CDN</strong>: Cloudflare CDN with 1-year cache for media files</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            We implement industry-standard security measures:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Encrypted data transmission (HTTPS/TLS 1.3)</li>
                            <li>Secure authentication tokens (JWT with HttpOnly cookies)</li>
                            <li>Service-to-service authentication (INTERNAL_SERVICE_KEY)</li>
                            <li>Regular security updates and monitoring</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">5. Data Sharing</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            <strong>We do not sell, trade, or rent your personal information to third parties.</strong>
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            We may share your data in the following circumstances:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li><strong>Service Providers</strong>: With third-party services that power our platform (detailed in Section 6)</li>
                            <li><strong>Legal Requirements</strong>: If required by law, court order, or to protect our rights</li>
                            <li><strong>Business Transfer</strong>: In connection with a merger, acquisition, or sale of assets</li>
                            <li><strong>Aggregated Data</strong>: We may share anonymized, aggregated data for analytics</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">6. Third-Party Services</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Our service integrates with the following third parties:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li><strong>Google</strong>: OAuth authentication and Google Drive API. Subject to Google&apos;s privacy policy.</li>
                            <li><strong>Cloudflare</strong>: Hosting (Workers, D1, R2, CDN). Subject to Cloudflare&apos;s privacy policy.</li>
                            <li><strong>TikHub</strong>: Twitter API proxy for fetching tweet data. Subject to TikHub&apos;s privacy policy.</li>
                            <li><strong>BigModel AI</strong>: AI summarization features. Subject to their privacy policy.</li>
                            <li><strong>Fly.io</strong>: Hosting for Python workers (bot, video downloader). Subject to Fly.io&apos;s privacy policy.</li>
                            <li><strong>X/Twitter</strong>: Public data collection via API. Subject to Twitter&apos;s Terms of Service.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">7. Data Retention and Deletion</h2>

                        <h3 className="text-lg font-medium mt-4 mb-2">7.1 Retention Period</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            We retain your data for as long as your account is active. You may delete your data at any time through the dashboard.
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">7.2 Your Right to Delete</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            You can request deletion of:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Individual saved posts and associated media</li>
                            <li>Tags and notes</li>
                            <li>Your entire account and all associated data</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            Account deletion will remove all your data from our servers within 30 days, except for backups which may persist for up to 90 days.
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">7.3 Storage Quotas</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Free accounts are limited to 500MB of storage. When you reach this limit, you will need to delete old content to save new items.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">8. Cookies and Tracking</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We use the following types of cookies and storage mechanisms:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li><strong>HttpOnly Session Cookies</strong>: For authentication (auth_token)</li>
                            <li><strong>Local Storage</strong>: For extension preferences and settings</li>
                            <li><strong>Chrome Cookies API</strong>: For secure token storage in browser extensions</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            Essential cookies cannot be disabled as they are required for the service to function.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">9. Browser Permissions</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            The browser extension requests the following permissions:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li><strong>storage</strong>: To save your preferences locally</li>
                            <li><strong>cookies</strong>: To read authentication cookies</li>
                            <li><strong>activeTab</strong>: To inject features into social media sites</li>
                            <li><strong>scripting</strong>: To add UI elements and functionality</li>
                            <li><strong>alarms</strong>: For periodic background tasks</li>
                            <li><strong>Host permissions</strong>: For x.com and twitter.com</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            Each permission is used solely for the stated purpose and nothing more.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">10. Bot Interactions</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Our Twitter bot (@TidyFeedBot) interacts with users who mention it. When you use the bot:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Your public tweets mentioning the bot are processed</li>
                            <li>Tweet IDs are extracted for saving</li>
                            <li>Bot verifies your linked Twitter account before processing</li>
                            <li>No private messages or DMs are accessed without explicit authorization</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">11. Your Rights</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            You have the right to:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Access your personal data via the dashboard</li>
                            <li>Request deletion of your account and data</li>
                            <li>Export your saved content (posts, tags, notes)</li>
                            <li>Update your account information and preferences</li>
                            <li>Opt out of AI features (these features can be disabled in settings)</li>
                            <li>Unlink social media accounts</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            To exercise these rights, use the dashboard settings or contact us at the email below.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">12. Children&apos;s Privacy</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Our service is not intended for children under 13. We do not knowingly collect information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">13. International Data Transfers</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place to protect your data in accordance with this Privacy Policy.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">14. Changes to This Policy</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We may update this Privacy Policy from time to time. We will notify users of any material changes by:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Updating the &quot;Last updated&quot; date at the top of this page</li>
                            <li>Displaying a prominent notice in the dashboard</li>
                            <li>Sending an email notification for significant changes</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            Your continued use of the Service after such changes constitutes acceptance of the updated policy.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">15. Contact Us</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            If you have any questions about this Privacy Policy or our data practices, please contact us at:
                        </p>
                        <p className="text-muted-foreground mt-2">
                            <strong>Email:</strong> privacy@tidyfeed.app
                        </p>
                        <p className="text-muted-foreground mt-2">
                            <strong>Website:</strong> <a href="https://tidyfeed.app" className="text-blue-600 hover:underline" target="_blank" rel="noopener">https://tidyfeed.app</a>
                        </p>
                    </section>
                </div>

                {/* Footer */}
                <div className="mt-12 pt-8 border-t border-zinc-200 dark:border-zinc-800">
                    <p className="text-sm text-muted-foreground text-center">
                        © {new Date().getFullYear()} TidyFeed. All rights reserved.
                    </p>
                </div>
            </div>
        </div>
    )
}
