import { useQuery, type QueryClient, type UseQueryResult } from '@tanstack/react-query'
import { API_BASE_URL } from '../../configs/config'
import { API_ROUTES } from '../routes'
import { mapReportResponse } from '../utils/mapReportResponse'
import {
    normalizeUtcDayKey as normalizeDomainUtcDayKey,
    normalizeUtcInstant as normalizeDomainUtcInstant
} from '../utils/normalizeDomainTime'
import type { CurrentPredictionTrainingScope } from '../endpoints/reportEndpoints'
import type {
    RealForecastJournalActualDayDto,
    RealForecastJournalDayListItemDto,
    RealForecastJournalDayRecordDto,
    RealForecastJournalDayStatus,
    RealForecastJournalFinalizeRecordDto,
    RealForecastJournalIndicatorSnapshotDto,
    RealForecastJournalIndicatorValueDto,
    RealForecastJournalLiveRowObservationDto,
    RealForecastJournalLiveRowStatus,
    RealForecastJournalLiveStatusDto,
    RealForecastJournalMarginMode,
    RealForecastJournalOpsCheckpointDto,
    RealForecastJournalOpsHealthStatus,
    RealForecastJournalOpsStatusDto,
    RealForecastJournalPolicyRowDto,
    RealForecastJournalPolicyBucket,
    RealForecastJournalProbabilityDto,
    RealForecastJournalSnapshotDto
} from '@/shared/types/realForecastJournal.types'

const REAL_FORECAST_JOURNAL_QUERY_KEY = ['real-forecast-journal'] as const
const { dayList, byDate, liveStatus, opsStatus } = API_ROUTES.realForecastJournal
const REAL_FORECAST_JOURNAL_TIME_SCOPE = { scope: 'real-forecast-journal' } as const

export interface RealForecastJournalDayListQueryArgs {
    days?: number
}

export interface RealForecastJournalDayQueryArgs {
    dateUtc: string
}

interface RealForecastJournalDayListQueryOptions {
    enabled?: boolean
}

interface RealForecastJournalDayQueryOptions {
    enabled?: boolean
}

interface RealForecastJournalOpsStatusQueryOptions {
    enabled?: boolean
}

interface RealForecastJournalLiveStatusQueryOptions {
    enabled?: boolean
}

function toObject(value: unknown, label: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`[real-forecast-journal] ${label} must be an object.`)
    }

    return value as Record<string, unknown>
}

function readRequiredField(raw: Record<string, unknown>, label: string, ...keys: string[]): unknown {
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(raw, key)) {
            return raw[key]
        }
    }

    throw new Error(`[real-forecast-journal] ${label} is missing.`)
}

function readOptionalField(raw: Record<string, unknown>, ...keys: string[]): unknown {
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(raw, key)) {
            return raw[key]
        }
    }

    return undefined
}

function toNonEmptyString(value: unknown, label: string): string {
    if (typeof value !== 'string' || !value.trim()) {
        throw new Error(`[real-forecast-journal] ${label} must be a non-empty string.`)
    }

    return value.trim()
}

function toOptionalStringOrNull(value: unknown): string | null {
    if (value === null || typeof value === 'undefined') {
        return null
    }

    if (typeof value !== 'string') {
        throw new Error('[real-forecast-journal] optional string field has unsupported value.')
    }

    const normalized = value.trim()
    return normalized.length > 0 ? normalized : null
}

function toFiniteNumber(value: unknown, label: string): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value
    }

    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value)
        if (Number.isFinite(parsed)) {
            return parsed
        }
    }

    throw new Error(`[real-forecast-journal] ${label} must be a finite number.`)
}

function toOptionalFiniteNumberOrNull(value: unknown): number | null {
    if (value === null || typeof value === 'undefined') {
        return null
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        return value
    }

    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value)
        if (Number.isFinite(parsed)) {
            return parsed
        }
    }

    throw new Error('[real-forecast-journal] optional numeric field has unsupported value.')
}

function toBoolean(value: unknown, label: string): boolean {
    if (typeof value === 'boolean') {
        return value
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase()
        if (normalized === 'true') return true
        if (normalized === 'false') return false
    }

    throw new Error(`[real-forecast-journal] ${label} must be boolean-like.`)
}

function toOptionalBooleanOrNull(value: unknown): boolean | null {
    if (value === null || typeof value === 'undefined') {
        return null
    }

    if (typeof value === 'boolean') {
        return value
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase()
        if (normalized === 'true') return true
        if (normalized === 'false') return false
    }

    throw new Error('[real-forecast-journal] optional boolean field has unsupported value.')
}

function normalizeUtcDayKey(value: unknown, label: string): string {
    return normalizeDomainUtcDayKey(value, label, REAL_FORECAST_JOURNAL_TIME_SCOPE)
}

function normalizeUtcInstant(value: unknown, label: string): string {
    return normalizeDomainUtcInstant(value, label, REAL_FORECAST_JOURNAL_TIME_SCOPE)
}

function resolveTrainingScope(value: unknown): CurrentPredictionTrainingScope {
    if (typeof value === 'number') {
        if (value === 0) return 'train'
        if (value === 1) return 'full'
        if (value === 2) return 'oos'
        if (value === 3) return 'recent'
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase()
        if (normalized === 'train') return 'train'
        if (normalized === 'full') return 'full'
        if (normalized === 'oos') return 'oos'
        if (normalized === 'recent') return 'recent'
    }

    throw new Error(`[real-forecast-journal] unsupported training scope: ${String(value)}.`)
}

