import { resolveReportColumnTooltip } from './reportTooltips'
import { localizeReportColumnTitle } from './reportPresentationLocalization'

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
    locale?: string | null
}

function ensureNonEmptyStringOrThrow(value: string | undefined, label: string, contextTag: string): string {
    if (!value || value.trim().length === 0) {
        throw new Error(`[${contextTag}] ${label} is empty.`)
    }

    return value.trim()
}

function shouldSkipReportTermItem(reportKind: string, columnTitle: string): boolean {
    if (!reportKind.startsWith('current_prediction')) {
        return false
    }

    const normalized = columnTitle.trim().toLowerCase()
    return normalized === 'description' || normalized === 'описание'
}

export function buildReportTermsFromSectionsOrThrow<TSection extends ReportTermsSectionLike>({
    sections,
    reportKind,
    contextTag,
    resolveSectionTitle,
    locale
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
            if (shouldSkipReportTermItem(kind, column)) {
                continue
            }

            if (termsByTitle.has(column)) {
                continue
            }

            const tooltip = resolveReportColumnTooltip(kind, sectionTitle, column)
            if (!tooltip || tooltip.trim().length === 0) {
                throw new Error(`[${contextTag}] tooltip is missing for column=${column}.`)
            }

            termsByTitle.set(column, {
                key: column,
                title: localizeReportColumnTitle(kind, column, locale),
                description: tooltip,
                tooltip
            })
        }
    }

    return Array.from(termsByTitle.values())
}
