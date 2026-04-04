import type { TableSectionDto } from '@/shared/types/report.types'
import { tryParseNumberFromString } from '@/shared/ui/SortableTable'

const MONEY_EPSILON = 1e-9

export interface PolicyBranchMegaSectionRowRef {
    section: TableSectionDto
    row: string[]
}

interface ResolvedMetricValue {
    raw: string
    parsed: number
}

function buildMetricValue(
    sectionRows: readonly PolicyBranchMegaSectionRowRef[],
    columnTitle: string,
    contextTag: string
): ResolvedMetricValue | null {
    let resolved: ResolvedMetricValue | null = null

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

        const parsedValue = tryParseNumberFromString(rawValue)
        if (parsedValue === null) {
            throw new Error(`[${contextTag}] ${columnTitle} is not numeric: ${rawValue}.`)
        }

        if (resolved && Math.abs(resolved.parsed - parsedValue) > MONEY_EPSILON) {
            throw new Error(
                `[${contextTag}] ${columnTitle} diverged across mega sections. previous=${resolved.raw}, next=${rawValue}.`
            )
        }

        if (!resolved) {
            resolved = { raw: rawValue, parsed: parsedValue }
        }
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

    const resolved = buildMetricValue(sectionRows, columnTitle, contextTag)
    if (!resolved) {
        throw new Error(`[${contextTag}] metric is missing. title=${columnTitle}.`)
    }

    return resolved.raw
}

export function resolvePolicyBranchMegaCurrentBalance(
    sectionRows: readonly PolicyBranchMegaSectionRowRef[],
    contextTag = 'policy-branch-mega-current-balance'
): string {
    const bucketNow = buildMetricValue(sectionRows, 'BucketNow$', contextTag)
    const onExch = buildMetricValue(sectionRows, 'OnExch$', contextTag)

    if (bucketNow && onExch && Math.abs(bucketNow.parsed - onExch.parsed) > MONEY_EPSILON) {
        throw new Error(
            `[${contextTag}] current balance aliases diverged. BucketNow$=${bucketNow.raw}, OnExch$=${onExch.raw}.`
        )
    }

    if (onExch) {
        return onExch.raw
    }

    if (bucketNow) {
        return bucketNow.raw
    }

    throw new Error(`[${contextTag}] current balance is missing. Expected OnExch$ or BucketNow$.`)
}