function resolveStatus(value: unknown): RealForecastJournalDayStatus {
    if (typeof value === 'number') {
        if (value === 0) return 'scheduled'
        if (value === 1) return 'captured'
        if (value === 2) return 'finalized'
        if (value === 3) return 'missed_capture'
        if (value === 4) return 'recovered_exception'
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase()
        if (normalized === 'scheduled') return 'scheduled'
        if (normalized === 'captured') return 'captured'
        if (normalized === 'finalized') return 'finalized'
        if (normalized === 'missed_capture') return 'missed_capture'
        if (normalized === 'recovered_exception') return 'recovered_exception'
    }

    throw new Error(`[real-forecast-journal] unsupported journal status: ${String(value)}.`)
}

function resolveOpsHealth(value: unknown): RealForecastJournalOpsHealthStatus {
    if (typeof value === 'number') {
        if (value === 0) return 'starting'
        if (value === 1) return 'healthy'
        if (value === 2) return 'degraded'
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase()
        if (normalized === 'starting') return 'starting'
        if (normalized === 'healthy') return 'healthy'
        if (normalized === 'degraded') return 'degraded'
    }

    throw new Error(`[real-forecast-journal] unsupported ops health status: ${String(value)}.`)
}

function resolveLiveRowStatus(value: unknown): RealForecastJournalLiveRowStatus {
    if (typeof value === 'number') {
        if (value === 0) return 'not-tracked'
        if (value === 1) return 'open'
        if (value === 2) return 'take-profit-hit'
        if (value === 3) return 'stop-loss-hit'
        if (value === 4) return 'liquidation-hit'
        if (value === 5) return 'end-of-day'
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase()
        if (normalized === 'nottracked' || normalized === 'not-tracked') return 'not-tracked'
        if (normalized === 'open') return 'open'
        if (normalized === 'takeprofithit' || normalized === 'take-profit-hit') return 'take-profit-hit'
        if (normalized === 'stoplosshit' || normalized === 'stop-loss-hit') return 'stop-loss-hit'
        if (normalized === 'liquidationhit' || normalized === 'liquidation-hit') return 'liquidation-hit'
        if (normalized === 'endofday' || normalized === 'end-of-day') return 'end-of-day'
    }

    throw new Error(`[real-forecast-journal] unsupported live row status: ${String(value)}.`)
}

function resolveMarginModeOrNull(value: unknown): RealForecastJournalMarginMode | null {
    if (value === null || typeof value === 'undefined') {
        return null
    }

    if (typeof value === 'number') {
        if (value === 0) return 'cross'
        if (value === 1) return 'isolated'
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase()
        if (normalized === 'cross') return 'cross'
        if (normalized === 'isolated') return 'isolated'
    }

    throw new Error(`[real-forecast-journal] unsupported margin mode: ${String(value)}.`)
}

function resolvePolicyBucket(value: unknown, label: string): RealForecastJournalPolicyBucket {
    const normalized = toNonEmptyString(value, label).toLowerCase()
    if (normalized === 'daily') return 'daily'
    if (normalized === 'intraday') return 'intraday'
    if (normalized === 'delayed') return 'delayed'

    throw new Error(`[real-forecast-journal] unsupported policy bucket: ${normalized}.`)
}

function mapProbability(value: unknown, label: string): RealForecastJournalProbabilityDto {
    const raw = toObject(value, label)

    return {
        up: toFiniteNumber(readRequiredField(raw, `${label}.up`, 'up', 'Up'), `${label}.up`),
        flat: toFiniteNumber(readRequiredField(raw, `${label}.flat`, 'flat', 'Flat'), `${label}.flat`),
        down: toFiniteNumber(readRequiredField(raw, `${label}.down`, 'down', 'Down'), `${label}.down`)
    }
}

function mapActualDayOrNull(value: unknown, label: string): RealForecastJournalActualDayDto | null {
    if (value === null || typeof value === 'undefined') {
        return null
    }

    const raw = toObject(value, label)

    return {
        trueLabel: toFiniteNumber(
            readRequiredField(raw, `${label}.trueLabel`, 'trueLabel', 'TrueLabel'),
            `${label}.trueLabel`
        ),
        entry: toFiniteNumber(readRequiredField(raw, `${label}.entry`, 'entry', 'Entry'), `${label}.entry`),
        maxHigh24: toFiniteNumber(
            readRequiredField(raw, `${label}.maxHigh24`, 'maxHigh24', 'MaxHigh24'),
            `${label}.maxHigh24`
        ),
        minLow24: toFiniteNumber(
            readRequiredField(raw, `${label}.minLow24`, 'minLow24', 'MinLow24'),
            `${label}.minLow24`
        ),
        close24: toFiniteNumber(readRequiredField(raw, `${label}.close24`, 'close24', 'Close24'), `${label}.close24`),
        minMove: toFiniteNumber(readRequiredField(raw, `${label}.minMove`, 'minMove', 'MinMove'), `${label}.minMove`)
    }
}

