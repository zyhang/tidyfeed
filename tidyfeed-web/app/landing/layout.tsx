import type { Metadata } from "next"

export const metadata: Metadata = {
    title: "TidyFeed - Your Social Feed, Finally Under Control",
    description: "TidyFeed is a free Chrome extension that removes ads, filters noise with AI, and lets you save what matters from X/Twitter. Take back your social media experience.",
    keywords: ["Chrome extension", "Twitter", "X", "ad blocker", "social media filter", "content saver"],
    authors: [{ name: "TidyFeed" }],
    openGraph: {
        title: "TidyFeed - Your Social Feed, Finally Under Control",
        description: "Remove ads, filter noise with AI, and save what matters. Free Chrome extension for X/Twitter.",
        type: "website",
        siteName: "TidyFeed",
    },
    twitter: {
        card: "summary_large_image",
        title: "TidyFeed - Your Social Feed, Finally Under Control",
        description: "Remove ads, filter noise with AI, and save what matters. Free Chrome extension for X/Twitter.",
    },
    robots: {
        index: true,
        follow: true,
    },
}

export default function LandingLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return children
}
