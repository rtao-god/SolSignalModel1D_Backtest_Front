import type { ReportDocumentDto } from '@/shared/types/report.types'
import type {
    PolicyEvaluationDto,
    PolicyEvaluationStatus,
    PolicyRowEvaluationMapDto
} from '@/shared/types/policyEvaluation.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { API_ROUTES } from '../routes'
import { useQuery, useQueryClient, type QueryClient, type UseQueryResult } from '@tanstack/react-query'
import { API_BASE_URL } from '../../configs/config'
import { QUERY_POLICY_REGISTRY } from '@/shared/configs/queryPolicies'
import { fetchWithTimeout } from './utils/fetchWithTimeout'
import { buildDetailedRequestErrorMessage } from './utils/requestErrorMessage'
import { resolveAdjacentPartWindow } from '@/shared/lib/reportPartWindow/resolveAdjacentPartWindow'
import {
    prefetchPublishedReportVariantSelectionSnapshot,
    PUBLISHED_REPORT_VARIANT_FAMILIES
} from './reportVariants'
import {
    resolvePolicyBranchMegaHistoryFromQuery,
    resolvePolicyBranchMegaBucketFromQuery,
    resolvePolicyBranchMegaTotalBucketViewFromQuery,
    resolvePolicyBranchMegaMetricFromQuery,
    resolvePolicyBranchMegaSlModeFromQuery,
    resolvePolicyBranchMegaTpSlModeFromQuery,
    resolvePolicyBranchMegaZonalModeFromQuery,
    type PolicyBranchMegaHistoryMode,
    type PolicyBranchMegaBucketMode,
    type PolicyBranchMegaTotalBucketView,
    type PolicyBranchMegaMetricMode,
    type PolicyBranchMegaSlMode,
    type PolicyBranchMegaTpSlMode,
    type PolicyBranchMegaZonalMode
} from '@/shared/utils/policyBranchMegaTabs'

const POLICY_BRANCH_MEGA_QUERY_KEY_BASE = ['backtest', 'policy-branch-mega'] as const
const POLICY_BRANCH_MEGA_REPORT_QUERY_KEY_BASE = ['backtest', 'policy-branch-mega', 'report'] as const
const POLICY_BRANCH_MEGA_EVALUATION_QUERY_KEY_BASE = ['backtest', 'policy-branch-mega', 'evaluation'] as const
const POLICY_BRANCH_MEGA_PAYLOAD_QUERY_KEY_BASE = ['backtest', 'policy-branch-mega', 'payload'] as const
const POLICY_BRANCH_MEGA_VALIDATION_QUERY_KEY_BASE = ['backtest', 'policy-branch-mega', 'validation'] as const
const POLICY_BRANCH_MEGA_MODE_MONEY_SUMMARY_QUERY_KEY_BASE =
    ['backtest', 'policy-branch-mega', 'mode-money-summary'] as const
const { path } = API_ROUTES.backtest.policyBranchMegaGet
const { path: payloadPath } = API_ROUTES.backtest.policyBranchMegaPayloadGet
const { path: evaluationPath } = API_ROUTES.backtest.policyBranchMegaEvaluationGet
const { path: validationPath } = API_ROUTES.backtest.policyBranchMegaValidationGet
const { path: modeMoneySummaryPath } = API_ROUTES.backtest.policyBranchMegaModeMoneySummaryGet

interface UsePolicyBranchMegaNavOptions {
    enabled: boolean
}

interface UsePolicyBranchMegaQueryOptions {
    enabled?: boolean
}

export interface PolicyBranchMegaReportQueryArgs {
    history?: string | null
    bucket?: string | null
    bucketView?: string | null
    metric?: string | null
    part?: number | null
    tpSlMode?: string | null
    slMode?: string | null
    zonalMode?: string | null
}

type PolicyBranchMegaExplicitSlMode = Exclude<PolicyBranchMegaSlMode, 'all'>

export const DEFAULT_POLICY_BRANCH_MEGA_REPORT_QUERY_ARGS: PolicyBranchMegaReportQueryArgs = {
    history: null,
    bucket: null,
    bucketView: null,
    metric: null,
    tpSlMode: null,
    slMode: null,
    zonalMode: null
}

const POLICY_BRANCH_MEGA_AVAILABLE_HISTORIES: readonly PolicyBranchMegaHistoryMode[] = [
    'full_history',
    'oos',
    'recent'
]
const POLICY_BRANCH_MEGA_AVAILABLE_BUCKETS: readonly PolicyBranchMegaBucketMode[] = [
    'daily',
    'intraday',
    'delayed',
    'total'
]
const POLICY_BRANCH_MEGA_AVAILABLE_TOTAL_BUCKET_VIEWS: readonly PolicyBranchMegaTotalBucketView[] = [
    'aggregate',
    'separate'
]
const POLICY_BRANCH_MEGA_AVAILABLE_METRICS: readonly PolicyBranchMegaMetricMode[] = ['real', 'no-biggest-liq-loss']
const POLICY_BRANCH_MEGA_AVAILABLE_TP_SL: readonly PolicyBranchMegaTpSlMode[] = ['all', 'dynamic', 'static']
const POLICY_BRANCH_MEGA_AVAILABLE_ZONAL: readonly PolicyBranchMegaZonalMode[] = ['with-zonal', 'without-zonal']
export const POLICY_BRANCH_MEGA_CANONICAL_PARTS = [1, 2, 3, 4] as const
export const DEFAULT_POLICY_BRANCH_MEGA_BUCKET_MODE: PolicyBranchMegaBucketMode = 'daily'
export const DEFAULT_POLICY_BRANCH_MEGA_TOTAL_BUCKET_VIEW: PolicyBranchMegaTotalBucketView = 'aggregate'
export const DEFAULT_POLICY_BRANCH_MEGA_HISTORY_MODE: PolicyBranchMegaHistoryMode = 'full_history'
export const DEFAULT_POLICY_BRANCH_MEGA_METRIC_MODE: PolicyBranchMegaMetricMode = 'real'
export const DEFAULT_POLICY_BRANCH_MEGA_TP_SL_MODE: PolicyBranchMegaTpSlMode = 'all'
export const DEFAULT_POLICY_BRANCH_MEGA_SL_MODE: PolicyBranchMegaSlMode = 'all'
export const DEFAULT_POLICY_BRANCH_MEGA_ZONAL_MODE: PolicyBranchMegaZonalMode = 'with-zonal'