function mapPolicyRow(value: unknown, index: number): RealForecastJournalPolicyRowDto {
    const raw = toObject(value, `policyRows[${index}]`)

    return {
        policyName: toNonEmptyString(readRequiredField(raw, 'policyName', 'policyName', 'PolicyName'), 'policyName'),
        branch: toNonEmptyString(readRequiredField(raw, 'branch', 'branch', 'Branch'), 'branch'),
        bucket: resolvePolicyBucket(readRequiredField(raw, 'bucket', 'bucket', 'Bucket'), 'bucket'),
        margin: resolveMarginModeOrNull(readOptionalField(raw, 'margin', 'Margin')),
        isRiskDay: toBoolean(readRequiredField(raw, 'isRiskDay', 'isRiskDay', 'IsRiskDay'), 'isRiskDay'),
        hasDirection: toBoolean(readRequiredField(raw, 'hasDirection', 'hasDirection', 'HasDirection'), 'hasDirection'),
        skipped: toBoolean(readRequiredField(raw, 'skipped', 'skipped', 'Skipped'), 'skipped'),
        direction: toNonEmptyString(readRequiredField(raw, 'direction', 'direction', 'Direction'), 'direction'),
        leverage: toFiniteNumber(readRequiredField(raw, 'leverage', 'leverage', 'Leverage'), 'leverage'),
        entry: toFiniteNumber(readRequiredField(raw, 'entry', 'entry', 'Entry'), 'entry'),
        slPct: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'slPct', 'SlPct')),
        tpPct: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'tpPct', 'TpPct')),
        slPrice: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'slPrice', 'SlPrice')),
        tpPrice: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'tpPrice', 'TpPrice')),
        notionalUsd: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'notionalUsd', 'NotionalUsd')),
        positionQty: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'positionQty', 'PositionQty')),
        liqPrice: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'liqPrice', 'LiqPrice')),
        liqDistPct: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'liqDistPct', 'LiqDistPct')),
        bucketCapitalUsd: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'bucketCapitalUsd', 'BucketCapitalUsd')),
        stakeUsd: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'stakeUsd', 'StakeUsd')),
        stakePct: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'stakePct', 'StakePct')),
        exitPrice: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'exitPrice', 'ExitPrice')),
        exitReason: toNonEmptyString(readRequiredField(raw, 'exitReason', 'exitReason', 'ExitReason'), 'exitReason'),
        exitPnlPct: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'exitPnlPct', 'ExitPnlPct')),
        trades: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'trades', 'Trades')),
        totalPnlPct: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'totalPnlPct', 'TotalPnlPct')),
        maxDdPct: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'maxDdPct', 'MaxDdPct')),
        hadLiquidation: toOptionalBooleanOrNull(readOptionalField(raw, 'hadLiquidation', 'HadLiquidation')),
        withdrawnTotal: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'withdrawnTotal', 'WithdrawnTotal'))
    }
}

function mapSnapshot(value: unknown, label: string): RealForecastJournalSnapshotDto {
    const raw = toObject(value, label)

    const rawPolicyRows = readRequiredField(raw, `${label}.policyRows`, 'policyRows', 'PolicyRows')
    if (!Array.isArray(rawPolicyRows)) {
        throw new Error(`[real-forecast-journal] ${label}.policyRows must be an array.`)
    }

    return {
        generatedAtUtc: normalizeUtcInstant(
            readRequiredField(raw, `${label}.generatedAtUtc`, 'generatedAtUtc', 'GeneratedAtUtc'),
            `${label}.generatedAtUtc`
        ),
        predictionDateUtc: normalizeUtcDayKey(
            readRequiredField(raw, `${label}.predictionDateUtc`, 'predictionDateUtc', 'PredictionDateUtc'),
            `${label}.predictionDateUtc`
        ),
        asOfUtc: normalizeUtcInstant(
            readRequiredField(raw, `${label}.asOfUtc`, 'asOfUtc', 'AsOfUtc'),
            `${label}.asOfUtc`
        ),
        dataCutoffUtc: normalizeUtcInstant(
            readRequiredField(raw, `${label}.dataCutoffUtc`, 'dataCutoffUtc', 'DataCutoffUtc'),
            `${label}.dataCutoffUtc`
        ),
        entryUtc: normalizeUtcInstant(
            readRequiredField(raw, `${label}.entryUtc`, 'entryUtc', 'EntryUtc'),
            `${label}.entryUtc`
        ),
        exitUtc: normalizeUtcInstant(
            readRequiredField(raw, `${label}.exitUtc`, 'exitUtc', 'ExitUtc'),
            `${label}.exitUtc`
        ),
        predLabel: toFiniteNumber(
            readRequiredField(raw, `${label}.predLabel`, 'predLabel', 'PredLabel'),
            `${label}.predLabel`
        ),
        predLabelDisplay: toNonEmptyString(
            readRequiredField(raw, `${label}.predLabelDisplay`, 'predLabelDisplay', 'PredLabelDisplay'),
            `${label}.predLabelDisplay`
        ),
        microDisplay: toNonEmptyString(
            readRequiredField(raw, `${label}.microDisplay`, 'microDisplay', 'MicroDisplay'),
            `${label}.microDisplay`
        ),
        pTotal: mapProbability(readRequiredField(raw, `${label}.pTotal`, 'pTotal', 'PTotal'), `${label}.pTotal`),
        confDay: toFiniteNumber(readRequiredField(raw, `${label}.confDay`, 'confDay', 'ConfDay'), `${label}.confDay`),
        confMicro: toFiniteNumber(
            readRequiredField(raw, `${label}.confMicro`, 'confMicro', 'ConfMicro'),
            `${label}.confMicro`
        ),
        entry: toFiniteNumber(readRequiredField(raw, `${label}.entry`, 'entry', 'Entry'), `${label}.entry`),
        minMove: toFiniteNumber(readRequiredField(raw, `${label}.minMove`, 'minMove', 'MinMove'), `${label}.minMove`),
        reason: toNonEmptyString(readRequiredField(raw, `${label}.reason`, 'reason', 'Reason'), `${label}.reason`),
        previewNote: toOptionalStringOrNull(readOptionalField(raw, 'previewNote', 'PreviewNote')),
        actualDay: mapActualDayOrNull(readOptionalField(raw, 'actualDay', 'ActualDay'), `${label}.actualDay`),
        policyRows: rawPolicyRows.map((item, index) => mapPolicyRow(item, index))
    }
}

