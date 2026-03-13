import type { ReportDocumentDto } from '@/shared/types/report.types'
import { mapReportResponseWithOptions } from '../utils/mapReportResponse'
import { API_ROUTES } from '../routes'
import { useQuery, useQueryClient, type QueryClient, type UseQueryResult } from '@tanstack/react-query'
import { API_BASE_URL } from '../../configs/config'
import { resolveReportSourceEndpoint } from '@/shared/utils/reportSourceEndpoint'
import { DEFAULT_FETCH_TIMEOUT_MS, fetchWithTimeout } from './utils/fetchWithTimeout'
import {
    resolvePolicyBranchMegaBucketFromQuery,
    resolvePolicyBranchMegaTotalBucketViewFromQuery,
    resolvePolicyBranchMegaMetricFromQuery,
    resolvePolicyBranchMegaSlModeFromQuery,
    resolvePolicyBranchMegaTpSlModeFromQuery,
    resolvePolicyBranchMegaZonalModeFromQuery,
    type PolicyBranchMegaBucketMode,
    type PolicyBranchMegaTotalBucketView,
    type PolicyBranchMegaMetricMode,
    type PolicyBranchMegaSlMode,
    type PolicyBranchMegaTpSlMode,
    type PolicyBranchMegaZonalMode
} from '@/shared/utils/policyBranchMegaTabs'
import {
    DEFAULT_REPORT_BUCKET_MODE,
    DEFAULT_REPORT_TOTAL_BUCKET_VIEW,
    DEFAULT_REPORT_METRIC_MODE,
    DEFAULT_REPORT_SL_MODE,
    DEFAULT_REPORT_TP_SL_MODE,
    DEFAULT_REPORT_ZONAL_MODE
} from '@/shared/utils/reportViewCapabilities'

const POLICY_BRANCH_MEGA_QUERY_KEY_BASE = ['backtest', 'policy-branch-mega'] as const
const POLICY_BRANCH_MEGA_WITH_FRESHNESS_QUERY_KEY_BASE = ['backtest', 'policy-branch-mega', 'with-freshness'] as const
const { path } = API_ROUTES.backtest.policyBranchMegaGet
const { path: statusPath } = API_ROUTES.backtest.policyBranchMegaStatusGet

export type PolicyBranchMegaFreshnessState = 'fresh' | 'stale' | 'missing' | 'unknown'
export type PolicyBranchMegaSourceMode = 'actual' | 'debug'

interface UsePolicyBranchMegaNavOptions {
    enabled: boolean
}

interface UsePolicyBranchMegaWithFreshnessOptions {
    enabled?: boolean
}

export interface PolicyBranchMegaReportQueryArgs {
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
    bucket: DEFAULT_REPORT_BUCKET_MODE,
    bucketView: DEFAULT_REPORT_TOTAL_BUCKET_VIEW,
    metric: DEFAULT_REPORT_METRIC_MODE,
    tpSlMode: DEFAULT_REPORT_TP_SL_MODE,
    slMode: DEFAULT_REPORT_SL_MODE,
    zonalMode: DEFAULT_REPORT_ZONAL_MODE
}

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
const POLICY_BRANCH_MEGA_AVAILABLE_SL: readonly PolicyBranchMegaExplicitSlMode[] = ['with-sl', 'no-sl']
const POLICY_BRANCH_MEGA_AVAILABLE_ZONAL: readonly PolicyBranchMegaZonalMode[] = ['with-zonal', 'without-zonal']

export const POLICY_BRANCH_MEGA_STALE_TIME_MS = 2 * 60 * 1000
export const POLICY_BRANCH_MEGA_GC_TIME_MS = 15 * 60 * 1000
export const POLICY_BRANCH_MEGA_REQUEST_TIMEOUT_MS = DEFAULT_FETCH_TIMEOUT_MS

function buildPolicyBranchMegaPath(args?: PolicyBranchMegaReportQueryArgs): string {
    const params = new URLSearchParams()

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
    return query ? `${path}?${query}` : path
}

