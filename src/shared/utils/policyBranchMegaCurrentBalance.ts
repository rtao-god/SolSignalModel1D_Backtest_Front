import type { TableSectionDto } from '@/shared/types/report.types'
import { tryParseNumberFromString } from '@/shared/ui/SortableTable'

export interface PolicyBranchMegaSectionRowRef {
    section: TableSectionDto
    row: string[]
}

interface ResolvedMetricValue {
    raw: string
    parsed: number
}

function buildRawMetricValue(
    sectionRows: readonly PolicyBranchMegaSectionRowRef[],
    columnTitle: string,
    contextTag: string
): string | null {
    let resolved: string | null = null

    for (const item of sectionRows) {
        const columns = item.section.columns ?? []
        const index = columns.indexOf(columnTitle)
        if (index < 0) {
            continue
        }

        const rawValue = item.row[index]
        if (typeof rawValue !== 'string' || rawValue.trim().length === 0) {
            throw new Error(`[${contextTag}] ${columnTitle} is empty.`)
        }

        const normalizedRawValue = rawValue.trim()
        if (resolved && resolved !== normalizedRawValue) {
            throw new Error(
                `[${contextTag}] ${columnTitle} diverged across mega sections. previous=${resolved}, next=${normalizedRawValue}.`
            )
        }

        if (!resolved) {
            resolved = normalizedRawValue
        }
    }

    return resolved
}

function buildNumericMetricValue(
    sectionRows: readonly PolicyBranchMegaSectionRowRef[],
    columnTitle: string,
    contextTag: string
): ResolvedMetricValue | null {
    const rawValue = buildRawMetricValue(sectionRows, columnTitle, contextTag)
    if (rawValue === null) {
        return null
    }

    const parsedValue = tryParseNumberFromString(rawValue)
    if (parsedValue === null) {
        throw new Error(`[${contextTag}] ${columnTitle} is not numeric: ${rawValue}.`)
    }

    return {
        raw: rawValue,
        parsed: parsedValue
    }
}

export function resolvePolicyBranchMegaMetricRawValue(
    sectionRows: readonly PolicyBranchMegaSectionRowRef[],
    columnTitle: string,
    contextTag = 'policy-branch-mega-metric'
): string {
    if (!sectionRows || sectionRows.length === 0) {
        throw new Error(`[${contextTag}] mega section rows are empty.`)
    }

    const resolved = buildRawMetricValue(sectionRows, columnTitle, contextTag)
    if (!resolved) {
        throw new Error(`[${contextTag}] metric is missing. title=${columnTitle}.`)
    }

    return resolved
}

export function resolvePolicyBranchMegaMetricValue(
    sectionRows: readonly PolicyBranchMegaSectionRowRef[],
    columnTitle: string,
    contextTag = 'policy-branch-mega-metric'
): string {
    if (!sectionRows || sectionRows.length === 0) {
        throw new Error(`[${contextTag}] mega section rows are empty.`)
    }

    const resolved = buildNumericMetricValue(sectionRows, columnTitle, contextTag)
    if (!resolved) {
        throw new Error(`[${contextTag}] metric is missing. title=${columnTitle}.`)
    }

    return resolved.raw
}

export function resolvePolicyBranchMegaCurrentBalance(
    sectionRows: readonly PolicyBranchMegaSectionRowRef[],
    contextTag = 'policy-branch-mega-current-balance'
): string {
    const equityNow = buildNumericMetricValue(sectionRows, 'EquityNowUsd', contextTag)

    if (equityNow) {
        return equityNow.raw
    }

    throw new Error(`[${contextTag}] current balance is missing. Expected EquityNowUsd.`)
}
