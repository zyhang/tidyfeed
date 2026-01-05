
'use client'

import { useRouter } from 'next/navigation'
import { XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function CheckoutCancelPage() {
    const router = useRouter()

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
            <div className="mb-6 rounded-full bg-red-100 p-3 text-red-600 dark:bg-red-900/20">
                <XCircle className="h-12 w-12" />
            </div>
            <h1 className="mb-2 text-2xl font-bold">Payment Cancelled</h1>
            <p className="mb-8 text-muted-foreground max-w-md">
                The checkout process was cancelled. No charges were made to your account.
            </p>

            <Button onClick={() => router.push('/dashboard/settings')}>
                Return to Settings
            </Button>
        </div>
    )
}