export function buildPolicyBranchMegaQueryKey(args?: PolicyBranchMegaReportQueryArgs) {
    return [
        ...POLICY_BRANCH_MEGA_QUERY_KEY_BASE,
        args?.bucket ?? null,
        args?.bucketView ?? null,
        args?.metric ?? null,
        args?.part ?? null,
        args?.tpSlMode ?? null,
        args?.slMode ?? null,
        args?.zonalMode ?? null
    ] as const
}

function buildPolicyBranchMegaWithFreshnessQueryKey(args?: PolicyBranchMegaReportQueryArgs) {
    return [
        ...POLICY_BRANCH_MEGA_WITH_FRESHNESS_QUERY_KEY_BASE,
        args?.bucket ?? null,
        args?.bucketView ?? null,
        args?.metric ?? null,
        args?.part ?? null,
        args?.tpSlMode ?? null,
        args?.slMode ?? null,
        args?.zonalMode ?? null
    ] as const
}

interface PolicyBranchMegaStatusDto {
    state: PolicyBranchMegaFreshnessState
    message: string
    lagSeconds: number | null
    policyBranchMegaId: string | null
    policyBranchMegaGeneratedAtUtc: string | null
    diagnosticsId: string | null
    diagnosticsGeneratedAtUtc: string | null
    availableBuckets: PolicyBranchMegaBucketMode[]
    availableParts: number[]
    availableTotalBucketViews: PolicyBranchMegaTotalBucketView[]
    availableMetrics: PolicyBranchMegaMetricMode[]
    availableTpSlModes: PolicyBranchMegaTpSlMode[]
    availableSlModes: PolicyBranchMegaExplicitSlMode[]
    availableZonalModes: PolicyBranchMegaZonalMode[]
}

export interface PolicyBranchMegaFreshnessInfoDto {
    sourceMode: PolicyBranchMegaSourceMode
    sourceEndpoint: string
    state: PolicyBranchMegaFreshnessState
    message: string
    lagSeconds: number | null
    policyBranchMegaId: string | null
    policyBranchMegaGeneratedAtUtc: string | null
    diagnosticsId: string | null
    diagnosticsGeneratedAtUtc: string | null
}

export interface PolicyBranchMegaCapabilitiesDto {
    availableBuckets: PolicyBranchMegaBucketMode[]
    availableParts: number[]
    availableTotalBucketViews: PolicyBranchMegaTotalBucketView[]
    availableMetrics: PolicyBranchMegaMetricMode[]
    availableTpSlModes: PolicyBranchMegaTpSlMode[]
    availableSlModes: PolicyBranchMegaExplicitSlMode[]
    availableZonalModes: PolicyBranchMegaZonalMode[]
}

export interface PolicyBranchMegaResolvedQueryDto {
    bucket: PolicyBranchMegaBucketMode
    bucketView: PolicyBranchMegaTotalBucketView
    metric: PolicyBranchMegaMetricMode
    part: number | null
    tpSlMode: PolicyBranchMegaTpSlMode
    slMode: PolicyBranchMegaSlMode
    zonalMode: PolicyBranchMegaZonalMode
}

export interface PolicyBranchMegaReportWithFreshnessDto {
    report: ReportDocumentDto
    freshness: PolicyBranchMegaFreshnessInfoDto
    capabilities: PolicyBranchMegaCapabilitiesDto | null
    resolvedQuery: PolicyBranchMegaResolvedQueryDto
}

function toObject(raw: unknown): Record<string, unknown> {
    if (!raw || typeof raw !== 'object') {
        throw new Error('[policy-branch-mega] status payload is not an object.')
    }

    return raw as Record<string, unknown>
}

function toState(raw: unknown): PolicyBranchMegaFreshnessState {
    if (raw === 'fresh' || raw === 'stale' || raw === 'missing' || raw === 'unknown') {
        return raw
    }

    throw new Error(`[policy-branch-mega] invalid status.state: ${String(raw)}`)
}

function toOptionalString(raw: unknown): string | null {
    if (typeof raw !== 'string') return null
    const trimmed = raw.trim()
    return trimmed.length > 0 ? trimmed : null
}

