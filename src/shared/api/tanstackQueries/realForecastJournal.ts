import { useQuery, type QueryClient, type UseQueryResult } from '@tanstack/react-query'
import { API_BASE_URL } from '../../configs/config'
import { API_ROUTES } from '../routes'
import { mapReportResponse } from '../utils/mapReportResponse'
import { buildDetailedRequestErrorMessage } from './utils/requestErrorMessage'
import { QUERY_POLICY_REGISTRY } from '@/shared/configs/queryPolicies'
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
    RealForecastJournalRunKind,
    RealForecastJournalSnapshotDto
} from '@/shared/types/realForecastJournal.types'
import { mapPolicyPerformanceMetricsOrNull } from '../utils/mapPolicyPerformanceMetrics'

const REAL_FORECAST_JOURNAL_QUERY_KEY = ['real-forecast-journal'] as const
const { dayList, byDate, liveStatus, opsStatus } = API_ROUTES.realForecastJournal
const REAL_FORECAST_JOURNAL_TIME_SCOPE = { scope: 'real-forecast-journal' } as const
const DEFAULT_REAL_FORECAST_JOURNAL_RUN_KIND: RealForecastJournalRunKind = 'main'

export interface RealForecastJournalDayListQueryArgs {
    days?: number
    runKind?: RealForecastJournalRunKind
}

export interface RealForecastJournalDayQueryArgs {
    dateUtc: string
    runKind?: RealForecastJournalRunKind
}

export interface RealForecastJournalOpsStatusQueryArgs {
    runKind?: RealForecastJournalRunKind
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

function readRequiredField(raw: Record<string, unknown>, label: string, key: string): unknown {
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
        return raw[key]
    }

    throw new Error(`[real-forecast-journal] ${label} is missing.`)
}

