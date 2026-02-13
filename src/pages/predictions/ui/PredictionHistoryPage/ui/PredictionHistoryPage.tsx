import { useEffect, useMemo, useState } from 'react'
import { skipToken } from '@reduxjs/toolkit/query'
import { useSelector } from 'react-redux'
import classNames from '@/shared/lib/helpers/classNames'
import {
    BucketFilterToggle,
    CurrentPredictionTrainingScopeToggle,
    Icon,
    PolicyBucketFilterToggle,
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
import { useCurrentPredictionIndexQuery } from '@/shared/api/tanstackQueries/currentPrediction'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import PageSuspense from '@/shared/ui/loaders/PageSuspense/ui/PageSuspense'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import type { CurrentPredictionSet, CurrentPredictionTrainingScope } from '@/shared/api/endpoints/reportEndpoints'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { resolveTrainingLabel } from '@/shared/utils/reportTraining'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { resolveReportColumnTooltip } from '@/shared/utils/reportTooltips'
import {
    resolvePolicyBranchMegaBucketFromQuery,
    resolvePolicyBranchMegaBucketFromTitle,
    type PolicyBranchMegaBucketMode
} from '@/shared/utils/policyBranchMegaTabs'
import type { ReportDocumentDto, ReportSectionDto, TableSectionDto } from '@/shared/types/report.types'
import type { TableRow } from '@/shared/ui/SortableTable'
import { tryParseNumberFromString } from '@/shared/ui/SortableTable'
import type { BucketFilterOption } from '@/shared/ui/BucketFilterToggle'
import type { PredictionHistoryPageProps } from './types'
const PAGE_SIZE = 10
const IN_PAGE_SCROLL_STEP = Math.max(1, Math.floor(PAGE_SIZE / 2))
const HISTORY_SET: CurrentPredictionSet = 'backfilled'
type PredictionHistoryWindow = '365' | '730' | 'all'
const HISTORY_WINDOW_OPTIONS: readonly BucketFilterOption[] = [
    { value: '365', label: 'За 1 год' },
    { value: '730', label: 'За 2 года' },
    { value: 'all', label: 'За всё время' }
]
type PredictionHistoryIndex = NonNullable<ReturnType<typeof useCurrentPredictionIndexQuery>['data']>
interface PredictionHistoryPageInnerProps {
    className?: string
    index: PredictionHistoryIndex
    allIndex: PredictionHistoryIndex | null
    isAllIndexLoading: boolean
    allIndexErrorMessage: string | null
    trainingScope: CurrentPredictionTrainingScope
    onTrainingScopeChange: (scope: CurrentPredictionTrainingScope) => void
    historyWindow: PredictionHistoryWindow
    onHistoryWindowChange: (window: PredictionHistoryWindow) => void
}

type ReportTableSectionView = TableSectionDto & { columns: string[]; rows: string[][] }
type ReportKeyValueSectionView = ReportSectionDto & { items: Array<{ key: string; value: string }> }

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

const POLICY_TABLE_TITLE_RE = /^=*\s*Политики плеча/i
const POLICY_TABLE_REQUIRED_COLUMNS = [
    'политика',
    'ветка',
    'направление',
    'цена входа',
    'цена выхода',
    'причина выхода',
    'цена tp',
    'цена sl',
    'цена ликвидации',
    'капитал бакета, $',
    'ставка, $',
    'ставка, %'
] as const

function isTableSection(section: ReportSectionDto): section is ReportTableSectionView {
    const candidate = section as { columns?: unknown; rows?: unknown }
    return Array.isArray(candidate.columns) && Array.isArray(candidate.rows)
}

function isKeyValueSection(section: ReportSectionDto): section is ReportKeyValueSectionView {
    const candidate = section as { items?: unknown; columns?: unknown }
    return Array.isArray(candidate.items) && !Array.isArray(candidate.columns)
}

function normalizeLabel(value: string): string {
    return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function findColumnIndexOrThrow(columns: string[], matcher: (normalized: string) => boolean, label: string): number {
    const idx = columns.findIndex(col => matcher(normalizeLabel(col)))
    if (idx < 0) {
        throw new Error(`[ui] Required column is missing in policy table. column=${label}.`)
    }
    return idx
}

function parseNumberOrThrow(raw: unknown, label: string): number {
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
        normalized.startsWith('нет')
    ) {
        return null
    }

    const parsed = tryParseNumberFromString(raw)
    if (parsed === null || !Number.isFinite(parsed)) {
        return null
    }

    return parsed
}

function parseBooleanTextOrThrow(raw: unknown, label: string): boolean {
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

function formatPrice(value: number): string {
    if (!Number.isFinite(value)) {
        throw new Error(`[ui] Invalid price value for formatting: ${value}.`)
    }
    return value.toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4
    })
}

