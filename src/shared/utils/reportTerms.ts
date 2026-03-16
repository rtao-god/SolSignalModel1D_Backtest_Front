import { resolveDiagnosticsReportCanonicalTermKey } from '@/shared/terms/reports/diagnostics'
import { localizeReportColumnTitle } from './reportPresentationLocalization'
import { resolveReportColumnTooltip, resolveReportTooltipSelfAliases } from './reportTooltips'

export interface ReportTermItem {
    key: string
    title: string
    description: string
    tooltip: string
    selfAliases?: string[]
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
    selfAliases: Set<string>
}

export interface ReportTermReference {
    key: string
    title?: string
    selfAliases?: string[]
}

interface BuildReportTermsFromReferencesParams<TReference extends ReportTermReference> {
    references: TReference[]
    contextTag: string
    resolveCanonicalKey?: (reference: TReference) => string | undefined
    resolveTitle?: (reference: TReference, canonicalKey: string) => string | undefined
    resolveDescription: (reference: TReference, canonicalKey: string) => string | undefined
    resolveTooltip?: (reference: TReference, canonicalKey: string) => string | undefined
    resolveSelfAliases?: (reference: TReference, canonicalKey: string) => string[] | undefined
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

function normalizeNonEmptyAliases(values: string[]): string[] {
    return Array.from(new Set(values.map(value => value.trim()).filter(value => value.length > 0)))
}

export function buildReportTermsFromReferences<TReference extends ReportTermReference>({
    references,
    contextTag,
    resolveCanonicalKey,
    resolveTitle,
    resolveDescription,
    resolveTooltip,
    resolveSelfAliases
}: BuildReportTermsFromReferencesParams<TReference>): ReportTermItem[] {
    if (!references || !Array.isArray(references)) {
        throw new Error(`[${contextTag}] references must be an array.`)
    }

    if (references.length === 0) {
        return []
    }

    const termsByKey = new Map<string, ReportTermAccumulator>()

    for (const reference of references) {
        const rawKey = ensureNonEmptyString(reference.key, 'term key', contextTag)
        const canonicalKey = ensureNonEmptyString(
            resolveCanonicalKey ? resolveCanonicalKey(reference) : rawKey,
            `canonical key for ${rawKey}`,
            contextTag
        )
        const resolvedTitle = ensureNonEmptyString(
            resolveTitle ? resolveTitle(reference, canonicalKey) : (reference.title ?? rawKey),
            `title for ${canonicalKey}`,
            contextTag
        )
        const existingTerm = termsByKey.get(canonicalKey)

        if (existingTerm) {
            existingTerm.titles.add(resolvedTitle)
            normalizeNonEmptyAliases([
                ...(reference.selfAliases ?? []),
                ...(resolveSelfAliases?.(reference, canonicalKey) ?? [])
            ]).forEach(alias => existingTerm.selfAliases.add(alias))
            continue
        }

        const description = ensureNonEmptyString(
            resolveDescription(reference, canonicalKey),
            `description for ${canonicalKey}`,
            contextTag
        )
        const tooltip = ensureNonEmptyString(
            resolveTooltip ? resolveTooltip(reference, canonicalKey) : description,
            `tooltip for ${canonicalKey}`,
            contextTag
        )
        const selfAliases = normalizeNonEmptyAliases([
            ...(reference.selfAliases ?? []),
            ...(resolveSelfAliases?.(reference, canonicalKey) ?? [])
        ])

        termsByKey.set(canonicalKey, {
            key: canonicalKey,
            titles: new Set([resolvedTitle]),
            description,
            tooltip,
            selfAliases: new Set(selfAliases)
        })
    }

    return Array.from(termsByKey.values()).map(term => ({
        key: term.key,
        title: buildMergedTermTitle(term.titles, term.key),
        description: term.description,
        tooltip: term.tooltip,
        selfAliases: Array.from(term.selfAliases)
    }))
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

    return buildReportTermsFromReferences({
        references: sections.flatMap(section => {
            const sectionTitle = resolveSectionTitle ? resolveSectionTitle(section) : section.title
            const columns = section.columns ?? []

            return columns
                .map(column => ensureNonEmptyString(column, 'table column title', contextTag))
                .filter(column => !shouldSkipReportTermItem(kind, column))
                .map(column => ({
                    key: column,
                    sectionTitle
                }))
        }),
        contextTag,
        resolveCanonicalKey: reference => resolveReportTermCanonicalKey(kind, reference.key),
        resolveTitle: reference => localizeReportColumnTitle(kind, reference.key, locale),
        resolveDescription: reference => {
            const tooltip = resolveReportColumnTooltip(kind, reference.sectionTitle, reference.key)
            if (!tooltip || tooltip.trim().length === 0) {
                throw new Error(`[${contextTag}] tooltip is missing for column=${reference.key}.`)
            }

            return tooltip
        },
        resolveTooltip: reference => {
            const tooltip = resolveReportColumnTooltip(kind, reference.sectionTitle, reference.key)
            if (!tooltip || tooltip.trim().length === 0) {
                throw new Error(`[${contextTag}] tooltip is missing for column=${reference.key}.`)
            }

            return tooltip
        },
        resolveSelfAliases: reference => resolveReportTooltipSelfAliases(kind, reference.key)
    })
}