export const POLICY_BRANCH_MEGA_STALE_TIME_MS = QUERY_POLICY_REGISTRY.policyBranchMega.staleTimeMs
export const POLICY_BRANCH_MEGA_GC_TIME_MS = QUERY_POLICY_REGISTRY.policyBranchMega.gcTimeMs
export const POLICY_BRANCH_MEGA_REQUEST_TIMEOUT_MS = QUERY_POLICY_REGISTRY.policyBranchMega.requestTimeoutMs

interface PolicyBranchMegaPartPrefetchOptions {
    queryKey: ReturnType<typeof buildPolicyBranchMegaQueryKey>
    queryFn: () => Promise<ReportDocumentDto>
    staleTime: number
    gcTime: number
}

interface PolicyBranchMegaPayloadQueryOptions {
    queryKey: ReturnType<typeof buildPolicyBranchMegaPayloadQueryKey>
    queryFn: () => Promise<PolicyBranchMegaReportPayloadDto>
    enabled: boolean
    retry: false
    staleTime: number
    gcTime: number
    refetchOnWindowFocus: false
}

function buildPolicyBranchMegaPath(args: PolicyBranchMegaReportQueryArgs | undefined, basePath: string): string {
    const params = new URLSearchParams()

    if (args?.history) {
        params.set('history', args.history)
    }

    if (args?.bucket) {
        params.set('bucket', args.bucket)
    }

    if (args?.bucketView) {
        params.set('bucketview', args.bucketView)
    }

    if (args?.metric) {
        params.set('metric', args.metric)
    }

    if (typeof args?.part === 'number' && Number.isInteger(args.part) && args.part > 0) {
        params.set('part', String(args.part))
    }

    if (args?.tpSlMode) {
        params.set('tpsl', args.tpSlMode)
    }

    if (args?.slMode) {
        params.set('slmode', args.slMode)
    }

    if (args?.zonalMode) {
        params.set('zonal', args.zonalMode)
    }

    const query = params.toString()
    return query ? `${basePath}?${query}` : basePath
}

export function buildPolicyBranchMegaQueryKey(args?: PolicyBranchMegaReportQueryArgs) {
    return [
        ...POLICY_BRANCH_MEGA_QUERY_KEY_BASE,
        args?.history ?? null,
        args?.bucket ?? null,
        args?.bucketView ?? null,
        args?.metric ?? null,
        args?.part ?? null,
        args?.tpSlMode ?? null,
        args?.slMode ?? null,
        args?.zonalMode ?? null
    ] as const
}

export function buildPolicyBranchMegaEvaluationQueryKey(args?: PolicyBranchMegaReportQueryArgs) {
    return [
        ...POLICY_BRANCH_MEGA_EVALUATION_QUERY_KEY_BASE,
        args?.history ?? null,
        args?.bucket ?? null,
        args?.bucketView ?? null,
        args?.metric ?? null,
        args?.part ?? null,
        args?.tpSlMode ?? null,
        args?.slMode ?? null,
        args?.zonalMode ?? null
    ] as const
}

function buildPolicyBranchMegaReportDocumentQueryKey(args?: PolicyBranchMegaReportQueryArgs) {
    return [
        ...POLICY_BRANCH_MEGA_REPORT_QUERY_KEY_BASE,
        args?.history ?? null,
        args?.bucket ?? null,
        args?.bucketView ?? null,
        args?.metric ?? null,
        args?.part ?? null,
        args?.tpSlMode ?? null,
        args?.slMode ?? null,
        args?.zonalMode ?? null
    ] as const
}

function buildPolicyBranchMegaPartPrefetchOptions(
    queryClient: QueryClient,
    args: PolicyBranchMegaReportQueryArgs
): PolicyBranchMegaPartPrefetchOptions {
    return {
        queryKey: buildPolicyBranchMegaQueryKey(args),
        queryFn: async () => (await loadPolicyBranchMegaReportPayloadAndCache(queryClient, args)).report,
        staleTime: POLICY_BRANCH_MEGA_STALE_TIME_MS,
        gcTime: POLICY_BRANCH_MEGA_GC_TIME_MS
    }
}

/**
 * Возвращает окно из активной части и соседних частей слева/справа.
 * Нужно для table-view: пользователь должен видеть текущую часть,
 * а соседние части должны подгружаться фоном до перехода по скроллу.
 */
export function resolvePolicyBranchMegaNeighborParts(
    availableParts: readonly number[],
    activePart: number
): number[] {
    return resolveAdjacentPartWindow(availableParts, activePart, 1)
}

function buildPolicyBranchMegaPayloadQueryKey(args?: PolicyBranchMegaReportQueryArgs) {
    return [
        ...POLICY_BRANCH_MEGA_PAYLOAD_QUERY_KEY_BASE,
        args?.history ?? null,
        args?.bucket ?? null,
        args?.bucketView ?? null,
        args?.metric ?? null,
        args?.part ?? null,
        args?.tpSlMode ?? null,
        args?.slMode ?? null,
        args?.zonalMode ?? null
    ] as const
}

function buildPolicyBranchMegaValidationQueryKey(args?: PolicyBranchMegaReportQueryArgs) {
    return [
        ...POLICY_BRANCH_MEGA_VALIDATION_QUERY_KEY_BASE,
        args?.history ?? null,
        args?.bucket ?? null,
        args?.bucketView ?? null,
        args?.metric ?? null,
        args?.part ?? null,
        args?.tpSlMode ?? null,
        args?.slMode ?? null,
        args?.zonalMode ?? null
    ] as const
}

function buildPolicyBranchMegaModeMoneySummaryQueryKey() {
    return POLICY_BRANCH_MEGA_MODE_MONEY_SUMMARY_QUERY_KEY_BASE
}

