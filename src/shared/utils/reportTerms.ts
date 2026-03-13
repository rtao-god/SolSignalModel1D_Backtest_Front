import { resolveDiagnosticsReportCanonicalTermKey } from '@/shared/terms/reports/diagnostics'
import { localizeReportColumnTitle } from './reportPresentationLocalization'
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
    locale?: string | null
}

interface ReportTermAccumulator {
    key: string
    titles: Set<string>
    description: string
    tooltip: string
}

function ensureNonEmptyString(value: string | undefined, label: string, contextTag: string): string {
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

function resolveReportTermCanonicalKey(reportKind: string, columnTitle: string): string {
    if (reportKind !== 'backtest_diagnostics') {
        return columnTitle
    }

    // Diagnostics-таблицы используют и короткие, и полные имена одних и тех же метрик.
    // Глоссарий должен объединять такие alias-колонки в одну карточку, а не плодить дубли.
    return resolveDiagnosticsReportCanonicalTermKey(columnTitle) ?? columnTitle
}

function buildMergedTermTitle(titles: Set<string>, preferredTitle: string): string {
    const uniqueTitles = Array.from(titles)

    if (uniqueTitles.length === 0) {
        throw new Error('[report-terms] merged title list is empty.')
    }

    const preferredTitleIndex = uniqueTitles.indexOf(preferredTitle)
    if (preferredTitleIndex > 0) {
        uniqueTitles.splice(preferredTitleIndex, 1)
        uniqueTitles.unshift(preferredTitle)
    }

    return uniqueTitles.join(' / ')
}

export function buildReportTermsFromSections<TSection extends ReportTermsSectionLike>({
    sections,
    reportKind,
    contextTag,
    resolveSectionTitle,
    locale
}: BuildReportTermsParams<TSection>): ReportTermItem[] {
    const kind = ensureNonEmptyString(reportKind, 'report kind', contextTag)

    if (!sections || !Array.isArray(sections)) {
        throw new Error(`[${contextTag}] sections must be an array.`)
    }

    if (sections.length === 0) {
        return []
    }

    const termsByTitle = new Map<string, ReportTermAccumulator>()

    for (const section of sections) {
        const sectionTitle = resolveSectionTitle ? resolveSectionTitle(section) : section.title
        const columns = section.columns ?? []

        for (const rawColumn of columns) {
            const column = ensureNonEmptyString(rawColumn, 'table column title', contextTag)
            if (shouldSkipReportTermItem(kind, column)) {
                continue
            }

            const canonicalKey = resolveReportTermCanonicalKey(kind, column)
            const localizedTitle = localizeReportColumnTitle(kind, column, locale)
            const existingTerm = termsByTitle.get(canonicalKey)

            if (existingTerm) {
                existingTerm.titles.add(localizedTitle)
                continue
            }

            const tooltip = resolveReportColumnTooltip(kind, sectionTitle, column)
            if (!tooltip || tooltip.trim().length === 0) {
                throw new Error(`[${contextTag}] tooltip is missing for column=${column}.`)
            }

            termsByTitle.set(canonicalKey, {
                key: canonicalKey,
                titles: new Set([localizedTitle]),
                description: tooltip,
                tooltip
            })
        }
    }

    return Array.from(termsByTitle.values()).map(term => ({
        key: term.key,
        title: buildMergedTermTitle(term.titles, term.key),
        description: term.description,
        tooltip: term.tooltip
    }))
}
