import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { type ReactNode } from 'react'

interface FormActionsProps {
    onCancel?: () => void
    submitText?: string
    isSubmitting?: boolean
    align?: 'left' | 'right' | 'center'
    className?: string
    children?: ReactNode
}

export function FormActions({
    onCancel,
    submitText = 'Save',
    isSubmitting = false,
    align = 'right',
    className,
    children,
}: FormActionsProps) {
    const alignClasses = {
        left: 'justify-start',
        center: 'justify-center',
        right: 'justify-end',
    }

    return (
        <div className={cn('flex items-center gap-3 pt-4', alignClasses[align], className)}>
            {children || (
                <>
                    {onCancel && (
                        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
                            Cancel
                        </Button>
                    )}
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Saving...' : submitText}
                    </Button>
                </>
            )}
        </div>
    )
}
