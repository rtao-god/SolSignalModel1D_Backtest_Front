import { useCallback, useEffect, useMemo, useState } from 'react'
import { skipToken } from '@reduxjs/toolkit/query'
import { useSelector } from 'react-redux'
import classNames from '@/shared/lib/helpers/classNames'
import {
    buildCurrentPredictionHistoryTrainingScopeDescription,
    buildPredictionHistoryWindowControlGroup,
    buildPredictionPolicyBucketControlGroup,
    buildTrainingScopeControlGroup,
    Icon,
    ReportViewControls,
    ReportTableCard,
    Text,
    resolveCurrentPredictionTrainingScopeMeta
} from '@/shared/ui'
import { useGetCurrentPredictionByDateQuery } from '@/shared/api/api'
import { selectArrivalDate, selectDepartureDate } from '@/entities/date'
import cls from './PredictionHistoryPage.module.scss'
import DatePicker from '@/features/datePicker/ui/DatePicker/DatePicker'
import { resolveAppError } from '@/shared/lib/errors/resolveAppError'
import { ReportDocumentView } from '@/shared/ui/ReportDocumentView/ui/ReportDocumentView'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import {
    DEFAULT_BACKFILLED_HISTORY_SCOPE,
    useCurrentPredictionBackfilledSplitStats,
    useCurrentPredictionIndexQuery
} from '@/shared/api/tanstackQueries/currentPrediction'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import PageSuspense from '@/shared/ui/loaders/PageSuspense/ui/PageSuspense'
import type { CurrentPredictionSet, CurrentPredictionTrainingScope } from '@/shared/api/endpoints/reportEndpoints'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { resolveTrainingLabel } from '@/shared/utils/reportTraining'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { resolveReportColumnTooltip } from '@/shared/utils/reportTooltips'
import { parseDateKey } from '@/shared/consts/date'
import { type PolicyBranchMegaBucketMode } from '@/shared/utils/policyBranchMegaTabs'
import {
    CURRENT_PREDICTION_POLICY_COLUMN_KEYS,
    type CurrentPredictionPolicyColumnKey
} from '@/shared/utils/reportCanonicalKeys'
import type { ReportDocumentDto, ReportSectionDto, TableSectionDto } from '@/shared/types/report.types'
import type { TableRow } from '@/shared/ui/SortableTable'
import { tryParseNumberFromString } from '@/shared/ui/SortableTable'
import { useLocale } from '@/shared/lib/i18n'
import type { PredictionHistoryPageProps } from './types'
import { useTranslation } from 'react-i18next'
import { SectionDataState } from '@/shared/ui/errors/SectionDataState'
import { renderTermTooltipRichText } from '@/shared/ui/TermTooltip'
import { PredictionPageIntro } from '@/pages/predictions/ui/shared/PredictionPageIntro/PredictionPageIntro'
import { readPredictionPageStringList } from '@/pages/predictions/ui/shared/predictionPageI18n'
const PAGE_SIZE = 10
const IN_PAGE_SCROLL_STEP = Math.max(1, Math.floor(PAGE_SIZE / 2))
const HISTORY_SET: CurrentPredictionSet = 'backfilled'
type PredictionHistoryWindow = '365' | '730' | 'all'

interface HistoryWindowOptionDef {
    value: PredictionHistoryWindow
    labelKey: string
    defaultLabel: string
}

const HISTORY_WINDOW_OPTION_DEFS: readonly HistoryWindowOptionDef[] = [
    { value: '365', labelKey: 'predictionHistory.filters.window.oneYear', defaultLabel: 'Last 1 year' },
    { value: '730', labelKey: 'predictionHistory.filters.window.twoYears', defaultLabel: 'Last 2 years' },
    { value: 'all', labelKey: 'predictionHistory.filters.window.allTime', defaultLabel: 'All time' }
]
type PredictionHistoryIndex = NonNullable<ReturnType<typeof useCurrentPredictionIndexQuery>['data']>
interface PredictionHistoryPageInnerProps {
    className?: string
    index: PredictionHistoryIndex | null
    allIndex: PredictionHistoryIndex | null
    isAllIndexLoading: boolean
    allIndexErrorMessage: string | null
    isIndexLoading: boolean
    indexError: unknown
    onIndexRetry: () => void
    trainingScope: CurrentPredictionTrainingScope
    onTrainingScopeChange: (scope: CurrentPredictionTrainingScope) => void
    historyWindow: PredictionHistoryWindow
    onHistoryWindowChange: (window: PredictionHistoryWindow) => void
}

type ReportTableSectionView = TableSectionDto & { columns: string[]; columnKeys: string[]; rows: string[][] }
type ReportKeyValueSectionView = ReportSectionDto & { items: Array<{ itemKey?: string; key: string; value: string }> }

interface PolicyTradeRow {
    policyName: string
    branch: string
    bucket: PolicyBranchMegaBucketMode
    side: 'LONG' | 'SHORT'
    entryPrice: number
    exitPrice: number
    exitReason: string
    tpPrice: number
    tpPct: number
    slPrice: number
    slPct: number
    liqPrice: number | null
    notionalUsd: number
    bucketCapitalUsd: number
    stakeUsd: number
    stakePct: number
}

interface PolicySkippedSignalRow {
    policyName: string
    branch: string
    bucket: PolicyBranchMegaBucketMode
    side: 'LONG' | 'SHORT'
    leverage: number
    skipReason: string
}

interface ParsedPolicyTradeRows {
    executedTrades: PolicyTradeRow[]
    skippedDirectionalSignals: PolicySkippedSignalRow[]
}

const POLICY_TABLE_SECTION_KEY = 'leverage_policies'
const POLICY_TABLE_REQUIRED_COLUMNS: readonly CurrentPredictionPolicyColumnKey[] = [
    CURRENT_PREDICTION_POLICY_COLUMN_KEYS.policy,
    CURRENT_PREDICTION_POLICY_COLUMN_KEYS.branch,
    CURRENT_PREDICTION_POLICY_COLUMN_KEYS.direction,
    CURRENT_PREDICTION_POLICY_COLUMN_KEYS.entryPrice,
    CURRENT_PREDICTION_POLICY_COLUMN_KEYS.exitPrice,
    CURRENT_PREDICTION_POLICY_COLUMN_KEYS.exitReason,
    CURRENT_PREDICTION_POLICY_COLUMN_KEYS.tpPrice,
    CURRENT_PREDICTION_POLICY_COLUMN_KEYS.slPrice,
    CURRENT_PREDICTION_POLICY_COLUMN_KEYS.liqPrice,
    CURRENT_PREDICTION_POLICY_COLUMN_KEYS.notionalUsd,
    CURRENT_PREDICTION_POLICY_COLUMN_KEYS.bucketCapitalUsd,
    CURRENT_PREDICTION_POLICY_COLUMN_KEYS.stakeUsd,
    CURRENT_PREDICTION_POLICY_COLUMN_KEYS.stakePct
]