export type PolicyBranchMegaValidationState = 'pending' | 'matched' | 'mismatch' | 'error'

export interface PolicyBranchMegaCapabilitiesDto {
    availableHistories: PolicyBranchMegaHistoryMode[]
    availableBuckets: PolicyBranchMegaBucketMode[]
    availableParts: number[]
    availableTotalBucketViews: PolicyBranchMegaTotalBucketView[]
    availableMetrics: PolicyBranchMegaMetricMode[]
    availableTpSlModes: PolicyBranchMegaTpSlMode[]
    availableSlModes: PolicyBranchMegaExplicitSlMode[]
    availableZonalModes: PolicyBranchMegaZonalMode[]
}

export interface PolicyBranchMegaResolvedQueryDto {
    history: PolicyBranchMegaHistoryMode
    bucket: PolicyBranchMegaBucketMode
    bucketView: PolicyBranchMegaTotalBucketView
    metric: PolicyBranchMegaMetricMode
    part: number | null
    tpSlMode: PolicyBranchMegaTpSlMode
    slMode: PolicyBranchMegaSlMode
    zonalMode: PolicyBranchMegaZonalMode
}

export interface PolicyBranchMegaReportPayloadDto {
    report: ReportDocumentDto
    evaluation: PolicyRowEvaluationMapDto | null
    capabilities: PolicyBranchMegaCapabilitiesDto
    resolvedQuery: PolicyBranchMegaResolvedQueryDto
}

export interface PolicyBranchMegaValidationDto {
    state: PolicyBranchMegaValidationState
    message: string
    selectionKey: string
    policyBranchMegaId: string | null
    diagnosticsId: string | null
    requestedAtUtc: string | null
    checkedAtUtc: string | null
}

export interface PolicyBranchMegaModeMoneySummaryRowDto {
    modeKey: string
    modeLabel: string
    sliceKey: string
    sliceLabel: string
    moneySourceKind: string
    sourceStatus: string
    statusMessage: string
    executionDescriptor: string
    comparabilityNote: string
    completedDayCount: number | null
    tradeCount: number | null
    positiveReturnDayCount: number | null
    zeroReturnDayCount: number | null
    negativeReturnDayCount: number | null
    technicalAccuracyPct: number | null
    businessAccuracyPct: number | null
    compoundedReturnPct: number | null
    maxDrawdownPct: number | null
    sharpeAnnualized: number | null
    sourceArtifactKind: string
    sourceArtifactId: string
    sourceLocationHint: string
    policyName: string | null
    policyBranch: string | null
    policyMarginMode: string | null
}

export interface PolicyBranchMegaModeMoneySummaryDto {
    generatedAtUtc: string
    rows: PolicyBranchMegaModeMoneySummaryRowDto[]
}

function toObject(raw: unknown): Record<string, unknown> {
    if (!raw || typeof raw !== 'object') {
        throw new Error('[policy-branch-mega] payload is not an object.')
    }

    return raw as Record<string, unknown>
}

function toValidationState(raw: unknown): PolicyBranchMegaValidationState {
    if (raw === 'pending' || raw === 'matched' || raw === 'mismatch' || raw === 'error') {
        return raw
    }

    throw new Error(`[policy-branch-mega] invalid validation.state: ${String(raw)}`)
}

function toOptionalString(raw: unknown): string | null {
    if (typeof raw !== 'string') return null
    const trimmed = raw.trim()
    return trimmed.length > 0 ? trimmed : null
}

function toRequiredString(raw: unknown, label: string): string {
    if (typeof raw !== 'string') {
        throw new Error(`[policy-branch-mega] ${label} must be a string.`)
    }

    const normalized = raw.trim()
    if (normalized.length === 0) {
        throw new Error(`[policy-branch-mega] ${label} must be non-empty.`)
    }

    return normalized
}

function toOptionalStringOrNull(raw: unknown, label: string): string | null {
    if (raw === null || typeof raw === 'undefined') {
        return null
    }

    if (typeof raw !== 'string') {
        throw new Error(`[policy-branch-mega] ${label} must be a string or null.`)
    }

    const normalized = raw.trim()
    return normalized.length > 0 ? normalized : null
}

function toNullableNumber(raw: unknown, label: string): number | null {
    if (raw === null || typeof raw === 'undefined') {
        return null
    }

    if (typeof raw === 'number' && Number.isFinite(raw)) {
        return raw
    }

    throw new Error(`[policy-branch-mega] ${label} must be a finite number or null.`)
}

function toNullableInteger(raw: unknown, label: string): number | null {
    const parsed = toNullableNumber(raw, label)
    if (parsed === null) {
        return null
    }

    if (!Number.isInteger(parsed)) {
        throw new Error(`[policy-branch-mega] ${label} must be an integer or null.`)
    }

    return parsed
}

function toNullableBoolean(raw: unknown, label: string): boolean | null {
    if (raw === null || typeof raw === 'undefined') {
        return null
    }

    if (typeof raw === 'boolean') {
        return raw
    }

    throw new Error(`[policy-branch-mega] ${label} must be a boolean or null.`)
}

function mapPolicyEvaluationReasonResponse(raw: unknown, label: string) {
    const payload = toObject(raw)

    return {
        code: toRequiredString(payload.code, `${label}.code`),
        message: toRequiredString(payload.message, `${label}.message`)
    }
}

function mapPolicyEvaluationThresholdsResponse(raw: unknown, label: string) {
    const payload = toObject(raw)

    return {
        maxDrawdownPct: toNullableNumber(payload.maxDrawdownPct, `${label}.maxDrawdownPct`) ?? (() => {
            throw new Error(`[policy-branch-mega] ${label}.maxDrawdownPct must be present.`)
        })(),
        minTradesCount: toNullableInteger(payload.minTradesCount, `${label}.minTradesCount`) ?? (() => {
            throw new Error(`[policy-branch-mega] ${label}.minTradesCount must be present.`)
        })(),
        minCalmar: toNullableNumber(payload.minCalmar, `${label}.minCalmar`) ?? (() => {
            throw new Error(`[policy-branch-mega] ${label}.minCalmar must be present.`)
        })(),
        minSortino: toNullableNumber(payload.minSortino, `${label}.minSortino`) ?? (() => {
            throw new Error(`[policy-branch-mega] ${label}.minSortino must be present.`)
        })()
    }
}

