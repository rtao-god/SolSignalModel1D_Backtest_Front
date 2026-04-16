import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import classNames from '@/shared/lib/helpers/classNames'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'
import {
    Btn,
    Input,
    ReportTableCard,
    ReportTableTermsBlock,
    ReportTimingSection,
    ReportViewControls,
    TermTooltip,
    Text,
    buildPredictionPolicyBucketControlGroup,
    buildTrainingScopeControlGroup,
    formatTimingExactUtc,
    formatTimingUtc,
    renderTermTooltipRichText,
    type ReportViewControlGroup
} from '@/shared/ui'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import type { TableRow } from '@/shared/ui/SortableTable'
import { useAggregationMetricsQuery } from '@/shared/api/tanstackQueries/aggregation'
import {
    useRealForecastJournalDayListQuery,
    useRealForecastJournalDayQuery,
    useRealForecastJournalLiveStatusQuery,
    useRealForecastJournalOpsStatusQuery
} from '@/shared/api/tanstackQueries/realForecastJournal'
import { useBacktestConfidenceRiskReportQuery } from '@/shared/api/tanstackQueries/backtestConfidenceRisk'
import {
    useCurrentPredictionBackfilledTrainingScopeStatsQuery,
    type CurrentPredictionBackfilledTrainingScopeStats
} from '@/shared/api/tanstackQueries/currentPrediction'
import type { CurrentPredictionTrainingScope } from '@/shared/api/endpoints/reportEndpoints'
import type {
    RealForecastJournalDayStatus,
    RealForecastJournalDirection,
    RealForecastJournalDayListItemDto,
    RealForecastJournalDayRecordDto,
    RealForecastJournalLiveRowObservationDto,
    RealForecastJournalLiveStatusDto,
    RealForecastJournalOpsStatusDto,
    RealForecastJournalPolicyBucket,
    RealForecastJournalRunKind
} from '@/shared/types/realForecastJournal.types'
import {
    buildAggregationComparison,
    buildCombinedPolicyRows,
    buildConfidenceRiskComparison,
    buildIndicatorComparisonRows,
    buildIndicatorGroupOptions,
    buildPolicyBranchOptions,
    filterCombinedPolicyRows,
    type RealForecastJournalBranchFilter,
    type RealForecastJournalCombinedPolicyRow,
    type RealForecastJournalComparisonSource,
    type RealForecastJournalIndicatorGroupFilter,
    type RealForecastJournalPolicySearchValue
} from './realForecastJournalPageModel'
import {
    resolveRealForecastJournalColumnTooltip,
    type RealForecastJournalResolvedTooltip,
    type RealForecastJournalTermsLocale
} from './realForecastJournalTerms'
import {
    localizeExitReasonLabel,
    resolveReportLiquidationFallbackLabel
} from '@/shared/utils/reportCellLocalization'
import cls from './RealForecastJournalPage.module.scss'
import type { RealForecastJournalPageProps } from './types'
import { PageDataState, PageSectionDataState } from '@/shared/ui/errors/PageDataState'
import { buildReportTermsFromReferences } from '@/shared/utils/reportTerms'

const DEFAULT_COMPARISON_SOURCE: RealForecastJournalComparisonSource = 'aggregation'
const DEFAULT_COMPARISON_SCOPE: CurrentPredictionTrainingScope = 'oos'
const DEFAULT_BUCKET_FILTER: RealForecastJournalPolicyBucket | 'total' = 'total'
const DEFAULT_BRANCH_FILTER: RealForecastJournalBranchFilter = 'all'
const DEFAULT_POLICY_SEARCH: RealForecastJournalPolicySearchValue = ''
const DEFAULT_INDICATOR_GROUP: RealForecastJournalIndicatorGroupFilter = 'all'
const DEFAULT_FORECAST_RUN_KIND: RealForecastJournalRunKind = 'main'

function resolveJournalTermsBlockTitle(locale: RealForecastJournalTermsLocale): string {
    return locale === 'ru' ? 'Термины секции' : 'Section terms'
}

function resolveJournalTermsBlockSubtitle(locale: RealForecastJournalTermsLocale): string {
    return locale === 'ru' ?
            'Краткие определения терминов, которые используются в блоке ниже.'
        :   'Short definitions of the terms used in the block below.'
}

function buildRealForecastJournalTerms(columns: string[], locale: RealForecastJournalTermsLocale) {
    const tooltipCache = new Map<string, RealForecastJournalResolvedTooltip>()

    const resolveTerm = (title: string): RealForecastJournalResolvedTooltip => {
        const cached = tooltipCache.get(title)
        if (cached) {
            return cached
        }

        const resolved = resolveRealForecastJournalColumnTooltip(title, locale)
        if (!resolved || !resolved.description.trim()) {
            throw new Error(`[real-forecast-journal] tooltip is missing for column=${title}.`)
        }

        tooltipCache.set(title, resolved)
        return resolved
    }

    return buildReportTermsFromReferences({
        references: columns.map(column => ({ key: column, title: column })),
        contextTag: 'real-forecast-journal-terms',
        resolveDescription: reference => resolveTerm(reference.key).description,
        resolveTooltip: reference => resolveTerm(reference.key).description,
        resolveSelfAliases: reference => resolveTerm(reference.key).selfAliases
    })
}

function resolveComparisonSource(raw: string | null): RealForecastJournalComparisonSource {
    if (!raw) return DEFAULT_COMPARISON_SOURCE
    const normalized = raw.trim().toLowerCase()
    if (normalized === 'aggregation') return 'aggregation'
    if (normalized === 'confidence-risk') return 'confidence-risk'
    throw new Error(`[real-forecast-journal] unsupported comparison source query value: ${raw}.`)
}

function resolveComparisonScope(raw: string | null): CurrentPredictionTrainingScope {
    if (!raw) return DEFAULT_COMPARISON_SCOPE
    const normalized = raw.trim().toLowerCase()
    if (normalized === 'oos') return 'oos'
    if (normalized === 'train') return 'train'
    if (normalized === 'recent') return 'recent'
    if (normalized === 'full') return 'full'
    throw new Error(`[real-forecast-journal] unsupported comparison scope query value: ${raw}.`)
}

function resolveForecastRunKind(raw: string | null): RealForecastJournalRunKind {
    if (!raw) return DEFAULT_FORECAST_RUN_KIND
    const normalized = raw.trim().toLowerCase()
    if (normalized === 'main') return 'main'
    if (normalized === 'preliminary') return 'preliminary'
    throw new Error(`[real-forecast-journal] unsupported forecast run kind query value: ${raw}.`)
}

function resolveSelectedDate(
    dayList: RealForecastJournalDayListItemDto[] | undefined,
    rawDate: string | null
): string | null {
    if (!dayList || dayList.length === 0) {
        return null
    }

    if (rawDate && dayList.some(item => item.predictionDateUtc === rawDate)) {
        return rawDate
    }

    return dayList[0].predictionDateUtc
}

function formatUtc(value: string, locale: string): string {
    return formatTimingUtc(value, locale)
}

function formatPercent(value: number, locale: string, maxDigits = 2): string {
    if (!Number.isFinite(value)) {
        throw new Error(`[real-forecast-journal] invalid percent value: ${value}.`)
    }

    return new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: maxDigits
    }).format(value)
}

function formatPercentPoints(value: number, locale: string, digits = 2): string {
    if (!Number.isFinite(value)) {
        throw new Error(`[real-forecast-journal] invalid percentage-point value: ${value}.`)
    }

    const unitLabel = locale.trim().toLowerCase().startsWith('ru') ? 'п.п.' : 'p.p.'

    return `${new Intl.NumberFormat(locale, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
    }).format(value * 100)} ${unitLabel}`
}

function formatMoney(value: number, locale: string): string {
    if (!Number.isFinite(value)) {
        throw new Error(`[real-forecast-journal] invalid money value: ${value}.`)
    }

    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value)
}

function formatPrice(value: number, locale: string): string {
    if (!Number.isFinite(value)) {
        throw new Error(`[real-forecast-journal] invalid price value: ${value}.`)
    }

    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4
    }).format(value)
}

function formatOptionalMoney(value: number | null, locale: string, fallback: string): string {
    return value === null ? fallback : formatMoney(value, locale)
}

function formatOptionalPrice(value: number | null, locale: string, fallback: string): string {
    return value === null ? fallback : formatPrice(value, locale)
}

function formatOptionalPercent(value: number | null, locale: string, fallback: string): string {
    return value === null ? fallback : formatPercent(value, locale)
}

function formatOptionalPercentPoints(value: number | null, locale: string, fallback: string): string {
    return value === null ? fallback : formatPercentPoints(value, locale)
}

function formatOptionalBoolean(value: boolean | null, trueLabel: string, falseLabel: string, fallback: string): string {
    if (value === null) {
        return fallback
    }

    return value ? trueLabel : falseLabel
}

function buildLiveRowsByKey(
    liveStatus: RealForecastJournalLiveStatusDto | undefined
): Map<string, RealForecastJournalLiveRowObservationDto> {
    const result = new Map<string, RealForecastJournalLiveRowObservationDto>()
    if (!liveStatus) {
        return result
    }

    for (const row of liveStatus.rows) {
        result.set(row.rowKey, row)
    }

    return result
}

function formatSignedMoney(value: number, locale: string): string {
    if (!Number.isFinite(value)) {
        throw new Error(`[real-forecast-journal] invalid signed money value: ${value}.`)
    }

    return `${value >= 0 ? '+' : ''}${new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value)}`
}

function formatSignedPercent(value: number, locale: string): string {
    if (!Number.isFinite(value)) {
        throw new Error(`[real-forecast-journal] invalid signed percent value: ${value}.`)
    }

    return `${value >= 0 ? '+' : ''}${new Intl.NumberFormat(locale, {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(value)}`
}

function formatTargetDistance(
    currentPrice: number | null,
    targetPrice: number | null,
    locale: string,
    fallback: string
): string {
    if (currentPrice === null || targetPrice === null) {
        return fallback
    }

    const deltaUsd = currentPrice - targetPrice
    const deltaPct = deltaUsd / targetPrice
    return `${formatSignedMoney(deltaUsd, locale)} / ${formatSignedPercent(deltaPct, locale)}`
}

function resolveLiveRowStatusText(
    row: RealForecastJournalLiveRowObservationDto | null,
    isFinalized: boolean,
    t: TranslateFn
): string {
    if (isFinalized) {
        return t('realForecastJournal.live.status.finalized', { defaultValue: 'Finalized day' })
    }

    if (!row) {
        return t('realForecastJournal.live.status.loading', { defaultValue: 'Loading live data' })
    }

    switch (row.status) {
        case 'not-tracked':
            return t('realForecastJournal.live.status.notTracked', { defaultValue: 'Not tracked for this row' })
        case 'open':
            return t('realForecastJournal.live.status.open', { defaultValue: 'Open' })
        case 'take-profit-hit':
            return t('realForecastJournal.live.status.tp', { defaultValue: 'Take-profit hit' })
        case 'stop-loss-hit':
            return t('realForecastJournal.live.status.sl', { defaultValue: 'Stop-loss hit' })
        case 'liquidation-hit':
            return t('realForecastJournal.live.status.liquidation', { defaultValue: 'Liquidation hit' })
        case 'end-of-day':
            return t('realForecastJournal.live.status.eod', { defaultValue: 'Window reached end-of-day' })
        default:
            throw new Error(`[real-forecast-journal] unsupported live row status: ${String(row.status)}.`)
    }
}

function formatLiveEventTime(
    row: RealForecastJournalLiveRowObservationDto | null,
    locale: string,
    fallback: string
): string {
    if (!row?.eventTimeUtc) {
        return fallback
    }

    return formatUtc(row.eventTimeUtc, locale)
}

type TranslateFn = ReturnType<typeof useTranslation>['t']