function formatMoney(value: number): string {
    if (!Number.isFinite(value)) {
        throw new Error(`[ui] Invalid money value for formatting: ${value}.`)
    }
    return value.toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })
}

function formatPercent(value: number): string {
    if (!Number.isFinite(value)) {
        throw new Error(`[ui] Invalid percent value for formatting: ${value}.`)
    }
    return value.toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })
}

function parsePolicyBucketModeOrThrow(raw: unknown, label: string): PolicyBranchMegaBucketMode {
    if (typeof raw !== 'string') {
        throw new Error(`[ui] Missing or invalid bucket value. field=${label}.`)
    }

    const normalized = raw.trim()
    if (normalized.length === 0) {
        throw new Error(`[ui] Bucket value is empty. field=${label}.`)
    }

    const lower = normalized.toLowerCase()
    if (lower === 'дейли') return 'daily'
    if (lower === 'интрадей') return 'intraday'
    if (lower === 'делейд') return 'delayed'
    if (lower === 'все бакеты' || lower === 'сумма бакетов' || lower === 'total buckets') return 'total'

    try {
        return resolvePolicyBranchMegaBucketFromQuery(normalized, 'daily')
    } catch {
        throw new Error(`[ui] Unsupported bucket value. field=${label}, value=${raw}.`)
    }
}

function resolvePolicyTableSectionsOrThrow(report: ReportDocumentDto): ReportTableSectionView[] {
    const tables = report.sections.filter(
        (section): section is ReportTableSectionView =>
            isTableSection(section) &&
            POLICY_TABLE_TITLE_RE.test(section.title) &&
            section.columns.some(col => normalizeLabel(col) === 'политика') &&
            section.columns.some(col => normalizeLabel(col) === 'цена входа')
    )

    if (tables.length === 0) {
        throw new Error('[ui] Policy table section is missing in report.')
    }

    const strictTables = tables.filter(table => {
        const normalized = new Set(table.columns.map(col => normalizeLabel(col)))
        return POLICY_TABLE_REQUIRED_COLUMNS.every(required => normalized.has(required))
    })

    if (strictTables.length === 0) {
        const bestCandidate = tables[0]
        const normalized = new Set(bestCandidate.columns.map(col => normalizeLabel(col)))
        const missingColumns = POLICY_TABLE_REQUIRED_COLUMNS.filter(required => !normalized.has(required))
        throw new Error(
            `[ui] Policy table schema is outdated. Missing required columns: ${missingColumns.join(', ')}.`
        )
    }

    for (const table of strictTables) {
        const hasBucketColumn = table.columns.some(column => normalizeLabel(column) === 'бакет')
        const titleBucket = resolvePolicyBranchMegaBucketFromTitle(table.title)
        if (!hasBucketColumn && titleBucket === null) {
            throw new Error(
                `[ui] Policy table bucket is missing. section=${table.title}. Add bucket tag in title or "Бакет" column.`
            )
        }
    }

    return strictTables
}

