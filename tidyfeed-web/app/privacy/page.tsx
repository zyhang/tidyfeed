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
                            TidyFeed (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy and personal data. This Privacy Policy explains how we collect, use, and safeguard your information when you use our browser extensions (Chrome, Firefox), web dashboard, and related services.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            <strong>Our Privacy Principles:</strong>
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li><strong>Data Minimization</strong>: We only collect data that is necessary for the Service to function</li>
                            <li><strong>User Control</strong>: You have full control over your data and can delete it at any time</li>
                            <li><strong>Transparency</strong>: We clearly explain what data we collect and why</li>
                            <li><strong>Security</strong>: We use industry-standard security measures to protect your data</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>

                        <h3 className="text-lg font-medium mt-4 mb-2">2.1 Account Information (Required for Service)</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            When you create an account using Google Sign-In, we collect only what is necessary:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Email address (for account identification and communication)</li>
                            <li>Display name (for personalization)</li>
                            <li>Profile picture URL (for display in the interface)</li>
                            <li>Unique Google identifier (for account authentication)</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            <em>This information is required to create your account and provide the Service. Without it, core features will not function.</em>
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">2.2 Social Media Account Information (Optional)</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            If you choose to link your X/Twitter account (optional feature), we collect:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Twitter username, display name, and user ID</li>
                            <li>Profile picture URL</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            <em>This is optional. You can use the Service without linking social media accounts, though some features (like bot interactions) will not be available.</em>
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">2.3 Content You Save (Required for Core Features)</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            When you save social media content, we store only what you choose to save:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Tweet text and metadata (author, timestamp, etc.)</li>
                            <li>Author information (publicly available data)</li>
                            <li>Media URLs (images, videos) you choose to download</li>
                            <li>HTML snapshots (for offline viewing)</li>
                            <li>Your personal notes and tags (created by you)</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            <em>We only save content when you explicitly choose to save it. We do not automatically collect or scan your social media activity.</em>
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">2.4 Local Storage Data (Stored on Your Device)</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            The extension stores data locally on your device using browser storage APIs:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Your filter settings and blocked keywords</li>
                            <li>Usage statistics (count of filtered items, stored locally)</li>
                            <li>Extension preferences (your configuration choices)</li>
                            <li>Authentication tokens (using chrome.cookies API for secure access)</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            <em>Local data never leaves your device except for authentication tokens needed to access our cloud services.</em>
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">2.5 AI Features Data (Opt-In Only)</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            AI features (like tweet summarization) are <strong>disabled by default</strong>. If you choose to enable them:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Tweet content is sent to our AI service provider only when you explicitly request a summary</li>
                            <li>Generated summaries are stored and associated with the tweet</li>
                            <li>Custom AI prompts you configure are saved in your account settings</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            <em>You must explicitly enable AI features in settings. You can disable them at any time, which stops all data transmission to AI services.</em>
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We use your information only for the following purposes:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                            <li><strong>Authentication</strong>: To verify your identity and provide access to your account</li>
                            <li><strong>Core Features</strong>: To save, organize, and sync your content across your devices</li>
                            <li><strong>Optional Features</strong>: To provide AI features (only if enabled by you)</li>
                            <li><strong>Media Download</strong>: To download and store media files you explicitly request</li>
                            <li><strong>Bot Interactions</strong>: To process bot commands (only if you link your social account)</li>
                            <li><strong>Service Improvement</strong>: To fix bugs, improve performance, and develop new features</li>
                            <li><strong>Support</strong>: To respond to your questions and support requests</li>
                            <li><strong>Storage Management</strong>: To enforce storage quotas (500MB for free accounts)</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            <strong>We do not use your data for advertising, marketing, or selling to third parties.</strong>
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">4. Data Storage and Security</h2>

                        <h3 className="text-lg font-medium mt-4 mb-2">4.1 Storage Infrastructure</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Your data is stored securely using Cloudflare infrastructure:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li><strong>Database</strong>: Cloudflare D1 (SQLite) for structured data (encrypted at rest)</li>
                            <li><strong>Media Storage</strong>: Cloudflare R2 (S3-compatible) for images, videos, and snapshots</li>
                            <li><strong>CDN</strong>: Cloudflare CDN with HTTPS for all data transfers</li>
                            <li><strong>Data Centers</strong>: Located in the United States and European Union</li>
                        </ul>

                        <h3 className="text-lg font-medium mt-4 mb-2">4.2 Security Measures</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            We implement multiple layers of security:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li><strong>Encryption</strong>: All data is transmitted over HTTPS/TLS 1.3</li>
                            <li><strong>Authentication</strong>: JWT tokens with HttpOnly, Secure, SameSite cookies</li>
                            <li><strong>Service Authentication</strong>: Internal service-to-service communication using encrypted keys</li>
                            <li><strong>Access Controls</strong>: Least-privilege access to production systems</li>
                            <li><strong>Regular Updates</strong>: Security patches and dependency updates</li>
                            <li><strong>Monitoring</strong>: 24/7 security monitoring and intrusion detection</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">5. Data Sharing and Third Parties</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            <strong>We do not sell, rent, or trade your personal information.</strong>
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">5.1 When We Share Data</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            We only share data in limited circumstances:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li><strong>Service Providers</strong>: With companies that power our infrastructure (see Section 6)</li>
                            <li><strong>Legal Requirements</strong>: When required by law, court order, or to protect our rights</li>
                            <li><strong>Business Transfer</strong>: In connection with a merger or acquisition (with notice)</li>
                            <li><strong>With Your Consent</strong>: When you explicitly give us permission</li>
                        </ul>

                        <h3 className="text-lg font-medium mt-4 mb-2">5.2 Aggregated Data</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            We may share anonymized, aggregated statistics (e.g., &quot;50% of users filtered 100+ tweets&quot;) that cannot reasonably be used to identify you.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">6. Third-Party Services</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Our Service integrates with third-party services. Each integration is necessary for the Service to function:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li><strong>Google OAuth</strong>: Required for user authentication. <a href="https://policies.google.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener">Google&apos;s privacy policy</a> applies.</li>
                            <li><strong>Cloudflare (Workers, D1, R2, CDN)</strong>: Required for hosting and data storage. <a href="https://www.cloudflare.com/privacypolicy/" className="text-blue-600 hover:underline" target="_blank" rel="noopener">Cloudflare&apos;s privacy policy</a> applies.</li>
                            <li><strong>TikHub API</strong>: Required to fetch public Twitter data. <a href="https://www.tikhub.com/privacy" className="text-blue-600 hover:underline" target="_blank" rel="noopener">TikHub&apos;s privacy policy</a> applies.</li>
                            <li><strong>BigModel AI</strong>: <strong>Optional</strong> - only used if you enable AI features. <a href="#" className="text-blue-600 hover:underline" target="_blank" rel="noopener">Privacy policy</a> applies.</li>
                            <li><strong>Fly.io</strong>: Required for hosting background workers (bot, video downloader). <a href="https://fly.io/legal/privacy-policy/" className="text-blue-600 hover:underline" target="_blank" rel="noopener">Fly.io&apos;s privacy policy</a> applies.</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            We carefully vet all third-party providers to ensure they meet our security standards.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">7. Your Rights and Control</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            You have complete control over your data:
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">7.1 Access and Portability</h3>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li><strong>View</strong>: Access all your saved content through the dashboard</li>
                            <li><strong>Export</strong>: Export your saved posts, tags, and notes at any time</li>
                            <li><strong>Download</strong>: Download all your data in a machine-readable format</li>
                        </ul>

                        <h3 className="text-lg font-medium mt-4 mb-2">7.2 Deletion</h3>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li><strong>Delete Individual Items</strong>: Remove any saved post, tag, or note</li>
                            <li><strong>Delete Account</strong>: Permanently delete your account and all associated data</li>
                            <li><strong>Unlink Accounts</strong>: Disconnect linked social media accounts</li>
                            <li><strong>Disable Features</strong>: Turn off AI features, bot interactions, etc.</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            Account deletion removes all data from our production servers within 30 days. Backups may persist for up to 90 days before being permanently destroyed.
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">7.3 Opt-Out Choices</h3>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li><strong>AI Features</strong>: Disabled by default. Enable only if you choose to.</li>
                            <li><strong>Bot Interactions</strong>: Optional. Link your account only if you want to use this feature.</li>
                            <li><strong>Local Storage</strong>: Clear extension data anytime through browser settings.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">8. Data Retention</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            <strong>Retention Period:</strong> We retain your data for as long as your account is active. If you delete your account or specific items, they are removed according to our deletion policy.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            <strong>Storage Quotas:</strong> Free accounts are limited to 500MB. When you reach this limit, you must delete existing content to save new items. We will notify you when you approach your limit.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">9. Cookies, Storage, and Browser Permissions</h2>

                        <h3 className="text-lg font-medium mt-4 mb-2">9.1 Cookies</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            We use essential cookies required for the Service to function:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li><strong>auth_token</strong>: HttpOnly session cookie for authentication (required)</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            These cookies cannot be disabled as they are necessary for the Service to function.
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">9.2 Browser Storage</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            The extension uses:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li><strong>localStorage/chrome.storage</strong>: For your preferences and settings</li>
                            <li><strong>chrome.cookies API</strong>: To securely access authentication tokens</li>
                        </ul>

                        <h3 className="text-lg font-medium mt-4 mb-2">9.3 Browser Permissions</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            The extension requests only necessary permissions:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li><strong>storage</strong>: Required to save your settings locally</li>
                            <li><strong>cookies</strong>: Required to read authentication cookies for API requests</li>
                            <li><strong>activeTab</strong>: Required to inject features into social media sites you visit</li>
                            <li><strong>scripting</strong>: Required to add UI elements and functionality</li>
                            <li><strong>alarms</strong>: Required for periodic background sync tasks</li>
                            <li><strong>Host permissions</strong>: Required for x.com and twitter.com (only interacts with these domains)</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            Each permission is used <strong>solely</strong> for the stated purpose and nothing more. We do not collect data from other websites or use permissions for undisclosed purposes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">10. Bot Interactions (Optional Feature)</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Our Twitter bot (@TidyFeedBot) is an <strong>optional</strong> feature. If you choose to use it:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Your <strong>public</strong> tweets mentioning the bot are processed</li>
                            <li>Tweet IDs are extracted for saving (no private DMs are accessed)</li>
                            <li>Bot verifies your linked Twitter account before processing</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            <em>This feature is opt-in. You can use the full functionality of the Service without ever using the bot.</em>
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">11. International Data Transfers</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Your information may be stored and processed on servers located in the United States and European Union. We ensure appropriate safeguards are in place to protect your data, including:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>EU-US Data Privacy Framework compliance</li>
                            <li>Standard Contractual Clauses with third-party providers</li>
                            <li>Adequacy decisions for countries recognized by the EU</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            By using our Service, you consent to this international data transfer.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">12. Children&apos;s Privacy</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Our Service is not intended for children under 13. We do not knowingly collect information from children under 13. If you are a parent or guardian and believe your child has provided us with personal information, please contact us immediately, and we will delete it.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">13. Changes to This Policy</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We may update this Privacy Policy to reflect changes in our practices or for legal and operational reasons. We will notify you of material changes by:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Updating the &quot;Last updated&quot; date at the top</li>
                            <li>Displaying a prominent notice in the dashboard for 30 days</li>
                            <li>Sending an email notification for significant changes</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            Your continued use after changes constitutes acceptance of the updated policy.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">14. Contact Us</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            If you have questions about this Privacy Policy, our data practices, or to exercise your rights, please contact us:
                        </p>
                        <p className="text-muted-foreground mt-2">
                            <strong>Email:</strong> privacy@tidyfeed.app
                        </p>
                        <p className="text-muted-foreground mt-2">
                            <strong>Website:</strong> <a href="https://tidyfeed.app" className="text-blue-600 hover:underline" target="_blank" rel="noopener">https://tidyfeed.app</a>
                        </p>
                        <p className="text-muted-foreground mt-2">
                            <strong>Data Protection Officer (EU)</strong>: privacy@tidyfeed.app
                        </p>
                        <p className="text-muted-foreground mt-2">
                            We will respond to your inquiry within 30 days.
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
