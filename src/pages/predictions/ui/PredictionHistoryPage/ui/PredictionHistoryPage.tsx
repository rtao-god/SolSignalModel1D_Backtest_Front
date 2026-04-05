import { memo, useCallback, useEffect, useMemo, useState } from 'react'
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
    ReportTimingSection,
    Text,
    type ReportViewControlGroup,
    formatTimingExactUtc,
    resolveCurrentPredictionTrainingScopeMeta
} from '@/shared/ui'
import { selectArrivalDate, selectDepartureDate } from '@/entities/date'
import cls from './PredictionHistoryPage.module.scss'
import DatePicker from '@/features/datePicker/ui/DatePicker/DatePicker'
import { ReportDocumentView } from '@/shared/ui/ReportDocumentView/ui/ReportDocumentView'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import {
    DEFAULT_BACKFILLED_HISTORY_SCOPE,
    type CurrentPredictionOosPresetCatalog,
    type CurrentPredictionOosPresetEntry,
    useCurrentPredictionHistoryPageQuery
} from '@/shared/api/tanstackQueries/currentPrediction'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import type {
    CurrentPredictionHistoryPageDto,
    CurrentPredictionSet,
    CurrentPredictionTrainingScope
} from '@/shared/api/endpoints/reportEndpoints'
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
import type { PolicyEvaluationDto } from '@/shared/types/policyEvaluation.types'
import type { TableRow } from '@/shared/ui/SortableTable'
import { tryParseNumberFromString } from '@/shared/ui/SortableTable'
import { useLocale } from '@/shared/lib/i18n'
import type { PredictionHistoryPageProps } from './types'
import { useTranslation } from 'react-i18next'
import { SectionDataState } from '@/shared/ui/errors/SectionDataState'
import { renderTermTooltipRichText } from '@/shared/ui/TermTooltip'
import { PredictionPageIntro } from '@/pages/predictions/ui/shared/PredictionPageIntro/PredictionPageIntro'
import { PredictionTrainingScopeDescriptionBlock } from '@/pages/predictions/ui/shared/PredictionTrainingScopeDescriptionBlock'
import { PredictionSliceTimelinePanel } from '@/pages/predictions/ui/shared/PredictionSliceTimeline'
import { readPredictionPageStringList } from '@/pages/predictions/ui/shared/predictionPageI18n'
import {
    resolveCurrentPredictionTimingSnapshot,
    resolveCurrentPredictionHistoryTimingStatus
} from '@/shared/utils/currentPredictionTiming'
import {
    localizeExitReasonLabel,
    resolveReportLiquidationFallbackLabel
} from '@/shared/utils/reportCellLocalization'
const PAGE_SIZE = 10
const IN_PAGE_SCROLL_STEP = 1
const HISTORY_SET: CurrentPredictionSet = 'backfilled'

function isTrainDiagnosticsScope(scope: CurrentPredictionTrainingScope): boolean {
    return scope === 'train'
}

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
interface PredictionHistoryPageInnerProps {
    className?: string
    historyPage: CurrentPredictionHistoryPageDto | null
    isHistoryPageLoading: boolean
    historyPageError: unknown
    onHistoryPageRetry: () => void
    pageIndex: number
    onPageIndexChange: (nextPageIndex: number) => void
    trainingScope: CurrentPredictionTrainingScope
    onTrainingScopeChange: (scope: CurrentPredictionTrainingScope) => void
    oosPresetCatalog: CurrentPredictionOosPresetCatalog | null
    selectedOosPresetKey: string | null
    onOosPresetChange: (presetKey: string) => void
    historyWindow: PredictionHistoryWindow
    onHistoryWindowChange: (window: PredictionHistoryWindow) => void
}

type ReportTableSectionView = TableSectionDto & { columns: string[]; columnKeys: string[]; rows: string[][] }
type ReportKeyValueSectionView = ReportSectionDto & { items: Array<{ itemKey?: string; key: string; value: string }> }

interface PolicyTradeRow {
    policyName: string
    branch: string
    bucket: PolicyBranchMegaBucketMode
    evaluation: PolicyEvaluationDto | null
    side: 'LONG' | 'SHORT'
    leverage: number
    entryPrice: number
    exitPrice: number
    exitReason: string
    tpPrice: number
    tpPct: number
    slPrice: number
    slPct: number
    liqPrice: number | null
    liqPriceLabel: string | null
    notionalUsd: number
    bucketCapitalUsd: number
    stakeUsd: number
    stakePct: number
}

interface PolicySkippedSignalRow {
    policyName: string
    branch: string
    bucket: PolicyBranchMegaBucketMode
    evaluation: PolicyEvaluationDto | null
    side: 'LONG' | 'SHORT'
    leverage: number
    skipReason: string
}

interface ParsedPolicyTradeRows {
    executedTrades: PolicyTradeRow[]
    skippedDirectionalSignals: PolicySkippedSignalRow[]
}

interface PredictionHistoryOosPresetOption {
    value: string
    label: string
    tooltip: string
}