function mapIndicatorValue(value: unknown, index: number): RealForecastJournalIndicatorValueDto {
    const raw = toObject(value, `indicatorItems[${index}]`)

    return {
        key: toNonEmptyString(readRequiredField(raw, 'key', 'key', 'Key'), 'indicator.key'),
        group: toNonEmptyString(readRequiredField(raw, 'group', 'group', 'Group'), 'indicator.group'),
        label: toNonEmptyString(readRequiredField(raw, 'label', 'label', 'Label'), 'indicator.label'),
        numericValue: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'numericValue', 'NumericValue')),
        displayValue: toNonEmptyString(
            readRequiredField(raw, 'displayValue', 'displayValue', 'DisplayValue'),
            'indicator.displayValue'
        ),
        unit: toOptionalStringOrNull(readOptionalField(raw, 'unit', 'Unit'))
    }
}

function mapIndicatorSnapshot(value: unknown, label: string): RealForecastJournalIndicatorSnapshotDto {
    const raw = toObject(value, label)
    const rawItems = readRequiredField(raw, `${label}.items`, 'items', 'Items')
    if (!Array.isArray(rawItems)) {
        throw new Error(`[real-forecast-journal] ${label}.items must be an array.`)
    }

    return {
        phase: toNonEmptyString(readRequiredField(raw, `${label}.phase`, 'phase', 'Phase'), `${label}.phase`),
        anchorUtc: normalizeUtcInstant(
            readRequiredField(raw, `${label}.anchorUtc`, 'anchorUtc', 'AnchorUtc'),
            `${label}.anchorUtc`
        ),
        featureBarOpenUtc: normalizeUtcInstant(
            readRequiredField(raw, `${label}.featureBarOpenUtc`, 'featureBarOpenUtc', 'FeatureBarOpenUtc'),
            `${label}.featureBarOpenUtc`
        ),
        featureBarCloseUtc: normalizeUtcInstant(
            readRequiredField(raw, `${label}.featureBarCloseUtc`, 'featureBarCloseUtc', 'FeatureBarCloseUtc'),
            `${label}.featureBarCloseUtc`
        ),
        indicatorDayUtc: normalizeUtcDayKey(
            readRequiredField(raw, `${label}.indicatorDayUtc`, 'indicatorDayUtc', 'IndicatorDayUtc'),
            `${label}.indicatorDayUtc`
        ),
        items: rawItems.map((item, index) => mapIndicatorValue(item, index))
    }
}

function mapFinalizeRecordOrNull(value: unknown): RealForecastJournalFinalizeRecordDto | null {
    if (value === null || typeof value === 'undefined') {
        return null
    }

    const raw = toObject(value, 'finalize')

    return {
        finalizedAtUtc: normalizeUtcInstant(
            readRequiredField(raw, 'finalizedAtUtc', 'finalizedAtUtc', 'FinalizedAtUtc'),
            'finalizedAtUtc'
        ),
        forecastHash: toNonEmptyString(
            readRequiredField(raw, 'forecastHash', 'forecastHash', 'ForecastHash'),
            'forecastHash'
        ),
        snapshot: mapSnapshot(readRequiredField(raw, 'snapshot', 'snapshot', 'Snapshot'), 'finalize.snapshot'),
        report: mapReportResponse(readRequiredField(raw, 'report', 'report', 'Report')),
        endOfDayIndicators: mapIndicatorSnapshot(
            readRequiredField(raw, 'endOfDayIndicators', 'endOfDayIndicators', 'EndOfDayIndicators'),
            'endOfDayIndicators'
        )
    }
}