function readOptionalField(raw: Record<string, unknown>, key: string): unknown {
    if (Object.prototype.hasOwnProperty.call(raw, key)) {
        return raw[key]
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

    throw new Error(`[real-forecast-journal] ${label} must be a finite number.`)
}

function toOptionalFiniteNumberOrNull(value: unknown): number | null {
    if (value === null || typeof value === 'undefined') {
        return null
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        return value
    }

    throw new Error('[real-forecast-journal] optional numeric field has unsupported value.')
}

function toBoolean(value: unknown, label: string): boolean {
    if (typeof value === 'boolean') {
        return value
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

    throw new Error('[real-forecast-journal] optional boolean field has unsupported value.')
}

function normalizeUtcDayKey(value: unknown, label: string): string {
    if (typeof value !== 'string') {
        throw new Error(`[real-forecast-journal] ${label} must be an ISO day string.`)
    }

    return normalizeDomainUtcDayKey(value, label, REAL_FORECAST_JOURNAL_TIME_SCOPE)
}

function normalizeUtcInstant(value: unknown, label: string): string {
    if (typeof value !== 'string') {
        throw new Error(`[real-forecast-journal] ${label} must be an ISO timestamp string.`)
    }

    return normalizeDomainUtcInstant(value, label, REAL_FORECAST_JOURNAL_TIME_SCOPE)
}

function resolveTrainingScope(value: unknown): CurrentPredictionTrainingScope {
    if (typeof value === 'string') {
        if (value === 'train') return 'train'
        if (value === 'full') return 'full'
        if (value === 'oos') return 'oos'
        if (value === 'recent') return 'recent'
    }

    throw new Error(`[real-forecast-journal] unsupported training scope: ${String(value)}.`)
}

function resolveStatus(value: unknown): RealForecastJournalDayStatus {
    if (typeof value === 'string') {
        if (value === 'scheduled') return 'scheduled'
        if (value === 'captured') return 'captured'
        if (value === 'finalized') return 'finalized'
        if (value === 'missed_capture') return 'missed_capture'
        if (value === 'recovered_exception') return 'recovered_exception'
    }

    throw new Error(`[real-forecast-journal] unsupported journal status: ${String(value)}.`)
}

function resolveRunKind(value: unknown): RealForecastJournalRunKind {
    if (typeof value === 'string') {
        if (value === 'main') return 'main'
        if (value === 'preliminary') return 'preliminary'
    }

    throw new Error(`[real-forecast-journal] unsupported run kind: ${String(value)}.`)
}

function resolveRunKindOrDefault(value: RealForecastJournalRunKind | undefined): RealForecastJournalRunKind {
    return value ?? DEFAULT_REAL_FORECAST_JOURNAL_RUN_KIND
}

function resolveOpsHealth(value: unknown): RealForecastJournalOpsHealthStatus {
    if (typeof value === 'string') {
        if (value === 'healthy') return 'healthy'
        if (value === 'degraded') return 'degraded'
    }

    throw new Error(`[real-forecast-journal] unsupported ops health status: ${String(value)}.`)
}

function resolveLiveRowStatus(value: unknown): RealForecastJournalLiveRowStatus {
    if (typeof value === 'string') {
        if (value === 'not-tracked') return 'not-tracked'
        if (value === 'open') return 'open'
        if (value === 'take-profit-hit') return 'take-profit-hit'
        if (value === 'stop-loss-hit') return 'stop-loss-hit'
        if (value === 'liquidation-hit') return 'liquidation-hit'
        if (value === 'end-of-day') return 'end-of-day'
    }

    throw new Error(`[real-forecast-journal] unsupported live row status: ${String(value)}.`)
}

function resolveDirectionToken(value: unknown, label: string): 'UP' | 'FLAT' | 'DOWN' {
    if (typeof value === 'string') {
        if (value === 'UP') return 'UP'
        if (value === 'FLAT') return 'FLAT'
        if (value === 'DOWN') return 'DOWN'
    }

    throw new Error(`[real-forecast-journal] unsupported direction token for ${label}: ${String(value)}.`)
}

function resolveMarginModeOrNull(value: unknown): RealForecastJournalMarginMode | null {
    if (value === null || typeof value === 'undefined') {
        return null
    }

    if (typeof value === 'string') {
        if (value === 'cross') return 'cross'
        if (value === 'isolated') return 'isolated'
    }

    throw new Error(`[real-forecast-journal] unsupported margin mode: ${String(value)}.`)
}

function resolvePolicyBucket(value: unknown, label: string): RealForecastJournalPolicyBucket {
    const raw = toNonEmptyString(value, label)
    if (raw === 'daily') return 'daily'
    if (raw === 'intraday') return 'intraday'
    if (raw === 'delayed') return 'delayed'

    throw new Error(`[real-forecast-journal] unsupported policy bucket: ${raw}.`)
}

function mapProbability(value: unknown, label: string): RealForecastJournalProbabilityDto {
    const raw = toObject(value, label)

    return {
        up: toFiniteNumber(readRequiredField(raw, `${label}.up`, 'up'), `${label}.up`),
        flat: toFiniteNumber(readRequiredField(raw, `${label}.flat`, 'flat'), `${label}.flat`),
        down: toFiniteNumber(readRequiredField(raw, `${label}.down`, 'down'), `${label}.down`)
    }
}

function mapActualDayOrNull(value: unknown, label: string): RealForecastJournalActualDayDto | null {
    if (value === null || typeof value === 'undefined') {
        return null
    }

    const raw = toObject(value, label)

    return {
        trueLabel: toFiniteNumber(
            readRequiredField(raw, `${label}.trueLabel`, 'trueLabel'),
            `${label}.trueLabel`
        ),
        entry: toFiniteNumber(readRequiredField(raw, `${label}.entry`, 'entry'), `${label}.entry`),
        maxHigh24: toFiniteNumber(
            readRequiredField(raw, `${label}.maxHigh24`, 'maxHigh24'),
            `${label}.maxHigh24`
        ),
        minLow24: toFiniteNumber(
            readRequiredField(raw, `${label}.minLow24`, 'minLow24'),
            `${label}.minLow24`
        ),
        close24: toFiniteNumber(readRequiredField(raw, `${label}.close24`, 'close24'), `${label}.close24`),
        minMove: toFiniteNumber(readRequiredField(raw, `${label}.minMove`, 'minMove'), `${label}.minMove`)
    }
}

function mapPolicyRow(value: unknown, index: number): RealForecastJournalPolicyRowDto {
    const raw = toObject(value, `policyRows[${index}]`)

    return {
        policyName: toNonEmptyString(readRequiredField(raw, 'policyName', 'policyName'), 'policyName'),
        branch: toNonEmptyString(readRequiredField(raw, 'branch', 'branch'), 'branch'),
        bucket: resolvePolicyBucket(readRequiredField(raw, 'bucket', 'bucket'), 'bucket'),
        margin: resolveMarginModeOrNull(readOptionalField(raw, 'margin')),
        isSpotPolicy: toBoolean(readRequiredField(raw, 'isSpotPolicy', 'isSpotPolicy'), 'isSpotPolicy'),
        isRiskDay: toBoolean(readRequiredField(raw, 'isRiskDay', 'isRiskDay'), 'isRiskDay'),
        hasDirection: toBoolean(readRequiredField(raw, 'hasDirection', 'hasDirection'), 'hasDirection'),
        skipped: toBoolean(readRequiredField(raw, 'skipped', 'skipped'), 'skipped'),
        direction: toNonEmptyString(readRequiredField(raw, 'direction', 'direction'), 'direction'),
        leverage: toFiniteNumber(readRequiredField(raw, 'leverage', 'leverage'), 'leverage'),
        entry: toFiniteNumber(readRequiredField(raw, 'entry', 'entry'), 'entry'),
        slPct: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'slPct')),
        tpPct: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'tpPct')),
        slPrice: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'slPrice')),
        tpPrice: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'tpPrice')),
        notionalUsd: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'notionalUsd')),
        positionQty: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'positionQty')),
        liqPrice: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'liqPrice')),
        liqDistPct: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'liqDistPct')),
        bucketCapitalUsd: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'bucketCapitalUsd')),
        stakeUsd: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'stakeUsd')),
        stakePct: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'stakePct')),
        exitPrice: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'exitPrice')),
        exitReason: toOptionalStringOrNull(
            readRequiredField(raw, 'exitReason', 'exitReason')
        ),
        exitPnlPct: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'exitPnlPct')),
        performanceMetrics: mapPolicyPerformanceMetricsOrNull(
            readOptionalField(raw, 'performanceMetrics'),
            {
                owner: 'real-forecast-journal',
                label: `policyRows[${index}].performanceMetrics`
            }
        )
    }
}

