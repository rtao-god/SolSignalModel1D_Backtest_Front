import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import classNames from '@/shared/lib/helpers/classNames'
import { ReportActualStatusCard, ReportTableTermsBlock, ReportViewControls, TermTooltip, Text } from '@/shared/ui'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import type { TableSectionDto } from '@/shared/types/report.types'
import { ReportTableCard } from '@/shared/ui/ReportTableCard'
import {
    enrichTermTooltipDescription,
    renderTermTooltipRichText,
    renderTermTooltipTitle
} from '@/shared/ui/TermTooltip'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import PageError from '@/shared/ui/errors/PageError/ui/PageError'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import { usePolicyBranchMegaReportWithFreshnessQuery } from '@/shared/api/tanstackQueries/policyBranchMega'
import {
    buildPolicyBranchMegaTermsForColumns,
    getPolicyBranchMegaTermOrThrow,
    orderPolicyBranchMegaSectionsOrThrow,
    resolvePolicyBranchMegaTermLocale,
    type PolicyBranchMegaTermLocale
} from '@/shared/utils/policyBranchMegaTerms'
import {
    buildPolicyBranchMegaTableSectionAnchor,
    buildPolicyBranchMegaTermsSectionAnchor,
    buildPolicyBranchMegaTabsFromSections,
    filterPolicyBranchMegaSectionsByMetricOrThrow,
    filterPolicyBranchMegaSectionsBySlModeOrThrow,
    filterPolicyBranchMegaSectionsByTpSlModeOrThrow,
    filterPolicyBranchMegaSectionsByBucketOrThrow,
    filterPolicyBranchMegaSectionsByZonalModeOrThrow,
    normalizePolicyBranchMegaTitle,
    resolvePolicyBranchMegaBucketFromQuery,
    resolvePolicyBranchMegaMetricFromQuery,
    resolvePolicyBranchMegaModeFromTitle,
    resolvePolicyBranchMegaSlModeFromQuery,
    resolvePolicyBranchMegaTpSlModeFromQuery,
    resolvePolicyBranchMegaZonalModeFromQuery,
    type PolicyBranchMegaBucketMode,
    type PolicyBranchMegaMetricMode,
    type PolicyBranchMegaSlMode,
    type PolicyBranchMegaTpSlMode,
    type PolicyBranchMegaZonalMode
} from '@/shared/utils/policyBranchMegaTabs'
import {
    DEFAULT_REPORT_BUCKET_MODE,
    DEFAULT_REPORT_METRIC_MODE,
    DEFAULT_REPORT_SL_MODE,
    DEFAULT_REPORT_TP_SL_MODE,
    DEFAULT_REPORT_ZONAL_MODE
} from '@/shared/utils/reportViewCapabilities'
import { resolveReportSourceEndpointOrThrow } from '@/shared/utils/reportSourceEndpoint'
import cls from './PolicyBranchMegaPage.module.scss'
import type { PolicyBranchMegaPageProps } from './types'

function buildTableSections(sections: unknown[]): TableSectionDto[] {
    return (sections ?? []).filter(
        (section): section is TableSectionDto =>
            Array.isArray((section as TableSectionDto).columns) && (section as TableSectionDto).columns!.length > 0
    )
}

function rowFingerprint(row: unknown): string {
    if (Array.isArray(row)) {
        return row.map(value => String(value ?? '')).join('\u001f')
    }

    return JSON.stringify(row)
}

// Жестко валидируем счетчики сделок, чтобы не скрывать битые числовые поля отчета.
function parseNonNegativeIntOrThrow(raw: string, label: string): number {
    const value = Number(raw)
    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
        throw new Error(`[policy-branch-mega] ${label} must be a non-negative integer. value=${raw}`)
    }

    return value
}

function parseFiniteNumberOrNull(raw: string | undefined): number | null {
    if (raw == null) return null
    const normalized = raw.trim().replace(/\s+/g, '').replace(',', '.')
    if (!normalized) return null
    if (normalized === '—') return null

    const value = Number(normalized)
    if (!Number.isFinite(value)) return null
    return value
}