function toOptionalNumber(raw: unknown): number | null {
    if (typeof raw !== 'number' || Number.isNaN(raw) || !Number.isFinite(raw)) return null
    return raw
}

function toAllowedValueArray<TValue extends string>(
    raw: unknown,
    fieldName: string,
    allowedValues: readonly TValue[]
): TValue[] {
    if (raw == null) {
        return []
    }

    if (!Array.isArray(raw)) {
        throw new Error(`[policy-branch-mega] status field '${fieldName}' must be an array.`)
    }

    const allowed = new Set<TValue>(allowedValues)
    const values = new Set<TValue>()

    raw.forEach((item, index) => {
        if (typeof item !== 'string') {
            throw new Error(`[policy-branch-mega] status field '${fieldName}' has non-string item at index=${index}.`)
        }

        const value = item.trim() as TValue
        if (!allowed.has(value)) {
            throw new Error(`[policy-branch-mega] status field '${fieldName}' has unsupported value '${item}'.`)
        }

        values.add(value)
    })

    return allowedValues.filter(value => values.has(value))
}

function toPositiveIntArray(raw: unknown, fieldName: string): number[] {
    if (raw == null) {
        return []
    }

    if (!Array.isArray(raw)) {
        throw new Error(`[policy-branch-mega] status field '${fieldName}' must be an array.`)
    }

    const values = new Set<number>()

    raw.forEach((item, index) => {
        if (typeof item !== 'number' || !Number.isInteger(item) || item < 1) {
            throw new Error(`[policy-branch-mega] status field '${fieldName}' has invalid part at index=${index}.`)
        }

        values.add(item)
    })

    return Array.from(values).sort((a, b) => a - b)
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

export function resolvePolicyBranchMegaReportQueryArgs(
    args?: PolicyBranchMegaReportQueryArgs
): PolicyBranchMegaReportQueryArgs {
    const bucket = resolvePolicyBranchMegaBucketFromQuery(args?.bucket, DEFAULT_REPORT_BUCKET_MODE)
    const bucketView = resolvePolicyBranchMegaTotalBucketViewFromQuery(
        args?.bucketView,
        DEFAULT_REPORT_TOTAL_BUCKET_VIEW
    )

    return {
        bucket,
        bucketView: bucket === 'total' ? bucketView : DEFAULT_REPORT_TOTAL_BUCKET_VIEW,
        metric: resolvePolicyBranchMegaMetricFromQuery(args?.metric, DEFAULT_REPORT_METRIC_MODE),
        part: normalizePolicyBranchMegaPart(args?.part),
        tpSlMode: resolvePolicyBranchMegaTpSlModeFromQuery(args?.tpSlMode, DEFAULT_REPORT_TP_SL_MODE),
        slMode: resolvePolicyBranchMegaSlModeFromQuery(args?.slMode, DEFAULT_REPORT_SL_MODE),
        zonalMode: resolvePolicyBranchMegaZonalModeFromQuery(args?.zonalMode, DEFAULT_REPORT_ZONAL_MODE)
    }
}

function buildRequestedPolicyBranchMegaQuery(args: PolicyBranchMegaReportQueryArgs): PolicyBranchMegaResolvedQueryDto {
    const explicitArgs = resolvePolicyBranchMegaReportQueryArgs(args)

    return {
        bucket: explicitArgs.bucket as PolicyBranchMegaBucketMode,
        bucketView: explicitArgs.bucketView as PolicyBranchMegaTotalBucketView,
        metric: explicitArgs.metric as PolicyBranchMegaMetricMode,
        part: explicitArgs.part ?? null,
        tpSlMode: explicitArgs.tpSlMode as PolicyBranchMegaTpSlMode,
        slMode: explicitArgs.slMode as PolicyBranchMegaSlMode,
        zonalMode: explicitArgs.zonalMode as PolicyBranchMegaZonalMode
    }
}

function resolveCapabilitiesFromStatus(
    status: PolicyBranchMegaStatusDto | null
): PolicyBranchMegaCapabilitiesDto | null {
    if (!status) {
        return null
    }

    return {
        availableBuckets: status.availableBuckets,
        availableParts: status.availableParts,
        availableTotalBucketViews: status.availableTotalBucketViews,
        availableMetrics: status.availableMetrics,
        availableTpSlModes: status.availableTpSlModes,
        availableSlModes: status.availableSlModes,
        availableZonalModes: status.availableZonalModes
    }
}

function validateRequestedPolicyBranchMegaQuery(
    requested: PolicyBranchMegaResolvedQueryDto,
    capabilities: PolicyBranchMegaCapabilitiesDto | null
): void {
    if (!capabilities) {
        return
    }

    const assertSupported = <TValue extends string>(
        field: string,
        requestedValue: TValue,
        availableValues: readonly TValue[]
    ) => {
        if (availableValues.length === 0 || availableValues.includes(requestedValue)) {
            return
        }

        throw new Error(
            `[policy-branch-mega] requested ${field} is unsupported. requested=${requestedValue}, available=${availableValues.join(',')}.`
        )
    }

    assertSupported('bucket', requested.bucket, capabilities.availableBuckets)

    if (requested.bucket === 'total') {
        assertSupported('bucketview', requested.bucketView, capabilities.availableTotalBucketViews)
    }

    assertSupported('metric', requested.metric, capabilities.availableMetrics)
    if (requested.part !== null) {
        const availableParts = capabilities.availableParts
        if (availableParts.length > 0 && !availableParts.includes(requested.part)) {
            throw new Error(
                `[policy-branch-mega] requested part is unsupported. requested=${requested.part}, available=${availableParts.join(',')}.`
            )
        }
    }
    assertSupported('tpsl', requested.tpSlMode, capabilities.availableTpSlModes)
    if (requested.slMode !== 'all') {
        assertSupported('slmode', requested.slMode, capabilities.availableSlModes)
    }
    assertSupported('zonal', requested.zonalMode, capabilities.availableZonalModes)
}

function toReportQueryArgs(query: PolicyBranchMegaResolvedQueryDto): PolicyBranchMegaReportQueryArgs {
    return {
        bucket: query.bucket,
        bucketView: query.bucket === 'total' ? query.bucketView : null,
        metric: query.metric,
        part: query.part,
        tpSlMode: query.tpSlMode,
        slMode: query.slMode,
        zonalMode: query.zonalMode
    }
}

function mapPolicyBranchMegaStatus(raw: unknown): PolicyBranchMegaStatusDto {
    const payload = toObject(raw)
    const state = toState(payload.state)
    const message =
        typeof payload.message === 'string' && payload.message.trim().length > 0 ?
            payload.message.trim()
        :   `policy_branch_mega status: ${state}`

    return {
        state,
        message,
        lagSeconds: toOptionalNumber(payload.lagSeconds),
        policyBranchMegaId: toOptionalString(payload.policyBranchMegaId),
        policyBranchMegaGeneratedAtUtc: toOptionalString(payload.policyBranchMegaGeneratedAtUtc),
        diagnosticsId: toOptionalString(payload.diagnosticsId),
        diagnosticsGeneratedAtUtc: toOptionalString(payload.diagnosticsGeneratedAtUtc),
        availableBuckets: toAllowedValueArray(
            payload.availableBuckets,
            'availableBuckets',
            POLICY_BRANCH_MEGA_AVAILABLE_BUCKETS
        ),
        availableParts: toPositiveIntArray(payload.availableParts, 'availableParts'),
        availableTotalBucketViews: toAllowedValueArray(
            payload.availableTotalBucketViews,
            'availableTotalBucketViews',
            POLICY_BRANCH_MEGA_AVAILABLE_TOTAL_BUCKET_VIEWS
        ),
        availableMetrics: toAllowedValueArray(
            payload.availableMetrics,
            'availableMetrics',
            POLICY_BRANCH_MEGA_AVAILABLE_METRICS
        ),
        availableTpSlModes: toAllowedValueArray(
            payload.availableTpSlModes,
            'availableTpSlModes',
            POLICY_BRANCH_MEGA_AVAILABLE_TP_SL
        ),
        availableSlModes: toAllowedValueArray(
            payload.availableSlModes,
            'availableSlModes',
            POLICY_BRANCH_MEGA_AVAILABLE_SL
        ),
        availableZonalModes: toAllowedValueArray(
            payload.availableZonalModes,
            'availableZonalModes',
            POLICY_BRANCH_MEGA_AVAILABLE_ZONAL
        )
    }
}

function toFreshnessInfo(status: PolicyBranchMegaStatusDto | null): PolicyBranchMegaFreshnessInfoDto {
    const sourceEndpoint = resolveReportSourceEndpoint()

    if (!status) {
        return {
            sourceMode: 'debug',
            sourceEndpoint,
            state: 'unknown',
            message: 'Unable to verify report freshness (status endpoint unavailable).',
            lagSeconds: null,
            policyBranchMegaId: null,
            policyBranchMegaGeneratedAtUtc: null,
            diagnosticsId: null,
            diagnosticsGeneratedAtUtc: null
        }
    }

    return {
        sourceMode: status.state === 'fresh' ? 'actual' : 'debug',
        sourceEndpoint,
        state: status.state,
        message: status.message,
        lagSeconds: status.lagSeconds,
        policyBranchMegaId: status.policyBranchMegaId,
        policyBranchMegaGeneratedAtUtc: status.policyBranchMegaGeneratedAtUtc,
        diagnosticsId: status.diagnosticsId,
        diagnosticsGeneratedAtUtc: status.diagnosticsGeneratedAtUtc
    }
}
async function fetchPolicyBranchMegaStatusOrNull(): Promise<PolicyBranchMegaStatusDto | null> {
    const resp = await fetchWithTimeout(`${API_BASE_URL}${statusPath}`, {
        cache: 'no-store',
        timeoutMs: POLICY_BRANCH_MEGA_REQUEST_TIMEOUT_MS
    })
    if (!resp.ok) {
        return null
    }

    const raw = await resp.json()
    return mapPolicyBranchMegaStatus(raw)
}

export async function fetchPolicyBranchMegaReport(args?: PolicyBranchMegaReportQueryArgs): Promise<ReportDocumentDto> {
    const reportPath = buildPolicyBranchMegaPath(args)
    const resp = await fetchWithTimeout(`${API_BASE_URL}${reportPath}`, {
        cache: 'no-store',
        timeoutMs: POLICY_BRANCH_MEGA_REQUEST_TIMEOUT_MS
    })

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Failed to load policy branch mega report: ${resp.status} ${text}`)
    }

    const raw = await resp.json()
    return mapReportResponseWithOptions(raw, { policyBranchMegaMetadataMode: 'strict' })
}

async function fetchPolicyBranchMegaReportWithFreshness(
    args: PolicyBranchMegaReportQueryArgs
): Promise<PolicyBranchMegaReportWithFreshnessDto> {
    let status: PolicyBranchMegaStatusDto | null = null

    try {
        status = await fetchPolicyBranchMegaStatusOrNull()
    } catch {
        status = null
    }

    const capabilities = resolveCapabilitiesFromStatus(status)
    const resolvedQuery = buildRequestedPolicyBranchMegaQuery(args)
    validateRequestedPolicyBranchMegaQuery(resolvedQuery, capabilities)

    // Freshness status only enriches the UI. Actual page failure must come from the report endpoint itself,
    // otherwise stale/missing metadata would mask the real 4xx/5xx or network error that blocked the payload.
    const report = await fetchPolicyBranchMegaReport(toReportQueryArgs(resolvedQuery))
    const freshness = toFreshnessInfo(status)

    if (status?.state === 'fresh' && status.policyBranchMegaId) {
        const expectedId = status.policyBranchMegaId.trim()
        const loadedId = report.id.trim()

        if (loadedId.length === 0) {
            throw new Error('[policy-branch-mega] Loaded report id is empty.')
        }

        if (loadedId !== expectedId) {
            throw new Error(
                `[policy-branch-mega] Loaded report id (${loadedId}) does not match latest verified id (${expectedId}).`
            )
        }
    }

    return {
        report,
        freshness,
        capabilities,
        resolvedQuery
    }
}

async function loadPolicyBranchMegaReportWithFreshnessAndCache(
    queryClient: QueryClient,
    args: PolicyBranchMegaReportQueryArgs
): Promise<PolicyBranchMegaReportWithFreshnessDto> {
    const resolvedArgs = resolvePolicyBranchMegaReportQueryArgs(args)
    const payload = await fetchPolicyBranchMegaReportWithFreshness(resolvedArgs)
    queryClient.setQueryData(buildPolicyBranchMegaQueryKey(resolvedArgs), payload.report)
    queryClient.setQueryData(buildPolicyBranchMegaWithFreshnessQueryKey(resolvedArgs), payload)
    return payload
}

export function usePolicyBranchMegaReportWithFreshnessQuery(
    args: PolicyBranchMegaReportQueryArgs,
    options?: UsePolicyBranchMegaWithFreshnessOptions
): UseQueryResult<PolicyBranchMegaReportWithFreshnessDto, Error> {
    const queryClient = useQueryClient()
    const resolvedArgs = resolvePolicyBranchMegaReportQueryArgs(args)
    const withFreshnessKey = buildPolicyBranchMegaWithFreshnessQueryKey(resolvedArgs)

    return useQuery({
        queryKey: withFreshnessKey,
        queryFn: () => loadPolicyBranchMegaReportWithFreshnessAndCache(queryClient, resolvedArgs),
        enabled: options?.enabled ?? true,
        retry: false,
        staleTime: POLICY_BRANCH_MEGA_STALE_TIME_MS,
        gcTime: POLICY_BRANCH_MEGA_GC_TIME_MS,
        refetchOnWindowFocus: false
    })
}

export async function prefetchPolicyBranchMegaReportWithFreshness(
    queryClient: QueryClient,
    args: PolicyBranchMegaReportQueryArgs
): Promise<void> {
    const resolvedArgs = resolvePolicyBranchMegaReportQueryArgs(args)
    const withFreshnessKey = buildPolicyBranchMegaWithFreshnessQueryKey(resolvedArgs)

    await queryClient.prefetchQuery({
        queryKey: withFreshnessKey,
        queryFn: () => loadPolicyBranchMegaReportWithFreshnessAndCache(queryClient, resolvedArgs),
        staleTime: POLICY_BRANCH_MEGA_STALE_TIME_MS,
        gcTime: POLICY_BRANCH_MEGA_GC_TIME_MS
    })
}

export function usePolicyBranchMegaReportNavQuery(
    options: UsePolicyBranchMegaNavOptions,
    args: PolicyBranchMegaReportQueryArgs
): UseQueryResult<ReportDocumentDto, Error> {
    const queryClient = useQueryClient()
    const resolvedArgs = resolvePolicyBranchMegaReportQueryArgs(args)
    const reportKey = buildPolicyBranchMegaQueryKey(resolvedArgs)
    const withFreshnessKey = buildPolicyBranchMegaWithFreshnessQueryKey(resolvedArgs)

    return useQuery({
        queryKey: reportKey,
        queryFn: async () => {
            const cachedPayload = queryClient.getQueryData<PolicyBranchMegaReportWithFreshnessDto>(withFreshnessKey)
            if (cachedPayload?.report) {
                return cachedPayload.report
            }

            return fetchPolicyBranchMegaReport(resolvedArgs)
        },
        initialData: () => {
            const cachedPayload = queryClient.getQueryData<PolicyBranchMegaReportWithFreshnessDto>(withFreshnessKey)
            return cachedPayload?.report
        },
        enabled: options.enabled,
        retry: false,
        staleTime: POLICY_BRANCH_MEGA_STALE_TIME_MS,
        gcTime: POLICY_BRANCH_MEGA_GC_TIME_MS,
        refetchOnWindowFocus: false
    })
}