function mapSnapshot(value: unknown, label: string): RealForecastJournalSnapshotDto {
    const raw = toObject(value, label)

    const rawPolicyRows = readRequiredField(raw, `${label}.policyRows`, 'policyRows')
    if (!Array.isArray(rawPolicyRows)) {
        throw new Error(`[real-forecast-journal] ${label}.policyRows must be an array.`)
    }

    return {
        generatedAtUtc: normalizeUtcInstant(
            readRequiredField(raw, `${label}.generatedAtUtc`, 'generatedAtUtc'),
            `${label}.generatedAtUtc`
        ),
        predictionDateUtc: normalizeUtcDayKey(
            readRequiredField(raw, `${label}.predictionDateUtc`, 'predictionDateUtc'),
            `${label}.predictionDateUtc`
        ),
        asOfUtc: normalizeUtcInstant(
            readRequiredField(raw, `${label}.asOfUtc`, 'asOfUtc'),
            `${label}.asOfUtc`
        ),
        dataCutoffUtc: normalizeUtcInstant(
            readRequiredField(raw, `${label}.dataCutoffUtc`, 'dataCutoffUtc'),
            `${label}.dataCutoffUtc`
        ),
        entryUtc: normalizeUtcInstant(
            readRequiredField(raw, `${label}.entryUtc`, 'entryUtc'),
            `${label}.entryUtc`
        ),
        exitUtc: normalizeUtcInstant(
            readRequiredField(raw, `${label}.exitUtc`, 'exitUtc'),
            `${label}.exitUtc`
        ),
        predLabel: toFiniteNumber(
            readRequiredField(raw, `${label}.predLabel`, 'predLabel'),
            `${label}.predLabel`
        ),
        predLabelDisplay: toNonEmptyString(
            readRequiredField(raw, `${label}.predLabelDisplay`, 'predLabelDisplay'),
            `${label}.predLabelDisplay`
        ),
        microDisplay: toNonEmptyString(
            readRequiredField(raw, `${label}.microDisplay`, 'microDisplay'),
            `${label}.microDisplay`
        ),
        pTotal: mapProbability(readRequiredField(raw, `${label}.pTotal`, 'pTotal'), `${label}.pTotal`),
        confDay: toFiniteNumber(readRequiredField(raw, `${label}.confDay`, 'confDay'), `${label}.confDay`),
        confMicro: toFiniteNumber(
            readRequiredField(raw, `${label}.confMicro`, 'confMicro'),
            `${label}.confMicro`
        ),
        entry: toFiniteNumber(readRequiredField(raw, `${label}.entry`, 'entry'), `${label}.entry`),
        minMove: toFiniteNumber(readRequiredField(raw, `${label}.minMove`, 'minMove'), `${label}.minMove`),
        reason: toNonEmptyString(readRequiredField(raw, `${label}.reason`, 'reason'), `${label}.reason`),
        previewNote: toOptionalStringOrNull(readOptionalField(raw, 'previewNote')),
        actualDay: mapActualDayOrNull(readOptionalField(raw, 'actualDay'), `${label}.actualDay`),
        policyRows: rawPolicyRows.map((item, index) => mapPolicyRow(item, index))
    }
}

