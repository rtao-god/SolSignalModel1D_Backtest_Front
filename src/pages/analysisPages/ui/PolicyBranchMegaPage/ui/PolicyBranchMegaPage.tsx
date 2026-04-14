import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useQueries, useQueryClient } from '@tanstack/react-query'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'
import classNames from '@/shared/lib/helpers/classNames'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'
import {
    Link,
    ReportActualStatusCard,
    ReportTableTermsBlock,
    ReportViewControls,
    type ReportViewControlGroup,
    TermTooltip,
    Text,
    buildMegaHistoryControlGroup,
    buildMegaBucketControlGroup,
    buildMegaMetricControlGroup,
    buildMegaTotalBucketViewControlGroup,
    buildMegaSlModeControlGroup,
    buildMegaTpSlControlGroup,
    buildMegaZonalControlGroup
} from '@/shared/ui'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPagerPartWindow } from '@/shared/ui/SectionPager/model/useSectionPagerPartWindow'
import { scrollToAnchor } from '@/shared/ui/SectionPager/lib/scrollToAnchor'
import type { TableSectionDto } from '@/shared/types/report.types'
import type { PolicyRowEvaluationMapDto } from '@/shared/types/policyEvaluation.types'
import { ReportTableCard } from '@/shared/ui/ReportTableCard'
import {
    enrichTermTooltipDescription,
    renderTermTooltipRichText,
    renderTermTooltipTitle
} from '@/shared/ui/TermTooltip'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import {
    DEFAULT_POLICY_BRANCH_MEGA_HISTORY_MODE,
    DEFAULT_POLICY_BRANCH_MEGA_BUCKET_MODE,
    DEFAULT_POLICY_BRANCH_MEGA_METRIC_MODE,
    DEFAULT_POLICY_BRANCH_MEGA_SL_MODE,
    DEFAULT_POLICY_BRANCH_MEGA_TOTAL_BUCKET_VIEW,
    DEFAULT_POLICY_BRANCH_MEGA_TP_SL_MODE,
    DEFAULT_POLICY_BRANCH_MEGA_ZONAL_MODE,
    buildPolicyBranchMegaPayloadQueryOptions,
    type PolicyBranchMegaPredictionQualityMetricDto,
    usePolicyBranchMegaModeMoneySummaryQuery,
    type PolicyBranchMegaReportPayloadDto,
    usePolicyBranchMegaEvaluationQuery,
    usePolicyBranchMegaReportNavQuery,
    usePolicyBranchMegaValidationQuery
} from '@/shared/api/tanstackQueries/policyBranchMega'
import { useCurrentPredictionBackfilledTrainingScopeStatsQuery } from '@/shared/api/tanstackQueries/currentPrediction'
import {
    getPublishedReportVariantAxisOptionValues,
    PUBLISHED_REPORT_VARIANT_FAMILIES,
    usePublishedReportVariantSelectionQuery
} from '@/shared/api/tanstackQueries/reportVariants'
import {
    buildPolicyBranchMegaTermReferencesForColumns,
    getPolicyBranchMegaTerm,
    orderPolicyBranchMegaSections,
    resolvePolicyBranchMegaTermLocale,
    type PolicyBranchMegaTermLocale,
    type PolicyBranchMegaTermReference
} from '@/shared/utils/policyBranchMegaTerms'
import {
    buildPolicyBranchMegaTabsFromSections,
    buildPolicyBranchMegaTableSectionAnchor,
    buildPolicyBranchMegaTermsSectionAnchor,
    normalizePolicyBranchMegaTitle,
    resolvePolicyBranchMegaHistoryFromQuery,
    resolvePolicyBranchMegaBucketFromTitle,
    resolvePolicyBranchMegaBucketFromQuery,
    resolvePolicyBranchMegaBucketLabel,
    resolvePolicyBranchMegaMetricFromQuery,
    resolvePolicyBranchMegaModeFromTitle,
    resolvePolicyBranchMegaSlModeFromQuery,
    resolvePolicyBranchMegaTotalBucketViewFromQuery,
    resolvePolicyBranchMegaTpSlModeFromQuery,
    resolvePolicyBranchMegaZonalModeFromQuery,
    resolvePolicyBranchMegaAnchorTarget,
    type PolicyBranchMegaHistoryMode,
    type PolicyBranchMegaBucketMode,
    type PolicyBranchMegaTotalBucketView,
    type PolicyBranchMegaMetricMode,
    type PolicyBranchMegaSlMode,
    type PolicyBranchMegaTpSlMode,
    type PolicyBranchMegaZonalMode
} from '@/shared/utils/policyBranchMegaTabs'
import { resolveReportSourceEndpoint } from '@/shared/utils/reportSourceEndpoint'
import { buildSelfTooltipExclusions } from '@/shared/ui/ReportTableTermsBlock/model/reportTableTermsBlock'
import { buildBacktestDiagnosticsSearchFromSearchParams } from '@/shared/utils/backtestDiagnosticsQuery'
import {
    assertPolicyBranchMegaPrimaryProfitColumns,
    resolvePolicyBranchMegaPrimaryProfitColumn
} from '@/shared/utils/policyBranchMegaProfitColumns'
import {
    buildReportColumnContractDescriptors,
    type ReportColumnContractDescriptor
} from '@/shared/utils/reportColumnKeys'
import { pruneDuplicatePolicyMarginColumns } from '@/shared/utils/reportPolicyMarginMode'
import cls from './PolicyBranchMegaPage.module.scss'
import type { PolicyBranchMegaPageProps } from './types'
import PolicyBranchMegaChartExplorer from './PolicyBranchMegaChartExplorer'
import { buildPolicyBranchMegaChartModel } from '../model/policyBranchMegaChartModel'
import {
    resolveMegaRenderedRowKey,
    resolvePolicySetupCellStateForMegaRow,
    resolvePolicySetupLinkAlertSummaryForMegaRows
} from '../model/policyBranchMegaPolicySetupLink'
import { PageDataState, PageSectionDataState } from '@/shared/ui/errors/PageDataState'

function buildTableSections(sections: unknown[]): TableSectionDto[] {
    const tableSections = (sections ?? []).filter(
        (section): section is TableSectionDto =>
            Array.isArray((section as TableSectionDto).columns) && (section as TableSectionDto).columns!.length > 0
    )

    return pruneDuplicatePolicyMarginColumns(tableSections)
}

// Счетчики сделок участвуют в merged-view логике и должны оставаться целыми неотрицательными значениями.
function parseNonNegativeInt(raw: string, label: string): number {
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

function requireModeMoneyNumber(value: number, label: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(
            `[policy-branch-mega] mode-money metric is invalid during render. owner=mode-money-summary; expected=finite ${label}; actual=${String(value)}; requiredAction=fix API mapper or rebuild mode money summary artifacts.`
        )
    }

    return value
}

function formatModeMoneyInteger(value: number, language: string, label: string): string {
    const resolved = requireModeMoneyNumber(value, label)
    if (!Number.isInteger(resolved)) {
        throw new Error(
            `[policy-branch-mega] mode-money metric is not an integer during render. owner=mode-money-summary; expected=integer ${label}; actual=${resolved}; requiredAction=fix API mapper or rebuild mode money summary artifacts.`
        )
    }

    return new Intl.NumberFormat(language, {
        maximumFractionDigits: 0
    }).format(resolved)
}

function formatModeMoneyDecimal(
    value: number,
    language: string,
    label: string,
    maximumFractionDigits = 2
): string {
    const resolved = requireModeMoneyNumber(value, label)

    return new Intl.NumberFormat(language, {
        minimumFractionDigits: 0,
        maximumFractionDigits
    }).format(resolved)
}

function formatModeMoneyPercent(value: number, language: string, label: string): string {
    return `${formatModeMoneyDecimal(value, language, label, 2)}%`
}

