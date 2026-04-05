import { CSSProperties, memo, ReactNode, useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Text } from '@/shared/ui/Text'
import { renderTermTooltipRichText } from '@/shared/ui/TermTooltip'
import TableExportButton from '@/shared/ui/TableExportButton/ui/TableExportButton'
import classNames from '@/shared/lib/helpers/classNames'
import { localizeReportCellValue } from '@/shared/utils/reportCellLocalization'
import type { PolicyEvaluationDto } from '@/shared/types/policyEvaluation.types'
import cls from './ReportTableCard.module.scss'
import {
    SortableTable,
    type TableDensity,
    type TableRow,
    type TableSortComparator,
    type TableSortValueResolver,
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
    tableDensity?: TableDensity
    virtualizeRows?: boolean
    tableMaxHeight?: CSSProperties['maxHeight']
    renderColumnTitle?: (title: string, colIdx: number) => ReactNode
    rowEvaluations?: Array<PolicyEvaluationDto | null>
    rowEvaluationMap?: Record<string, PolicyEvaluationDto>
    getRowKey?: (row: TableRow, rowIndex: number) => string | null
    renderCellOverride?: (value: unknown, rowIndex: number, colIdx: number, columnTitle: string) => ReactNode | null
    getSortValueOverride?: (value: unknown, rowIndex: number, colIdx: number, columnTitle: string) => unknown
    getSortComparatorOverride?: (
        left: { value: unknown; row: TableRow; rowIndex: number },
        right: { value: unknown; row: TableRow; rowIndex: number },
        colIdx: number,
        columnTitle: string
    ) => number | null | undefined
}
const EMPTY_TABLE_ROWS: TableRow[] = []
function parseNumericCell(value: unknown): number | null {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null
    }
    if (typeof value === 'string') {
        return tryParseNumberFromString(value)
    }
    return null
}

function resolveEvaluationRowClass(evaluation: PolicyEvaluationDto | undefined): string | undefined {
    if (!evaluation) {
        return undefined
    }

    if (evaluation.status === 'good') return cls.rowGood
    if (evaluation.status === 'caution') return cls.rowCaution
    if (evaluation.status === 'bad') return cls.rowBad
    if (evaluation.status === 'unknown') return cls.rowUnknown

    return undefined
}

function resolveEvaluationRowTitle(evaluation: PolicyEvaluationDto | undefined): string | undefined {
    if (!evaluation) {
        return undefined
    }

    const reasons = evaluation.reasons?.map(reason => reason.message).filter(Boolean) ?? []
    if (reasons.length === 0) {
        return evaluation.status
    }

    return `${evaluation.status}: ${reasons.join(' | ')}`
}

function shouldRenderTermRichText(value: string): boolean {
    return value.includes('[[') || /EOD|EndOfDay/i.test(value)
}

function resolveExplicitEvaluation(
    row: TableRow,
    rowIndex: number,
    rowEvaluations: Array<PolicyEvaluationDto | null> | undefined,
    rowEvaluationMap: Record<string, PolicyEvaluationDto> | undefined,
    getRowKey: ((row: TableRow, rowIndex: number) => string | null) | undefined
): PolicyEvaluationDto | undefined {
    const directEvaluation = rowEvaluations?.[rowIndex] ?? undefined
    if (directEvaluation) {
        return directEvaluation
    }

    if (!rowEvaluationMap || !getRowKey) {
        return undefined
    }

    const rowKey = getRowKey(row, rowIndex)
    return rowKey ? rowEvaluationMap[rowKey] : undefined
}