function mapIndicatorValue(value: unknown, index: number): RealForecastJournalIndicatorValueDto {
    const raw = toObject(value, `indicatorItems[${index}]`)

    return {
        key: toNonEmptyString(readRequiredField(raw, 'key', 'key'), 'indicator.key'),
        group: toNonEmptyString(readRequiredField(raw, 'group', 'group'), 'indicator.group'),
        label: toNonEmptyString(readRequiredField(raw, 'label', 'label'), 'indicator.label'),
        numericValue: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'numericValue')),
        displayValue: toNonEmptyString(
            readRequiredField(raw, 'displayValue', 'displayValue'),
            'indicator.displayValue'
        ),
        unit: toOptionalStringOrNull(readOptionalField(raw, 'unit'))
    }
}

function mapIndicatorSnapshot(value: unknown, label: string): RealForecastJournalIndicatorSnapshotDto {
    const raw = toObject(value, label)
    const rawItems = readRequiredField(raw, `${label}.items`, 'items')
    if (!Array.isArray(rawItems)) {
        throw new Error(`[real-forecast-journal] ${label}.items must be an array.`)
    }

    return {
        phase: toNonEmptyString(readRequiredField(raw, `${label}.phase`, 'phase'), `${label}.phase`),
        anchorUtc: normalizeUtcInstant(
            readRequiredField(raw, `${label}.anchorUtc`, 'anchorUtc'),
            `${label}.anchorUtc`
        ),
        featureBarOpenUtc: normalizeUtcInstant(
            readRequiredField(raw, `${label}.featureBarOpenUtc`, 'featureBarOpenUtc'),
            `${label}.featureBarOpenUtc`
        ),
        featureBarCloseUtc: normalizeUtcInstant(
            readRequiredField(raw, `${label}.featureBarCloseUtc`, 'featureBarCloseUtc'),
            `${label}.featureBarCloseUtc`
        ),
        indicatorDayUtc: normalizeUtcDayKey(
            readRequiredField(raw, `${label}.indicatorDayUtc`, 'indicatorDayUtc'),
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
            readRequiredField(raw, 'finalizedAtUtc', 'finalizedAtUtc'),
            'finalizedAtUtc'
        ),
        forecastHash: toNonEmptyString(
            readRequiredField(raw, 'forecastHash', 'forecastHash'),
            'forecastHash'
        ),
        snapshot: mapSnapshot(readRequiredField(raw, 'snapshot', 'snapshot'), 'finalize.snapshot'),
        report: mapReportResponse(readRequiredField(raw, 'report', 'report')),
        endOfDayIndicators: mapIndicatorSnapshot(
            readRequiredField(raw, 'endOfDayIndicators', 'endOfDayIndicators'),
            'endOfDayIndicators'
        )
    }
}

function mapDayListItem(value: unknown, index: number): RealForecastJournalDayListItemDto {
    const raw = toObject(value, `dayList[${index}]`)
    const status = resolveStatus(readRequiredField(raw, 'status', 'status'))
    const predictedDirection = (() => {
        const rawValue = readOptionalField(raw, 'predictedDirection')
        return rawValue === null || typeof rawValue === 'undefined'
            ? null
            : resolveDirectionToken(rawValue, 'predictedDirection')
    })()

    if (
        predictedDirection === null &&
        (status === 'captured' || status === 'finalized' || status === 'recovered_exception')
    ) {
        throw new Error(`[real-forecast-journal] predictedDirection is required for status=${status}.`)
    }

    return {
        id: toNonEmptyString(readRequiredField(raw, 'id', 'id'), 'id'),
        runKind: resolveRunKind(readRequiredField(raw, 'runKind', 'runKind')),
        predictionDateUtc: normalizeUtcDayKey(
            readRequiredField(raw, 'predictionDateUtc', 'predictionDateUtc'),
            'predictionDateUtc'
        ),
        status,
        trainingScope: resolveTrainingScope(readRequiredField(raw, 'trainingScope', 'trainingScope')),
        capturedAtUtc: (() => {
            const rawValue = readOptionalField(raw, 'capturedAtUtc')
            return rawValue === null || typeof rawValue === 'undefined'
                ? null
                : normalizeUtcInstant(rawValue, 'capturedAtUtc')
        })(),
        entryUtc: normalizeUtcInstant(readRequiredField(raw, 'entryUtc', 'entryUtc'), 'entryUtc'),
        exitUtc: normalizeUtcInstant(readRequiredField(raw, 'exitUtc', 'exitUtc'), 'exitUtc'),
        finalizedAtUtc: (() => {
            const rawValue = readOptionalField(raw, 'finalizedAtUtc')
            return rawValue === null || typeof rawValue === 'undefined' ?
                    null
                :   normalizeUtcInstant(rawValue, 'finalizedAtUtc')
        })(),
        predictedDirection,
        predLabelDisplay: (() => {
            const rawValue = readOptionalField(raw, 'predLabelDisplay')
            return rawValue === null || typeof rawValue === 'undefined'
                ? null
                : toNonEmptyString(rawValue, 'predLabelDisplay')
        })(),
        microDisplay: (() => {
            const rawValue = readOptionalField(raw, 'microDisplay')
            return rawValue === null || typeof rawValue === 'undefined'
                ? null
                : toNonEmptyString(rawValue, 'microDisplay')
        })(),
        totalUpProbability: toOptionalFiniteNumberOrNull(
            readOptionalField(raw, 'totalUpProbability')
        ),
        totalFlatProbability: toOptionalFiniteNumberOrNull(
            readOptionalField(raw, 'totalFlatProbability')
        ),
        totalDownProbability: toOptionalFiniteNumberOrNull(
            readOptionalField(raw, 'totalDownProbability')
        ),
        dayConfidence: toOptionalFiniteNumberOrNull(
            readOptionalField(raw, 'dayConfidence')
        ),
        microConfidence: toOptionalFiniteNumberOrNull(
            readOptionalField(raw, 'microConfidence')
        ),
        actualDirection: (() => {
            const rawValue = readOptionalField(raw, 'actualDirection')
            return rawValue === null || typeof rawValue === 'undefined' ?
                    null
                :   resolveDirectionToken(rawValue, 'actualDirection')
        })(),
        directionMatched: toOptionalBooleanOrNull(readOptionalField(raw, 'directionMatched'))
    }
}