function mapDayListItem(value: unknown, index: number): RealForecastJournalDayListItemDto {
    const raw = toObject(value, `dayList[${index}]`)
    const status = resolveStatus(readRequiredField(raw, 'status', 'status', 'Status'))

    return {
        id: toNonEmptyString(readRequiredField(raw, 'id', 'id', 'Id'), 'id'),
        predictionDateUtc: normalizeUtcDayKey(
            readRequiredField(raw, 'predictionDateUtc', 'predictionDateUtc', 'PredictionDateUtc'),
            'predictionDateUtc'
        ),
        status,
        trainingScope: resolveTrainingScope(readRequiredField(raw, 'trainingScope', 'trainingScope', 'TrainingScope')),
        capturedAtUtc: (() => {
            const rawValue = readOptionalField(raw, 'capturedAtUtc', 'capturedAtUtc', 'CapturedAtUtc')
            return rawValue === null || typeof rawValue === 'undefined'
                ? null
                : normalizeUtcInstant(rawValue, 'capturedAtUtc')
        })(),
        entryUtc: normalizeUtcInstant(readRequiredField(raw, 'entryUtc', 'entryUtc', 'EntryUtc'), 'entryUtc'),
        exitUtc: normalizeUtcInstant(readRequiredField(raw, 'exitUtc', 'exitUtc', 'ExitUtc'), 'exitUtc'),
        finalizedAtUtc: (() => {
            const rawValue = readOptionalField(raw, 'finalizedAtUtc', 'FinalizedAtUtc')
            return rawValue === null || typeof rawValue === 'undefined' ?
                    null
                :   normalizeUtcInstant(rawValue, 'finalizedAtUtc')
        })(),
        predLabelDisplay: (() => {
            const rawValue = readOptionalField(raw, 'predLabelDisplay', 'predLabelDisplay', 'PredLabelDisplay')
            return rawValue === null || typeof rawValue === 'undefined'
                ? null
                : toNonEmptyString(rawValue, 'predLabelDisplay')
        })(),
        microDisplay: (() => {
            const rawValue = readOptionalField(raw, 'microDisplay', 'microDisplay', 'MicroDisplay')
            return rawValue === null || typeof rawValue === 'undefined'
                ? null
                : toNonEmptyString(rawValue, 'microDisplay')
        })(),
        totalUpProbability: toOptionalFiniteNumberOrNull(
            readOptionalField(raw, 'totalUpProbability', 'totalUpProbability', 'TotalUpProbability')
        ),
        totalFlatProbability: toOptionalFiniteNumberOrNull(
            readOptionalField(raw, 'totalFlatProbability', 'totalFlatProbability', 'TotalFlatProbability')
        ),
        totalDownProbability: toOptionalFiniteNumberOrNull(
            readOptionalField(raw, 'totalDownProbability', 'totalDownProbability', 'TotalDownProbability')
        ),
        dayConfidence: toOptionalFiniteNumberOrNull(
            readOptionalField(raw, 'dayConfidence', 'dayConfidence', 'DayConfidence')
        ),
        microConfidence: toOptionalFiniteNumberOrNull(
            readOptionalField(raw, 'microConfidence', 'microConfidence', 'MicroConfidence')
        ),
        actualDirection: (() => {
            const rawValue = readOptionalField(raw, 'actualDirection', 'ActualDirection')
            return rawValue === null || typeof rawValue === 'undefined' ?
                    null
                :   (toNonEmptyString(rawValue, 'actualDirection').toUpperCase() as 'UP' | 'FLAT' | 'DOWN')
        })(),
        directionMatched: toOptionalBooleanOrNull(readOptionalField(raw, 'directionMatched', 'DirectionMatched'))
    }
}

function mapDayRecord(value: unknown): RealForecastJournalDayRecordDto {
    const raw = toObject(value, 'realForecastJournalDay')
    const status = resolveStatus(readRequiredField(raw, 'status', 'status', 'Status'))

    return {
        id: toNonEmptyString(readRequiredField(raw, 'id', 'id', 'Id'), 'id'),
        trainingScope: resolveTrainingScope(readRequiredField(raw, 'trainingScope', 'trainingScope', 'TrainingScope')),
        predictionDateUtc: normalizeUtcDayKey(
            readRequiredField(raw, 'predictionDateUtc', 'predictionDateUtc', 'PredictionDateUtc'),
            'predictionDateUtc'
        ),
        capturedAtUtc: (() => {
            const rawValue = readOptionalField(raw, 'capturedAtUtc', 'capturedAtUtc', 'CapturedAtUtc')
            return rawValue === null || typeof rawValue === 'undefined'
                ? null
                : normalizeUtcInstant(rawValue, 'capturedAtUtc')
        })(),
        entryUtc: normalizeUtcInstant(readRequiredField(raw, 'entryUtc', 'entryUtc', 'EntryUtc'), 'entryUtc'),
        exitUtc: normalizeUtcInstant(readRequiredField(raw, 'exitUtc', 'exitUtc', 'ExitUtc'), 'exitUtc'),
        forecastHash: (() => {
            const rawValue = readOptionalField(raw, 'forecastHash', 'forecastHash', 'ForecastHash')
            return rawValue === null || typeof rawValue === 'undefined'
                ? null
                : toNonEmptyString(rawValue, 'forecastHash')
        })(),
        forecastSnapshot: (() => {
            const rawValue = readOptionalField(raw, 'forecastSnapshot', 'forecastSnapshot', 'ForecastSnapshot')
            return rawValue === null || typeof rawValue === 'undefined'
                ? null
                : mapSnapshot(rawValue, 'forecastSnapshot')
        })(),
        forecastReport: (() => {
            const rawValue = readOptionalField(raw, 'forecastReport', 'forecastReport', 'ForecastReport')
            return rawValue === null || typeof rawValue === 'undefined' ? null : mapReportResponse(rawValue)
        })(),
        sessionOpenIndicators: (() => {
            const rawValue = readOptionalField(raw, 'sessionOpenIndicators', 'sessionOpenIndicators', 'SessionOpenIndicators')
            return rawValue === null || typeof rawValue === 'undefined' ? null : mapIndicatorSnapshot(rawValue, 'sessionOpenIndicators')
        })(),
        finalize: mapFinalizeRecordOrNull(readOptionalField(raw, 'finalize', 'Finalize'))
    }
}

function mapOpsCheckpointOrNull(value: unknown, label: string): RealForecastJournalOpsCheckpointDto | null {
    if (value === null || typeof value === 'undefined') {
        return null
    }

    const raw = toObject(value, label)

    return {
        predictionDateUtc: normalizeUtcDayKey(
            readRequiredField(raw, `${label}.predictionDateUtc`, 'predictionDateUtc', 'PredictionDateUtc'),
            `${label}.predictionDateUtc`
        ),
        occurredAtUtc: normalizeUtcInstant(
            readRequiredField(raw, `${label}.occurredAtUtc`, 'occurredAtUtc', 'OccurredAtUtc'),
            `${label}.occurredAtUtc`
        )
    }
}