function isTableSection(section: ReportSectionDto): section is ReportTableSectionView {
    const candidate = section as { columns?: unknown; columnKeys?: unknown; rows?: unknown }
    return Array.isArray(candidate.columns) && Array.isArray(candidate.columnKeys) && Array.isArray(candidate.rows)
}

function isKeyValueSection(section: ReportSectionDto): section is ReportKeyValueSectionView {
    const candidate = section as { items?: unknown; columns?: unknown }
    return Array.isArray(candidate.items) && !Array.isArray(candidate.columns)
}

function findCanonicalColumnIndex(
    table: ReportTableSectionView,
    key: CurrentPredictionPolicyColumnKey,
    label: string
): number {
    const idx = table.columnKeys.findIndex(columnKey => columnKey === key)
    if (idx < 0) {
        throw new Error(`[ui] Required column is missing in policy table. column=${label}.`)
    }
    return idx
}

function parseNumber(raw: unknown, label: string): number {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
        return raw
    }

    if (typeof raw === 'string') {
        const parsed = tryParseNumberFromString(raw)
        if (parsed !== null && Number.isFinite(parsed)) {
            return parsed
        }
    }

    throw new Error(`[ui] Missing or invalid numeric value. field=${label}, value=${String(raw)}.`)
}

function parseOptionalNumber(raw: unknown): number | null {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
        return raw
    }

    if (typeof raw !== 'string') {
        return null
    }

    const normalized = raw.trim().toLowerCase()
    if (
        normalized.length === 0 ||
        normalized === '-' ||
        normalized === 'n/a' ||
        normalized === 'na' ||
        normalized.startsWith('no')
    ) {
        return null
    }

    const parsed = tryParseNumberFromString(raw)
    if (parsed === null || !Number.isFinite(parsed)) {
        return null
    }

    return parsed
}

function parseBooleanText(raw: unknown, label: string): boolean {
    if (typeof raw !== 'string') {
        throw new Error(`[ui] Missing or invalid boolean-like text. field=${label}.`)
    }

    const normalized = raw.trim().toLowerCase()
    if (normalized === 'true' || normalized === 'yes') {
        return true
    }
    if (normalized === 'false' || normalized === 'no') {
        return false
    }

    throw new Error(`[ui] Unsupported boolean-like text. field=${label}, value=${raw}.`)
}

function formatPrice(value: number, locale: string): string {
    if (!Number.isFinite(value)) {
        throw new Error(`[ui] Invalid price value for formatting: ${value}.`)
    }
    return value.toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4
    })
}

function formatMoney(value: number, locale: string): string {
    if (!Number.isFinite(value)) {
        throw new Error(`[ui] Invalid money value for formatting: ${value}.`)
    }
    return value.toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })
}

function formatPercent(value: number, locale: string): string {
    if (!Number.isFinite(value)) {
        throw new Error(`[ui] Invalid percent value for formatting: ${value}.`)
    }
    return value.toLocaleString(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })
}

function parsePolicyBucketMode(raw: unknown, label: string): PolicyBranchMegaBucketMode {
    if (typeof raw !== 'string') {
        throw new Error(`[ui] Missing or invalid bucket value. field=${label}.`)
    }

    const normalized = raw.trim()
    if (normalized.length === 0) {
        throw new Error(`[ui] Bucket value is empty. field=${label}.`)
    }

    const lower = normalized.toLowerCase()
    if (lower === 'daily') return 'daily'
    if (lower === 'intraday') return 'intraday'
    if (lower === 'delayed') return 'delayed'
    if (lower === 'total') return 'total'

    throw new Error(`[ui] Unsupported bucket value. field=${label}, value=${raw}.`)
}

function resolvePolicyTableSections(report: ReportDocumentDto): ReportTableSectionView[] {
    const tables = report.sections.filter(
        (section): section is ReportTableSectionView =>
            isTableSection(section) &&
            section.sectionKey === POLICY_TABLE_SECTION_KEY &&
            section.columnKeys.some(columnKey => columnKey === CURRENT_PREDICTION_POLICY_COLUMN_KEYS.policy) &&
            section.columnKeys.some(columnKey => columnKey === CURRENT_PREDICTION_POLICY_COLUMN_KEYS.entryPrice)
    )

    if (tables.length === 0) {
        throw new Error(
            `[ui] Policy table section is missing in report. expectedSectionKey=${POLICY_TABLE_SECTION_KEY}.`
        )
    }

    const strictTables = tables.filter(table => {
        const normalized = new Set(table.columnKeys)
        return POLICY_TABLE_REQUIRED_COLUMNS.every(required => normalized.has(required))
    })

    if (strictTables.length === 0) {
        const bestCandidate = tables[0]
        const normalized = new Set(bestCandidate.columnKeys)
        const missingColumns = POLICY_TABLE_REQUIRED_COLUMNS.filter(required => !normalized.has(required))
        throw new Error(`[ui] Policy table schema is outdated. Missing required columns: ${missingColumns.join(', ')}.`)
    }

    return strictTables
}