function mapPolicyEvaluationMetricsResponse(raw: unknown, label: string) {
    const payload = toObject(raw)

    return {
        marginMode: toOptionalStringOrNull(payload.marginMode, `${label}.marginMode`),
        totalPnlPct: toNullableNumber(payload.totalPnlPct, `${label}.totalPnlPct`),
        maxDdPct: toNullableNumber(payload.maxDdPct, `${label}.maxDdPct`),
        maxDdNoLiqPct: toNullableNumber(payload.maxDdNoLiqPct, `${label}.maxDdNoLiqPct`),
        effectiveMaxDdPct: toNullableNumber(payload.effectiveMaxDdPct, `${label}.effectiveMaxDdPct`),
        hadLiquidation: toNullableBoolean(payload.hadLiquidation, `${label}.hadLiquidation`),
        realLiquidationCount: toNullableInteger(payload.realLiquidationCount, `${label}.realLiquidationCount`),
        accountRuinCount: toNullableInteger(payload.accountRuinCount, `${label}.accountRuinCount`),
        balanceDead: toNullableBoolean(payload.balanceDead, `${label}.balanceDead`),
        tradesCount: toNullableInteger(payload.tradesCount, `${label}.tradesCount`),
        calmar: toNullableNumber(payload.calmar, `${label}.calmar`),
        sortino: toNullableNumber(payload.sortino, `${label}.sortino`)
    }
}

function toPolicyEvaluationStatus(raw: unknown, label: string): PolicyEvaluationStatus {
    const status = toRequiredString(raw, label)
    if (status === 'good' || status === 'caution' || status === 'bad' || status === 'unknown') {
        return status
    }

    throw new Error(`[policy-branch-mega] ${label} has unsupported value '${status}'.`)
}

function mapPolicyEvaluationResponse(raw: unknown, label: string): PolicyEvaluationDto {
    const payload = toObject(raw)

    return {
        profileId: toRequiredString(payload.profileId, `${label}.profileId`),
        policySetupId: toOptionalStringOrNull(payload.policySetupId, `${label}.policySetupId`),
        status: toPolicyEvaluationStatus(payload.status, `${label}.status`),
        reasons:
            Array.isArray(payload.reasons) ?
                payload.reasons.map((item, index) =>
                    mapPolicyEvaluationReasonResponse(item, `${label}.reasons[${index}]`)
                )
            :   [],
        thresholds:
            payload.thresholds === null || typeof payload.thresholds === 'undefined' ?
                null
            :   mapPolicyEvaluationThresholdsResponse(payload.thresholds, `${label}.thresholds`),
        metrics: mapPolicyEvaluationMetricsResponse(payload.metrics ?? {}, `${label}.metrics`)
    }
}

function mapPolicyBranchMegaEvaluationMap(raw: unknown): PolicyRowEvaluationMapDto {
    const payload = toObject(raw)
    const rowsRaw = toObject(payload.rows)
    const rows: PolicyRowEvaluationMapDto['rows'] = {}

    Object.entries(rowsRaw).forEach(([rowKey, rowValue]) => {
        const normalizedRowKey = rowKey.trim()
        if (!normalizedRowKey) {
            throw new Error('[policy-branch-mega] evaluation.rows contains empty row key.')
        }

        rows[normalizedRowKey] = mapPolicyEvaluationResponse(
            rowValue,
            `evaluation.rows.${normalizedRowKey}`
        )
    })

    return {
        profileId: toRequiredString(payload.profileId, 'evaluation.profileId'),
        rows
    }
}

function normalizePolicyBranchMegaPart(part: number | null | undefined): number | null {
    if (part == null) {
        return null
    }

    if (!Number.isInteger(part) || part < 1) {
        throw new Error(`[policy-branch-mega] invalid part query '${String(part)}'.`)
    }

    return part
}

function resolveOptionalPolicyBranchMegaHistory(
    raw: string | null | undefined
): PolicyBranchMegaHistoryMode | null {
    return raw ? resolvePolicyBranchMegaHistoryFromQuery(raw, POLICY_BRANCH_MEGA_AVAILABLE_HISTORIES[0]) : null
}

function resolveOptionalPolicyBranchMegaBucket(
    raw: string | null | undefined
): PolicyBranchMegaBucketMode | null {
    return raw ? resolvePolicyBranchMegaBucketFromQuery(raw, POLICY_BRANCH_MEGA_AVAILABLE_BUCKETS[0]) : null
}

function resolveOptionalPolicyBranchMegaBucketView(
    raw: string | null | undefined
): PolicyBranchMegaTotalBucketView | null {
    return raw ? resolvePolicyBranchMegaTotalBucketViewFromQuery(raw, POLICY_BRANCH_MEGA_AVAILABLE_TOTAL_BUCKET_VIEWS[0]) : null
}

function resolveOptionalPolicyBranchMegaMetric(
    raw: string | null | undefined
): PolicyBranchMegaMetricMode | null {
    return raw ? resolvePolicyBranchMegaMetricFromQuery(raw, POLICY_BRANCH_MEGA_AVAILABLE_METRICS[0]) : null
}

function resolveOptionalPolicyBranchMegaTpSlMode(
    raw: string | null | undefined
): PolicyBranchMegaTpSlMode | null {
    return raw ? resolvePolicyBranchMegaTpSlModeFromQuery(raw, POLICY_BRANCH_MEGA_AVAILABLE_TP_SL[0]) : null
}

function resolveOptionalPolicyBranchMegaSlMode(
    raw: string | null | undefined
): PolicyBranchMegaSlMode | null {
    return raw ? resolvePolicyBranchMegaSlModeFromQuery(raw, 'all') : null
}

function resolveOptionalPolicyBranchMegaZonalMode(
    raw: string | null | undefined
): PolicyBranchMegaZonalMode | null {
    return raw ? resolvePolicyBranchMegaZonalModeFromQuery(raw, POLICY_BRANCH_MEGA_AVAILABLE_ZONAL[0]) : null
}