function resolveDayStatusBadge(status: RealForecastJournalDayStatus, t: TranslateFn): string {
    switch (status) {
        case 'scheduled':
            return t('realForecastJournal.days.badges.scheduled', { defaultValue: 'Scheduled' })
        case 'captured':
            return t('realForecastJournal.days.badges.captured', { defaultValue: 'Captured' })
        case 'finalized':
            return t('realForecastJournal.days.badges.finalized', { defaultValue: 'Finalized' })
        case 'missed_capture':
            return t('realForecastJournal.days.badges.missed', { defaultValue: 'Missed capture' })
        case 'recovered_exception':
            return t('realForecastJournal.days.badges.recovered', { defaultValue: 'Recovered (manual)' })
        default:
            throw new Error(`[real-forecast-journal] unsupported day status badge value: ${String(status)}.`)
    }
}

function resolveDayDirectionLabel(direction: RealForecastJournalDirection, t: TranslateFn): string {
    switch (direction) {
        case 'UP':
            return t('realForecastJournal.directions.up', { defaultValue: 'Up' })
        case 'FLAT':
            return t('realForecastJournal.directions.flat', { defaultValue: 'Flat' })
        case 'DOWN':
            return t('realForecastJournal.directions.down', { defaultValue: 'Down' })
        default:
            throw new Error(`[real-forecast-journal] unsupported day direction value: ${String(direction)}.`)
    }
}

function resolveTradeDirectionLabel(direction: string, t: TranslateFn): string {
    const normalized = direction.trim().toLowerCase()
    if (normalized === 'long') {
        return t('realForecastJournal.directions.long', { defaultValue: 'Long' })
    }
    if (normalized === 'short') {
        return t('realForecastJournal.directions.short', { defaultValue: 'Short' })
    }
    if (normalized === 'up') {
        return resolveDayDirectionLabel('UP', t)
    }
    if (normalized === 'flat') {
        return resolveDayDirectionLabel('FLAT', t)
    }
    if (normalized === 'down') {
        return resolveDayDirectionLabel('DOWN', t)
    }

    return direction
}

function localizeForecastDisplay(display: string | null, t: TranslateFn): string {
    const upLabel = resolveDayDirectionLabel('UP', t).toLowerCase()
    const flatLabel = resolveDayDirectionLabel('FLAT', t).toLowerCase()
    const downLabel = resolveDayDirectionLabel('DOWN', t).toLowerCase()
    const skippedLabel = t('realForecastJournal.placeholders.skipped', { defaultValue: 'skipped' })
    const notAvailableLabel = t('realForecastJournal.common.notAvailable', { defaultValue: 'n/a' })

    const rawDisplay = display ?? notAvailableLabel

    return rawDisplay
        .replace(/\bup\b/gi, upLabel)
        .replace(/\bflat\b/gi, flatLabel)
        .replace(/\bdown\b/gi, downLabel)
        .replace(/\bskipped\b/gi, skippedLabel)
        .replace(/\bn\/a\b/gi, notAvailableLabel)
}

function resolveBucketLabel(bucket: RealForecastJournalPolicyBucket, t: TranslateFn): string {
    switch (bucket) {
        case 'daily':
            return t('realForecastJournal.policy.buckets.daily', { defaultValue: 'Daily' })
        case 'intraday':
            return t('realForecastJournal.policy.buckets.intraday', { defaultValue: 'Intraday' })
        case 'delayed':
            return t('realForecastJournal.policy.buckets.delayed', { defaultValue: 'Delayed' })
        default:
            throw new Error(`[real-forecast-journal] unsupported policy bucket label: ${String(bucket)}.`)
    }
}

function resolveOpsStatusReasonText(status: RealForecastJournalOpsStatusDto, t: TranslateFn): string {
    if (status.captureOverdue) {
        return t('realForecastJournal.timing.health.captureOverdue', {
            defaultValue:
                'The journal missed the morning capture for trading day {{day}} after the capture window had already closed.',
            day: status.expectedCaptureDayUtc ?? t('realForecastJournal.common.notAvailable', { defaultValue: 'n/a' })
        })
    }
    if (status.readyToFinalizeCount > 0) {
        return t('realForecastJournal.timing.health.readyToFinalize', {
            defaultValue: 'There are {{count}} journal day(s) already waiting for finalization.',
            count: status.readyToFinalizeCount
        })
    }
    if (!status.workerStartedAtUtc || !status.lastLoopCompletedAtUtc) {
        return t('realForecastJournal.timing.health.starting', {
            defaultValue: 'The background journal cycle has not completed the first polling loop yet.'
        })
    }
    if (status.workerHeartbeatStale) {
        return t('realForecastJournal.timing.health.heartbeatStale', {
            defaultValue: 'The background journal heartbeat is stale.'
        })
    }
    if (status.consecutiveFailureCount > 0) {
        return t('realForecastJournal.timing.health.failures', {
            defaultValue: 'The background journal cycle has {{count}} consecutive failed loop(s).',
            count: status.consecutiveFailureCount
        })
    }

    return t('realForecastJournal.timing.health.healthy', {
        defaultValue: 'The background journal cycle is healthy and no overdue journal actions are detected.'
    })
}

function resolveStatusText(day: RealForecastJournalDayListItemDto, t: TranslateFn): string {
    if (day.status === 'captured') {
        return t('realForecastJournal.status.captured', {
            defaultValue:
                'The morning forecast is already fixed. Realized fields stay empty until the New York session closes and the final day data becomes available.'
        })
    }

    return t('realForecastJournal.status.finalized', {
        defaultValue:
            'The day is already finalized after the New York session closes. The morning forecast is immutable and the realized outcome is now read-only.'
    })
}

function resolveComparisonStatusText(
    accuracyDelta: number,
    sampleSize: number,
    locale: string,
    t: TranslateFn
): string {
    if (sampleSize < 5) {
        return t('realForecastJournal.comparison.sampleTiny', {
            defaultValue: 'Live sample is still tiny. Early deviations are informative but not yet stable.'
        })
    }

    const deltaLabel = formatPercentPoints(Math.abs(accuracyDelta), locale)
    if (Math.abs(accuracyDelta) < 0.01) {
        return t('realForecastJournal.comparison.almostAligned', {
            defaultValue: 'Live directional accuracy is currently very close to the selected historical benchmark.'
        })
    }

    if (accuracyDelta > 0) {
        return t('realForecastJournal.comparison.above', {
            defaultValue: 'Live directional accuracy is above the selected historical benchmark by {{delta}}.',
            delta: deltaLabel
        })
    }

    return t('realForecastJournal.comparison.below', {
        defaultValue: 'Live directional accuracy is below the selected historical benchmark by {{delta}}.',
        delta: deltaLabel
    })
}

function resolveCalibrationText(calibrationGap: number, locale: string, t: TranslateFn): string {
    if (Math.abs(calibrationGap) < 0.03) {
        return t('realForecastJournal.comparison.calibrationClose', {
            defaultValue: 'Average assigned probability is still close to the realized live win rate.'
        })
    }

    const gapLabel = formatPercentPoints(Math.abs(calibrationGap), locale)
    if (calibrationGap > 0) {
        return t('realForecastJournal.comparison.calibrationOver', {
            defaultValue: 'Current live sample is more confident than realized outcomes by {{gap}}.',
            gap: gapLabel
        })
    }

    return t('realForecastJournal.comparison.calibrationUnder', {
        defaultValue: 'Current live sample is less confident than realized outcomes by {{gap}}.',
        gap: gapLabel
    })
}

function withLocalizedOptionLabels<T extends string>(
    group: ReportViewControlGroup<T>,
    resolveLabel: (value: T) => string
): ReportViewControlGroup<T> {
    return {
        ...group,
        options: group.options.map(option => ({
            ...option,
            label: resolveLabel(option.value)
        }))
    }
}

function resolveRoughSignificanceText(
    liveAccuracy: number,
    benchmarkAccuracy: number,
    sampleSize: number,
    t: TranslateFn
): string {
    if (sampleSize < 10) {
        return t('realForecastJournal.comparison.significanceTiny', {
            defaultValue: 'Sample is too small for even a rough significance read.'
        })
    }

    const variance = Math.max(benchmarkAccuracy * (1 - benchmarkAccuracy), 1e-6)
    const standardError = Math.sqrt(variance / sampleSize)
    const delta = Math.abs(liveAccuracy - benchmarkAccuracy)

    if (delta < 1.96 * standardError) {
        return t('realForecastJournal.comparison.significanceWithin', {
            defaultValue: 'Deviation is still inside a rough 95% binomial band around the selected benchmark.'
        })
    }

    return t('realForecastJournal.comparison.significanceOutside', {
        defaultValue: 'Deviation is already outside a rough 95% binomial band around the selected benchmark.'
    })
}

function buildComparisonSourceControlGroup(
    value: RealForecastJournalComparisonSource,
    onChange: (next: RealForecastJournalComparisonSource) => void,
    t: TranslateFn
): ReportViewControlGroup<RealForecastJournalComparisonSource> {
    return {
        key: 'real-forecast-comparison-source',
        label: t('realForecastJournal.comparison.controls.sourceLabel', { defaultValue: 'Historical benchmark' }),
        infoTooltip: t('realForecastJournal.comparison.controls.sourceTooltip', {
            defaultValue:
                'Aggregation compares live realized days with historical quality metrics of the full forecast layer. Confidence-risk compares live realized days with historical win-rate by confidence buckets.'
        }),
        value,
        options: [
            {
                value: 'aggregation',
                label: t('realForecastJournal.comparison.controls.aggregation', { defaultValue: 'Aggregation' })
            },
            {
                value: 'confidence-risk',
                label: t('realForecastJournal.comparison.controls.confidenceRisk', { defaultValue: 'Confidence risk' })
            }
        ],
        onChange
    }
}

function buildBranchControlGroup(
    branches: string[],
    value: RealForecastJournalBranchFilter,
    onChange: (next: RealForecastJournalBranchFilter) => void,
    t: TranslateFn
): ReportViewControlGroup<RealForecastJournalBranchFilter> {
    return {
        key: 'real-forecast-branch',
        label: t('realForecastJournal.policy.controls.branch', { defaultValue: 'Branch' }),
        value,
        options: [
            { value: 'all', label: t('realForecastJournal.common.all', { defaultValue: 'ALL' }) },
            ...branches.map(branch => ({ value: branch, label: branch }))
        ],
        onChange
    }
}

function buildIndicatorGroupControlGroup(
    groups: string[],
    value: RealForecastJournalIndicatorGroupFilter,
    onChange: (next: RealForecastJournalIndicatorGroupFilter) => void,
    t: TranslateFn
): ReportViewControlGroup<RealForecastJournalIndicatorGroupFilter> {
    return {
        key: 'real-forecast-indicator-group',
        label: t('realForecastJournal.indicators.controls.group', { defaultValue: 'Indicator group' }),
        value,
        options: [
            { value: 'all', label: t('realForecastJournal.common.all', { defaultValue: 'ALL' }) },
            ...groups.map(group => ({ value: group, label: group }))
        ],
        onChange
    }
}

function resolveForecastRunKindLabel(runKind: RealForecastJournalRunKind, t: TranslateFn): string {
    if (runKind === 'main') {
        return t('realForecastJournal.forecastRunKind.main', { defaultValue: 'Main forecasts' })
    }

    return t('realForecastJournal.forecastRunKind.preliminary', { defaultValue: 'Preliminary forecasts' })
}

function buildForecastRunKindControlGroup(
    value: RealForecastJournalRunKind,
    onChange: (next: RealForecastJournalRunKind) => void,
    t: TranslateFn
): ReportViewControlGroup<RealForecastJournalRunKind> {
    return {
        key: 'real-forecast-run-kind',
        label: t('realForecastJournal.forecastRunKind.label', { defaultValue: 'Forecast type' }),
        infoTooltip: t('realForecastJournal.forecastRunKind.tooltip', {
            defaultValue:
                'Main forecasts are captured at the regular working-day opening time. Preliminary forecasts are captured earlier by the same calendar and are measured separately, so their statistics are not mixed with the main sample.'
        }),
        value,
        options: [
            { value: 'main', label: resolveForecastRunKindLabel('main', t) },
            { value: 'preliminary', label: resolveForecastRunKindLabel('preliminary', t) }
        ],
        onChange
    }
}