function normalizeOosPresetKey(value: string | null | undefined): string | null {
    if (typeof value !== 'string') {
        return null
    }

    const normalized = value.trim()
    return normalized ? normalized : null
}

function findOosPresetEntry(
    catalog: CurrentPredictionOosPresetCatalog | null,
    presetKey: string | null | undefined
): CurrentPredictionOosPresetEntry | null {
    const normalizedPresetKey = normalizeOosPresetKey(presetKey)
    if (!catalog || !normalizedPresetKey) {
        return null
    }

    return catalog.entries.find(entry => entry.key === normalizedPresetKey) ?? null
}

function buildOosQuickPresetEntries(catalog: CurrentPredictionOosPresetCatalog | null): CurrentPredictionOosPresetEntry[] {
    if (!catalog) {
        return []
    }

    const entries: CurrentPredictionOosPresetEntry[] = []
    const seenKeys = new Set<string>()

    ;[
        catalog.defaultPrimaryPresetKey,
        catalog.defaultSecondaryPresetKey,
        catalog.fullOosPresetKey
    ].forEach(key => {
        const entry = findOosPresetEntry(catalog, key)
        if (!entry || seenKeys.has(entry.key)) {
            return
        }

        seenKeys.add(entry.key)
        entries.push(entry)
    })

    return entries
}

function formatTradeCountLabel(value: number, locale: string): string {
    if (!locale.toLowerCase().startsWith('ru')) {
        return `${value.toLocaleString(locale)} trades`
    }

    const absValue = Math.abs(value) % 100
    const lastDigit = absValue % 10

    if (absValue >= 11 && absValue <= 19) {
        return `${value.toLocaleString(locale)} сделок`
    }

    if (lastDigit === 1) {
        return `${value.toLocaleString(locale)} сделка`
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
        return `${value.toLocaleString(locale)} сделки`
    }

    return `${value.toLocaleString(locale)} сделок`
}

function formatDayCountLabel(value: number, locale: string): string {
    if (!locale.toLowerCase().startsWith('ru')) {
        return `${value.toLocaleString(locale)} days`
    }

    const absValue = Math.abs(value) % 100
    const lastDigit = absValue % 10

    if (absValue >= 11 && absValue <= 19) {
        return `${value.toLocaleString(locale)} дней`
    }

    if (lastDigit === 1) {
        return `${value.toLocaleString(locale)} день`
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
        return `${value.toLocaleString(locale)} дня`
    }

    return `${value.toLocaleString(locale)} дней`
}

function buildPredictionHistoryScopeDaysNote(value: number | null | undefined, locale: string): string {
    if (!Number.isInteger(value) || (value ?? 0) < 0) {
        return ''
    }

    const resolvedValue = value as number
    return ` (${formatDayCountLabel(resolvedValue, locale)})`
}

function resolveTrainDaysBeforeOosPreset(
    catalog: CurrentPredictionOosPresetCatalog,
    entry: CurrentPredictionOosPresetEntry
): number {
    const trainDays = catalog.historyTotalDays - entry.selectedDays
    if (!Number.isFinite(trainDays) || trainDays < 0) {
        throw new Error(
            `[ui] Invalid train-days complement for OOS preset. totalDays=${catalog.historyTotalDays}; selectedDays=${entry.selectedDays}.`
        )
    }

    return trainDays
}

function resolveTrainPercentBeforeOosPreset(entry: CurrentPredictionOosPresetEntry): number {
    const trainPercent = 100 - entry.requestedDaySharePercent
    if (!Number.isFinite(trainPercent) || trainPercent <= 0) {
        throw new Error(
            `[ui] Invalid train-percent complement for OOS preset. requestedDaySharePercent=${entry.requestedDaySharePercent}.`
        )
    }

    return trainPercent
}

function buildOosPresetShortLabel(
    catalog: CurrentPredictionOosPresetCatalog,
    entry: CurrentPredictionOosPresetEntry,
    locale: string
): string {
    return `OOS ${entry.requestedDaySharePercent}% (${formatDayCountLabel(entry.selectedDays, locale)})`
}

function buildOosPresetTooltip(
    catalog: CurrentPredictionOosPresetCatalog,
    entry: CurrentPredictionOosPresetEntry,
    locale: string
): string {
    const trainPercent = resolveTrainPercentBeforeOosPreset(entry)
    const trainDays = resolveTrainDaysBeforeOosPreset(catalog, entry)

    return `Показывает пользовательский OOS-хвост ${entry.requestedDaySharePercent}% полной истории: ${formatDayCountLabel(entry.selectedDays, locale)} за период с ${entry.startPredictionDateUtc} по ${entry.endPredictionDateUtc}.\n\nДополняющая обучающая часть перед ним занимает ${trainPercent}% полной истории: ${formatDayCountLabel(trainDays, locale)}.\n\nВнутри этого OOS-хвоста: ${formatTradeCountLabel(entry.selectedTradeCount, locale)}, ${entry.daysWithTrades.toLocaleString(locale)} дней со сделками и ${entry.daysWithoutTrades.toLocaleString(locale)} дней без сделок.`
}