function mapDayRecord(value: unknown): RealForecastJournalDayRecordDto {
    const raw = toObject(value, 'realForecastJournalDay')
    const status = resolveStatus(readRequiredField(raw, 'status', 'status'))

    return {
        id: toNonEmptyString(readRequiredField(raw, 'id', 'id'), 'id'),
        runKind: resolveRunKind(readRequiredField(raw, 'runKind', 'runKind')),
        status,
        trainingScope: resolveTrainingScope(readRequiredField(raw, 'trainingScope', 'trainingScope')),
        predictionDateUtc: normalizeUtcDayKey(
            readRequiredField(raw, 'predictionDateUtc', 'predictionDateUtc'),
            'predictionDateUtc'
        ),
        capturedAtUtc: (() => {
            const rawValue = readOptionalField(raw, 'capturedAtUtc')
            return rawValue === null || typeof rawValue === 'undefined'
                ? null
                : normalizeUtcInstant(rawValue, 'capturedAtUtc')
        })(),
        entryUtc: normalizeUtcInstant(readRequiredField(raw, 'entryUtc', 'entryUtc'), 'entryUtc'),
        exitUtc: normalizeUtcInstant(readRequiredField(raw, 'exitUtc', 'exitUtc'), 'exitUtc'),
        forecastHash: (() => {
            const rawValue = readOptionalField(raw, 'forecastHash')
            return rawValue === null || typeof rawValue === 'undefined'
                ? null
                : toNonEmptyString(rawValue, 'forecastHash')
        })(),
        forecastSnapshot: (() => {
            const rawValue = readOptionalField(raw, 'forecastSnapshot')
            return rawValue === null || typeof rawValue === 'undefined'
                ? null
                : mapSnapshot(rawValue, 'forecastSnapshot')
        })(),
        forecastReport: (() => {
            const rawValue = readOptionalField(raw, 'forecastReport')
            return rawValue === null || typeof rawValue === 'undefined' ? null : mapReportResponse(rawValue)
        })(),
        sessionOpenIndicators: (() => {
            const rawValue = readOptionalField(raw, 'sessionOpenIndicators')
            return rawValue === null || typeof rawValue === 'undefined' ? null : mapIndicatorSnapshot(rawValue, 'sessionOpenIndicators')
        })(),
        finalize: mapFinalizeRecordOrNull(readOptionalField(raw, 'finalize'))
    }
}

function mapOpsCheckpointOrNull(value: unknown, label: string): RealForecastJournalOpsCheckpointDto | null {
    if (value === null || typeof value === 'undefined') {
        return null
    }

    const raw = toObject(value, label)

    return {
        predictionDateUtc: normalizeUtcDayKey(
            readRequiredField(raw, `${label}.predictionDateUtc`, 'predictionDateUtc'),
            `${label}.predictionDateUtc`
        ),
        runKind: resolveRunKind(readRequiredField(raw, `${label}.runKind`, 'runKind')),
        occurredAtUtc: normalizeUtcInstant(
            readRequiredField(raw, `${label}.occurredAtUtc`, 'occurredAtUtc'),
            `${label}.occurredAtUtc`
        )
    }
}

