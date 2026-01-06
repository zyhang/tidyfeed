import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { CheckoutCancelContent } from './cancel-content'

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