function mapOpsStatus(value: unknown): RealForecastJournalOpsStatusDto {
    const raw = toObject(value, 'realForecastJournalOpsStatus')

    const mapOptionalUtcInstant = (field: string, pascalField: string): string | null => {
        const rawValue = readOptionalField(raw, field, pascalField)
        return rawValue === null || typeof rawValue === 'undefined' ? null : normalizeUtcInstant(rawValue, field)
    }

    const mapOptionalUtcDay = (field: string, pascalField: string): string | null => {
        const rawValue = readOptionalField(raw, field, pascalField)
        return rawValue === null || typeof rawValue === 'undefined' ? null : normalizeUtcDayKey(rawValue, field)
    }

    return {
        health: resolveOpsHealth(readRequiredField(raw, 'health', 'health', 'Health')),
        statusReason: toNonEmptyString(
            readRequiredField(raw, 'statusReason', 'statusReason', 'StatusReason'),
            'statusReason'
        ),
        checkedAtUtc: normalizeUtcInstant(
            readRequiredField(raw, 'checkedAtUtc', 'checkedAtUtc', 'CheckedAtUtc'),
            'checkedAtUtc'
        ),
        pollIntervalSeconds: toFiniteNumber(
            readRequiredField(raw, 'pollIntervalSeconds', 'pollIntervalSeconds', 'PollIntervalSeconds'),
            'pollIntervalSeconds'
        ),
        workerStartedAtUtc: mapOptionalUtcInstant('workerStartedAtUtc', 'WorkerStartedAtUtc'),
        lastLoopStartedAtUtc: mapOptionalUtcInstant('lastLoopStartedAtUtc', 'LastLoopStartedAtUtc'),
        lastLoopCompletedAtUtc: mapOptionalUtcInstant('lastLoopCompletedAtUtc', 'LastLoopCompletedAtUtc'),
        workerHeartbeatStale: toBoolean(
            readRequiredField(raw, 'workerHeartbeatStale', 'workerHeartbeatStale', 'WorkerHeartbeatStale'),
            'workerHeartbeatStale'
        ),
        consecutiveFailureCount: toFiniteNumber(
            readRequiredField(raw, 'consecutiveFailureCount', 'consecutiveFailureCount', 'ConsecutiveFailureCount'),
            'consecutiveFailureCount'
        ),
        lastFailureAtUtc: mapOptionalUtcInstant('lastFailureAtUtc', 'LastFailureAtUtc'),
        lastFailureStage: toOptionalStringOrNull(readOptionalField(raw, 'lastFailureStage', 'LastFailureStage')),
        lastFailureMessage: toOptionalStringOrNull(readOptionalField(raw, 'lastFailureMessage', 'LastFailureMessage')),
        lastSuccessfulCapture: mapOpsCheckpointOrNull(
            readOptionalField(raw, 'lastSuccessfulCapture', 'LastSuccessfulCapture'),
            'lastSuccessfulCapture'
        ),
        lastSuccessfulFinalize: mapOpsCheckpointOrNull(
            readOptionalField(raw, 'lastSuccessfulFinalize', 'LastSuccessfulFinalize'),
            'lastSuccessfulFinalize'
        ),
        activeRecordCount: toFiniteNumber(
            readRequiredField(raw, 'activeRecordCount', 'activeRecordCount', 'ActiveRecordCount'),
            'activeRecordCount'
        ),
        archiveRecordCount: toFiniteNumber(
            readRequiredField(raw, 'archiveRecordCount', 'archiveRecordCount', 'ArchiveRecordCount'),
            'archiveRecordCount'
        ),
        expectedCaptureDayUtc: mapOptionalUtcDay('expectedCaptureDayUtc', 'ExpectedCaptureDayUtc'),
        expectedCaptureEntryUtc: mapOptionalUtcInstant('expectedCaptureEntryUtc', 'ExpectedCaptureEntryUtc'),
        expectedCaptureDayStatus: (() => {
            const rawValue = readOptionalField(raw, 'expectedCaptureDayStatus', 'ExpectedCaptureDayStatus')
            return rawValue === null || typeof rawValue === 'undefined' ? null : resolveStatus(rawValue)
        })(),
        nextCaptureDayUtc: mapOptionalUtcDay('nextCaptureDayUtc', 'NextCaptureDayUtc'),
        nextCaptureEntryUtc: mapOptionalUtcInstant('nextCaptureEntryUtc', 'NextCaptureEntryUtc'),
        captureWindowClosed: toBoolean(
            readRequiredField(raw, 'captureWindowClosed', 'captureWindowClosed', 'CaptureWindowClosed'),
            'captureWindowClosed'
        ),
        hasRecordForExpectedCaptureDay: toBoolean(
            readRequiredField(
                raw,
                'hasRecordForExpectedCaptureDay',
                'hasRecordForExpectedCaptureDay',
                'HasRecordForExpectedCaptureDay'
            ),
            'hasRecordForExpectedCaptureDay'
        ),
        captureOverdue: toBoolean(
            readRequiredField(raw, 'captureOverdue', 'captureOverdue', 'CaptureOverdue'),
            'captureOverdue'
        ),
        activePendingDayUtc: mapOptionalUtcDay('activePendingDayUtc', 'ActivePendingDayUtc'),
        activePendingExitUtc: mapOptionalUtcInstant('activePendingExitUtc', 'ActivePendingExitUtc'),
        activePendingFinalizeDueUtc: mapOptionalUtcInstant(
            'activePendingFinalizeDueUtc',
            'ActivePendingFinalizeDueUtc'
        ),
        readyToFinalizeCount: toFiniteNumber(
            readRequiredField(raw, 'readyToFinalizeCount', 'readyToFinalizeCount', 'ReadyToFinalizeCount'),
            'readyToFinalizeCount'
        ),
        oldestReadyToFinalizeDayUtc: mapOptionalUtcDay('oldestReadyToFinalizeDayUtc', 'OldestReadyToFinalizeDayUtc')
    }
}