function mapOpsStatus(value: unknown): RealForecastJournalOpsStatusDto {
    const raw = toObject(value, 'realForecastJournalOpsStatus')

    const mapOptionalUtcInstant = (field: string): string | null => {
        const rawValue = readOptionalField(raw, field)
        return rawValue === null || typeof rawValue === 'undefined' ? null : normalizeUtcInstant(rawValue, field)
    }

    const mapOptionalUtcDay = (field: string): string | null => {
        const rawValue = readOptionalField(raw, field)
        return rawValue === null || typeof rawValue === 'undefined' ? null : normalizeUtcDayKey(rawValue, field)
    }

    return {
        runKind: resolveRunKind(readRequiredField(raw, 'runKind', 'runKind')),
        health: resolveOpsHealth(readRequiredField(raw, 'health', 'health')),
        statusReason: toNonEmptyString(
            readRequiredField(raw, 'statusReason', 'statusReason'),
            'statusReason'
        ),
        checkedAtUtc: normalizeUtcInstant(
            readRequiredField(raw, 'checkedAtUtc', 'checkedAtUtc'),
            'checkedAtUtc'
        ),
        pollIntervalSeconds: toFiniteNumber(
            readRequiredField(raw, 'pollIntervalSeconds', 'pollIntervalSeconds'),
            'pollIntervalSeconds'
        ),
        workerStartedAtUtc: mapOptionalUtcInstant('workerStartedAtUtc'),
        lastLoopStartedAtUtc: mapOptionalUtcInstant('lastLoopStartedAtUtc'),
        lastLoopCompletedAtUtc: mapOptionalUtcInstant('lastLoopCompletedAtUtc'),
        workerHeartbeatStale: toBoolean(
            readRequiredField(raw, 'workerHeartbeatStale', 'workerHeartbeatStale'),
            'workerHeartbeatStale'
        ),
        consecutiveFailureCount: toFiniteNumber(
            readRequiredField(raw, 'consecutiveFailureCount', 'consecutiveFailureCount'),
            'consecutiveFailureCount'
        ),
        lastFailureAtUtc: mapOptionalUtcInstant('lastFailureAtUtc'),
        lastFailureStage: toOptionalStringOrNull(readOptionalField(raw, 'lastFailureStage')),
        lastFailureMessage: toOptionalStringOrNull(readOptionalField(raw, 'lastFailureMessage')),
        lastSuccessfulCapture: mapOpsCheckpointOrNull(
            readOptionalField(raw, 'lastSuccessfulCapture'),
            'lastSuccessfulCapture'
        ),
        lastSuccessfulFinalize: mapOpsCheckpointOrNull(
            readOptionalField(raw, 'lastSuccessfulFinalize'),
            'lastSuccessfulFinalize'
        ),
        activeRecordCount: toFiniteNumber(
            readRequiredField(raw, 'activeRecordCount', 'activeRecordCount'),
            'activeRecordCount'
        ),
        archiveRecordCount: toFiniteNumber(
            readRequiredField(raw, 'archiveRecordCount', 'archiveRecordCount'),
            'archiveRecordCount'
        ),
        expectedCaptureDayUtc: mapOptionalUtcDay('expectedCaptureDayUtc'),
        expectedCaptureTargetUtc: mapOptionalUtcInstant('expectedCaptureTargetUtc'),
        expectedCaptureDayStatus: (() => {
            const rawValue = readOptionalField(raw, 'expectedCaptureDayStatus')
            return rawValue === null || typeof rawValue === 'undefined' ? null : resolveStatus(rawValue)
        })(),
        nextCaptureDayUtc: mapOptionalUtcDay('nextCaptureDayUtc'),
        nextCaptureTargetUtc: mapOptionalUtcInstant('nextCaptureTargetUtc'),
        captureWindowClosed: toBoolean(
            readRequiredField(raw, 'captureWindowClosed', 'captureWindowClosed'),
            'captureWindowClosed'
        ),
        hasRecordForExpectedCaptureDay: toBoolean(
            readRequiredField(
                raw,
                'hasRecordForExpectedCaptureDay',
                'hasRecordForExpectedCaptureDay'
            ),
            'hasRecordForExpectedCaptureDay'
        ),
        captureOverdue: toBoolean(
            readRequiredField(raw, 'captureOverdue', 'captureOverdue'),
            'captureOverdue'
        ),
        activePendingDayUtc: mapOptionalUtcDay('activePendingDayUtc'),
        activePendingExitUtc: mapOptionalUtcInstant('activePendingExitUtc'),
        activePendingFinalizeDueUtc: mapOptionalUtcInstant(
            'activePendingFinalizeDueUtc'
        ),
        readyToFinalizeCount: toFiniteNumber(
            readRequiredField(raw, 'readyToFinalizeCount', 'readyToFinalizeCount'),
            'readyToFinalizeCount'
        ),
        oldestReadyToFinalizeDayUtc: mapOptionalUtcDay('oldestReadyToFinalizeDayUtc')
    }
}