function parsePolicyTradeRows(report: ReportDocumentDto): ParsedPolicyTradeRows {
    const tables = resolvePolicyTableSections(report)

    const executedTrades: PolicyTradeRow[] = []
    const skippedDirectionalSignals: PolicySkippedSignalRow[] = []

    for (const table of tables) {
        const bucketIdx = findCanonicalColumnIndex(table, CURRENT_PREDICTION_POLICY_COLUMN_KEYS.bucket, 'Bucket')

        const policyIdx = findCanonicalColumnIndex(table, CURRENT_PREDICTION_POLICY_COLUMN_KEYS.policy, 'Policy')
        const branchIdx = findCanonicalColumnIndex(table, CURRENT_PREDICTION_POLICY_COLUMN_KEYS.branch, 'Branch')
        const hasDirectionIdx = findCanonicalColumnIndex(
            table,
            CURRENT_PREDICTION_POLICY_COLUMN_KEYS.hasDirection,
            'HasDirection'
        )
        const skippedIdx = findCanonicalColumnIndex(table, CURRENT_PREDICTION_POLICY_COLUMN_KEYS.skipped, 'Skipped')
        const directionIdx = findCanonicalColumnIndex(
            table,
            CURRENT_PREDICTION_POLICY_COLUMN_KEYS.direction,
            'Direction'
        )
        const leverageIdx = findCanonicalColumnIndex(table, CURRENT_PREDICTION_POLICY_COLUMN_KEYS.leverage, 'Leverage')
        const entryIdx = findCanonicalColumnIndex(table, CURRENT_PREDICTION_POLICY_COLUMN_KEYS.entryPrice, 'EntryPrice')
        const slPctIdx = findCanonicalColumnIndex(table, CURRENT_PREDICTION_POLICY_COLUMN_KEYS.slPct, 'SlPct')
        const tpPctIdx = findCanonicalColumnIndex(table, CURRENT_PREDICTION_POLICY_COLUMN_KEYS.tpPct, 'TpPct')
        const slPriceIdx = findCanonicalColumnIndex(table, CURRENT_PREDICTION_POLICY_COLUMN_KEYS.slPrice, 'SlPrice')
        const tpPriceIdx = findCanonicalColumnIndex(table, CURRENT_PREDICTION_POLICY_COLUMN_KEYS.tpPrice, 'TpPrice')
        const notionalUsdIdx = findCanonicalColumnIndex(
            table,
            CURRENT_PREDICTION_POLICY_COLUMN_KEYS.notionalUsd,
            'NotionalUsd'
        )
        const liqPriceIdx = findCanonicalColumnIndex(
            table,
            CURRENT_PREDICTION_POLICY_COLUMN_KEYS.liqPrice,
            'LiquidationPrice'
        )
        const exitPriceIdx = findCanonicalColumnIndex(
            table,
            CURRENT_PREDICTION_POLICY_COLUMN_KEYS.exitPrice,
            'ExitPrice'
        )
        const exitReasonIdx = findCanonicalColumnIndex(
            table,
            CURRENT_PREDICTION_POLICY_COLUMN_KEYS.exitReason,
            'ExitReason'
        )
        const bucketCapitalUsdIdx = findCanonicalColumnIndex(
            table,
            CURRENT_PREDICTION_POLICY_COLUMN_KEYS.bucketCapitalUsd,
            'BucketCapitalUsd'
        )
        const stakeUsdIdx = findCanonicalColumnIndex(table, CURRENT_PREDICTION_POLICY_COLUMN_KEYS.stakeUsd, 'StakeUsd')
        const stakePctIdx = findCanonicalColumnIndex(table, CURRENT_PREDICTION_POLICY_COLUMN_KEYS.stakePct, 'StakePct')

        for (const row of table.rows) {
            if (!Array.isArray(row)) {
                throw new Error('[ui] Invalid policy table row.')
            }

            const hasDirection = parseBooleanText(row[hasDirectionIdx], 'Есть направление')
            const skipped = parseBooleanText(row[skippedIdx], 'Пропущено')

            if (!hasDirection) {
                continue
            }

            const directionRaw = String(row[directionIdx] ?? '')
                .trim()
                .toUpperCase()
            if (directionRaw !== 'LONG' && directionRaw !== 'SHORT') {
                throw new Error(`[ui] Unsupported direction value: ${directionRaw}.`)
            }

            const policyName = String(row[policyIdx] ?? '')
            const branch = String(row[branchIdx] ?? '')
            if (!policyName || !branch) {
                throw new Error('[ui] Policy or branch value is empty in policy table row.')
            }

            const leverage = parseNumber(row[leverageIdx], 'Плечо')
            if (!(leverage > 0)) {
                throw new Error(`[ui] Leverage must be > 0. value=${leverage}.`)
            }

            const bucket = parsePolicyBucketMode(row[bucketIdx], 'Бакет')

            if (skipped) {
                const skipReason = String(row[exitReasonIdx] ?? '').trim()
                if (!skipReason) {
                    throw new Error('[ui] Skip reason is empty for directional row.')
                }

                skippedDirectionalSignals.push({
                    policyName,
                    branch,
                    bucket,
                    side: directionRaw,
                    leverage,
                    skipReason
                })
                continue
            }

            const entryPrice = parseNumber(row[entryIdx], 'Цена входа')
            const slPrice = parseNumber(row[slPriceIdx], 'Цена SL')
            const tpPrice = parseNumber(row[tpPriceIdx], 'Цена TP')
            const liqPrice = parseOptionalNumber(row[liqPriceIdx])
            const notionalUsd = parseNumber(row[notionalUsdIdx], 'Номинал позиции, $')

            if (!(entryPrice > 0 && slPrice > 0 && tpPrice > 0)) {
                throw new Error('[ui] Trade prices must be positive.')
            }
            if (!(notionalUsd > 0) || !Number.isFinite(notionalUsd)) {
                throw new Error(`[ui] Notional usd is invalid. value=${notionalUsd}.`)
            }

            const slPctFromEntry = parseNumber(row[slPctIdx], 'SL, %')
            const tpPctFromEntry = parseNumber(row[tpPctIdx], 'TP, %')
            const bucketCapitalUsd = parseNumber(row[bucketCapitalUsdIdx], 'Капитал бакета, $')
            const stakeUsd = parseNumber(row[stakeUsdIdx], 'Ставка, $')
            const stakePct = parseNumber(row[stakePctIdx], 'Ставка, %')
            const exitPrice = parseNumber(row[exitPriceIdx], 'Цена выхода')
            const exitReason = String(row[exitReasonIdx] ?? '').trim()

            if (!(bucketCapitalUsd > 0) || !Number.isFinite(bucketCapitalUsd)) {
                throw new Error(`[ui] Bucket capital is invalid. value=${bucketCapitalUsd}.`)
            }
            if (!(stakeUsd > 0) || !Number.isFinite(stakeUsd)) {
                throw new Error(`[ui] Stake usd is invalid. value=${stakeUsd}.`)
            }
            if (!(stakePct >= 0) || !Number.isFinite(stakePct)) {
                throw new Error(`[ui] Stake pct is invalid. value=${stakePct}.`)
            }
            if (!(exitPrice > 0) || !Number.isFinite(exitPrice)) {
                throw new Error(`[ui] Exit price is invalid. value=${exitPrice}.`)
            }
            if (exitReason.length === 0) {
                throw new Error('[ui] Exit reason is empty.')
            }

            executedTrades.push({
                policyName,
                branch,
                bucket,
                side: directionRaw,
                entryPrice,
                exitPrice,
                exitReason,
                tpPrice,
                tpPct: tpPctFromEntry,
                slPrice,
                slPct: slPctFromEntry,
                liqPrice,
                notionalUsd,
                bucketCapitalUsd,
                stakeUsd,
                stakePct
            })
        }
    }

    return {
        executedTrades,
        skippedDirectionalSignals
    }
}

