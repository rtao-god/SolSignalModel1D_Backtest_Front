import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import classNames from '@/shared/lib/helpers/classNames'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import PageError from '@/shared/ui/errors/PageError/ui/PageError'
import PageSuspense from '@/shared/ui/loaders/PageSuspense/ui/PageSuspense'
import {
    Btn,
    Input,
    ReportTableCard,
    ReportViewControls,
    Text,
    buildMegaSlModeControlGroup,
    buildPredictionPolicyBucketControlGroup,
    buildTrainingScopeControlGroup,
    type ReportViewControlGroup
} from '@/shared/ui'
import type { TableRow } from '@/shared/ui/SortableTable'
import { useAggregationMetricsQuery } from '@/shared/api/tanstackQueries/aggregation'
import {
    useRealForecastJournalDayListQuery,
    useRealForecastJournalDayQuery
} from '@/shared/api/tanstackQueries/realForecastJournal'
import { useBacktestConfidenceRiskReportQuery } from '@/shared/api/tanstackQueries/backtestConfidenceRisk'
import type { CurrentPredictionTrainingScope } from '@/shared/api/endpoints/reportEndpoints'
import type {
    RealForecastJournalDayListItemDto,
    RealForecastJournalDayRecordDto,
    RealForecastJournalMarginMode,
    RealForecastJournalPolicyBucket
} from '@/shared/types/realForecastJournal.types'
import {
    buildAggregationComparisonOrThrow,
    buildCombinedPolicyRows,
    buildConfidenceRiskComparisonOrThrow,
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
import { formatDateWithLocaleOrThrow } from '@/shared/utils/dateFormat'
import cls from './RealForecastJournalPage.module.scss'
import type { RealForecastJournalPageProps } from './types'

const DEFAULT_COMPARISON_SOURCE: RealForecastJournalComparisonSource = 'aggregation'
const DEFAULT_COMPARISON_SCOPE: CurrentPredictionTrainingScope = 'oos'
const DEFAULT_BUCKET_FILTER: RealForecastJournalPolicyBucket | 'total' = 'daily'
const DEFAULT_SL_FILTER: 'all' | 'with-sl' | 'no-sl' = 'with-sl'
const DEFAULT_MARGIN_FILTER: 'all' | RealForecastJournalMarginMode = 'all'
const DEFAULT_BRANCH_FILTER: RealForecastJournalBranchFilter = 'all'
const DEFAULT_POLICY_SEARCH: RealForecastJournalPolicySearchValue = ''
const DEFAULT_INDICATOR_GROUP: RealForecastJournalIndicatorGroupFilter = 'all'

function resolveComparisonSourceOrThrow(raw: string | null): RealForecastJournalComparisonSource {
    if (!raw) return DEFAULT_COMPARISON_SOURCE
    const normalized = raw.trim().toLowerCase()
    if (normalized === 'aggregation') return 'aggregation'
    if (normalized === 'confidence-risk') return 'confidence-risk'
    throw new Error(`[real-forecast-journal] unsupported comparison source query value: ${raw}.`)
}

function resolveComparisonScopeOrThrow(raw: string | null): CurrentPredictionTrainingScope {
    if (!raw) return DEFAULT_COMPARISON_SCOPE
    const normalized = raw.trim().toLowerCase()
    if (normalized === 'oos') return 'oos'
    if (normalized === 'train') return 'train'
    if (normalized === 'recent') return 'recent'
    if (normalized === 'full') return 'full'
    throw new Error(`[real-forecast-journal] unsupported comparison scope query value: ${raw}.`)
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
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
        throw new Error(`[real-forecast-journal] invalid utc value: ${value}.`)
    }

    return formatDateWithLocaleOrThrow(parsed, locale, {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC'
    })
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

    return `${new Intl.NumberFormat(locale, {
        minimumFractionDigits: digits,
        maximumFractionDigits: digits
    }).format(value * 100)} p.p.`
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

type TranslateFn = ReturnType<typeof useTranslation>['t']

function resolveStatusText(day: RealForecastJournalDayListItemDto, t: TranslateFn): string {
    if (day.status === 'captured') {
        return t('realForecastJournal.status.captured', {
            defaultValue:
                'Captured in the morning. Fact fields stay empty until the NY day closes and post-close data sync finishes.'
        })
    }

    return t('realForecastJournal.status.finalized', {
        defaultValue:
            'Finalized after the NY close. Morning fields are immutable and the realized outcome is now read-only.'
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
            defaultValue: `Live directional accuracy is above the selected historical benchmark by ${deltaLabel}.`
        })
    }

    return t('realForecastJournal.comparison.below', {
        defaultValue: `Live directional accuracy is below the selected historical benchmark by ${deltaLabel}.`
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
            defaultValue: `Current live sample is more confident than realized outcomes by ${gapLabel}.`
        })
    }

    return t('realForecastJournal.comparison.calibrationUnder', {
        defaultValue: `Current live sample is less confident than realized outcomes by ${gapLabel}.`
    })
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

