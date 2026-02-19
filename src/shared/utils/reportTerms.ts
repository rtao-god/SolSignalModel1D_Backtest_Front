import { resolveReportColumnTooltip } from './reportTooltips'

export interface ReportTermItem {
    key: string
    title: string
    description: string
    tooltip: string
}

interface ReportTermsSectionLike {
    title?: string
    columns?: string[]
}

interface BuildReportTermsParams<TSection extends ReportTermsSectionLike> {
    sections: TSection[]
    reportKind: string
    contextTag: string
    resolveSectionTitle?: (section: TSection) => string | undefined
}

function ensureNonEmptyStringOrThrow(value: string | undefined, label: string, contextTag: string): string {
    if (!value || value.trim().length === 0) {
        throw new Error(`[${contextTag}] ${label} is empty.`)
    }

    return value.trim()
}

export function buildReportTermsFromSectionsOrThrow<TSection extends ReportTermsSectionLike>({
    sections,
    reportKind,
    contextTag,
    resolveSectionTitle
}: BuildReportTermsParams<TSection>): ReportTermItem[] {
    const kind = ensureNonEmptyStringOrThrow(reportKind, 'report kind', contextTag)

    if (!sections || !Array.isArray(sections)) {
        throw new Error(`[${contextTag}] sections must be an array.`)
    }

    if (sections.length === 0) {
        return []
    }

    const termsByTitle = new Map<string, ReportTermItem>()

    for (const section of sections) {
        const sectionTitle = resolveSectionTitle ? resolveSectionTitle(section) : section.title
        const columns = section.columns ?? []

        for (const rawColumn of columns) {
            const column = ensureNonEmptyStringOrThrow(rawColumn, 'table column title', contextTag)
            if (termsByTitle.has(column)) {
                continue
            }

            const tooltip = resolveReportColumnTooltip(kind, sectionTitle, column)
            if (!tooltip || tooltip.trim().length === 0) {
                throw new Error(`[${contextTag}] tooltip is missing for column=${column}.`)
            }

            termsByTitle.set(column, {
                key: column,
                title: column,
                description: tooltip,
                tooltip
            })
        }
    }

    return Array.from(termsByTitle.values())
}