function buildPolicyTableColumns(t: TranslateFn, includeLiveColumns: boolean): string[] {
    const columns: string[] = [
        t('realForecastJournal.policy.table.columns.policy', { defaultValue: 'Policy' }),
        t('realForecastJournal.policy.table.columns.branch', { defaultValue: 'Branch' }),
        t('realForecastJournal.policy.table.columns.bucket', { defaultValue: 'Bucket' }),
        t('realForecastJournal.policy.table.columns.sessionOpen', { defaultValue: 'Morning forecast' }),
        t('realForecastJournal.policy.table.columns.direction', { defaultValue: 'Direction' }),
        t('realForecastJournal.policy.table.columns.riskDay', { defaultValue: 'Risk day' }),
        t('realForecastJournal.policy.table.columns.skipped', { defaultValue: 'Skipped' }),
        t('realForecastJournal.policy.table.columns.leverage', { defaultValue: 'Leverage' }),
        t('realForecastJournal.policy.table.columns.bucketBalance', { defaultValue: 'Bucket balance, $' }),
        t('realForecastJournal.policy.table.columns.marginUsd', { defaultValue: 'Margin, $' }),
        t('realForecastJournal.policy.table.columns.marginPct', { defaultValue: 'Margin, %' }),
        t('realForecastJournal.policy.table.columns.derivedNotional', { defaultValue: 'Derived notional, $' }),
        t('realForecastJournal.policy.table.columns.publishedNotional', { defaultValue: 'Published notional, $' }),
        t('realForecastJournal.policy.table.columns.entryPrice', { defaultValue: 'Entry price' }),
        t('realForecastJournal.policy.table.columns.stopLoss', { defaultValue: 'Stop-loss price' }),
        t('realForecastJournal.policy.table.columns.takeProfit', { defaultValue: 'Take-profit price' }),
        t('realForecastJournal.policy.table.columns.liquidation', { defaultValue: 'Liquidation price' }),
        t('realForecastJournal.policy.table.columns.liquidationDistance', {
            defaultValue: 'Distance to liquidation, %'
        })
    ]

    if (includeLiveColumns) {
        columns.push(
            t('realForecastJournal.policy.table.columns.liveStatus', { defaultValue: 'Live status' }),
            t('realForecastJournal.policy.table.columns.liveEventTime', { defaultValue: 'Event minute (UTC)' }),
            t('realForecastJournal.policy.table.columns.liveCurrentPrice', { defaultValue: 'Current SOL price' }),
            t('realForecastJournal.policy.table.columns.liveVsTp', { defaultValue: 'Current vs TP' }),
            t('realForecastJournal.policy.table.columns.liveVsSl', { defaultValue: 'Current vs SL' }),
            t('realForecastJournal.policy.table.columns.liveVsLiq', { defaultValue: 'Current vs liquidation' })
        )
    }

    columns.push(
        t('realForecastJournal.policy.table.columns.actualExit', { defaultValue: 'Actual exit price' }),
        t('realForecastJournal.policy.table.columns.actualExitReason', { defaultValue: 'Actual exit reason' }),
        t('realForecastJournal.policy.table.columns.actualExitPnl', { defaultValue: 'Actual exit PnL, %' }),
        t('realForecastJournal.policy.table.columns.actualTrades', { defaultValue: 'Trades' }),
        t('realForecastJournal.policy.table.columns.actualTotalPnl', { defaultValue: 'Total PnL, %' }),
        t('realForecastJournal.policy.table.columns.actualMaxDd', { defaultValue: 'MaxDD, %' }),
        t('realForecastJournal.policy.table.columns.actualLiquidation', { defaultValue: 'Had liquidation' }),
        t('realForecastJournal.policy.table.columns.actualWithdrawn', { defaultValue: 'Withdrawn, $' })
    )

    return columns
}

function buildPolicyTableRows(
    rows: RealForecastJournalCombinedPolicyRow[],
    locale: string,
    t: TranslateFn,
    isFinalized: boolean,
    liveRowsByKey: Map<string, RealForecastJournalLiveRowObservationDto>,
    liveCurrentPrice: number | null,
    includeLiveColumns: boolean
): TableRow[] {
    const notPublished = t('realForecastJournal.placeholders.notPublished', { defaultValue: 'Not published' })
    const notPublishedSessionOpen = t('realForecastJournal.placeholders.notPublishedSessionOpen', {
        defaultValue: 'Not published in the fixed morning forecast'
    })
    const noStopLoss = t('realForecastJournal.placeholders.noStopLoss', { defaultValue: 'No stop-loss' })
    const noTakeProfit = t('realForecastJournal.placeholders.noTakeProfit', { defaultValue: 'No take-profit' })
    const notApplicable = t('realForecastJournal.placeholders.notApplicable', { defaultValue: 'Not applicable' })
    const pendingFinalize = t('realForecastJournal.placeholders.pendingFinalize', {
        defaultValue: 'Day is still open'
    })
    const yesLabel = t('realForecastJournal.common.yes', { defaultValue: 'Yes' })
    const noLabel = t('realForecastJournal.common.no', { defaultValue: 'No' })
    const noDirection = t('realForecastJournal.placeholders.noDirection', { defaultValue: 'No direction' })
    const liveNotReady = t('realForecastJournal.live.placeholders.notReady', {
        defaultValue: 'Waiting for the first closed 1m candle'
    })
    const noLiveLevel = t('realForecastJournal.live.placeholders.noLevel', { defaultValue: 'No level' })

    return rows.map(row => {
        const liveRow = liveRowsByKey.get(row.rowKey) ?? null
        const rowCells: string[] = [
            row.policyName,
            row.branch,
            resolveBucketLabel(row.bucket, t),
            row.publishedInSessionOpenSnapshot ?
                t('realForecastJournal.policy.table.sessionOpenPublished', { defaultValue: 'Published' })
            :   notPublishedSessionOpen,
            row.hasDirection ? resolveTradeDirectionLabel(row.direction, t) : noDirection,
            row.isRiskDay ? yesLabel : noLabel,
            row.skipped ? yesLabel : noLabel,
            row.leverage.toFixed(2),
            formatOptionalMoney(row.bucketCapitalUsd, locale, notPublished),
            formatOptionalMoney(row.stakeUsd, locale, notPublished),
            formatOptionalPercent(row.stakePct, locale, notPublished),
            formatOptionalMoney(row.derivedNotionalUsd, locale, notPublished),
            formatOptionalMoney(row.publishedNotionalUsd, locale, notPublished),
            formatOptionalPrice(row.entryPrice, locale, notPublished),
            row.hasDirection ? formatOptionalPrice(row.slPrice, locale, noStopLoss) : notApplicable,
            row.hasDirection ? formatOptionalPrice(row.tpPrice, locale, noTakeProfit) : notApplicable,
            row.hasDirection ?
                row.liqPrice === null ?
                    resolveReportLiquidationFallbackLabel(
                        {
                            leverage: row.leverage,
                            policyName: row.policyName,
                            branch: row.branch,
                            bucket: row.bucket,
                            hasDirection: row.hasDirection,
                            skipped: row.skipped,
                            direction: row.direction,
                            isSpotPolicy: row.isSpotPolicy,
                            margin: row.margin,
                            notionalUsd: row.publishedNotionalUsd ?? row.derivedNotionalUsd,
                            bucketCapitalUsd: row.bucketCapitalUsd,
                            stakeUsd: row.stakeUsd
                        },
                        locale,
                        t
                    )
                :   formatPrice(row.liqPrice, locale)
            :   notApplicable,
            row.hasDirection ? formatOptionalPercent(row.liqDistPct, locale, notPublished) : notApplicable
        ]

        if (includeLiveColumns) {
            rowCells.push(
                resolveLiveRowStatusText(liveRow, isFinalized, t),
                formatLiveEventTime(liveRow, locale, liveNotReady),
                liveCurrentPrice === null ? liveNotReady : formatPrice(liveCurrentPrice, locale),
                row.hasDirection ?
                    formatTargetDistance(liveCurrentPrice, row.tpPrice, locale, noTakeProfit)
                :   notApplicable,
                row.hasDirection ?
                    formatTargetDistance(liveCurrentPrice, row.slPrice, locale, noLiveLevel)
                :   notApplicable,
                row.hasDirection ?
                    formatTargetDistance(liveCurrentPrice, row.liqPrice, locale, noLiveLevel)
                :   notApplicable
            )
        }

        rowCells.push(
            isFinalized ? formatOptionalPrice(row.actualExitPrice, locale, notPublished) : pendingFinalize,
            isFinalized ? (localizeExitReasonLabel(row.actualExitReason, locale) ?? notPublished) : pendingFinalize,
            isFinalized ? formatOptionalPercent(row.actualExitPnlPct, locale, notPublished) : pendingFinalize,
            isFinalized ?
                row.actualTrades === null ?
                    notPublished
                :   String(row.actualTrades)
            :   pendingFinalize,
            isFinalized ? formatOptionalPercent(row.actualTotalPnlPct, locale, notPublished) : pendingFinalize,
            isFinalized ? formatOptionalPercent(row.actualMaxDdPct, locale, notPublished) : pendingFinalize,
            isFinalized ?
                formatOptionalBoolean(row.actualHadLiquidation, yesLabel, noLabel, notPublished)
            :   pendingFinalize,
            isFinalized ? formatOptionalMoney(row.actualWithdrawnUsd, locale, notPublished) : pendingFinalize
        )

        return rowCells
    })
}

function buildIndicatorTableRows(
    record: RealForecastJournalDayRecordDto,
    group: RealForecastJournalIndicatorGroupFilter,
    t: TranslateFn
): TableRow[] {
    const pendingFinalize = t('realForecastJournal.placeholders.pendingFinalize', {
        defaultValue: 'Day is still open'
    })
    const noDelta = t('realForecastJournal.placeholders.noDelta', { defaultValue: 'Delta available after close' })
    const deltaUnavailable = t('realForecastJournal.placeholders.deltaUnavailable', {
        defaultValue: 'No numeric delta'
    })

    return buildIndicatorComparisonRows(record, group).map(row => [
        row.group,
        row.label,
        row.sessionOpenDisplay,
        row.closeDisplay ?? pendingFinalize,
        row.deltaDisplay ?? (record.finalize ? deltaUnavailable : noDelta)
    ])
}

function buildAggregationComparisonTable(
    record: ReturnType<typeof buildAggregationComparison>,
    locale: string,
    t: TranslateFn
): TableRow[] {
    const notAvailable = t('realForecastJournal.common.notAvailable', { defaultValue: 'n/a' })

    return [
        [
            t('realForecastJournal.comparison.table.accuracy', { defaultValue: 'Forecast-to-outcome match rate' }),
            formatPercent(record.live.accuracy, locale),
            formatPercent(record.benchmark.accuracy, locale),
            formatPercentPoints(record.accuracyDelta, locale)
        ],
        [
            t('realForecastJournal.comparison.table.logLoss', { defaultValue: 'Log-loss' }),
            record.live.logLoss.toFixed(4),
            record.benchmark.logLoss.toFixed(4),
            record.logLossDelta.toFixed(4)
        ],
        [
            t('realForecastJournal.comparison.table.avgAssignedProbability', {
                defaultValue: 'Average assigned probability'
            }),
            formatPercent(record.live.averageAssignedProbability, locale),
            notAvailable,
            notAvailable
        ],
        [
            t('realForecastJournal.comparison.table.calibrationGap', { defaultValue: 'Calibration gap' }),
            formatPercentPoints(record.live.calibrationGap, locale),
            notAvailable,
            notAvailable
        ],
        [
            t('realForecastJournal.comparison.table.sample', { defaultValue: 'Sample size' }),
            String(record.live.sampleSize),
            String(record.benchmark.sampleSize),
            String(record.live.sampleSize - record.benchmark.sampleSize)
        ]
    ]
}