function formatModeMoneyUsd(value: number, language: string, label: string): string {
    const resolved = requireModeMoneyNumber(value, label)

    return new Intl.NumberFormat(language, {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(resolved)
}

function formatModeMoneyDate(value: string, label: string): string {
    if (!value.trim()) {
        throw new Error(
            `[policy-branch-mega] mode-money row is missing trading date during render. owner=mode-money-summary; expected=non-empty ${label}; actual=empty; requiredAction=fix API mapper or rebuild mode money summary artifacts.`
        )
    }

    return value
}

function resolveModeMoneyPredictionQualityLabel(
    metricKey: string,
    translate: (key: string) => string
): string {
    switch (metricKey) {
        case 'technical_accuracy_pct':
            return translate('policyBranchMega.page.modeMoneySummary.predictionQuality.technicalAccuracy')
        case 'business_accuracy_pct':
            return translate('policyBranchMega.page.modeMoneySummary.predictionQuality.businessAccuracy')
        case 'timing_late_correct_count':
            return translate('policyBranchMega.page.modeMoneySummary.predictionQuality.lateCorrectDays')
        case 'timing_late_pending_count':
            return translate('policyBranchMega.page.modeMoneySummary.predictionQuality.latePendingDays')
        case 'tbm_hit_rate_pct':
            return translate('policyBranchMega.page.modeMoneySummary.predictionQuality.tbmHitRate')
        default:
            throw new Error(
                `[policy-branch-mega] mode-money prediction-quality metric is not supported by the UI. owner=mode-money-summary; expected=known metric key; actual=${metricKey}; requiredAction=extend the owner table presentation intentionally instead of rendering an unknown metric blindly.`
            )
    }
}

// Producer already resolves the domain semantics of technical/business/timing metrics.
// UI only localizes stable metric keys and formats the declared unit without inventing new rules.
function formatModeMoneyPredictionQuality(
    metrics: PolicyBranchMegaPredictionQualityMetricDto[],
    language: string,
    translate: (key: string) => string
): string {
    if (!Array.isArray(metrics) || metrics.length === 0) {
        throw new Error(
            '[policy-branch-mega] mode-money prediction-quality metrics are empty during render. owner=mode-money-summary; expected=non-empty metrics list; actual=empty; requiredAction=fix API mapper or rebuild mode money summary artifacts.'
        )
    }

    return metrics
        .map(metric => {
            const label = resolveModeMoneyPredictionQualityLabel(metric.metricKey, translate)
            const value =
                metric.unit === 'percent' ?
                    formatModeMoneyPercent(metric.value, language, `predictionQualityMetrics.${metric.metricKey}`)
                : metric.unit === 'count' ?
                    formatModeMoneyInteger(metric.value, language, `predictionQualityMetrics.${metric.metricKey}`)
                :   (() => {
                        throw new Error(
                            `[policy-branch-mega] mode-money prediction-quality metric has unsupported unit during render. owner=mode-money-summary; expected=percent|count; actual=${metric.unit}; context=metricKey=${metric.metricKey}; requiredAction=fix API mapper or rebuild mode money summary artifacts.`
                        )
                    })()

            return `${label}: ${value}`
        })
        .join(' | ')
}

function resolveModeMoneySummarySourceKindLabel(
    sourceKind: string,
    translate: (key: string) => string
): string {
    if (sourceKind === 'canonical_strategy') {
        return translate('policyBranchMega.page.modeMoneySummary.sourceKinds.canonicalStrategy')
    }

    if (sourceKind === 'policy_universe_best_policy') {
        return translate('policyBranchMega.page.modeMoneySummary.sourceKinds.policyUniverseBestPolicy')
    }

    if (sourceKind === 'not_published') {
        return translate('policyBranchMega.page.modeMoneySummary.sourceKinds.notPublished')
    }

    if (sourceKind === 'not_available') {
        return translate('policyBranchMega.page.modeMoneySummary.sourceKinds.notAvailable')
    }

    return sourceKind
}

function resolveModeMoneySummaryStatusLabel(
    status: string,
    translate: (key: string) => string
): string {
    if (status === 'available') {
        return translate('policyBranchMega.page.modeMoneySummary.statuses.available')
    }

    if (status === 'not_published') {
        return translate('policyBranchMega.page.modeMoneySummary.statuses.notPublished')
    }

    if (status === 'missing_artifacts') {
        return translate('policyBranchMega.page.modeMoneySummary.statuses.missingArtifacts')
    }

    return status
}

// В diagnostics route передаются только risk-query параметры, поэтому metric/bucketview
// исключаются, а bucket секции подставляется явно.
function buildBacktestDiagnosticsLink(
    searchParams: URLSearchParams,
    bucketOverride: PolicyBranchMegaBucketMode | null
): string {
    const nextParams = new URLSearchParams(searchParams)
    if (bucketOverride) {
        nextParams.set('bucket', bucketOverride)
    }

    return `${ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS]}${buildBacktestDiagnosticsSearchFromSearchParams(nextParams)}`
}

const MEGA_SL_MODE_COLUMN_NAME = 'SL Mode'
const MEGA_ROW_KEY_SEPARATOR = '\u001e'
const MEGA_PART_TAG_REGEX = /\[PART\s+(\d+)\/(\d+)\]/i
const MEGA_MODE_TAG_REGEX = /\bWITH SL\b|\bNO SL\b/gi
const MEGA_OVERVIEW_DOM_ID = 'policy-branch-mega-overview'
const MEGA_MODE_MONEY_SUMMARY_DOM_ID = 'policy-branch-mega-mode-money-summary'
type ModeMoneySummaryViewMode = 'compact' | 'expanded'
type ModeMoneySummaryColumnKey =
    | 'mode'
    | 'slice'
    | 'source'
    | 'status'
    | 'fromDate'
    | 'toDate'
    | 'execution'
    | 'days'
    | 'trades'
    | 'predictionQuality'
    | 'totalReturn'
    | 'totalPnlUsd'
    | 'startCapitalUsd'
    | 'equityNowUsd'
    | 'withdrawnUsd'
    | 'fundingNetUsd'
    | 'maxDrawdown'
    | 'sharpe'
    | 'realLiquidations'
    | 'accountRuins'
    | 'sourcePath'
const MODE_MONEY_SUMMARY_COMPACT_COLUMN_KEYS = new Set<ModeMoneySummaryColumnKey>([
    'mode',
    'slice',
    'fromDate',
    'toDate',
    'source',
    'status',
    'execution',
    'days',
    'predictionQuality',
    'totalReturn',
    'totalPnlUsd',
    'equityNowUsd',
    'maxDrawdown',
    'sharpe',
    'realLiquidations',
    'accountRuins'
])
const BUCKET_SPECIFIC_COLUMN_VISIBILITY = new Map<string, Set<PolicyBranchMegaBucketMode>>([
    ['DailyTP%', new Set<PolicyBranchMegaBucketMode>(['daily', 'total'])],
    ['DailySL%', new Set<PolicyBranchMegaBucketMode>(['daily', 'total'])],
    ['DynTP / SL Days', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['DynTP / SL Tr', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['DynTP / SL PnL%', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['DynGate OK', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['DynGate <Conf', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['DynGate <Samples', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['DynGate <WinRate', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['StatTP / SL Days', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['StatTP / SL Tr', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['StatTP / SL PnL%', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['DelayedTP%', new Set<PolicyBranchMegaBucketMode>(['delayed', 'total'])],
    ['DelayedSL%', new Set<PolicyBranchMegaBucketMode>(['delayed', 'total'])]
])

function buildMegaSectionColumnDescriptors(section: TableSectionDto): ReportColumnContractDescriptor[] {
    return buildReportColumnContractDescriptors(section.columns ?? [], section.columnKeys)
}

function buildMegaSectionColumnDescriptorsWithSyntheticSlMode(
    section: TableSectionDto,
    includeSlModeColumn: boolean
): ReportColumnContractDescriptor[] {
    const descriptors = buildMegaSectionColumnDescriptors(section)
    if (!includeSlModeColumn || descriptors.some(descriptor => descriptor.key === 'sl_mode')) {
        return descriptors
    }

    const branchIndex = descriptors.findIndex(descriptor => descriptor.key === 'branch' || descriptor.label === 'Branch')
    if (branchIndex < 0) {
        throw new Error(
            `[policy-branch-mega] Branch column is required before injecting synthetic "${MEGA_SL_MODE_COLUMN_NAME}" column. title=${section.title ?? 'n/a'}.`
        )
    }

    const nextDescriptors = [...descriptors]
    nextDescriptors.splice(branchIndex + 1, 0, {
        label: MEGA_SL_MODE_COLUMN_NAME,
        key: 'sl_mode'
    })
    return nextDescriptors
}

function isMegaColumnVisibleForBucket(column: string, bucket: PolicyBranchMegaBucketMode): boolean {
    const allowedBuckets = BUCKET_SPECIFIC_COLUMN_VISIBILITY.get(column)
    if (!allowedBuckets) {
        return true
    }

    return allowedBuckets.has(bucket)
}

function filterMegaSectionColumnsByBucket(
    section: TableSectionDto,
    bucket: PolicyBranchMegaBucketMode
): TableSectionDto {
    const columnDescriptors = buildMegaSectionColumnDescriptors(section)
    if (columnDescriptors.length === 0) {
        throw new Error('[policy-branch-mega] cannot filter section columns by bucket: columns are empty.')
    }

    const visibleIndexes: number[] = []
    const visibleDescriptors: ReportColumnContractDescriptor[] = []

    columnDescriptors.forEach((descriptor, columnIndex) => {
        if (isMegaColumnVisibleForBucket(descriptor.label, bucket)) {
            visibleIndexes.push(columnIndex)
            visibleDescriptors.push(descriptor)
        }
    })

    if (visibleDescriptors.length === 0) {
        throw new Error(
            `[policy-branch-mega] section has no visible columns after bucket filter. section=${section.title ?? 'n/a'}, bucket=${bucket}.`
        )
    }

    const rows = section.rows ?? []
    const nextRows = rows.map((row, rowIndex) => {
        if (!Array.isArray(row) || row.length < columnDescriptors.length) {
            throw new Error(
                `[policy-branch-mega] malformed row while filtering bucket columns. section=${section.title ?? 'n/a'}, row=${rowIndex}.`
            )
        }

        return visibleIndexes.map(index => String(row[index] ?? ''))
    })

    return {
        ...section,
        columns: visibleDescriptors.map(descriptor => descriptor.label),
        columnKeys: visibleDescriptors.map(descriptor => descriptor.key),
        rows: nextRows
    }
}

function filterMegaSectionsColumnsByBucket(
    sections: TableSectionDto[],
    bucket: PolicyBranchMegaBucketMode
): TableSectionDto[] {
    if (!sections || sections.length === 0) {
        throw new Error('[policy-branch-mega] cannot filter sections columns by bucket: source list is empty.')
    }

    return sections.map(section => filterMegaSectionColumnsByBucket(section, bucket))
}

function resolveMegaSlModeLabelForSection(section: TableSectionDto): string {
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

function resolveMegaPartNumberFromTitle(title: string | undefined): number {
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

function resolveMegaPartNumberFromSection(section: TableSectionDto): number {
    const metadataPart =
        section.metadata?.kind === 'policy-branch-mega' && Number.isInteger(section.metadata.part) ?
            section.metadata.part
        :   null
    if (typeof metadataPart === 'number' && metadataPart > 0) {
        return metadataPart
    }

    return resolveMegaPartNumberFromTitle(section.title)
}

function resolveMergedMegaTitleForPart(partSections: TableSectionDto[], slMode: PolicyBranchMegaSlMode): string {
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

function resolveExpectedSlModeLabel(mode: PolicyBranchMegaSlMode): 'WITH SL' | 'NO SL' {
    if (mode === 'with-sl') return 'WITH SL'
    if (mode === 'no-sl') return 'NO SL'
    throw new Error(`[policy-branch-mega] strict sl mode label cannot be resolved for mode=${mode}.`)
}

function ensurePartSectionsMatchSelectedSlMode(
    partSections: TableSectionDto[],
    slMode: PolicyBranchMegaSlMode
): TableSectionDto[] {
    if (slMode === 'all') {
        return partSections
    }

    const expectedLabel = resolveExpectedSlModeLabel(slMode)
    const matchedSections: TableSectionDto[] = []
    const mismatchedTitles: string[] = []

    for (const section of partSections) {
        const actualLabel = resolveMegaSlModeLabelForSection(section)
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

    if (part === 4) {
        return `${modePrefix}${translate('policyBranchMega.page.table.part4Description')}`
    }

    if (slMode === 'all') return `${modePrefix}${translate('policyBranchMega.page.table.mergedAllDescription')}`
    return `${modePrefix}${translate('policyBranchMega.page.table.mergedSelectedDescription')}`
}

function mergePolicyBranchMegaSectionsForPart(
    partSections: TableSectionDto[],
    slMode: PolicyBranchMegaSlMode
): TableSectionDto {
    if (!partSections || partSections.length === 0) {
        throw new Error('[policy-branch-mega] cannot merge part sections: source list is empty.')
    }

    const scopedSections = ensurePartSectionsMatchSelectedSlMode(partSections, slMode)
    const includeSlModeColumn = slMode === 'all'
    const mergedDescriptors: ReportColumnContractDescriptor[] = []
    const mergedDescriptorByKey = new Map<string, ReportColumnContractDescriptor>()
    const mergedRowsByKey = new Map<string, Map<string, unknown>>()
    const rowOrder: string[] = []

    for (const [sectionIndex, section] of scopedSections.entries()) {
        const sourceDescriptors = buildMegaSectionColumnDescriptors(section)
        const sectionDescriptors = buildMegaSectionColumnDescriptorsWithSyntheticSlMode(section, includeSlModeColumn)
        const rows = section.rows ?? []
        if (sourceDescriptors.length === 0) {
            throw new Error(
                `[policy-branch-mega] section columns are empty while merging part. section=${section.title ?? 'n/a'}, index=${sectionIndex}.`
            )
        }

        const policyIdx = sourceDescriptors.findIndex(descriptor => descriptor.key === 'policy' || descriptor.label === 'Policy')
        const branchIdx = sourceDescriptors.findIndex(descriptor => descriptor.key === 'branch' || descriptor.label === 'Branch')
        if (policyIdx < 0 || branchIdx < 0) {
            throw new Error(
                `[policy-branch-mega] Policy/Branch columns are required for part merge. section=${section.title ?? 'n/a'}, index=${sectionIndex}.`
            )
        }

        const modeLabel = includeSlModeColumn ? resolveMegaSlModeLabelForSection(section) : null
        for (const descriptor of sectionDescriptors) {
            const previousDescriptor = mergedDescriptorByKey.get(descriptor.key)
            if (!previousDescriptor) {
                mergedDescriptorByKey.set(descriptor.key, descriptor)
                mergedDescriptors.push(descriptor)
                continue
            }

            if (previousDescriptor.label !== descriptor.label) {
                throw new Error(
                    `[policy-branch-mega] conflicting semantic column label detected while merging part sections. key=${descriptor.key}, prev=${previousDescriptor.label}, next=${descriptor.label}, title=${section.title ?? 'n/a'}.`
                )
            }
        }

        for (const [rowIndex, row] of rows.entries()) {
            if (!Array.isArray(row) || row.length < sourceDescriptors.length) {
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

            const sectionValueByKey = new Map<string, unknown>()
            sourceDescriptors.forEach((descriptor, columnIndex) => {
                sectionValueByKey.set(descriptor.key, row[columnIndex])
            })

            if (includeSlModeColumn) {
                sectionValueByKey.set('sl_mode', modeLabel)
            }

            for (const descriptor of sectionDescriptors) {
                if (!sectionValueByKey.has(descriptor.key)) {
                    throw new Error(
                        `[policy-branch-mega] section column value is missing during part merge. section=${section.title ?? 'n/a'}, row=${rowIndex}, key=${descriptor.key}.`
                    )
                }

                const nextValue = sectionValueByKey.get(descriptor.key)
                const hasPrevValue = mergedRow.has(descriptor.key)
                const prevValue = mergedRow.get(descriptor.key)
                if (hasPrevValue && String(prevValue ?? '') !== String(nextValue ?? '')) {
                    throw new Error(
                        `[policy-branch-mega] conflicting merged part value detected. rowKey=${rowKey}, key=${descriptor.key}, prev=${String(prevValue ?? '')}, next=${String(nextValue ?? '')}.`
                    )
                }

                mergedRow.set(descriptor.key, nextValue)
            }
        }
    }

    const mergedRows = rowOrder.map((rowKey, rowIndex) => {
        const rowValues = mergedRowsByKey.get(rowKey)
        if (!rowValues) {
            throw new Error(`[policy-branch-mega] merged part row not found by key. rowKey=${rowKey}, row=${rowIndex}.`)
        }

        return mergedDescriptors.map(descriptor => {
            if (!rowValues.has(descriptor.key)) {
                throw new Error(
                    `[policy-branch-mega] merged part row is missing required column. rowKey=${rowKey}, key=${descriptor.key}, row=${rowIndex}.`
                )
            }

            return String(rowValues.get(descriptor.key) ?? '')
        })
    })

    return {
        ...scopedSections[0],
        title: resolveMergedMegaTitleForPart(scopedSections, slMode),
        columns: mergedDescriptors.map(descriptor => descriptor.label),
        columnKeys: mergedDescriptors.map(descriptor => descriptor.key),
        rows: mergedRows
    }
}

function mergePolicyBranchMegaSectionsByPart(
    sections: TableSectionDto[],
    slMode: PolicyBranchMegaSlMode
): TableSectionDto[] {
    if (!sections || sections.length === 0) {
        throw new Error('[policy-branch-mega] cannot merge sections by part: source list is empty.')
    }

    const byPart = new Map<number, TableSectionDto[]>()
    for (const section of sections) {
        const part = resolveMegaPartNumberFromSection(section)
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

        return mergePolicyBranchMegaSectionsForPart(partSections, slMode)
    })
}

function resolveMegaBucketModeFromSection(section: TableSectionDto): PolicyBranchMegaBucketMode {
    const metadataBucket = section.metadata?.kind === 'policy-branch-mega' ? (section.metadata.bucket ?? null) : null
    if (metadataBucket === 'daily' || metadataBucket === 'intraday' || metadataBucket === 'delayed') {
        return metadataBucket
    }
    if (metadataBucket === 'total-aggregate') {
        return 'total'
    }

    const bucketFromTitle = resolvePolicyBranchMegaBucketFromTitle(section.title)
    if (bucketFromTitle) {
        return bucketFromTitle
    }

    throw new Error(`[policy-branch-mega] cannot resolve section bucket. title=${section.title ?? 'n/a'}.`)
}

function resolveMegaBucketOrder(bucket: PolicyBranchMegaBucketMode): number {
    if (bucket === 'daily') return 0
    if (bucket === 'intraday') return 1
    if (bucket === 'delayed') return 2
    return 3
}

function mergePolicyBranchMegaSectionsByBucketAndPart(
    sections: TableSectionDto[],
    slMode: PolicyBranchMegaSlMode
): TableSectionDto[] {
    if (!sections || sections.length === 0) {
        throw new Error('[policy-branch-mega] cannot merge sections by bucket and part: source list is empty.')
    }

    const byBucketAndPart = new Map<
        string,
        { bucket: PolicyBranchMegaBucketMode; part: number; sections: TableSectionDto[] }
    >()

    for (const section of sections) {
        const bucket = resolveMegaBucketModeFromSection(section)
        if (bucket === 'total') {
            throw new Error('[policy-branch-mega] separate all-buckets merge received total bucket section.')
        }

        const part = resolveMegaPartNumberFromSection(section)
        const key = `${bucket}:${part}`
        const entry = byBucketAndPart.get(key) ?? { bucket, part, sections: [] as TableSectionDto[] }
        entry.sections.push(section)
        byBucketAndPart.set(key, entry)
    }

    const orderedGroups = Array.from(byBucketAndPart.values()).sort((a, b) => {
        const bucketOrder = resolveMegaBucketOrder(a.bucket) - resolveMegaBucketOrder(b.bucket)
        if (bucketOrder !== 0) {
            return bucketOrder
        }

        return a.part - b.part
    })

    return orderedGroups.map(group => mergePolicyBranchMegaSectionsForPart(group.sections, slMode))
}

function buildPolicyBranchMegaSectionTerms(section: TableSectionDto) {
    const columns = section.columns ?? []
    if (columns.length === 0) {
        throw new Error('[policy-branch-mega] cannot build section terms: columns list is empty.')
    }

    return buildPolicyBranchMegaTermReferencesForColumns(columns)
}

function renderPolicyBranchMegaTermTooltip(termKey: string, termTitle: string, locale: PolicyBranchMegaTermLocale) {
    const term = getPolicyBranchMegaTerm(termKey, { locale })

    return renderTermTooltipRichText(term.description, {
        ...buildSelfTooltipExclusions(termKey, term.title)
    })
}

// Нормализуем плейсхолдеры только для no-data метрик; формат SL-колонок приходит из backend DTO.
function applyNoDataMarkersToMegaSections(sections: TableSectionDto[], noDataLabel: string): TableSectionDto[] {
    if (!sections || sections.length === 0) return sections

    const nextSections = sections.map(section => {
        const columns = section.columns ?? []
        const rows = section.rows ?? []

        const policyIdx = columns.indexOf('Policy')
        const branchIdx = columns.indexOf('Branch')
        const totalTradesIdx = columns.indexOf('Tr')
        const primaryProfitColumn = resolvePolicyBranchMegaPrimaryProfitColumn(columns)
        const resultPctIdx = primaryProfitColumn ? columns.indexOf(primaryProfitColumn) : -1
        const dynTradesIdx = columns.indexOf('DynTP / SL Tr')
        const dynPnlIdx = columns.indexOf('DynTP / SL PnL%')
        const statTradesIdx = columns.indexOf('StatTP / SL Tr')
        const statPnlIdx = columns.indexOf('StatTP / SL PnL%')

        if (policyIdx < 0 || branchIdx < 0 || totalTradesIdx < 0 || resultPctIdx < 0) {
            return section
        }

        const nextRows = rows.map((row, rowIndex) => {
            const requiredIdx = Math.max(policyIdx, branchIdx, totalTradesIdx, resultPctIdx)
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

            const totalTrades = parseNonNegativeInt(nextRow[totalTradesIdx] ?? '', 'total.trades')
            if (totalTrades === 0) {
                const resultPctValue = parseFiniteNumberOrNull(nextRow[resultPctIdx])
                if (resultPctValue === null || Math.abs(resultPctValue) <= 1e-12) {
                    nextRow[resultPctIdx] = noDataLabel
                } else {
                    throw new Error(
                        `[policy-branch-mega] primary profit result must be zero/empty when trades are absent. section=${section.title ?? 'n/a'}, row=${rowIndex}, policy=${policy}, branch=${branch}, column=${primaryProfitColumn}, value=${nextRow[resultPctIdx]}.`
                    )
                }
            }

            if (dynTradesIdx >= 0 && dynPnlIdx >= 0) {
                const dynTrades = parseNonNegativeInt(nextRow[dynTradesIdx] ?? '', 'dynamic.trades')
                if (dynTrades === 0) {
                    const dynPnlValue = parseFiniteNumberOrNull(nextRow[dynPnlIdx])
                    if (dynPnlValue === null || Math.abs(dynPnlValue) <= 1e-12) {
                        nextRow[dynPnlIdx] = noDataLabel
                    } else {
                        throw new Error(
                            `[policy-branch-mega] dynamic pnl must be zero/empty when dynamic trades are absent. section=${section.title ?? 'n/a'}, row=${rowIndex}, policy=${policy}, branch=${branch}, value=${nextRow[dynPnlIdx]}.`
                        )
                    }
                }
            }

            if (statTradesIdx >= 0 && statPnlIdx >= 0) {
                const statTrades = parseNonNegativeInt(nextRow[statTradesIdx] ?? '', 'static.trades')
                if (statTrades === 0) {
                    const statPnlValue = parseFiniteNumberOrNull(nextRow[statPnlIdx])
                    if (statPnlValue === null || Math.abs(statPnlValue) <= 1e-12) {
                        nextRow[statPnlIdx] = noDataLabel
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

    return nextSections
}

interface PolicyBranchMegaPreparedSectionEntry {
    key: string
    part: number
    bucket: PolicyBranchMegaBucketMode | null
    section: TableSectionDto
}

interface PolicyBranchMegaRenderedSectionEntry {
    key: string
    part: number
    bucket: PolicyBranchMegaBucketMode | null
    section: TableSectionDto | null
    isLoading: boolean
    error: Error | null
}

interface PolicyBranchMegaSectionTermsState {
    key: string
    terms: PolicyBranchMegaTermReference[]
    error: Error | null
}

function buildPolicyBranchMegaSectionTermsStateMap(
    entries: readonly PolicyBranchMegaRenderedSectionEntry[]
): Map<string, PolicyBranchMegaSectionTermsState> {
    const states = new Map<string, PolicyBranchMegaSectionTermsState>()
    const shownTermKeys = new Set<string>()

    entries.forEach(entry => {
        if (!entry.section) {
            states.set(entry.key, {
                key: entry.key,
                terms: [],
                error: null
            })
            return
        }

        try {
            const sectionTerms = buildPolicyBranchMegaSectionTerms(entry.section)
            const uniqueTerms = sectionTerms.filter(term => {
                if (shownTermKeys.has(term.key)) {
                    return false
                }

                shownTermKeys.add(term.key)
                return true
            })

            // Блок терминов на следующей таблице должен объяснять только новые метрики,
            // а не заново повторять то, что уже было раскрыто выше по странице.
            states.set(entry.key, {
                key: entry.key,
                terms: uniqueTerms,
                error: null
            })
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to build policy branch mega section terms.', {
                source: 'policy-branch-mega-section-terms',
                domain: 'ui_section',
                owner: 'policy-branch-mega-page',
                expected: 'Mega page should build table terms for each prepared section.',
                requiredAction: 'Inspect mega section term builder and the prepared section schema.'
            })
            states.set(entry.key, {
                key: entry.key,
                terms: [],
                error: safeError
            })
        }
    })

    return states
}

function buildPolicyBranchMegaPreparedSectionKey(part: number, bucket: PolicyBranchMegaBucketMode | null): string {
    return `${bucket ?? 'all'}:${part}`
}

function buildPreparedPolicyBranchMegaSectionEntries(
    sectionsSource: unknown[],
    bucket: PolicyBranchMegaBucketMode,
    slMode: PolicyBranchMegaSlMode,
    isSeparateAllBucketsSelection: boolean,
    noDataLabel: string
): PolicyBranchMegaPreparedSectionEntry[] {
    const tableSections = buildTableSections(sectionsSource)
    const orderedSections = orderPolicyBranchMegaSections(tableSections)
    assertPolicyBranchMegaPrimaryProfitColumns(orderedSections, 'policy-branch-mega-page')
    const noDataAwareSections = applyNoDataMarkersToMegaSections(orderedSections, noDataLabel)
    const mergedSections =
        isSeparateAllBucketsSelection ?
            mergePolicyBranchMegaSectionsByBucketAndPart(noDataAwareSections, slMode)
        :   mergePolicyBranchMegaSectionsByPart(noDataAwareSections, slMode)
    // Порядок mega-колонок теперь backend-owned; страница только сохраняет его и скрывает bucket-specific хвосты.
    const visibleSections = filterMegaSectionsColumnsByBucket(mergedSections, bucket)

    return visibleSections.map(section => {
        const part = resolveMegaPartNumberFromSection(section)
        const entryBucket = isSeparateAllBucketsSelection ? resolveMegaBucketModeFromSection(section) : null

        return {
            key: buildPolicyBranchMegaPreparedSectionKey(part, entryBucket),
            part,
            bucket: entryBucket,
            section
        }
    })
}

export default function PolicyBranchMegaPage({ className }: PolicyBranchMegaPageProps) {
    const { t, i18n } = useTranslation('reports')
    const location = useLocation()
    const [searchParams, setSearchParams] = useSearchParams()
    const [displayMode, setDisplayMode] = useState<'table' | 'chart'>('table')
    // Это локальный способ чтения уже загруженной таблицы; он не меняет owner-данные,
    // поэтому состояние не пишется в URL рядом с настоящими report-осями.
    const [modeMoneySummaryView, setModeMoneySummaryView] = useState<ModeMoneySummaryViewMode>('compact')
    const [dismissedValidationKey, setDismissedValidationKey] = useState<string | null>(null)

    const historyState = useMemo(() => {
        try {
            const history = resolvePolicyBranchMegaHistoryFromQuery(
                searchParams.get('history'),
                DEFAULT_POLICY_BRANCH_MEGA_HISTORY_MODE
            )
            return { value: history, error: null as Error | null }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to parse policy branch mega history query.', {
                source: 'policy-branch-mega-history-query',
                domain: 'ui_section',
                owner: 'policy-branch-mega-page',
                expected: 'Mega page should parse a valid history query value.',
                requiredAction: 'Inspect history URL param and supported history slice values.'
            })
            return { value: DEFAULT_POLICY_BRANCH_MEGA_HISTORY_MODE, error: safeError }
        }
    }, [searchParams])

    const bucketState = useMemo(() => {
        try {
            const bucket = resolvePolicyBranchMegaBucketFromQuery(
                searchParams.get('bucket'),
                DEFAULT_POLICY_BRANCH_MEGA_BUCKET_MODE
            )
            return { value: bucket, error: null as Error | null }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to parse policy branch mega bucket query.', {
                source: 'policy-branch-mega-bucket-query',
                domain: 'ui_section',
                owner: 'policy-branch-mega-page',
                expected: 'Mega page should parse a valid bucket query value.',
                requiredAction: 'Inspect bucket URL param and supported bucket values.'
            })
            return { value: DEFAULT_POLICY_BRANCH_MEGA_BUCKET_MODE, error: safeError }
        }
    }, [searchParams])

    const bucketViewState = useMemo(() => {
        try {
            const bucketView = resolvePolicyBranchMegaTotalBucketViewFromQuery(
                searchParams.get('bucketview'),
                DEFAULT_POLICY_BRANCH_MEGA_TOTAL_BUCKET_VIEW
            )
            return { value: bucketView, error: null as Error | null }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to parse policy branch mega bucketview query.', {
                source: 'policy-branch-mega-bucketview-query',
                domain: 'ui_section',
                owner: 'policy-branch-mega-page',
                expected: 'Mega page should parse a valid bucket view query value.',
                requiredAction: 'Inspect bucketview URL param and supported bucket view values.'
            })
            return { value: DEFAULT_POLICY_BRANCH_MEGA_TOTAL_BUCKET_VIEW, error: safeError }
        }
    }, [searchParams])

    const metricState = useMemo(() => {
        try {
            const metric = resolvePolicyBranchMegaMetricFromQuery(
                searchParams.get('metric'),
                DEFAULT_POLICY_BRANCH_MEGA_METRIC_MODE
            )
            return { value: metric, error: null as Error | null }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to parse policy branch mega metric query.', {
                source: 'policy-branch-mega-metric-query',
                domain: 'ui_section',
                owner: 'policy-branch-mega-page',
                expected: 'Mega page should parse a valid metric query value.',
                requiredAction: 'Inspect metric URL param and supported metric values.'
            })
            return { value: DEFAULT_POLICY_BRANCH_MEGA_METRIC_MODE, error: safeError }
        }
    }, [searchParams])

    const tpSlState = useMemo(() => {
        try {
            const mode = resolvePolicyBranchMegaTpSlModeFromQuery(
                searchParams.get('tpsl'),
                DEFAULT_POLICY_BRANCH_MEGA_TP_SL_MODE
            )
            return { value: mode, error: null as Error | null }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to parse policy branch mega tpsl query.', {
                source: 'policy-branch-mega-tpsl-query',
                domain: 'ui_section',
                owner: 'policy-branch-mega-page',
                expected: 'Mega page should parse a valid TP/SL query value.',
                requiredAction: 'Inspect tpsl URL param and supported TP/SL values.'
            })
            return { value: DEFAULT_POLICY_BRANCH_MEGA_TP_SL_MODE, error: safeError }
        }
    }, [searchParams])

    const slModeState = useMemo(() => {
        try {
            const mode = resolvePolicyBranchMegaSlModeFromQuery(
                searchParams.get('slmode'),
                DEFAULT_POLICY_BRANCH_MEGA_SL_MODE
            )
            return { value: mode, error: null as Error | null }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to parse policy branch mega slmode query.', {
                source: 'policy-branch-mega-slmode-query',
                domain: 'ui_section',
                owner: 'policy-branch-mega-page',
                expected: 'Mega page should parse a valid SL mode query value.',
                requiredAction: 'Inspect slmode URL param and supported SL mode values.'
            })
            return { value: DEFAULT_POLICY_BRANCH_MEGA_SL_MODE, error: safeError }
        }
    }, [searchParams])

    const zonalState = useMemo(() => {
        try {
            const mode = resolvePolicyBranchMegaZonalModeFromQuery(
                searchParams.get('zonal'),
                DEFAULT_POLICY_BRANCH_MEGA_ZONAL_MODE
            )
            return { value: mode, error: null as Error | null }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to parse policy branch mega zonal query.', {
                source: 'policy-branch-mega-zonal-query',
                domain: 'ui_section',
                owner: 'policy-branch-mega-page',
                expected: 'Mega page should parse a valid zonal query value.',
                requiredAction: 'Inspect zonal URL param and supported zonal values.'
            })
            return { value: DEFAULT_POLICY_BRANCH_MEGA_ZONAL_MODE, error: safeError }
        }
    }, [searchParams])

    const requestedAnchorTarget = useMemo(() => resolvePolicyBranchMegaAnchorTarget(location.hash), [location.hash])
    const activePartRequest = requestedAnchorTarget?.part ?? 1
    const termsLocale = useMemo(() => resolvePolicyBranchMegaTermLocale(i18n.language), [i18n.language])

    const effectiveSelection = useMemo(
        () => ({
            history: historyState.value,
            bucket: bucketState.value,
            bucketView: bucketViewState.value,
            metric: metricState.value,
            tpSlMode: tpSlState.value,
            slMode: slModeState.value,
            zonalMode: zonalState.value
        }),
        [
            historyState.value,
            bucketState.value,
            bucketViewState.value,
            metricState.value,
            slModeState.value,
            tpSlState.value,
            zonalState.value
        ]
    )

    const isSeparateAllBucketsSelection =
        effectiveSelection.bucket === 'total' && effectiveSelection.bucketView === 'separate'
    const isChartSupported = !isSeparateAllBucketsSelection
    const effectiveDisplayMode = isChartSupported ? displayMode : 'table'
    const variantSelectionQuery = usePublishedReportVariantSelectionQuery(
        PUBLISHED_REPORT_VARIANT_FAMILIES.policyBranchMega,
        {
            history: effectiveSelection.history,
            bucket: effectiveSelection.bucket,
            bucketview: effectiveSelection.bucketView,
            metric: effectiveSelection.metric,
            part: String(activePartRequest),
            tpsl: effectiveSelection.tpSlMode,
            slmode: effectiveSelection.slMode,
            zonal: effectiveSelection.zonalMode
        }
    )
    const normalizedAvailableParts = useMemo(() => {
        if (!variantSelectionQuery.data) {
            return []
        }

        return getPublishedReportVariantAxisOptionValues(variantSelectionQuery.data, 'part')
            .map(value => Number(value))
            .filter(part => Number.isInteger(part) && part > 0)
            .sort((left, right) => left - right)
    }, [variantSelectionQuery.data])
    const normalizedAvailableHistories = useMemo(() => {
        if (!variantSelectionQuery.data) {
            return [] as PolicyBranchMegaHistoryMode[]
        }

        const values = getPublishedReportVariantAxisOptionValues(variantSelectionQuery.data, 'history').filter(
            (value): value is PolicyBranchMegaHistoryMode =>
                value === 'full_history' || value === 'train' || value === 'oos' || value === 'recent'
        )

        return values.length > 0 ? values : [DEFAULT_POLICY_BRANCH_MEGA_HISTORY_MODE]
    }, [variantSelectionQuery.data])
    const activePart = useMemo(() => {
        const resolvedPartRaw = variantSelectionQuery.data?.selection.part
        const resolvedPart = resolvedPartRaw ? Number(resolvedPartRaw) : null
        if (resolvedPart !== null && Number.isInteger(resolvedPart) && resolvedPart > 0) {
            return resolvedPart
        }

        if (normalizedAvailableParts.length === 0) {
            return activePartRequest
        }

        if (typeof activePartRequest === 'number' && normalizedAvailableParts.includes(activePartRequest)) {
            return activePartRequest
        }

        return normalizedAvailableParts[0]
    }, [activePartRequest, normalizedAvailableParts, variantSelectionQuery.data])
    const resolvedQuery = useMemo(
        () =>
            variantSelectionQuery.data ? {
                history:
                    variantSelectionQuery.data.selection.history ?? DEFAULT_POLICY_BRANCH_MEGA_HISTORY_MODE,
                bucket: variantSelectionQuery.data.selection.bucket,
                bucketView: variantSelectionQuery.data.selection.bucketview,
                metric: variantSelectionQuery.data.selection.metric,
                tpSlMode: variantSelectionQuery.data.selection.tpsl,
                slMode: variantSelectionQuery.data.selection.slmode,
                zonalMode: variantSelectionQuery.data.selection.zonal,
                part: Number(variantSelectionQuery.data.selection.part)
            } : null,
        [
            variantSelectionQuery.data
        ]
    )
    const effectiveQueryArgsBase = useMemo(
        () =>
            resolvedQuery ? {
                history: resolvedQuery.history,
                bucket: resolvedQuery.bucket,
                bucketView: resolvedQuery.bucketView,
                metric: resolvedQuery.metric,
                tpSlMode: resolvedQuery.tpSlMode,
                slMode: resolvedQuery.slMode,
                zonalMode: resolvedQuery.zonalMode
            } : {
                history: effectiveSelection.history,
                bucket: effectiveSelection.bucket,
                bucketView: effectiveSelection.bucketView,
                metric: effectiveSelection.metric,
                tpSlMode: effectiveSelection.tpSlMode,
                slMode: effectiveSelection.slMode,
                zonalMode: effectiveSelection.zonalMode
            },
        [
            effectiveSelection.history,
            effectiveSelection.bucket,
            effectiveSelection.bucketView,
            effectiveSelection.metric,
            effectiveSelection.slMode,
            effectiveSelection.tpSlMode,
            effectiveSelection.zonalMode,
            resolvedQuery,
        ]
    )
    const activePolicyBranchMegaArgs = useMemo(
        () => ({
            ...effectiveQueryArgsBase,
            part: activePart
        }),
        [activePart, effectiveQueryArgsBase]
    )
    const queryClient = useQueryClient()
    const { data: primaryReport, isLoading, isError, error, refetch } = usePolicyBranchMegaReportNavQuery(
        { enabled: true },
        activePolicyBranchMegaArgs
    )
    const { data: primaryEvaluation } =
        usePolicyBranchMegaEvaluationQuery(activePolicyBranchMegaArgs, {
            enabled: Boolean(primaryReport)
        })
    const trainingScopeStatsQuery = useCurrentPredictionBackfilledTrainingScopeStatsQuery()
    const modeMoneySummaryQuery = usePolicyBranchMegaModeMoneySummaryQuery({ enabled: true })
    const primaryEvaluationRows = primaryEvaluation?.rows ?? null
    const effectiveSelectionKey = useMemo(
        () =>
            [
                effectiveSelection.history,
                effectiveSelection.bucket,
                effectiveSelection.bucketView,
                effectiveSelection.metric,
                effectiveSelection.tpSlMode,
                effectiveSelection.slMode,
                effectiveSelection.zonalMode
            ].join('|'),
        [
            effectiveSelection.history,
            effectiveSelection.bucket,
            effectiveSelection.bucketView,
            effectiveSelection.metric,
            effectiveSelection.slMode,
            effectiveSelection.tpSlMode,
            effectiveSelection.zonalMode
        ]
    )

    const activeBucketForSection = useMemo(() => {
        if (!requestedAnchorTarget) {
            return null
        }

        if (!isSeparateAllBucketsSelection) {
            return null
        }

        const requestedBucket = requestedAnchorTarget?.bucket
        if (requestedBucket === 'daily' || requestedBucket === 'intraday' || requestedBucket === 'delayed') {
            return requestedBucket
        }

        return 'daily'
    }, [isSeparateAllBucketsSelection, requestedAnchorTarget])
    const activeAnchor = useMemo(
        () => {
            if (!requestedAnchorTarget) {
                return null
            }

            // Без явного hash нельзя закреплять первую часть как "активную":
            // иначе фоновые перестройки DOM при скролле удерживают старый anchor
            // и страница визуально отскакивает к началу.
            return requestedAnchorTarget.sectionKind === 'table' ?
                    buildPolicyBranchMegaTableSectionAnchor(activePart, activeBucketForSection)
                :   buildPolicyBranchMegaTermsSectionAnchor(activePart, activeBucketForSection)
        },
        [activeBucketForSection, activePart, requestedAnchorTarget]
    )

    const partCatalogAlertState = useMemo(() => {
        if (!variantSelectionQuery.error) {
            return null
        }

        return {
            title: 'Каталог частей mega-таблицы недоступен',
            description:
                'Текущий опубликованный срез открыт, но общий каталог частей не загрузился. Без него страница не может гарантировать соседние блоки и фоновую загрузку следующей части.',
            detail: variantSelectionQuery.error.message
        }
    }, [variantSelectionQuery.error])

    useEffect(() => {
        if (!resolvedQuery) {
            return
        }

        const nextParams = new URLSearchParams(searchParams)
        let changed = false

        const syncParam = (
            key: 'history' | 'bucket' | 'metric' | 'tpsl' | 'slmode' | 'zonal',
            currentValue: string,
            currentError: Error | null,
            resolvedValue: string
        ) => {
            if (!currentError && currentValue === resolvedValue) {
                return
            }

            nextParams.set(key, resolvedValue)
            changed = true
        }

        const syncOptionalParam = (
            key: 'bucketview',
            currentValue: string,
            currentError: Error | null,
            resolvedValue: string,
            isEnabled: boolean
        ) => {
            if (!isEnabled) {
                if (nextParams.has(key)) {
                    nextParams.delete(key)
                    changed = true
                }

                return
            }

            if (!currentError && currentValue === resolvedValue) {
                return
            }

            nextParams.set(key, resolvedValue)
            changed = true
        }

        syncParam('history', historyState.value, historyState.error, resolvedQuery.history)
        syncParam('bucket', bucketState.value, bucketState.error, resolvedQuery.bucket)
        syncOptionalParam(
            'bucketview',
            bucketViewState.value,
            bucketViewState.error,
            resolvedQuery.bucketView,
            resolvedQuery.bucket === 'total'
        )
        syncParam('metric', metricState.value, metricState.error, resolvedQuery.metric)
        syncParam('tpsl', tpSlState.value, tpSlState.error, resolvedQuery.tpSlMode)
        syncParam('slmode', slModeState.value, slModeState.error, resolvedQuery.slMode)
        syncParam('zonal', zonalState.value, zonalState.error, resolvedQuery.zonalMode)

        if (changed) {
            setSearchParams(nextParams, { replace: true })
        }
    }, [
        historyState.error,
        historyState.value,
        bucketState.error,
        bucketState.value,
        bucketViewState.error,
        bucketViewState.value,
        metricState.error,
        metricState.value,
        resolvedQuery,
        searchParams,
        setSearchParams,
        slModeState.error,
        slModeState.value,
        tpSlState.error,
        tpSlState.value,
        zonalState.error,
        zonalState.value
    ])

    useEffect(() => {
        if (!isChartSupported && displayMode === 'chart') {
            setDisplayMode('table')
        }
    }, [displayMode, isChartSupported])
    const noDataLabel = t('policyBranchMega.page.noDataPlaceholder')
    const preparedSectionsByPartCacheRef = useRef(new Map<string, PolicyBranchMegaPreparedSectionEntry[]>())

    useEffect(() => {
        preparedSectionsByPartCacheRef.current.clear()
    }, [effectiveSelectionKey, isSeparateAllBucketsSelection, noDataLabel])

    const backgroundPartNumbers = useMemo(
        () => normalizedAvailableParts.filter(part => part !== activePart),
        [activePart, normalizedAvailableParts]
    )
    const backgroundPartQueries = useQueries({
        queries: backgroundPartNumbers.map(part =>
            buildPolicyBranchMegaPayloadQueryOptions(
                queryClient,
                {
                    ...effectiveQueryArgsBase,
                    part
                },
                {
                    enabled: Boolean(primaryReport)
                }
            )
        )
    }) as Array<{
        data: PolicyBranchMegaReportPayloadDto | undefined
        isLoading: boolean
        isFetching: boolean
        error: Error | null
    }>

    const loadedPartReportsState = useMemo(() => {
        const reports: Array<{ part: number; report: typeof primaryReport }> = []

        if (primaryReport) {
            reports.push({ part: activePart, report: primaryReport })
        }

        backgroundPartNumbers.forEach((part, index) => {
            const query = backgroundPartQueries[index]
            if (query?.data?.report) {
                reports.push({ part, report: query.data.report })
            }
        })

        return {
            reports: reports.sort((a, b) => a.part - b.part),
            chartLoadError:
                effectiveDisplayMode === 'chart' ?
                    (backgroundPartQueries.find(query => query.error instanceof Error)?.error ?? null)
                :   null,
            chartIsLoading:
                effectiveDisplayMode === 'chart' &&
                (isLoading || backgroundPartQueries.some(query => query.isLoading || query.isFetching))
        }
    }, [activePart, backgroundPartNumbers, backgroundPartQueries, effectiveDisplayMode, isLoading, primaryReport])
    const rowEvaluationMapsByPart = useMemo(() => {
        const maps = new Map<number, PolicyRowEvaluationMapDto['rows']>()
        if (primaryEvaluationRows) {
            maps.set(activePart, primaryEvaluationRows)
        }

        backgroundPartNumbers.forEach((part, index) => {
            const query = backgroundPartQueries[index]
            if (query?.data?.evaluation?.rows) {
                maps.set(part, query.data.evaluation.rows)
            }
        })

        return maps
    }, [activePart, backgroundPartNumbers, backgroundPartQueries, primaryEvaluationRows])
    const rowEvaluationStatesByPart = useMemo(() => {
        const states = new Map<number, { ready: boolean; error: Error | null }>()
        states.set(activePart, {
            ready: Boolean(primaryEvaluationRows),
            error:
                primaryReport && !isLoading && !primaryEvaluationRows ?
                    new Error('[policy-branch-mega] published evaluation map is missing for the active part.')
                :   null
        })

        backgroundPartNumbers.forEach((part, index) => {
            const query = backgroundPartQueries[index]
            states.set(part, {
                ready: Boolean(query?.data?.evaluation?.rows),
                error:
                    query?.error instanceof Error ? query.error
                    : query && !query.isLoading && !query.isFetching && !query.data?.evaluation?.rows ?
                        new Error(
                            `[policy-branch-mega] published evaluation map is missing for part=${part}.`
                        )
                    :   null
            })
        })

        return states
    }, [activePart, backgroundPartNumbers, backgroundPartQueries, isLoading, primaryEvaluationRows, primaryReport])
    const visibleSectionEntriesState = useMemo(() => {
        if (!primaryReport) {
            return {
                entries: [] as PolicyBranchMegaPreparedSectionEntry[],
                error: null as Error | null
            }
        }

        try {
            const entries: PolicyBranchMegaPreparedSectionEntry[] = []

            loadedPartReportsState.reports.forEach(item => {
                const currentReport = item.report
                if (!currentReport) {
                    return
                }

                const cacheKey = `${currentReport.id}|${currentReport.generatedAtUtc}|${item.part}`
                let cachedEntries = preparedSectionsByPartCacheRef.current.get(cacheKey)
                if (!cachedEntries) {
                    cachedEntries = buildPreparedPolicyBranchMegaSectionEntries(
                        currentReport.sections ?? [],
                        effectiveSelection.bucket,
                        effectiveSelection.slMode,
                        isSeparateAllBucketsSelection,
                        noDataLabel
                    )
                    preparedSectionsByPartCacheRef.current.set(cacheKey, cachedEntries)
                }

                entries.push(...cachedEntries)
            })

            entries.sort((left, right) => {
                if (isSeparateAllBucketsSelection) {
                    const leftBucketOrder = resolveMegaBucketOrder(left.bucket ?? 'total')
                    const rightBucketOrder = resolveMegaBucketOrder(right.bucket ?? 'total')
                    if (leftBucketOrder !== rightBucketOrder) {
                        return leftBucketOrder - rightBucketOrder
                    }
                }

                return left.part - right.part
            })

            return {
                entries,
                error: null as Error | null
            }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to prepare policy branch mega sections.', {
                source: 'policy-branch-mega-prepare-sections',
                domain: 'ui_section',
                owner: 'policy-branch-mega-page',
                expected: 'Mega page should prepare visible sections from loaded report parts and filters.',
                requiredAction: 'Inspect mega section builders and the loaded report part set.'
            })
            return {
                entries: [] as PolicyBranchMegaPreparedSectionEntry[],
                error: safeError
            }
        }
    }, [
        effectiveSelection.bucket,
        effectiveSelection.slMode,
        isSeparateAllBucketsSelection,
        loadedPartReportsState.reports,
        noDataLabel,
        primaryReport
    ])

    const visibleSectionsState = useMemo(
        () => ({
            sections: visibleSectionEntriesState.entries.map(entry => entry.section),
            error: visibleSectionEntriesState.error
        }),
        [visibleSectionEntriesState.entries, visibleSectionEntriesState.error]
    )

    const tableRenderedSectionsState = useMemo(() => {
        if (effectiveDisplayMode !== 'table') {
            return {
                entries: [] as PolicyBranchMegaRenderedSectionEntry[],
                error: null as Error | null
            }
        }

        try {
            const entries = visibleSectionEntriesState.entries.map(entry => ({
                key: entry.key,
                part: entry.part,
                bucket: entry.bucket,
                section: entry.section,
                isLoading: false,
                error: null
            }) satisfies PolicyBranchMegaRenderedSectionEntry)

            return {
                entries,
                error: null as Error | null
            }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to build rendered mega sections.', {
                source: 'policy-branch-mega-rendered-sections',
                domain: 'ui_section',
                owner: 'policy-branch-mega-page',
                expected: 'Mega page should expose only fully prepared table sections that already exist in cache.',
                requiredAction: 'Inspect loaded payload parts and prepared mega table entries.'
            })
            return {
                entries: [] as PolicyBranchMegaRenderedSectionEntry[],
                error: safeError
            }
        }
    }, [effectiveDisplayMode, visibleSectionEntriesState.entries])
    const activeTableAnchorOffsetRef = useRef<number | null>(null)

    useLayoutEffect(() => {
        if (effectiveDisplayMode !== 'table' || !activeAnchor || typeof document === 'undefined') {
            activeTableAnchorOffsetRef.current = null
            return
        }

        const scrollRoot = document.querySelector('.app') as HTMLElement | null
        const anchorElement = document.getElementById(activeAnchor)
        if (!scrollRoot || !anchorElement) {
            activeTableAnchorOffsetRef.current = null
            return
        }

        const containerRect = scrollRoot.getBoundingClientRect()
        const currentTop = anchorElement.getBoundingClientRect().top - containerRect.top
        const previousTop = activeTableAnchorOffsetRef.current

        if (previousTop !== null) {
            const delta = currentTop - previousTop
            if (delta !== 0) {
                scrollRoot.scrollTop += delta
            }
        }

        activeTableAnchorOffsetRef.current = anchorElement.getBoundingClientRect().top - containerRect.top
    }, [activeAnchor, effectiveDisplayMode, tableRenderedSectionsState.entries])
    const pageTabs = useMemo(() => {
        if (effectiveDisplayMode !== 'table') {
            return []
        }

        if (visibleSectionEntriesState.entries.length > 0) {
            return buildPolicyBranchMegaTabsFromSections(
                visibleSectionEntriesState.entries.map(entry => entry.section)
            )
        }

        return []
    }, [effectiveDisplayMode, visibleSectionEntriesState.entries])

    useEffect(() => {
        if (effectiveDisplayMode !== 'table') {
            return
        }

        if (!activeAnchor) {
            return
        }

        // Без этой синхронизации deep-link открывает не ту часть,
        // а pager остаётся привязанным к предыдущему scroll-положению.
        scrollToAnchor(activeAnchor, {
            behavior: 'auto',
            withTransitionPulse: false
        })
    }, [activeAnchor, effectiveDisplayMode])

    const {
        windowCenterPart: tableWindowCenterPart,
        currentIndex,
        canPrev,
        canNext,
        handlePrev,
        handleNext
    } = useSectionPagerPartWindow({
        sections: effectiveDisplayMode === 'table' ? pageTabs : [],
        activeAnchor: effectiveDisplayMode === 'table' ? activeAnchor : null,
        activePart,
        availableParts: normalizedAvailableParts,
        resolvePartFromAnchor: anchor => resolvePolicyBranchMegaAnchorTarget(anchor)?.part ?? null,
        resetKey: effectiveSelectionKey,
        syncHash: false,
        // Для mega-таблицы scroll управляет только текущей видимой частью.
        // Hash и route остаются статичными, чтобы deep-link не отскакивал к первой части.
        trackScroll: effectiveDisplayMode === 'table'
    })

    const chartModelState = useMemo(() => {
        if (!isChartSupported) {
            return { model: null, error: null as Error | null }
        }

        if (loadedPartReportsState.chartLoadError) {
            return { model: null, error: loadedPartReportsState.chartLoadError }
        }

        if (visibleSectionsState.error) {
            return { model: null, error: visibleSectionsState.error }
        }

        if (visibleSectionsState.sections.length === 0) {
            return { model: null, error: null as Error | null }
        }

        try {
            return {
                model: buildPolicyBranchMegaChartModel(visibleSectionsState.sections),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to build policy branch mega chart model.', {
                source: 'policy-branch-mega-chart-model',
                domain: 'ui_section',
                owner: 'policy-branch-mega-page',
                expected: 'Mega page should build chart model from visible prepared sections.',
                requiredAction: 'Inspect mega chart builder and prepared section schema.'
            })

            return {
                model: null,
                error: safeError
            }
        }
    }, [
        isChartSupported,
        loadedPartReportsState.chartLoadError,
        visibleSectionsState.error,
        visibleSectionsState.sections
    ])

    const sectionTermsStateByKey = useMemo(() => {
        return buildPolicyBranchMegaSectionTermsStateMap(tableRenderedSectionsState.entries)
    }, [tableRenderedSectionsState.entries])

    const validationQueryArgs = useMemo(
        () => ({
            ...effectiveQueryArgsBase,
            // Фоновая сверка проверяет только реально открытую часть, а не всю комбинацию целиком.
            part: effectiveDisplayMode === 'table' ? tableWindowCenterPart : activePart
        }),
        [activePart, effectiveDisplayMode, effectiveQueryArgsBase, tableWindowCenterPart]
    )
    const [isValidationQueryDeferredReady, setIsValidationQueryDeferredReady] = useState(false)
    useEffect(() => {
        setIsValidationQueryDeferredReady(false)

        if (!primaryReport || !primaryEvaluationRows) {
            return
        }

        // Сначала показываем опубликованный срез, а background-check запускаем уже после первого paint.
        const timeoutId = window.setTimeout(() => {
            setIsValidationQueryDeferredReady(true)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [primaryEvaluationRows, primaryReport])
    const { data: validationStatus, error: validationError } = usePolicyBranchMegaValidationQuery(validationQueryArgs, {
        enabled: Boolean(primaryReport && primaryEvaluationRows && isValidationQueryDeferredReady)
    })
    const validationAlertState = useMemo(() => {
        if (validationError) {
            return {
                key: [
                    'validation-error',
                    validationError.name,
                    validationError.message
                ].join('|'),
                title: t('policyBranchMega.page.validation.errorTitle', {
                    defaultValue: 'Фоновая проверка среза недоступна'
                }),
                description: t('policyBranchMega.page.validation.errorMessage', {
                    defaultValue: 'Проверка будет повторена автоматически, когда backend ответит.'
                }),
                detail: validationError.message
            }
        }

        if (!validationStatus) {
            return null
        }

        if (validationStatus.state !== 'mismatch' && validationStatus.state !== 'error') {
            return null
        }

        const alertKey = [
            validationStatus.state,
            validationStatus.selectionKey,
            validationStatus.policyBranchMegaId ?? '',
            validationStatus.diagnosticsId ?? '',
            validationStatus.message
        ].join('|')

        return {
            key: alertKey,
            title:
                validationStatus.state === 'mismatch' ?
                    t('policyBranchMega.page.validation.mismatchTitle')
                :   t('policyBranchMega.page.validation.errorTitle'),
            description:
                validationStatus.state === 'mismatch' ?
                    t('policyBranchMega.page.validation.mismatchMessage')
                :   t('policyBranchMega.page.validation.errorMessage'),
            detail: validationStatus.state === 'error' ? validationStatus.message : null
        }
    }, [t, validationError, validationStatus])
    const isValidationAlertDismissed =
        validationAlertState !== null && dismissedValidationKey === validationAlertState.key

    const generatedAtState = useMemo(() => {
        if (!primaryReport) return { value: null as Date | null, error: null as Error | null }

        if (!primaryReport.generatedAtUtc) {
            return {
                value: null,
                error: new Error('[policy-branch-mega] generatedAtUtc is missing.')
            }
        }

        const parsed = new Date(primaryReport.generatedAtUtc)
        if (Number.isNaN(parsed.getTime())) {
            return {
                value: null,
                error: new Error(`[policy-branch-mega] generatedAtUtc is invalid: ${primaryReport.generatedAtUtc}`)
            }
        }

        return { value: parsed, error: null }
    }, [primaryReport])
    const hasLoadedReportSections = useMemo(
        () => loadedPartReportsState.reports.some(item => (item.report?.sections ?? []).length > 0),
        [loadedPartReportsState.reports]
    )

    const rootClassName = classNames(cls.root, {}, [className ?? ''])

    const renderedColumnTitles = useMemo(() => {
        const cachedTitles = new Map<string, ReturnType<typeof renderTermTooltipTitle>>()

        tableRenderedSectionsState.entries.forEach(entry => {
            ;(entry.section?.columns ?? []).forEach(column => {
                if (!cachedTitles.has(column)) {
                    cachedTitles.set(
                        column,
                        renderTermTooltipTitle(column, () =>
                            renderPolicyBranchMegaTermTooltip(column, column, termsLocale)
                        )
                    )
                }
            })
        })

        return cachedTitles
    }, [tableRenderedSectionsState.entries, termsLocale])

    const renderColumnTitle = useCallback(
        (title: string) => {
            const cachedTitle = renderedColumnTitles.get(title)
            if (cachedTitle) {
                return cachedTitle
            }

            return renderTermTooltipTitle(title, () => renderPolicyBranchMegaTermTooltip(title, title, termsLocale))
        },
        [renderedColumnTitles, termsLocale]
    )

    const renderTableSectionEntry = useCallback(
        (entry: PolicyBranchMegaRenderedSectionEntry) => {
            const section = entry.section
            if (!section) {
                return null
            }

            const termsState = sectionTermsStateByKey.get(entry.key) ?? {
                key: entry.key,
                terms: [] as PolicyBranchMegaTermReference[],
                error: null as Error | null
            }
            const sectionBucket = entry.bucket ?? resolveMegaBucketModeFromSection(section)
            const sectionBucketLabel = sectionBucket ? resolvePolicyBranchMegaBucketLabel(sectionBucket) : null
            const termsDomId = buildPolicyBranchMegaTermsSectionAnchor(entry.part, entry.bucket)
            const tableDomId = buildPolicyBranchMegaTableSectionAnchor(entry.part, entry.bucket)
            const termsTitle =
                isSeparateAllBucketsSelection && sectionBucketLabel ?
                    `Термины · ${sectionBucketLabel} · часть ${entry.part}`
                :   t('policyBranchMega.page.terms.title', { part: entry.part })
            const termsSubtitle =
                isSeparateAllBucketsSelection && sectionBucketLabel ?
                    `${sectionBucketLabel} · ${t('policyBranchMega.page.terms.subtitle', { part: entry.part })}`
                :   t('policyBranchMega.page.terms.subtitle', { part: entry.part })
            const diagnosticsLink = buildBacktestDiagnosticsLink(
                searchParams,
                isSeparateAllBucketsSelection ? sectionBucket : null
            )
            const rowEvaluationMap = rowEvaluationMapsByPart.get(entry.part)
            const rowEvaluationState = rowEvaluationStatesByPart.get(entry.part)
            const diagnosticsTitle =
                isSeparateAllBucketsSelection && sectionBucketLabel ?
                    `${t('policyBranchMega.page.part2Diagnostics.title')} · ${sectionBucketLabel}`
                :   t('policyBranchMega.page.part2Diagnostics.title')

            return (
                <SectionErrorBoundary key={entry.key} name={`PolicyBranchMega:${entry.key}`}>
                    <div className={cls.sectionBlock}>
                        <div id={termsDomId}>
                            {termsState.error ?
                                <PageSectionDataState
                                    isError
                                    error={termsState.error}
                                    hasData={false}
                                    onRetry={refetch}
                                    title={t('policyBranchMega.page.errors.terms.title')}
                                    description={t('policyBranchMega.page.errors.terms.message')}
                                    logContext={{
                                        source: 'policy-branch-mega-terms',
                                        extra: {
                                            part: entry.part,
                                            bucket: sectionBucket ?? 'all'
                                        }
                                    }}>
                                    {null}
                                </PageSectionDataState>
                            : termsState.terms.length > 0 ?
                                <ReportTableTermsBlock
                                    terms={termsState.terms.map(term => ({
                                        key: term.key,
                                        title: term.title,
                                        resolveDescription: () => {
                                            const resolved = getPolicyBranchMegaTerm(term.key, {
                                                locale: termsLocale
                                            })

                                            return resolved.description
                                        }
                                    }))}
                                    enhanceDomainTerms
                                    showTermTitleTooltip={false}
                                    title={termsTitle}
                                    subtitle={termsSubtitle}
                                    className={cls.termsBlock}
                                />
                            :   null}
                        </div>

                        <div id={tableDomId}>
                            {(() => {
                                const rowEvaluationAlertSummary = resolvePolicySetupLinkAlertSummaryForMegaRows({
                                    rows: section.rows ?? [],
                                    columns: section.columns ?? [],
                                    rowEvaluationMap,
                                    evaluationMapReady: rowEvaluationState?.ready ?? false,
                                    rowEvaluationError: rowEvaluationState?.error ?? null
                                })

                                const table = (
                                    <ReportTableCard
                                        title={
                                            normalizePolicyBranchMegaTitle(section.title) ||
                                            t('policyBranchMega.page.table.titleFallback', {
                                                part: entry.part
                                            })
                                        }
                                        description={resolveMergedMegaDescriptionForPart(
                                            entry.part,
                                            effectiveSelection.slMode,
                                            (key, options) => t(key, options)
                                        )}
                                        columns={section.columns ?? []}
                                        rows={section.rows ?? []}
                                        domId={`${tableDomId}-table`}
                                        renderColumnTitle={renderColumnTitle}
                                        rowEvaluationMap={rowEvaluationMap}
                                        getRowKey={row => resolveMegaRenderedRowKey(row, section.columns ?? [])}
                                        renderCellOverride={(value, rowIndex, _colIdx, columnTitle) => {
                                            if (columnTitle !== 'Policy' || typeof value !== 'string') {
                                                return null
                                            }

                                            const cellState = resolvePolicySetupCellStateForMegaRow({
                                                row: section.rows?.[rowIndex],
                                                columns: section.columns ?? [],
                                                rowEvaluationMap,
                                                evaluationMapReady: rowEvaluationState?.ready ?? false
                                            })

                                            if (cellState.detailPath) {
                                                // Переход идёт по setupId из backend row-evaluation,
                                                // а не по фронтовому восстановлению identity из витринных колонок.
                                                return (
                                                    <Link to={cellState.detailPath} className={cls.policySetupLink}>
                                                        {value}
                                                    </Link>
                                                )
                                            }

                                            return <span>{value}</span>
                                        }}
                                        virtualizeRows
                                        tableMaxHeight='min(72vh, 960px)'
                                    />
                                )

                                return (
                                    <>
                                        {rowEvaluationAlertSummary && (
                                            <section className={cls.validationAlert} role='alert' aria-live='polite'>
                                                <div className={cls.validationAlertHeader}>
                                                    <Text type='h4' className={cls.validationAlertTitle}>
                                                        {rowEvaluationAlertSummary.error ?
                                                            'Ссылки на графики политики недоступны'
                                                        :   `Ссылки на графики политики не опубликованы для ${rowEvaluationAlertSummary.missingLinkCount} строк`}
                                                    </Text>
                                                </div>
                                                <Text className={cls.validationAlertText}>
                                                    {rowEvaluationAlertSummary.error ?
                                                        `Ожидалось: опубликованная карта оценок строк для ${rowEvaluationAlertSummary.expectedLinkCount} строк текущей части. Получено: ${rowEvaluationAlertSummary.error.message}.`
                                                    :   `Ожидалось: переходы на график setup для всех ${rowEvaluationAlertSummary.expectedLinkCount} строк текущей части. Получено: ${rowEvaluationAlertSummary.resolvedLinkCount} ссылок и ${rowEvaluationAlertSummary.missingLinkCount} строк без setupId.`}
                                                </Text>
                                                {!rowEvaluationAlertSummary.error && rowEvaluationAlertSummary.sampleLabels.length > 0 && (
                                                    <Text className={cls.validationAlertDetail}>
                                                        {`Примеры: ${rowEvaluationAlertSummary.sampleLabels.join(' · ')}.`}
                                                    </Text>
                                                )}
                                                {!rowEvaluationAlertSummary.error && rowEvaluationAlertSummary.sampleDetails.length > 0 && (
                                                    <Text className={cls.validationAlertDetail}>
                                                        {`Причина: ${rowEvaluationAlertSummary.sampleDetails.join(' | ')}.`}
                                                    </Text>
                                                )}
                                                {rowEvaluationAlertSummary.error && (
                                                    <Text className={cls.validationAlertDetail}>
                                                        {`Причина: ${rowEvaluationAlertSummary.error.message}`}
                                                    </Text>
                                                )}
                                            </section>
                                        )}
                                        {table}
                                    </>
                                )
                            })()}
                        </div>

                        {entry.part === 2 && (
                            <section className={cls.diagnosticsLinkBlock}>
                                <div className={cls.diagnosticsLinkHeader}>
                                    <Text type='h4' className={cls.diagnosticsLinkTitle}>
                                        {diagnosticsTitle}
                                    </Text>
                                    <Text className={cls.diagnosticsLinkDescription}>
                                        {t('policyBranchMega.page.part2Diagnostics.description')}
                                    </Text>
                                </div>

                                <ul className={cls.diagnosticsLinkList}>
                                    <li>
                                        {renderTermTooltipRichText(
                                            t('policyBranchMega.page.part2Diagnostics.items.item1')
                                        )}
                                    </li>
                                    <li>
                                        {renderTermTooltipRichText(
                                            t('policyBranchMega.page.part2Diagnostics.items.item2')
                                        )}
                                    </li>
                                    <li>
                                        {renderTermTooltipRichText(
                                            t('policyBranchMega.page.part2Diagnostics.items.item3')
                                        )}
                                    </li>
                                    <li>
                                        {renderTermTooltipRichText(
                                            t('policyBranchMega.page.part2Diagnostics.items.item4')
                                        )}
                                    </li>
                                </ul>

                                <Link to={diagnosticsLink} className={cls.diagnosticsLinkAction}>
                                    {t('policyBranchMega.page.part2Diagnostics.link')}
                                </Link>
                            </section>
                        )}
                    </div>
                </SectionErrorBoundary>
            )
        },
        [
            effectiveSelection.slMode,
            isSeparateAllBucketsSelection,
            refetch,
            renderColumnTitle,
            rowEvaluationMapsByPart,
            rowEvaluationStatesByPart,
            searchParams,
            sectionTermsStateByKey,
            t,
            termsLocale
        ]
    )

    const handleBucketChange = useCallback(
        (next: PolicyBranchMegaBucketMode) => {
            if (next === effectiveSelection.bucket) return
            const nextParams = new URLSearchParams(searchParams)
            nextParams.set('bucket', next)
            if (next === 'total') {
                nextParams.set('bucketview', DEFAULT_POLICY_BRANCH_MEGA_TOTAL_BUCKET_VIEW)
            } else {
                nextParams.delete('bucketview')
            }
            setSearchParams(nextParams, { replace: true })
        },
        [effectiveSelection.bucket, searchParams, setSearchParams]
    )

    const handleHistoryChange = useCallback(
        (next: PolicyBranchMegaHistoryMode) => {
            if (next === effectiveSelection.history) return
            const nextParams = new URLSearchParams(searchParams)
            nextParams.set('history', next)
            setSearchParams(nextParams, { replace: true })
        },
        [effectiveSelection.history, searchParams, setSearchParams]
    )

    const handleBucketViewChange = useCallback(
        (next: PolicyBranchMegaTotalBucketView) => {
            if (next === effectiveSelection.bucketView) return
            const nextParams = new URLSearchParams(searchParams)
            nextParams.set('bucketview', next)
            setSearchParams(nextParams, { replace: true })
        },
        [effectiveSelection.bucketView, searchParams, setSearchParams]
    )

    const handleMetricChange = useCallback(
        (next: PolicyBranchMegaMetricMode) => {
            if (next === effectiveSelection.metric) return
            const nextParams = new URLSearchParams(searchParams)
            nextParams.set('metric', next)
            setSearchParams(nextParams, { replace: true })
        },
        [effectiveSelection.metric, searchParams, setSearchParams]
    )

    const handleTpSlModeChange = useCallback(
        (next: PolicyBranchMegaTpSlMode) => {
            if (next === effectiveSelection.tpSlMode) return
            const nextParams = new URLSearchParams(searchParams)
            nextParams.set('tpsl', next)
            setSearchParams(nextParams, { replace: true })
        },
        [effectiveSelection.tpSlMode, searchParams, setSearchParams]
    )

    const handleSlModeChange = useCallback(
        (next: PolicyBranchMegaSlMode) => {
            if (next === effectiveSelection.slMode) return
            const nextParams = new URLSearchParams(searchParams)
            nextParams.set('slmode', next)
            setSearchParams(nextParams, { replace: true })
        },
        [effectiveSelection.slMode, searchParams, setSearchParams]
    )

    const handleZonalModeChange = useCallback(
        (next: PolicyBranchMegaZonalMode) => {
            if (next === effectiveSelection.zonalMode) return
            const nextParams = new URLSearchParams(searchParams)
            nextParams.set('zonal', next)
            setSearchParams(nextParams, { replace: true })
        },
        [effectiveSelection.zonalMode, searchParams, setSearchParams]
    )

    const controlGroups = useMemo(() => {
        const displayGroup = {
            key: 'mega-display',
            label: t('policyBranchMega.page.controls.displayModeLabel'),
            ariaLabel: t('policyBranchMega.page.controls.displayModeAriaLabel'),
            infoTooltip: t('policyBranchMega.page.controls.displayModeTooltip'),
            value: effectiveDisplayMode,
            options:
                isChartSupported ?
                    [
                        {
                            value: 'chart' as const,
                            label: t('policyBranchMega.page.viewMode.chart')
                        },
                        {
                            value: 'table' as const,
                            label: t('policyBranchMega.page.viewMode.table')
                        }
                    ]
                :   [
                        {
                            value: 'table' as const,
                            label: t('policyBranchMega.page.viewMode.table')
                        }
                    ],
            onChange: (next: 'table' | 'chart') => setDisplayMode(next)
        }
        const historyGroup = buildMegaHistoryControlGroup({
            value: effectiveSelection.history,
            onChange: handleHistoryChange,
            splitStats: trainingScopeStatsQuery.data ?? null,
            availableValues:
                normalizedAvailableHistories.length > 0 ?
                    normalizedAvailableHistories
                :   undefined
        })
        const bucketGroup = buildMegaBucketControlGroup({
            value: effectiveSelection.bucket,
            onChange: handleBucketChange
        })
        const totalBucketViewGroup = buildMegaTotalBucketViewControlGroup({
            value: effectiveSelection.bucketView,
            onChange: handleBucketViewChange
        })
        const metricGroup = buildMegaMetricControlGroup({
            value: effectiveSelection.metric,
            onChange: handleMetricChange
        })
        const tpSlGroup = buildMegaTpSlControlGroup({
            value: effectiveSelection.tpSlMode,
            onChange: handleTpSlModeChange
        })
        const slModeGroup = buildMegaSlModeControlGroup({
            value: effectiveSelection.slMode,
            onChange: handleSlModeChange
        })
        const zonalGroup = buildMegaZonalControlGroup({
            value: effectiveSelection.zonalMode,
            onChange: handleZonalModeChange
        })
        return [
            displayGroup,
            historyGroup,
            {
                ...bucketGroup,
                options: bucketGroup.options
            },
            ...(effectiveSelection.bucket === 'total' ?
                [
                    {
                        ...totalBucketViewGroup,
                        options: totalBucketViewGroup.options
                    }
                ]
            :   []),
            metricGroup,
            tpSlGroup,
            slModeGroup,
            zonalGroup
        ]
    }, [
        effectiveDisplayMode,
        effectiveSelection.history,
        effectiveSelection.bucket,
        effectiveSelection.bucketView,
        effectiveSelection.metric,
        effectiveSelection.slMode,
        effectiveSelection.tpSlMode,
        effectiveSelection.zonalMode,
        handleBucketChange,
        handleHistoryChange,
        handleBucketViewChange,
        handleMetricChange,
        handleSlModeChange,
        handleTpSlModeChange,
        handleZonalModeChange,
        isChartSupported,
        normalizedAvailableHistories,
        trainingScopeStatsQuery.data,
        t,
    ])

    const sourceEndpointState = useMemo(() => {
        try {
            return {
                value: resolveReportSourceEndpoint(),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to resolve report source endpoint.', {
                source: 'policy-branch-mega-source-endpoint',
                domain: 'ui_section',
                owner: 'policy-branch-mega-page',
                expected: 'Mega page should resolve a non-empty report source endpoint.',
                requiredAction: 'Inspect API base URL configuration and report source endpoint resolver.'
            })
            return {
                value: null as string | null,
                error: safeError
            }
        }
    }, [])

    const controlsErrorState = useMemo(() => {
        if (historyState.error && !resolvedQuery) {
            return {
                title: t('policyBranchMega.page.errors.historyQuery.title'),
                description: t('policyBranchMega.page.errors.historyQuery.message'),
                error: historyState.error
            }
        }

        if (bucketState.error && !resolvedQuery) {
            return {
                title: t('policyBranchMega.page.errors.bucketViewQuery.title'),
                description: t('policyBranchMega.page.errors.bucketViewQuery.message'),
                error: bucketState.error
            }
        }

        if (bucketViewState.error && !resolvedQuery) {
            return {
                title: t('policyBranchMega.page.errors.bucketQuery.title'),
                description: t('policyBranchMega.page.errors.bucketQuery.message'),
                error: bucketViewState.error
            }
        }

        if (metricState.error && !resolvedQuery) {
            return {
                title: t('policyBranchMega.page.errors.metricQuery.title'),
                description: t('policyBranchMega.page.errors.metricQuery.message'),
                error: metricState.error
            }
        }

        if (tpSlState.error && !resolvedQuery) {
            return {
                title: t('policyBranchMega.page.errors.tpSlQuery.title'),
                description: t('policyBranchMega.page.errors.tpSlQuery.message'),
                error: tpSlState.error
            }
        }

        if (slModeState.error && !resolvedQuery) {
            return {
                title: t('policyBranchMega.page.errors.slModeQuery.title'),
                description: t('policyBranchMega.page.errors.slModeQuery.message'),
                error: slModeState.error
            }
        }

        if (zonalState.error && !resolvedQuery) {
            return {
                title: t('policyBranchMega.page.errors.zonalQuery.title'),
                description: t('policyBranchMega.page.errors.zonalQuery.message'),
                error: zonalState.error
            }
        }

        return null
    }, [
        historyState.error,
        bucketState.error,
        bucketViewState.error,
        metricState.error,
        resolvedQuery,
        slModeState.error,
        t,
        tpSlState.error,
        zonalState.error
    ])

    const reportAreaErrorState = useMemo(() => {
        if (!primaryReport) {
            return null
        }

        if (generatedAtState.error) {
            return {
                title: t('policyBranchMega.page.errors.invalidGeneratedAt.title'),
                description: t('policyBranchMega.page.errors.invalidGeneratedAt.message'),
                error: generatedAtState.error
            }
        }

        if (sourceEndpointState.error) {
            return {
                title: t('policyBranchMega.page.errors.invalidSource.title'),
                description: t('policyBranchMega.page.errors.invalidSource.message'),
                error: sourceEndpointState.error
            }
        }

        if (visibleSectionEntriesState.error) {
            return {
                title: t('policyBranchMega.page.errors.sections.title'),
                description: t('policyBranchMega.page.errors.sections.message'),
                error: visibleSectionEntriesState.error
            }
        }

        if (tableRenderedSectionsState.error) {
            return {
                title: t('policyBranchMega.page.errors.sections.title'),
                description: t('policyBranchMega.page.errors.sections.message'),
                error: tableRenderedSectionsState.error
            }
        }

        return null
    }, [
        generatedAtState.error,
        primaryReport,
        sourceEndpointState.error,
        tableRenderedSectionsState.error,
        t,
        visibleSectionEntriesState.error
    ])

    const modeMoneySummaryViewGroup = useMemo<ReportViewControlGroup<ModeMoneySummaryViewMode>>(
        () => ({
            key: 'mode-money-summary-view',
            label: t('policyBranchMega.page.modeMoneySummary.view.label'),
            value: modeMoneySummaryView,
            onChange: next => setModeMoneySummaryView(next),
            options: [
                {
                    value: 'compact',
                    label: t('policyBranchMega.page.modeMoneySummary.view.compact.label'),
                    tooltip: t('policyBranchMega.page.modeMoneySummary.view.compact.hint')
                },
                {
                    value: 'expanded',
                    label: t('policyBranchMega.page.modeMoneySummary.view.expanded.label'),
                    tooltip: t('policyBranchMega.page.modeMoneySummary.view.expanded.hint')
                }
            ]
        }),
        [modeMoneySummaryView, t]
    )

    const modeMoneySummaryTable = useMemo(() => {
        const summary = modeMoneySummaryQuery.data
        if (!summary) {
            return null
        }

        const columnDefinitions = [
            { key: 'mode', label: t('policyBranchMega.page.modeMoneySummary.columns.mode') },
            { key: 'slice', label: t('policyBranchMega.page.modeMoneySummary.columns.slice') },
            { key: 'fromDate', label: t('policyBranchMega.page.modeMoneySummary.columns.fromDate') },
            { key: 'toDate', label: t('policyBranchMega.page.modeMoneySummary.columns.toDate') },
            { key: 'source', label: t('policyBranchMega.page.modeMoneySummary.columns.source') },
            { key: 'status', label: t('policyBranchMega.page.modeMoneySummary.columns.status') },
            { key: 'execution', label: t('policyBranchMega.page.modeMoneySummary.columns.execution') },
            { key: 'days', label: t('policyBranchMega.page.modeMoneySummary.columns.days') },
            { key: 'trades', label: t('policyBranchMega.page.modeMoneySummary.columns.trades') },
            {
                key: 'predictionQuality',
                label: t('policyBranchMega.page.modeMoneySummary.columns.predictionQuality')
            },
            { key: 'totalReturn', label: t('policyBranchMega.page.modeMoneySummary.columns.totalReturn') },
            { key: 'totalPnlUsd', label: t('policyBranchMega.page.modeMoneySummary.columns.totalPnlUsd') },
            {
                key: 'startCapitalUsd',
                label: t('policyBranchMega.page.modeMoneySummary.columns.startCapitalUsd')
            },
            { key: 'equityNowUsd', label: t('policyBranchMega.page.modeMoneySummary.columns.equityNowUsd') },
            { key: 'withdrawnUsd', label: t('policyBranchMega.page.modeMoneySummary.columns.withdrawnUsd') },
            { key: 'fundingNetUsd', label: t('policyBranchMega.page.modeMoneySummary.columns.fundingNetUsd') },
            { key: 'maxDrawdown', label: t('policyBranchMega.page.modeMoneySummary.columns.maxDrawdown') },
            { key: 'sharpe', label: t('policyBranchMega.page.modeMoneySummary.columns.sharpe') },
            {
                key: 'realLiquidations',
                label: t('policyBranchMega.page.modeMoneySummary.columns.realLiquidations')
            },
            { key: 'accountRuins', label: t('policyBranchMega.page.modeMoneySummary.columns.accountRuins') },
            { key: 'sourcePath', label: t('policyBranchMega.page.modeMoneySummary.columns.sourcePath') }
        ] satisfies Array<{ key: ModeMoneySummaryColumnKey; label: string }>

        const visibleColumns =
            modeMoneySummaryView === 'compact' ?
                columnDefinitions.filter(column => MODE_MONEY_SUMMARY_COMPACT_COLUMN_KEYS.has(column.key))
            :   columnDefinitions

        const rows = summary.rows.map(row => {
            const sourceLabel = resolveModeMoneySummarySourceKindLabel(row.moneySourceKind, key => t(key))
            const statusLabel = resolveModeMoneySummaryStatusLabel(row.sourceStatus, key => t(key))
            const statusText =
                row.sourceStatus === 'available' ? statusLabel : `${statusLabel}: ${row.statusMessage}`
            const metrics = row.moneyMetrics
            const valuesByColumn: Record<ModeMoneySummaryColumnKey, string> = {
                mode: row.modeLabel,
                slice: row.sliceLabel,
                fromDate: formatModeMoneyDate(row.tradingStartDateUtc, 'tradingStartDateUtc'),
                toDate: formatModeMoneyDate(row.tradingEndDateUtc, 'tradingEndDateUtc'),
                source: sourceLabel,
                status: statusText,
                execution: row.executionDescriptor,
                days: formatModeMoneyInteger(row.completedDayCount, i18n.language, 'completedDayCount'),
                trades: formatModeMoneyInteger(row.tradeCount, i18n.language, 'tradeCount'),
                predictionQuality: formatModeMoneyPredictionQuality(
                    row.predictionQualityMetrics,
                    i18n.language,
                    key => t(key)
                ),
                totalReturn: formatModeMoneyPercent(metrics.totalPnlPct, i18n.language, 'moneyMetrics.totalPnlPct'),
                totalPnlUsd: formatModeMoneyUsd(metrics.totalPnlUsd, i18n.language, 'moneyMetrics.totalPnlUsd'),
                startCapitalUsd: formatModeMoneyUsd(
                    metrics.startCapitalUsd,
                    i18n.language,
                    'moneyMetrics.startCapitalUsd'
                ),
                equityNowUsd: formatModeMoneyUsd(
                    metrics.equityNowUsd,
                    i18n.language,
                    'moneyMetrics.equityNowUsd'
                ),
                withdrawnUsd: formatModeMoneyUsd(
                    metrics.withdrawnTotalUsd,
                    i18n.language,
                    'moneyMetrics.withdrawnTotalUsd'
                ),
                fundingNetUsd: formatModeMoneyUsd(
                    metrics.fundingNetUsd,
                    i18n.language,
                    'moneyMetrics.fundingNetUsd'
                ),
                maxDrawdown: formatModeMoneyPercent(row.maxDrawdownPct, i18n.language, 'maxDrawdownPct'),
                sharpe: formatModeMoneyDecimal(metrics.sharpe, i18n.language, 'moneyMetrics.sharpe', 3),
                realLiquidations: formatModeMoneyInteger(
                    metrics.realLiquidationCount,
                    i18n.language,
                    'moneyMetrics.realLiquidationCount'
                ),
                accountRuins: formatModeMoneyInteger(
                    metrics.accountRuinCount,
                    i18n.language,
                    'moneyMetrics.accountRuinCount'
                ),
                sourcePath: row.sourceLocationHint
            }

            return visibleColumns.map(column => valuesByColumn[column.key])
        })

        return {
            columns: visibleColumns.map(column => column.label),
            rows
        }
    }, [i18n.language, modeMoneySummaryQuery.data, modeMoneySummaryView, t])

    const renderHeader = () => (
        <header className={cls.hero}>
            <div>
                <Text type='h1' className={cls.heroTitle}>
                    {t('policyBranchMega.page.title')}
                </Text>
                <Text className={cls.heroSubtitle}>{t('policyBranchMega.page.subtitle')}</Text>

                <ReportViewControls groups={controlGroups} />
            </div>

            {primaryReport && sourceEndpointState.value && generatedAtState.value && (
                <ReportActualStatusCard
                    statusMode='actual'
                    statusTitle={t('policyBranchMega.page.status.publishedTitle')}
                    dataSource={sourceEndpointState.value}
                    reportTitle={primaryReport.title}
                    reportId={primaryReport.id}
                    reportKind={primaryReport.kind}
                    generatedAtUtc={primaryReport.generatedAtUtc}
                />
            )}
        </header>
    )

    return (
        <div className={rootClassName}>
            <PageDataState
                shell={
                    <>
                        {renderHeader()}

                        {partCatalogAlertState && (
                            <section className={cls.validationAlert} role='alert' aria-live='polite'>
                                <div className={cls.validationAlertHeader}>
                                    <Text type='h4' className={cls.validationAlertTitle}>
                                        {partCatalogAlertState.title}
                                    </Text>
                                </div>
                                <Text className={cls.validationAlertText}>{partCatalogAlertState.description}</Text>
                                <Text className={cls.validationAlertDetail}>{partCatalogAlertState.detail}</Text>
                            </section>
                        )}

                        {validationAlertState && !isValidationAlertDismissed && (
                            <section className={cls.validationAlert} role='alert' aria-live='polite'>
                                <div className={cls.validationAlertHeader}>
                                    <Text type='h4' className={cls.validationAlertTitle}>
                                        {validationAlertState.title}
                                    </Text>
                                    <button
                                        type='button'
                                        className={cls.validationAlertDismiss}
                                        onClick={() => setDismissedValidationKey(validationAlertState.key)}>
                                        {t('policyBranchMega.page.validation.dismiss')}
                                    </button>
                                </div>
                                <Text className={cls.validationAlertText}>{validationAlertState.description}</Text>
                                {validationAlertState.detail && (
                                    <Text className={cls.validationAlertDetail}>{validationAlertState.detail}</Text>
                                )}
                            </section>
                        )}

                        {controlsErrorState && (
                            <PageSectionDataState
                                isError
                                error={controlsErrorState.error}
                                hasData={false}
                                onRetry={refetch}
                                title={controlsErrorState.title}
                                description={controlsErrorState.description}
                                logContext={{ source: 'policy-branch-mega-controls' }}>
                                {null}
                            </PageSectionDataState>
                        )}

                        <section className={cls.overviewBlock} id={MEGA_OVERVIEW_DOM_ID}>
                            <Text type='h3' className={cls.overviewTitle}>
                                {t('policyBranchMega.page.overview.whatIsReport.title')}
                            </Text>
                            <ul className={cls.overviewList}>
                                <li>
                                    {renderTermTooltipRichText(t('policyBranchMega.page.overview.whatIsReport.items.item1'))}
                                </li>
                                <li>
                                    {renderTermTooltipRichText(t('policyBranchMega.page.overview.whatIsReport.items.item2'))}
                                </li>
                                <li>
                                    {renderTermTooltipRichText(t('policyBranchMega.page.overview.whatIsReport.items.item3'))}
                                </li>
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
                                </li>
                                <li>
                                    {renderTermTooltipRichText(t('policyBranchMega.page.overview.comparison.items.tpSlMode'))}
                                </li>
                                <li>
                                    {renderTermTooltipRichText(t('policyBranchMega.page.overview.comparison.items.zonal'))}
                                </li>
                                <li>
                                    {renderTermTooltipRichText(
                                        t('policyBranchMega.page.overview.comparison.items.metricView')
                                    )}
                                </li>
                                <li>
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
                                <li>
                                    {renderTermTooltipRichText(t('policyBranchMega.page.overview.basics.items.item1'))}
                                </li>
                                <li>
                                    {renderTermTooltipRichText(t('policyBranchMega.page.overview.basics.items.item2'))}
                                </li>
                                <li>
                                    {renderTermTooltipRichText(t('policyBranchMega.page.overview.basics.items.item3'))}
                                </li>
                                <li>
                                    {renderTermTooltipRichText(t('policyBranchMega.page.overview.basics.items.item4'))}
                                </li>
                                <li>
                                    {renderTermTooltipRichText(t('policyBranchMega.page.overview.basics.items.item5'))}
                                </li>
                                <li>
                                    {renderTermTooltipRichText(t('policyBranchMega.page.overview.basics.items.item6'))}
                                </li>
                            </ul>

                            <Text type='h4' className={cls.overviewSubTitle}>
                                {t('policyBranchMega.page.overview.simulation.title')}
                            </Text>
                            <ul className={cls.overviewList}>
                                <li>
                                    {renderTermTooltipRichText(t('policyBranchMega.page.overview.simulation.items.item1'))}
                                </li>
                                <li>
                                    {renderTermTooltipRichText(t('policyBranchMega.page.overview.simulation.items.item2'))}
                                </li>
                                <li>
                                    {renderTermTooltipRichText(t('policyBranchMega.page.overview.simulation.items.item3'))}
                                </li>
                                <li>
                                    {t('policyBranchMega.page.overview.simulation.items.item4Prefix')}{' '}
                                    <TermTooltip
                                        term='EndOfDay'
                                        description={() =>
                                            enrichTermTooltipDescription(
                                                t('policyBranchMega.page.overview.simulation.endOfDayTooltip'),
                                                { term: 'EndOfDay' }
                                            )
                                        }
                                        type='span'
                                    />
                                    .
                                </li>
                            </ul>
                        </section>

                        <section className={cls.sectionBlock} id={MEGA_MODE_MONEY_SUMMARY_DOM_ID}>
                            <div className={cls.overviewBlock}>
                                <Text type='h3' className={cls.overviewTitle}>
                                    {t('policyBranchMega.page.modeMoneySummary.title')}
                                </Text>
                                <Text className={cls.overviewText}>
                                    {renderTermTooltipRichText(t('policyBranchMega.page.modeMoneySummary.description'))}
                                </Text>
                                <ul className={cls.overviewList}>
                                    <li>
                                        {renderTermTooltipRichText(
                                            t('policyBranchMega.page.modeMoneySummary.notes.item1')
                                        )}
                                    </li>
                                    <li>
                                        {renderTermTooltipRichText(
                                            t('policyBranchMega.page.modeMoneySummary.notes.item2')
                                        )}
                                    </li>
                                    <li>
                                        {renderTermTooltipRichText(
                                            t('policyBranchMega.page.modeMoneySummary.notes.item3')
                                        )}
                                    </li>
                                    <li>
                                        {renderTermTooltipRichText(
                                            t('policyBranchMega.page.modeMoneySummary.notes.item4')
                                        )}
                                    </li>
                                </ul>
                            </div>

                            <PageSectionDataState
                                isLoading={modeMoneySummaryQuery.isLoading}
                                isError={Boolean(modeMoneySummaryQuery.error)}
                                error={modeMoneySummaryQuery.error}
                                hasData={Boolean(modeMoneySummaryTable && modeMoneySummaryTable.rows.length > 0)}
                                onRetry={() => void modeMoneySummaryQuery.refetch()}
                                title={t('policyBranchMega.page.modeMoneySummary.errors.title')}
                                description={t('policyBranchMega.page.modeMoneySummary.errors.message')}
                                loadingText={t('errors:ui.pageDataBoundary.loading', { defaultValue: 'Loading data' })}
                                logContext={{ source: 'policy-branch-mega-mode-money-summary' }}>
                                {modeMoneySummaryTable ?
                                    <>
                                        <ReportViewControls groups={[modeMoneySummaryViewGroup]} />
                                        <ReportTableCard
                                            title={t('policyBranchMega.page.modeMoneySummary.tableTitle')}
                                            description={t('policyBranchMega.page.modeMoneySummary.tableDescription')}
                                            columns={modeMoneySummaryTable.columns}
                                            rows={modeMoneySummaryTable.rows}
                                            domId={`${MEGA_MODE_MONEY_SUMMARY_DOM_ID}-table`}
                                            tableMaxHeight='min(72vh, 640px)'
                                            virtualizeRows
                                        />
                                    </>
                                :   <Text>{t('policyBranchMega.page.modeMoneySummary.empty')}</Text>}
                            </PageSectionDataState>
                        </section>
                    </>
                }
                isLoading={isLoading}
                isError={Boolean(isError || reportAreaErrorState)}
                error={error ?? reportAreaErrorState?.error}
                hasData={Boolean(primaryReport && !reportAreaErrorState)}
                onRetry={refetch}
                title={reportAreaErrorState?.title ?? t('policyBranchMega.page.errorTitle')}
                description={reportAreaErrorState?.description}
                loadingText={t('errors:ui.pageDataBoundary.loading', { defaultValue: 'Loading data' })}
                logContext={{ source: 'policy-branch-mega-report' }}>
                {primaryReport && !reportAreaErrorState && (
                    <>
                        {!hasLoadedReportSections ?
                            <Text>{t('policyBranchMega.page.empty')}</Text>
                        : effectiveDisplayMode === 'table' && pageTabs.length === 0 && tableRenderedSectionsState.entries.length === 0 ?
                            <Text>{t('policyBranchMega.page.emptyColumns')}</Text>
                        : effectiveDisplayMode === 'chart' ?
                            <PageSectionDataState
                                isLoading={loadedPartReportsState.chartIsLoading}
                                isError={Boolean(chartModelState.error)}
                                error={chartModelState.error}
                                hasData={Boolean(chartModelState.model)}
                                onRetry={refetch}
                                title={t('policyBranchMega.page.errors.chartModel.title')}
                                description={t('policyBranchMega.page.errors.chartModel.message')}
                                logContext={{ source: 'policy-branch-mega-chart' }}>
                                {chartModelState.model && (
                                    <PolicyBranchMegaChartExplorer
                                        model={chartModelState.model}
                                        termsLocale={termsLocale}
                                        translate={(key, options) => t(key, options)}
                                    />
                                )}
                            </PageSectionDataState>
                        :   <>
                                <div className={cls.sectionsGrid}>
                                    {tableRenderedSectionsState.entries.map(renderTableSectionEntry)}
                                </div>
                            </>
                        }

                        {effectiveDisplayMode === 'table' && pageTabs.length > 1 && (
                            <SectionPager
                                sections={pageTabs}
                                currentIndex={currentIndex}
                                canPrev={canPrev}
                                canNext={canNext}
                                onPrev={handlePrev}
                                onNext={handleNext}
                            />
                        )}
                    </>
                )}
            </PageDataState>
        </div>
    )
}
