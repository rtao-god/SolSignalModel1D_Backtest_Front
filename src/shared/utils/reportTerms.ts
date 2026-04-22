import type { ReportColumnDescriptorDto } from '@/shared/types/report.types'
import { localizeReportColumnTitle } from './reportPresentationLocalization'
import {
    resolveReportColumnTooltip,
    resolveReportTooltipLocale,
    resolveReportTooltipSelfAliases
} from './reportTooltips'

export interface ReportTermItem {
    key: string
    title: string
    description: string
    tooltip: string
    selfAliases?: string[]
}

interface ReportTermsSectionLike {
    title?: string
    sectionKey?: string
    columns?: string[]
    columnKeys?: string[]
    columnDescriptors?: ReportColumnDescriptorDto[]
}

interface BuildReportTermsParams<TSection extends ReportTermsSectionLike> {
    sections: TSection[]
    reportKind: string
    contextTag: string
    resolveSectionTitle?: (section: TSection) => string | undefined
    locale?: string | null
    requireColumnDescriptors?: boolean
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
    sectionTitle?: string
    sectionKey?: string
    columnKey?: string
    termKey?: string
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

function resolveReportTermCanonicalKey(
    reportKind: string,
    columnTitle: string,
    ownerTermKey: string | undefined,
    contextTag: string
): string {
    if (ownerTermKey && ownerTermKey.trim().length > 0) {
        return ownerTermKey.trim()
    }

    if (reportKind === 'backtest_diagnostics') {
        return ensureNonEmptyString(ownerTermKey, `diagnostics owner termKey for ${columnTitle}`, contextTag)
    }

    return columnTitle
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

function buildSectionReportTermReferences<TSection extends ReportTermsSectionLike>(
    section: TSection,
    reportKind: string,
    contextTag: string,
    requireColumnDescriptors: boolean
): ReportTermReference[] {
    const sectionTitle = section.title
    const columns = (section.columns ?? []).map(column =>
        ensureNonEmptyString(column, 'table column title', contextTag)
    )

    const shouldRequireOwnerDescriptors = requireColumnDescriptors || reportKind === 'backtest_diagnostics'
    const columnDescriptors = section.columnDescriptors
    if (!Array.isArray(columnDescriptors)) {
        if (shouldRequireOwnerDescriptors) {
            throw new Error(
                `[${contextTag}] section "${sectionTitle ?? 'report-table'}" is missing owner columnDescriptors. owner=report_column_registry | expected=backend-published descriptor for every report column. | requiredAction=Republish the report and stop using frontend alias maps.`
            )
        }

        return columns
            .map(column => ({
                key: column,
                sectionTitle,
                sectionKey: section.sectionKey
            }))
            .filter(reference => !shouldSkipReportTermItem(reportKind, reference.key))
    }

    if (columnDescriptors.length !== columns.length) {
        throw new Error(
            `[${contextTag}] section "${sectionTitle ?? 'report-table'}" has columnDescriptors length mismatch. owner=report_column_registry | expected=${columns.length} descriptors. | actual=${columnDescriptors.length} descriptors | requiredAction=Republish the report with aligned columns and descriptors.`
        )
    }

    const columnKeys = section.columnKeys
    if (Array.isArray(columnKeys) && columnKeys.length !== columns.length) {
        throw new Error(
            `[${contextTag}] section "${sectionTitle ?? 'report-table'}" has columnKeys length mismatch. owner=report_column_registry | expected=${columns.length} columnKeys. | actual=${columnKeys.length} columnKeys | requiredAction=Republish the report with aligned columnKeys and columnDescriptors.`
        )
    }

    if (shouldRequireOwnerDescriptors && !Array.isArray(columnKeys)) {
        throw new Error(
            `[${contextTag}] section "${sectionTitle ?? 'report-table'}" is missing aligned columnKeys. owner=report_column_registry | expected=${columns.length} columnKeys. | actual=missing | requiredAction=Republish the report with aligned columnKeys and columnDescriptors.`
        )
    }

    return columns
        .map((column, index) => {
            const descriptor = columnDescriptors[index]
            const displayLabel = ensureNonEmptyString(
                descriptor?.displayLabel,
                `descriptor displayLabel[${index}]`,
                contextTag
            )
            if (displayLabel !== column) {
                throw new Error(
                    `[${contextTag}] descriptor displayLabel mismatch. owner=report_column_registry | expected=${column} | actual=${displayLabel} | context=section=${sectionTitle ?? 'report-table'}, columnIndex=${index} | requiredAction=Republish the report with descriptor.displayLabel aligned to the table column.`
                )
            }

            const descriptorColumnKey = ensureNonEmptyString(
                descriptor?.columnKey,
                `descriptor columnKey[${index}]`,
                contextTag
            )
            const columnKey = Array.isArray(columnKeys) ? ensureNonEmptyString(columnKeys[index], `columnKey[${index}]`, contextTag) : descriptorColumnKey
            if (Array.isArray(columnKeys) && descriptorColumnKey !== columnKey) {
                throw new Error(
                    `[${contextTag}] descriptor columnKey mismatch. owner=report_column_registry | expected=${columnKey} | actual=${descriptorColumnKey} | context=section=${sectionTitle ?? 'report-table'}, columnIndex=${index} | requiredAction=Republish the report with descriptor.columnKey aligned to TableSection.columnKeys.`
                )
            }

            return {
                key: column,
                sectionTitle,
                sectionKey: section.sectionKey,
                columnKey,
                termKey: ensureNonEmptyString(
                    descriptor?.termKey,
                    `descriptor termKey[${index}]`,
                    contextTag
                )
            }
        })
        .filter(reference => !shouldSkipReportTermItem(reportKind, reference.key))
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
    locale,
    requireColumnDescriptors = false
}: BuildReportTermsParams<TSection>): ReportTermItem[] {
    const kind = ensureNonEmptyString(reportKind, 'report kind', contextTag)
    const tooltipLocale = locale ? resolveReportTooltipLocale(locale) : undefined

    if (!sections || !Array.isArray(sections)) {
        throw new Error(`[${contextTag}] sections must be an array.`)
    }

    if (sections.length === 0) {
        return []
    }

    return buildReportTermsFromReferences({
        references: sections.flatMap(section => {
            const references = buildSectionReportTermReferences(section, kind, contextTag, requireColumnDescriptors)
            const sectionTitle = resolveSectionTitle ? resolveSectionTitle(section) : section.title

            return references.map(reference => ({
                ...reference,
                sectionTitle
            }))
        }),
        contextTag,
        resolveCanonicalKey: reference => resolveReportTermCanonicalKey(kind, reference.key, reference.termKey, contextTag),
        resolveTitle: reference => localizeReportColumnTitle(kind, reference.key, locale),
        resolveDescription: reference => {
            const tooltip = resolveReportColumnTooltip(kind, reference.sectionTitle, reference.key, tooltipLocale, {
                sectionKey: reference.sectionKey,
                columnKey: reference.columnKey,
                termKey: reference.termKey
            })
            if (!tooltip || tooltip.trim().length === 0) {
                throw new Error(`[${contextTag}] tooltip is missing for column=${reference.key}.`)
            }

            return tooltip
        },
        resolveTooltip: reference => {
            const tooltip = resolveReportColumnTooltip(kind, reference.sectionTitle, reference.key, tooltipLocale, {
                sectionKey: reference.sectionKey,
                columnKey: reference.columnKey,
                termKey: reference.termKey
            })
            if (!tooltip || tooltip.trim().length === 0) {
                throw new Error(`[${contextTag}] tooltip is missing for column=${reference.key}.`)
            }

            return tooltip
        },
        resolveSelfAliases: reference =>
            normalizeNonEmptyAliases([
                ...resolveReportTooltipSelfAliases(kind, reference.key),
                reference.key,
                reference.columnKey ?? '',
                reference.termKey ?? ''
            ])
    })
}