function isPredictionHistoryWindow(value: string): value is PredictionHistoryWindow {
    return value === '365' || value === '730' || value === 'all'
}

function resolveHistoryWindowDays(window: PredictionHistoryWindow): number | undefined {
    if (window === 'all') {
        return undefined
    }

    const parsed = Number.parseInt(window, 10)
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`[ui] Unsupported history window value: ${window}.`)
    }

    return parsed
}

function collectUniqueDatesDesc(index: PredictionHistoryIndex | null): string[] {
    if (!index || index.length === 0) {
        return []
    }

    const dateSet = new Set<string>()
    for (const item of index) {
        dateSet.add(item.predictionDateUtc)
    }

    const dates = Array.from(dateSet)
    dates.sort((a, b) =>
        a < b ? 1
        : a > b ? -1
        : 0
    )
    return dates
}

interface HistoryMissingStats {
    missingWeekdays: number
    expectedWeekdays: number
    fromDateUtc: string
    toDateUtc: string
}

function resolveHistoryMissingStats(allDatesDesc: string[]): HistoryMissingStats | null {
    if (allDatesDesc.length === 0) {
        return null
    }

    const newest = allDatesDesc[0]
    const oldest = allDatesDesc[allDatesDesc.length - 1]
    const fromUtc = parseIsoDateUtc(oldest)
    const toUtc = parseIsoDateUtc(newest)

    let expectedWeekdays = 0
    for (let day = fromUtc; day.getTime() <= toUtc.getTime(); day = addUtcDays(day, 1)) {
        const weekDay = day.getUTCDay()
        if (weekDay >= 1 && weekDay <= 5) {
            expectedWeekdays += 1
        }
    }

    const missingWeekdays = Math.max(0, expectedWeekdays - allDatesDesc.length)
    return {
        missingWeekdays,
        expectedWeekdays,
        fromDateUtc: oldest,
        toDateUtc: newest
    }
}

function parseIsoDateUtc(value: string): Date {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw new Error(`[ui] Invalid ISO date in prediction index: ${value}.`)
    }

    const [yearRaw, monthRaw, dayRaw] = value.split('-')
    const year = Number.parseInt(yearRaw, 10)
    const month = Number.parseInt(monthRaw, 10)
    const day = Number.parseInt(dayRaw, 10)
    if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) {
        throw new Error(`[ui] Invalid numeric date parts in prediction index: ${value}.`)
    }

    return new Date(Date.UTC(year, month - 1, day))
}

function addUtcDays(baseDate: Date, days: number): Date {
    return new Date(Date.UTC(baseDate.getUTCFullYear(), baseDate.getUTCMonth(), baseDate.getUTCDate() + days))
}

