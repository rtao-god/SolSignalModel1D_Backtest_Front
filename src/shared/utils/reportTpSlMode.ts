import type { TableSectionDto } from '@/shared/types/report.types'
import { normalizePolicyBranchMegaTitle, type PolicyBranchMegaTpSlMode } from '@/shared/utils/policyBranchMegaTabs'

const TP_SL_SPLIT_REQUIRED_COLUMNS = [
    'Policy',
    'Branch',
    'Days',
    'Tr',
    'TotalPnl%',
    'DynTP/SL Days',
    'DynTP/SL Tr',
    'DynTP/SL PnL%',
    'StatTP/SL Days',
    'StatTP/SL Tr',
    'StatTP/SL PnL%'
]

interface TpSlColumnIndexes {
    policyIdx: number
    branchIdx: number
    daysIdx: number
    tradesIdx: number
    totalPnlIdx: number
    dynDaysIdx: number
    dynTradesIdx: number
    dynPnlIdx: number
    statDaysIdx: number
    statTradesIdx: number
    statPnlIdx: number
}

function parseNonNegativeIntOrThrow(raw: string | undefined, label: string, contextTag: string): number {
    const value = Number(raw)
    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
        throw new Error(`[${contextTag}] ${label} must be a non-negative integer. value=${raw}`)
    }

    return value
}

function resolveTpSlGroupKey(title: string | undefined): string {
    const normalized = normalizePolicyBranchMegaTitle(title)
    return normalized.replace(/\[PART\s+\d+\/3\]/i, '').trim()
}

function resolvePart1Indexes(columns: string[]): TpSlColumnIndexes | null {
    const hasAllColumns = TP_SL_SPLIT_REQUIRED_COLUMNS.every(column => columns.includes(column))
    if (!hasAllColumns) {
        return null
    }

    return {
        policyIdx: columns.indexOf('Policy'),
        branchIdx: columns.indexOf('Branch'),
        daysIdx: columns.indexOf('Days'),
        tradesIdx: columns.indexOf('Tr'),
        totalPnlIdx: columns.indexOf('TotalPnl%'),
        dynDaysIdx: columns.indexOf('DynTP/SL Days'),
        dynTradesIdx: columns.indexOf('DynTP/SL Tr'),
        dynPnlIdx: columns.indexOf('DynTP/SL PnL%'),
        statDaysIdx: columns.indexOf('StatTP/SL Days'),
        statTradesIdx: columns.indexOf('StatTP/SL Tr'),
        statPnlIdx: columns.indexOf('StatTP/SL PnL%')
    }
}

function buildPolicyBranchKeyOrThrow(
    row: string[],
    policyIdx: number,
    branchIdx: number,
    contextTag: string,
    sectionTitle: string,
    rowIndex: number
): string {
    const policy = row[policyIdx]?.trim()
    const branch = row[branchIdx]?.trim()
    if (!policy || !branch) {
        throw new Error(
            `[${contextTag}] row has empty Policy/Branch. section=${sectionTitle}, row=${rowIndex}.`
        )
    }

    return `${policy}::${branch}`
}

function ensureRowShapeOrThrow(row: string[] | undefined, requiredIdx: number, contextTag: string, sectionTitle: string, rowIndex: number) {
    if (!row || row.length <= requiredIdx) {
        throw new Error(
            `[${contextTag}] malformed row for TP/SL mode. section=${sectionTitle}, row=${rowIndex}.`
        )
    }
}

/**
 * Применяет TP/SL-срез к таблицам отчёта.
 * Для PART 1 переставляет Days/Tr/TotalPnl% на dynamic/static слой и
 * оставляет только строки с >0 сделок в выбранном слое.
 * Для PART 2/3 дополнительно отфильтровывает строки по Policy+Branch,
 * чтобы разрез оставался согласован между всеми секциями группы.
 */
