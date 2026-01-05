import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = {
    title: "Terms of Service",
    description: "Terms of Service for TidyFeed Browser Extension and Services",
}

export default function TermsPage() {
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
                <h1 className="text-3xl font-bold tracking-tight mb-2">Terms of Service</h1>
                <p className="text-muted-foreground mb-8">Last updated: January 5, 2026</p>

                {/* Content */}
                <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8">
                    <section>
                        <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            By accessing or using TidyFeed (&quot;Service&quot;), including our browser extensions (Chrome, Firefox), web dashboard, bot services, and related services, you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these terms, please do not use our Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            TidyFeed is a social media management platform that provides:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Content filtering and management for X/Twitter</li>
                            <li>Advertisement and promotional content blocking</li>
                            <li>Bookmarking and organizing valuable posts</li>
                            <li>Media downloading (images, videos)</li>
                            <li>Tweet snapshots with annotation tools</li>
                            <li>AI-powered summarization and insights</li>
                            <li>Tag-based organization system</li>
                            <li>Twitter bot for remote saving (@TidyFeedBot)</li>
                            <li>Social account linking for enhanced features</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            The Service is provided as a freemium service with storage limitations (currently 500MB for free accounts).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>

                        <h3 className="text-lg font-medium mt-4 mb-2">3.1 Account Creation</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            To access certain features, you must create an account using Google Sign-In. You are responsible for:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Maintaining the confidentiality of your account credentials</li>
                            <li>All activities that occur under your account</li>
                            <li>Notifying us immediately of any unauthorized use</li>
                        </ul>

                        <h3 className="text-lg font-medium mt-4 mb-2">3.2 Account Requirements</h3>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                            <li>You must be at least 13 years old to use the Service</li>
                            <li>You must provide accurate and complete information</li>
                            <li>You are responsible for compliance with applicable laws</li>
                        </ul>

                        <h3 className="text-lg font-medium mt-4 mb-2">3.3 Storage Quotas</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Free accounts are limited to 500MB of storage. When you reach this limit, you must delete existing content to save new items. We reserve the right to modify storage quotas at any time.
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">3.4 Account Termination</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            We reserve the right to suspend or terminate your account at any time for:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Violation of these Terms</li>
                            <li>Fraudulent or abusive behavior</li>
                            <li>Exceeding storage quotas for extended periods</li>
                            <li>Inactivity for more than 12 months</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">4. Acceptable Use</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            You agree NOT to:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Use the Service for any illegal purpose</li>
                            <li>Reverse engineer, decompile, or disassemble the Service</li>
                            <li>Interfere with or disrupt the Service or connected servers</li>
                            <li>Use automated systems to access the Service excessively (rate limiting applies)</li>
                            <li>Impersonate others or provide false information</li>
                            <li>Harass, abuse, or harm other users</li>
                            <li>Attempt to gain unauthorized access to other accounts or systems</li>
                            <li>Use the Service to violate X/Twitter&apos;s Terms of Service</li>
                            <li>Remove or circumvent copyright notices from saved content</li>
                            <li>Use the Service to create spam or manipulate social media metrics</li>
                        </ul>

                        <h3 className="text-lg font-medium mt-4 mb-2">4.1 Twitter Bot Usage</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            When using @TidyFeedBot:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>You must link your Twitter account first</li>
                            <li>Bot commands are processed as public mentions</li>
                            <li>You are responsible for all bot interactions from your account</li>
                            <li>Rate limits apply to bot commands</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">5. Intellectual Property</h2>

                        <h3 className="text-lg font-medium mt-4 mb-2">5.1 Our Content</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            The Service, including its design, features, code, and content, is owned by TidyFeed and protected by copyright, trademark, and other intellectual property laws.
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">5.2 Your Content</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            <strong>You retain ownership</strong> of content you save or create. However, by using the Service, you grant us a limited license to:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Store and display your saved content to provide the Service</li>
                            <li>Process content for AI features (if enabled)</li>
                            <li>Create cached copies (snapshots) for offline access</li>
                            <li>Download and store media files you request</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            This license is non-exclusive, royalty-free, and limited to the purposes of operating the Service.
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">5.3 Third-Party Content</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Content from social media platforms remains the property of the original creators and platforms. You must respect the intellectual property rights of content owners. We provide tools for personal archiving, but you should not redistribute saved content without permission.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">6. Third-Party Platforms and APIs</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            The Service interacts with third-party platforms (X/Twitter, Google, etc.). You must:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Comply with the Terms of Service of all third-party platforms</li>
                            <li>Not use our Service to violate any platform&apos;s policies</li>
                            <li>Understand that we are not responsible for third-party content or policies</li>
                            <li>Acknowledge that third-party API changes may affect Service functionality</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            We are not affiliated with, endorsed by, or sponsored by X/Twitter, Google, or any other third-party platform.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">7. AI Features</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            The Service includes optional AI-powered features:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Tweet summarization using third-party AI services</li>
                            <li>Custom AI prompts that you can configure</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            <strong>You understand that:</strong>
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>AI-generated content may not always be accurate</li>
                            <li>You can disable AI features in settings at any time</li>
                            <li>Your content is sent to third-party AI providers when using these features</li>
                            <li>We are not responsible for AI-generated content quality or accuracy</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">8. Video Downloads</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Our Service allows downloading videos from social media platforms. You agree to:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Only download videos you have the right to access</li>
                            <li>Respect copyright and intellectual property rights</li>
                            <li>Not redistribute downloaded content without permission</li>
                            <li>Understand that download availability depends on video platform policies</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            We use the yt-dlp tool for video downloading. Videos are stored in your personal storage quota.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">9. Disclaimer of Warranties</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>MERCHANTABILITY</li>
                            <li>FITNESS FOR A PARTICULAR PURPOSE</li>
                            <li>NON-INFRINGEMENT</li>
                            <li>ACCURACY OF AI-GENERATED CONTENT</li>
                            <li>UNINTERRUPTED OR ERROR-FREE OPERATION</li>
                            <li>SECURITY OF DATA TRANSMISSION</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">10. Limitation of Liability</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            TO THE MAXIMUM EXTENT PERMITTED BY LAW, TIDYFEED SHALL NOT BE LIABLE FOR:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES</li>
                            <li>LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL</li>
                            <li>DAMAGES FROM SERVICE INTERRUPTION OR DATA LOSS</li>
                            <li>DAMAGES FROM THIRD-PARTY ACTIONS OR PLATFORM CHANGES</li>
                            <li>DAMAGES FROM AI-GENERATED CONTENT INACCURACIES</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            In no event shall our total liability exceed the amount you paid for the Service (if any) in the 12 months preceding the claim.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">11. Indemnification</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            You agree to indemnify and hold harmless TidyFeed and its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Your use of the Service</li>
                            <li>Your violation of these Terms</li>
                            <li>Your violation of third-party rights or laws</li>
                            <li>Content you save or create using the Service</li>
                            <li>Your interactions with other users or third-party platforms</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">12. Service Availability and Modifications</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We reserve the right to:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Modify or discontinue the Service (or any part thereof) at any time</li>
                            <li>Modify storage quotas and pricing policies</li>
                            <li>Change or discontinue AI features</li>
                            <li>Update or discontinue bot services</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            We shall not be liable to you or any third party for any modification, suspension, or discontinuance of the Service.
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">12.1 Service Availability</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            While we strive for 99.9% uptime, we do not guarantee uninterrupted access. Scheduled maintenance may occur with advance notice when possible.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">13. Privacy and Data Protection</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">14. Changes to Terms</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We may update these Terms from time to time. We will notify users of material changes by:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Updating the &quot;Last updated&quot; date at the top of this page</li>
                            <li>Displaying a prominent notice in the dashboard</li>
                            <li>Sending an email notification for significant changes</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            Your continued use of the Service after such changes constitutes acceptance of the new Terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">15. Governing Law and Dispute Resolution</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            These Terms shall be governed by and construed in accordance with applicable laws. Any disputes arising under these Terms shall be resolved through good faith negotiation. If negotiation fails, disputes shall be resolved through binding arbitration in accordance with rules of the American Arbitration Association.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">16. General Provisions</h2>

                        <h3 className="text-lg font-medium mt-4 mb-2">16.1 Entire Agreement</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            These Terms constitute the entire agreement between you and TidyFeed regarding the Service.
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">16.2 Waiver</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Our failure to enforce any right or provision of these Terms will not be deemed a waiver of such right or provision.
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">16.3 Severability</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            If any provision of these Terms is found to be unenforceable, the remaining provisions will remain in full force and effect.
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">16.4 Assignment</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            You may not assign these Terms without our prior written consent. We may assign these Terms freely.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">17. Feedback and Suggestions</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Any feedback, comments, or suggestions you provide about the Service are voluntary and become our property. We are free to use such feedback without obligation to compensate you.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">18. Contact Us</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            If you have any questions about these Terms of Service, please contact us at:
                        </p>
                        <p className="text-muted-foreground mt-2">
                            <strong>Email:</strong> support@tidyfeed.app
                        </p>
                        <p className="text-muted-foreground mt-2">
                            <strong>Website:</strong> <a href="https://tidyfeed.app" className="text-blue-600 hover:underline" target="_blank" rel="noopener">https://tidyfeed.app</a>
                        </p>
                        <p className="text-muted-foreground mt-2">
                            <strong>Documentation:</strong> Available at <a href="https://docs.tidyfeed.app" className="text-blue-600 hover:underline" target="_blank" rel="noopener">https://docs.tidyfeed.app</a>
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