function PredictionHistoryPageInner({
    className,
    index,
    allIndex,
    isAllIndexLoading,
    allIndexErrorMessage,
    isIndexLoading,
    indexError,
    onIndexRetry,
    trainingScope,
    onTrainingScopeChange,
    historyWindow,
    onHistoryWindowChange
}: PredictionHistoryPageInnerProps) {
    const { t, i18n } = useTranslation('reports')
    const departure = useSelector(selectDepartureDate)
    const arrival = useSelector(selectArrivalDate)

    const fromDate = departure?.value ?? null
    const toDate = arrival?.value ?? null

    const [pageIndex, setPageIndex] = useState(0)
    const [cardsAnimating, setCardsAnimating] = useState(false)
    const introBullets = useMemo(
        () => readPredictionPageStringList(i18n, 'predictionHistory.page.intro.bullets'),
        [i18n]
    )
    const renderIntroText = useCallback((text: string) => renderTermTooltipRichText(text), [])

    const historyWindowOptions = useMemo(
        () =>
            HISTORY_WINDOW_OPTION_DEFS.map(option => ({
                value: option.value,
                label: t(option.labelKey, { defaultValue: option.defaultLabel })
            })),
        [t]
    )

    const allDatesDesc = useMemo(() => collectUniqueDatesDesc(index), [index])
    const allBuiltDatesDesc = useMemo(() => collectUniqueDatesDesc(allIndex), [allIndex])
    const historyMinSelectableDate = useMemo(() => {
        const earliestBuiltDateKey = allBuiltDatesDesc[allBuiltDatesDesc.length - 1]
        if (!earliestBuiltDateKey) {
            return null
        }

        const parsedEarliestBuiltDate = parseDateKey(earliestBuiltDateKey)
        if (!parsedEarliestBuiltDate) {
            throw new Error(`[ui] Failed to parse earliest prediction history date: ${earliestBuiltDateKey}.`)
        }

        return parsedEarliestBuiltDate
    }, [allBuiltDatesDesc])
    const currentScopeMeta = resolveCurrentPredictionTrainingScopeMeta(trainingScope)
    const trainingSplitStatsState = useCurrentPredictionBackfilledSplitStats()
    const selectedHistoryWindowMeta = historyWindowOptions.find(option => option.value === historyWindow)
    if (!selectedHistoryWindowMeta || !isPredictionHistoryWindow(selectedHistoryWindowMeta.value)) {
        throw new Error(`[ui] Unsupported prediction history window option: ${historyWindow}.`)
    }
    const controlGroups = useMemo(
        () => [
            buildTrainingScopeControlGroup({
                value: trainingScope,
                onChange: onTrainingScopeChange,
                label: t('predictionHistory.filters.scope.label'),
                ariaLabel: t('predictionHistory.filters.scope.ariaLabel'),
                infoTooltip: buildCurrentPredictionHistoryTrainingScopeDescription(trainingSplitStatsState.data),
                splitStats: trainingSplitStatsState.data
            }),
            buildPredictionHistoryWindowControlGroup({
                value: historyWindow,
                options: historyWindowOptions,
                onChange: nextValue => {
                    if (!isPredictionHistoryWindow(nextValue)) {
                        throw new Error(`[ui] Unsupported prediction history window value: ${nextValue}.`)
                    }

                    onHistoryWindowChange(nextValue)
                },
                label: t('predictionHistory.filters.window.label'),
                ariaLabel: t('predictionHistory.filters.window.ariaLabel')
            })
        ],
        [
            historyWindow,
            historyWindowOptions,
            onHistoryWindowChange,
            onTrainingScopeChange,
            t,
            trainingScope,
            trainingSplitStatsState.data
        ]
    )

    const filteredDates = useMemo(() => {
        if (!allDatesDesc.length) {
            return [] as string[]
        }

        return allDatesDesc.filter(date => {
            if (fromDate && date < fromDate) {
                return false
            }
            if (toDate && date > toDate) {
                return false
            }
            return true
        })
    }, [allDatesDesc, fromDate, toDate])

    useEffect(() => {
        if (!filteredDates.length) {
            setPageIndex(0)
            return
        }

        const maxIndex = Math.max(0, Math.ceil(filteredDates.length / PAGE_SIZE) - 1)
        setPageIndex(prev => Math.min(prev, maxIndex))
    }, [filteredDates])

    const totalPages = filteredDates.length > 0 ? Math.ceil(filteredDates.length / PAGE_SIZE) : 0
    const clampedPageIndex = totalPages > 0 ? Math.min(pageIndex, totalPages - 1) : 0
    const pageStart = clampedPageIndex * PAGE_SIZE
    const visibleDates = useMemo(
        () => filteredDates.slice(pageStart, pageStart + PAGE_SIZE),
        [filteredDates, pageStart]
    )

    useEffect(() => {
        setCardsAnimating(false)
        const raf = requestAnimationFrame(() => setCardsAnimating(true))
        const t = window.setTimeout(() => setCardsAnimating(false), 260)

        return () => {
            cancelAnimationFrame(raf)
            window.clearTimeout(t)
        }
    }, [clampedPageIndex])

    const canPrev = clampedPageIndex > 0
    const canNext = totalPages > 0 && clampedPageIndex < totalPages - 1
    const visibleFrom = filteredDates.length > 0 ? pageStart + 1 : 0
    const visibleTo = filteredDates.length > 0 ? Math.min(pageStart + PAGE_SIZE, filteredDates.length) : 0

    const rootClassName = classNames(cls.HistoryPage, {}, [className ?? ''])

    const totalBuiltCount = allBuiltDatesDesc.length
    const filteredCount = filteredDates.length
    const historyTag = `current_prediction_${HISTORY_SET}_${trainingScope}`
    const missingStats = resolveHistoryMissingStats(allBuiltDatesDesc)
    const totalBuiltLabel =
        allIndexErrorMessage ? t('predictionHistory.page.meta.notAvailableWithIndexError')
        : isAllIndexLoading ? t('predictionHistory.page.meta.loading')
        : String(totalBuiltCount)
    const missingBuiltLabel =
        allIndexErrorMessage ?
            t('predictionHistory.page.meta.notAvailableWithDetails', { details: allIndexErrorMessage })
        : isAllIndexLoading ? t('predictionHistory.page.meta.loading')
        : missingStats ?
            t('predictionHistory.page.meta.missingBuilt', {
                missing: missingStats.missingWeekdays,
                expected: missingStats.expectedWeekdays,
                fromDateUtc: missingStats.fromDateUtc,
                toDateUtc: missingStats.toDateUtc
            })
        :   t('predictionHistory.page.meta.noData')
    const latestDateUtc = allDatesDesc.length > 0 ? allDatesDesc[0] : null
    const latestReportQuery = useGetCurrentPredictionByDateQuery(
        latestDateUtc ? { set: HISTORY_SET, scope: trainingScope, dateUtc: latestDateUtc } : skipToken,
        { refetchOnMountOrArgChange: true }
    )
    const trainingLabel = resolveTrainingLabel(latestReportQuery.data)

    const cardSections = useMemo(
        () =>
            visibleDates.map(date => ({
                id: date,
                anchor: `pred-${date}`
            })),
        [visibleDates]
    )

    const {
        currentIndex: cardIndex,
        canPrev: canCardPrev,
        canNext: canCardNext,
        handlePrev: handleCardPrev,
        handleNext: handleCardNext
    } = useSectionPager({
        sections: cardSections,
        syncHash: false,
        trackScroll: true,
        step: IN_PAGE_SCROLL_STEP
    })

    const handlePagePrev = () => setPageIndex(prev => Math.max(prev - 1, 0))
    const handlePageNext = () => setPageIndex(prev => Math.min(prev + 1, totalPages - 1))

    return (
        <div className={rootClassName}>
            <header className={cls.header}>
                <div className={cls.headerMain}>
                    <Text type='h1'>{t('predictionHistory.page.title')}</Text>
                    <span className={cls.headerTag}>{historyTag}</span>
                </div>

                <div className={cls.headerMeta}>
                    <span>{t('predictionHistory.page.meta.totalBuilt', { value: totalBuiltLabel })}</span>
                    <span>{t('predictionHistory.page.meta.missingInRange', { value: missingBuiltLabel })}</span>
                    <span>{t('predictionHistory.page.meta.currentlyVisible', { value: filteredCount })}</span>
                    <span>
                        {t('predictionHistory.page.meta.loadWindow', { value: selectedHistoryWindowMeta.label })}
                    </span>
                    <span>{t('predictionHistory.page.meta.trainingScope', { value: currentScopeMeta.label })}</span>
                    <span>
                        {t('predictionHistory.page.meta.trainingModel', {
                            value: trainingLabel ?? t('predictionHistory.page.meta.trainingModelFallback')
                        })}
                    </span>
                </div>
            </header>

            {/* История должна сначала объяснять, зачем нужен этот архив, а уже потом открывать фильтры, даты и карточки отчётов. */}
            <PredictionPageIntro
                title={t('predictionHistory.page.intro.title')}
                lead={t('predictionHistory.page.intro.lead')}
                bullets={introBullets}
                renderText={renderIntroText}
            />

            <section className={cls.filters}>
                <div className={cls.controlsPanel}>
                    <ReportViewControls groups={controlGroups} className={cls.filtersControls} />
                    <Text type='p' className={cls.controlHint}>
                        {currentScopeMeta.hint}
                    </Text>
                </div>

                <div className={cls.filtersRow}>
                    <DatePicker className={cls.datePicker} minSelectableDate={historyMinSelectableDate ?? undefined} />
                    <div className={cls.filtersInfo}>
                        <Text type='p'>{t('predictionHistory.filters.dateRange.description')}</Text>
                        {fromDate && toDate && (
                            <Text type='p' className={cls.filtersRangeSummary}>
                                {t('predictionHistory.filters.dateRange.current', { fromDate, toDate })}
                            </Text>
                        )}
                    </div>
                </div>
            </section>

            <section className={cls.content}>
                <SectionDataState
                    isLoading={isIndexLoading}
                    isError={Boolean(indexError)}
                    error={indexError}
                    hasData={allDatesDesc.length > 0}
                    onRetry={onIndexRetry}
                    title={
                        indexError ?
                            t('predictionHistory.page.indexErrorTitle', { reportSet: HISTORY_SET })
                        :   t('predictionHistory.page.emptyIndex.title')
                    }
                    description={indexError ? undefined : t('predictionHistory.page.emptyIndex.description')}
                    loadingText={t('predictionHistory.page.loadingTitle')}
                    logContext={{
                        source: 'prediction-history-index',
                        extra: {
                            reportSet: HISTORY_SET,
                            trainingScope,
                            historyWindow: selectedHistoryWindowMeta.value
                        }
                    }}>
                    {filteredCount === 0 && <Text type='p'>{t('predictionHistory.content.empty')}</Text>}

                    {filteredCount > 0 && (
                        <>
                            <div className={cls.pagination}>
                                {canPrev ?
                                    <button
                                        type='button'
                                        className={cls.paginationButton}
                                        onClick={handlePagePrev}
                                        aria-label={t('predictionHistory.pagination.prevAria')}>
                                        <Icon name='arrow' flipped />
                                    </button>
                                :   <span className={cls.paginationSpacer} aria-hidden='true' />}

                                <div className={cls.paginationInfo}>
                                    <Text type='p'>
                                        {t('predictionHistory.pagination.shown', {
                                            from: visibleFrom,
                                            to: visibleTo,
                                            total: filteredCount
                                        })}
                                    </Text>
                                    <Text type='p' className={cls.paginationHint}>
                                        {t('predictionHistory.pagination.pageOf', {
                                            current: totalPages === 0 ? 0 : clampedPageIndex + 1,
                                            total: totalPages
                                        })}
                                    </Text>
                                </div>

                                {canNext ?
                                    <button
                                        type='button'
                                        className={cls.paginationButton}
                                        onClick={handlePageNext}
                                        aria-label={t('predictionHistory.pagination.nextAria')}>
                                        <Icon name='arrow' />
                                    </button>
                                :   <span className={cls.paginationSpacer} aria-hidden='true' />}
                            </div>

                            <div className={classNames(cls.cards, { [cls.cardsAnimating]: cardsAnimating }, [])}>
                                {visibleDates.map(date => (
                                    <PredictionHistoryReportCard
                                        key={`${trainingScope}-${date}`}
                                        dateUtc={date}
                                        domId={`pred-${date}`}
                                        trainingScope={trainingScope}
                                    />
                                ))}
                            </div>

                            <SectionPager
                                variant='dpad'
                                sections={cardSections}
                                currentIndex={cardIndex}
                                canPrev={canCardPrev}
                                canNext={canCardNext}
                                onPrev={handleCardPrev}
                                onNext={handleCardNext}
                                tightRight
                                canGroupPrev={canPrev}
                                canGroupNext={canNext}
                                onGroupPrev={handlePagePrev}
                                onGroupNext={handlePageNext}
                                groupStatus={
                                    totalPages > 0 ?
                                        { current: clampedPageIndex + 1, total: totalPages }
                                    :   { current: 0, total: 0 }
                                }
                            />
                        </>
                    )}
                </SectionDataState>
            </section>
        </div>
    )
}
interface PredictionHistoryReportCardProps {
    dateUtc: string
    domId: string
    trainingScope: CurrentPredictionTrainingScope
}