export function applyReportTpSlModeToSectionsOrThrow(
    sections: TableSectionDto[],
    mode: PolicyBranchMegaTpSlMode,
    contextTag: string
): TableSectionDto[] {
    if (mode === 'all') return sections
    if (!sections || sections.length === 0) {
        throw new Error(`[${contextTag}] no sections to apply TP/SL mode.`)
    }

    const selectedRowsByGroup = new Map<string, string[][]>()
    const selectedKeysByGroup = new Map<string, Set<string>>()

    for (const section of sections) {
        const sectionTitle = section.title ?? 'n/a'
        const columns = section.columns ?? []
        const rows = section.rows ?? []

        const indexes = resolvePart1Indexes(columns)
        if (!indexes) {
            continue
        }

        const selectedTradesIdx = mode === 'dynamic' ? indexes.dynTradesIdx : indexes.statTradesIdx
        const selectedDaysIdx = mode === 'dynamic' ? indexes.dynDaysIdx : indexes.statDaysIdx
        const selectedPnlIdx = mode === 'dynamic' ? indexes.dynPnlIdx : indexes.statPnlIdx

        const selectedRows: string[][] = []
        const selectedKeys = new Set<string>()

        for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
            const row = rows[rowIndex]
            const requiredIdx = Math.max(
                indexes.policyIdx,
                indexes.branchIdx,
                indexes.daysIdx,
                indexes.tradesIdx,
                indexes.totalPnlIdx,
                selectedTradesIdx,
                selectedDaysIdx,
                selectedPnlIdx
            )
            ensureRowShapeOrThrow(row, requiredIdx, contextTag, sectionTitle, rowIndex)

            const selectedTrades = parseNonNegativeIntOrThrow(row[selectedTradesIdx], `${mode}.trades`, contextTag)
            if (selectedTrades <= 0) {
                continue
            }

            const nextRow = [...row]
            nextRow[indexes.daysIdx] = row[selectedDaysIdx] ?? ''
            nextRow[indexes.tradesIdx] = row[selectedTradesIdx] ?? ''
            nextRow[indexes.totalPnlIdx] = row[selectedPnlIdx] ?? ''

            selectedRows.push(nextRow)
            selectedKeys.add(
                buildPolicyBranchKeyOrThrow(
                    nextRow,
                    indexes.policyIdx,
                    indexes.branchIdx,
                    contextTag,
                    sectionTitle,
                    rowIndex
                )
            )
        }

        const groupKey = resolveTpSlGroupKey(section.title)
        selectedRowsByGroup.set(groupKey, selectedRows)
        selectedKeysByGroup.set(groupKey, selectedKeys)
    }

    if (selectedRowsByGroup.size === 0) {
        throw new Error(`[${contextTag}] TP/SL split columns are missing in report sections.`)
    }

    const filteredSections: TableSectionDto[] = []
    for (const section of sections) {
        const groupKey = resolveTpSlGroupKey(section.title)
        if (!selectedRowsByGroup.has(groupKey) || !selectedKeysByGroup.has(groupKey)) {
            continue
        }

        const selectedRows = selectedRowsByGroup.get(groupKey)!
        const selectedKeys = selectedKeysByGroup.get(groupKey)!
        if (selectedKeys.size === 0) {
            continue
        }

        const sectionTitle = section.title ?? 'n/a'
        const columns = section.columns ?? []
        const rows = section.rows ?? []
        const indexes = resolvePart1Indexes(columns)

        if (indexes) {
            filteredSections.push({
                ...section,
                rows: selectedRows
            })
            continue
        }

        const policyIdx = columns.indexOf('Policy')
        const branchIdx = columns.indexOf('Branch')
        if (policyIdx < 0 || branchIdx < 0) {
            throw new Error(
                `[${contextTag}] section has no Policy/Branch columns for TP/SL filtering. title=${sectionTitle}.`
            )
        }

        const nextRows = rows.filter((row, rowIndex) => {
            const requiredIdx = Math.max(policyIdx, branchIdx)
            ensureRowShapeOrThrow(row, requiredIdx, contextTag, sectionTitle, rowIndex)

            const rowKey = buildPolicyBranchKeyOrThrow(row, policyIdx, branchIdx, contextTag, sectionTitle, rowIndex)
            return selectedKeys.has(rowKey)
        })

        if (nextRows.length > 0) {
            filteredSections.push({
                ...section,
                rows: nextRows
            })
        }
    }

    if (filteredSections.length === 0) {
        throw new Error(`[${contextTag}] no rows left after TP/SL filtering. mode=${mode}.`)
    }

    return filteredSections
}
