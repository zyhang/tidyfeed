import { cn } from '@/lib/utils'
import { ReactNode } from 'react'
import { Label } from '@/components/ui/label'

interface FormFieldGroupProps {
    children: ReactNode
    className?: string
}

export function FormFieldGroup({ children, className }: FormFieldGroupProps) {
    return <div className={cn('space-y-4', className)}>{children}</div>
}

interface FormFieldProps {
    label: string
    required?: boolean
    description?: string
    error?: string
    children: ReactNode
    className?: string
    htmlFor?: string
}

export function FormField({
    label,
    required,
    description,
    error,
    children,
    className,
    htmlFor,
}: FormFieldProps) {
    const id = htmlFor ?? label.toLowerCase().replace(/\s+/g, '-')

    return (
        <div className={cn('space-y-2', className)}>
            <Label htmlFor={id} className="flex items-center gap-1">
                {label}
                {required && <span className="text-destructive">*</span>}
            </Label>
            {children}
            {description && !error && (
                <p className="text-xs text-muted-foreground">{description}</p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
        </div>
    )
}

interface FormRowProps {
    children: ReactNode
    className?: string
}

export function FormRow({ children, className }: FormRowProps) {
    return <div className={cn('grid grid-cols-1 sm:grid-cols-2 gap-4', className)}>{children}</div>
}