function parsePolicyTradeRowsOrThrow(report: ReportDocumentDto): ParsedPolicyTradeRows {
    const tables = resolvePolicyTableSectionsOrThrow(report)

    const executedTrades: PolicyTradeRow[] = []
    const skippedDirectionalSignals: PolicySkippedSignalRow[] = []

    for (const table of tables) {
        const sectionBucket = resolvePolicyBranchMegaBucketFromTitle(table.title)
        const bucketIdx = table.columns.findIndex(col => normalizeLabel(col) === 'бакет')

        if (bucketIdx < 0 && sectionBucket === null) {
            throw new Error(
                `[ui] Policy table bucket is missing for section=${table.title}. Add bucket tag in title or "Бакет" column.`
            )
        }

        const policyIdx = findColumnIndexOrThrow(table.columns, col => col === 'политика', 'Политика')
        const branchIdx = findColumnIndexOrThrow(table.columns, col => col === 'ветка', 'Ветка')
        const hasDirectionIdx = findColumnIndexOrThrow(table.columns, col => col === 'есть направление', 'Есть направление')
        const skippedIdx = findColumnIndexOrThrow(table.columns, col => col === 'пропущено', 'Пропущено')
        const directionIdx = findColumnIndexOrThrow(table.columns, col => col === 'направление', 'Направление')
        const leverageIdx = findColumnIndexOrThrow(table.columns, col => col === 'плечо', 'Плечо')
        const entryIdx = findColumnIndexOrThrow(table.columns, col => col === 'цена входа', 'Цена входа')
        const slPctIdx = findColumnIndexOrThrow(table.columns, col => col === 'sl, %', 'SL, %')
        const tpPctIdx = findColumnIndexOrThrow(table.columns, col => col === 'tp, %', 'TP, %')
        const slPriceIdx = findColumnIndexOrThrow(table.columns, col => col === 'цена sl', 'Цена SL')
        const tpPriceIdx = findColumnIndexOrThrow(table.columns, col => col === 'цена tp', 'Цена TP')
        const positionUsdIdx = findColumnIndexOrThrow(table.columns, col => col === 'размер позиции, $', 'Размер позиции, $')
        const liqPriceIdx = findColumnIndexOrThrow(table.columns, col => col === 'цена ликвидации', 'Цена ликвидации')
        const exitPriceIdx = findColumnIndexOrThrow(table.columns, col => col === 'цена выхода', 'Цена выхода')
        const exitReasonIdx = findColumnIndexOrThrow(table.columns, col => col === 'причина выхода', 'Причина выхода')
        const bucketCapitalUsdIdx = findColumnIndexOrThrow(table.columns, col => col === 'капитал бакета, $', 'Капитал бакета, $')
        const stakeUsdIdx = findColumnIndexOrThrow(table.columns, col => col === 'ставка, $', 'Ставка, $')
        const stakePctIdx = findColumnIndexOrThrow(table.columns, col => col === 'ставка, %', 'Ставка, %')

        for (const row of table.rows) {
            if (!Array.isArray(row)) {
                throw new Error('[ui] Invalid policy table row.')
            }

            const hasDirection = parseBooleanTextOrThrow(row[hasDirectionIdx], 'Есть направление')
            const skipped = parseBooleanTextOrThrow(row[skippedIdx], 'Пропущено')

            if (!hasDirection) {
                continue
            }

            const directionRaw = String(row[directionIdx] ?? '').trim().toUpperCase()
            if (directionRaw !== 'LONG' && directionRaw !== 'SHORT') {
                throw new Error(`[ui] Unsupported direction value: ${directionRaw}.`)
            }

            const policyName = String(row[policyIdx] ?? '')
            const branch = String(row[branchIdx] ?? '')
            if (!policyName || !branch) {
                throw new Error('[ui] Policy or branch value is empty in policy table row.')
            }

            const leverage = parseNumberOrThrow(row[leverageIdx], 'Плечо')
            if (!(leverage > 0)) {
                throw new Error(`[ui] Leverage must be > 0. value=${leverage}.`)
            }

            const bucket =
                bucketIdx >= 0
                    ? parsePolicyBucketModeOrThrow(row[bucketIdx], 'Бакет')
                    : (sectionBucket as PolicyBranchMegaBucketMode)

            if (sectionBucket !== null && bucket !== sectionBucket) {
                throw new Error(
                    `[ui] Policy table bucket mismatch. section=${table.title}, sectionBucket=${sectionBucket}, rowBucket=${bucket}.`
                )
            }

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

            const entryPrice = parseNumberOrThrow(row[entryIdx], 'Цена входа')
            const slPrice = parseNumberOrThrow(row[slPriceIdx], 'Цена SL')
            const tpPrice = parseNumberOrThrow(row[tpPriceIdx], 'Цена TP')
            const liqPrice = parseOptionalNumber(row[liqPriceIdx])
            const positionUsd = parseNumberOrThrow(row[positionUsdIdx], 'Размер позиции, $')

            if (!(entryPrice > 0 && slPrice > 0 && tpPrice > 0)) {
                throw new Error('[ui] Trade prices must be positive.')
            }
            if (!(positionUsd > 0) || !Number.isFinite(positionUsd)) {
                throw new Error(`[ui] Position usd is invalid. value=${positionUsd}.`)
            }

            const slPctFromEntry = parseNumberOrThrow(row[slPctIdx], 'SL, %')
            const tpPctFromEntry = parseNumberOrThrow(row[tpPctIdx], 'TP, %')
            const bucketCapitalUsd = parseNumberOrThrow(row[bucketCapitalUsdIdx], 'Капитал бакета, $')
            const stakeUsd = parseNumberOrThrow(row[stakeUsdIdx], 'Ставка, $')
            const stakePct = parseNumberOrThrow(row[stakePctIdx], 'Ставка, %')
            const exitPrice = parseNumberOrThrow(row[exitPriceIdx], 'Цена выхода')
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

function resolveHistoryWindowDaysOrThrow(window: PredictionHistoryWindow): number | undefined {
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
        const dateKey = item.predictionDateUtc.substring(0, 10)
        dateSet.add(dateKey)
    }

    const dates = Array.from(dateSet)
    dates.sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))
    return dates
}