function buildMarginControlGroup(
    value: 'all' | RealForecastJournalMarginMode,
    onChange: (next: 'all' | RealForecastJournalMarginMode) => void,
    t: TranslateFn
): ReportViewControlGroup<'all' | RealForecastJournalMarginMode> {
    return {
        key: 'real-forecast-margin',
        label: t('realForecastJournal.policy.controls.margin', { defaultValue: 'Margin mode' }),
        value,
        options: [
            { value: 'all', label: t('realForecastJournal.common.all', { defaultValue: 'ALL' }) },
            { value: 'cross', label: t('realForecastJournal.policy.controls.marginCross', { defaultValue: 'Cross' }) },
            {
                value: 'isolated',
                label: t('realForecastJournal.policy.controls.marginIsolated', { defaultValue: 'Isolated' })
            }
        ],
        onChange
    }
}

function buildZonalControlGroup(t: TranslateFn): ReportViewControlGroup<'with-zonal'> {
    return {
        key: 'real-forecast-zonal',
        label: t('realForecastJournal.policy.controls.zonal', { defaultValue: 'Zonal slice' }),
        infoTooltip: t('realForecastJournal.policy.controls.zonalTooltip', {
            defaultValue:
                'Current real-forecast journal stores the published zonal slice only. Alternative zonal modes are not exposed by the immutable journal payload yet, so the page keeps the control explicit instead of faking a mode switch.'
        }),
        value: 'with-zonal',
        options: [
            {
                value: 'with-zonal',
                label: t('realForecastJournal.policy.controls.zonalWith', { defaultValue: 'With zonal' })
            }
        ],
        onChange: () => {}
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

function buildPolicyTableColumns(t: TranslateFn): string[] {
    return [
        t('realForecastJournal.policy.table.columns.policy', { defaultValue: 'Policy' }),
        t('realForecastJournal.policy.table.columns.branch', { defaultValue: 'Branch' }),
        t('realForecastJournal.policy.table.columns.bucket', { defaultValue: 'Bucket' }),
        t('realForecastJournal.policy.table.columns.morning', { defaultValue: 'Morning snapshot' }),
        t('realForecastJournal.policy.table.columns.marginMode', { defaultValue: 'Margin mode' }),
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
        }),
        t('realForecastJournal.policy.table.columns.actualExit', { defaultValue: 'Actual exit price' }),
        t('realForecastJournal.policy.table.columns.actualExitReason', { defaultValue: 'Actual exit reason' }),
        t('realForecastJournal.policy.table.columns.actualExitPnl', { defaultValue: 'Actual exit PnL, %' }),
        t('realForecastJournal.policy.table.columns.actualTrades', { defaultValue: 'Trades' }),
        t('realForecastJournal.policy.table.columns.actualTotalPnl', { defaultValue: 'Total PnL, %' }),
        t('realForecastJournal.policy.table.columns.actualMaxDd', { defaultValue: 'MaxDD, %' }),
        t('realForecastJournal.policy.table.columns.actualLiquidation', { defaultValue: 'Had liquidation' }),
        t('realForecastJournal.policy.table.columns.actualWithdrawn', { defaultValue: 'Withdrawn, $' })
    ]
}

function buildPolicyTableRows(
    rows: RealForecastJournalCombinedPolicyRow[],
    locale: string,
    t: TranslateFn,
    isFinalized: boolean
): TableRow[] {
    const notPublished = t('realForecastJournal.placeholders.notPublished', { defaultValue: 'Not published' })
    const notPublishedMorning = t('realForecastJournal.placeholders.notPublishedMorning', {
        defaultValue: 'Not published in morning snapshot'
    })
    const noStopLoss = t('realForecastJournal.placeholders.noStopLoss', { defaultValue: 'No stop-loss' })
    const noTakeProfit = t('realForecastJournal.placeholders.noTakeProfit', { defaultValue: 'No take-profit' })
    const notApplicable = t('realForecastJournal.placeholders.notApplicable', { defaultValue: 'Not applicable' })
    const pendingFinalize = t('realForecastJournal.placeholders.pendingFinalize', {
        defaultValue: 'Pending NY close and indicator sync'
    })
    const yesLabel = t('realForecastJournal.common.yes', { defaultValue: 'Yes' })
    const noLabel = t('realForecastJournal.common.no', { defaultValue: 'No' })
    const noDirection = t('realForecastJournal.placeholders.noDirection', { defaultValue: 'No direction' })

    return rows.map(row => [
        row.policyName,
        row.branch,
        row.bucket,
        row.publishedInMorningSnapshot ?
            t('realForecastJournal.policy.table.morningPublished', { defaultValue: 'Published' })
        :   notPublishedMorning,
        row.margin === null ? notPublished : row.margin,
        row.hasDirection ? row.direction : noDirection,
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
        row.hasDirection ? formatOptionalPrice(row.liqPrice, locale, notPublished) : notApplicable,
        row.hasDirection ? formatOptionalPercent(row.liqDistPct, locale, notPublished) : notApplicable,
        isFinalized ? formatOptionalPrice(row.actualExitPrice, locale, notPublished) : pendingFinalize,
        isFinalized ? (row.actualExitReason ?? notPublished) : pendingFinalize,
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
    ])
}

