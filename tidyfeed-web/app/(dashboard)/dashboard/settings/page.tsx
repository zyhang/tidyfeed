import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { SettingsPageClient } from './settings-page-client'

export default function SettingsPage() {
    return (
        <Suspense
            fallback={
                <div className="flex h-[50vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            }
        >
            <SettingsPageClient />
        </Suspense>
    )
}
