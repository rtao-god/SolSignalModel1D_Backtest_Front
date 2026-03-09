import { ReactNode, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text } from '@/shared/ui'
import TableExportButton from '@/shared/ui/TableExportButton/ui/TableExportButton'
import classNames from '@/shared/lib/helpers/classNames'
import { localizeReportCellValue } from '@/shared/utils/reportCellLocalization'
import cls from './ReportTableCard.module.scss'
import {
    SortableTable,
    type TableRow,
    getCellValue,
    toExportCell,
    tryParseNumberFromString
} from '@/shared/ui/SortableTable'

interface ReportTableCardProps {
    title: string
    description?: string
    columns: string[]
    rows: TableRow[]
    domId: string
    className?: string
    renderColumnTitle?: (title: string, colIdx: number) => ReactNode
}
const PROFIT_COLUMN_PRIORITY: RegExp[] = [
    /totalpnl%|total%|netreturnpct|netreturn%|pnl%|return%/i,
    /netpnlusd|total\$|pnl\$|profit|pnl/i
]
function resolveProfitColumnIndex(columns: string[]): number | null {
    for (const re of PROFIT_COLUMN_PRIORITY) {
        const idx = columns.findIndex(col => re.test(col))
        if (idx >= 0) {
            return idx
        }
    }
    return null
}
function parseNumericCell(value: unknown): number | null {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null
    }
    if (typeof value === 'string') {
        return tryParseNumberFromString(value)
    }
    return null
}

export default function ReportTableCard({
    title,
    description,
    columns,
    rows,
    domId,
    className,
    renderColumnTitle
}: ReportTableCardProps) {
    const { i18n } = useTranslation()
    const [sortedRows, setSortedRows] = useState<TableRow[]>([])
    const localizedRows = useMemo(() => {
        const stopReasonIdx = columns.indexOf('StopReason')
        if (stopReasonIdx < 0 || !rows || rows.length === 0) {
            return rows
        }

        let hasLocalizedRows = false
        const nextRows = rows.map(row => {
            if (!Array.isArray(row) || row.length <= stopReasonIdx) {
                return row
            }

            const rawValue = row[stopReasonIdx]
            if (typeof rawValue !== 'string' || !rawValue.trim()) {
                return row
            }

            const localizedValue = localizeReportCellValue('StopReason', rawValue, i18n.language)
            if (localizedValue === rawValue) {
                return row
            }

            hasLocalizedRows = true
            const nextRow = [...row]
            nextRow[stopReasonIdx] = localizedValue
            return nextRow
        })

        return hasLocalizedRows ? nextRows : rows
    }, [columns, rows, i18n.language])

    useEffect(() => {
        setSortedRows(localizedRows ?? [])
    }, [localizedRows])

    const profitColIdx = useMemo(() => resolveProfitColumnIndex(columns), [columns])

    const exportColumns = columns

    const rowsForExport = sortedRows.length > 0 ? sortedRows : localizedRows

    const exportRows = useMemo(
        () =>
            (rowsForExport ?? []).map(row => exportColumns.map((_, colIdx) => toExportCell(getCellValue(row, colIdx)))),
        [rowsForExport, exportColumns]
    )

    const getRowClassName = (row: TableRow): string | undefined => {
        if (profitColIdx === null) {
            return undefined
        }
        const raw = getCellValue(row, profitColIdx)
        const num = parseNumericCell(raw)
        if (num === null) {
            return undefined
        }
        if (num > 0) return cls.rowPositive
        if (num < 0) return cls.rowNegative
        return undefined
    }

    const getCellClassName = (value: unknown): string | undefined => {
        const num = parseNumericCell(value)
        if (num === null) {
            return undefined
        }
        if (num > 0) return cls.cellPositive
        if (num < 0) return cls.cellNegative
        return undefined
    }

    return (
        <section id={domId} className={classNames(cls.card, {}, [className ?? ''])}>
            <header className={cls.cardHeader}>
                <div>
                    <Text type='h3' className={cls.cardTitle}>
                        {title}
                    </Text>
                    {description && <Text className={cls.cardSubtitle}>{description}</Text>}
                </div>

                <TableExportButton
                    columns={exportColumns}
                    rows={exportRows}
                    fileBaseName={title || domId}
                    defaultFormat='pdf'
                />
            </header>

            <SortableTable
                columns={columns}
                rows={localizedRows}
                storageKey={`report.sort.${domId}`}
                getRowClassName={getRowClassName}
                getCellClassName={getCellClassName}
                onSortedRowsChange={setSortedRows}
                renderColumnTitle={renderColumnTitle}
            />
        </section>
    )
}
