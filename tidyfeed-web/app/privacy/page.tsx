import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = {
    title: "Privacy Policy - TidyFeed",
    description: "Privacy Policy for TidyFeed Chrome Extension and Services",
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
                <p className="text-muted-foreground mb-8">Last updated: December 29, 2025</p>

                {/* Content */}
                <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8">
                    <section>
                        <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            TidyFeed (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and safeguard your information when you use our Chrome Extension and related services.
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

                        <h3 className="text-lg font-medium mt-4 mb-2">2.2 Saved Content</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            When you save posts from social media platforms, we store the content metadata (such as post text, media URLs, author information) to provide you with your saved content features.
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">2.3 Local Storage Data</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            The extension stores preferences locally on your device, including:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Filter settings and blocked keywords</li>
                            <li>Usage statistics (e.g., number of ads blocked)</li>
                            <li>Extension preferences</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                            <li>To authenticate your account and provide personalized services</li>
                            <li>To save and sync your content across devices</li>
                            <li>To improve our extension and services</li>
                            <li>To respond to support requests</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">4. Data Storage and Security</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Your data is stored securely using Cloudflare infrastructure. We implement industry-standard security measures to protect your information, including:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Encrypted data transmission (HTTPS)</li>
                            <li>Secure authentication tokens (JWT with HttpOnly cookies)</li>
                            <li>Regular security audits</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">5. Data Sharing</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            <strong>We do not sell, trade, or rent your personal information to third parties.</strong>
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            We may share aggregated, anonymized data for analytics purposes. We may disclose information if required by law or to protect our rights.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">6. Third-Party Services</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Our service integrates with:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li><strong>Google OAuth</strong>: For secure authentication. Google&apos;s privacy policy applies to data collected during sign-in.</li>
                            <li><strong>Cloudflare</strong>: For hosting and data storage. See Cloudflare&apos;s privacy policy for their data practices.</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            You have the right to:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Access your personal data</li>
                            <li>Request deletion of your account and data</li>
                            <li>Export your saved content</li>
                            <li>Opt out of non-essential data collection</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            To exercise these rights, please contact us at the email below.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">8. Cookies</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We use essential cookies for authentication (HttpOnly session cookies). These are necessary for the service to function and cannot be disabled.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">9. Children&apos;s Privacy</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Our service is not intended for children under 13. We do not knowingly collect information from children under 13.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">10. Changes to This Policy</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We may update this Privacy Policy from time to time. We will notify users of any material changes by updating the &quot;Last updated&quot; date at the top of this page.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">11. Contact Us</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            If you have any questions about this Privacy Policy, please contact us at:
                        </p>
                        <p className="text-muted-foreground mt-2">
                            <strong>Email:</strong> privacy@tidyfeed.app
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