interface HistoryMissingStats {
    missingWeekdays: number
    expectedWeekdays: number
    fromDateUtc: string
    toDateUtc: string
}

function resolveHistoryMissingStatsOrThrow(allDatesDesc: string[]): HistoryMissingStats | null {
    if (allDatesDesc.length === 0) {
        return null
    }

    const newest = allDatesDesc[0]
    const oldest = allDatesDesc[allDatesDesc.length - 1]
    const fromUtc = parseIsoDateUtcOrThrow(oldest)
    const toUtc = parseIsoDateUtcOrThrow(newest)

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

function parseIsoDateUtcOrThrow(value: string): Date {
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
    trainingScope,
    onTrainingScopeChange,
    historyWindow,
    onHistoryWindowChange
}: PredictionHistoryPageInnerProps) {
    const departure = useSelector(selectDepartureDate)
    const arrival = useSelector(selectArrivalDate)

    const fromDate = departure?.value ?? null
    const toDate = arrival?.value ?? null

    const [pageIndex, setPageIndex] = useState(0)
    const [cardsAnimating, setCardsAnimating] = useState(false)

    const allDatesDesc = useMemo(() => collectUniqueDatesDesc(index), [index])
    const allBuiltDatesDesc = useMemo(() => collectUniqueDatesDesc(allIndex), [allIndex])
    const currentScopeMeta = resolveCurrentPredictionTrainingScopeMeta(trainingScope)
    const selectedHistoryWindowMeta = HISTORY_WINDOW_OPTIONS.find(option => option.value === historyWindow)
    if (!selectedHistoryWindowMeta || !isPredictionHistoryWindow(selectedHistoryWindowMeta.value)) {
        throw new Error(`[ui] Unsupported prediction history window option: ${historyWindow}.`)
    }

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

    if (!allDatesDesc.length) {
        const details = `set=${HISTORY_SET}, scope=${trainingScope}, window=${selectedHistoryWindowMeta.value}`
        return (
            <div className={rootClassName}>
                <ErrorBlock
                    code='DATA'
                    title='История прогнозов не загружена'
                    description='Бэкенд не вернул ни одной даты для выбранного режима обучения. Это считается ошибкой данных, а не пустым состоянием.'
                    details={details}
                />
            </div>
        )
    }

    const totalBuiltCount = allBuiltDatesDesc.length
    const filteredCount = filteredDates.length
    const historyTag = `current_prediction_${HISTORY_SET}_${trainingScope}`
    const missingStats = resolveHistoryMissingStatsOrThrow(allBuiltDatesDesc)
    const totalBuiltLabel = allIndexErrorMessage
        ? 'н/д (ошибка индекса)'
        : isAllIndexLoading
            ? 'загружаю…'
            : String(totalBuiltCount)
    const missingBuiltLabel = allIndexErrorMessage
        ? `н/д (${allIndexErrorMessage})`
        : isAllIndexLoading
            ? 'загружаю…'
            : missingStats
                ? `${missingStats.missingWeekdays} из ${missingStats.expectedWeekdays} будней (${missingStats.fromDateUtc}..${missingStats.toDateUtc})`
                : 'нет данных'
    const latestDateUtc = allDatesDesc.length > 0 ? allDatesDesc[0] : null
    const latestReportQuery = useGetCurrentPredictionByDateQuery(
        latestDateUtc
            ? { set: HISTORY_SET, scope: trainingScope, dateUtc: `${latestDateUtc}T00:00:00Z` }
            : skipToken,
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
                    <Text type='h1'>История прогнозов</Text>
                    <span className={cls.headerTag}>{historyTag}</span>
                </div>

                <div className={cls.headerMeta}>
                    <span>Всего построено отчётов: {totalBuiltLabel}</span>
                    <span>Не построено (будни в диапазоне): {missingBuiltLabel}</span>
                    <span>Сейчас показывается пользователю: {filteredCount}</span>
                    <span>Окно загрузки: {selectedHistoryWindowMeta.label}</span>
                    <span>Режим обучения отчётов: {currentScopeMeta.label}</span>
                    <span>
                        Модель обучения:{' '}
                        {trainingLabel ?? 'нет данных (проверь секцию обучения в отчёте)'}
                    </span>
                </div>
            </header>

            <section className={cls.filters}>
                <div className={cls.controlsPanel}>
                    <div className={cls.controlBlock}>
                        <Text type='p' className={cls.controlLabel}>
                            На чем тренировались модели:
                        </Text>
                        <CurrentPredictionTrainingScopeToggle
                            value={trainingScope}
                            onChange={onTrainingScopeChange}
                            className={cls.scopeToggle}
                            ariaLabel='Выбор режима обучения для истории прогнозов'
                        />
                        <Text type='p' className={cls.controlHint}>
                            {currentScopeMeta.hint}
                        </Text>
                    </div>

                    <div className={cls.controlBlock}>
                        <Text type='p' className={cls.controlLabel}>
                            Сколько отчётов показывать:
                        </Text>
                        <BucketFilterToggle
                            value={historyWindow}
                            options={HISTORY_WINDOW_OPTIONS}
                            onChange={nextValue => {
                                if (!isPredictionHistoryWindow(nextValue)) {
                                    throw new Error(`[ui] Unsupported prediction history window value: ${nextValue}.`)
                                }
                                onHistoryWindowChange(nextValue)
                            }}
                            className={cls.historyWindowToggle}
                            ariaLabel='Период загрузки истории прогнозов'
                        />
                    </div>
                </div>

                <div className={cls.filtersRow}>
                    <DatePicker className={cls.datePicker} />
                    <div className={cls.filtersInfo}>
                        <Text type='p'>
                            Диапазон задаётся через выбор начальной и конечной даты. Если диапазон не выбран, будут
                            показаны последние доступные дни.
                        </Text>
                        {fromDate && toDate && (
                            <Text type='p' className={cls.filtersRangeSummary}>
                                Текущий фильтр: {fromDate} — {toDate} (UTC)
                            </Text>
                        )}
                    </div>
                </div>
            </section>

            <section className={cls.content}>
                {filteredCount === 0 && <Text type='p'>В выбранном диапазоне нет прогнозов. Попробуйте изменить даты.</Text>}

                {filteredCount > 0 && (
                    <>
                        <div className={cls.pagination}>
                            <button
                                type='button'
                                className={cls.paginationButton}
                                onClick={handlePagePrev}
                                disabled={!canPrev}
                                aria-label='Показать предыдущие прогнозы'
                            >
                                <Icon name='arrow' flipped />
                            </button>

                            <div className={cls.paginationInfo}>
                                <Text type='p'>
                                    Показано {visibleFrom}–{visibleTo} из {filteredCount}
                                </Text>
                                <Text type='p' className={cls.paginationHint}>
                                    Страница {totalPages === 0 ? 0 : clampedPageIndex + 1} из {totalPages}
                                </Text>
                            </div>

                            <button
                                type='button'
                                className={cls.paginationButton}
                                onClick={handlePageNext}
                                disabled={!canNext}
                                aria-label='Показать следующие прогнозы'
                            >
                                <Icon name='arrow' />
                            </button>
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
                                totalPages > 0
                                    ? { current: clampedPageIndex + 1, total: totalPages }
                                    : { current: 0, total: 0 }
                            }
                        />
                    </>
                )}
            </section>
        </div>
    )
}
interface PredictionHistoryReportCardProps {
    dateUtc: string
    domId: string
    trainingScope: CurrentPredictionTrainingScope
}