export function resolvePolicyBranchMegaReportQueryArgs(
    args?: PolicyBranchMegaReportQueryArgs
): PolicyBranchMegaReportQueryArgs {
    return {
        history: resolveOptionalPolicyBranchMegaHistory(args?.history),
        bucket: resolveOptionalPolicyBranchMegaBucket(args?.bucket),
        bucketView: resolveOptionalPolicyBranchMegaBucketView(args?.bucketView),
        metric: resolveOptionalPolicyBranchMegaMetric(args?.metric),
        part: normalizePolicyBranchMegaPart(args?.part),
        tpSlMode: resolveOptionalPolicyBranchMegaTpSlMode(args?.tpSlMode),
        slMode: resolveOptionalPolicyBranchMegaSlMode(args?.slMode),
        zonalMode: resolveOptionalPolicyBranchMegaZonalMode(args?.zonalMode)
    }
}

function mapResolvedPolicyBranchMegaQuery(raw: unknown): PolicyBranchMegaResolvedQueryDto {
    const resolution = toObject(raw)

    return {
        history: resolvePolicyBranchMegaHistoryFromQuery(
            toRequiredString(resolution.history, 'payload.resolvedQuery.history'),
            POLICY_BRANCH_MEGA_AVAILABLE_HISTORIES[0]
        ),
        bucket: resolvePolicyBranchMegaBucketFromQuery(
            toRequiredString(resolution.bucket, 'payload.resolvedQuery.bucket'),
            POLICY_BRANCH_MEGA_AVAILABLE_BUCKETS[0]
        ),
        bucketView: resolvePolicyBranchMegaTotalBucketViewFromQuery(
            toRequiredString(resolution.bucketView, 'payload.resolvedQuery.bucketView'),
            POLICY_BRANCH_MEGA_AVAILABLE_TOTAL_BUCKET_VIEWS[0]
        ),
        metric: resolvePolicyBranchMegaMetricFromQuery(
            toRequiredString(resolution.metric, 'payload.resolvedQuery.metric'),
            POLICY_BRANCH_MEGA_AVAILABLE_METRICS[0]
        ),
        part: normalizePolicyBranchMegaPart(toNullableInteger(resolution.part, 'payload.resolvedQuery.part')),
        tpSlMode: resolvePolicyBranchMegaTpSlModeFromQuery(
            toRequiredString(resolution.tpSlMode, 'payload.resolvedQuery.tpSlMode'),
            POLICY_BRANCH_MEGA_AVAILABLE_TP_SL[0]
        ),
        slMode: resolvePolicyBranchMegaSlModeFromQuery(
            toRequiredString(resolution.slMode, 'payload.resolvedQuery.slMode'),
            'all'
        ),
        zonalMode: resolvePolicyBranchMegaZonalModeFromQuery(
            toRequiredString(resolution.zonalMode, 'payload.resolvedQuery.zonalMode'),
            POLICY_BRANCH_MEGA_AVAILABLE_ZONAL[0]
        )
    }
}

function mapPolicyBranchMegaCapabilities(raw: unknown): PolicyBranchMegaCapabilitiesDto {
    const payload = toObject(raw)
    const readStringArray = (fieldName: string) => {
        const value = payload[fieldName]
        if (!Array.isArray(value)) {
            throw new Error(`[policy-branch-mega] payload.capabilities.${fieldName} must be an array.`)
        }

        return value.map((item, index) =>
            toRequiredString(item, `payload.capabilities.${fieldName}[${index}]`)
        )
    }
    const readPositiveIntArray = (fieldName: string) => {
        const value = payload[fieldName]
        if (!Array.isArray(value)) {
            throw new Error(`[policy-branch-mega] payload.capabilities.${fieldName} must be an array.`)
        }

        const values = value.map((item, index) => {
            if (typeof item !== 'number' || !Number.isInteger(item) || item <= 0) {
                throw new Error(
                    `[policy-branch-mega] payload.capabilities.${fieldName}[${index}] must be a positive integer.`
                )
            }

            return item
        })

        values.forEach((value, index) => {
            if (!Number.isInteger(value) || value <= 0) {
                throw new Error(
                    `[policy-branch-mega] payload.capabilities.${fieldName}[${index}] must be a positive integer.`
                )
            }
        })

        return values
    }

    return {
        availableHistories: readStringArray('availableHistories') as PolicyBranchMegaHistoryMode[],
        availableBuckets: readStringArray('availableBuckets') as PolicyBranchMegaBucketMode[],
        availableParts: readPositiveIntArray('availableParts'),
        availableTotalBucketViews: readStringArray('availableTotalBucketViews') as PolicyBranchMegaTotalBucketView[],
        availableMetrics: readStringArray('availableMetrics') as PolicyBranchMegaMetricMode[],
        availableTpSlModes: readStringArray('availableTpSlModes') as PolicyBranchMegaTpSlMode[],
        availableSlModes: readStringArray('availableSlModes').filter(
            (value): value is PolicyBranchMegaExplicitSlMode => value === 'with-sl' || value === 'no-sl'
        ),
        availableZonalModes: readStringArray('availableZonalModes') as PolicyBranchMegaZonalMode[]
    }
}

function toReportQueryArgs(query: PolicyBranchMegaResolvedQueryDto): PolicyBranchMegaReportQueryArgs {
    return {
        history: query.history,
        bucket: query.bucket,
        bucketView: query.bucket === 'total' ? query.bucketView : null,
        metric: query.metric,
        part: query.part,
        tpSlMode: query.tpSlMode,
        slMode: query.slMode,
        zonalMode: query.zonalMode
    }
}

