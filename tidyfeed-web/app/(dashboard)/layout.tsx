import { Sidebar } from "@/components/sidebar"
import { Header } from "@/components/header"

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="flex h-screen overflow-hidden bg-background">
            <Sidebar />
            <div className="flex flex-col flex-1 overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto p-6">
                    <div className="max-w-7xl mx-auto h-full space-y-4">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