function mapLiveRowObservation(value: unknown, index: number): RealForecastJournalLiveRowObservationDto {
    const raw = toObject(value, `liveRows[${index}]`)

    return {
        rowKey: toNonEmptyString(readRequiredField(raw, 'rowKey', 'rowKey', 'RowKey'), 'rowKey'),
        policyName: toNonEmptyString(readRequiredField(raw, 'policyName', 'policyName', 'PolicyName'), 'policyName'),
        branch: toNonEmptyString(readRequiredField(raw, 'branch', 'branch', 'Branch'), 'branch'),
        bucket: toNonEmptyString(readRequiredField(raw, 'bucket', 'bucket', 'Bucket'), 'bucket'),
        status: resolveLiveRowStatus(readRequiredField(raw, 'status', 'status', 'Status')),
        eventTimeUtc: (() => {
            const rawValue = readOptionalField(raw, 'eventTimeUtc', 'EventTimeUtc')
            return rawValue === null || typeof rawValue === 'undefined' ?
                    null
                :   normalizeUtcInstant(rawValue, 'eventTimeUtc')
        })(),
        eventPrice: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'eventPrice', 'EventPrice')),
        latestClosedMinuteOpenUtc: (() => {
            const rawValue = readOptionalField(raw, 'latestClosedMinuteOpenUtc', 'LatestClosedMinuteOpenUtc')
            return rawValue === null || typeof rawValue === 'undefined' ?
                    null
                :   normalizeUtcInstant(rawValue, 'latestClosedMinuteOpenUtc')
        })(),
        observedHighPrice: toOptionalFiniteNumberOrNull(
            readOptionalField(raw, 'observedHighPrice', 'ObservedHighPrice')
        ),
        observedLowPrice: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'observedLowPrice', 'ObservedLowPrice'))
    }
}

function mapLiveStatus(value: unknown): RealForecastJournalLiveStatusDto {
    const raw = toObject(value, 'realForecastJournalLiveStatus')
    const rawRows = readRequiredField(raw, 'rows', 'rows', 'Rows')
    if (!Array.isArray(rawRows)) {
        throw new Error('[real-forecast-journal] rows must be an array.')
    }

    return {
        predictionDateUtc: normalizeUtcDayKey(
            readRequiredField(raw, 'predictionDateUtc', 'predictionDateUtc', 'PredictionDateUtc'),
            'predictionDateUtc'
        ),
        checkedAtUtc: normalizeUtcInstant(
            readRequiredField(raw, 'checkedAtUtc', 'checkedAtUtc', 'CheckedAtUtc'),
            'checkedAtUtc'
        ),
        currentPrice: toFiniteNumber(
            readRequiredField(raw, 'currentPrice', 'currentPrice', 'CurrentPrice'),
            'currentPrice'
        ),
        currentPriceObservedAtUtc: normalizeUtcInstant(
            readRequiredField(
                raw,
                'currentPriceObservedAtUtc',
                'currentPriceObservedAtUtc',
                'CurrentPriceObservedAtUtc'
            ),
            'currentPriceObservedAtUtc'
        ),
        minuteObservationStartUtc: normalizeUtcInstant(
            readRequiredField(
                raw,
                'minuteObservationStartUtc',
                'minuteObservationStartUtc',
                'MinuteObservationStartUtc'
            ),
            'minuteObservationStartUtc'
        ),
        minuteObservationThroughUtc: normalizeUtcInstant(
            readRequiredField(
                raw,
                'minuteObservationThroughUtc',
                'minuteObservationThroughUtc',
                'MinuteObservationThroughUtc'
            ),
            'minuteObservationThroughUtc'
        ),
        rows: rawRows.map((item, index) => mapLiveRowObservation(item, index))
    }
}

export function parseRealForecastJournalDayListResponse(raw: unknown): RealForecastJournalDayListItemDto[] {
    if (!Array.isArray(raw)) {
        throw new Error('[real-forecast-journal] day list response must be an array.')
    }

    return raw.map((item, index) => mapDayListItem(item, index))
}

export function parseRealForecastJournalDayRecordResponse(raw: unknown): RealForecastJournalDayRecordDto {
    return mapDayRecord(raw)
}

export function parseRealForecastJournalOpsStatusResponse(raw: unknown): RealForecastJournalOpsStatusDto {
    return mapOpsStatus(raw)
}

export function parseRealForecastJournalLiveStatusResponse(raw: unknown): RealForecastJournalLiveStatusDto {
    return mapLiveStatus(raw)
}

async function fetchRealForecastJournalDayList(
    args?: RealForecastJournalDayListQueryArgs
): Promise<RealForecastJournalDayListItemDto[]> {
    const params = new URLSearchParams()
    if (typeof args?.days === 'number' && Number.isFinite(args.days) && args.days > 0) {
        params.set('days', String(args.days))
    }

    const query = params.toString()
    const url = `${API_BASE_URL}${dayList.path}${query ? `?${query}` : ''}`
    const response = await fetch(url)

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`Failed to load real forecast journal index: ${response.status} ${text}`)
    }

    return parseRealForecastJournalDayListResponse(await response.json())
}