function buildConfidenceRiskSummaryTable(
    record: ReturnType<typeof buildConfidenceRiskComparison>,
    locale: string,
    t: TranslateFn
): TableRow[] {
    const notAvailable = t('realForecastJournal.common.notAvailable', { defaultValue: 'n/a' })

    return [
        [
            t('realForecastJournal.comparison.table.liveAccuracy', { defaultValue: 'Live win rate' }),
            formatPercent(record.live.accuracy, locale),
            formatPercent(record.weightedBenchmarkWinRate, locale),
            formatPercentPoints(record.weightedDelta, locale)
        ],
        [
            t('realForecastJournal.comparison.table.avgAssignedProbability', {
                defaultValue: 'Average assigned probability'
            }),
            formatPercent(record.live.averageAssignedProbability, locale),
            notAvailable,
            notAvailable
        ],
        [
            t('realForecastJournal.comparison.table.calibrationGap', { defaultValue: 'Calibration gap' }),
            formatPercentPoints(record.live.calibrationGap, locale),
            notAvailable,
            notAvailable
        ],
        [
            t('realForecastJournal.comparison.table.outOfRange', { defaultValue: 'Out-of-range live days' }),
            String(record.outOfRangeDays),
            notAvailable,
            notAvailable
        ],
        [
            t('realForecastJournal.comparison.table.sample', { defaultValue: 'Sample size' }),
            String(record.live.sampleSize),
            String(record.bucketRows.reduce((sum, row) => sum + row.liveDays, 0)),
            notAvailable
        ]
    ]
}

function buildConfidenceRiskBucketTable(
    record: ReturnType<typeof buildConfidenceRiskComparison>,
    locale: string,
    t: TranslateFn
): TableRow[] {
    const notAvailable = t('realForecastJournal.common.notAvailable', { defaultValue: 'n/a' })

    return record.bucketRows.map(row => [
        row.bucket,
        row.rangeLabel,
        String(row.liveDays),
        formatOptionalPercent(row.liveWinRate, locale, notAvailable),
        formatOptionalPercent(
            row.liveAverageConfidencePct === null ? null : row.liveAverageConfidencePct / 100,
            locale,
            notAvailable
        ),
        formatPercent(row.benchmarkWinRate, locale),
        formatOptionalPercentPoints(row.deltaWinRate, locale, notAvailable)
    ])
}

function DaySummaryCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
    return (
        <article className={cls.summaryCard}>
            <Text className={cls.summaryLabel}>{label}</Text>
            <Text type='h3' className={cls.summaryValue}>
                {value}
            </Text>
            {hint && <Text className={cls.summaryHint}>{hint}</Text>}
        </article>
    )
}

function buildCausalityNoteItems(t: TranslateFn): ReactNode[] {
    return [
        t('realForecastJournal.page.notes.causalityPointImmutable', {
            defaultValue: 'The morning forecast is fixed once and does not change after publication.'
        }),
        t('realForecastJournal.page.notes.causalityPointFact', {
            defaultValue:
                'The realized outcome is written later, after the New York session finishes for that trading day.'
        }),
        t('realForecastJournal.page.notes.causalityPointFuture', {
            defaultValue:
                'At publication time, that future did not physically exist in the real world yet, so the model could not know it.'
        })
    ]
}

function buildScheduleNoteItems(t: TranslateFn): ReactNode[] {
    return [
        t('realForecastJournal.page.notes.schedulePointMain', {
            defaultValue:
                'The main forecast follows the scheduled opening time of the New York trading session.'
        }),
        t('realForecastJournal.page.notes.schedulePointPreliminary', {
            defaultValue:
                'The earlier forecast for the same trading day uses the earlier scheduled window before the session opens.'
        }),
        <>
            {t('realForecastJournal.page.notes.schedulePointDstPrefix', {
                defaultValue: 'The shift between those hours is handled with '
            })}
            <TermTooltip
                term={t('realForecastJournal.page.notes.scheduleDstTerm', { defaultValue: 'DST' })}
                type='span'
                description={t('realForecastJournal.page.notes.scheduleDstTooltip', {
                    defaultValue:
                        'DST (Daylight Saving Time) is the seasonal clock shift between winter and summer time in New York.\n\nBecause of that shift, the same trading-session opening point appears in different UTC hours during winter and summer.'
                })}
            />
            {t('realForecastJournal.page.notes.schedulePointDstSuffix', {
                defaultValue: '.'
            })}
        </>,
        t('realForecastJournal.page.notes.schedulePointFinalize', {
            defaultValue:
                'Realized fields stay empty until the New York session closes and the final day data becomes available.'
        })
    ]
}

function buildUsefulnessNoteItems(t: TranslateFn): ReactNode[] {
    return [
        t('realForecastJournal.page.notes.usefulnessPointSequence', {
            defaultValue:
                'Only days where the forecast was published first and the market outcome appeared later are accumulated here.'
        }),
        t('realForecastJournal.page.notes.usefulnessPointStats', {
            defaultValue: 'That sequence builds a live statistics sample without knowledge of the future.'
        }),
        renderTermTooltipRichText(
            t('realForecastJournal.page.notes.usefulnessPointTrust', {
                defaultValue:
                    "If this live sample stays close to the model's historical expectations over time, that becomes a strong sign of the absence of [[leakage|leakage]] and increases trust in the project's probabilities, metrics, and calculations."
            })
        )
    ]
}

function SectionNote({
    title,
    body,
    lead,
    items
}: {
    title: string
    body?: ReactNode
    lead?: ReactNode
    items?: ReactNode[]
}) {
    return (
        <div className={cls.noteCard}>
            <Text type='h3' className={cls.noteTitle}>
                {title}
            </Text>
            {body ?
                <div className={cls.noteBody}>
                    <Text className={cls.noteLead}>{body}</Text>
                </div>
            : lead && items?.length ?
                <div className={cls.noteBody}>
                    <Text className={cls.noteLead}>{lead}</Text>
                    <ul className={cls.noteList}>
                        {items.map((item, index) => (
                            <li key={`${title}-${index}`} className={cls.noteListItem}>
                                <Text type='span' className={cls.noteListText}>
                                    {item}
                                </Text>
                            </li>
                        ))}
                    </ul>
                </div>
            :   null}
        </div>
    )
}

function buildNextCaptureRows(
    status: RealForecastJournalOpsStatusDto,
    locale: string,
    t: TranslateFn
): Array<{ label: string; value: string }> {
    const expectedPending =
        Boolean(status.expectedCaptureDayUtc) &&
        status.captureWindowClosed === false &&
        (!status.lastSuccessfulCapture ||
            status.lastSuccessfulCapture.predictionDateUtc !== status.expectedCaptureDayUtc)

    const dayUtc = expectedPending ? status.expectedCaptureDayUtc : status.nextCaptureDayUtc
    const targetUtc = expectedPending ? status.expectedCaptureTargetUtc : status.nextCaptureTargetUtc

    if (!dayUtc || !targetUtc) {
        throw new Error('[real-forecast-journal] next capture timing is missing in ops status payload.')
    }

    return [
        {
            label: t('realForecastJournal.timing.nextCapture.rows.runKind', {
                defaultValue: 'Forecast type'
            }),
            value: resolveForecastRunKindLabel(status.runKind, t)
        },
        {
            label: t('realForecastJournal.timing.nextCapture.rows.day', { defaultValue: 'Trading day' }),
            value: dayUtc
        },
        {
            label: t('realForecastJournal.timing.nextCapture.rows.exactTime', {
                defaultValue: 'Scheduled capture'
            }),
            value: formatTimingExactUtc(targetUtc, locale)
        }
    ]
}

function resolveNextCaptureTargetUtc(status: RealForecastJournalOpsStatusDto): string | null {
    const expectedPending =
        Boolean(status.expectedCaptureDayUtc) &&
        status.captureWindowClosed === false &&
        (!status.lastSuccessfulCapture ||
            status.lastSuccessfulCapture.predictionDateUtc !== status.expectedCaptureDayUtc)

    return expectedPending ? status.expectedCaptureTargetUtc : status.nextCaptureTargetUtc
}

function buildActiveFinalizeRows(
    status: RealForecastJournalOpsStatusDto,
    locale: string,
    t: TranslateFn
): Array<{ label: string; value: string }> {
    if (!status.activePendingDayUtc || !status.activePendingExitUtc || !status.activePendingFinalizeDueUtc) {
        throw new Error('[real-forecast-journal] active finalize timing is missing in ops status payload.')
    }

    return [
        {
            label: t('realForecastJournal.timing.activeFinalize.rows.day', { defaultValue: 'Trading day' }),
            value: status.activePendingDayUtc
        },
        {
            label: t('realForecastJournal.timing.activeFinalize.rows.finalizeTarget', {
                defaultValue: 'Data completion target'
            }),
            value: formatTimingExactUtc(status.activePendingFinalizeDueUtc, locale)
        },
        {
            label: t('realForecastJournal.timing.activeFinalize.rows.marketCloseReference', {
                defaultValue: 'Market close reference'
            }),
            value: formatTimingExactUtc(status.activePendingExitUtc, locale)
        }
    ]
}

function buildActiveCloseRows(
    status: RealForecastJournalOpsStatusDto,
    locale: string,
    t: TranslateFn
): Array<{ label: string; value: string }> {
    if (!status.activePendingDayUtc || !status.activePendingExitUtc) {
        throw new Error('[real-forecast-journal] active close timing is missing in ops status payload.')
    }

    return [
        {
            label: t('realForecastJournal.timing.activeClose.rows.day', { defaultValue: 'Trading day' }),
            value: status.activePendingDayUtc
        },
        {
            label: t('realForecastJournal.timing.activeClose.rows.marketClose', {
                defaultValue: 'Market close'
            }),
            value: formatTimingExactUtc(status.activePendingExitUtc, locale)
        }
    ]
}

function RealForecastJournalTimingSection({
    locale,
    opsStatusQuery
}: {
    locale: string
    opsStatusQuery: ReturnType<typeof useRealForecastJournalOpsStatusQuery>
}) {
    const { t } = useTranslation('reports')
    const isRu = locale.startsWith('ru')
    const timingTitle = t('realForecastJournal.timing.title', { defaultValue: 'Upcoming journal timing' })
    const timingSubtitle = t('realForecastJournal.timing.subtitle', {
        defaultValue:
            'This block shows when the next immutable trading day will be captured and, when a live day is still open, how long remains until the post-close factual data is written into the journal.'
    })
    const timingSectionHeader = (
        <div className={cls.sectionHeader}>
            <Text type='h2' className={cls.sectionTitle}>
                {timingTitle}
            </Text>
            <Text className={cls.sectionSubtitle}>{timingSubtitle}</Text>
        </div>
    )
    const activeWindowCards =
        opsStatusQuery.data?.activePendingFinalizeDueUtc &&
        opsStatusQuery.data.activePendingDayUtc &&
        opsStatusQuery.data.activePendingExitUtc ?
            [
                {
                    id: 'active-close',
                    label: t('realForecastJournal.timing.activeClose.title', {
                        defaultValue: 'Open trading day close'
                    }),
                    targetUtc: opsStatusQuery.data.activePendingExitUtc,
                    rows: buildActiveCloseRows(opsStatusQuery.data, locale, t)
                },
                {
                    id: 'active-finalize',
                    label: t('realForecastJournal.timing.activeFinalize.title', {
                        defaultValue: 'Post-close data completion'
                    }),
                    targetUtc: opsStatusQuery.data.activePendingFinalizeDueUtc,
                    rows: buildActiveFinalizeRows(opsStatusQuery.data, locale, t)
                }
            ]
        :   [
                {
                    id: 'active-window-empty',
                    label: t('realForecastJournal.timing.activeWindow.title', {
                        defaultValue: 'Open trading day timing'
                    }),
                    headline: t('realForecastJournal.timing.activeFinalize.none', {
                        defaultValue: 'No open forecast day'
                    }),
                    rows: [
                        {
                            label: isRu ? 'Состояние' : 'Status',
                            value: t('realForecastJournal.timing.activeFinalize.noneDescription', {
                                defaultValue:
                                    'After the next morning capture, this block starts counting down to the end-of-day data update.'
                            })
                        }
                    ]
                }
            ]
    const cards =
        opsStatusQuery.data ?
            [
                {
                    id: 'next-capture',
                    label: t('realForecastJournal.timing.nextCapture.title', {
                        defaultValue: 'Next journal capture'
                    }),
                    targetUtc: resolveNextCaptureTargetUtc(opsStatusQuery.data),
                    rows: buildNextCaptureRows(opsStatusQuery.data, locale, t)
                },
                ...activeWindowCards
            ]
        :   []

    return (
        <section className={cls.timingSection}>
            {opsStatusQuery.data && (
                <ReportTimingSection
                    title={timingTitle}
                    subtitle={timingSubtitle}
                    statusText={resolveOpsStatusReasonText(opsStatusQuery.data, t)}
                    statusTone={
                        opsStatusQuery.data.health === 'healthy' ? 'healthy'
                        : opsStatusQuery.data.health === 'degraded' ? 'warning'
                        : 'neutral'
                    }
                    cards={cards}
                    locale={locale}
                    remainingLabel={isRu ? 'осталось' : 'remaining'}
                    overdueLabel={isRu ? 'после срока' : 'overdue'}
                />
            )}
            {!opsStatusQuery.data && !opsStatusQuery.error && (
                <>
                    {timingSectionHeader}
                    <Text className={cls.loadingText}>
                        {t('realForecastJournal.timing.loading', { defaultValue: 'Loading journal timing...' })}
                    </Text>
                </>
            )}
            {opsStatusQuery.error && (
                <>
                    {timingSectionHeader}
                    <div className={cls.sectionError}>
                        <Text type='h3'>
                            {t('realForecastJournal.timing.errorTitle', { defaultValue: 'Timing block is unavailable' })}
                        </Text>
                        <Text>{opsStatusQuery.error.message}</Text>
                    </div>
                </>
            )}
        </section>
    )
}