function mapLiveRowObservation(value: unknown, index: number): RealForecastJournalLiveRowObservationDto {
    const raw = toObject(value, `liveRows[${index}]`)

    return {
        rowKey: toNonEmptyString(readRequiredField(raw, 'rowKey', 'rowKey'), 'rowKey'),
        policyName: toNonEmptyString(readRequiredField(raw, 'policyName', 'policyName'), 'policyName'),
        branch: toNonEmptyString(readRequiredField(raw, 'branch', 'branch'), 'branch'),
        bucket: toNonEmptyString(readRequiredField(raw, 'bucket', 'bucket'), 'bucket'),
        status: resolveLiveRowStatus(readRequiredField(raw, 'status', 'status')),
        eventTimeUtc: (() => {
            const rawValue = readOptionalField(raw, 'eventTimeUtc')
            return rawValue === null || typeof rawValue === 'undefined' ?
                    null
                :   normalizeUtcInstant(rawValue, 'eventTimeUtc')
        })(),
        eventPrice: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'eventPrice')),
        latestClosedMinuteOpenUtc: (() => {
            const rawValue = readOptionalField(raw, 'latestClosedMinuteOpenUtc')
            return rawValue === null || typeof rawValue === 'undefined' ?
                    null
                :   normalizeUtcInstant(rawValue, 'latestClosedMinuteOpenUtc')
        })(),
        observedHighPrice: toOptionalFiniteNumberOrNull(
            readOptionalField(raw, 'observedHighPrice')
        ),
        observedLowPrice: toOptionalFiniteNumberOrNull(readOptionalField(raw, 'observedLowPrice'))
    }
}

function mapLiveStatus(value: unknown): RealForecastJournalLiveStatusDto {
    const raw = toObject(value, 'realForecastJournalLiveStatus')
    const rawRows = readRequiredField(raw, 'rows', 'rows')
    if (!Array.isArray(rawRows)) {
        throw new Error('[real-forecast-journal] rows must be an array.')
    }

    return {
        runKind: resolveRunKind(readRequiredField(raw, 'runKind', 'runKind')),
        predictionDateUtc: normalizeUtcDayKey(
            readRequiredField(raw, 'predictionDateUtc', 'predictionDateUtc'),
            'predictionDateUtc'
        ),
        checkedAtUtc: normalizeUtcInstant(
            readRequiredField(raw, 'checkedAtUtc', 'checkedAtUtc'),
            'checkedAtUtc'
        ),
        currentPrice: toFiniteNumber(
            readRequiredField(raw, 'currentPrice', 'currentPrice'),
            'currentPrice'
        ),
        currentPriceObservedAtUtc: normalizeUtcInstant(
            readRequiredField(
                raw,
                'currentPriceObservedAtUtc',
                'currentPriceObservedAtUtc'
            ),
            'currentPriceObservedAtUtc'
        ),
        minuteObservationStartUtc: normalizeUtcInstant(
            readRequiredField(
                raw,
                'minuteObservationStartUtc',
                'minuteObservationStartUtc'
            ),
            'minuteObservationStartUtc'
        ),
        minuteObservationThroughUtc: normalizeUtcInstant(
            readRequiredField(
                raw,
                'minuteObservationThroughUtc',
                'minuteObservationThroughUtc'
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
    params.set('runKind', resolveRunKindOrDefault(args?.runKind))
    if (typeof args?.days === 'number' && Number.isFinite(args.days) && args.days > 0) {
        params.set('days', String(args.days))
    }

    const query = params.toString()
    const url = `${API_BASE_URL}${dayList.path}${query ? `?${query}` : ''}`
    const response = await fetch(url)

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(buildDetailedRequestErrorMessage('Failed to load real forecast journal index', response, text))
    }

    return parseRealForecastJournalDayListResponse(await response.json())
}

async function fetchRealForecastJournalDay(
    args: RealForecastJournalDayQueryArgs
): Promise<RealForecastJournalDayRecordDto> {
    const params = new URLSearchParams({
        dateUtc: normalizeUtcDayKey(args.dateUtc, 'dateUtc'),
        runKind: resolveRunKindOrDefault(args.runKind)
    })
    const url = `${API_BASE_URL}${byDate.path}?${params.toString()}`
    const response = await fetch(url)

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(buildDetailedRequestErrorMessage('Failed to load real forecast journal day', response, text))
    }

    return parseRealForecastJournalDayRecordResponse(await response.json())
}

async function fetchRealForecastJournalOpsStatus(
    args?: RealForecastJournalOpsStatusQueryArgs
): Promise<RealForecastJournalOpsStatusDto> {
    const params = new URLSearchParams({
        runKind: resolveRunKindOrDefault(args?.runKind)
    })
    const url = `${API_BASE_URL}${opsStatus.path}?${params.toString()}`
    const response = await fetch(url, { cache: 'no-store' })

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(buildDetailedRequestErrorMessage('Failed to load real forecast journal ops status', response, text))
    }

    return parseRealForecastJournalOpsStatusResponse(await response.json())
}

