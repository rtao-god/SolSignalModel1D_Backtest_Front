import type { TableSectionDto } from '@/shared/types/report.types'
import type { PolicyPerformanceMetricsDto } from '@/shared/types/policyPerformanceMetrics.types'
import { orderPolicyBranchMegaSections } from '@/shared/utils/policyBranchMegaTerms'
import { pruneDuplicatePolicyMarginColumns } from '@/shared/utils/reportPolicyMarginMode'
import { assertPolicyBranchMegaPrimaryProfitColumns } from '@/shared/utils/policyBranchMegaProfitColumns'
import { resolvePolicyBranchMegaRenderedRowKey } from '@/shared/utils/policyBranchMegaRowKey'

export interface MainBestPolicyRowBundle {
    policy: string
    branch: string
    rowKey: string
    totalPnlPct: number
    moneyMetrics: PolicyPerformanceMetricsDto
    sectionRows: Array<{
        section: TableSectionDto
        row: string[]
    }>
}

type PolicyRowMoneyMetricsRows = Record<string, PolicyPerformanceMetricsDto>

function resolveRequiredRowKey(row: string[], section: TableSectionDto, tag: string): string {
    const rowKey = resolvePolicyBranchMegaRenderedRowKey(row, section.columns ?? [])
    if (!rowKey) {
        throw new Error(`[main.demo] ${tag} Policy entry is missing canonical row key.`)
    }

    return rowKey
}

function resolveRequiredMoneyMetrics(
    moneyMetricsRows: PolicyRowMoneyMetricsRows,
    rowKey: string
): PolicyPerformanceMetricsDto {
    const metrics = moneyMetricsRows[rowKey]
    if (!metrics) {
        throw new Error(`[main.demo] owner money metrics are missing for ${rowKey}.`)
    }

    return metrics
}

function resolveRequiredTotalPnlPct(metrics: PolicyPerformanceMetricsDto, rowKey: string): number {
    if (typeof metrics.totalPnlPct !== 'number' || !Number.isFinite(metrics.totalPnlPct)) {
        throw new Error(`[main.demo] owner totalPnlPct is missing for ${rowKey}.`)
    }

    return metrics.totalPnlPct
}

function columnIndex(columns: string[] | undefined, title: string, tag: string): number {
    if (!columns || columns.length === 0) {
        throw new Error(`[main.demo] ${tag} columns are empty.`)
    }

    const idx = columns.indexOf(title)
    if (idx < 0) {
        throw new Error(`[main.demo] ${tag} column not found: ${title}.`)
    }

    return idx
}

function buildTableSections(sections: unknown[]): TableSectionDto[] {
    const tableSections = (sections ?? []).filter(
        (section): section is TableSectionDto =>
            Array.isArray((section as TableSectionDto).columns) && (section as TableSectionDto).columns!.length > 0
    )

    return pruneDuplicatePolicyMarginColumns(tableSections)
}

function resolveRowByPolicy(section: TableSectionDto, key: string, tag: string): string[] {
    const columns = section.columns ?? []
    const rows = section.rows ?? []
    columnIndex(columns, 'Policy', tag)
    columnIndex(columns, 'Branch', tag)
    const rowsByKey = new Map<string, string[]>()

    for (const row of rows) {
        if (!row) {
            throw new Error(`[main.demo] ${tag} Policy entry is malformed.`)
        }

        const rowKey = resolveRequiredRowKey(row, section, tag)
        if (rowsByKey.has(rowKey)) {
            throw new Error(`[main.demo] ${tag} has duplicate Policy entry for ${rowKey}.`)
        }

        rowsByKey.set(rowKey, row)
    }

    const resolved = rowsByKey.get(key)
    if (!resolved) {
        throw new Error(`[main.demo] ${tag} Policy entry was not found for ${key}.`)
    }

    return resolved
}

/**
 * Подготавливает mega-секции для demo-карточки на главной.
 * Главная страница должна читать тот же profit-контракт, что и полная mega-страница.
 */
export function buildMainDemoPolicyBranchMegaSections(sections: unknown[]): TableSectionDto[] {
    const tableSections = buildTableSections(sections)
    const orderedSections = orderPolicyBranchMegaSections(tableSections)
    assertPolicyBranchMegaPrimaryProfitColumns(orderedSections, 'main.demo')
    return orderedSections
}

export function resolveMainDemoBestPolicyRows(
    sections: TableSectionDto[],
    moneyMetricsRows: PolicyRowMoneyMetricsRows
): MainBestPolicyRowBundle {
    if (!sections || sections.length === 0) {
        throw new Error('[main.demo] policy branch mega sections are empty.')
    }

    if (!moneyMetricsRows || Object.keys(moneyMetricsRows).length === 0) {
        throw new Error('[main.demo] owner money metrics rows are empty.')
    }

    const anchorSection = sections.find(section => (section.columns ?? []).includes('TotalPnl%'))
    if (!anchorSection) {
        throw new Error('[main.demo] Policy Branch Mega anchor section with TotalPnl% is missing.')
    }

    const anchorColumns = anchorSection.columns ?? []
    const anchorRows = anchorSection.rows ?? []
    if (anchorRows.length === 0) {
        throw new Error('[main.demo] Policy Branch Mega anchor section has no rows.')
    }

    const policyIdx = columnIndex(anchorColumns, 'Policy', 'anchor')
    const branchIdx = columnIndex(anchorColumns, 'Branch', 'anchor')
    columnIndex(anchorColumns, 'TotalPnl%', 'anchor')

    let bestRow: string[] | null = null
    let bestRowKey: string | null = null
    let bestMoneyMetrics: PolicyPerformanceMetricsDto | null = null
    let bestTotal = -Infinity

    for (const row of anchorRows) {
        if (!row) {
            throw new Error('[main.demo] Policy Branch Mega anchor Policy entry is malformed.')
        }

        const rowKey = resolveRequiredRowKey(row, anchorSection, 'anchor')
        const moneyMetrics = resolveRequiredMoneyMetrics(moneyMetricsRows, rowKey)
        const totalParsed = resolveRequiredTotalPnlPct(moneyMetrics, rowKey)

        if (bestRow === null || totalParsed > bestTotal) {
            bestRow = row
            bestRowKey = rowKey
            bestMoneyMetrics = moneyMetrics
            bestTotal = totalParsed
        }
    }

    if (!bestRow || !bestRowKey || !bestMoneyMetrics) {
        throw new Error('[main.demo] Failed to resolve best Policy.')
    }

    const policyName = bestRow[policyIdx] ?? ''
    const branchName = bestRow[branchIdx] ?? ''
    if (!policyName || !branchName) {
        throw new Error('[main.demo] Best Policy is missing Policy or Branch.')
    }

    return {
        policy: policyName,
        branch: branchName,
        rowKey: bestRowKey,
        totalPnlPct: bestTotal,
        moneyMetrics: bestMoneyMetrics,
        sectionRows: sections.map((section, index) => ({
            section,
            row: section === anchorSection ? bestRow : resolveRowByPolicy(section, bestRowKey, `section-${index + 1}`)
        }))
    }
}