function RealForecastJournalPageInner({ className }: RealForecastJournalPageProps) {
    const { i18n } = useTranslation('reports')
    const locale = i18n.resolvedLanguage?.startsWith('ru') ? 'ru-RU' : 'en-US'
    const [searchParams, setSearchParams] = useSearchParams()
    const comparisonSourceState = useMemo(() => {
        try {
            return { value: resolveComparisonSource(searchParams.get('source')), error: null as Error | null }
        } catch (error) {
            return {
                value: DEFAULT_COMPARISON_SOURCE,
                error: normalizeErrorLike(error, 'Failed to parse real forecast journal comparison source.', {
                    source: 'real-forecast-journal-comparison-source',
                    domain: 'ui_section',
                    owner: 'real-forecast-journal-page',
                    expected: 'Real forecast journal page should parse a valid comparison source from URL params.',
                    requiredAction: 'Inspect comparison source query and supported values.'
                })
            }
        }
    }, [searchParams])
    const comparisonScopeState = useMemo(() => {
        try {
            return { value: resolveComparisonScope(searchParams.get('scope')), error: null as Error | null }
        } catch (error) {
            return {
                value: DEFAULT_COMPARISON_SCOPE,
                error: normalizeErrorLike(error, 'Failed to parse real forecast journal comparison scope.', {
                    source: 'real-forecast-journal-comparison-scope',
                    domain: 'ui_section',
                    owner: 'real-forecast-journal-page',
                    expected: 'Real forecast journal page should parse a valid comparison scope from URL params.',
                    requiredAction: 'Inspect comparison scope query and supported values.'
                })
            }
        }
    }, [searchParams])
    const forecastRunKindState = useMemo(() => {
        try {
            return { value: resolveForecastRunKind(searchParams.get('runKind')), error: null as Error | null }
        } catch (error) {
            return {
                value: DEFAULT_FORECAST_RUN_KIND,
                error: normalizeErrorLike(error, 'Failed to parse real forecast journal forecast type.', {
                    source: 'real-forecast-journal-run-kind',
                    domain: 'ui_section',
                    owner: 'real-forecast-journal-page',
                    expected: 'Real forecast journal page should parse a valid forecast type from URL params.',
                    requiredAction: 'Inspect runKind query and supported values.'
                })
            }
        }
    }, [searchParams])

    const [bucketFilter, setBucketFilter] = useState<RealForecastJournalPolicyBucket | 'total'>(DEFAULT_BUCKET_FILTER)
    const [branchFilter, setBranchFilter] = useState<RealForecastJournalBranchFilter>(DEFAULT_BRANCH_FILTER)
    const [policySearch, setPolicySearch] = useState<RealForecastJournalPolicySearchValue>(DEFAULT_POLICY_SEARCH)
    const [indicatorGroup, setIndicatorGroup] =
        useState<RealForecastJournalIndicatorGroupFilter>(DEFAULT_INDICATOR_GROUP)
    const [isDetailedOpen, setIsDetailedOpen] = useState(false)

    const dayListQuery = useRealForecastJournalDayListQuery(
        { runKind: forecastRunKindState.value },
        { enabled: forecastRunKindState.error === null }
    )
    const opsStatusQuery = useRealForecastJournalOpsStatusQuery({ runKind: forecastRunKindState.value })
    const aggregationMetricsQuery = useAggregationMetricsQuery()
    const confidenceRiskQuery = useBacktestConfidenceRiskReportQuery({ scope: comparisonScopeState.value })
    const backfilledTrainingScopeStatsQuery = useCurrentPredictionBackfilledTrainingScopeStatsQuery()
    const selectedDate = useMemo(
        () => resolveSelectedDate(dayListQuery.data, searchParams.get('date')),
        [dayListQuery.data, searchParams]
    )
    const selectedDayArgs = selectedDate ?
        { dateUtc: selectedDate, runKind: forecastRunKindState.value }
    :   undefined
    const selectedDayQuery = useRealForecastJournalDayQuery(selectedDayArgs, { enabled: Boolean(selectedDayArgs) })
    const liveStatusQuery = useRealForecastJournalLiveStatusQuery(selectedDayArgs, {
        enabled: Boolean(selectedDayArgs && selectedDayQuery.data && !selectedDayQuery.data.finalize)
    })

    useEffect(() => {
        if (!selectedDate) {
            return
        }

        if (searchParams.get('date') === selectedDate) {
            return
        }

        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('date', selectedDate)
        setSearchParams(nextParams, { replace: true })
    }, [searchParams, selectedDate, setSearchParams])

    return (
        <RealForecastJournalPageContent
            className={className}
            locale={locale}
            searchParams={searchParams}
            setSearchParams={setSearchParams}
            forecastRunKind={forecastRunKindState.value}
            forecastRunKindError={forecastRunKindState.error}
            dayList={dayListQuery.data ?? []}
            isDayListLoading={dayListQuery.isLoading}
            dayListError={forecastRunKindState.error ?? (dayListQuery.isError ? dayListQuery.error : null)}
            onRetry={() => {
                void dayListQuery.refetch()
                void opsStatusQuery.refetch()
                if (selectedDayArgs) {
                    void selectedDayQuery.refetch()
                }
                if (selectedDayArgs && selectedDayQuery.data && !selectedDayQuery.data.finalize) {
                    void liveStatusQuery.refetch()
                }
                void aggregationMetricsQuery.refetch()
                void confidenceRiskQuery.refetch()
            }}
            opsStatusQuery={opsStatusQuery}
            selectedDate={selectedDate}
            isSelectedRecordLoading={Boolean(selectedDate) && selectedDayQuery.isLoading}
            selectedRecordError={selectedDayQuery.isError ? selectedDayQuery.error : null}
            selectedRecord={selectedDayQuery.data ?? null}
            liveStatusQuery={liveStatusQuery}
            comparisonSource={comparisonSourceState.value}
            comparisonScope={comparisonScopeState.value}
            trainingScopeStats={backfilledTrainingScopeStatsQuery.data ?? null}
            comparisonQueryError={comparisonSourceState.error ?? comparisonScopeState.error}
            aggregationMetricsQuery={aggregationMetricsQuery}
            confidenceRiskQuery={confidenceRiskQuery}
            bucketFilter={bucketFilter}
            onBucketFilterChange={setBucketFilter}
            branchFilter={branchFilter}
            onBranchFilterChange={setBranchFilter}
            policySearch={policySearch}
            onPolicySearchChange={setPolicySearch}
            indicatorGroup={indicatorGroup}
            onIndicatorGroupChange={setIndicatorGroup}
            isDetailedOpen={isDetailedOpen}
            onDetailedToggle={() => setIsDetailedOpen(current => !current)}
        />
    )
}

interface RealForecastJournalPageContentProps {
    className?: string
    locale: string
    searchParams: URLSearchParams
    setSearchParams: ReturnType<typeof useSearchParams>[1]
    forecastRunKind: RealForecastJournalRunKind
    forecastRunKindError: Error | null
    dayList: RealForecastJournalDayListItemDto[]
    isDayListLoading: boolean
    dayListError: unknown
    onRetry: () => void
    opsStatusQuery: ReturnType<typeof useRealForecastJournalOpsStatusQuery>
    selectedDate: string | null
    isSelectedRecordLoading: boolean
    selectedRecordError: unknown
    selectedRecord: RealForecastJournalDayRecordDto | null
    liveStatusQuery: ReturnType<typeof useRealForecastJournalLiveStatusQuery>
    comparisonSource: RealForecastJournalComparisonSource
    comparisonScope: CurrentPredictionTrainingScope
    trainingScopeStats: CurrentPredictionBackfilledTrainingScopeStats | null
    comparisonQueryError: Error | null
    aggregationMetricsQuery: ReturnType<typeof useAggregationMetricsQuery>
    confidenceRiskQuery: ReturnType<typeof useBacktestConfidenceRiskReportQuery>
    bucketFilter: RealForecastJournalPolicyBucket | 'total'
    onBucketFilterChange: (next: RealForecastJournalPolicyBucket | 'total') => void
    branchFilter: RealForecastJournalBranchFilter
    onBranchFilterChange: (next: RealForecastJournalBranchFilter) => void
    policySearch: string
    onPolicySearchChange: (next: string) => void
    indicatorGroup: RealForecastJournalIndicatorGroupFilter
    onIndicatorGroupChange: (next: RealForecastJournalIndicatorGroupFilter) => void
    isDetailedOpen: boolean
    onDetailedToggle: () => void
}