function buildOosPresetSummary(
    catalog: CurrentPredictionOosPresetCatalog,
    entry: CurrentPredictionOosPresetEntry,
    locale: string
): string {
    const trainPercent = resolveTrainPercentBeforeOosPreset(entry)
    const trainDays = resolveTrainDaysBeforeOosPreset(catalog, entry)

    return `Сейчас открыт пользовательский OOS-хвост ${entry.requestedDaySharePercent}%: ${formatDayCountLabel(entry.selectedDays, locale)}. Перед ним остаётся Train ${trainPercent}%: ${formatDayCountLabel(trainDays, locale)}.`
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

function parseOptionalLabel(raw: unknown): string | null {
    if (raw === null || raw === undefined) {
        return null
    }

    const text = String(raw).trim()
    if (!text || text === '-') {
        return null
    }

    const normalized = text.toLowerCase()
    if (normalized === 'n/a' || normalized === 'na') {
        return null
    }

    return text
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

function formatLeverage(value: number, locale: string): string {
    if (!Number.isFinite(value) || value <= 0) {
        throw new Error(`[ui] Invalid leverage value for formatting: ${value}.`)
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

        for (const [rowIndex, row] of table.rows.entries()) {
            if (!Array.isArray(row)) {
                throw new Error('[ui] Invalid policy table row.')
            }

            const evaluation = table.rowEvaluations?.[rowIndex] ?? null

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
                    evaluation,
                    side: directionRaw,
                    leverage,
                    skipReason
                })
                continue
            }

            const entryPrice = parseNumber(row[entryIdx], 'Цена входа')
            const slPrice = parseNumber(row[slPriceIdx], 'Цена SL')
            const tpPrice = parseNumber(row[tpPriceIdx], 'Цена TP')
            const liqRaw = row[liqPriceIdx]
            const liqPrice = parseOptionalNumber(liqRaw)
            const liqPriceLabel = liqPrice === null ? parseOptionalLabel(liqRaw) : null
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
                evaluation,
                side: directionRaw,
                leverage,
                entryPrice,
                exitPrice,
                exitReason,
                tpPrice,
                tpPct: tpPctFromEntry,
                slPrice,
                slPct: slPctFromEntry,
                liqPrice,
                liqPriceLabel,
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

function PredictionHistoryPageInner({
    className,
    historyPage,
    isHistoryPageLoading,
    historyPageError,
    onHistoryPageRetry,
    pageIndex,
    onPageIndexChange,
    trainingScope,
    onTrainingScopeChange,
    oosPresetCatalog,
    selectedOosPresetKey,
    onOosPresetChange,
    historyWindow,
    onHistoryWindowChange
}: PredictionHistoryPageInnerProps) {
    const { t, i18n } = useTranslation('reports')
    const departure = useSelector(selectDepartureDate)
    const arrival = useSelector(selectArrivalDate)

    const fromDate = departure?.value ?? null
    const toDate = arrival?.value ?? null

    const [cardsAnimating, setCardsAnimating] = useState(false)
    const isTrainDiagnosticsMode = isTrainDiagnosticsScope(trainingScope)
    const trainingScopeStats = historyPage?.trainingScopeStats ?? null
    const trainDiagnosticsInterpolation = useMemo(() => {
        const locale = i18n.language.toLowerCase().startsWith('ru') ? 'ru-RU' : 'en-US'
        const oosPercent = trainingScopeStats?.oosHistoryDaySharePercent ?? 30
        const recentPercent = trainingScopeStats?.recentHistoryDaySharePercent ?? 15
        const trainPercent = 100 - oosPercent

        return {
            trainPercent: `${trainPercent}%`,
            oosPercent: `${oosPercent}%`,
            recentPercent: `${recentPercent}%`,
            trainDaysNote: buildPredictionHistoryScopeDaysNote(trainingScopeStats?.trainDays, locale),
            oosDaysNote: buildPredictionHistoryScopeDaysNote(trainingScopeStats?.oosDays, locale),
            recentDaysNote: buildPredictionHistoryScopeDaysNote(trainingScopeStats?.recentDays, locale)
        }
    }, [i18n.language, trainingScopeStats])
    const introBullets = useMemo(
        () => readPredictionPageStringList(i18n, 'predictionHistory.page.intro.bullets'),
        [i18n]
    )
    const trainDiagnosticsIntroBullets = useMemo(
        () =>
            readPredictionPageStringList(
                i18n,
                'predictionHistory.page.trainDiagnosticsIntro.bullets',
                trainDiagnosticsInterpolation
            ),
        [i18n, trainDiagnosticsInterpolation]
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
    const historyMinSelectableDate = useMemo(() => {
        const earliestBuiltDateKey = historyPage?.earliestBuiltPredictionDateUtc ?? null
        if (!earliestBuiltDateKey) {
            return null
        }

        const parsedEarliestBuiltDate = parseDateKey(earliestBuiltDateKey)
        if (!parsedEarliestBuiltDate) {
            throw new Error(`[ui] Failed to parse earliest prediction history date: ${earliestBuiltDateKey}.`)
        }

        return parsedEarliestBuiltDate
    }, [historyPage?.earliestBuiltPredictionDateUtc])
    const currentScopeMeta = resolveCurrentPredictionTrainingScopeMeta(trainingScope, trainingScopeStats)
    const trainingScopeDescription = useMemo(
        () => buildCurrentPredictionHistoryTrainingScopeDescription(trainingScopeStats),
        [trainingScopeStats]
    )
    const quickOosPresetEntries = useMemo(() => buildOosQuickPresetEntries(oosPresetCatalog), [oosPresetCatalog])
    const selectedOosPresetEntry = useMemo(
        () => findOosPresetEntry(oosPresetCatalog, selectedOosPresetKey),
        [oosPresetCatalog, selectedOosPresetKey]
    )
    const oosPresetOptions = useMemo<PredictionHistoryOosPresetOption[]>(
        () =>
            quickOosPresetEntries.map(entry => ({
                value: entry.key,
                label: buildOosPresetShortLabel(oosPresetCatalog!, entry, i18n.language),
                tooltip: buildOosPresetTooltip(oosPresetCatalog!, entry, i18n.language)
            })),
        [i18n.language, oosPresetCatalog, quickOosPresetEntries]
    )
    const selectedHistoryWindowMeta = historyWindowOptions.find(option => option.value === historyWindow)
    if (!selectedHistoryWindowMeta || !isPredictionHistoryWindow(selectedHistoryWindowMeta.value)) {
        throw new Error(`[ui] Unsupported prediction history window option: ${historyWindow}.`)
    }
    const controlGroups = useMemo(() => {
        const groups: ReportViewControlGroup[] = [
            buildTrainingScopeControlGroup({
                value: trainingScope,
                onChange: onTrainingScopeChange,
                label: t('predictionHistory.filters.scope.label'),
                ariaLabel: t('predictionHistory.filters.scope.ariaLabel'),
                infoTooltip: trainingScopeDescription,
                splitStats: historyPage?.trainingScopeStats ?? null
            })
        ]

        if (trainingScope === 'oos' && oosPresetOptions.length > 0 && selectedOosPresetEntry) {
            groups.push({
                key: 'prediction-oos-preset',
                label: t('predictionHistory.filters.oosPreset.label', {
                    defaultValue: 'Проверочный хвост'
                }),
                ariaLabel: t('predictionHistory.filters.oosPreset.ariaLabel', {
                    defaultValue: 'Выберите размер проверочного хвоста'
                }),
                infoTooltip: t('predictionHistory.filters.oosPreset.tooltip', {
                    defaultValue:
                        'Основной пользовательский хвост новых дней здесь равен OOS 30% / Train 70%. Короткий режим показывает OOS 15% / Train 85%. Переключение не пересчитывает прогнозы заново: страница просто открывает другой уже опубликованный хвост.'
                }),
                value: selectedOosPresetEntry.key,
                options: oosPresetOptions,
                onChange: onOosPresetChange
            })
        }

        groups.push(
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
        )

        return groups
    }, [
        historyWindow,
        historyWindowOptions,
        onHistoryWindowChange,
        onOosPresetChange,
        onTrainingScopeChange,
        oosPresetOptions,
        selectedOosPresetEntry,
        t,
        historyPage?.trainingScopeStats,
        trainingScope,
        trainingScopeDescription
    ])
    const totalPages = historyPage?.totalPages ?? 0
    const resolvedPage = historyPage?.page ?? 0
    const clampedPageIndex =
        totalPages > 0 && resolvedPage > 0 ? Math.min(Math.max(resolvedPage - 1, 0), totalPages - 1) : 0
    const visibleDates = useMemo(
        () => (historyPage?.items ?? []).map(item => item.predictionDateUtc),
        [historyPage?.items]
    )

    useEffect(() => {
        onPageIndexChange(0)
    }, [historyWindow, fromDate, onPageIndexChange, selectedOosPresetKey, toDate, trainingScope])

    useEffect(() => {
        if (!historyPage) {
            return
        }

        if (historyPage.filteredReports === 0) {
            if (pageIndex !== 0) {
                onPageIndexChange(0)
            }
            return
        }

        if (historyPage.page > 0 && historyPage.page !== pageIndex + 1) {
            onPageIndexChange(historyPage.page - 1)
        }
    }, [historyPage, onPageIndexChange, pageIndex])

    useEffect(() => {
        setCardsAnimating(false)
        const raf = requestAnimationFrame(() => setCardsAnimating(true))
        const t = window.setTimeout(() => setCardsAnimating(false), 260)

        return () => {
            cancelAnimationFrame(raf)
            window.clearTimeout(t)
        }
    }, [clampedPageIndex])
    const canPrev = historyPage?.hasPrevPage ?? false
    const canNext = historyPage?.hasNextPage ?? false
    const filteredCount = historyPage?.filteredReports ?? 0
    const visibleFrom = filteredCount > 0 && resolvedPage > 0 ? (resolvedPage - 1) * PAGE_SIZE + 1 : 0
    const visibleTo = filteredCount > 0 ? visibleFrom + visibleDates.length - 1 : 0

    const rootClassName = classNames(cls.HistoryPage, {}, [className ?? ''])

    const historyTag = `current_prediction_${HISTORY_SET}_${trainingScope}`
    const totalBuiltLabel =
        historyPage ? String(historyPage.totalBuiltReports) : t('predictionHistory.page.meta.loading')
    const missingBuiltLabel =
        historyPage ?
            t('predictionHistory.page.meta.missingBuilt', {
                missing: historyPage.missingBuiltWeekdays,
                expected: historyPage.expectedBuiltWeekdays,
                fromDateUtc: historyPage.missingBuiltFromDateUtc,
                toDateUtc: historyPage.missingBuiltToDateUtc
            })
        :   t('predictionHistory.page.meta.loading')
    const trainingLabel = resolveTrainingLabel(historyPage?.items[0]?.report)

    const cardSections = useMemo(
        () =>
            visibleDates.map(date => ({
                id: date,
                anchor: `pred-${date}-section-0`
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

    const handlePagePrev = () => onPageIndexChange(Math.max(pageIndex - 1, 0))
    const handlePageNext = () => onPageIndexChange(Math.min(pageIndex + 1, Math.max(totalPages - 1, 0)))

    return (
        <div className={rootClassName}>
            <header className={cls.header}>
                <div className={cls.headerMain}>
                    <Text type='h1'>
                        {isTrainDiagnosticsMode ?
                            t('predictionHistory.page.trainDiagnosticsTitle')
                        :   t('predictionHistory.page.title')}
                    </Text>
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
                    {trainingScope === 'oos' && selectedOosPresetEntry && (
                        <span>
                            {t('predictionHistory.page.meta.oosPreset', {
                                defaultValue: 'Проверочный хвост: {{value}}',
                                value:
                                    oosPresetCatalog ?
                                        buildOosPresetShortLabel(oosPresetCatalog, selectedOosPresetEntry, i18n.language)
                                    :   `OOS ${selectedOosPresetEntry.requestedDaySharePercent}%`
                            })}
                        </span>
                    )}
                    <span>
                        {t('predictionHistory.page.meta.trainingModel', {
                            value: trainingLabel ?? t('predictionHistory.page.meta.trainingModelFallback')
                        })}
                    </span>
                </div>
            </header>

            {/* История должна сначала объяснять, зачем нужен этот архив, а уже потом открывать фильтры, даты и карточки отчётов. */}
            <PredictionPageIntro
                title={
                    isTrainDiagnosticsMode ?
                        t('predictionHistory.page.trainDiagnosticsIntro.title')
                    :   t('predictionHistory.page.intro.title')
                }
                lead={
                    isTrainDiagnosticsMode ?
                        t('predictionHistory.page.trainDiagnosticsIntro.lead', trainDiagnosticsInterpolation)
                    :   t('predictionHistory.page.intro.lead')
                }
                bullets={isTrainDiagnosticsMode ? trainDiagnosticsIntroBullets : introBullets}
                renderText={renderIntroText}
            />

            <PredictionTrainingScopeDescriptionBlock variant='history' description={trainingScopeDescription} />
            <PredictionSliceTimelinePanel
                primaryStats={trainingScopeStats}
                activeScope={trainingScope}
                isPrimaryLoading={isHistoryPageLoading}
            />

            <section className={cls.filters}>
                <div className={cls.controlsPanel}>
                    <ReportViewControls groups={controlGroups} className={cls.filtersControls} />
                    <Text type='p' className={cls.controlHint}>
                        {currentScopeMeta.hint}
                    </Text>
                    {trainingScope === 'oos' && selectedOosPresetEntry && (
                        <Text type='p' className={cls.controlHint}>
                            {oosPresetCatalog ?
                                buildOosPresetSummary(oosPresetCatalog, selectedOosPresetEntry, i18n.language)
                            :   `Сейчас открыт пользовательский OOS-хвост ${selectedOosPresetEntry.requestedDaySharePercent}%.`}
                        </Text>
                    )}
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
                    isLoading={isHistoryPageLoading}
                    isError={Boolean(historyPageError)}
                    error={historyPageError}
                    hasData={Boolean(historyPage)}
                    onRetry={onHistoryPageRetry}
                    title={
                        historyPageError ?
                            t('predictionHistory.page.indexErrorTitle', { reportSet: HISTORY_SET })
                        :   t('predictionHistory.page.emptyIndex.title')
                    }
                    description={historyPageError ? undefined : t('predictionHistory.page.emptyIndex.description')}
                    loadingText={t('predictionHistory.page.loadingTitle')}
                    logContext={{
                        source: 'prediction-history-page',
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
                                {canNext ?
                                    <button
                                        type='button'
                                        className={cls.paginationButton}
                                        onClick={handlePageNext}
                                        aria-label={t('predictionHistory.pagination.nextAria')}>
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

                                {canPrev ?
                                    <button
                                        type='button'
                                        className={cls.paginationButton}
                                        onClick={handlePagePrev}
                                        aria-label={t('predictionHistory.pagination.prevAria')}>
                                        <Icon name='arrow' />
                                    </button>
                                :   <span className={cls.paginationSpacer} aria-hidden='true' />}
                            </div>

                            <div className={classNames(cls.cards, { [cls.cardsAnimating]: cardsAnimating }, [])}>
                                {(historyPage?.items ?? []).map(item => (
                                    <MemoizedPredictionHistoryReportCard
                                        key={`${trainingScope}-${selectedOosPresetKey ?? 'all'}-${item.predictionDateUtc}`}
                                        dateUtc={item.predictionDateUtc}
                                        report={item.report}
                                        domId={`pred-${item.predictionDateUtc}`}
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
                                canGroupPrev={canNext}
                                canGroupNext={canPrev}
                                onGroupPrev={handlePageNext}
                                onGroupNext={handlePagePrev}
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
    report: ReportDocumentDto
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

function resolveColumnLabel(
    translate: (key: string, options?: Record<string, unknown>) => string,
    key: string,
    fallback: string
): string {
    const resolved = translate(key)
    return resolved === key ? fallback : resolved
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
    const { t, i18n } = useTranslation('reports')
    const { intlLocale } = useLocale()
    const isRu = (i18n.resolvedLanguage ?? i18n.language).startsWith('ru')
    const reportLanguage = i18n.resolvedLanguage ?? i18n.language
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

    const leverageColumnLabel = resolveColumnLabel(
        translate,
        'predictionHistory.tradesTable.columns.leverage',
        isRu ? 'Плечо' : 'Leverage'
    )

    const columns = [
        t('predictionHistory.tradesTable.columns.policy'),
        t('predictionHistory.tradesTable.columns.branch'),
        t('predictionHistory.tradesTable.columns.side'),
        leverageColumnLabel,
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
        formatLeverage(row.leverage, intlLocale),
        formatPrice(row.entryPrice, intlLocale),
        formatPrice(row.exitPrice, intlLocale),
        localizeExitReasonLabel(row.exitReason, reportLanguage) ?? row.exitReason,
        formatPrice(row.tpPrice, intlLocale),
        formatPercent(row.tpPct, intlLocale),
        formatPrice(row.slPrice, intlLocale),
        formatPercent(row.slPct, intlLocale),
        row.liqPrice !== null ?
            formatPrice(row.liqPrice, intlLocale)
        :   resolveReportLiquidationFallbackLabel(
                {
                    liqPriceLabel: row.liqPriceLabel,
                    leverage: row.leverage,
                    policyName: row.policyName,
                    branch: row.branch,
                    bucket: row.bucket,
                    notionalUsd: row.notionalUsd,
                    bucketCapitalUsd: row.bucketCapitalUsd,
                    stakeUsd: row.stakeUsd
                },
                reportLanguage,
                translate
            ),
        formatMoney(row.notionalUsd, intlLocale),
        formatMoney(row.bucketCapitalUsd, intlLocale),
        formatMoney(row.stakeUsd, intlLocale),
        formatPercent(row.stakePct, intlLocale)
    ])

    const skippedColumns = [
        t('predictionHistory.tradesTable.skippedColumns.policy'),
        t('predictionHistory.tradesTable.skippedColumns.branch'),
        t('predictionHistory.tradesTable.skippedColumns.side'),
        leverageColumnLabel,
        t('predictionHistory.tradesTable.skippedColumns.reason')
    ]
    const skippedRowsTable: TableRow[] = filteredSkippedSignals.map(row => [
        row.policyName,
        row.branch,
        row.side,
        formatLeverage(row.leverage, intlLocale),
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
                    rowEvaluations={filteredExecutedTrades.map(row => row.evaluation)}
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
                    rowEvaluations={filteredSkippedSignals.map(row => row.evaluation)}
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

interface PredictionHistoryTimingPanelProps {
    dateUtc: string
    timingSnapshot: ReturnType<typeof resolveCurrentPredictionTimingSnapshot>
    trainingScopeLabel: string
    isRu: boolean
}

function PredictionHistoryTimingPanel({
    dateUtc,
    timingSnapshot,
    trainingScopeLabel,
    isRu
}: PredictionHistoryTimingPanelProps) {
    const timingLocale = isRu ? 'ru-RU' : 'en-US'
    const timingStatus = useMemo(() => resolveCurrentPredictionHistoryTimingStatus(timingSnapshot, isRu), [isRu, timingSnapshot])
    const timingCards = useMemo(
        () => [
            {
                id: `${dateUtc}-report-built`,
                label: isRu ? 'Сборка отчёта' : 'Report build',
                displayValue: formatTimingExactUtc(timingSnapshot.generatedAtUtc, timingLocale),
                rows: [
                    {
                        label: isRu ? 'Дата прогноза' : 'Forecast day',
                        value: timingSnapshot.predictionDateUtc ?? dateUtc
                    },
                    {
                        label: isRu ? 'Собран' : 'Built at',
                        value: formatTimingExactUtc(timingSnapshot.generatedAtUtc, timingLocale)
                    }
                ]
            },
            {
                id: `${dateUtc}-entry-window`,
                label: isRu ? 'Открытие торгового окна' : 'Trading window open',
                displayValue:
                    timingSnapshot.entryUtc ? formatTimingExactUtc(timingSnapshot.entryUtc, timingLocale)
                    : isRu ? 'нет в отчёте'
                    : 'missing in report',
                headline: isRu ? 'Время входа недоступно' : 'Entry time is unavailable',
                rows: [
                    {
                        label: isRu ? 'Открытие' : 'Opened at',
                        value:
                            timingSnapshot.entryUtc ? formatTimingExactUtc(timingSnapshot.entryUtc, timingLocale)
                            : isRu ? 'нет в отчёте'
                            : 'missing in report'
                    }
                ]
            },
            {
                id: `${dateUtc}-exit-window`,
                label: isRu ? 'Закрытие окна факта' : 'Factual window close',
                displayValue:
                    timingSnapshot.exitUtc ? formatTimingExactUtc(timingSnapshot.exitUtc, timingLocale)
                    : isRu ? 'нет в отчёте'
                    : 'missing in report',
                headline: isRu ? 'Время закрытия недоступно' : 'Close time is unavailable',
                rows: [
                    {
                        label: isRu ? 'Закрытие' : 'Closed at',
                        value:
                            timingSnapshot.exitUtc ? formatTimingExactUtc(timingSnapshot.exitUtc, timingLocale)
                            : isRu ? 'нет в отчёте'
                            : 'missing in report'
                    },
                    {
                        label: isRu ? 'Режим' : 'Scope',
                        value: trainingScopeLabel
                    }
                ]
            }
        ],
        [dateUtc, isRu, timingLocale, timingSnapshot, trainingScopeLabel]
    )

    return (
        <ReportTimingSection
            title={isRu ? 'Тайминг даты прогноза' : 'Forecast day timing'}
            subtitle={
                isRu ?
                    'Блок показывает, когда исторический день был собран, во сколько открылось окно и когда закончился фактический интервал.'
                :   'This block shows when the historical day was built, when its window opened, and when the factual interval ended.'
            }
            statusText={timingStatus.text}
            statusTone={timingStatus.tone}
            cards={timingCards}
            locale={timingLocale}
            remainingLabel={isRu ? 'осталось' : 'remaining'}
            overdueLabel={isRu ? 'после срока' : 'overdue'}
        />
    )
}

function PredictionHistoryReportCard({ dateUtc, report, domId, trainingScope }: PredictionHistoryReportCardProps) {
    const { t, i18n } = useTranslation('reports')
    const trainingScopeMeta = resolveCurrentPredictionTrainingScopeMeta(trainingScope)
    const isRu = (i18n.resolvedLanguage ?? i18n.language).startsWith('ru')
    const showsPolicyTradeTables = !isTrainDiagnosticsScope(trainingScope)

    const parsedPolicyTradesState = useMemo(() => {
        if (!showsPolicyTradeTables) {
            return {
                value: null as ParsedPolicyTradeRows | null,
                error: null as string | null
            }
        }

        try {
            return {
                value: parsePolicyTradeRows(report),
                error: null as string | null
            }
        } catch (error) {
            return {
                value: null as ParsedPolicyTradeRows | null,
                error: error instanceof Error ? error.message : String(error)
            }
        }
    }, [report, showsPolicyTradeTables])
    const timingSnapshot = useMemo(() => resolveCurrentPredictionTimingSnapshot(report, dateUtc), [dateUtc, report])
    const reportForView = useMemo(() => {
        const sanitizedSections = sanitizeHistoryReportSectionsForView(report.sections)
        return (
                sanitizedSections.length === report.sections.length &&
                    sanitizedSections.every((section, idx) => section === report.sections[idx])
            ) ?
                report
            :   {
                    ...report,
                    sections: sanitizedSections
                }
    }, [report])
    const documentFreshness = useMemo(
        () => ({
            statusMode: 'actual' as const,
            statusTitle: t('predictionHistory.reportCard.status.title'),
            statusMessage: t('predictionHistory.reportCard.status.message', {
                dateUtc,
                mode: trainingScopeMeta.label
            })
        }),
        [dateUtc, t, trainingScopeMeta.label]
    )

    return (
        <div id={domId} className={cls.reportCard}>
            <PredictionHistoryTimingPanel
                dateUtc={dateUtc}
                timingSnapshot={timingSnapshot}
                trainingScopeLabel={trainingScopeMeta.label}
                isRu={isRu}
            />

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
                <ReportDocumentView
                    report={reportForView}
                    freshness={documentFreshness}
                    showTableTermsBlock={false}
                    sectionDomIdPrefix={`pred-${dateUtc}`}
                />
            </SectionErrorBoundary>

            {showsPolicyTradeTables && (
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
                    {parsedPolicyTradesState.error ?
                        <ErrorBlock
                            code='DATA'
                            title={t('predictionHistory.reportCard.tradesSchemaErrorTitle', { dateUtc })}
                            description={t('predictionHistory.reportCard.tradesSchemaErrorDescription')}
                            details={parsedPolicyTradesState.error}
                            compact
                        />
                    : parsedPolicyTradesState.value ?
                        <PredictionPolicyTradesTable
                            report={report}
                            dateUtc={dateUtc}
                            executedTrades={parsedPolicyTradesState.value.executedTrades}
                            skippedDirectionalSignals={parsedPolicyTradesState.value.skippedDirectionalSignals}
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
            )}
        </div>
    )
}

const MemoizedPredictionHistoryReportCard = memo(PredictionHistoryReportCard)

function PredictionHistoryPageWithBoundary(props: PredictionHistoryPageProps) {
    const [trainingScope, setTrainingScope] = useState<CurrentPredictionTrainingScope>(DEFAULT_BACKFILLED_HISTORY_SCOPE)
    const [selectedOosPresetKey, setSelectedOosPresetKey] = useState<string | null>(null)
    const [knownOosPresetCatalog, setKnownOosPresetCatalog] = useState<CurrentPredictionOosPresetCatalog | null>(null)
    const [historyWindow, setHistoryWindow] = useState<PredictionHistoryWindow>('365')
    const departure = useSelector(selectDepartureDate)
    const arrival = useSelector(selectArrivalDate)
    const historyDays = resolveHistoryWindowDays(historyWindow)
    const [pageIndex, setPageIndex] = useState(0)
    const resolvedSelectedOosPresetKey =
        trainingScope === 'oos' ?
            normalizeOosPresetKey(selectedOosPresetKey) ??
            normalizeOosPresetKey(knownOosPresetCatalog?.defaultPrimaryPresetKey)
        :   null

    // История читает только открытую страницу с выбранным окном и не запускает скрытую подзагрузку соседних страниц.
    const { data, isLoading, isError, error, refetch } = useCurrentPredictionHistoryPageQuery({
        set: HISTORY_SET,
        scope: trainingScope,
        page: pageIndex + 1,
        pageSize: PAGE_SIZE,
        days: historyDays,
        fromDateUtc: departure?.value ?? undefined,
        toDateUtc: arrival?.value ?? undefined,
        oosPresetKey: resolvedSelectedOosPresetKey ?? undefined
    })
    const currentOosPresetCatalog = data?.trainingScopeStats?.oosPresetCatalog ?? knownOosPresetCatalog

    useEffect(() => {
        const nextCatalog = data?.trainingScopeStats?.oosPresetCatalog ?? null
        if (nextCatalog) {
            setKnownOosPresetCatalog(nextCatalog)
        }
    }, [data?.trainingScopeStats?.oosPresetCatalog])

    useEffect(() => {
        if (trainingScope !== 'oos' || !currentOosPresetCatalog) {
            return
        }

        if (findOosPresetEntry(currentOosPresetCatalog, selectedOosPresetKey)) {
            return
        }

        setSelectedOosPresetKey(currentOosPresetCatalog.defaultPrimaryPresetKey)
    }, [currentOosPresetCatalog, selectedOosPresetKey, trainingScope])

    const handleTrainingScopeChange = useCallback(
        (nextScope: CurrentPredictionTrainingScope) => {
            setTrainingScope(nextScope)

            if (nextScope !== 'oos') {
                return
            }

            const nextPresetKey =
                normalizeOosPresetKey(selectedOosPresetKey) ??
                normalizeOosPresetKey(currentOosPresetCatalog?.defaultPrimaryPresetKey)
            if (nextPresetKey) {
                setSelectedOosPresetKey(nextPresetKey)
            }
        },
        [currentOosPresetCatalog?.defaultPrimaryPresetKey, selectedOosPresetKey]
    )

    const handleRetry = () => {
        void refetch()
    }

    return (
        <PredictionHistoryPageInner
            {...props}
            historyPage={data ?? null}
            isHistoryPageLoading={isLoading}
            historyPageError={isError ? error : null}
            onHistoryPageRetry={handleRetry}
            trainingScope={trainingScope}
            onTrainingScopeChange={handleTrainingScopeChange}
            oosPresetCatalog={currentOosPresetCatalog}
            selectedOosPresetKey={resolvedSelectedOosPresetKey}
            onOosPresetChange={setSelectedOosPresetKey}
            historyWindow={historyWindow}
            onHistoryWindowChange={setHistoryWindow}
            pageIndex={pageIndex}
            onPageIndexChange={setPageIndex}
        />
    )
}

export default function PredictionHistoryPage(props: PredictionHistoryPageProps) {
    return <PredictionHistoryPageWithBoundary {...props} />
}