function mapPolicyBranchMegaValidation(raw: unknown): PolicyBranchMegaValidationDto {
    const payload = toObject(raw)
    const state = toValidationState(payload.state)
    const message =
        typeof payload.message === 'string' && payload.message.trim().length > 0 ?
            payload.message.trim()
        :   `policy_branch_mega validation: ${state}`

    return {
        state,
        message,
        selectionKey: toRequiredString(payload.selectionKey, 'validation.selectionKey'),
        policyBranchMegaId: toOptionalString(payload.policyBranchMegaId),
        diagnosticsId: toOptionalString(payload.diagnosticsId),
        requestedAtUtc: toOptionalString(payload.requestedAtUtc),
        checkedAtUtc: toOptionalString(payload.checkedAtUtc)
    }
}

function mapPolicyBranchMegaPayload(raw: unknown): PolicyBranchMegaReportPayloadDto {
    const payload = toObject(raw)
    const report = payload.report
    if (!report || typeof report !== 'object') {
        throw new Error('[policy-branch-mega] payload.report is invalid.')
    }

    return {
        report: mapReportResponse(report),
        evaluation:
            payload.evaluation === null || typeof payload.evaluation === 'undefined' ?
                null
            :   mapPolicyBranchMegaEvaluationMap(payload.evaluation),
        capabilities: mapPolicyBranchMegaCapabilities(payload.capabilities),
        resolvedQuery: mapResolvedPolicyBranchMegaQuery(payload.resolvedQuery)
    }
}

function mapPolicyBranchMegaModeMoneySummaryRow(
    raw: unknown,
    index: number
): PolicyBranchMegaModeMoneySummaryRowDto {
    const payload = toObject(raw)
    const label = `modeMoneySummary.rows[${index}]`

    return {
        modeKey: toRequiredString(payload.modeKey, `${label}.modeKey`),
        modeLabel: toRequiredString(payload.modeLabel, `${label}.modeLabel`),
        sliceKey: toRequiredString(payload.sliceKey, `${label}.sliceKey`),
        sliceLabel: toRequiredString(payload.sliceLabel, `${label}.sliceLabel`),
        moneySourceKind: toRequiredString(payload.moneySourceKind, `${label}.moneySourceKind`),
        sourceStatus: toRequiredString(payload.sourceStatus, `${label}.sourceStatus`),
        statusMessage: toRequiredString(payload.statusMessage, `${label}.statusMessage`),
        executionDescriptor: toRequiredString(payload.executionDescriptor, `${label}.executionDescriptor`),
        comparabilityNote: toRequiredString(payload.comparabilityNote, `${label}.comparabilityNote`),
        completedDayCount: toNullableInteger(payload.completedDayCount, `${label}.completedDayCount`),
        tradeCount: toNullableInteger(payload.tradeCount, `${label}.tradeCount`),
        positiveReturnDayCount: toNullableInteger(payload.positiveReturnDayCount, `${label}.positiveReturnDayCount`),
        zeroReturnDayCount: toNullableInteger(payload.zeroReturnDayCount, `${label}.zeroReturnDayCount`),
        negativeReturnDayCount: toNullableInteger(payload.negativeReturnDayCount, `${label}.negativeReturnDayCount`),
        technicalAccuracyPct: toNullableNumber(payload.technicalAccuracyPct, `${label}.technicalAccuracyPct`),
        businessAccuracyPct: toNullableNumber(payload.businessAccuracyPct, `${label}.businessAccuracyPct`),
        compoundedReturnPct: toNullableNumber(payload.compoundedReturnPct, `${label}.compoundedReturnPct`),
        maxDrawdownPct: toNullableNumber(payload.maxDrawdownPct, `${label}.maxDrawdownPct`),
        sharpeAnnualized: toNullableNumber(payload.sharpeAnnualized, `${label}.sharpeAnnualized`),
        sourceArtifactKind: toRequiredString(payload.sourceArtifactKind, `${label}.sourceArtifactKind`),
        sourceArtifactId: toRequiredString(payload.sourceArtifactId, `${label}.sourceArtifactId`),
        sourceLocationHint: toRequiredString(payload.sourceLocationHint, `${label}.sourceLocationHint`),
        policyName: toOptionalStringOrNull(payload.policyName, `${label}.policyName`),
        policyBranch: toOptionalStringOrNull(payload.policyBranch, `${label}.policyBranch`),
        policyMarginMode: toOptionalStringOrNull(payload.policyMarginMode, `${label}.policyMarginMode`)
    }
}

function mapPolicyBranchMegaModeMoneySummary(raw: unknown): PolicyBranchMegaModeMoneySummaryDto {
    const payload = toObject(raw)
    if (!Array.isArray(payload.rows)) {
        throw new Error('[policy-branch-mega] modeMoneySummary.rows must be an array.')
    }

    return {
        generatedAtUtc: toRequiredString(payload.generatedAtUtc, 'modeMoneySummary.generatedAtUtc'),
        rows: payload.rows.map((row, index) => mapPolicyBranchMegaModeMoneySummaryRow(row, index))
    }
}

export async function fetchPolicyBranchMegaReport(args?: PolicyBranchMegaReportQueryArgs): Promise<ReportDocumentDto> {
    const reportPath = buildPolicyBranchMegaPath(args, path)
    const resp = await fetchWithTimeout(`${API_BASE_URL}${reportPath}`, {
        timeoutMs: POLICY_BRANCH_MEGA_REQUEST_TIMEOUT_MS
    })

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(buildDetailedRequestErrorMessage('Failed to load policy branch mega report', resp, text))
    }

    const raw = await resp.json()
    return mapReportResponse(raw)
}

export async function fetchPolicyBranchMegaEvaluationMap(
    args?: PolicyBranchMegaReportQueryArgs
): Promise<PolicyRowEvaluationMapDto> {
    const reportPath = buildPolicyBranchMegaPath(args, evaluationPath)
    const resp = await fetchWithTimeout(`${API_BASE_URL}${reportPath}`, {
        timeoutMs: POLICY_BRANCH_MEGA_REQUEST_TIMEOUT_MS
    })

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(buildDetailedRequestErrorMessage('Failed to load policy branch mega evaluation', resp, text))
    }

    return mapPolicyBranchMegaEvaluationMap(await resp.json())
}