function isPolicyTableSection(section: ReportSectionDto): boolean {
    return section.sectionKey === POLICY_TABLE_SECTION_KEY
}

function sanitizeHistoryReportSectionsForView(sections: ReportSectionDto[]): ReportSectionDto[] {
    return sections
        .filter(section => !isPolicyTableSection(section))
        .map(section => {
            if (!isKeyValueSection(section)) {
                return section
            }

            // Технический пункт источника факта в истории не показываем в UI.
            const filteredItems = section.items.filter(item => {
                return (item.itemKey ?? '').trim().toLowerCase() !== 'fact_source'
            })
            if (filteredItems.length === section.items.length) {
                return section
            }

            return {
                ...section,
                items: filteredItems
            }
        })
}

interface PredictionPolicyTradesTableProps {
    report: ReportDocumentDto
    dateUtc: string
    executedTrades: PolicyTradeRow[]
    skippedDirectionalSignals: PolicySkippedSignalRow[]
}

const POLICY_TRADES_SECTION_TITLE = 'Policy по веткам BASE и ANTI-D'

function resolvePolicyBucketLabel(
    bucket: PolicyBranchMegaBucketMode,
    translate: (key: string, options?: Record<string, unknown>) => string
): string {
    if (bucket === 'daily') return translate('predictionHistory.tradesTable.bucket.daily')
    if (bucket === 'intraday') return translate('predictionHistory.tradesTable.bucket.intraday')
    if (bucket === 'delayed') return translate('predictionHistory.tradesTable.bucket.delayed')
    return translate('predictionHistory.tradesTable.bucket.total')
}

function summarizeSkipReasons(
    rows: PolicySkippedSignalRow[],
    translate: (key: string, options?: Record<string, unknown>) => string
): string | null {
    if (rows.length === 0) {
        return null
    }

    const reasonCounts = new Map<string, number>()
    for (const row of rows) {
        const key = row.skipReason.trim()
        if (!key) {
            continue
        }

        reasonCounts.set(key, (reasonCounts.get(key) ?? 0) + 1)
    }

    if (reasonCounts.size === 0) {
        return null
    }

    const sortedReasons = Array.from(reasonCounts.entries()).sort((a, b) => {
        if (b[1] !== a[1]) {
            return b[1] - a[1]
        }
        return a[0].localeCompare(b[0])
    })

    const topReasons = sortedReasons.slice(0, 3).map(([reason, count]) => `${reason} (${count})`)
    const extraReasonsCount = sortedReasons.length - topReasons.length
    const extraSuffix =
        extraReasonsCount > 0 ?
            translate('predictionHistory.tradesTable.skipReasons.extraSuffix', { count: extraReasonsCount })
        :   ''

    return translate('predictionHistory.tradesTable.skipReasons.summary', {
        reasons: topReasons.join('; '),
        extraSuffix
    })
}