function RealForecastJournalPageContent({
    className,
    locale,
    searchParams,
    setSearchParams,
    forecastRunKind,
    forecastRunKindError,
    dayList,
    isDayListLoading,
    dayListError,
    onRetry,
    opsStatusQuery,
    selectedDate,
    isSelectedRecordLoading,
    selectedRecordError,
    selectedRecord,
    liveStatusQuery,
    comparisonSource,
    comparisonScope,
    trainingScopeStats,
    comparisonQueryError,
    aggregationMetricsQuery,
    confidenceRiskQuery,
    bucketFilter,
    onBucketFilterChange,
    branchFilter,
    onBranchFilterChange,
    policySearch,
    onPolicySearchChange,
    indicatorGroup,
    onIndicatorGroupChange,
    isDetailedOpen,
    onDetailedToggle
}: RealForecastJournalPageContentProps) {
    const { t } = useTranslation('reports')
    const termsLocale: RealForecastJournalTermsLocale = locale === 'ru-RU' ? 'ru' : 'en'
    const termsBlockTitle = resolveJournalTermsBlockTitle(termsLocale)
    const termsBlockSubtitle = resolveJournalTermsBlockSubtitle(termsLocale)
    const rootClassName = classNames(cls.root, {}, [className ?? ''])
    const selectedDay = useMemo(
        () => dayList.find(item => item.predictionDateUtc === selectedDate) ?? null,
        [dayList, selectedDate]
    )
    const isSelectedDayActive = Boolean(selectedRecord && !selectedRecord.finalize)
    const policyRows = useMemo(() => (selectedRecord ? buildCombinedPolicyRows(selectedRecord) : []), [selectedRecord])
    const liveRowsByKey = useMemo(() => buildLiveRowsByKey(liveStatusQuery.data), [liveStatusQuery.data])
    const branchOptions = useMemo(() => buildPolicyBranchOptions(policyRows), [policyRows])
    const filteredPolicyRows = useMemo(
        () =>
            filterCombinedPolicyRows(policyRows, {
                bucket: bucketFilter,
                branch: branchFilter,
                policySearch
            }),
        [branchFilter, bucketFilter, policyRows, policySearch]
    )
    const indicatorGroupOptions = useMemo(
        () => (selectedRecord ? buildIndicatorGroupOptions(selectedRecord) : []),
        [selectedRecord]
    )

    useEffect(() => {
        if (branchFilter !== 'all' && !branchOptions.includes(branchFilter)) {
            onBranchFilterChange('all')
        }
    }, [branchFilter, branchOptions, onBranchFilterChange])

    useEffect(() => {
        if (indicatorGroup !== 'all' && !indicatorGroupOptions.includes(indicatorGroup)) {
            onIndicatorGroupChange('all')
        }
    }, [indicatorGroup, indicatorGroupOptions, onIndicatorGroupChange])

    const policyControlGroups = useMemo(() => {
        const groups: ReportViewControlGroup[] = [
            withLocalizedOptionLabels(
                buildPredictionPolicyBucketControlGroup({
                    value: bucketFilter,
                    onChange: onBucketFilterChange,
                    label: t('realForecastJournal.policy.controls.bucket', { defaultValue: 'Published bucket' }),
                    ariaLabel: t('realForecastJournal.policy.controls.bucketAria', {
                        defaultValue: 'Bucket filter for the published policy rows'
                    })
                }),
                value => {
                    if (value === 'total') {
                        return t('realForecastJournal.policy.buckets.total', { defaultValue: 'All buckets' })
                    }

                    return resolveBucketLabel(value, t)
                }
            )
        ]

        if (branchOptions.length > 0) {
            groups.push(buildBranchControlGroup(branchOptions, branchFilter, onBranchFilterChange, t))
        }

        return groups
    }, [
        branchFilter,
        branchOptions,
        bucketFilter,
        onBranchFilterChange,
        onBucketFilterChange,
        t
    ])

    const indicatorControlGroups = useMemo(
        () => [buildIndicatorGroupControlGroup(indicatorGroupOptions, indicatorGroup, onIndicatorGroupChange, t)],
        [indicatorGroup, indicatorGroupOptions, onIndicatorGroupChange, t]
    )
    const forecastRunKindControlGroups = useMemo(
        () => [
            buildForecastRunKindControlGroup(
                forecastRunKind,
                next => {
                    const nextParams = new URLSearchParams(searchParams)
                    nextParams.set('runKind', next)
                    nextParams.delete('date')
                    setSearchParams(nextParams, { replace: true })
                },
                t
            )
        ],
        [forecastRunKind, searchParams, setSearchParams, t]
    )
    const comparisonControlGroups = [
        buildComparisonSourceControlGroup(
            comparisonSource,
            next => {
                const nextParams = new URLSearchParams(searchParams)
                nextParams.set('source', next)
                setSearchParams(nextParams, { replace: true })
            },
            t
        ),
        buildTrainingScopeControlGroup({
            value: comparisonScope,
            onChange: next => {
                const nextParams = new URLSearchParams(searchParams)
                nextParams.set('scope', next)
                setSearchParams(nextParams, { replace: true })
            },
            label: t('realForecastJournal.comparison.controls.scopeLabel', { defaultValue: 'Historical scope' }),
            splitStats: trainingScopeStats
        })
    ]

    const selectedDayError =
        forecastRunKindError ??
        selectedRecordError ??
        (!selectedDay || !selectedRecord ?
            new Error('[real-forecast-journal] selected day is missing from index or payload.')
        :   null)

    const isFinalized = selectedDay?.status === 'finalized'
    const pendingFinalizeLabel = t('realForecastJournal.placeholders.pendingFinalize', {
        defaultValue: 'Day is still open'
    })
    const policyColumns = useMemo(() => buildPolicyTableColumns(t, isSelectedDayActive), [isSelectedDayActive, t])
    const policyTerms = useMemo(
        () => buildRealForecastJournalTerms(policyColumns, termsLocale),
        [policyColumns, termsLocale]
    )
    const indicatorColumns = useMemo(
        () => [
            t('realForecastJournal.indicators.table.columns.group', {
                defaultValue: 'Group'
            }),
            t('realForecastJournal.indicators.table.columns.indicator', {
                defaultValue: 'Indicator'
            }),
            t('realForecastJournal.indicators.table.columns.sessionOpen', {
                defaultValue: 'Session open'
            }),
            t('realForecastJournal.indicators.table.columns.close', {
                defaultValue: 'Close'
            }),
            t('realForecastJournal.indicators.table.columns.delta', {
                defaultValue: 'Delta'
            })
        ],
        [t]
    )
    const indicatorTerms = useMemo(
        () => buildRealForecastJournalTerms(indicatorColumns, termsLocale),
        [indicatorColumns, termsLocale]
    )
    const policyRowsTable =
        selectedRecord && isFinalized !== undefined ?
            buildPolicyTableRows(
                filteredPolicyRows,
                locale,
                t,
                isFinalized,
                liveRowsByKey,
                liveStatusQuery.data?.currentPrice ?? null,
                isSelectedDayActive
            )
        :   []
    const indicatorRows = selectedRecord ? buildIndicatorTableRows(selectedRecord, indicatorGroup, t) : []
    // Журнал объединяет разные доменные слои в одной странице,
    // поэтому tooltip для колонок сначала ищется в shared glossary, а потом в локальном page-level resolver.
    const renderJournalColumnTitle = useCallback(
        (title: string) => {
            const resolved = resolveRealForecastJournalColumnTooltip(title, termsLocale)
            return renderTermTooltipTitle(title, resolved?.description, {
                selfAliases: resolved?.selfAliases
            })
        },
        [termsLocale]
    )

    return (
        <div className={rootClassName}>
            <PageDataState
                shell={
                    <>
                        <header className={cls.hero}>
                            <div className={cls.heroMain}>
                                <Text type='h1' className={cls.heroTitle}>
                                    {t('realForecastJournal.page.title', {
                                        defaultValue: 'Real forecast journal and realized day outcome'
                                    })}
                                </Text>
                                <Text className={cls.heroSubtitle}>
                                    {t('realForecastJournal.page.subtitle', {
                                        defaultValue:
                                            'This page shows the fixed morning forecast for each real trading day, the current state of the open day, the realized outcome after the New York session (working day) closes, and the comparison of this live sample with historical statistics.'
                                    })}
                                </Text>
                                <div className={cls.heroNotes}>
                                    <SectionNote
                                        title={t('realForecastJournal.page.notes.causalityTitle', {
                                            defaultValue: 'Why this page exists'
                                        })}
                                        lead={t('realForecastJournal.page.notes.causalityLead', {
                                            defaultValue:
                                                'The page keeps the morning forecast and then adds the realized outcome for that same trading day.'
                                        })}
                                        items={buildCausalityNoteItems(t)}
                                    />
                                    <SectionNote
                                        title={t('realForecastJournal.page.notes.scheduleTitle', {
                                            defaultValue: 'Timing contract'
                                        })}
                                        lead={t('realForecastJournal.page.notes.scheduleLead', {
                                            defaultValue: 'This block uses only UTC as the public timing reference.'
                                        })}
                                        items={buildScheduleNoteItems(t)}
                                    />
                                    <SectionNote
                                        title={t('realForecastJournal.page.notes.usefulnessTitle', {
                                            defaultValue: 'Why this page matters'
                                        })}
                                        lead={t('realForecastJournal.page.notes.usefulnessLead', {
                                            defaultValue:
                                                "This block shows how closely real outcomes match the model's historical expectations."
                                        })}
                                        items={buildUsefulnessNoteItems(t)}
                                    />
                                </div>
                            </div>
                        </header>

                        <RealForecastJournalTimingSection locale={locale} opsStatusQuery={opsStatusQuery} />

                        <section className={cls.dayStripSection}>
                            <div className={cls.sectionHeader}>
                                <Text type='h2' className={cls.sectionTitle}>
                                    {t('realForecastJournal.days.title', { defaultValue: 'Captured trading days' })}
                                </Text>
                                <Text className={cls.sectionSubtitle}>
                                    {t('realForecastJournal.days.subtitle', {
                                        defaultValue:
                                            'Newest day is selected by default. Main and preliminary forecasts are loaded as separate journal samples, so their realized statistics are not mixed.'
                                    })}
                                </Text>
                            </div>
                            <ReportViewControls
                                groups={forecastRunKindControlGroups}
                                className={cls.controls}
                                showSelectedOptionHints={false}
                            />
                            {isDayListLoading ?
                                <PageSectionDataState
                                    isLoading
                                    hasData={false}
                                    title={t('realForecastJournal.page.errorTitle', {
                                        defaultValue: 'Failed to load the real forecast journal'
                                    })}
                                    loadingText={t('errors:ui.pageDataBoundary.loading', { defaultValue: 'Loading data' })}>
                                    {null}
                                </PageSectionDataState>
                            : dayListError ?
                                <PageSectionDataState
                                    isError
                                    error={dayListError}
                                    hasData={false}
                                    onRetry={onRetry}
                                    title={t('realForecastJournal.page.errorTitle', {
                                        defaultValue: 'Failed to load the real forecast journal'
                                    })}
                                    logContext={{ source: 'real-forecast-journal-day-list' }}>
                                    {null}
                                </PageSectionDataState>
                            : dayList.length === 0 ?
                                <div className={cls.sectionError}>
                                    <Text type='h3'>
                                        {t('realForecastJournal.page.emptyTitle', {
                                            defaultValue: 'No captured trading days yet'
                                        })}
                                    </Text>
                                    <Text>
                                        {t('realForecastJournal.page.empty', {
                                            defaultValue:
                                                'The journal will start filling once the first immutable morning forecast is captured.'
                                        })}
                                    </Text>
                                </div>
                            :   <div className={cls.dayStrip}>
                                    {dayList.map(day => {
                                        const isActive = day.predictionDateUtc === selectedDate
                                        return (
                                            <button
                                                key={day.id}
                                                type='button'
                                                className={classNames(cls.dayButton, { [cls.dayButtonActive]: isActive }, [])}
                                                onClick={() => {
                                                    const nextParams = new URLSearchParams(searchParams)
                                                    nextParams.set('date', day.predictionDateUtc)
                                                    setSearchParams(nextParams, { replace: true })
                                                }}>
                                                <span className={cls.dayDate}>{day.predictionDateUtc}</span>
                                                <span className={cls.dayStatus}>{resolveDayStatusBadge(day.status, t)}</span>
                                                <span className={cls.dayDirection}>
                                                    {localizeForecastDisplay(day.predLabelDisplay, t)}
                                                </span>
                                            </button>
                                        )
                                    })}
                                </div>
                            }
                        </section>
                    </>
                }
                isLoading={isSelectedRecordLoading}
                isError={Boolean(selectedDayError)}
                error={selectedDayError}
                hasData={Boolean(selectedDay && selectedRecord)}
                onRetry={onRetry}
                title={t('realForecastJournal.errors.selectedDay.title', {
                    defaultValue: 'Selected journal day is unavailable'
                })}
                description={t('realForecastJournal.errors.selectedDay.message', {
                    defaultValue:
                        'The selected date is missing from the journal index or the day payload is not loaded.'
                })}
                loadingText={t('errors:ui.pageDataBoundary.loading', { defaultValue: 'Loading data' })}
                logContext={{
                    source: 'real-forecast-journal-selected-day',
                    extra: { selectedDate }
                }}>
                {selectedDay && selectedRecord && (
                    <>
                        <section className={cls.summarySection}>
                            <div className={cls.sectionHeader}>
                                <Text type='h2' className={cls.sectionTitle}>
                                    {t('realForecastJournal.summary.title', { defaultValue: 'Causal day summary' })}
                                </Text>
                                <Text className={cls.sectionSubtitle}>{resolveStatusText(selectedDay, t)}</Text>
                            </div>
                            <div className={cls.summaryGrid}>
                                <DaySummaryCard
                                    label={t('realForecastJournal.summary.cards.forecast', {
                                        defaultValue: 'Morning forecast'
                                    })}
                                    value={localizeForecastDisplay(selectedDay.predLabelDisplay, t)}
                                    hint={
                                        selectedDay.totalUpProbability !== null &&
                                        selectedDay.totalFlatProbability !== null &&
                                        selectedDay.totalDownProbability !== null ?
                                            `${formatPercent(selectedDay.totalUpProbability, locale)} / ${formatPercent(selectedDay.totalFlatProbability, locale)} / ${formatPercent(selectedDay.totalDownProbability, locale)}`
                                        :   pendingFinalizeLabel
                                    }
                                />
                                <DaySummaryCard
                                    label={t('realForecastJournal.summary.cards.actual', {
                                        defaultValue: 'Realized direction'
                                    })}
                                    value={
                                        selectedDay.actualDirection ?
                                            resolveDayDirectionLabel(selectedDay.actualDirection, t)
                                        :   pendingFinalizeLabel
                                    }
                                    hint={
                                        isFinalized ?
                                            formatUtc(selectedDay.finalizedAtUtc ?? selectedDay.exitUtc, locale)
                                        :   undefined
                                    }
                                />
                                <DaySummaryCard
                                    label={t('realForecastJournal.summary.cards.match', {
                                        defaultValue: 'Forecast vs reality'
                                    })}
                                    value={
                                        selectedDay.directionMatched === null ?
                                            pendingFinalizeLabel
                                        : selectedDay.directionMatched ?
                                            t('realForecastJournal.summary.match.yes', { defaultValue: 'Matched' })
                                        :   t('realForecastJournal.summary.match.no', { defaultValue: 'Did not match' })
                                    }
                                />
                                <DaySummaryCard
                                    label={t('realForecastJournal.summary.cards.capture', {
                                        defaultValue: 'Capture timestamp (UTC)'
                                    })}
                                    value={
                                        selectedDay.capturedAtUtc ?
                                            formatUtc(selectedDay.capturedAtUtc, locale)
                                        :   pendingFinalizeLabel
                                    }
                                    hint={`${formatUtc(selectedDay.entryUtc, locale)} → ${formatUtc(selectedDay.exitUtc, locale)}`}
                                />
                                <DaySummaryCard
                                    label={t('realForecastJournal.summary.cards.entry', {
                                        defaultValue: 'Reference entry price'
                                    })}
                                    value={
                                        selectedRecord.forecastSnapshot ?
                                            formatPrice(selectedRecord.forecastSnapshot.entry, locale)
                                        :   pendingFinalizeLabel
                                    }
                                />
                                <DaySummaryCard
                                    label={t('realForecastJournal.summary.cards.actualClose', {
                                        defaultValue: 'Actual close price'
                                    })}
                                    value={
                                        selectedRecord.finalize?.snapshot.actualDay ?
                                            formatPrice(selectedRecord.finalize.snapshot.actualDay.close24, locale)
                                        :   pendingFinalizeLabel
                                    }
                                />
                            </div>
                            <div className={cls.metaPanel}>
                                <div className={cls.metaPanelItem}>
                                    <Text className={cls.metaLabel}>
                                        {t('realForecastJournal.summary.reasonLabel', {
                                            defaultValue: 'Morning model comment'
                                        })}
                                    </Text>
                                    <Text className={cls.metaValue}>
                                        {selectedRecord.forecastSnapshot?.reason ?? pendingFinalizeLabel}
                                    </Text>
                                </div>
                                {selectedRecord.forecastSnapshot?.previewNote && (
                                    <div className={cls.metaPanelItem}>
                                        <Text className={cls.metaLabel}>
                                            {t('realForecastJournal.summary.previewLabel', {
                                                defaultValue: 'Preview note'
                                            })}
                                        </Text>
                                        <Text className={cls.metaValue}>
                                            {selectedRecord.forecastSnapshot.previewNote}
                                        </Text>
                                    </div>
                                )}
                            </div>
                        </section>

                        {isSelectedDayActive && (
                            <section className={cls.liveSection}>
                                <div className={cls.sectionHeader}>
                                    <Text type='h2' className={cls.sectionTitle}>
                                        {t('realForecastJournal.live.title', { defaultValue: 'Intraday live monitor' })}
                                    </Text>
                                    <Text className={cls.sectionSubtitle}>
                                        {t('realForecastJournal.live.subtitle', {
                                            defaultValue:
                                                'While this page is open, the backend requests the latest SOL price and re-checks confirmed 1m candles every 30 minutes. Event order matches the current PnL engine: liquidation, then stop-loss, then take-profit.'
                                        })}
                                    </Text>
                                </div>
                                {liveStatusQuery.error && (
                                    <div className={cls.sectionError}>
                                        <Text type='h3'>
                                            {t('realForecastJournal.live.errorTitle', {
                                                defaultValue: 'Live monitor is temporarily unavailable'
                                            })}
                                        </Text>
                                        <Text>{liveStatusQuery.error.message}</Text>
                                    </div>
                                )}
                                {!liveStatusQuery.error && !liveStatusQuery.data && (
                                    <Text className={cls.loadingText}>
                                        {t('realForecastJournal.live.loading', {
                                            defaultValue:
                                                'Loading current price and the latest confirmed 1m candle window...'
                                        })}
                                    </Text>
                                )}
                                {liveStatusQuery.data && (
                                    <div className={cls.summaryGrid}>
                                        <DaySummaryCard
                                            label={t('realForecastJournal.live.cards.currentPrice', {
                                                defaultValue: 'Current SOL price'
                                            })}
                                            value={formatPrice(liveStatusQuery.data.currentPrice, locale)}
                                            hint={formatUtc(liveStatusQuery.data.currentPriceObservedAtUtc, locale)}
                                        />
                                        <DaySummaryCard
                                            label={t('realForecastJournal.live.cards.observedWindow', {
                                                defaultValue: 'Confirmed 1m window'
                                            })}
                                            value={`${formatUtc(liveStatusQuery.data.minuteObservationStartUtc, locale)} -> ${formatUtc(liveStatusQuery.data.minuteObservationThroughUtc, locale)}`}
                                        />
                                        <DaySummaryCard
                                            label={t('realForecastJournal.live.cards.triggeredRows', {
                                                defaultValue: 'Rows with resolved event'
                                            })}
                                            value={String(
                                                liveStatusQuery.data.rows.filter(
                                                    row => row.status !== 'open' && row.status !== 'not-tracked'
                                                ).length
                                            )}
                                        />
                                        <DaySummaryCard
                                            label={t('realForecastJournal.live.cards.openRows', {
                                                defaultValue: 'Rows still open'
                                            })}
                                            value={String(
                                                liveStatusQuery.data.rows.filter(row => row.status === 'open').length
                                            )}
                                        />
                                    </div>
                                )}
                            </section>
                        )}

                        <section className={cls.policySection}>
                            <div className={cls.sectionHeader}>
                                <Text type='h2' className={cls.sectionTitle}>
                                    {t('realForecastJournal.policy.title', {
                                        defaultValue: 'Policy plan and realized execution'
                                    })}
                                </Text>
                                <Text className={cls.sectionSubtitle}>
                                    {t('realForecastJournal.policy.subtitle', {
                                        defaultValue:
                                            'Morning values come from the fixed forecast. Realized exit fields appear only after the day is finalized. Null values stay explicit instead of being turned into zero.'
                                    })}
                                </Text>
                            </div>
                            <div className={cls.filtersRow}>
                                <ReportViewControls
                                    groups={policyControlGroups}
                                    className={cls.controls}
                                    showSelectedOptionHints={false}
                                />
                                <div className={cls.searchBox}>
                                    <Text className={cls.searchLabel}>
                                        {t('realForecastJournal.policy.controls.search', {
                                            defaultValue: 'Policy / branch search'
                                        })}
                                    </Text>
                                    <Input
                                        value={policySearch}
                                        onChange={event => onPolicySearchChange(event.target.value)}
                                        placeholder={t('realForecastJournal.policy.controls.searchPlaceholder', {
                                            defaultValue: 'For example: const_2x_cross or BASE'
                                        })}
                                        className={cls.searchInput}
                                    />
                                </div>
                            </div>
                            <ReportTableTermsBlock
                                terms={policyTerms}
                                enhanceDomainTerms
                                title={termsBlockTitle}
                                subtitle={termsBlockSubtitle}
                            />
                            <ReportTableCard
                                title={t('realForecastJournal.policy.table.title', {
                                    defaultValue: 'Published policy rows'
                                })}
                                description={t('realForecastJournal.policy.table.description', {
                                    defaultValue:
                                        'The table starts with every published row for the selected day. Bucket, branch, and search only narrow the published set, and margin type is already visible in the policy name.'
                                })}
                                columns={policyColumns}
                                rows={policyRowsTable}
                                rowEvaluations={filteredPolicyRows.map(row => row.evaluation)}
                                domId='real-forecast-policy-table'
                                renderColumnTitle={renderJournalColumnTitle}
                            />
                            {filteredPolicyRows.length === 0 && (
                                <Text className={cls.emptyState}>
                                    {t('realForecastJournal.policy.empty', {
                                        defaultValue:
                                            'No published policy rows match the current bucket, branch, and search filters.'
                                    })}
                                </Text>
                            )}
                        </section>

                        <section className={cls.detailSection}>
                            <div className={cls.sectionHeader}>
                                <Text type='h2' className={cls.sectionTitle}>
                                    {t('realForecastJournal.indicators.title', {
                                        defaultValue: 'Indicators in the morning and by day close'
                                    })}
                                </Text>
                                <Text className={cls.sectionSubtitle}>
                                    {t('realForecastJournal.indicators.subtitle', {
                                        defaultValue:
                                            'Open the detailed block to inspect the exact indicator values that were visible in the morning when the forecast was captured and their later end-of-day state.'
                                    })}
                                </Text>
                            </div>
                            <Btn className={cls.detailToggle} onClick={onDetailedToggle}>
                                {isDetailedOpen ?
                                    t('realForecastJournal.indicators.hide', {
                                        defaultValue: 'Hide detailed indicator block'
                                    })
                                :   t('realForecastJournal.indicators.show', {
                                        defaultValue: 'Show detailed indicator block'
                                    })
                                }
                            </Btn>
                            {isDetailedOpen && (
                                <div className={cls.indicatorBlock}>
                                    <ReportViewControls
                                        groups={indicatorControlGroups}
                                        className={cls.controls}
                                        showSelectedOptionHints={false}
                                    />
                                    <ReportTableTermsBlock
                                        terms={indicatorTerms}
                                        enhanceDomainTerms
                                        title={termsBlockTitle}
                                        subtitle={termsBlockSubtitle}
                                    />
                                    <ReportTableCard
                                        title={t('realForecastJournal.indicators.table.title', {
                                            defaultValue: 'Indicator value diff'
                                        })}
                                        description={t('realForecastJournal.indicators.table.description', {
                                            defaultValue:
                                                'The morning value is the fixed value at publication time. The close value and delta appear only after finalization.'
                                        })}
                                        columns={indicatorColumns}
                                        rows={indicatorRows}
                                        domId='real-forecast-indicator-table'
                                        renderColumnTitle={renderJournalColumnTitle}
                                    />
                                </div>
                            )}
                        </section>
                    </>
                )}
            </PageDataState>

            <RealForecastJournalComparisonSection
                locale={locale}
                t={t}
                searchParams={searchParams}
                setSearchParams={setSearchParams}
                dayList={dayList}
                comparisonSource={comparisonSource}
                comparisonScope={comparisonScope}
                queryError={comparisonQueryError}
                aggregationMetricsQuery={aggregationMetricsQuery}
                confidenceRiskQuery={confidenceRiskQuery}
                comparisonControlGroups={comparisonControlGroups}
                renderColumnTitle={renderJournalColumnTitle}
                termsLocale={termsLocale}
                termsBlockTitle={termsBlockTitle}
                termsBlockSubtitle={termsBlockSubtitle}
            />
        </div>
    )
}