export async function fetchPolicyBranchMegaValidation(
    args?: PolicyBranchMegaReportQueryArgs
): Promise<PolicyBranchMegaValidationDto> {
    const validationPathWithQuery = buildPolicyBranchMegaPath(args, validationPath)
    const resp = await fetchWithTimeout(`${API_BASE_URL}${validationPathWithQuery}`, {
        cache: 'no-store',
        timeoutMs: POLICY_BRANCH_MEGA_REQUEST_TIMEOUT_MS
    })

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(buildDetailedRequestErrorMessage('Failed to load policy branch mega validation', resp, text))
    }

    return mapPolicyBranchMegaValidation(await resp.json())
}

export async function fetchPolicyBranchMegaModeMoneySummary(): Promise<PolicyBranchMegaModeMoneySummaryDto> {
    const resp = await fetchWithTimeout(`${API_BASE_URL}${modeMoneySummaryPath}`, {
        cache: 'no-store',
        timeoutMs: POLICY_BRANCH_MEGA_REQUEST_TIMEOUT_MS
    })

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(
            buildDetailedRequestErrorMessage('Failed to load policy branch mega mode money summary', resp, text)
        )
    }

    return mapPolicyBranchMegaModeMoneySummary(await resp.json())
}

async function fetchPolicyBranchMegaReportPayload(
    args: PolicyBranchMegaReportQueryArgs
): Promise<PolicyBranchMegaReportPayloadDto> {
    const requestPath = buildPolicyBranchMegaPath(args, payloadPath)
    const resp = await fetchWithTimeout(`${API_BASE_URL}${requestPath}`, {
        timeoutMs: POLICY_BRANCH_MEGA_REQUEST_TIMEOUT_MS
    })

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(buildDetailedRequestErrorMessage('Failed to load policy branch mega payload', resp, text))
    }

    return mapPolicyBranchMegaPayload(await resp.json())
}

async function loadPolicyBranchMegaReportPayloadAndCache(
    queryClient: QueryClient,
    args: PolicyBranchMegaReportQueryArgs
): Promise<PolicyBranchMegaReportPayloadDto> {
    const requestedArgs = resolvePolicyBranchMegaReportQueryArgs(args)
    const payload = await fetchPolicyBranchMegaReportPayload(requestedArgs)
    const canonicalArgs = toReportQueryArgs(payload.resolvedQuery)

    queryClient.setQueryData(buildPolicyBranchMegaReportDocumentQueryKey(canonicalArgs), payload.report)
    queryClient.setQueryData(buildPolicyBranchMegaReportDocumentQueryKey(requestedArgs), payload.report)
    queryClient.setQueryData(buildPolicyBranchMegaQueryKey(canonicalArgs), payload.report)
    queryClient.setQueryData(buildPolicyBranchMegaPayloadQueryKey(canonicalArgs), payload)
    queryClient.setQueryData(buildPolicyBranchMegaQueryKey(requestedArgs), payload.report)
    queryClient.setQueryData(buildPolicyBranchMegaPayloadQueryKey(requestedArgs), payload)
    if (payload.evaluation) {
        queryClient.setQueryData(buildPolicyBranchMegaEvaluationQueryKey(canonicalArgs), payload.evaluation)
        queryClient.setQueryData(buildPolicyBranchMegaEvaluationQueryKey(requestedArgs), payload.evaluation)
    }
    return payload
}

export function buildPolicyBranchMegaPayloadQueryOptions(
    queryClient: QueryClient,
    args: PolicyBranchMegaReportQueryArgs,
    options?: UsePolicyBranchMegaQueryOptions
): PolicyBranchMegaPayloadQueryOptions {
    const requestedArgs = resolvePolicyBranchMegaReportQueryArgs(args)

    return {
        queryKey: buildPolicyBranchMegaPayloadQueryKey(requestedArgs),
        queryFn: () => loadPolicyBranchMegaReportPayloadAndCache(queryClient, requestedArgs),
        enabled: options?.enabled ?? true,
        retry: false,
        staleTime: POLICY_BRANCH_MEGA_STALE_TIME_MS,
        gcTime: POLICY_BRANCH_MEGA_GC_TIME_MS,
        refetchOnWindowFocus: false
    }
}

export function usePolicyBranchMegaReportQuery(
    args: PolicyBranchMegaReportQueryArgs,
    options?: UsePolicyBranchMegaQueryOptions
): UseQueryResult<PolicyBranchMegaReportPayloadDto, Error> {
    const queryClient = useQueryClient()
    const queryOptions = buildPolicyBranchMegaPayloadQueryOptions(queryClient, args, options)

    return useQuery(queryOptions)
}

export function usePolicyBranchMegaReportDocumentQuery(
    args: PolicyBranchMegaReportQueryArgs,
    options?: UsePolicyBranchMegaQueryOptions
): UseQueryResult<ReportDocumentDto, Error> {
    const queryClient = useQueryClient()
    const requestedArgs = resolvePolicyBranchMegaReportQueryArgs(args)

    return useQuery({
        queryKey: buildPolicyBranchMegaReportDocumentQueryKey(requestedArgs),
        queryFn: async () => {
            const cachedPayload = queryClient.getQueryData<PolicyBranchMegaReportPayloadDto>(
                buildPolicyBranchMegaPayloadQueryKey(requestedArgs)
            )
            if (cachedPayload?.report) {
                return cachedPayload.report
            }

            return (await loadPolicyBranchMegaReportPayloadAndCache(queryClient, requestedArgs)).report
        },
        enabled: options?.enabled ?? true,
        retry: false,
        staleTime: POLICY_BRANCH_MEGA_STALE_TIME_MS,
        gcTime: POLICY_BRANCH_MEGA_GC_TIME_MS,
        refetchOnWindowFocus: false
    })
}

export async function prefetchPolicyBranchMegaReportPayload(
    queryClient: QueryClient,
    args: PolicyBranchMegaReportQueryArgs
): Promise<void> {
    const queryOptions = buildPolicyBranchMegaPayloadQueryOptions(queryClient, args)

    await queryClient.prefetchQuery({
        queryKey: queryOptions.queryKey,
        queryFn: queryOptions.queryFn,
        staleTime: queryOptions.staleTime,
        gcTime: queryOptions.gcTime
    })
}

