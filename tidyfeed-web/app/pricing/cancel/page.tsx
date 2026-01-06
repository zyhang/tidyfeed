'use client'

import { Suspense } from 'react'
import { useRouter } from 'next/navigation'
import { XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function CheckoutCancelContent() {
    const router = useRouter()

    return (
        <div className="min-h-[60vh] flex items-center justify-center p-4">
            <Card className="w-full max-w-md text-center">
                <CardHeader>
                    <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/20">
                        <XCircle className="h-8 w-8 text-orange-600 dark:text-orange-400" />
                    </div>
                    <CardTitle className="text-2xl">Payment Cancelled</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-muted-foreground">
                        You cancelled the payment process. No charges were made.
                    </p>
                    <p className="text-sm text-muted-foreground">
                        You can upgrade anytime from the dashboard or pricing page.
                    </p>
                    <div className="flex gap-2 justify-center">
                        <Button onClick={() => router.push('/dashboard')}>
                            Go to Dashboard
                        </Button>
                        <Button variant="outline" onClick={() => router.push('/pricing')}>
                            Try Again
                        </Button>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

export default function CheckoutCancelPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[60vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            }
        >
            <CheckoutCancelContent />
        </Suspense>
    )
}