interface RealForecastJournalComparisonSectionProps {
    locale: string
    t: TranslateFn
    searchParams: URLSearchParams
    setSearchParams: ReturnType<typeof useSearchParams>[1]
    dayList: RealForecastJournalDayListItemDto[]
    comparisonSource: RealForecastJournalComparisonSource
    comparisonScope: CurrentPredictionTrainingScope
    queryError: Error | null
    aggregationMetricsQuery: ReturnType<typeof useAggregationMetricsQuery>
    confidenceRiskQuery: ReturnType<typeof useBacktestConfidenceRiskReportQuery>
    comparisonControlGroups: ReportViewControlGroup[]
    renderColumnTitle: (title: string) => ReactNode
    termsLocale: RealForecastJournalTermsLocale
    termsBlockTitle: string
    termsBlockSubtitle: string
}

function RealForecastJournalComparisonSection({
    locale,
    t,
    dayList,
    comparisonSource,
    comparisonScope,
    queryError,
    aggregationMetricsQuery,
    confidenceRiskQuery,
    comparisonControlGroups,
    renderColumnTitle,
    termsLocale,
    termsBlockTitle,
    termsBlockSubtitle
}: RealForecastJournalComparisonSectionProps) {
    const comparisonState = useMemo(() => {
        try {
            if (comparisonSource === 'aggregation') {
                if (aggregationMetricsQuery.error) throw aggregationMetricsQuery.error
                if (!aggregationMetricsQuery.data) {
                    return {
                        aggregation: null as ReturnType<typeof buildAggregationComparison> | null,
                        confidenceRisk: null as ReturnType<typeof buildConfidenceRiskComparison> | null,
                        error: null as Error | null,
                        isLoading: aggregationMetricsQuery.isLoading
                    }
                }

                return {
                    aggregation: buildAggregationComparison(dayList, aggregationMetricsQuery.data, comparisonScope),
                    confidenceRisk: null,
                    error: null,
                    isLoading: false
                }
            }

            if (confidenceRiskQuery.error) throw confidenceRiskQuery.error
            if (!confidenceRiskQuery.data) {
                return {
                    aggregation: null,
                    confidenceRisk: null as ReturnType<typeof buildConfidenceRiskComparison> | null,
                    error: null as Error | null,
                    isLoading: confidenceRiskQuery.isLoading
                }
            }

            return {
                aggregation: null,
                confidenceRisk: buildConfidenceRiskComparison(dayList, confidenceRiskQuery.data, comparisonScope),
                error: null,
                isLoading: false
            }
        } catch (error) {
            return {
                aggregation: null,
                confidenceRisk: null,
                error: normalizeErrorLike(error, 'Failed to build real forecast journal comparison state.', {
                    source: 'real-forecast-journal-comparison-state',
                    domain: 'ui_section',
                    owner: 'real-forecast-journal-page',
                    expected: 'Comparison block should build a benchmark state from published journal and benchmark data.',
                    requiredAction: 'Inspect comparison builders and the selected benchmark payload.'
                }),
                isLoading: false
            }
        }
    }, [
        aggregationMetricsQuery.data,
        aggregationMetricsQuery.error,
        aggregationMetricsQuery.isLoading,
        comparisonScope,
        comparisonSource,
        confidenceRiskQuery.data,
        confidenceRiskQuery.error,
        confidenceRiskQuery.isLoading,
        dayList
    ])
    const aggregationColumns = useMemo(
        () => [
            t('realForecastJournal.comparison.columns.metric', { defaultValue: 'Metric' }),
            t('realForecastJournal.comparison.columns.live', { defaultValue: 'Live journal' }),
            t('realForecastJournal.comparison.columns.history', {
                defaultValue: 'Selected history'
            }),
            t('realForecastJournal.comparison.columns.delta', { defaultValue: 'Delta' })
        ],
        [t]
    )
    const aggregationTerms = useMemo(
        () => buildRealForecastJournalTerms(aggregationColumns, termsLocale),
        [aggregationColumns, termsLocale]
    )
    const confidenceRiskSummaryColumns = useMemo(
        () => [
            t('realForecastJournal.comparison.columns.metric', { defaultValue: 'Metric' }),
            t('realForecastJournal.comparison.columns.live', { defaultValue: 'Live journal' }),
            t('realForecastJournal.comparison.columns.history', {
                defaultValue: 'Weighted history'
            }),
            t('realForecastJournal.comparison.columns.delta', { defaultValue: 'Delta' })
        ],
        [t]
    )
    const confidenceRiskSummaryTerms = useMemo(
        () => buildRealForecastJournalTerms(confidenceRiskSummaryColumns, termsLocale),
        [confidenceRiskSummaryColumns, termsLocale]
    )
    const confidenceRiskBucketColumns = useMemo(
        () => [
            t('realForecastJournal.comparison.confidenceRisk.columns.bucket', {
                defaultValue: 'Bucket'
            }),
            t('realForecastJournal.comparison.confidenceRisk.columns.range', {
                defaultValue: 'Range'
            }),
            t('realForecastJournal.comparison.confidenceRisk.columns.liveDays', {
                defaultValue: 'Live days'
            }),
            t('realForecastJournal.comparison.confidenceRisk.columns.liveWinRate', {
                defaultValue: 'Live win rate'
            }),
            t('realForecastJournal.comparison.confidenceRisk.columns.liveConfidence', {
                defaultValue: 'Live avg confidence'
            }),
            t('realForecastJournal.comparison.confidenceRisk.columns.historyWinRate', {
                defaultValue: 'Historical win rate'
            }),
            t('realForecastJournal.comparison.confidenceRisk.columns.delta', {
                defaultValue: 'Delta'
            })
        ],
        [t]
    )
    const confidenceRiskBucketTerms = useMemo(
        () => buildRealForecastJournalTerms(confidenceRiskBucketColumns, termsLocale),
        [confidenceRiskBucketColumns, termsLocale]
    )

    return (
        <section className={cls.comparisonSection}>
            <div className={cls.sectionHeader}>
                <Text type='h2' className={cls.sectionTitle}>
                    {t('realForecastJournal.comparison.title', { defaultValue: 'Live vs historical benchmark' })}
                </Text>
                <Text className={cls.sectionSubtitle}>
                    {t('realForecastJournal.comparison.subtitle', {
                        defaultValue:
                            'Only journal days captured before the outcome was known are used here. This block compares their realized performance with the selected historical benchmark.'
                    })}
                </Text>
            </div>
            <ReportViewControls
                groups={comparisonControlGroups}
                className={cls.controls}
                showSelectedOptionHints={false}
            />
            {queryError && (
                <div className={cls.sectionError}>
                    <Text type='h3'>
                        {t('realForecastJournal.errors.scope.title', {
                            defaultValue: 'Comparison query is invalid'
                        })}
                    </Text>
                    <Text>{queryError.message}</Text>
                </div>
            )}
            {!queryError && comparisonState.isLoading && (
                <Text className={cls.loadingText}>
                    {t('realForecastJournal.comparison.loading', { defaultValue: 'Loading benchmark comparison...' })}
                </Text>
            )}
            {!queryError && !comparisonState.isLoading && comparisonState.error && (
                <div className={cls.sectionError}>
                    <Text type='h3'>
                        {t('realForecastJournal.comparison.errorTitle', {
                            defaultValue: 'Comparison block is unavailable'
                        })}
                    </Text>
                    <Text>{comparisonState.error.message}</Text>
                </div>
            )}
            {!queryError &&
                !comparisonState.isLoading &&
                !comparisonState.error &&
                comparisonSource === 'aggregation' &&
                comparisonState.aggregation && (
                    <div className={cls.comparisonContent}>
                        <div className={cls.insightGrid}>
                            <SectionNote
                                title={t('realForecastJournal.comparison.insights.accuracyTitle', {
                                    defaultValue: 'Accuracy delta'
                                })}
                                body={resolveComparisonStatusText(
                                    comparisonState.aggregation.accuracyDelta,
                                    comparisonState.aggregation.live.sampleSize,
                                    locale,
                                    t
                                )}
                            />
                            <SectionNote
                                title={t('realForecastJournal.comparison.insights.calibrationTitle', {
                                    defaultValue: 'Calibration read'
                                })}
                                body={resolveCalibrationText(
                                    comparisonState.aggregation.live.calibrationGap,
                                    locale,
                                    t
                                )}
                            />
                            <SectionNote
                                title={t('realForecastJournal.comparison.insights.significanceTitle', {
                                    defaultValue: 'Rough significance'
                                })}
                                body={resolveRoughSignificanceText(
                                    comparisonState.aggregation.live.accuracy,
                                    comparisonState.aggregation.benchmark.accuracy,
                                    comparisonState.aggregation.live.sampleSize,
                                    t
                                )}
                            />
                        </div>
                        <ReportTableTermsBlock
                            terms={aggregationTerms}
                            enhanceDomainTerms
                            title={termsBlockTitle}
                            subtitle={termsBlockSubtitle}
                        />
                        <ReportTableCard
                            title={t('realForecastJournal.comparison.aggregation.tableTitle', {
                                defaultValue: 'Aggregation benchmark comparison'
                            })}
                            description={comparisonState.aggregation.benchmark.label}
                            columns={aggregationColumns}
                            rows={buildAggregationComparisonTable(comparisonState.aggregation, locale, t)}
                            domId='real-forecast-aggregation-comparison'
                            renderColumnTitle={renderColumnTitle}
                        />
                    </div>
                )}
            {!queryError &&
                !comparisonState.isLoading &&
                !comparisonState.error &&
                comparisonSource === 'confidence-risk' &&
                comparisonState.confidenceRisk && (
                    <div className={cls.comparisonContent}>
                        <div className={cls.insightGrid}>
                            <SectionNote
                                title={t('realForecastJournal.comparison.insights.accuracyTitle', {
                                    defaultValue: 'Confidence-bucket delta'
                                })}
                                body={resolveComparisonStatusText(
                                    comparisonState.confidenceRisk.weightedDelta,
                                    comparisonState.confidenceRisk.live.sampleSize,
                                    locale,
                                    t
                                )}
                            />
                            <SectionNote
                                title={t('realForecastJournal.comparison.insights.calibrationTitle', {
                                    defaultValue: 'Calibration read'
                                })}
                                body={resolveCalibrationText(
                                    comparisonState.confidenceRisk.live.calibrationGap,
                                    locale,
                                    t
                                )}
                            />
                            <SectionNote
                                title={t('realForecastJournal.comparison.insights.rangeTitle', {
                                    defaultValue: 'Bucket coverage'
                                })}
                                body={
                                    comparisonState.confidenceRisk.outOfRangeDays > 0 ?
                                        t('realForecastJournal.comparison.outOfRangeSome', {
                                            defaultValue:
                                                '{{count}} live day(s) fell outside the selected historical confidence buckets.',
                                            count: comparisonState.confidenceRisk.outOfRangeDays
                                        })
                                    :   t('realForecastJournal.comparison.outOfRangeNone', {
                                            defaultValue:
                                                'Every finalized live day mapped into the selected historical confidence buckets.'
                                        })
                                }
                            />
                        </div>
                        <ReportTableTermsBlock
                            terms={confidenceRiskSummaryTerms}
                            enhanceDomainTerms
                            title={termsBlockTitle}
                            subtitle={termsBlockSubtitle}
                        />
                        <ReportTableCard
                            title={t('realForecastJournal.comparison.confidenceRisk.summaryTitle', {
                                defaultValue: 'Confidence-risk summary'
                            })}
                            description={t('realForecastJournal.comparison.confidenceRisk.summaryDescription', {
                                defaultValue:
                                    'Weighted benchmark uses the same confidence buckets that the live journal days fell into.'
                            })}
                            columns={confidenceRiskSummaryColumns}
                            rows={buildConfidenceRiskSummaryTable(comparisonState.confidenceRisk, locale, t)}
                            domId='real-forecast-confidence-risk-summary'
                            renderColumnTitle={renderColumnTitle}
                        />
                        <ReportTableTermsBlock
                            terms={confidenceRiskBucketTerms}
                            enhanceDomainTerms
                            title={termsBlockTitle}
                            subtitle={termsBlockSubtitle}
                        />
                        <ReportTableCard
                            title={t('realForecastJournal.comparison.confidenceRisk.bucketTitle', {
                                defaultValue: 'Bucket-by-bucket comparison'
                            })}
                            description={t('realForecastJournal.comparison.confidenceRisk.bucketDescription', {
                                defaultValue:
                                    'Only finalized live days are counted. Each row compares live win rate with the historical win rate of the same confidence bucket.'
                            })}
                            columns={confidenceRiskBucketColumns}
                            rows={buildConfidenceRiskBucketTable(comparisonState.confidenceRisk, locale, t)}
                            domId='real-forecast-confidence-risk-buckets'
                            renderColumnTitle={renderColumnTitle}
                        />
                    </div>
                )}
        </section>
    )
}

export default function RealForecastJournalPage(props: RealForecastJournalPageProps) {
    return <RealForecastJournalPageInner {...props} />
}