function buildIndicatorTableRows(
    record: RealForecastJournalDayRecordDto,
    group: RealForecastJournalIndicatorGroupFilter,
    t: TranslateFn
): TableRow[] {
    const pendingFinalize = t('realForecastJournal.placeholders.pendingFinalize', {
        defaultValue: 'Pending NY close and indicator sync'
    })
    const noDelta = t('realForecastJournal.placeholders.noDelta', { defaultValue: 'Delta available after close' })
    const deltaUnavailable = t('realForecastJournal.placeholders.deltaUnavailable', {
        defaultValue: 'No numeric delta'
    })

    return buildIndicatorComparisonRows(record, group).map(row => [
        row.group,
        row.label,
        row.morningDisplay,
        row.closeDisplay ?? pendingFinalize,
        row.deltaDisplay ?? (record.finalize ? deltaUnavailable : noDelta)
    ])
}

function buildAggregationComparisonTable(
    record: ReturnType<typeof buildAggregationComparisonOrThrow>,
    locale: string,
    t: TranslateFn
): TableRow[] {
    return [
        [
            t('realForecastJournal.comparison.table.accuracy', { defaultValue: 'Directional accuracy' }),
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
            'n/a',
            'n/a'
        ],
        [
            t('realForecastJournal.comparison.table.calibrationGap', { defaultValue: 'Calibration gap' }),
            formatPercentPoints(record.live.calibrationGap, locale),
            'n/a',
            'n/a'
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
    record: ReturnType<typeof buildConfidenceRiskComparisonOrThrow>,
    locale: string,
    t: TranslateFn
): TableRow[] {
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
            'n/a',
            'n/a'
        ],
        [
            t('realForecastJournal.comparison.table.calibrationGap', { defaultValue: 'Calibration gap' }),
            formatPercentPoints(record.live.calibrationGap, locale),
            'n/a',
            'n/a'
        ],
        [
            t('realForecastJournal.comparison.table.outOfRange', { defaultValue: 'Out-of-range live days' }),
            String(record.outOfRangeDays),
            'n/a',
            'n/a'
        ],
        [
            t('realForecastJournal.comparison.table.sample', { defaultValue: 'Sample size' }),
            String(record.live.sampleSize),
            String(record.bucketRows.reduce((sum, row) => sum + row.liveDays, 0)),
            'n/a'
        ]
    ]
}