async function fetchRealForecastJournalDay(
    args: RealForecastJournalDayQueryArgs
): Promise<RealForecastJournalDayRecordDto> {
    const params = new URLSearchParams({ dateUtc: normalizeUtcDayKey(args.dateUtc, 'dateUtc') })
    const url = `${API_BASE_URL}${byDate.path}?${params.toString()}`
    const response = await fetch(url)

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`Failed to load real forecast journal day: ${response.status} ${text}`)
    }

    return parseRealForecastJournalDayRecordResponse(await response.json())
}

async function fetchRealForecastJournalOpsStatus(): Promise<RealForecastJournalOpsStatusDto> {
    const url = `${API_BASE_URL}${opsStatus.path}`
    const response = await fetch(url, { cache: 'no-store' })

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`Failed to load real forecast journal ops status: ${response.status} ${text}`)
    }

    return parseRealForecastJournalOpsStatusResponse(await response.json())
}

async function fetchRealForecastJournalLiveStatus(
    args: RealForecastJournalDayQueryArgs
): Promise<RealForecastJournalLiveStatusDto> {
    const params = new URLSearchParams({ dateUtc: normalizeUtcDayKey(args.dateUtc, 'dateUtc') })
    const url = `${API_BASE_URL}${liveStatus.path}?${params.toString()}`
    const response = await fetch(url, { cache: 'no-store' })

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`Failed to load real forecast journal live status: ${response.status} ${text}`)
    }

    return parseRealForecastJournalLiveStatusResponse(await response.json())
}

function resolveDayQueryKeySegment(args?: RealForecastJournalDayQueryArgs): string {
    return args ? normalizeUtcDayKey(args.dateUtc, 'dateUtc') : 'unselected'
}

function requireDayQueryArgs(
    args: RealForecastJournalDayQueryArgs | undefined,
    queryLabel: 'day' | 'live-status'
): RealForecastJournalDayQueryArgs {
    if (!args) {
        throw new Error(`[real-forecast-journal] ${queryLabel} query requires dateUtc.`)
    }

    return args
}

export function useRealForecastJournalDayListQuery(
    args?: RealForecastJournalDayListQueryArgs,
    options?: RealForecastJournalDayListQueryOptions
): UseQueryResult<RealForecastJournalDayListItemDto[], Error> {
    return useQuery({
        queryKey: [...REAL_FORECAST_JOURNAL_QUERY_KEY, 'index', args?.days ?? 'all'] as const,
        queryFn: () => fetchRealForecastJournalDayList(args),
        enabled: options?.enabled ?? true,
        retry: false,
        // Journal page должна обновляться без ручного refresh, когда worker записывает новый capture/finalize.
        refetchInterval: 15000
    })
}

export function useRealForecastJournalDayQuery(
    args: RealForecastJournalDayQueryArgs | undefined,
    options?: RealForecastJournalDayQueryOptions
): UseQueryResult<RealForecastJournalDayRecordDto, Error> {
    return useQuery({
        queryKey: [...REAL_FORECAST_JOURNAL_QUERY_KEY, 'day', resolveDayQueryKeySegment(args)] as const,
        queryFn: () => fetchRealForecastJournalDay(requireDayQueryArgs(args, 'day')),
        enabled: (options?.enabled ?? true) && Boolean(args),
        retry: false,
        // Активный день может перейти из captured в finalized, пока страница остаётся открытой.
        refetchInterval: 15000
    })
}

/**
 * Загружает backend ops-status для countdown-блока journal страницы.
 * Фронт не вычисляет NY/DST расписание самостоятельно, чтобы не расходиться с worker-контрактом.
 */
export function useRealForecastJournalOpsStatusQuery(
    options?: RealForecastJournalOpsStatusQueryOptions
): UseQueryResult<RealForecastJournalOpsStatusDto, Error> {
    return useQuery({
        queryKey: [...REAL_FORECAST_JOURNAL_QUERY_KEY, 'ops-status'] as const,
        queryFn: fetchRealForecastJournalOpsStatus,
        enabled: options?.enabled ?? true,
        retry: false,
        refetchInterval: 15000
    })
}

/**
 * Загружает intraday live-status активного journal-дня.
 * Запрос выполняется только на journal-странице и обновляется раз в 30 минут по пользовательскому контракту.
 */
export function useRealForecastJournalLiveStatusQuery(
    args: RealForecastJournalDayQueryArgs | undefined,
    options?: RealForecastJournalLiveStatusQueryOptions
): UseQueryResult<RealForecastJournalLiveStatusDto, Error> {
    return useQuery({
        queryKey: [...REAL_FORECAST_JOURNAL_QUERY_KEY, 'live-status', resolveDayQueryKeySegment(args)] as const,
        queryFn: () => fetchRealForecastJournalLiveStatus(requireDayQueryArgs(args, 'live-status')),
        enabled: (options?.enabled ?? true) && Boolean(args),
        retry: false,
        refetchInterval: 30 * 60 * 1000
    })
}

export async function prefetchRealForecastJournalDayList(queryClient: QueryClient): Promise<void> {
    await queryClient.prefetchQuery({
        queryKey: [...REAL_FORECAST_JOURNAL_QUERY_KEY, 'index', 'all'] as const,
        queryFn: () => fetchRealForecastJournalDayList()
    })
}
