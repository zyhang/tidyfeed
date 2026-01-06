'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function CheckoutSuccessContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const sessionId = searchParams.get('session_id')
    const [countdown, setCountdown] = useState(5)

    useEffect(() => {
        if (!sessionId) {
            // router.push('/dashboard/settings')
        }

        const timer = setInterval(() => {
            setCountdown((prev) => {
                if (prev <= 1) {
                    clearInterval(timer)
                    router.push('/dashboard/settings')
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [router, sessionId])

    return (
        <div className="flex min-h-[60vh] flex-col items-center justify-center p-4 text-center">
            <div className="mb-6 rounded-full bg-green-100 p-3 text-green-600 dark:bg-green-900/20">
                <CheckCircle2 className="h-12 w-12" />
            </div>
            <h1 className="mb-2 text-2xl font-bold">Payment Successful!</h1>
            <p className="mb-8 text-muted-foreground max-w-md">
                Thank you for upgrading your plan. Your account has been updated with the new features.
            </p>

            <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                    Redirecting to settings in {countdown}s...
                </p>
                <Button onClick={() => router.push('/dashboard/settings')}>
                    Return to Settings
                </Button>
            </div>
        </div>
    )
}