async function fetchRealForecastJournalLiveStatus(
    args: RealForecastJournalDayQueryArgs
): Promise<RealForecastJournalLiveStatusDto> {
    const params = new URLSearchParams({
        dateUtc: normalizeUtcDayKey(args.dateUtc, 'dateUtc'),
        runKind: resolveRunKindOrDefault(args.runKind)
    })
    const url = `${API_BASE_URL}${liveStatus.path}?${params.toString()}`
    const response = await fetch(url, { cache: 'no-store' })

    if (!response.ok) {
        const text = await response.text().catch(() => '')
        throw new Error(buildDetailedRequestErrorMessage('Failed to load real forecast journal live status', response, text))
    }

    return parseRealForecastJournalLiveStatusResponse(await response.json())
}

function resolveDayQueryKeySegment(args?: RealForecastJournalDayQueryArgs): string {
    if (!args) {
        return 'unselected'
    }

    return `${resolveRunKindOrDefault(args.runKind)}:${normalizeUtcDayKey(args.dateUtc, 'dateUtc')}`
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
    const runKind = resolveRunKindOrDefault(args?.runKind)

    return useQuery({
        queryKey: [...REAL_FORECAST_JOURNAL_QUERY_KEY, 'index', runKind, args?.days ?? 'all'] as const,
        queryFn: () => fetchRealForecastJournalDayList(args),
        enabled: options?.enabled ?? true,
        retry: false,
        // Journal page должна обновляться без ручного refresh, когда worker записывает новый capture/finalize.
        refetchInterval: QUERY_POLICY_REGISTRY.realForecastJournal.indexRefetchIntervalMs
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
        refetchInterval: QUERY_POLICY_REGISTRY.realForecastJournal.dayRefetchIntervalMs
    })
}

/**
 * Загружает backend ops-status для countdown-блока journal страницы.
 * Фронт не вычисляет NY/DST расписание самостоятельно, чтобы не расходиться с worker-контрактом.
 */
export function useRealForecastJournalOpsStatusQuery(
    args?: RealForecastJournalOpsStatusQueryArgs,
    options?: RealForecastJournalOpsStatusQueryOptions
): UseQueryResult<RealForecastJournalOpsStatusDto, Error> {
    const runKind = resolveRunKindOrDefault(args?.runKind)

    return useQuery({
        queryKey: [...REAL_FORECAST_JOURNAL_QUERY_KEY, 'ops-status', runKind] as const,
        queryFn: () => fetchRealForecastJournalOpsStatus({ runKind }),
        enabled: options?.enabled ?? true,
        retry: false,
        refetchInterval: QUERY_POLICY_REGISTRY.realForecastJournal.opsStatusRefetchIntervalMs
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
        refetchInterval: QUERY_POLICY_REGISTRY.realForecastJournal.liveStatusRefetchIntervalMs
    })
}

export async function prefetchRealForecastJournalDayList(queryClient: QueryClient): Promise<void> {
    await queryClient.prefetchQuery({
        queryKey: [
            ...REAL_FORECAST_JOURNAL_QUERY_KEY,
            'index',
            DEFAULT_REAL_FORECAST_JOURNAL_RUN_KIND,
            'all'
        ] as const,
        queryFn: () => fetchRealForecastJournalDayList({
            runKind: DEFAULT_REAL_FORECAST_JOURNAL_RUN_KIND
        })
    })
}