export function usePolicyBranchMegaEvaluationQuery(
    args: PolicyBranchMegaReportQueryArgs,
    options?: UsePolicyBranchMegaQueryOptions
): UseQueryResult<PolicyRowEvaluationMapDto, Error> {
    const resolvedArgs = resolvePolicyBranchMegaReportQueryArgs(args)

    return useQuery({
        queryKey: buildPolicyBranchMegaEvaluationQueryKey(resolvedArgs),
        queryFn: () => fetchPolicyBranchMegaEvaluationMap(resolvedArgs),
        enabled: options?.enabled ?? true,
        retry: false,
        staleTime: POLICY_BRANCH_MEGA_STALE_TIME_MS,
        gcTime: POLICY_BRANCH_MEGA_GC_TIME_MS,
        refetchOnWindowFocus: false
    })
}

/**
 * Прогревает первый payload и затем подтягивает остальные канонические part-срезы
 * для текущего выбора фильтров. Нужен navigation warmup, чтобы стрелки и hash-переходы
 * не ждали отдельный on-demand fetch после открытия mega-страницы.
 */
export async function prefetchPolicyBranchMegaReportParts(
    queryClient: QueryClient,
    args: PolicyBranchMegaReportQueryArgs
): Promise<void> {
    const resolvedArgs = resolvePolicyBranchMegaReportQueryArgs(args)
    const entryArgs = {
        ...resolvedArgs,
        part: resolvedArgs.part ?? 1
    }
    const payload = await loadPolicyBranchMegaReportPayloadAndCache(queryClient, entryArgs)
    const canonicalArgs = {
        ...toReportQueryArgs(payload.resolvedQuery),
        part: payload.resolvedQuery.part ?? entryArgs.part
    }
    const availableParts = payload.capabilities.availableParts
    const prefetchTasks: Array<Promise<void>> = []

    prefetchTasks.push(
        prefetchPublishedReportVariantSelectionSnapshot(queryClient, PUBLISHED_REPORT_VARIANT_FAMILIES.policyBranchMega, {
            history: canonicalArgs.history ?? null,
            bucket: canonicalArgs.bucket ?? null,
            bucketview: canonicalArgs.bucketView ?? null,
            metric: canonicalArgs.metric ?? null,
            part: String(canonicalArgs.part),
            tpsl: canonicalArgs.tpSlMode ?? null,
            slmode: canonicalArgs.slMode ?? null,
            zonal: canonicalArgs.zonalMode ?? null
        })
    )

    // В navigation warmup держим все части доступными, чтобы hash-переходы
    // и быстрый просмотр страницы не зависели от повторного on-demand fetch.
    for (const part of availableParts) {
        if (part === entryArgs.part) {
            continue
        }

        const partArgs = {
            ...canonicalArgs,
            part
        }

        prefetchTasks.push(queryClient.prefetchQuery(buildPolicyBranchMegaPartPrefetchOptions(queryClient, partArgs)))
    }

    if (prefetchTasks.length > 0) {
        await Promise.all(prefetchTasks)
    }
}

export function usePolicyBranchMegaReportNavQuery(
    options: UsePolicyBranchMegaNavOptions,
    args: PolicyBranchMegaReportQueryArgs
): UseQueryResult<ReportDocumentDto, Error> {
    const queryClient = useQueryClient()
    const resolvedArgs = resolvePolicyBranchMegaReportQueryArgs(args)
    const reportKey = buildPolicyBranchMegaQueryKey(resolvedArgs)
    const payloadKey = buildPolicyBranchMegaPayloadQueryKey(resolvedArgs)

    return useQuery({
        queryKey: reportKey,
        queryFn: async () => {
            const cachedPayload = queryClient.getQueryData<PolicyBranchMegaReportPayloadDto>(payloadKey)
            if (cachedPayload?.report) {
                return cachedPayload.report
            }

            return (await loadPolicyBranchMegaReportPayloadAndCache(queryClient, resolvedArgs)).report
        },
        initialData: () => {
            const cachedPayload = queryClient.getQueryData<PolicyBranchMegaReportPayloadDto>(payloadKey)
            return cachedPayload?.report
        },
        enabled: options.enabled,
        retry: false,
        staleTime: POLICY_BRANCH_MEGA_STALE_TIME_MS,
        gcTime: POLICY_BRANCH_MEGA_GC_TIME_MS,
        refetchOnWindowFocus: false
    })
}

export function usePolicyBranchMegaValidationQuery(
    args: PolicyBranchMegaReportQueryArgs,
    options?: UsePolicyBranchMegaQueryOptions
): UseQueryResult<PolicyBranchMegaValidationDto, Error> {
    const resolvedArgs = resolvePolicyBranchMegaReportQueryArgs(args)

    return useQuery({
        queryKey: buildPolicyBranchMegaValidationQueryKey(resolvedArgs),
        queryFn: () => fetchPolicyBranchMegaValidation(resolvedArgs),
        enabled: options?.enabled ?? true,
        retry: false,
        staleTime: QUERY_POLICY_REGISTRY.policyBranchMega.validation.staleTimeMs,
        gcTime: QUERY_POLICY_REGISTRY.policyBranchMega.validation.gcTimeMs,
        refetchOnWindowFocus: false,
        refetchInterval: query =>
            query.state.data?.state === 'pending' ?
                QUERY_POLICY_REGISTRY.policyBranchMega.validation.pendingRefetchIntervalMs
            :   false
    })
}

export function usePolicyBranchMegaModeMoneySummaryQuery(
    options?: UsePolicyBranchMegaQueryOptions
): UseQueryResult<PolicyBranchMegaModeMoneySummaryDto, Error> {
    return useQuery({
        queryKey: buildPolicyBranchMegaModeMoneySummaryQueryKey(),
        queryFn: fetchPolicyBranchMegaModeMoneySummary,
        enabled: options?.enabled ?? true,
        retry: false,
        staleTime: POLICY_BRANCH_MEGA_STALE_TIME_MS,
        gcTime: POLICY_BRANCH_MEGA_GC_TIME_MS,
        refetchOnWindowFocus: false
    })
}
