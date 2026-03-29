import type { TableSectionDto } from '@/shared/types/report.types'
import { orderPolicyBranchMegaSections } from '@/shared/utils/policyBranchMegaTerms'
import { tryParseNumberFromString } from '@/shared/ui/SortableTable'
import { assertPolicyBranchMegaPrimaryProfitColumns } from '@/shared/utils/policyBranchMegaProfitColumns'

export interface MainBestPolicyRowBundle {
    policy: string
    branch: string
    totalPnlPct: number
    sectionRows: Array<{
        section: TableSectionDto
        row: string[]
    }>
}

function buildPolicyBranchKey(policy: string, branch: string): string {
    return `${policy}::${branch}`
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
    return (sections ?? []).filter(
        (section): section is TableSectionDto =>
            Array.isArray((section as TableSectionDto).columns) && (section as TableSectionDto).columns!.length > 0
    )
}

function resolveRowByPolicy(section: TableSectionDto, key: string, tag: string): string[] {
    const columns = section.columns ?? []
    const rows = section.rows ?? []
    const policyIdx = columnIndex(columns, 'Policy', tag)
    const branchIdx = columnIndex(columns, 'Branch', tag)
    const rowsByKey = new Map<string, string[]>()

    for (const row of rows) {
        if (!row || row.length <= Math.max(policyIdx, branchIdx)) {
            throw new Error(`[main.demo] ${tag} Policy entry is malformed.`)
        }

        const policy = row[policyIdx] ?? ''
        const branch = row[branchIdx] ?? ''
        if (!policy || !branch) {
            throw new Error(`[main.demo] ${tag} Policy entry is missing Policy or Branch.`)
        }

        const rowKey = buildPolicyBranchKey(policy, branch)
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

export function resolveMainDemoBestPolicyRows(sections: TableSectionDto[]): MainBestPolicyRowBundle {
    if (!sections || sections.length === 0) {
        throw new Error('[main.demo] policy branch mega sections are empty.')
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
    const totalPnlIdx = columnIndex(anchorColumns, 'TotalPnl%', 'anchor')

    let bestRow: string[] | null = null
    let bestTotal = -Infinity

    for (const row of anchorRows) {
        if (!row || row.length <= totalPnlIdx) {
            throw new Error('[main.demo] Policy Branch Mega anchor Policy entry is malformed.')
        }

        const totalRaw = row[totalPnlIdx]
        const totalParsed = typeof totalRaw === 'string' ? tryParseNumberFromString(totalRaw) : null
        if (totalParsed === null) {
            throw new Error(`[main.demo] TotalPnl% is not a number: ${totalRaw}.`)
        }

        if (bestRow === null || totalParsed > bestTotal) {
            bestRow = row
            bestTotal = totalParsed
        }
    }

    if (!bestRow) {
        throw new Error('[main.demo] Failed to resolve best Policy.')
    }

    const policyName = bestRow[policyIdx] ?? ''
    const branchName = bestRow[branchIdx] ?? ''
    if (!policyName || !branchName) {
        throw new Error('[main.demo] Best Policy is missing Policy or Branch.')
    }

    const key = buildPolicyBranchKey(policyName, branchName)

    return {
        policy: policyName,
        branch: branchName,
        totalPnlPct: bestTotal,
        sectionRows: sections.map((section, index) => ({
            section,
            row: section === anchorSection ? bestRow : resolveRowByPolicy(section, key, `section-${index + 1}`)
        }))
    }
}