function PredictionPolicyTradesTable({
    report,
    dateUtc,
    executedTrades,
    skippedDirectionalSignals
}: PredictionPolicyTradesTableProps) {
    const { t } = useTranslation('reports')
    const { intlLocale } = useLocale()
    const [bucketFilter, setBucketFilter] = useState<PolicyBranchMegaBucketMode>('daily')
    const translate = (key: string, options?: Record<string, unknown>) => t(key, options)
    const bucketControlGroups = useMemo(
        () => [
            buildPredictionPolicyBucketControlGroup({
                value: bucketFilter,
                onChange: setBucketFilter,
                ariaLabel: t('predictionHistory.tradesTable.bucketAriaLabel')
            })
        ],
        [bucketFilter, t]
    )

    const filteredExecutedTrades =
        bucketFilter === 'total' ? executedTrades : executedTrades.filter(row => row.bucket === bucketFilter)

    const filteredSkippedSignals =
        bucketFilter === 'total' ? skippedDirectionalSignals : (
            skippedDirectionalSignals.filter(row => row.bucket === bucketFilter)
        )

    const noExecutedTradesInDay = executedTrades.length === 0

    const columns = [
        t('predictionHistory.tradesTable.columns.policy'),
        t('predictionHistory.tradesTable.columns.branch'),
        t('predictionHistory.tradesTable.columns.side'),
        t('predictionHistory.tradesTable.columns.entry'),
        t('predictionHistory.tradesTable.columns.exit'),
        t('predictionHistory.tradesTable.columns.exitReason'),
        t('predictionHistory.tradesTable.columns.tpUsd'),
        t('predictionHistory.tradesTable.columns.tpPct'),
        t('predictionHistory.tradesTable.columns.slUsd'),
        t('predictionHistory.tradesTable.columns.slPct'),
        t('predictionHistory.tradesTable.columns.liquidationPrice'),
        t('predictionHistory.tradesTable.columns.notionalUsd'),
        t('predictionHistory.tradesTable.columns.bucketCapital'),
        t('predictionHistory.tradesTable.columns.stakeUsd'),
        t('predictionHistory.tradesTable.columns.stakePct')
    ]

    const tradeRowsTable: TableRow[] = filteredExecutedTrades.map(row => [
        row.policyName,
        row.branch,
        row.side,
        formatPrice(row.entryPrice, intlLocale),
        formatPrice(row.exitPrice, intlLocale),
        row.exitReason,
        formatPrice(row.tpPrice, intlLocale),
        formatPercent(row.tpPct, intlLocale),
        formatPrice(row.slPrice, intlLocale),
        formatPercent(row.slPct, intlLocale),
        row.liqPrice !== null ? formatPrice(row.liqPrice, intlLocale) : t('predictionHistory.tradesTable.liqFallback'),
        formatMoney(row.notionalUsd, intlLocale),
        formatMoney(row.bucketCapitalUsd, intlLocale),
        formatMoney(row.stakeUsd, intlLocale),
        formatPercent(row.stakePct, intlLocale)
    ])

    const skippedColumns = [
        t('predictionHistory.tradesTable.skippedColumns.policy'),
        t('predictionHistory.tradesTable.skippedColumns.branch'),
        t('predictionHistory.tradesTable.skippedColumns.side'),
        t('predictionHistory.tradesTable.skippedColumns.leverage'),
        t('predictionHistory.tradesTable.skippedColumns.reason')
    ]
    const skippedRowsTable: TableRow[] = filteredSkippedSignals.map(row => [
        row.policyName,
        row.branch,
        row.side,
        formatPercent(row.leverage, intlLocale),
        row.skipReason
    ])

    return (
        <div className={cls.tradeTableBlock}>
            <div className={cls.tradeTableToolbar}>
                <Text type='p' className={cls.tradeTableHint}>
                    {t('predictionHistory.tradesTable.toolbarHint', { dateUtc })}
                </Text>

                <ReportViewControls groups={bucketControlGroups} className={cls.bucketControls} />
            </div>

            {executedTrades.length === 0 && skippedDirectionalSignals.length === 0 && (
                <Text type='p' className={cls.tradeTableHint}>
                    {t('predictionHistory.tradesTable.noDirectionalSignals')}
                </Text>
            )}

            {noExecutedTradesInDay && skippedDirectionalSignals.length > 0 && (
                <Text type='p' className={cls.tradeTableHint}>
                    {t('predictionHistory.tradesTable.noExecutedPrefix')}{' '}
                    {summarizeSkipReasons(
                        filteredSkippedSignals.length > 0 ? filteredSkippedSignals : skippedDirectionalSignals,
                        translate
                    ) ?? t('predictionHistory.tradesTable.noSkipReasonsFallback')}
                </Text>
            )}

            {!noExecutedTradesInDay && filteredExecutedTrades.length > 0 && (
                <ReportTableCard
                    title={t('predictionHistory.tradesTable.executed.title')}
                    description={t('predictionHistory.tradesTable.executed.description')}
                    columns={columns}
                    rows={tradeRowsTable}
                    domId={`pred-trades-${dateUtc}`}
                    renderColumnTitle={title =>
                        renderTermTooltipTitle(
                            title,
                            resolveReportColumnTooltip(report.kind, POLICY_TRADES_SECTION_TITLE, title)
                        )
                    }
                />
            )}

            {!noExecutedTradesInDay && filteredExecutedTrades.length === 0 && filteredSkippedSignals.length > 0 && (
                <Text type='p' className={cls.tradeTableHint}>
                    {t('predictionHistory.tradesTable.onlySkippedInBucket')}
                </Text>
            )}

            {!noExecutedTradesInDay && filteredExecutedTrades.length === 0 && filteredSkippedSignals.length === 0 && (
                <Text type='p' className={cls.tradeTableHint}>
                    {t('predictionHistory.tradesTable.noRowsForBucket', {
                        bucket: resolvePolicyBucketLabel(bucketFilter, translate)
                    })}
                </Text>
            )}

            {!noExecutedTradesInDay && filteredSkippedSignals.length > 0 && (
                <ReportTableCard
                    title={t('predictionHistory.tradesTable.skipped.title')}
                    description={t('predictionHistory.tradesTable.skipped.description')}
                    columns={skippedColumns}
                    rows={skippedRowsTable}
                    domId={`pred-skipped-signals-${dateUtc}`}
                    renderColumnTitle={title =>
                        renderTermTooltipTitle(
                            title,
                            resolveReportColumnTooltip(report.kind, POLICY_TRADES_SECTION_TITLE, title)
                        )
                    }
                />
            )}
        </div>
    )
}