function ReportTableCard({
    title,
    description,
    columns,
    rows,
    domId,
    className,
    tableDensity = 'dense',
    virtualizeRows = false,
    tableMaxHeight,
    renderColumnTitle,
    rowEvaluations,
    rowEvaluationMap,
    getRowKey,
    renderCellOverride,
    getSortValueOverride,
    getSortComparatorOverride
}: ReportTableCardProps) {
    const { i18n } = useTranslation()
    const sourceRows = rows ?? EMPTY_TABLE_ROWS
    const [sortedRows, setSortedRows] = useState<TableRow[]>(() => sourceRows)

    useEffect(() => {
        setSortedRows(prevRows => (prevRows === sourceRows ? prevRows : sourceRows))
    }, [sourceRows])

    const exportColumns = columns

    const rowsForExport = sortedRows.length > 0 ? sortedRows : sourceRows

    const exportRows = useMemo(
        () =>
            (rowsForExport ?? []).map(row => exportColumns.map((_, colIdx) => toExportCell(getCellValue(row, colIdx)))),
        [rowsForExport, exportColumns]
    )

    const renderLocalizedCell = useCallback(
        (value: unknown, rowIndex: number, colIdx: number) => {
            const columnTitle = columns[colIdx] ?? ''

            if (renderCellOverride) {
                const override = renderCellOverride(value, rowIndex, colIdx, columnTitle)
                if (override !== null && override !== undefined) {
                    return override
                }
            }

            if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
                return toExportCell(value) as any
            }

            const localizedValue = localizeReportCellValue(columnTitle, String(value), i18n.language)
            if (typeof localizedValue === 'string' && shouldRenderTermRichText(localizedValue)) {
                return renderTermTooltipRichText(localizedValue)
            }

            return localizedValue
        },
        [columns, i18n.language, renderCellOverride]
    )

    const getRowClassName = (row: TableRow, rowIndex: number): string | undefined => {
        const explicitEvaluation = resolveExplicitEvaluation(row, rowIndex, rowEvaluations, rowEvaluationMap, getRowKey)
        return resolveEvaluationRowClass(explicitEvaluation)
    }

    const getRowTitle = (row: TableRow, rowIndex: number): string | undefined => {
        const explicitEvaluation = resolveExplicitEvaluation(row, rowIndex, rowEvaluations, rowEvaluationMap, getRowKey)
        return resolveEvaluationRowTitle(explicitEvaluation)
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

    const resolveSortValue = useCallback<TableSortValueResolver>(
        (row, rowIndex, colIdx, value) => {
            if (!getSortValueOverride) {
                return value
            }

            const columnTitle = columns[colIdx] ?? ''
            const override = getSortValueOverride(value, rowIndex, colIdx, columnTitle)
            return override ?? value
        },
        [columns, getSortValueOverride]
    )

    const resolveSortComparator = useCallback<TableSortComparator>(
        (left, right) => {
            if (!getSortComparatorOverride) {
                return null
            }

            const columnTitle = columns[left.colIdx] ?? ''
            return getSortComparatorOverride(
                { value: left.value, row: left.row, rowIndex: left.rowIndex },
                { value: right.value, row: right.row, rowIndex: right.rowIndex },
                left.colIdx,
                columnTitle
            )
        },
        [columns, getSortComparatorOverride]
    )

    return (
        <section id={domId} className={classNames(cls.card, {}, [className ?? ''])}>
            <header className={cls.cardHeader}>
                <div>
                    <Text type='h3' className={cls.cardTitle}>
                        {title}
                    </Text>
                    {description && (
                        <Text className={cls.cardSubtitle}>
                            {
                                // Подписи таблиц должны уметь переиспользовать общий glossary,
                                // иначе page-level descriptions быстро расходятся по смыслу.
                                renderTermTooltipRichText(description)
                            }
                        </Text>
                    )}
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
                rows={sourceRows}
                density={tableDensity}
                virtualizeRows={virtualizeRows}
                maxBodyHeight={tableMaxHeight}
                storageKey={`report.sort.${domId}`}
                getRowClassName={getRowClassName}
                getRowTitle={getRowTitle}
                getCellClassName={getCellClassName}
                renderCell={renderLocalizedCell}
                getSortValue={resolveSortValue}
                getSortComparator={resolveSortComparator}
                onSortedRowsChange={setSortedRows}
                renderColumnTitle={renderColumnTitle}
            />
        </section>
    )
}

export default memo(ReportTableCard)
