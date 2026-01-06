import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { CheckoutSuccessContent } from './success-content'

export default function CheckoutSuccessPage() {
    return (
        <Suspense
            fallback={
                <div className="flex min-h-[60vh] items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            }
        >
            <CheckoutSuccessContent />
        </Suspense>
    )
}