function PredictionHistoryReportCard({ dateUtc, domId, trainingScope }: PredictionHistoryReportCardProps) {
    const { t } = useTranslation('reports')
    const trainingScopeMeta = resolveCurrentPredictionTrainingScopeMeta(trainingScope)

    const { data, isLoading, isError, error } = useGetCurrentPredictionByDateQuery(
        {
            dateUtc,
            set: HISTORY_SET,
            scope: trainingScope
        },
        {
            refetchOnMountOrArgChange: true
        }
    )

    if (isLoading) {
        return (
            <div id={domId} className={cls.reportCard}>
                <Text type='p'>{t('predictionHistory.reportCard.loading', { dateUtc })}</Text>
            </div>
        )
    }

    if (isError || !data) {
        const resolved = isError ? resolveAppError(error) : undefined

        return (
            <div id={domId} className={cls.reportCard}>
                <ErrorBlock
                    code={resolved?.code ?? 'UNKNOWN'}
                    title={resolved?.title ?? t('predictionHistory.reportCard.loadErrorTitle')}
                    description={
                        resolved?.description ??
                        t('predictionHistory.reportCard.loadErrorDescription', {
                            dateUtc,
                            reportSet: HISTORY_SET,
                            trainingScope
                        })
                    }
                    details={resolved?.rawMessage}
                    compact
                />
            </div>
        )
    }

    let parsedPolicyTrades: ParsedPolicyTradeRows | null = null
    let policyTradesSchemaError: string | null = null
    try {
        parsedPolicyTrades = parsePolicyTradeRows(data)
    } catch (error) {
        policyTradesSchemaError = error instanceof Error ? error.message : String(error)
    }

    const sanitizedSections = sanitizeHistoryReportSectionsForView(data.sections)
    const reportForView =
        (
            sanitizedSections.length === data.sections.length &&
            sanitizedSections.every((section, idx) => section === data.sections[idx])
        ) ?
            data
        :   {
                ...data,
                sections: sanitizedSections
            }
    const documentFreshness = {
        statusMode: 'actual' as const,
        statusTitle: t('predictionHistory.reportCard.status.title'),
        statusMessage: t('predictionHistory.reportCard.status.message', {
            dateUtc,
            mode: trainingScopeMeta.label
        })
    }

    return (
        <div id={domId} className={cls.reportCard}>
            <SectionErrorBoundary
                name={`PredictionHistoryReport_${dateUtc}`}
                fallback={({ error: sectionError, reset }) => (
                    <ErrorBlock
                        code='CLIENT'
                        title={t('predictionHistory.reportCard.renderErrorTitle', { dateUtc })}
                        description={t('predictionHistory.reportCard.renderErrorDescription')}
                        details={sectionError.message}
                        onRetry={reset}
                        compact
                    />
                )}>
                <ReportDocumentView report={reportForView} freshness={documentFreshness} />
            </SectionErrorBoundary>

            <SectionErrorBoundary
                name={`PredictionHistoryPolicyTrades_${dateUtc}`}
                fallback={({ error: sectionError, reset }) => (
                    <ErrorBlock
                        code='CLIENT'
                        title={t('predictionHistory.reportCard.tradesBuildErrorTitle', { dateUtc })}
                        description={t('predictionHistory.reportCard.tradesBuildErrorDescription')}
                        details={sectionError.message}
                        onRetry={reset}
                        compact
                    />
                )}>
                {policyTradesSchemaError ?
                    <ErrorBlock
                        code='DATA'
                        title={t('predictionHistory.reportCard.tradesSchemaErrorTitle', { dateUtc })}
                        description={t('predictionHistory.reportCard.tradesSchemaErrorDescription')}
                        details={policyTradesSchemaError}
                        compact
                    />
                : parsedPolicyTrades ?
                    <PredictionPolicyTradesTable
                        report={data}
                        dateUtc={dateUtc}
                        executedTrades={parsedPolicyTrades.executedTrades}
                        skippedDirectionalSignals={parsedPolicyTrades.skippedDirectionalSignals}
                    />
                :   <ErrorBlock
                        code='DATA'
                        title={t('predictionHistory.reportCard.tradesNotInitializedTitle', { dateUtc })}
                        description={t('predictionHistory.reportCard.tradesNotInitializedDescription')}
                        details='[ui] Policy trade rows were not resolved.'
                        compact
                    />
                }
            </SectionErrorBoundary>
        </div>
    )
}

function PredictionHistoryPageWithBoundary(props: PredictionHistoryPageProps) {
    const { t } = useTranslation('reports')
    const [trainingScope, setTrainingScope] = useState<CurrentPredictionTrainingScope>(DEFAULT_BACKFILLED_HISTORY_SCOPE)
    const [historyWindow, setHistoryWindow] = useState<PredictionHistoryWindow>('365')
    const historyDays = resolveHistoryWindowDays(historyWindow)

    const { data, isLoading, isError, error, refetch } = useCurrentPredictionIndexQuery(
        HISTORY_SET,
        historyDays,
        trainingScope
    )
    const {
        data: allIndexData,
        isLoading: isAllIndexLoading,
        isError: isAllIndexError,
        error: allIndexError,
        refetch: refetchAllIndex
    } = useCurrentPredictionIndexQuery(HISTORY_SET, undefined, trainingScope)

    const allIndexResolvedError = isAllIndexError ? resolveAppError(allIndexError) : null
    const allIndexErrorMessage = allIndexResolvedError?.rawMessage ?? allIndexResolvedError?.description ?? null

    const hasData = Array.isArray(data)

    const handleRetry = () => {
        void refetch()
        void refetchAllIndex()
    }

    return (
        <PredictionHistoryPageInner
            {...props}
            index={hasData ? data : null}
            allIndex={allIndexData ?? null}
            isAllIndexLoading={isAllIndexLoading}
            allIndexErrorMessage={allIndexErrorMessage}
            isIndexLoading={isLoading}
            indexError={isError ? error : null}
            onIndexRetry={handleRetry}
            trainingScope={trainingScope}
            onTrainingScopeChange={setTrainingScope}
            historyWindow={historyWindow}
            onHistoryWindowChange={setHistoryWindow}
        />
    )
}

export default function PredictionHistoryPage(props: PredictionHistoryPageProps) {
    const { t } = useTranslation('reports')

    return (
        <PageSuspense title={t('predictionHistory.page.loadingTitle')}>
            <PredictionHistoryPageWithBoundary {...props} />
        </PageSuspense>
    )
}