function isLegacyPolicyTableSection(title: string): boolean {
    return /^=*\s*Политики плеча/i.test(title.trim())
}

function sanitizeHistoryReportSectionsForView(sections: ReportSectionDto[]): ReportSectionDto[] {
    return sections
        .filter(section => !isLegacyPolicyTableSection(section.title))
        .map(section => {
            if (!isKeyValueSection(section)) {
                return section
            }

            // Технический пункт источника факта в истории не показываем в UI.
            const filteredItems = section.items.filter(item => normalizeLabel(item.key) !== 'источник факта')
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

const POLICY_TRADES_SECTION_TITLE = 'Политики плеча (BASE vs ANTI-D)'

function resolvePolicyBucketLabel(bucket: PolicyBranchMegaBucketMode): string {
    if (bucket === 'daily') return 'Daily'
    if (bucket === 'intraday') return 'Intraday'
    if (bucket === 'delayed') return 'Delayed'
    return 'Σ Все бакеты'
}

function summarizeSkipReasons(rows: PolicySkippedSignalRow[]): string | null {
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
    const extraSuffix = extraReasonsCount > 0 ? `, ещё причин: ${extraReasonsCount}` : ''

    return `Причины: ${topReasons.join('; ')}${extraSuffix}.`
}

function PredictionPolicyTradesTable({
    report,
    dateUtc,
    executedTrades,
    skippedDirectionalSignals
}: PredictionPolicyTradesTableProps) {
    const [bucketFilter, setBucketFilter] = useState<PolicyBranchMegaBucketMode>('daily')

    const filteredExecutedTrades =
        bucketFilter === 'total'
            ? executedTrades
            : executedTrades.filter(row => row.bucket === bucketFilter)

    const filteredSkippedSignals =
        bucketFilter === 'total'
            ? skippedDirectionalSignals
            : skippedDirectionalSignals.filter(row => row.bucket === bucketFilter)

    const noExecutedTradesInDay = executedTrades.length === 0

    const columns = [
        'Политика',
        'Ветка',
        'Сторона',
        'Вход, $',
        'Выход, $',
        'Причина выхода',
        'TP, $',
        'TP, %',
        'SL, $',
        'SL, %',
        'Цена ликвидации, $',
        'Капитал бакета, $',
        'Ставка, $',
        'Ставка, %'
    ]

    const tradeRowsTable: TableRow[] = filteredExecutedTrades.map(row => [
        row.policyName,
        row.branch,
        row.side,
        formatPrice(row.entryPrice),
        formatPrice(row.exitPrice),
        row.exitReason,
        formatPrice(row.tpPrice),
        formatPercent(row.tpPct),
        formatPrice(row.slPrice),
        formatPercent(row.slPct),
        row.liqPrice !== null ? formatPrice(row.liqPrice) : 'нет (плечо<=1x / не рассчитана)',
        formatMoney(row.bucketCapitalUsd),
        formatMoney(row.stakeUsd),
        formatPercent(row.stakePct)
    ])

    const skippedColumns = ['Политика', 'Ветка', 'Сторона', 'Плечо', 'Причина пропуска']
    const skippedRowsTable: TableRow[] = filteredSkippedSignals.map(row => [
        row.policyName,
        row.branch,
        row.side,
        formatPercent(row.leverage),
        row.skipReason
    ])

    return (
        <div className={cls.tradeTableBlock}>
            <div className={cls.tradeTableToolbar}>
                <Text type='p' className={cls.tradeTableHint}>
                    Торговые параметры за {dateUtc}. По умолчанию показан Daily бакет; можно переключить бакет и
                    посмотреть его сделки отдельно.
                </Text>

                <PolicyBucketFilterToggle
                    value={bucketFilter}
                    onChange={setBucketFilter}
                    className={cls.bucketToggle}
                    ariaLabel='Фильтр торговой таблицы по бакету'
                />
            </div>

            {executedTrades.length === 0 && skippedDirectionalSignals.length === 0 && (
                <Text type='p' className={cls.tradeTableHint}>
                    По выбранному дню не было направленных сигналов для открытия сделок.
                </Text>
            )}

            {noExecutedTradesInDay && skippedDirectionalSignals.length > 0 && (
                <Text type='p' className={cls.tradeTableHint}>
                    Исполненных сделок нет ни в одной политике.{' '}
                    {summarizeSkipReasons(
                        filteredSkippedSignals.length > 0 ? filteredSkippedSignals : skippedDirectionalSignals
                    ) ?? 'Причины пропуска в отчёте не указаны.'}
                </Text>
            )}

            {!noExecutedTradesInDay && filteredExecutedTrades.length > 0 && (
                <ReportTableCard
                    title='Сделки по политикам'
                    description='История торговых параметров по каждому прогнозу и ветке с фильтрацией по бакету.'
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
                    В выбранном бакете сигналы были, но все сделки пропущены правилами исполнения (без открытия
                    позиции).
                </Text>
            )}

            {!noExecutedTradesInDay && filteredExecutedTrades.length === 0 && filteredSkippedSignals.length === 0 && (
                <Text type='p' className={cls.tradeTableHint}>
                    Для бакета {resolvePolicyBucketLabel(bucketFilter)} в этом дне строк сделок нет.
                </Text>
            )}

            {!noExecutedTradesInDay && filteredSkippedSignals.length > 0 && (
                <ReportTableCard
                    title='Сигналы без открытия сделки'
                    description='Направленные сигналы, которые не перешли в исполненную сделку.'
                    columns={skippedColumns}
                    rows={skippedRowsTable}
                    domId={`pred-skipped-signals-${dateUtc}`}
                />
            )}
        </div>
    )
}

function PredictionHistoryReportCard({ dateUtc, domId, trainingScope }: PredictionHistoryReportCardProps) {
    const requestDateUtc = `${dateUtc}T00:00:00Z`

    const { data, isLoading, isError, error } = useGetCurrentPredictionByDateQuery({
        dateUtc: requestDateUtc,
        set: HISTORY_SET,
        scope: trainingScope
    }, {
        refetchOnMountOrArgChange: true
    })

    if (isLoading) {
        return (
            <div id={domId} className={cls.reportCard}>
                <Text type='p'>Загружаю отчёт за {dateUtc}…</Text>
            </div>
        )
    }

    if (isError || !data) {
        const resolved = isError ? resolveAppError(error) : undefined

        return (
            <div id={domId} className={cls.reportCard}>
                <ErrorBlock
                    code={resolved?.code ?? 'UNKNOWN'}
                    title={resolved?.title ?? 'Не удалось загрузить отчёт'}
                    description={
                        resolved?.description ??
                        `Проверьте endpoint /current-prediction/by-date для даты ${dateUtc}, set=${HISTORY_SET}, scope=${trainingScope}.`
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
        parsedPolicyTrades = parsePolicyTradeRowsOrThrow(data)
    } catch (error) {
        policyTradesSchemaError = error instanceof Error ? error.message : String(error)
    }

    const sanitizedSections = sanitizeHistoryReportSectionsForView(data.sections)
    const reportForView =
        sanitizedSections.length === data.sections.length &&
        sanitizedSections.every((section, idx) => section === data.sections[idx])
            ? data
            : {
                  ...data,
                  sections: sanitizedSections
              }

    return (
        <div id={domId} className={cls.reportCard}>
            <SectionErrorBoundary
                name={`PredictionHistoryReport_${dateUtc}`}
                fallback={({ error: sectionError, reset }) => (
                    <ErrorBlock
                        code='CLIENT'
                        title={`Ошибка при отображении отчёта за ${dateUtc}`}
                        description='При отрисовке отчёта произошла ошибка на клиенте. Остальная часть страницы продолжает работать.'
                        details={sectionError.message}
                        onRetry={reset}
                        compact
                    />
                )}
            >
                <ReportDocumentView report={reportForView} />
            </SectionErrorBoundary>

            <SectionErrorBoundary
                name={`PredictionHistoryPolicyTrades_${dateUtc}`}
                fallback={({ error: sectionError, reset }) => (
                    <ErrorBlock
                        code='CLIENT'
                        title={`Ошибка при построении торговой таблицы за ${dateUtc}`}
                        description='Основной отчёт отрисован, но таблица сделок не построилась из-за несовместимых данных.'
                        details={sectionError.message}
                        onRetry={reset}
                        compact
                    />
                )}
            >
                {policyTradesSchemaError ? (
                    <ErrorBlock
                        code='DATA'
                        title={`Торговая таблица за ${dateUtc} несовместима с текущей схемой`}
                        description='Основной отчёт по дню доступен, но блок сделок не построен из-за нарушения схемы данных таблицы.'
                        details={policyTradesSchemaError}
                        compact
                    />
                ) : parsedPolicyTrades ? (
                    <PredictionPolicyTradesTable
                        report={data}
                        dateUtc={dateUtc}
                        executedTrades={parsedPolicyTrades.executedTrades}
                        skippedDirectionalSignals={parsedPolicyTrades.skippedDirectionalSignals}
                    />
                ) : (
                    <ErrorBlock
                        code='DATA'
                        title={`Торговая таблица за ${dateUtc} не инициализирована`}
                        description='Не удалось получить данные таблицы сделок для этой даты.'
                        details='[ui] Policy trade rows were not resolved.'
                        compact
                    />
                )}
            </SectionErrorBoundary>
        </div>
    )
}

function PredictionHistoryPageWithBoundary(props: PredictionHistoryPageProps) {
    const [trainingScope, setTrainingScope] = useState<CurrentPredictionTrainingScope>('full')
    const [historyWindow, setHistoryWindow] = useState<PredictionHistoryWindow>('365')
    const historyDays = resolveHistoryWindowDaysOrThrow(historyWindow)

    const {
        data,
        isLoading,
        isError,
        error,
        refetch
    } = useCurrentPredictionIndexQuery(HISTORY_SET, historyDays, trainingScope)
    const {
        data: allIndexData,
        isLoading: isAllIndexLoading,
        isError: isAllIndexError,
        error: allIndexError,
        refetch: refetchAllIndex
    } = useCurrentPredictionIndexQuery(HISTORY_SET, undefined, trainingScope)

    const allIndexResolvedError = isAllIndexError ? resolveAppError(allIndexError) : null
    const allIndexErrorMessage =
        allIndexResolvedError?.rawMessage ?? allIndexResolvedError?.description ?? null

    const hasData = Array.isArray(data)

    const handleRetry = () => {
        void refetch()
        void refetchAllIndex()
    }

    return (
        <PageDataBoundary
            isLoading={isLoading}
            isError={isError}
            error={error}
            hasData={hasData}
            onRetry={handleRetry}
            errorTitle={`Не удалось загрузить индекс истории прогнозов (${HISTORY_SET})`}
        >
            {data && (
                <PredictionHistoryPageInner
                    {...props}
                    index={data}
                    allIndex={allIndexData ?? null}
                    isAllIndexLoading={isAllIndexLoading}
                    allIndexErrorMessage={allIndexErrorMessage}
                    trainingScope={trainingScope}
                    onTrainingScopeChange={setTrainingScope}
                    historyWindow={historyWindow}
                    onHistoryWindowChange={setHistoryWindow}
                />
            )}
        </PageDataBoundary>
    )
}

export default function PredictionHistoryPage(props: PredictionHistoryPageProps) {
    return (
        <PageSuspense title='Загружаю историю прогнозов…'>
            <PredictionHistoryPageWithBoundary {...props} />
        </PageSuspense>
    )
}