const MEGA_SL_MODE_COLUMN_NAME = 'SL Mode'
const MEGA_ROW_KEY_SEPARATOR = '\u001e'
const MEGA_PART_TAG_REGEX = /\[PART\s+(\d+)\/(\d+)\]/i
const MEGA_MODE_TAG_REGEX = /\bWITH SL\b|\bNO SL\b/gi
const MEGA_OVERVIEW_DOM_ID = 'policy-branch-mega-overview'
const BUCKET_SPECIFIC_COLUMN_VISIBILITY = new Map<string, Set<PolicyBranchMegaBucketMode>>([
    ['DailyTP%', new Set<PolicyBranchMegaBucketMode>(['daily', 'total'])],
    ['DailySL%', new Set<PolicyBranchMegaBucketMode>(['daily', 'total'])],
    ['DynTP/SL Days', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['DynTP/SL Tr', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['DynTP/SL PnL%', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['StatTP/SL Days', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['StatTP/SL Tr', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['StatTP/SL PnL%', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['DelayedTP%', new Set<PolicyBranchMegaBucketMode>(['delayed', 'total'])],
    ['DelayedSL%', new Set<PolicyBranchMegaBucketMode>(['delayed', 'total'])]
])

function isMegaColumnVisibleForBucket(column: string, bucket: PolicyBranchMegaBucketMode): boolean {
    const allowedBuckets = BUCKET_SPECIFIC_COLUMN_VISIBILITY.get(column)
    if (!allowedBuckets) {
        return true
    }

    return allowedBuckets.has(bucket)
}

function filterMegaSectionColumnsByBucketOrThrow(
    section: TableSectionDto,
    bucket: PolicyBranchMegaBucketMode
): TableSectionDto {
    const columns = section.columns ?? []
    if (columns.length === 0) {
        throw new Error('[policy-branch-mega] cannot filter section columns by bucket: columns are empty.')
    }

    const visibleIndexes: number[] = []
    const visibleColumns: string[] = []

    columns.forEach((column, columnIndex) => {
        if (isMegaColumnVisibleForBucket(column, bucket)) {
            visibleIndexes.push(columnIndex)
            visibleColumns.push(column)
        }
    })

    if (visibleColumns.length === 0) {
        throw new Error(
            `[policy-branch-mega] section has no visible columns after bucket filter. section=${section.title ?? 'n/a'}, bucket=${bucket}.`
        )
    }

    const rows = section.rows ?? []
    const nextRows = rows.map((row, rowIndex) => {
        if (!Array.isArray(row) || row.length < columns.length) {
            throw new Error(
                `[policy-branch-mega] malformed row while filtering bucket columns. section=${section.title ?? 'n/a'}, row=${rowIndex}.`
            )
        }

        return visibleIndexes.map(index => String(row[index] ?? ''))
    })

    return {
        ...section,
        columns: visibleColumns,
        rows: nextRows
    }
}

function filterMegaSectionsColumnsByBucketOrThrow(
    sections: TableSectionDto[],
    bucket: PolicyBranchMegaBucketMode
): TableSectionDto[] {
    if (!sections || sections.length === 0) {
        throw new Error('[policy-branch-mega] cannot filter sections columns by bucket: source list is empty.')
    }

    return sections.map(section => filterMegaSectionColumnsByBucketOrThrow(section, bucket))
}

function resolveMegaSlModeLabelForSectionOrThrow(section: TableSectionDto): string {
    const metadata = section.metadata
    if (metadata?.kind === 'policy-branch-mega') {
        if (!metadata.mode) {
            throw new Error(
                `[policy-branch-mega] section metadata.mode is missing while building "${MEGA_SL_MODE_COLUMN_NAME}" column. title=${section.title ?? 'n/a'}.`
            )
        }

        if (metadata.mode === 'with-sl') return 'WITH SL'
        if (metadata.mode === 'no-sl') return 'NO SL'

        throw new Error(
            `[policy-branch-mega] unsupported metadata.mode value while building "${MEGA_SL_MODE_COLUMN_NAME}" column. title=${section.title ?? 'n/a'}, mode=${String(metadata.mode)}.`
        )
    }

    const modeFromTitle = resolvePolicyBranchMegaModeFromTitle(section.title)
    if (modeFromTitle === 'with-sl') return 'WITH SL'
    if (modeFromTitle === 'no-sl') return 'NO SL'

    throw new Error(
        `[policy-branch-mega] cannot resolve section mode for "${MEGA_SL_MODE_COLUMN_NAME}" column. title=${section.title ?? 'n/a'}.`
    )
}

function buildMegaRowKey(policy: string, branch: string, slModeLabel: string | null): string {
    if (slModeLabel === null) {
        return `${policy}${MEGA_ROW_KEY_SEPARATOR}${branch}`
    }

    return `${policy}${MEGA_ROW_KEY_SEPARATOR}${branch}${MEGA_ROW_KEY_SEPARATOR}${slModeLabel}`
}

function resolveMegaPartNumberFromTitleOrThrow(title: string | undefined): number {
    const normalized = normalizePolicyBranchMegaTitle(title)
    if (!normalized) {
        throw new Error('[policy-branch-mega] section title is empty while resolving part number.')
    }

    const match = normalized.match(MEGA_PART_TAG_REGEX)
    if (!match?.[1] || !match[2]) {
        throw new Error(`[policy-branch-mega] [PART x/y] tag is missing in section title: ${normalized}.`)
    }

    const part = Number(match[1])
    const total = Number(match[2])
    if (!Number.isInteger(part) || !Number.isInteger(total) || part < 1 || total < 1 || part > total) {
        throw new Error(`[policy-branch-mega] invalid part tag values: ${normalized}.`)
    }

    return part
}

function resolveMergedMegaTitleForPartOrThrow(partSections: TableSectionDto[], slMode: PolicyBranchMegaSlMode): string {
    const title = normalizePolicyBranchMegaTitle(partSections[0]?.title)
    if (!title) {
        throw new Error('[policy-branch-mega] merged part title is empty.')
    }

    if (slMode !== 'all') {
        return title
    }

    return title
        .replace(MEGA_MODE_TAG_REGEX, 'WITH SL + NO SL')
        .replace(/\s{2,}/g, ' ')
        .trim()
}

function resolveExpectedSlModeLabelOrThrow(mode: PolicyBranchMegaSlMode): 'WITH SL' | 'NO SL' {
    if (mode === 'with-sl') return 'WITH SL'
    if (mode === 'no-sl') return 'NO SL'
    throw new Error(`[policy-branch-mega] strict sl mode label cannot be resolved for mode=${mode}.`)
}

function ensurePartSectionsMatchSelectedSlModeOrThrow(
    partSections: TableSectionDto[],
    slMode: PolicyBranchMegaSlMode
): TableSectionDto[] {
    if (slMode === 'all') {
        return partSections
    }

    const expectedLabel = resolveExpectedSlModeLabelOrThrow(slMode)
    const matchedSections: TableSectionDto[] = []
    const mismatchedTitles: string[] = []

    for (const section of partSections) {
        const actualLabel = resolveMegaSlModeLabelForSectionOrThrow(section)
        if (actualLabel === expectedLabel) {
            matchedSections.push(section)
            continue
        }

        mismatchedTitles.push(normalizePolicyBranchMegaTitle(section.title) || 'n/a')
    }

    if (matchedSections.length === 0) {
        throw new Error(
            `[policy-branch-mega] no part sections match selected slmode=${slMode}. expectedLabel=${expectedLabel}.`
        )
    }

    if (mismatchedTitles.length > 0) {
        const sample = mismatchedTitles.slice(0, 4).join(' | ')
        throw new Error(
            `[policy-branch-mega] mixed slmode payload detected inside merged part. selected=${slMode}, expectedLabel=${expectedLabel}, mismatchedTitles=${sample}.`
        )
    }

    return matchedSections
}

function resolveMergedMegaDescriptionForPart(
    part: number,
    slMode: PolicyBranchMegaSlMode,
    translate: (key: string, options?: Record<string, unknown>) => string
): string {
    const modePrefix =
        slMode === 'with-sl' ? translate('policyBranchMega.page.table.modePrefix.withSl')
        : slMode === 'no-sl' ? translate('policyBranchMega.page.table.modePrefix.noSl')
        : translate('policyBranchMega.page.table.modePrefix.all')

    if (part === 1) {
        return `${modePrefix}${translate('policyBranchMega.page.table.part1Description')}`
    }

    if (part === 2) {
        return `${modePrefix}${translate('policyBranchMega.page.table.part2Description')}`
    }

    if (part === 3) {
        return `${modePrefix}${translate('policyBranchMega.page.table.part3Description')}`
    }

    if (slMode === 'all') return `${modePrefix}${translate('policyBranchMega.page.table.mergedAllDescription')}`
    return `${modePrefix}${translate('policyBranchMega.page.table.mergedSelectedDescription')}`
}

function mergePolicyBranchMegaSectionsForPartOrThrow(
    partSections: TableSectionDto[],
    slMode: PolicyBranchMegaSlMode
): TableSectionDto {
    if (!partSections || partSections.length === 0) {
        throw new Error('[policy-branch-mega] cannot merge part sections: source list is empty.')
    }

    const scopedSections = ensurePartSectionsMatchSelectedSlModeOrThrow(partSections, slMode)
    const includeSlModeColumn = slMode === 'all'
    const mergedColumns: string[] = []
    const mergedColumnSet = new Set<string>()
    const mergedRowsByKey = new Map<string, Map<string, unknown>>()
    const rowOrder: string[] = []

    for (const [sectionIndex, section] of scopedSections.entries()) {
        const columns = section.columns ?? []
        const rows = section.rows ?? []
        if (columns.length === 0) {
            throw new Error(
                `[policy-branch-mega] section columns are empty while merging part. section=${section.title ?? 'n/a'}, index=${sectionIndex}.`
            )
        }

        const policyIdx = columns.indexOf('Policy')
        const branchIdx = columns.indexOf('Branch')
        if (policyIdx < 0 || branchIdx < 0) {
            throw new Error(
                `[policy-branch-mega] Policy/Branch columns are required for part merge. section=${section.title ?? 'n/a'}, index=${sectionIndex}.`
            )
        }

        const modeLabel = includeSlModeColumn ? resolveMegaSlModeLabelForSectionOrThrow(section) : null
        const sectionColumns = [...columns]
        if (includeSlModeColumn && !sectionColumns.includes(MEGA_SL_MODE_COLUMN_NAME)) {
            sectionColumns.splice(branchIdx + 1, 0, MEGA_SL_MODE_COLUMN_NAME)
        }

        for (const column of sectionColumns) {
            if (!mergedColumnSet.has(column)) {
                mergedColumnSet.add(column)
                mergedColumns.push(column)
            }
        }

        for (const [rowIndex, row] of rows.entries()) {
            if (!Array.isArray(row) || row.length < columns.length) {
                throw new Error(
                    `[policy-branch-mega] malformed row while merging part sections. section=${section.title ?? 'n/a'}, row=${rowIndex}.`
                )
            }

            const policy = String(row[policyIdx] ?? '')
            const branch = String(row[branchIdx] ?? '')
            if (!policy || !branch) {
                throw new Error(
                    `[policy-branch-mega] empty Policy/Branch while merging part sections. section=${section.title ?? 'n/a'}, row=${rowIndex}.`
                )
            }

            const rowKey = buildMegaRowKey(policy, branch, modeLabel)
            let mergedRow = mergedRowsByKey.get(rowKey)
            if (!mergedRow) {
                mergedRow = new Map<string, unknown>()
                mergedRowsByKey.set(rowKey, mergedRow)
                rowOrder.push(rowKey)
            }

            const sectionValueByColumn = new Map<string, unknown>()
            columns.forEach((column, columnIndex) => {
                sectionValueByColumn.set(column, row[columnIndex])
            })

            if (includeSlModeColumn) {
                sectionValueByColumn.set(MEGA_SL_MODE_COLUMN_NAME, modeLabel)
            }

            for (const column of sectionColumns) {
                if (!sectionValueByColumn.has(column)) {
                    throw new Error(
                        `[policy-branch-mega] section column value is missing during part merge. section=${section.title ?? 'n/a'}, row=${rowIndex}, column=${column}.`
                    )
                }

                const nextValue = sectionValueByColumn.get(column)
                const hasPrevValue = mergedRow.has(column)
                const prevValue = mergedRow.get(column)
                if (hasPrevValue && String(prevValue ?? '') !== String(nextValue ?? '')) {
                    throw new Error(
                        `[policy-branch-mega] conflicting merged part value detected. rowKey=${rowKey}, column=${column}, prev=${String(prevValue ?? '')}, next=${String(nextValue ?? '')}.`
                    )
                }

                mergedRow.set(column, nextValue)
            }
        }
    }

    const mergedRows = rowOrder.map((rowKey, rowIndex) => {
        const rowValues = mergedRowsByKey.get(rowKey)
        if (!rowValues) {
            throw new Error(`[policy-branch-mega] merged part row not found by key. rowKey=${rowKey}, row=${rowIndex}.`)
        }

        return mergedColumns.map(column => {
            if (!rowValues.has(column)) {
                throw new Error(
                    `[policy-branch-mega] merged part row is missing required column. rowKey=${rowKey}, column=${column}, row=${rowIndex}.`
                )
            }

            return String(rowValues.get(column) ?? '')
        })
    })

    return {
        ...scopedSections[0],
        title: resolveMergedMegaTitleForPartOrThrow(scopedSections, slMode),
        columns: mergedColumns,
        rows: mergedRows
    }
}

function mergePolicyBranchMegaSectionsByPartOrThrow(
    sections: TableSectionDto[],
    slMode: PolicyBranchMegaSlMode
): TableSectionDto[] {
    if (!sections || sections.length === 0) {
        throw new Error('[policy-branch-mega] cannot merge sections by part: source list is empty.')
    }

    const byPart = new Map<number, TableSectionDto[]>()
    for (const section of sections) {
        const part = resolveMegaPartNumberFromTitleOrThrow(section.title)
        const list = byPart.get(part) ?? []
        list.push(section)
        byPart.set(part, list)
    }

    const orderedParts = Array.from(byPart.keys()).sort((a, b) => a - b)
    if (orderedParts.length === 0) {
        throw new Error('[policy-branch-mega] no parts found after grouping sections.')
    }

    return orderedParts.map(part => {
        const partSections = byPart.get(part)
        if (!partSections || partSections.length === 0) {
            throw new Error(`[policy-branch-mega] grouped part sections are empty. part=${part}.`)
        }

        return mergePolicyBranchMegaSectionsForPartOrThrow(partSections, slMode)
    })
}

function buildPolicyBranchMegaSectionTermsOrThrow(section: TableSectionDto, locale: PolicyBranchMegaTermLocale) {
    const columns = section.columns ?? []
    if (columns.length === 0) {
        throw new Error('[policy-branch-mega] cannot build section terms: columns list is empty.')
    }

    return buildPolicyBranchMegaTermsForColumns(columns, {
        tooltipMode: 'description',
        locale
    })
}

// Нормализуем плейсхолдеры только для no-data метрик; формат SL-колонок приходит из backend DTO.
function applyNoDataMarkersToMegaSectionsOrThrow(sections: TableSectionDto[], noDataLabel: string): TableSectionDto[] {
    if (!sections || sections.length === 0) return sections

    const replacements: Array<{
        section: string
        rowIndex: number
        policy: string
        branch: string
        column: string
    }> = []

    const nextSections = sections.map(section => {
        const columns = section.columns ?? []
        const rows = section.rows ?? []

        const policyIdx = columns.indexOf('Policy')
        const branchIdx = columns.indexOf('Branch')
        const totalTradesIdx = columns.indexOf('Tr')
        const totalPnlIdx = columns.indexOf('TotalPnl%')
        const dynTradesIdx = columns.indexOf('DynTP/SL Tr')
        const dynPnlIdx = columns.indexOf('DynTP/SL PnL%')
        const statTradesIdx = columns.indexOf('StatTP/SL Tr')
        const statPnlIdx = columns.indexOf('StatTP/SL PnL%')

        if (policyIdx < 0 || branchIdx < 0 || totalTradesIdx < 0 || totalPnlIdx < 0) {
            return section
        }

        const nextRows = rows.map((row, rowIndex) => {
            const requiredIdx = Math.max(policyIdx, branchIdx, totalTradesIdx, totalPnlIdx)
            if (!row || row.length <= requiredIdx) {
                throw new Error(
                    `[policy-branch-mega] malformed row for no-data transform. section=${section.title ?? 'n/a'}, row=${rowIndex}.`
                )
            }

            const policy = row[policyIdx] ?? ''
            const branch = row[branchIdx] ?? ''
            if (!policy || !branch) {
                throw new Error(
                    `[policy-branch-mega] empty Policy/Branch in no-data transform. section=${section.title ?? 'n/a'}, row=${rowIndex}.`
                )
            }

            const nextRow = [...row]

            const totalTrades = parseNonNegativeIntOrThrow(nextRow[totalTradesIdx] ?? '', 'total.trades')
            if (totalTrades === 0) {
                const totalPnlValue = parseFiniteNumberOrNull(nextRow[totalPnlIdx])
                if (totalPnlValue === null || Math.abs(totalPnlValue) <= 1e-12) {
                    nextRow[totalPnlIdx] = noDataLabel
                    replacements.push({
                        section: section.title ?? 'n/a',
                        rowIndex,
                        policy,
                        branch,
                        column: 'TotalPnl%'
                    })
                } else {
                    throw new Error(
                        `[policy-branch-mega] total pnl must be zero/empty when trades are absent. section=${section.title ?? 'n/a'}, row=${rowIndex}, policy=${policy}, branch=${branch}, value=${nextRow[totalPnlIdx]}.`
                    )
                }
            }

            if (dynTradesIdx >= 0 && dynPnlIdx >= 0) {
                const dynTrades = parseNonNegativeIntOrThrow(nextRow[dynTradesIdx] ?? '', 'dynamic.trades')
                if (dynTrades === 0) {
                    const dynPnlValue = parseFiniteNumberOrNull(nextRow[dynPnlIdx])
                    if (dynPnlValue === null || Math.abs(dynPnlValue) <= 1e-12) {
                        nextRow[dynPnlIdx] = noDataLabel
                        replacements.push({
                            section: section.title ?? 'n/a',
                            rowIndex,
                            policy,
                            branch,
                            column: 'DynTP/SL PnL%'
                        })
                    } else {
                        throw new Error(
                            `[policy-branch-mega] dynamic pnl must be zero/empty when dynamic trades are absent. section=${section.title ?? 'n/a'}, row=${rowIndex}, policy=${policy}, branch=${branch}, value=${nextRow[dynPnlIdx]}.`
                        )
                    }
                }
            }

            if (statTradesIdx >= 0 && statPnlIdx >= 0) {
                const statTrades = parseNonNegativeIntOrThrow(nextRow[statTradesIdx] ?? '', 'static.trades')
                if (statTrades === 0) {
                    const statPnlValue = parseFiniteNumberOrNull(nextRow[statPnlIdx])
                    if (statPnlValue === null || Math.abs(statPnlValue) <= 1e-12) {
                        nextRow[statPnlIdx] = noDataLabel
                        replacements.push({
                            section: section.title ?? 'n/a',
                            rowIndex,
                            policy,
                            branch,
                            column: 'StatTP/SL PnL%'
                        })
                    } else {
                        throw new Error(
                            `[policy-branch-mega] static pnl must be zero/empty when static trades are absent. section=${section.title ?? 'n/a'}, row=${rowIndex}, policy=${policy}, branch=${branch}, value=${nextRow[statPnlIdx]}.`
                        )
                    }
                }
            }

            return nextRow
        })

        return {
            ...section,
            rows: nextRows
        }
    })

    if (replacements.length > 0) {
        console.error('[policy-branch-mega] no-data placeholders were normalized.', {
            replacementsCount: replacements.length,
            sample: replacements.slice(0, 12)
        })
    }

    return nextSections
}

export default function PolicyBranchMegaPage({ className }: PolicyBranchMegaPageProps) {
    const { t, i18n } = useTranslation('reports')
    const [searchParams, setSearchParams] = useSearchParams()
    const { data, isError, error, refetch } = usePolicyBranchMegaReportWithFreshnessQuery()
    const report = data?.report ?? null
    const freshness = data?.freshness ?? null
    const termsLocale = useMemo(() => resolvePolicyBranchMegaTermLocale(i18n.language), [i18n.language])

    const tableSections = useMemo(() => buildTableSections(report?.sections ?? []), [report])

    const resolvedSections = useMemo(() => {
        if (!report) return { sections: [] as TableSectionDto[], error: null as Error | null }

        try {
            return {
                sections: orderPolicyBranchMegaSectionsOrThrow(tableSections),
                error: null
            }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse policy branch mega sections.')
            return {
                sections: [] as TableSectionDto[],
                error: safeError
            }
        }
    }, [report, tableSections])

    const bucketState = useMemo(() => {
        try {
            const bucket = resolvePolicyBranchMegaBucketFromQuery(
                searchParams.get('bucket'),
                DEFAULT_REPORT_BUCKET_MODE
            )
            return { value: bucket, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse policy branch mega bucket query.')
            return { value: DEFAULT_REPORT_BUCKET_MODE, error: safeError }
        }
    }, [searchParams])

    const metricState = useMemo(() => {
        try {
            const metric = resolvePolicyBranchMegaMetricFromQuery(
                searchParams.get('metric'),
                DEFAULT_REPORT_METRIC_MODE
            )
            return { value: metric, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse policy branch mega metric query.')
            return { value: DEFAULT_REPORT_METRIC_MODE, error: safeError }
        }
    }, [searchParams])

    const tpSlState = useMemo(() => {
        try {
            const mode = resolvePolicyBranchMegaTpSlModeFromQuery(searchParams.get('tpsl'), DEFAULT_REPORT_TP_SL_MODE)
            return { value: mode, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse policy branch mega tpsl query.')
            return { value: DEFAULT_REPORT_TP_SL_MODE, error: safeError }
        }
    }, [searchParams])

    const slModeState = useMemo(() => {
        try {
            const mode = resolvePolicyBranchMegaSlModeFromQuery(searchParams.get('slmode'), DEFAULT_REPORT_SL_MODE)
            return { value: mode, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse policy branch mega slmode query.')
            return { value: DEFAULT_REPORT_SL_MODE, error: safeError }
        }
    }, [searchParams])

    const zonalState = useMemo(() => {
        try {
            const mode = resolvePolicyBranchMegaZonalModeFromQuery(searchParams.get('zonal'), DEFAULT_REPORT_ZONAL_MODE)
            return { value: mode, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse policy branch mega zonal query.')
            return { value: DEFAULT_REPORT_ZONAL_MODE, error: safeError }
        }
    }, [searchParams])

    const filteredSectionsState = useMemo(() => {
        if (!report) return { sections: [] as TableSectionDto[], error: null as Error | null }
        if (resolvedSections.error) {
            return { sections: [] as TableSectionDto[], error: resolvedSections.error }
        }
        if (zonalState.error) {
            return { sections: [] as TableSectionDto[], error: zonalState.error }
        }
        if (slModeState.error) {
            return { sections: [] as TableSectionDto[], error: slModeState.error }
        }
        if (tpSlState.error) {
            return { sections: [] as TableSectionDto[], error: tpSlState.error }
        }
        if (bucketState.error) {
            return { sections: [] as TableSectionDto[], error: bucketState.error }
        }

        try {
            const byZonal = filterPolicyBranchMegaSectionsByZonalModeOrThrow(
                resolvedSections.sections,
                zonalState.value
            )
            const bySlMode = filterPolicyBranchMegaSectionsBySlModeOrThrow(byZonal, slModeState.value)
            const byTpSlMode = filterPolicyBranchMegaSectionsByTpSlModeOrThrow(bySlMode, tpSlState.value)
            const byBucket = filterPolicyBranchMegaSectionsByBucketOrThrow(byTpSlMode, bucketState.value)
            return {
                sections: byBucket,
                error: null as Error | null
            }
        } catch (err) {
            const safeError =
                err instanceof Error ? err : (
                    new Error('Failed to filter policy branch mega sections by zonal/slmode/tpsl/bucket.')
                )
            return { sections: [] as TableSectionDto[], error: safeError }
        }
    }, [
        report,
        resolvedSections,
        zonalState.error,
        zonalState.value,
        slModeState.error,
        slModeState.value,
        tpSlState.error,
        tpSlState.value,
        bucketState.error,
        bucketState.value
    ])

    const mergedSectionsState = useMemo(() => {
        if (!report) return { sections: [] as TableSectionDto[], error: null as Error | null }
        if (filteredSectionsState.error) {
            return { sections: [] as TableSectionDto[], error: filteredSectionsState.error }
        }
        if (metricState.error) {
            return { sections: [] as TableSectionDto[], error: metricState.error }
        }

        try {
            const byMetric = filterPolicyBranchMegaSectionsByMetricOrThrow(
                filteredSectionsState.sections,
                metricState.value
            )
            const noDataAwareSections = applyNoDataMarkersToMegaSectionsOrThrow(
                byMetric,
                t('policyBranchMega.page.noDataPlaceholder')
            )
            // Делаем ровно 3 таблицы (PART 1/2/3), а в all-режиме объединяем WITH/NO SL внутри каждой части.
            const mergedSections = mergePolicyBranchMegaSectionsByPartOrThrow(noDataAwareSections, slModeState.value)

            return {
                sections: mergedSections,
                error: null
            }
        } catch (err) {
            const safeError =
                err instanceof Error ? err : (
                    new Error('Failed to filter policy branch mega sections by zonal/slmode/tpsl/bucket/metric.')
                )
            return { sections: [] as TableSectionDto[], error: safeError }
        }
    }, [
        report,
        filteredSectionsState,
        metricState.error,
        metricState.value,
        slModeState.value,
        t
    ])

    const visibleSectionsState = useMemo(() => {
        if (mergedSectionsState.error) {
            return { sections: [] as TableSectionDto[], error: mergedSectionsState.error }
        }
        if (mergedSectionsState.sections.length === 0) {
            return { sections: [] as TableSectionDto[], error: null as Error | null }
        }

        try {
            return {
                sections: filterMegaSectionsColumnsByBucketOrThrow(mergedSectionsState.sections, bucketState.value),
                error: null as Error | null
            }
        } catch (err) {
            const safeError =
                err instanceof Error ? err : new Error('Failed to filter policy branch mega visible columns by bucket.')

            return {
                sections: [] as TableSectionDto[],
                error: safeError
            }
        }
    }, [mergedSectionsState.error, mergedSectionsState.sections, bucketState.value])

    const sectionTermsState = useMemo(() => {
        if (visibleSectionsState.sections.length === 0) {
            return {
                termsByIndex: [] as Array<ReturnType<typeof getPolicyBranchMegaTermOrThrow>[]>,
                error: null as Error | null
            }
        }

        try {
            return {
                termsByIndex: visibleSectionsState.sections.map(section =>
                    buildPolicyBranchMegaSectionTermsOrThrow(section, termsLocale)
                ),
                error: null as Error | null
            }
        } catch (err) {
            const safeError =
                err instanceof Error ? err : new Error('Failed to build policy branch mega section terms.')
            return {
                termsByIndex: [] as Array<ReturnType<typeof getPolicyBranchMegaTermOrThrow>[]>,
                error: safeError
            }
        }
    }, [visibleSectionsState.sections, termsLocale])

    const pageTabs = useMemo(
        () => buildPolicyBranchMegaTabsFromSections(visibleSectionsState.sections),
        [visibleSectionsState.sections]
    )

    // Нужен для hash-навигации из sidebar: поддерживаем и таблицы, и блоки объяснения терминов.
    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections: pageTabs,
        syncHash: true
    })

    const metricDiffState = useMemo(() => {
        if (!report || filteredSectionsState.error) {
            return null
        }

        try {
            const realSections = filterPolicyBranchMegaSectionsByMetricOrThrow(filteredSectionsState.sections, 'real')
            const noBigSections = filterPolicyBranchMegaSectionsByMetricOrThrow(
                filteredSectionsState.sections,
                'no-biggest-liq-loss'
            )

            const comparableSections = Math.min(realSections.length, noBigSections.length)
            if (comparableSections === 0) {
                return { changedRows: 0, totalRows: 0 }
            }

            let changedRows = 0
            let totalRows = 0

            for (let sectionIndex = 0; sectionIndex < comparableSections; sectionIndex++) {
                const realRows = realSections[sectionIndex].rows ?? []
                const noBigRows = noBigSections[sectionIndex].rows ?? []
                const comparableRows = Math.min(realRows.length, noBigRows.length)

                totalRows += comparableRows

                for (let rowIndex = 0; rowIndex < comparableRows; rowIndex++) {
                    if (rowFingerprint(realRows[rowIndex]) !== rowFingerprint(noBigRows[rowIndex])) {
                        changedRows += 1
                    }
                }
            }

            return { changedRows, totalRows }
        } catch {
            return null
        }
    }, [report, filteredSectionsState])

    const generatedAtState = useMemo(() => {
        if (!report) return { value: null as Date | null, error: null as Error | null }

        if (!report.generatedAtUtc) {
            return {
                value: null,
                error: new Error('[policy-branch-mega] generatedAtUtc is missing.')
            }
        }

        const parsed = new Date(report.generatedAtUtc)
        if (Number.isNaN(parsed.getTime())) {
            return {
                value: null,
                error: new Error(`[policy-branch-mega] generatedAtUtc is invalid: ${report.generatedAtUtc}`)
            }
        }

        return { value: parsed, error: null }
    }, [report])

    const rootClassName = classNames(cls.root, {}, [className ?? ''])

    const renderedColumnTitles = useMemo(() => {
        const uniqueColumns = new Set<string>()

        visibleSectionsState.sections.forEach(section => {
            ;(section.columns ?? []).forEach(column => {
                uniqueColumns.add(column)
            })
        })

        const cachedTitles = new Map<string, ReturnType<typeof renderTermTooltipTitle>>()
        uniqueColumns.forEach(column => {
            const term = getPolicyBranchMegaTermOrThrow(column, {
                tooltipMode: 'description',
                locale: termsLocale
            })
            cachedTitles.set(
                column,
                renderTermTooltipTitle(column, renderTermTooltipRichText(term.tooltip, { excludeTerms: [column] }))
            )
        })

        return cachedTitles
    }, [visibleSectionsState.sections, termsLocale])

    const renderColumnTitle = useCallback(
        (title: string) => {
            const cachedTitle = renderedColumnTitles.get(title)
            if (cachedTitle) {
                return cachedTitle
            }

            const term = getPolicyBranchMegaTermOrThrow(title, {
                tooltipMode: 'description',
                locale: termsLocale
            })

            return renderTermTooltipTitle(title, renderTermTooltipRichText(term.tooltip, { excludeTerms: [title] }))
        },
        [renderedColumnTitles, termsLocale]
    )

    const handleBucketChange = (next: PolicyBranchMegaBucketMode) => {
        if (next === bucketState.value) return
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('bucket', next)
        setSearchParams(nextParams, { replace: true })
    }

    const handleMetricChange = (next: PolicyBranchMegaMetricMode) => {
        if (next === metricState.value) return
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('metric', next)
        setSearchParams(nextParams, { replace: true })
    }

    const handleTpSlModeChange = (next: PolicyBranchMegaTpSlMode) => {
        if (next === tpSlState.value) return
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('tpsl', next)
        setSearchParams(nextParams, { replace: true })
    }

    const handleSlModeChange = (next: PolicyBranchMegaSlMode) => {
        if (next === slModeState.value) return
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('slmode', next)
        setSearchParams(nextParams, { replace: true })
    }

    const handleZonalModeChange = (next: PolicyBranchMegaZonalMode) => {
        if (next === zonalState.value) return
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('zonal', next)
        setSearchParams(nextParams, { replace: true })
    }

    const sourceEndpointState = useMemo(() => {
        try {
            return {
                value: resolveReportSourceEndpointOrThrow(),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to resolve report source endpoint.')
            return {
                value: null as string | null,
                error: safeError
            }
        }
    }, [])

    const metricDiffMessage = useMemo(() => {
        if (!metricDiffState) return null

        if (metricDiffState.totalRows === 0) {
            return t('policyBranchMega.page.metricDiff.noRows')
        }

        if (metricDiffState.changedRows === 0) {
            return t('policyBranchMega.page.metricDiff.noChanges')
        }

        return t('policyBranchMega.page.metricDiff.changedRows', {
            changed: metricDiffState.changedRows,
            total: metricDiffState.totalRows
        })
    }, [metricDiffState, t])

    const renderHeader = (generatedUtc: Date) => (
        <header className={cls.hero}>
            <div>
                <Text type='h1' className={cls.heroTitle}>
                    {t('policyBranchMega.page.title')}
                </Text>
                <Text className={cls.heroSubtitle}>{t('policyBranchMega.page.subtitle')}</Text>

                <ReportViewControls
                    bucket={bucketState.value}
                    metric={metricState.value}
                    tpSlMode={tpSlState.value}
                    slMode={slModeState.value}
                    zonalMode={zonalState.value}
                    capabilities={{
                        supportsBucketFiltering: true,
                        supportsMetricFiltering: true,
                        supportsTpSlFiltering: true,
                        supportsSlModeFiltering: true,
                        supportsZonalFiltering: true
                    }}
                    onBucketChange={handleBucketChange}
                    onMetricChange={handleMetricChange}
                    onTpSlModeChange={handleTpSlModeChange}
                    onSlModeChange={handleSlModeChange}
                    onZonalModeChange={handleZonalModeChange}
                    metricDiffMessage={metricDiffMessage}
                />
            </div>

            <ReportActualStatusCard
                statusMode={freshness?.sourceMode === 'actual' ? 'actual' : 'debug'}
                statusTitle={
                    freshness?.sourceMode === 'actual' ?
                        t('policyBranchMega.page.status.actualTitle')
                    :   t('policyBranchMega.page.status.debugTitle')
                }
                statusMessage={freshness?.message}
                statusLagMinutes={freshness?.lagSeconds && freshness.lagSeconds > 0 ? freshness.lagSeconds / 60 : null}
                dataSource={sourceEndpointState.value!}
                reportTitle={report!.title}
                reportId={report!.id}
                reportKind={report!.kind}
                generatedAtUtc={report!.generatedAtUtc}
                statusLines={[
                    ...(freshness?.policyBranchMegaId ?
                        [
                            {
                                label: t('policyBranchMega.page.statusLines.policyBranchMegaId'),
                                value: freshness.policyBranchMegaId
                            }
                        ]
                    :   []),
                    ...(freshness?.diagnosticsId ?
                        [
                            {
                                label: t('policyBranchMega.page.statusLines.diagnosticsId'),
                                value: freshness.diagnosticsId
                            }
                        ]
                    :   []),
                    ...(freshness?.policyBranchMegaGeneratedAtUtc ?
                        [
                            {
                                label: t('policyBranchMega.page.statusLines.policyBranchMegaGeneratedAt'),
                                value: freshness.policyBranchMegaGeneratedAtUtc
                            }
                        ]
                    :   []),
                    ...(freshness?.diagnosticsGeneratedAtUtc ?
                        [
                            {
                                label: t('policyBranchMega.page.statusLines.diagnosticsGeneratedAt'),
                                value: freshness.diagnosticsGeneratedAtUtc
                            }
                        ]
                    :   [])
                ]}
            />
        </header>
    )

    let content: JSX.Element | null = null

    if (report) {
        if (generatedAtState.error || !generatedAtState.value) {
            const error =
                generatedAtState.error ?? new Error('[policy-branch-mega] generatedAtUtc is missing after validation.')

            content = (
                <PageError
                    title={t('policyBranchMega.page.errors.invalidGeneratedAt.title')}
                    message={t('policyBranchMega.page.errors.invalidGeneratedAt.message')}
                    error={error}
                    onRetry={refetch}
                />
            )
        } else if (sourceEndpointState.error || !sourceEndpointState.value) {
            const error =
                sourceEndpointState.error ??
                new Error('[policy-branch-mega] report source endpoint is missing after validation.')

            content = (
                <PageError
                    title={t('policyBranchMega.page.errors.invalidSource.title')}
                    message={t('policyBranchMega.page.errors.invalidSource.message')}
                    error={error}
                    onRetry={refetch}
                />
            )
        } else if (bucketState.error) {
            content = (
                <PageError
                    title={t('policyBranchMega.page.errors.bucketQuery.title')}
                    message={t('policyBranchMega.page.errors.bucketQuery.message')}
                    error={bucketState.error}
                    onRetry={refetch}
                />
            )
        } else if (metricState.error) {
            content = (
                <PageError
                    title={t('policyBranchMega.page.errors.metricQuery.title')}
                    message={t('policyBranchMega.page.errors.metricQuery.message')}
                    error={metricState.error}
                    onRetry={refetch}
                />
            )
        } else if (tpSlState.error) {
            content = (
                <PageError
                    title={t('policyBranchMega.page.errors.tpSlQuery.title')}
                    message={t('policyBranchMega.page.errors.tpSlQuery.message')}
                    error={tpSlState.error}
                    onRetry={refetch}
                />
            )
        } else if (slModeState.error) {
            content = (
                <PageError
                    title={t('policyBranchMega.page.errors.slModeQuery.title')}
                    message={t('policyBranchMega.page.errors.slModeQuery.message')}
                    error={slModeState.error}
                    onRetry={refetch}
                />
            )
        } else if (zonalState.error) {
            content = (
                <PageError
                    title={t('policyBranchMega.page.errors.zonalQuery.title')}
                    message={t('policyBranchMega.page.errors.zonalQuery.message')}
                    error={zonalState.error}
                    onRetry={refetch}
                />
            )
        } else if (resolvedSections.error) {
            content = (
                <PageError
                    title={t('policyBranchMega.page.errors.structure.title')}
                    message={t('policyBranchMega.page.errors.structure.message')}
                    error={resolvedSections.error}
                    onRetry={refetch}
                />
            )
        } else if (mergedSectionsState.error) {
            const generatedUtc = generatedAtState.value
            const isMetricMissing = mergedSectionsState.error.message.includes(
                '[policy-branch-mega] no sections found for metric='
            )

            if (generatedUtc && isMetricMissing) {
                content = (
                    <div className={rootClassName}>
                        {renderHeader(generatedUtc)}
                        <PageError
                            title={t('policyBranchMega.page.errors.sections.title')}
                            message={t('policyBranchMega.page.errors.sections.message')}
                            error={mergedSectionsState.error}
                            onRetry={refetch}
                        />
                    </div>
                )
            } else {
                content = (
                    <PageError
                        title={t('policyBranchMega.page.errors.sections.title')}
                        message={t('policyBranchMega.page.errors.sections.message')}
                        error={mergedSectionsState.error}
                        onRetry={refetch}
                    />
                )
            }
        } else if (sectionTermsState.error) {
            content = (
                <PageError
                    title={t('policyBranchMega.page.errors.terms.title')}
                    message={t('policyBranchMega.page.errors.terms.message')}
                    error={sectionTermsState.error}
                    onRetry={refetch}
                />
            )
        } else if (visibleSectionsState.error) {
            content = (
                <PageError
                    title={t('policyBranchMega.page.errors.columnsVisibility.title')}
                    message={t('policyBranchMega.page.errors.columnsVisibility.message')}
                    error={visibleSectionsState.error}
                    onRetry={refetch}
                />
            )
        } else if (mergedSectionsState.sections.length === 0) {
            content = <Text>{t('policyBranchMega.page.emptyFiltered')}</Text>
        } else if (visibleSectionsState.sections.length === 0) {
            content = <Text>{t('policyBranchMega.page.emptyColumns')}</Text>
        } else if (resolvedSections.sections.length === 0) {
            content = <Text>{t('policyBranchMega.page.empty')}</Text>
        } else {
            const generatedUtc = generatedAtState.value

            content = (
                <div className={rootClassName}>
                    {renderHeader(generatedUtc)}

                    <section className={cls.overviewBlock} id={MEGA_OVERVIEW_DOM_ID}>
                        <Text type='h3' className={cls.overviewTitle}>
                            {t('policyBranchMega.page.overview.whatIsReport.title')}
                        </Text>
                        <ul className={cls.overviewList}>
                            <li>{t('policyBranchMega.page.overview.whatIsReport.items.item1')}</li>
                            <li>{t('policyBranchMega.page.overview.whatIsReport.items.item2')}</li>
                            <li>{t('policyBranchMega.page.overview.whatIsReport.items.item3')}</li>
                        </ul>

                        <Text type='h4' className={cls.overviewSubTitle}>
                            {t('policyBranchMega.page.overview.comparison.title')}
                        </Text>
                        <ul className={cls.overviewList}>
                            <li>
                                {renderTermTooltipRichText(t('policyBranchMega.page.overview.comparison.items.policy'))}
                            </li>
                            <li>
                                {renderTermTooltipRichText(t('policyBranchMega.page.overview.comparison.items.branch'))}
                            </li>
                            <li>
                                {renderTermTooltipRichText(t('policyBranchMega.page.overview.comparison.items.slMode'))}
                                <br />
                                {renderTermTooltipRichText(
                                    t('policyBranchMega.page.overview.comparison.items.tpSlMode')
                                )}
                                <br />
                                {renderTermTooltipRichText(t('policyBranchMega.page.overview.comparison.items.zonal'))}
                                <br />
                                {renderTermTooltipRichText(
                                    t('policyBranchMega.page.overview.comparison.items.metricView')
                                )}
                                <br />
                                {renderTermTooltipRichText(t('policyBranchMega.page.overview.comparison.items.bucket'))}
                            </li>
                        </ul>

                        <Text type='h4' className={cls.overviewSubTitle}>
                            {t('policyBranchMega.page.overview.reading.title')}
                        </Text>
                        <ul className={cls.overviewList}>
                            <li>
                                {renderTermTooltipRichText(t('policyBranchMega.page.overview.reading.items.item1'))}
                            </li>
                            <li>
                                {renderTermTooltipRichText(t('policyBranchMega.page.overview.reading.items.item2'))}
                            </li>
                            <li>
                                {renderTermTooltipRichText(t('policyBranchMega.page.overview.reading.items.item3'))}
                            </li>
                        </ul>

                        <Text type='h4' className={cls.overviewSubTitle}>
                            {t('policyBranchMega.page.overview.basics.title')}
                        </Text>
                        <ul className={cls.overviewList}>
                            <li>{renderTermTooltipRichText(t('policyBranchMega.page.overview.basics.items.item1'))}</li>
                            <li>{renderTermTooltipRichText(t('policyBranchMega.page.overview.basics.items.item2'))}</li>
                            <li>{renderTermTooltipRichText(t('policyBranchMega.page.overview.basics.items.item3'))}</li>
                            <li>{renderTermTooltipRichText(t('policyBranchMega.page.overview.basics.items.item4'))}</li>
                            <li>{renderTermTooltipRichText(t('policyBranchMega.page.overview.basics.items.item5'))}</li>
                            <li>{renderTermTooltipRichText(t('policyBranchMega.page.overview.basics.items.item6'))}</li>
                        </ul>

                        <Text type='h4' className={cls.overviewSubTitle}>
                            {t('policyBranchMega.page.overview.simulation.title')}
                        </Text>
                        <ul className={cls.overviewList}>
                            <li>{t('policyBranchMega.page.overview.simulation.items.item1')}</li>
                            <li>
                                {renderTermTooltipRichText(t('policyBranchMega.page.overview.simulation.items.item2'))}
                            </li>
                            <li>{t('policyBranchMega.page.overview.simulation.items.item3')}</li>
                            <li>
                                {t('policyBranchMega.page.overview.simulation.items.item4Prefix')}{' '}
                                <TermTooltip
                                    term='EndOfDay'
                                    description={enrichTermTooltipDescription(
                                        t('policyBranchMega.page.overview.simulation.endOfDayTooltip'),
                                        { term: 'EndOfDay' }
                                    )}
                                    type='span'
                                />
                                .
                            </li>
                        </ul>
                    </section>

                    <div className={cls.sectionsGrid}>
                        {visibleSectionsState.sections.map((section, index) => {
                            const part = resolveMegaPartNumberFromTitleOrThrow(section.title)
                            const tableDomId = buildPolicyBranchMegaTableSectionAnchor(part)
                            const termsDomId = buildPolicyBranchMegaTermsSectionAnchor(part)
                            const sectionTerms = sectionTermsState.termsByIndex[index]
                            if (!sectionTerms || sectionTerms.length === 0) {
                                throw new Error(
                                    `[policy-branch-mega] section terms are missing after build. part=${part}, index=${index}.`
                                )
                            }

                            return (
                                <SectionErrorBoundary
                                    key={`${section.title}-${index}`}
                                    name={`PolicyBranchMega:${section.title ?? index}`}>
                                    <div className={cls.sectionBlock}>
                                        <div id={termsDomId}>
                                            <ReportTableTermsBlock
                                                terms={sectionTerms}
                                                enhanceDomainTerms
                                                showTermTitleTooltip={false}
                                                title={t('policyBranchMega.page.terms.title', { part })}
                                                subtitle={t('policyBranchMega.page.terms.subtitle', { part })}
                                                className={cls.termsBlock}
                                            />
                                        </div>

                                        <div id={tableDomId}>
                                            <ReportTableCard
                                                title={
                                                    normalizePolicyBranchMegaTitle(section.title) ||
                                                    t('policyBranchMega.page.table.titleFallback', { part })
                                                }
                                                description={resolveMergedMegaDescriptionForPart(
                                                    part,
                                                    slModeState.value,
                                                    (key, options) => t(key, options)
                                                )}
                                                columns={section.columns ?? []}
                                                rows={section.rows ?? []}
                                                domId={`${tableDomId}-table`}
                                                renderColumnTitle={renderColumnTitle}
                                            />
                                        </div>
                                    </div>
                                </SectionErrorBoundary>
                            )
                        })}
                    </div>

                    {pageTabs.length > 1 && (
                        <SectionPager
                            sections={pageTabs}
                            currentIndex={currentIndex}
                            canPrev={canPrev}
                            canNext={canNext}
                            onPrev={handlePrev}
                            onNext={handleNext}
                        />
                    )}
                </div>
            )
        }
    }

    return (
        <PageDataBoundary
            isError={isError}
            error={error}
            hasData={Boolean(report)}
            onRetry={refetch}
            errorTitle={t('policyBranchMega.page.errorTitle')}>
            {content}
        </PageDataBoundary>
    )
}