function buildConfidenceRiskBucketTable(
    record: ReturnType<typeof buildConfidenceRiskComparisonOrThrow>,
    locale: string
): TableRow[] {
    return record.bucketRows.map(row => [
        row.bucket,
        row.rangeLabel,
        String(row.liveDays),
        formatOptionalPercent(row.liveWinRate, locale, 'n/a'),
        formatOptionalPercent(
            row.liveAverageConfidencePct === null ? null : row.liveAverageConfidencePct / 100,
            locale,
            'n/a'
        ),
        formatPercent(row.benchmarkWinRate, locale),
        formatOptionalPercentPoints(row.deltaWinRate, locale, 'n/a')
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

function SectionNote({ title, body }: { title: string; body: string }) {
    return (
        <div className={cls.noteCard}>
            <Text type='h3' className={cls.noteTitle}>
                {title}
            </Text>
            <Text className={cls.noteBody}>{body}</Text>
        </div>
    )
}

function RealForecastJournalPageInner({ className }: RealForecastJournalPageProps) {
    const { t, i18n } = useTranslation('reports')
    const locale = i18n.resolvedLanguage?.startsWith('ru') ? 'ru-RU' : 'en-US'
    const [searchParams, setSearchParams] = useSearchParams()
    const comparisonSourceState = useMemo(() => {
        try {
            return { value: resolveComparisonSourceOrThrow(searchParams.get('source')), error: null as Error | null }
        } catch (error) {
            return {
                value: DEFAULT_COMPARISON_SOURCE,
                error: error instanceof Error ? error : new Error(String(error))
            }
        }
    }, [searchParams])
    const comparisonScopeState = useMemo(() => {
        try {
            return { value: resolveComparisonScopeOrThrow(searchParams.get('scope')), error: null as Error | null }
        } catch (error) {
            return { value: DEFAULT_COMPARISON_SCOPE, error: error instanceof Error ? error : new Error(String(error)) }
        }
    }, [searchParams])

    const [bucketFilter, setBucketFilter] = useState<RealForecastJournalPolicyBucket | 'total'>(DEFAULT_BUCKET_FILTER)
    const [slModeFilter, setSlModeFilter] = useState<'all' | 'with-sl' | 'no-sl'>(DEFAULT_SL_FILTER)
    const [branchFilter, setBranchFilter] = useState<RealForecastJournalBranchFilter>(DEFAULT_BRANCH_FILTER)
    const [marginFilter, setMarginFilter] = useState<'all' | RealForecastJournalMarginMode>(DEFAULT_MARGIN_FILTER)
    const [policySearch, setPolicySearch] = useState<RealForecastJournalPolicySearchValue>(DEFAULT_POLICY_SEARCH)
    const [indicatorGroup, setIndicatorGroup] =
        useState<RealForecastJournalIndicatorGroupFilter>(DEFAULT_INDICATOR_GROUP)
    const [isDetailedOpen, setIsDetailedOpen] = useState(false)

    const dayListQuery = useRealForecastJournalDayListQuery()
    const aggregationMetricsQuery = useAggregationMetricsQuery()
    const confidenceRiskQuery = useBacktestConfidenceRiskReportQuery({ scope: comparisonScopeState.value })
    const selectedDate = useMemo(
        () => resolveSelectedDate(dayListQuery.data, searchParams.get('date')),
        [dayListQuery.data, searchParams]
    )
    const selectedDayQuery = useRealForecastJournalDayQuery(
        { dateUtc: selectedDate ?? '1970-01-01' },
        { enabled: Boolean(selectedDate) }
    )

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

    if (comparisonSourceState.error) {
        return (
            <PageError
                title={t('realForecastJournal.errors.source.title', {
                    defaultValue: 'Comparison source query is invalid'
                })}
                message={t('realForecastJournal.errors.source.message', {
                    defaultValue: 'Search parameter "source" must be aggregation or confidence-risk.'
                })}
                error={comparisonSourceState.error}
            />
        )
    }

    if (comparisonScopeState.error) {
        return (
            <PageError
                title={t('realForecastJournal.errors.scope.title', {
                    defaultValue: 'Comparison scope query is invalid'
                })}
                message={t('realForecastJournal.errors.scope.message', {
                    defaultValue: 'Search parameter "scope" must be full, train, oos, or recent.'
                })}
                error={comparisonScopeState.error}
            />
        )
    }

    const isLoading = dayListQuery.isLoading || (Boolean(selectedDate) && selectedDayQuery.isLoading)
    const isError = dayListQuery.isError || selectedDayQuery.isError
    const error = dayListQuery.error ?? selectedDayQuery.error

    return (
        <PageDataBoundary
            isLoading={isLoading}
            isError={isError}
            error={error}
            hasData={Array.isArray(dayListQuery.data)}
            onRetry={() => {
                void dayListQuery.refetch()
                void selectedDayQuery.refetch()
                void aggregationMetricsQuery.refetch()
                void confidenceRiskQuery.refetch()
            }}
            errorTitle={t('realForecastJournal.page.errorTitle', {
                defaultValue: 'Failed to load the real forecast journal'
            })}>
            <RealForecastJournalPageContent
                className={className}
                locale={locale}
                searchParams={searchParams}
                setSearchParams={setSearchParams}
                dayList={dayListQuery.data ?? []}
                selectedDate={selectedDate}
                selectedRecord={selectedDayQuery.data ?? null}
                comparisonSource={comparisonSourceState.value}
                comparisonScope={comparisonScopeState.value}
                aggregationMetricsQuery={aggregationMetricsQuery}
                confidenceRiskQuery={confidenceRiskQuery}
                bucketFilter={bucketFilter}
                onBucketFilterChange={setBucketFilter}
                slModeFilter={slModeFilter}
                onSlModeFilterChange={setSlModeFilter}
                branchFilter={branchFilter}
                onBranchFilterChange={setBranchFilter}
                marginFilter={marginFilter}
                onMarginFilterChange={setMarginFilter}
                policySearch={policySearch}
                onPolicySearchChange={setPolicySearch}
                indicatorGroup={indicatorGroup}
                onIndicatorGroupChange={setIndicatorGroup}
                isDetailedOpen={isDetailedOpen}
                onDetailedToggle={() => setIsDetailedOpen(current => !current)}
            />
        </PageDataBoundary>
    )
}

interface RealForecastJournalPageContentProps {
    className?: string
    locale: string
    searchParams: URLSearchParams
    setSearchParams: ReturnType<typeof useSearchParams>[1]
    dayList: RealForecastJournalDayListItemDto[]
    selectedDate: string | null
    selectedRecord: RealForecastJournalDayRecordDto | null
    comparisonSource: RealForecastJournalComparisonSource
    comparisonScope: CurrentPredictionTrainingScope
    aggregationMetricsQuery: ReturnType<typeof useAggregationMetricsQuery>
    confidenceRiskQuery: ReturnType<typeof useBacktestConfidenceRiskReportQuery>
    bucketFilter: RealForecastJournalPolicyBucket | 'total'
    onBucketFilterChange: (next: RealForecastJournalPolicyBucket | 'total') => void
    slModeFilter: 'all' | 'with-sl' | 'no-sl'
    onSlModeFilterChange: (next: 'all' | 'with-sl' | 'no-sl') => void
    branchFilter: RealForecastJournalBranchFilter
    onBranchFilterChange: (next: RealForecastJournalBranchFilter) => void
    marginFilter: 'all' | RealForecastJournalMarginMode
    onMarginFilterChange: (next: 'all' | RealForecastJournalMarginMode) => void
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
    dayList,
    selectedDate,
    selectedRecord,
    comparisonSource,
    comparisonScope,
    aggregationMetricsQuery,
    confidenceRiskQuery,
    bucketFilter,
    onBucketFilterChange,
    slModeFilter,
    onSlModeFilterChange,
    branchFilter,
    onBranchFilterChange,
    marginFilter,
    onMarginFilterChange,
    policySearch,
    onPolicySearchChange,
    indicatorGroup,
    onIndicatorGroupChange,
    isDetailedOpen,
    onDetailedToggle
}: RealForecastJournalPageContentProps) {
    const { t } = useTranslation('reports')
    const rootClassName = classNames(cls.root, {}, [className ?? ''])
    const selectedDay = useMemo(
        () => dayList.find(item => item.predictionDateUtc === selectedDate) ?? null,
        [dayList, selectedDate]
    )
    const policyRows = useMemo(() => (selectedRecord ? buildCombinedPolicyRows(selectedRecord) : []), [selectedRecord])
    const branchOptions = useMemo(() => buildPolicyBranchOptions(policyRows), [policyRows])
    const filteredPolicyRows = useMemo(
        () =>
            filterCombinedPolicyRows(policyRows, {
                bucket: bucketFilter,
                slMode: slModeFilter,
                branch: branchFilter,
                marginMode: marginFilter,
                policySearch
            }),
        [branchFilter, bucketFilter, marginFilter, policyRows, policySearch, slModeFilter]
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
            buildPredictionPolicyBucketControlGroup({
                value: bucketFilter,
                onChange: onBucketFilterChange,
                label: t('realForecastJournal.policy.controls.bucket', { defaultValue: 'Published bucket' }),
                ariaLabel: t('realForecastJournal.policy.controls.bucketAria', {
                    defaultValue: 'Bucket filter for the published policy rows'
                })
            }),
            buildMegaSlModeControlGroup({ value: slModeFilter, onChange: onSlModeFilterChange }),
            buildZonalControlGroup(t),
            buildMarginControlGroup(marginFilter, onMarginFilterChange, t)
        ]

        if (branchOptions.length > 0) {
            groups.push(buildBranchControlGroup(branchOptions, branchFilter, onBranchFilterChange, t))
        }

        return groups
    }, [
        branchFilter,
        branchOptions,
        bucketFilter,
        marginFilter,
        onBranchFilterChange,
        onBucketFilterChange,
        onMarginFilterChange,
        onSlModeFilterChange,
        slModeFilter,
        t
    ])

    const indicatorControlGroups = useMemo(
        () => [buildIndicatorGroupControlGroup(indicatorGroupOptions, indicatorGroup, onIndicatorGroupChange, t)],
        [indicatorGroup, indicatorGroupOptions, onIndicatorGroupChange, t]
    )
    const comparisonControlGroups = useMemo(
        () => [
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
                label: t('realForecastJournal.comparison.controls.scopeLabel', { defaultValue: 'Historical scope' })
            })
        ],
        [comparisonScope, comparisonSource, searchParams, setSearchParams, t]
    )

    if (dayList.length === 0) {
        return (
            <div className={rootClassName}>
                <header className={cls.hero}>
                    <div className={cls.heroMain}>
                        <Text type='h1' className={cls.heroTitle}>
                            {t('realForecastJournal.page.title', { defaultValue: 'Real Forecast Journal' })}
                        </Text>
                        <Text className={cls.heroSubtitle}>
                            {t('realForecastJournal.page.empty', {
                                defaultValue:
                                    'This page will start filling once the first immutable morning forecast is captured.'
                            })}
                        </Text>
                    </div>
                </header>
            </div>
        )
    }

    if (!selectedDay || !selectedRecord) {
        return (
            <PageError
                title={t('realForecastJournal.errors.selectedDay.title', {
                    defaultValue: 'Selected journal day is unavailable'
                })}
                message={t('realForecastJournal.errors.selectedDay.message', {
                    defaultValue:
                        'The selected date is missing from the journal index or the day payload is not loaded.'
                })}
            />
        )
    }

    const isFinalized = selectedDay.status === 'finalized'
    const policyColumns = buildPolicyTableColumns(t)
    const policyRowsTable = buildPolicyTableRows(filteredPolicyRows, locale, t, isFinalized)
    const indicatorRows = buildIndicatorTableRows(selectedRecord, indicatorGroup, t)

    return (
        <div className={rootClassName}>
            <header className={cls.hero}>
                <div className={cls.heroMain}>
                    <Text type='h1' className={cls.heroTitle}>
                        {t('realForecastJournal.page.title', { defaultValue: 'Real Forecast Journal' })}
                    </Text>
                    <Text className={cls.heroSubtitle}>
                        {t('realForecastJournal.page.subtitle', {
                            defaultValue:
                                'This page stores the morning forecast exactly as it was published for the New York trading day and compares it with the later realized outcome after the market session closes.'
                        })}
                    </Text>
                    <div className={cls.heroNotes}>
                        <SectionNote
                            title={t('realForecastJournal.page.notes.causalityTitle', {
                                defaultValue: 'Why this page exists'
                            })}
                            body={t('realForecastJournal.page.notes.causalityBody', {
                                defaultValue:
                                    'Session-open forecast fields are immutable. They were captured before the day unfolded, so the page shows what the model really published without access to the future.'
                            })}
                        />
                        <SectionNote
                            title={t('realForecastJournal.page.notes.scheduleTitle', {
                                defaultValue: 'Timing contract'
                            })}
                            body={t('realForecastJournal.page.notes.scheduleBody', {
                                defaultValue:
                                    'Capture uses the regular session of the New York Stock Exchange: 09:30 America/New_York. In UTC this is 14:30 during EST and 13:30 during EDT / DST. Fact fields stay empty until after the NY close and after candle and indicator sync completes.'
                            })}
                        />
                    </div>
                </div>
            </header>

            <section className={cls.dayStripSection}>
                <div className={cls.sectionHeader}>
                    <Text type='h2' className={cls.sectionTitle}>
                        {t('realForecastJournal.days.title', { defaultValue: 'Captured trading days' })}
                    </Text>
                    <Text className={cls.sectionSubtitle}>
                        {t('realForecastJournal.days.subtitle', {
                            defaultValue:
                                'Newest day is selected by default. Session-open records keep factual fields empty until the journal finalizer runs after the NY close.'
                        })}
                    </Text>
                </div>
                <div className={cls.dayStrip}>
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
                                <span className={cls.dayStatus}>{day.status.toUpperCase()}</span>
                                <span className={cls.dayDirection}>{day.predLabelDisplay}</span>
                            </button>
                        )
                    })}
                </div>
            </section>

            <section className={cls.summarySection}>
                <div className={cls.sectionHeader}>
                    <Text type='h2' className={cls.sectionTitle}>
                        {t('realForecastJournal.summary.title', { defaultValue: 'Causal day summary' })}
                    </Text>
                    <Text className={cls.sectionSubtitle}>{resolveStatusText(selectedDay, t)}</Text>
                </div>
                <div className={cls.summaryGrid}>
                    <DaySummaryCard
                        label={t('realForecastJournal.summary.cards.forecast', { defaultValue: 'Morning forecast' })}
                        value={selectedDay.predLabelDisplay}
                        hint={`${formatPercent(selectedDay.totalUpProbability, locale)} / ${formatPercent(selectedDay.totalFlatProbability, locale)} / ${formatPercent(selectedDay.totalDownProbability, locale)}`}
                    />
                    <DaySummaryCard
                        label={t('realForecastJournal.summary.cards.actual', { defaultValue: 'Realized direction' })}
                        value={
                            selectedDay.actualDirection ??
                            t('realForecastJournal.placeholders.pendingFinalize', {
                                defaultValue: 'Pending NY close and indicator sync'
                            })
                        }
                        hint={
                            isFinalized ?
                                formatUtc(selectedDay.finalizedAtUtc ?? selectedDay.exitUtc, locale)
                            :   undefined
                        }
                    />
                    <DaySummaryCard
                        label={t('realForecastJournal.summary.cards.match', { defaultValue: 'Forecast vs reality' })}
                        value={
                            selectedDay.directionMatched === null ?
                                t('realForecastJournal.placeholders.pendingFinalize', {
                                    defaultValue: 'Pending NY close and indicator sync'
                                })
                            : selectedDay.directionMatched ?
                                t('realForecastJournal.summary.match.yes', { defaultValue: 'Matched' })
                            :   t('realForecastJournal.summary.match.no', { defaultValue: 'Did not match' })
                        }
                    />
                    <DaySummaryCard
                        label={t('realForecastJournal.summary.cards.capture', {
                            defaultValue: 'Capture timestamp (UTC)'
                        })}
                        value={formatUtc(selectedDay.capturedAtUtc, locale)}
                        hint={`${formatUtc(selectedDay.entryUtc, locale)} → ${formatUtc(selectedDay.exitUtc, locale)}`}
                    />
                    <DaySummaryCard
                        label={t('realForecastJournal.summary.cards.entry', { defaultValue: 'Reference entry price' })}
                        value={formatPrice(selectedRecord.forecastSnapshot.entry, locale)}
                    />
                    <DaySummaryCard
                        label={t('realForecastJournal.summary.cards.actualClose', {
                            defaultValue: 'Actual close price'
                        })}
                        value={
                            selectedRecord.finalize?.snapshot.actualDay ?
                                formatPrice(selectedRecord.finalize.snapshot.actualDay.close24, locale)
                            :   t('realForecastJournal.placeholders.pendingFinalize', {
                                    defaultValue: 'Pending NY close and indicator sync'
                                })
                        }
                    />
                </div>
                <div className={cls.metaPanel}>
                    <div className={cls.metaPanelItem}>
                        <Text className={cls.metaLabel}>
                            {t('realForecastJournal.summary.reasonLabel', { defaultValue: 'Morning model comment' })}
                        </Text>
                        <Text className={cls.metaValue}>{selectedRecord.forecastSnapshot.reason}</Text>
                    </div>
                    {selectedRecord.forecastSnapshot.previewNote && (
                        <div className={cls.metaPanelItem}>
                            <Text className={cls.metaLabel}>
                                {t('realForecastJournal.summary.previewLabel', { defaultValue: 'Preview note' })}
                            </Text>
                            <Text className={cls.metaValue}>{selectedRecord.forecastSnapshot.previewNote}</Text>
                        </div>
                    )}
                </div>
            </section>

            <section className={cls.policySection}>
                <div className={cls.sectionHeader}>
                    <Text type='h2' className={cls.sectionTitle}>
                        {t('realForecastJournal.policy.title', { defaultValue: 'Policy plan and realized execution' })}
                    </Text>
                    <Text className={cls.sectionSubtitle}>
                        {t('realForecastJournal.policy.subtitle', {
                            defaultValue:
                                'Morning fields come from the immutable forecast snapshot. Realized exit fields appear only after the day is finalized. Null values stay explicit instead of being turned into zero.'
                        })}
                    </Text>
                </div>
                <div className={cls.filtersRow}>
                    <ReportViewControls groups={policyControlGroups} className={cls.controls} />
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
                <ReportTableCard
                    title={t('realForecastJournal.policy.table.title', { defaultValue: 'Published policy rows' })}
                    description={t('realForecastJournal.policy.table.description', {
                        defaultValue:
                            'Default filters open the daily / with-SL / zonal slice. Switch to ALL to inspect every published bucket and policy row together.'
                    })}
                    columns={policyColumns}
                    rows={policyRowsTable}
                    domId='real-forecast-policy-table'
                />
                {filteredPolicyRows.length === 0 && (
                    <Text className={cls.emptyState}>
                        {t('realForecastJournal.policy.empty', {
                            defaultValue: 'No policy rows match the current bucket / SL / branch / margin filters.'
                        })}
                    </Text>
                )}
            </section>

            <section className={cls.detailSection}>
                <div className={cls.sectionHeader}>
                    <Text type='h2' className={cls.sectionTitle}>
                        {t('realForecastJournal.indicators.title', {
                            defaultValue: 'Morning vs close indicator snapshots'
                        })}
                    </Text>
                    <Text className={cls.sectionSubtitle}>
                        {t('realForecastJournal.indicators.subtitle', {
                            defaultValue:
                                'Open the detailed block to inspect the exact indicator values that were visible in the morning and the later end-of-day state after the session finished.'
                        })}
                    </Text>
                </div>
                <Btn className={cls.detailToggle} onClick={onDetailedToggle}>
                    {isDetailedOpen ?
                        t('realForecastJournal.indicators.hide', { defaultValue: 'Hide detailed indicator block' })
                    :   t('realForecastJournal.indicators.show', { defaultValue: 'Show detailed indicator block' })}
                </Btn>
                {isDetailedOpen && (
                    <div className={cls.indicatorBlock}>
                        <ReportViewControls groups={indicatorControlGroups} className={cls.controls} />
                        <ReportTableCard
                            title={t('realForecastJournal.indicators.table.title', {
                                defaultValue: 'Indicator value diff'
                            })}
                            description={t('realForecastJournal.indicators.table.description', {
                                defaultValue:
                                    'Morning value is the causal snapshot. Close value and delta appear only after finalization.'
                            })}
                            columns={[
                                t('realForecastJournal.indicators.table.columns.group', { defaultValue: 'Group' }),
                                t('realForecastJournal.indicators.table.columns.indicator', {
                                    defaultValue: 'Indicator'
                                }),
                                t('realForecastJournal.indicators.table.columns.morning', { defaultValue: 'Morning' }),
                                t('realForecastJournal.indicators.table.columns.close', { defaultValue: 'Close' }),
                                t('realForecastJournal.indicators.table.columns.delta', { defaultValue: 'Delta' })
                            ]}
                            rows={indicatorRows}
                            domId='real-forecast-indicator-table'
                        />
                    </div>
                )}
            </section>

            <RealForecastJournalComparisonSection
                locale={locale}
                t={t}
                searchParams={searchParams}
                setSearchParams={setSearchParams}
                dayList={dayList}
                comparisonSource={comparisonSource}
                comparisonScope={comparisonScope}
                aggregationMetricsQuery={aggregationMetricsQuery}
                confidenceRiskQuery={confidenceRiskQuery}
                comparisonControlGroups={comparisonControlGroups}
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
    aggregationMetricsQuery: ReturnType<typeof useAggregationMetricsQuery>
    confidenceRiskQuery: ReturnType<typeof useBacktestConfidenceRiskReportQuery>
    comparisonControlGroups: ReportViewControlGroup[]
}

