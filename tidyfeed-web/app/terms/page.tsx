import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export const metadata = {
    title: "Terms of Service - TidyFeed",
    description: "Terms of Service for TidyFeed Chrome Extension and Services",
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
                <p className="text-muted-foreground mb-8">Last updated: December 29, 2025</p>

                {/* Content */}
                <div className="prose prose-zinc dark:prose-invert max-w-none space-y-8">
                    <section>
                        <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            By accessing or using TidyFeed (&quot;Service&quot;), including our Chrome Extension, web dashboard, and related services, you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use our Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            TidyFeed is a browser extension and web platform that helps users:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Filter and manage social media content</li>
                            <li>Block unwanted advertisements and promotional content</li>
                            <li>Save and organize valuable posts for later reference</li>
                            <li>Download media content from supported platforms</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>

                        <h3 className="text-lg font-medium mt-4 mb-2">3.1 Account Creation</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            To access certain features, you may create an account using Google Sign-In. You are responsible for maintaining the confidentiality of your account and for all activities that occur under your account.
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">3.2 Account Requirements</h3>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                            <li>You must be at least 13 years old to use the Service</li>
                            <li>You must provide accurate and complete information</li>
                            <li>You are responsible for all activity on your account</li>
                        </ul>

                        <h3 className="text-lg font-medium mt-4 mb-2">3.3 Account Termination</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            We reserve the right to suspend or terminate your account if you violate these Terms or engage in fraudulent or abusive behavior.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">4. Acceptable Use</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            You agree NOT to:
                        </p>
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                            <li>Use the Service for any illegal purpose</li>
                            <li>Attempt to reverse engineer or modify the Service</li>
                            <li>Interfere with or disrupt the Service or servers</li>
                            <li>Use automated systems to access the Service in a manner that exceeds reasonable use</li>
                            <li>Impersonate others or provide false information</li>
                            <li>Use the Service to harass, abuse, or harm others</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">5. Intellectual Property</h2>

                        <h3 className="text-lg font-medium mt-4 mb-2">5.1 Our Content</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            The Service, including its design, features, and content, is owned by TidyFeed and is protected by copyright, trademark, and other intellectual property laws.
                        </p>

                        <h3 className="text-lg font-medium mt-4 mb-2">5.2 Your Content</h3>
                        <p className="text-muted-foreground leading-relaxed">
                            You retain ownership of any content you save or upload. By using the Service, you grant us a limited license to store and display your saved content solely to provide the Service to you.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">6. Third-Party Platforms</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            The Service interacts with third-party platforms (such as X/Twitter). You must comply with the terms of service of any third-party platform you access through our Service. We are not responsible for the content or policies of third-party platforms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">7. Disclaimer of Warranties</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                        </p>
                        <p className="text-muted-foreground leading-relaxed mt-2">
                            We do not warrant that the Service will be uninterrupted, error-free, or completely secure.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">8. Limitation of Liability</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            TO THE MAXIMUM EXTENT PERMITTED BY LAW, TIDYFEED SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR ANY LOSS OF PROFITS OR REVENUES, WHETHER INCURRED DIRECTLY OR INDIRECTLY, OR ANY LOSS OF DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">9. Indemnification</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            You agree to indemnify and hold harmless TidyFeed and its officers, directors, employees, and agents from any claims, damages, losses, or expenses arising from your use of the Service or your violation of these Terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">10. Modifications to Service</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We reserve the right to modify or discontinue the Service (or any part thereof) at any time, with or without notice. We shall not be liable to you or any third party for any modification, suspension, or discontinuance of the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">11. Changes to Terms</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            We may update these Terms from time to time. We will notify users of any material changes by updating the &quot;Last updated&quot; date at the top of this page. Your continued use of the Service after such changes constitutes acceptance of the new Terms.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">12. Governing Law</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            These Terms shall be governed by and construed in accordance with the laws of the jurisdiction in which TidyFeed operates, without regard to its conflict of law provisions.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold mb-3">13. Contact Us</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            If you have any questions about these Terms of Service, please contact us at:
                        </p>
                        <p className="text-muted-foreground mt-2">
                            <strong>Email:</strong> support@tidyfeed.app
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
