import { useQuery, type QueryClient, type UseQueryResult } from '@tanstack/react-query'
import { API_BASE_URL } from '../../configs/config'
import { API_ROUTES } from '../routes'
import { mapReportResponse } from '../utils/mapReportResponse'
import type { CurrentPredictionTrainingScope } from '../endpoints/reportEndpoints'
import type {
    RealForecastJournalActualDayDto,
    RealForecastJournalDayListItemDto,
    RealForecastJournalDayRecordDto,
    RealForecastJournalDayStatus,
    RealForecastJournalFinalizeRecordDto,
    RealForecastJournalIndicatorSnapshotDto,
    RealForecastJournalIndicatorValueDto,
    RealForecastJournalMarginMode,
    RealForecastJournalPolicyRowDto,
    RealForecastJournalPolicyBucket,
    RealForecastJournalProbabilityDto,
    RealForecastJournalSnapshotDto
} from '@/shared/types/realForecastJournal.types'

const REAL_FORECAST_JOURNAL_QUERY_KEY = ['real-forecast-journal'] as const
const { dayList, byDate } = API_ROUTES.realForecastJournal
const DOTNET_TICKS_AT_UNIX_EPOCH = 621355968000000000n

export interface RealForecastJournalDayListQueryArgs {
    days?: number
}

export interface RealForecastJournalDayQueryArgs {
    dateUtc: string
}

interface RealForecastJournalDayQueryOptions {
    enabled?: boolean
}

