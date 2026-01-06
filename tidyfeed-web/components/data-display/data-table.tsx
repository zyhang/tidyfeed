import { cn } from '@/lib/utils'
import { ReactNode, useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

export type SortDirection = 'asc' | 'desc' | null

export interface Column<T> {
    id: string
    header: string
    cell: (item: T) => ReactNode
    sortable?: boolean
    className?: string
}

interface DataTableProps<T> {
    columns: Column<T>[]
    data: T[]
    keyField: string
    className?: string
    emptyMessage?: string
    emptyDescription?: string
}

export function DataTable<T>({
    columns,
    data,
    keyField,
    className,
    emptyMessage = 'No data found',
    emptyDescription,
}: DataTableProps<T>) {
    const [sortColumn, setSortColumn] = useState<string | null>(null)
    const [sortDirection, setSortDirection] = useState<SortDirection>(null)

    const handleSort = (columnId: string) => {
        const column = columns.find((c) => c.id === columnId)
        if (!column?.sortable) return

        if (sortColumn === columnId) {
            if (sortDirection === 'asc') {
                setSortDirection('desc')
            } else if (sortDirection === 'desc') {
                setSortDirection(null)
                setSortColumn(null)
            }
        } else {
            setSortColumn(columnId)
            setSortDirection('asc')
        }
    }

    const sortedData = [...data].sort((a, b) => {
        if (!sortColumn || !sortDirection) return 0

        const column = columns.find((c) => c.id === sortColumn)
        if (!column) return 0

        const aVal = column.cell(a)?.toString() ?? ''
        const bVal = column.cell(b)?.toString() ?? ''

        if (sortDirection === 'asc') {
            return aVal.localeCompare(bVal)
        }
        return bVal.localeCompare(aVal)
    })

    if (data.length === 0) {
        return (
            <div className={cn('rounded-lg border bg-card', className)}>
                <div className="flex flex-col items-center justify-center py-12 text-center">
                    <p className="font-medium">{emptyMessage}</p>
                    {emptyDescription && (
                        <p className="text-sm text-muted-foreground mt-1">{emptyDescription}</p>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className={cn('rounded-lg border bg-card overflow-hidden', className)}>
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="border-b bg-muted/50">
                            {columns.map((column) => (
                                <th
                                    key={column.id}
                                    className={cn(
                                        'px-6 py-3 text-left text-xs font-medium uppercase text-muted-foreground',
                                        column.sortable && 'cursor-pointer hover:bg-muted transition-colors select-none',
                                        column.className
                                    )}
                                    onClick={() => column.sortable && handleSort(column.id)}
                                >
                                    <div className="flex items-center gap-1">
                                        {column.header}
                                        {column.sortable && sortColumn === column.id && (
                                            <span className="text-foreground">
                                                {sortDirection === 'asc' ? (
                                                    <ChevronUp className="h-3 w-3" />
                                                ) : (
                                                    <ChevronDown className="h-3 w-3" />
                                                )}
                                            </span>
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y">
                        {sortedData.map((item, index) => (
                            <tr
                                key={(item as any)[keyField] ?? index}
                                className="hover:bg-muted/50 transition-colors"
                            >
                                {columns.map((column) => (
                                    <td
                                        key={column.id}
                                        className={cn('px-6 py-4 text-sm', column.className)}
                                    >
                                        {column.cell(item)}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
