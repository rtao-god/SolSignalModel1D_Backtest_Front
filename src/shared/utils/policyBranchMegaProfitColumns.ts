import type { TableSectionDto } from '@/shared/types/report.types'

export const POLICY_BRANCH_MEGA_TOTAL_RETURN_METRIC_KEYS = ['TotalPnl%', 'Wealth%'] as const

export function resolvePolicyBranchMegaPrimaryProfitColumn(
    columns: readonly string[]
): 'TotalPnl%' | 'Wealth%' | null {
    if (columns.includes('TotalPnl%')) {
        return 'TotalPnl%'
    }

    if (columns.includes('Wealth%')) {
        return 'Wealth%'
    }

    return null
}

function resolveMegaSectionPart(section: TableSectionDto): number | null {
    const metadataPart =
        section.metadata?.kind === 'policy-branch-mega' && Number.isInteger(section.metadata.part) ?
            section.metadata.part
        :   null
    if (typeof metadataPart === 'number' && metadataPart > 0) {
        return metadataPart
    }

    const title = section.title ?? ''
    const match = title.match(/\[PART\s+(\d+)\/\d+\]/i)
    if (!match?.[1]) {
        return null
    }

    const part = Number(match[1])
    return Number.isInteger(part) && part > 0 ? part : null
}

/**
 * UI не владеет profit-колонками mega-отчёта.
 * Если backend не отдал TotalPnl% или Wealth% в PART 1, это контрактная ошибка published slice.
 */
export function assertPolicyBranchMegaPrimaryProfitColumns(
    sections: readonly TableSectionDto[],
    contextTag: string
): void {
    if (!sections || sections.length === 0) {
        throw new Error(`[${contextTag}] policy_branch_mega sections are empty.`)
    }

    sections.forEach((section, sectionIndex) => {
        const part = resolveMegaSectionPart(section)
        if (part !== 1) {
            return
        }

        const columns = section.columns ?? []
        if (!columns.includes('TotalPnl%')) {
            throw new Error(
                `[${contextTag}] mega part1 section is missing TotalPnl%. section=${section.title ?? 'n/a'}, index=${sectionIndex}, columns=${columns.join(', ')}.`
            )
        }

        if (!columns.includes('Wealth%')) {
            throw new Error(
                `[${contextTag}] mega part1 section is missing Wealth%. section=${section.title ?? 'n/a'}, index=${sectionIndex}, columns=${columns.join(', ')}.`
            )
        }
    })
}
