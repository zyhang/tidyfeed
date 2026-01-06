import { cn } from '@/lib/utils'
import { ReactNode } from 'react'
import { Switch } from '@/components/ui/switch'

interface SettingItemProps {
    label: string
    description?: string
    control: ReactNode
    className?: string
    disabled?: boolean
}

export function SettingItem({
    label,
    description,
    control,
    className,
    disabled,
}: SettingItemProps) {
    return (
        <div
            className={cn(
                'flex items-start justify-between gap-4 py-4',
                disabled && 'opacity-50 pointer-events-none',
                className
            )}
        >
            <div className="space-y-0.5 flex-1">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {label}
                </label>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1">{description}</p>
                )}
            </div>
            <div className="flex-shrink-0">{control}</div>
        </div>
    )
}

interface ToggleSettingProps {
    label: string
    description?: string
    checked: boolean
    onCheckedChange: (checked: boolean) => void
    disabled?: boolean
    className?: string
}

export function ToggleSetting({
    label,
    description,
    checked,
    onCheckedChange,
    disabled,
    className,
}: ToggleSettingProps) {
    return (
        <SettingItem
            label={label}
            description={description}
            control={<Switch checked={checked} onCheckedChange={onCheckedChange} disabled={disabled} />}
            disabled={disabled}
            className={className}
        />
    )
}