function RealForecastJournalComparisonSection({
    locale,
    t,
    dayList,
    comparisonSource,
    comparisonScope,
    aggregationMetricsQuery,
    confidenceRiskQuery,
    comparisonControlGroups
}: RealForecastJournalComparisonSectionProps) {
    const comparisonState = useMemo(() => {
        try {
            if (comparisonSource === 'aggregation') {
                if (aggregationMetricsQuery.error) throw aggregationMetricsQuery.error
                if (!aggregationMetricsQuery.data) {
                    return {
                        aggregation: null as ReturnType<typeof buildAggregationComparisonOrThrow> | null,
                        confidenceRisk: null as ReturnType<typeof buildConfidenceRiskComparisonOrThrow> | null,
                        error: null as Error | null,
                        isLoading: aggregationMetricsQuery.isLoading
                    }
                }

                return {
                    aggregation: buildAggregationComparisonOrThrow(
                        dayList,
                        aggregationMetricsQuery.data,
                        comparisonScope
                    ),
                    confidenceRisk: null,
                    error: null,
                    isLoading: false
                }
            }

            if (confidenceRiskQuery.error) throw confidenceRiskQuery.error
            if (!confidenceRiskQuery.data) {
                return {
                    aggregation: null,
                    confidenceRisk: null as ReturnType<typeof buildConfidenceRiskComparisonOrThrow> | null,
                    error: null as Error | null,
                    isLoading: confidenceRiskQuery.isLoading
                }
            }

            return {
                aggregation: null,
                confidenceRisk: buildConfidenceRiskComparisonOrThrow(
                    dayList,
                    confidenceRiskQuery.data,
                    comparisonScope
                ),
                error: null,
                isLoading: false
            }
        } catch (error) {
            return {
                aggregation: null,
                confidenceRisk: null,
                error: error instanceof Error ? error : new Error(String(error)),
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
            <ReportViewControls groups={comparisonControlGroups} className={cls.controls} />
            {comparisonState.isLoading && (
                <Text className={cls.loadingText}>
                    {t('realForecastJournal.comparison.loading', { defaultValue: 'Loading benchmark comparison...' })}
                </Text>
            )}
            {!comparisonState.isLoading && comparisonState.error && (
                <div className={cls.sectionError}>
                    <Text type='h3'>
                        {t('realForecastJournal.comparison.errorTitle', {
                            defaultValue: 'Comparison block is unavailable'
                        })}
                    </Text>
                    <Text>{comparisonState.error.message}</Text>
                </div>
            )}
            {!comparisonState.isLoading &&
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
                        <ReportTableCard
                            title={t('realForecastJournal.comparison.aggregation.tableTitle', {
                                defaultValue: 'Aggregation benchmark comparison'
                            })}
                            description={comparisonState.aggregation.benchmark.label}
                            columns={[
                                t('realForecastJournal.comparison.columns.metric', { defaultValue: 'Metric' }),
                                t('realForecastJournal.comparison.columns.live', { defaultValue: 'Live journal' }),
                                t('realForecastJournal.comparison.columns.history', {
                                    defaultValue: 'Selected history'
                                }),
                                t('realForecastJournal.comparison.columns.delta', { defaultValue: 'Delta' })
                            ]}
                            rows={buildAggregationComparisonTable(comparisonState.aggregation, locale, t)}
                            domId='real-forecast-aggregation-comparison'
                        />
                    </div>
                )}
            {!comparisonState.isLoading &&
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
                                        `${comparisonState.confidenceRisk.outOfRangeDays} ${t('realForecastJournal.comparison.outOfRangeSome', { defaultValue: 'live day(s) fell outside the selected historical confidence buckets.' })}`
                                    :   t('realForecastJournal.comparison.outOfRangeNone', {
                                            defaultValue:
                                                'Every finalized live day mapped into the selected historical confidence buckets.'
                                        })
                                }
                            />
                        </div>
                        <ReportTableCard
                            title={t('realForecastJournal.comparison.confidenceRisk.summaryTitle', {
                                defaultValue: 'Confidence-risk summary'
                            })}
                            description={t('realForecastJournal.comparison.confidenceRisk.summaryDescription', {
                                defaultValue:
                                    'Weighted benchmark uses the same confidence buckets that the live journal days fell into.'
                            })}
                            columns={[
                                t('realForecastJournal.comparison.columns.metric', { defaultValue: 'Metric' }),
                                t('realForecastJournal.comparison.columns.live', { defaultValue: 'Live journal' }),
                                t('realForecastJournal.comparison.columns.history', {
                                    defaultValue: 'Weighted history'
                                }),
                                t('realForecastJournal.comparison.columns.delta', { defaultValue: 'Delta' })
                            ]}
                            rows={buildConfidenceRiskSummaryTable(comparisonState.confidenceRisk, locale, t)}
                            domId='real-forecast-confidence-risk-summary'
                        />
                        <ReportTableCard
                            title={t('realForecastJournal.comparison.confidenceRisk.bucketTitle', {
                                defaultValue: 'Bucket-by-bucket comparison'
                            })}
                            description={t('realForecastJournal.comparison.confidenceRisk.bucketDescription', {
                                defaultValue:
                                    'Only finalized live days are counted. Each row compares live win rate with the historical win rate of the same confidence bucket.'
                            })}
                            columns={[
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
                            ]}
                            rows={buildConfidenceRiskBucketTable(comparisonState.confidenceRisk, locale)}
                            domId='real-forecast-confidence-risk-buckets'
                        />
                    </div>
                )}
        </section>
    )
}

export default function RealForecastJournalPage(props: RealForecastJournalPageProps) {
    const { t } = useTranslation('reports')

    return (
        <PageSuspense
            title={t('realForecastJournal.page.loadingTitle', { defaultValue: 'Loading real forecast journal' })}>
            <RealForecastJournalPageInner {...props} />
        </PageSuspense>
    )
}