function toObjectOrThrow(value: unknown, label: string): Record<string, unknown> {
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

function toNonEmptyStringOrThrow(value: unknown, label: string): string {
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

function toFiniteNumberOrThrow(value: unknown, label: string): number {
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

function toBooleanOrThrow(value: unknown, label: string): boolean {
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

function normalizeUtcDayKeyOrThrow(value: unknown, label: string): string {
    if (typeof value === 'string') {
        const normalized = value.trim()
        if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
            return normalized
        }
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const raw = value as Record<string, unknown>
        const iso = readOptionalField(raw, 'isoDate', 'IsoDate', 'value', 'Value')
        if (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) {
            return iso.trim()
        }

        const year = readOptionalField(raw, 'year', 'Year')
        const month = readOptionalField(raw, 'month', 'Month')
        const day = readOptionalField(raw, 'day', 'Day')

        if (
            typeof year === 'number' &&
            typeof month === 'number' &&
            typeof day === 'number' &&
            Number.isInteger(year) &&
            Number.isInteger(month) &&
            Number.isInteger(day)
        ) {
            return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day
                .toString()
                .padStart(2, '0')}`
        }
    }

    throw new Error(`[real-forecast-journal] ${label} must be a UTC day key.`)
}

function normalizeUtcInstantOrThrow(value: unknown, label: string): string {
    if (typeof value === 'string') {
        const parsed = new Date(value)
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toISOString()
        }
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const raw = value as Record<string, unknown>
        const asString = readOptionalField(raw, 'value', 'Value', 'iso', 'Iso')
        if (typeof asString === 'string') {
            const parsed = new Date(asString)
            if (!Number.isNaN(parsed.getTime())) {
                return parsed.toISOString()
            }
        }

        const ticks = readOptionalField(raw, 'ticks', 'Ticks')
        if ((typeof ticks === 'number' && Number.isFinite(ticks)) || typeof ticks === 'string') {
            const tickValue = BigInt(String(ticks))
            const unixMs = Number((tickValue - DOTNET_TICKS_AT_UNIX_EPOCH) / 10000n)
            const parsed = new Date(unixMs)
            if (!Number.isNaN(parsed.getTime())) {
                return parsed.toISOString()
            }
        }

        const year = readOptionalField(raw, 'year', 'Year')
        const month = readOptionalField(raw, 'month', 'Month')
        const day = readOptionalField(raw, 'day', 'Day')
        const hour = readOptionalField(raw, 'hour', 'Hour')
        const minute = readOptionalField(raw, 'minute', 'Minute')
        const second = readOptionalField(raw, 'second', 'Second')
        const millisecond = readOptionalField(raw, 'millisecond', 'Millisecond')

        if (
            typeof year === 'number' &&
            typeof month === 'number' &&
            typeof day === 'number' &&
            typeof hour === 'number' &&
            typeof minute === 'number' &&
            typeof second === 'number'
        ) {
            return new Date(
                Date.UTC(year, month - 1, day, hour, minute, second, typeof millisecond === 'number' ? millisecond : 0)
            ).toISOString()
        }
    }

    throw new Error(`[real-forecast-journal] ${label} must be a UTC instant.`)
}

function resolveTrainingScopeOrThrow(value: unknown): CurrentPredictionTrainingScope {
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

function resolveStatusOrThrow(value: unknown): RealForecastJournalDayStatus {
    if (typeof value === 'number') {
        if (value === 0) return 'captured'
        if (value === 1) return 'finalized'
    }

    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase()
        if (normalized === 'captured') return 'captured'
        if (normalized === 'finalized') return 'finalized'
    }

    throw new Error(`[real-forecast-journal] unsupported journal status: ${String(value)}.`)
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

function resolvePolicyBucketOrThrow(value: unknown, label: string): RealForecastJournalPolicyBucket {
    const normalized = toNonEmptyStringOrThrow(value, label).toLowerCase()
    if (normalized === 'daily') return 'daily'
    if (normalized === 'intraday') return 'intraday'
    if (normalized === 'delayed') return 'delayed'

    throw new Error(`[real-forecast-journal] unsupported policy bucket: ${normalized}.`)
}

function mapProbabilityOrThrow(value: unknown, label: string): RealForecastJournalProbabilityDto {
    const raw = toObjectOrThrow(value, label)

    return {
        up: toFiniteNumberOrThrow(readRequiredField(raw, `${label}.up`, 'up', 'Up'), `${label}.up`),
        flat: toFiniteNumberOrThrow(readRequiredField(raw, `${label}.flat`, 'flat', 'Flat'), `${label}.flat`),
        down: toFiniteNumberOrThrow(readRequiredField(raw, `${label}.down`, 'down', 'Down'), `${label}.down`)
    }
}

function mapActualDayOrNull(value: unknown, label: string): RealForecastJournalActualDayDto | null {
    if (value === null || typeof value === 'undefined') {
        return null
    }

    const raw = toObjectOrThrow(value, label)

    return {
        trueLabel: toFiniteNumberOrThrow(
            readRequiredField(raw, `${label}.trueLabel`, 'trueLabel', 'TrueLabel'),
            `${label}.trueLabel`
        ),
        entry: toFiniteNumberOrThrow(readRequiredField(raw, `${label}.entry`, 'entry', 'Entry'), `${label}.entry`),
        maxHigh24: toFiniteNumberOrThrow(
            readRequiredField(raw, `${label}.maxHigh24`, 'maxHigh24', 'MaxHigh24'),
            `${label}.maxHigh24`
        ),
        minLow24: toFiniteNumberOrThrow(
            readRequiredField(raw, `${label}.minLow24`, 'minLow24', 'MinLow24'),
            `${label}.minLow24`
        ),
        close24: toFiniteNumberOrThrow(
            readRequiredField(raw, `${label}.close24`, 'close24', 'Close24'),
            `${label}.close24`
        ),
        minMove: toFiniteNumberOrThrow(
            readRequiredField(raw, `${label}.minMove`, 'minMove', 'MinMove'),
            `${label}.minMove`
        )
    }
}

function mapPolicyRowOrThrow(value: unknown, index: number): RealForecastJournalPolicyRowDto {
    const raw = toObjectOrThrow(value, `policyRows[${index}]`)

    return {
        policyName: toNonEmptyStringOrThrow(
            readRequiredField(raw, 'policyName', 'policyName', 'PolicyName'),
            'policyName'
        ),
        branch: toNonEmptyStringOrThrow(readRequiredField(raw, 'branch', 'branch', 'Branch'), 'branch'),
        bucket: resolvePolicyBucketOrThrow(readRequiredField(raw, 'bucket', 'bucket', 'Bucket'), 'bucket'),
        margin: resolveMarginModeOrNull(readOptionalField(raw, 'margin', 'Margin')),
        isRiskDay: toBooleanOrThrow(readRequiredField(raw, 'isRiskDay', 'isRiskDay', 'IsRiskDay'), 'isRiskDay'),
        hasDirection: toBooleanOrThrow(
            readRequiredField(raw, 'hasDirection', 'hasDirection', 'HasDirection'),
            'hasDirection'
        ),
        skipped: toBooleanOrThrow(readRequiredField(raw, 'skipped', 'skipped', 'Skipped'), 'skipped'),
        direction: toNonEmptyStringOrThrow(readRequiredField(raw, 'direction', 'direction', 'Direction'), 'direction'),
        leverage: toFiniteNumberOrThrow(readRequiredField(raw, 'leverage', 'leverage', 'Leverage'), 'leverage'),
        entry: toFiniteNumberOrThrow(readRequiredField(raw, 'entry', 'entry', 'Entry'), 'entry'),
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
        exitReason: toNonEmptyStringOrThrow(
            readRequiredField(raw, 'exitReason', 'exitReason', 'ExitReason'),
            'exitReason'
        ),
        exitPnlPct: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'exitPnlPct', 'ExitPnlPct')),
        trades: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'trades', 'Trades')),
        totalPnlPct: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'totalPnlPct', 'TotalPnlPct')),
        maxDdPct: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'maxDdPct', 'MaxDdPct')),
        hadLiquidation: toOptionalBooleanOrNull(readOptionalField(raw, 'hadLiquidation', 'HadLiquidation')),
        withdrawnTotal: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'withdrawnTotal', 'WithdrawnTotal'))
    }
}

function mapSnapshotOrThrow(value: unknown, label: string): RealForecastJournalSnapshotDto {
    const raw = toObjectOrThrow(value, label)

    const rawPolicyRows = readRequiredField(raw, `${label}.policyRows`, 'policyRows', 'PolicyRows')
    if (!Array.isArray(rawPolicyRows)) {
        throw new Error(`[real-forecast-journal] ${label}.policyRows must be an array.`)
    }

    return {
        generatedAtUtc: normalizeUtcInstantOrThrow(
            readRequiredField(raw, `${label}.generatedAtUtc`, 'generatedAtUtc', 'GeneratedAtUtc'),
            `${label}.generatedAtUtc`
        ),
        predictionDateUtc: normalizeUtcDayKeyOrThrow(
            readRequiredField(raw, `${label}.predictionDateUtc`, 'predictionDateUtc', 'PredictionDateUtc'),
            `${label}.predictionDateUtc`
        ),
        asOfUtc: normalizeUtcInstantOrThrow(
            readRequiredField(raw, `${label}.asOfUtc`, 'asOfUtc', 'AsOfUtc'),
            `${label}.asOfUtc`
        ),
        dataCutoffUtc: normalizeUtcInstantOrThrow(
            readRequiredField(raw, `${label}.dataCutoffUtc`, 'dataCutoffUtc', 'DataCutoffUtc'),
            `${label}.dataCutoffUtc`
        ),
        entryUtc: normalizeUtcInstantOrThrow(
            readRequiredField(raw, `${label}.entryUtc`, 'entryUtc', 'EntryUtc'),
            `${label}.entryUtc`
        ),
        exitUtc: normalizeUtcInstantOrThrow(
            readRequiredField(raw, `${label}.exitUtc`, 'exitUtc', 'ExitUtc'),
            `${label}.exitUtc`
        ),
        predLabel: toFiniteNumberOrThrow(
            readRequiredField(raw, `${label}.predLabel`, 'predLabel', 'PredLabel'),
            `${label}.predLabel`
        ),
        predLabelDisplay: toNonEmptyStringOrThrow(
            readRequiredField(raw, `${label}.predLabelDisplay`, 'predLabelDisplay', 'PredLabelDisplay'),
            `${label}.predLabelDisplay`
        ),
        microDisplay: toNonEmptyStringOrThrow(
            readRequiredField(raw, `${label}.microDisplay`, 'microDisplay', 'MicroDisplay'),
            `${label}.microDisplay`
        ),
        pTotal: mapProbabilityOrThrow(readRequiredField(raw, `${label}.pTotal`, 'pTotal', 'PTotal'), `${label}.pTotal`),
        confDay: toFiniteNumberOrThrow(
            readRequiredField(raw, `${label}.confDay`, 'confDay', 'ConfDay'),
            `${label}.confDay`
        ),
        confMicro: toFiniteNumberOrThrow(
            readRequiredField(raw, `${label}.confMicro`, 'confMicro', 'ConfMicro'),
            `${label}.confMicro`
        ),
        entry: toFiniteNumberOrThrow(readRequiredField(raw, `${label}.entry`, 'entry', 'Entry'), `${label}.entry`),
        minMove: toFiniteNumberOrThrow(
            readRequiredField(raw, `${label}.minMove`, 'minMove', 'MinMove'),
            `${label}.minMove`
        ),
        reason: toNonEmptyStringOrThrow(
            readRequiredField(raw, `${label}.reason`, 'reason', 'Reason'),
            `${label}.reason`
        ),
        previewNote: toOptionalStringOrNull(readOptionalField(raw, 'previewNote', 'PreviewNote')),
        actualDay: mapActualDayOrNull(readOptionalField(raw, 'actualDay', 'ActualDay'), `${label}.actualDay`),
        policyRows: rawPolicyRows.map((item, index) => mapPolicyRowOrThrow(item, index))
    }
}

function mapIndicatorValueOrThrow(value: unknown, index: number): RealForecastJournalIndicatorValueDto {
    const raw = toObjectOrThrow(value, `indicatorItems[${index}]`)

    return {
        key: toNonEmptyStringOrThrow(readRequiredField(raw, 'key', 'key', 'Key'), 'indicator.key'),
        group: toNonEmptyStringOrThrow(readRequiredField(raw, 'group', 'group', 'Group'), 'indicator.group'),
        label: toNonEmptyStringOrThrow(readRequiredField(raw, 'label', 'label', 'Label'), 'indicator.label'),
        numericValue: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'numericValue', 'NumericValue')),
        displayValue: toNonEmptyStringOrThrow(
            readRequiredField(raw, 'displayValue', 'displayValue', 'DisplayValue'),
            'indicator.displayValue'
        ),
        unit: toOptionalStringOrNull(readOptionalField(raw, 'unit', 'Unit'))
    }
}

function mapIndicatorSnapshotOrThrow(value: unknown, label: string): RealForecastJournalIndicatorSnapshotDto {
    const raw = toObjectOrThrow(value, label)
    const rawItems = readRequiredField(raw, `${label}.items`, 'items', 'Items')
    if (!Array.isArray(rawItems)) {
        throw new Error(`[real-forecast-journal] ${label}.items must be an array.`)
    }

    return {
        phase: toNonEmptyStringOrThrow(readRequiredField(raw, `${label}.phase`, 'phase', 'Phase'), `${label}.phase`),
        anchorUtc: normalizeUtcInstantOrThrow(
            readRequiredField(raw, `${label}.anchorUtc`, 'anchorUtc', 'AnchorUtc'),
            `${label}.anchorUtc`
        ),
        featureBarOpenUtc: normalizeUtcInstantOrThrow(
            readRequiredField(raw, `${label}.featureBarOpenUtc`, 'featureBarOpenUtc', 'FeatureBarOpenUtc'),
            `${label}.featureBarOpenUtc`
        ),
        featureBarCloseUtc: normalizeUtcInstantOrThrow(
            readRequiredField(raw, `${label}.featureBarCloseUtc`, 'featureBarCloseUtc', 'FeatureBarCloseUtc'),
            `${label}.featureBarCloseUtc`
        ),
        indicatorDayUtc: normalizeUtcDayKeyOrThrow(
            readRequiredField(raw, `${label}.indicatorDayUtc`, 'indicatorDayUtc', 'IndicatorDayUtc'),
            `${label}.indicatorDayUtc`
        ),
        items: rawItems.map((item, index) => mapIndicatorValueOrThrow(item, index))
    }
}

function mapFinalizeRecordOrNull(value: unknown): RealForecastJournalFinalizeRecordDto | null {
    if (value === null || typeof value === 'undefined') {
        return null
    }

    const raw = toObjectOrThrow(value, 'finalize')

    return {
        finalizedAtUtc: normalizeUtcInstantOrThrow(
            readRequiredField(raw, 'finalizedAtUtc', 'finalizedAtUtc', 'FinalizedAtUtc'),
            'finalizedAtUtc'
        ),
        forecastHash: toNonEmptyStringOrThrow(
            readRequiredField(raw, 'forecastHash', 'forecastHash', 'ForecastHash'),
            'forecastHash'
        ),
        snapshot: mapSnapshotOrThrow(readRequiredField(raw, 'snapshot', 'snapshot', 'Snapshot'), 'finalize.snapshot'),
        report: mapReportResponse(readRequiredField(raw, 'report', 'report', 'Report')),
        endOfDayIndicators: mapIndicatorSnapshotOrThrow(
            readRequiredField(raw, 'endOfDayIndicators', 'endOfDayIndicators', 'EndOfDayIndicators'),
            'endOfDayIndicators'
        )
    }
}

function mapDayListItemOrThrow(value: unknown, index: number): RealForecastJournalDayListItemDto {
    const raw = toObjectOrThrow(value, `dayList[${index}]`)

    return {
        id: toNonEmptyStringOrThrow(readRequiredField(raw, 'id', 'id', 'Id'), 'id'),
        predictionDateUtc: normalizeUtcDayKeyOrThrow(
            readRequiredField(raw, 'predictionDateUtc', 'predictionDateUtc', 'PredictionDateUtc'),
            'predictionDateUtc'
        ),
        status: resolveStatusOrThrow(readRequiredField(raw, 'status', 'status', 'Status')),
        trainingScope: resolveTrainingScopeOrThrow(
            readRequiredField(raw, 'trainingScope', 'trainingScope', 'TrainingScope')
        ),
        capturedAtUtc: normalizeUtcInstantOrThrow(
            readRequiredField(raw, 'capturedAtUtc', 'capturedAtUtc', 'CapturedAtUtc'),
            'capturedAtUtc'
        ),
        entryUtc: normalizeUtcInstantOrThrow(readRequiredField(raw, 'entryUtc', 'entryUtc', 'EntryUtc'), 'entryUtc'),
        exitUtc: normalizeUtcInstantOrThrow(readRequiredField(raw, 'exitUtc', 'exitUtc', 'ExitUtc'), 'exitUtc'),
        finalizedAtUtc: (() => {
            const rawValue = readOptionalField(raw, 'finalizedAtUtc', 'FinalizedAtUtc')
            return rawValue === null || typeof rawValue === 'undefined' ?
                    null
                :   normalizeUtcInstantOrThrow(rawValue, 'finalizedAtUtc')
        })(),
        predLabelDisplay: toNonEmptyStringOrThrow(
            readRequiredField(raw, 'predLabelDisplay', 'predLabelDisplay', 'PredLabelDisplay'),
            'predLabelDisplay'
        ),
        microDisplay: toNonEmptyStringOrThrow(
            readRequiredField(raw, 'microDisplay', 'microDisplay', 'MicroDisplay'),
            'microDisplay'
        ),
        totalUpProbability: toFiniteNumberOrThrow(
            readRequiredField(raw, 'totalUpProbability', 'totalUpProbability', 'TotalUpProbability'),
            'totalUpProbability'
        ),
        totalFlatProbability: toFiniteNumberOrThrow(
            readRequiredField(raw, 'totalFlatProbability', 'totalFlatProbability', 'TotalFlatProbability'),
            'totalFlatProbability'
        ),
        totalDownProbability: toFiniteNumberOrThrow(
            readRequiredField(raw, 'totalDownProbability', 'totalDownProbability', 'TotalDownProbability'),
            'totalDownProbability'
        ),
        dayConfidence: toFiniteNumberOrThrow(
            readRequiredField(raw, 'dayConfidence', 'dayConfidence', 'DayConfidence'),
            'dayConfidence'
        ),
        microConfidence: toFiniteNumberOrThrow(
            readRequiredField(raw, 'microConfidence', 'microConfidence', 'MicroConfidence'),
            'microConfidence'
        ),
        actualDirection: (() => {
            const rawValue = readOptionalField(raw, 'actualDirection', 'ActualDirection')
            return rawValue === null || typeof rawValue === 'undefined' ?
                    null
                :   (toNonEmptyStringOrThrow(rawValue, 'actualDirection').toUpperCase() as 'UP' | 'FLAT' | 'DOWN')
        })(),
        directionMatched: toOptionalBooleanOrNull(readOptionalField(raw, 'directionMatched', 'DirectionMatched'))
    }
}

function mapDayRecordOrThrow(value: unknown): RealForecastJournalDayRecordDto {
    const raw = toObjectOrThrow(value, 'realForecastJournalDay')

    return {
        id: toNonEmptyStringOrThrow(readRequiredField(raw, 'id', 'id', 'Id'), 'id'),
        trainingScope: resolveTrainingScopeOrThrow(
            readRequiredField(raw, 'trainingScope', 'trainingScope', 'TrainingScope')
        ),
        predictionDateUtc: normalizeUtcDayKeyOrThrow(
            readRequiredField(raw, 'predictionDateUtc', 'predictionDateUtc', 'PredictionDateUtc'),
            'predictionDateUtc'
        ),
        capturedAtUtc: normalizeUtcInstantOrThrow(
            readRequiredField(raw, 'capturedAtUtc', 'capturedAtUtc', 'CapturedAtUtc'),
            'capturedAtUtc'
        ),
        entryUtc: normalizeUtcInstantOrThrow(readRequiredField(raw, 'entryUtc', 'entryUtc', 'EntryUtc'), 'entryUtc'),
        exitUtc: normalizeUtcInstantOrThrow(readRequiredField(raw, 'exitUtc', 'exitUtc', 'ExitUtc'), 'exitUtc'),
        forecastHash: toNonEmptyStringOrThrow(
            readRequiredField(raw, 'forecastHash', 'forecastHash', 'ForecastHash'),
            'forecastHash'
        ),
        forecastSnapshot: mapSnapshotOrThrow(
            readRequiredField(raw, 'forecastSnapshot', 'forecastSnapshot', 'ForecastSnapshot'),
            'forecastSnapshot'
        ),
        forecastReport: mapReportResponse(readRequiredField(raw, 'forecastReport', 'forecastReport', 'ForecastReport')),
        morningIndicators: mapIndicatorSnapshotOrThrow(
            readRequiredField(raw, 'morningIndicators', 'morningIndicators', 'MorningIndicators'),
            'morningIndicators'
        ),
        finalize: mapFinalizeRecordOrNull(readOptionalField(raw, 'finalize', 'Finalize'))
    }
}

export function parseRealForecastJournalDayListResponseOrThrow(raw: unknown): RealForecastJournalDayListItemDto[] {
    if (!Array.isArray(raw)) {
        throw new Error('[real-forecast-journal] day list response must be an array.')
    }

    return raw.map((item, index) => mapDayListItemOrThrow(item, index))
}

export function parseRealForecastJournalDayRecordResponseOrThrow(raw: unknown): RealForecastJournalDayRecordDto {
    return mapDayRecordOrThrow(raw)
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
    const response = await fetch(url, { cache: 'no-store' })

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`Failed to load real forecast journal index: ${response.status} ${text}`)
    }

    return parseRealForecastJournalDayListResponseOrThrow(await response.json())
}

async function fetchRealForecastJournalDay(
    args: RealForecastJournalDayQueryArgs
): Promise<RealForecastJournalDayRecordDto> {
    const params = new URLSearchParams({ dateUtc: normalizeUtcDayKeyOrThrow(args.dateUtc, 'dateUtc') })
    const url = `${API_BASE_URL}${byDate.path}?${params.toString()}`
    const response = await fetch(url, { cache: 'no-store' })

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(`Failed to load real forecast journal day: ${response.status} ${text}`)
    }

    return parseRealForecastJournalDayRecordResponseOrThrow(await response.json())
}

export function useRealForecastJournalDayListQuery(
    args?: RealForecastJournalDayListQueryArgs
): UseQueryResult<RealForecastJournalDayListItemDto[], Error> {
    return useQuery({
        queryKey: [...REAL_FORECAST_JOURNAL_QUERY_KEY, 'index', args?.days ?? 'all'] as const,
        queryFn: () => fetchRealForecastJournalDayList(args),
        retry: false
    })
}

export function useRealForecastJournalDayQuery(
    args: RealForecastJournalDayQueryArgs,
    options?: RealForecastJournalDayQueryOptions
): UseQueryResult<RealForecastJournalDayRecordDto, Error> {
    return useQuery({
        queryKey: [
            ...REAL_FORECAST_JOURNAL_QUERY_KEY,
            'day',
            normalizeUtcDayKeyOrThrow(args.dateUtc, 'dateUtc')
        ] as const,
        queryFn: () => fetchRealForecastJournalDay(args),
        enabled: options?.enabled ?? true,
        retry: false
    })
}

export async function prefetchRealForecastJournalDayList(queryClient: QueryClient): Promise<void> {
    await queryClient.prefetchQuery({
        queryKey: [...REAL_FORECAST_JOURNAL_QUERY_KEY, 'index', 'all'] as const,
        queryFn: () => fetchRealForecastJournalDayList()
    })
}
