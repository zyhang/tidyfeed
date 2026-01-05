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
                            By accessing or using TidyFeed (&quot;Service&quot;), including our browser extensions (Chrome, Firefox), web dashboard, and related services, you agree to be bound by these Terms of Service (&quot;Terms&quot;). If you do not agree to these terms, please do not use our Service.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            <strong>Important:</strong> These Terms apply to all users of the Service. By creating an account or using the Service, you acknowledge that you have read, understood, and agree to be bound by these Terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            TidyFeed is a personal productivity tool that provides:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Content filtering and management for X/Twitter (personal use only)</li>
                            <li>Advertisement and promotional content blocking</li>
                            <li>Bookmarking and organizing valuable posts for personal reference</li>
                            <li>Media downloading (images, videos) for personal use</li>
                            <li>Tweet snapshots with personal annotation tools</li>
                            <li>Optional AI-powered summarization (opt-in only)</li>
                            <li>Tag-based organization system</li>
                            <li>Optional Twitter bot for remote saving (@TidyFeedBot)</li>
                            <li>Optional social account linking for enhanced features</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            The Service is provided as a freemium service with storage limitations (currently 500MB for free accounts). <strong>Some features are optional and require your explicit consent to use.</strong>
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">3. User Accounts and Responsibilities</h2>

                        <h3 className="text-lg font-medium mt-4 mb-2">3.1 Account Creation</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            To access certain features, you must create an account using Google Sign-In. You are responsible for:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Maintaining the confidentiality of your account credentials</li>
                            <li>All activities that occur under your account</li>
                            <li>Notifying us immediately of any unauthorized use</li>
                            <li>Keeping your contact information up to date</li>
                        </ul>

                        <h3 className="text-lg font-medium mt-4 mb-2">3.2 Account Requirements</h3>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                            <li>You must be at least 13 years old to use the Service</li>
                            <li>You must provide accurate and complete information</li>
                            <li>You are responsible for compliance with applicable laws in your jurisdiction</li>
                            <li>You agree not to share your account with others</li>
                        </ul>

                        <h3 className="text-lg font-medium mt-4 mb-2">3.3 Storage Quotas</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Free accounts are limited to 500MB of storage. When you reach this limit:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>You will be notified when you approach your limit</li>
                            <li>You must delete existing content to save new items</li>
                            <li>We reserve the right to modify storage quotas at any time with 30 days notice</li>
                        </ul>

                        <h3 className="text-lg font-medium mt-4 mb-2">3.4 Account Termination</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            We reserve the right to suspend or terminate your account for:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Violation of these Terms</li>
                            <li>Fraudulent, abusive, or illegal behavior</li>
                            <li>Exceeding storage quotas for extended periods without action</li>
                            <li>Inactivity for more than 12 months</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            You may delete your account at any time through the dashboard. Upon deletion, all your data will be permanently removed within 30 days (except for backups).
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">4. Acceptable Use Policy</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            <strong>You agree NOT to:</strong>
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Use the Service for any illegal purpose</li>
                            <li>Reverse engineer, decompile, or disassemble the Service or its components</li>
                            <li>Interfere with or disrupt the Service, servers, or networks</li>
                            <li>Use automated systems to access the Service excessively (rate limiting applies)</li>
                            <li>Impersonate others or provide false information</li>
                            <li>Harass, abuse, or harm other users</li>
                            <li>Attempt to gain unauthorized access to accounts, systems, or networks</li>
                            <li>Use the Service to violate any third-party platform&apos;s Terms of Service</li>
                            <li>Remove or circumvent copyright or intellectual property notices</li>
                            <li>Use the Service to create spam, manipulate metrics, or engage in deceptive practices</li>
                        </ul>

                        <h3 className="text-lg font-medium mt-4 mb-2">4.1 Third-Platform Terms</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            <strong>Important Notice:</strong> You agree to comply with the Terms of Service of all third-party platforms you access through our Service (including X/Twitter). Some uses of saved content may violate those platforms&apos; policies. You are solely responsible for your use of the Service in compliance with all applicable terms.
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">4.2 Twitter Bot Usage (Optional)</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            If you choose to use @TidyFeedBot (optional feature):
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>You must first link your Twitter account (opt-in process)</li>
                            <li>Bot commands are processed as public mentions visible to others</li>
                            <li>You are responsible for all bot interactions from your account</li>
                            <li>Rate limits apply to prevent spam</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            <em>This feature is entirely optional. You can use all core features without ever using the bot.</em>
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">5. Intellectual Property Rights</h2>

                        <h3 className="text-lg font-medium mt-4 mb-2">5.1 Our Content</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            The Service, including its design, features, code, and content, is owned by TidyFeed and protected by copyright, trademark, and other intellectual property laws. All rights not expressly granted are reserved.
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">5.2 Your Content</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            <strong>You retain ownership</strong> of content you save or create. By using the Service, you grant us a limited, non-exclusive, royalty-free license to:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Store and display your saved content <strong>solely to provide the Service to you</strong></li>
                            <li>Process content for optional AI features (only if enabled by you)</li>
                            <li>Create cached copies (snapshots) for your offline access</li>
                            <li>Download and store media files you explicitly request</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            This license is <strong>limited to the purpose of providing the Service to you</strong>. We do not use your content for any other purpose.
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">5.3 Third-Party Content</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Content from social media platforms remains the property of the original creators and platforms. The Service provides tools for <strong>personal archiving and organization</strong>. You must:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Respect the intellectual property rights of content creators</li>
                            <li>Use saved content for personal reference only</li>
                            <li>Not redistribute saved content without permission from the original creator</li>
                            <li>Comply with all applicable copyright laws</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">6. Optional Features and User Consent</h2>

                        <h3 className="text-lg font-medium mt-4 mb-2">6.1 AI Features (Opt-In)</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            AI features (like tweet summarization) are <strong>disabled by default</strong>. If you choose to enable them:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Your content will be sent to third-party AI providers when you explicitly request it</li>
                            <li>AI-generated content may not always be accurate or complete</li>
                            <li>You can disable AI features at any time through settings</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            <strong>We are not responsible for AI-generated content quality or accuracy.</strong>
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">6.2 Video Downloads</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            When downloading videos, you agree that:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>You will only download videos you have the right to access</li>
                            <li>Downloads are for <strong>personal, non-commercial use only</strong></li>
                            <li>You respect copyright and intellectual property rights</li>
                            <li>You will not redistribute downloaded content without permission</li>
                            <li>Download availability depends on video platform policies (some videos may not be downloadable)</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            We use the yt-dlp tool for video downloading. Videos are stored in your personal storage quota.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">7. Third-Party Platforms and APIs</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            The Service interacts with third-party platforms (X/Twitter, Google, etc.). You must:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Comply with all Terms of Service of third-party platforms</li>
                            <li>Not use our Service to violate any platform&apos;s policies</li>
                            <li>Understand that we are not responsible for third-party content or policy changes</li>
                            <li>Acknowledge that third-party API changes may affect Service functionality</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            <strong>We are not affiliated with, endorsed by, or sponsored by X/Twitter, Google, or any other third-party platform.</strong>
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">8. Disclaimer of Warranties</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>MERCHANTABILITY OR FITNESS FOR A PARTICULAR PURPOSE</li>
                            <li>NON-INFRINGEMENT OF THIRD-PARTY RIGHTS</li>
                            <li>ACCURACY OR RELIABILITY OF AI-GENERATED CONTENT</li>
                            <li>UNINTERRUPTED OR ERROR-FREE OPERATION</li>
                            <li>SECURITY OF DATA TRANSMISSION</li>
                            <li>AVAILABILITY OF THIRD-PARTY APIS OR SERVICES</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            <strong>No advice or information, whether oral or written, obtained by you from us or through the Service will create any warranty not expressly stated in these Terms.</strong>
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">9. Limitation of Liability</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, TIDYFEED SHALL NOT BE LIABLE FOR:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES</li>
                            <li>LOSS OF PROFITS, REVENUE, DATA, OR GOODWILL</li>
                            <li>DAMAGES FROM SERVICE INTERRUPTION OR DATA LOSS</li>
                            <li>DAMAGES FROM THIRD-PARTY ACTIONS, PLATFORM CHANGES, OR API DISCONTINUATION</li>
                            <li>DAMAGES FROM AI-GENERATED CONTENT INACCURACIES OR ERRORS</li>
                            <li>DAMAGES FROM VIDEO DOWNLOAD FAILURES OR CORRUPTION</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            In no event shall our total liability exceed the amount you paid for the Service (if any) in the 12 months preceding the claim, or $100 if you have not paid anything.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            Some jurisdictions do not allow the exclusion of certain warranties or the limitation of liability for consequential damages, so the above limitations may not fully apply to you.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">10. Indemnification</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            You agree to indemnify and hold harmless TidyFeed and its officers, directors, employees, agents, and affiliates from any claims, damages, losses, or expenses (including reasonable attorneys&apos; fees) arising from:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Your use or misuse of the Service</li>
                            <li>Your violation of these Terms or any law or regulation</li>
                            <li>Your violation of third-party rights (including intellectual property rights)</li>
                            <li>Content you save or create using the Service</li>
                            <li>Your interactions with other users or third-party platforms</li>
                            <li>Your use of optional features (AI, bot, video downloads)</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">11. Service Availability and Modifications</h2>

                        <h3 className="text-lg font-medium mt-4 mb-2">11.1 Service Changes</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            We reserve the right to:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Modify or discontinue the Service (or any part thereof) at any time with or without notice</li>
                            <li>Modify storage quotas and pricing policies with 30 days notice</li>
                            <li>Change or discontinue optional features (AI, bot, etc.) at any time</li>
                            <li>Update or discontinue integrations with third-party platforms</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            We shall not be liable to you or any third party for any modification, suspension, or discontinuance of the Service.
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">11.2 Service Availability</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            While we strive for high availability, we do not guarantee:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Uninterrupted or error-free operation</li>
                            <li>That defects will be corrected</li>
                            <li>The Service will meet your specific requirements</li>
                            <li>That third-party APIs will remain available</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            Scheduled maintenance may occur with advance notice when possible. Emergency maintenance may occur without notice.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">12. Privacy and Data Protection</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Your privacy is important to us. Please review our <a href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</a>, which also governs your use of the Service, to understand:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>What data we collect and why</li>
                            <li>How we protect your data</li>
                            <li>Your rights to access, delete, or export your data</li>
                            <li>Our use of cookies and browser storage</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">13. Changes to Terms</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We may update these Terms from time to time to reflect changes in our Service, legal requirements, or business practices. We will notify you of material changes by:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Updating the &quot;Last updated&quot; date at the top of this page</li>
                            <li>Displaying a prominent notice in the dashboard for at least 30 days</li>
                            <li>Sending an email notification for significant changes</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            Your continued use of the Service after such changes constitutes acceptance of the new Terms. If you do not agree to the updated Terms, you must discontinue using the Service and delete your account.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">14. Dispute Resolution and Governing Law</h2>

                        <h3 className="text-lg font-medium mt-4 mb-2">14.1 Governing Law</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which TidyFeed operates, without regard to its conflict of law provisions.
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">14.2 Dispute Resolution</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Any disputes arising under these Terms should first be resolved through good faith negotiation between us. If negotiation fails:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>We agree to attempt to resolve the dispute through informal negotiation</li>
                            <li>If negotiation fails, either party may pursue binding arbitration</li>
                            <li>Arbitration will be conducted in accordance with rules of the American Arbitration Association</li>
                        </ul>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            <strong>Opt-Out Right:</strong> You may opt-out of this arbitration clause by sending written notice to support@tidyfeed.app within 30 days of your first use of the Service. If you opt-out, both parties agree to resolve disputes in court.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            <strong>Note:</strong> Some jurisdictions do not allow limitations on implied warranties or the exclusion of certain damages, so the above limitations may not fully apply to you.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">15. General Provisions</h2>

                        <h3 className="text-lg font-medium mt-4 mb-2">15.1 Entire Agreement</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            These Terms constitute the entire agreement between you and TidyFeed regarding the Service, superseding any prior agreements.
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">15.2 Waiver and Severability</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            Our failure to enforce any right or provision of these Terms will not be deemed a waiver of such right. If any provision is found to be unenforceable, the remaining provisions will remain in full force and effect.
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">15.3 Assignment</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            You may not assign these Terms without our prior written consent. We may freely assign these Terms in connection with a merger, acquisition, or sale of assets.
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">15.4 Force Majeure</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            We are not liable for any failure or delay in performance due to causes beyond our reasonable control, including but not limited to: acts of God, war, strikes, third-party service interruptions, or internet infrastructure failures.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">16. Feedback and Suggestions</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            Any feedback, comments, or suggestions you provide about the Service are voluntary and become our property. We are free to use such feedback without obligation to compensate you.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">17. Contact Information</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            If you have questions about these Terms of Service, please contact us:
                        </p>
                        <p className="text-muted-foreground mt-2">
                            <strong>Support Email:</strong> support@tidyfeed.app
                        </p>
                        <p className="text-muted-foreground mt-2">
                            <strong>Website:</strong> <a href="https://tidyfeed.app" className="text-blue-600 hover:underline" target="_blank" rel="noopener">https://tidyfeed.app</a>
                        </p>
                        <p className="text-muted-foreground mt-2">
                            <strong>Documentation:</strong> <a href="https://docs.tidyfeed.app" className="text-blue-600 hover:underline" target="_blank" rel="noopener">https://docs.tidyfeed.app</a>
                        </p>
                        <p className="text-muted-foreground mt-2">
                            <strong>Business Address:</strong> Available upon request
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
