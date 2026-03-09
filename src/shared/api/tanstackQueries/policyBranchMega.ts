import type { ReportDocumentDto } from '@/shared/types/report.types'
import { mapReportResponseWithOptions } from '../utils/mapReportResponse'
import { API_ROUTES } from '../routes'
import { useQuery, useQueryClient, type QueryClient, type UseQueryResult } from '@tanstack/react-query'
import { API_BASE_URL } from '../../configs/config'
import { resolveReportSourceEndpointOrThrow } from '@/shared/utils/reportSourceEndpoint'
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
    tpSlMode?: string | null
    slMode?: string | null
    zonalMode?: string | null
}

type PolicyBranchMegaExplicitSlMode = Exclude<PolicyBranchMegaSlMode, 'all'>

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

const POLICY_BRANCH_MEGA_STALE_TIME_MS = 2 * 60 * 1000
const POLICY_BRANCH_MEGA_GC_TIME_MS = 15 * 60 * 1000

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

function buildPolicyBranchMegaQueryKey(args?: PolicyBranchMegaReportQueryArgs) {
    return [
        ...POLICY_BRANCH_MEGA_QUERY_KEY_BASE,
        args?.bucket ?? null,
        args?.bucketView ?? null,
        args?.metric ?? null,
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

function toObjectOrThrow(raw: unknown): Record<string, unknown> {
    if (!raw || typeof raw !== 'object') {
        throw new Error('[policy-branch-mega] status payload is not an object.')
    }

    return raw as Record<string, unknown>
}

function toStateOrThrow(raw: unknown): PolicyBranchMegaFreshnessState {
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

function toAllowedValueArrayOrThrow<TValue extends string>(
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

function resolveRequestedBucket(args?: PolicyBranchMegaReportQueryArgs): PolicyBranchMegaBucketMode {
    try {
        return resolvePolicyBranchMegaBucketFromQuery(args?.bucket, DEFAULT_REPORT_BUCKET_MODE)
    } catch {
        return DEFAULT_REPORT_BUCKET_MODE
    }
}

function resolveRequestedTotalBucketView(args?: PolicyBranchMegaReportQueryArgs): PolicyBranchMegaTotalBucketView {
    try {
        return resolvePolicyBranchMegaTotalBucketViewFromQuery(args?.bucketView, DEFAULT_REPORT_TOTAL_BUCKET_VIEW)
    } catch {
        return DEFAULT_REPORT_TOTAL_BUCKET_VIEW
    }
}

function resolveRequestedMetric(args?: PolicyBranchMegaReportQueryArgs): PolicyBranchMegaMetricMode {
    try {
        return resolvePolicyBranchMegaMetricFromQuery(args?.metric, DEFAULT_REPORT_METRIC_MODE)
    } catch {
        return DEFAULT_REPORT_METRIC_MODE
    }
}

function resolveRequestedTpSlMode(args?: PolicyBranchMegaReportQueryArgs): PolicyBranchMegaTpSlMode {
    try {
        return resolvePolicyBranchMegaTpSlModeFromQuery(args?.tpSlMode, DEFAULT_REPORT_TP_SL_MODE)
    } catch {
        return DEFAULT_REPORT_TP_SL_MODE
    }
}

function resolveRequestedSlMode(args?: PolicyBranchMegaReportQueryArgs): PolicyBranchMegaSlMode {
    try {
        return resolvePolicyBranchMegaSlModeFromQuery(args?.slMode, DEFAULT_REPORT_SL_MODE)
    } catch {
        return DEFAULT_REPORT_SL_MODE
    }
}

function resolveRequestedZonalMode(args?: PolicyBranchMegaReportQueryArgs): PolicyBranchMegaZonalMode {
    try {
        return resolvePolicyBranchMegaZonalModeFromQuery(args?.zonalMode, DEFAULT_REPORT_ZONAL_MODE)
    } catch {
        return DEFAULT_REPORT_ZONAL_MODE
    }
}

function buildRequestedPolicyBranchMegaQuery(args?: PolicyBranchMegaReportQueryArgs): PolicyBranchMegaResolvedQueryDto {
    return {
        bucket: resolveRequestedBucket(args),
        bucketView: resolveRequestedTotalBucketView(args),
        metric: resolveRequestedMetric(args),
        tpSlMode: resolveRequestedTpSlMode(args),
        slMode: resolveRequestedSlMode(args),
        zonalMode: resolveRequestedZonalMode(args)
    }
}

function pickSupportedValue<TValue extends string>(
    requested: TValue,
    availableValues: readonly TValue[],
    defaultValue: TValue
): TValue {
    if (availableValues.length === 0) {
        return requested
    }

    if (availableValues.includes(requested)) {
        return requested
    }

    if (availableValues.includes(defaultValue)) {
        return defaultValue
    }

    return availableValues[0]
}

function pickSupportedSlMode(
    requested: PolicyBranchMegaSlMode,
    availableValues: readonly PolicyBranchMegaExplicitSlMode[]
): PolicyBranchMegaSlMode {
    if (availableValues.length === 0) {
        return requested
    }

    const hasWithSl = availableValues.includes('with-sl')
    const hasNoSl = availableValues.includes('no-sl')

    if (requested === 'all') {
        if (hasWithSl && hasNoSl) {
            return 'all'
        }

        return hasWithSl ? 'with-sl' : 'no-sl'
    }

    if (availableValues.includes(requested)) {
        return requested
    }

    if (hasWithSl && hasNoSl) {
        return 'all'
    }

    return hasWithSl ? 'with-sl' : 'no-sl'
}

function resolveCapabilitiesFromStatus(status: PolicyBranchMegaStatusDto | null): PolicyBranchMegaCapabilitiesDto | null {
    if (!status) {
        return null
    }

    return {
        availableBuckets: status.availableBuckets,
        availableTotalBucketViews: status.availableTotalBucketViews,
        availableMetrics: status.availableMetrics,
        availableTpSlModes: status.availableTpSlModes,
        availableSlModes: status.availableSlModes,
        availableZonalModes: status.availableZonalModes
    }
}

function resolveEffectivePolicyBranchMegaQuery(
    requested: PolicyBranchMegaResolvedQueryDto,
    capabilities: PolicyBranchMegaCapabilitiesDto | null
): PolicyBranchMegaResolvedQueryDto {
    if (!capabilities) {
        return {
            ...requested,
            bucketView:
                requested.bucket === 'total' ? requested.bucketView : DEFAULT_REPORT_TOTAL_BUCKET_VIEW
        }
    }

    const bucket = pickSupportedValue(
        requested.bucket,
        capabilities.availableBuckets,
        DEFAULT_REPORT_BUCKET_MODE
    )

    return {
        bucket,
        bucketView:
            bucket === 'total' ? requested.bucketView : DEFAULT_REPORT_TOTAL_BUCKET_VIEW,
        metric: pickSupportedValue(
            requested.metric,
            capabilities.availableMetrics,
            DEFAULT_REPORT_METRIC_MODE
        ),
        tpSlMode: pickSupportedValue(
            requested.tpSlMode,
            capabilities.availableTpSlModes,
            DEFAULT_REPORT_TP_SL_MODE
        ),
        slMode: pickSupportedSlMode(requested.slMode, capabilities.availableSlModes),
        zonalMode: pickSupportedValue(
            requested.zonalMode,
            capabilities.availableZonalModes,
            DEFAULT_REPORT_ZONAL_MODE
        )
    }
}

function toReportQueryArgs(query: PolicyBranchMegaResolvedQueryDto): PolicyBranchMegaReportQueryArgs {
    return {
        bucket: query.bucket,
        bucketView: query.bucket === 'total' ? query.bucketView : null,
        metric: query.metric,
        tpSlMode: query.tpSlMode,
        slMode: query.slMode,
        zonalMode: query.zonalMode
    }
}

function mapPolicyBranchMegaStatus(raw: unknown): PolicyBranchMegaStatusDto {
    const payload = toObjectOrThrow(raw)
    const state = toStateOrThrow(payload.state)
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
        availableBuckets: toAllowedValueArrayOrThrow(
            payload.availableBuckets,
            'availableBuckets',
            POLICY_BRANCH_MEGA_AVAILABLE_BUCKETS
        ),
        availableTotalBucketViews: toAllowedValueArrayOrThrow(
            payload.availableTotalBucketViews,
            'availableTotalBucketViews',
            POLICY_BRANCH_MEGA_AVAILABLE_TOTAL_BUCKET_VIEWS
        ),
        availableMetrics: toAllowedValueArrayOrThrow(
            payload.availableMetrics,
            'availableMetrics',
            POLICY_BRANCH_MEGA_AVAILABLE_METRICS
        ),
        availableTpSlModes: toAllowedValueArrayOrThrow(
            payload.availableTpSlModes,
            'availableTpSlModes',
            POLICY_BRANCH_MEGA_AVAILABLE_TP_SL
        ),
        availableSlModes: toAllowedValueArrayOrThrow(
            payload.availableSlModes,
            'availableSlModes',
            POLICY_BRANCH_MEGA_AVAILABLE_SL
        ),
        availableZonalModes: toAllowedValueArrayOrThrow(
            payload.availableZonalModes,
            'availableZonalModes',
            POLICY_BRANCH_MEGA_AVAILABLE_ZONAL
        )
    }
}

function toFreshnessInfo(status: PolicyBranchMegaStatusDto | null): PolicyBranchMegaFreshnessInfoDto {
    const sourceEndpoint = resolveReportSourceEndpointOrThrow()

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
    const resp = await fetch(`${API_BASE_URL}${statusPath}`, { cache: 'no-store' })
    if (!resp.ok) {
        return null
    }

    const raw = await resp.json()
    return mapPolicyBranchMegaStatus(raw)
}

async function fetchPolicyBranchMegaReport(args?: PolicyBranchMegaReportQueryArgs): Promise<ReportDocumentDto> {
    const reportPath = buildPolicyBranchMegaPath(args)
    const resp = await fetch(`${API_BASE_URL}${reportPath}`, { cache: 'no-store' })

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Failed to load policy branch mega report: ${resp.status} ${text}`)
    }

    const raw = await resp.json()
    return mapReportResponseWithOptions(raw, { policyBranchMegaMetadataMode: 'strict' })
}

async function fetchPolicyBranchMegaReportWithFreshness(
    args?: PolicyBranchMegaReportQueryArgs
): Promise<PolicyBranchMegaReportWithFreshnessDto> {
    let status: PolicyBranchMegaStatusDto | null = null

    try {
        status = await fetchPolicyBranchMegaStatusOrNull()
    } catch {
        status = null
    }

    if (status?.state === 'missing') {
        throw new Error(
            '[policy-branch-mega] Latest policy_branch_mega report is missing. Regenerate backtest reports first.'
        )
    }

    if (status?.state === 'stale') {
        const lagHint =
            typeof status.lagSeconds === 'number' && status.lagSeconds > 0 ?
                ` Lag: ${Math.round(status.lagSeconds / 60)} min.`
            :   ''
        throw new Error(
            `[policy-branch-mega] policy_branch_mega is stale relative to backtest_diagnostics.${lagHint} Regenerate Policy Branch Mega.`
        )
    }

    const capabilities = resolveCapabilitiesFromStatus(status)
    const resolvedQuery = resolveEffectivePolicyBranchMegaQuery(
        buildRequestedPolicyBranchMegaQuery(args),
        capabilities
    )
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
    args?: PolicyBranchMegaReportQueryArgs
): Promise<PolicyBranchMegaReportWithFreshnessDto> {
    const payload = await fetchPolicyBranchMegaReportWithFreshness(args)
    const resolvedArgs = toReportQueryArgs(payload.resolvedQuery)
    queryClient.setQueryData(buildPolicyBranchMegaQueryKey(args), payload.report)
    queryClient.setQueryData(buildPolicyBranchMegaQueryKey(resolvedArgs), payload.report)
    queryClient.setQueryData(buildPolicyBranchMegaWithFreshnessQueryKey(resolvedArgs), payload)
    return payload
}

export function usePolicyBranchMegaReportWithFreshnessQuery(
    args?: PolicyBranchMegaReportQueryArgs,
    options?: UsePolicyBranchMegaWithFreshnessOptions
): UseQueryResult<
    PolicyBranchMegaReportWithFreshnessDto,
    Error
> {
    const queryClient = useQueryClient()
    const withFreshnessKey = buildPolicyBranchMegaWithFreshnessQueryKey(args)

    return useQuery({
        queryKey: withFreshnessKey,
        queryFn: () => loadPolicyBranchMegaReportWithFreshnessAndCache(queryClient, args),
        enabled: options?.enabled ?? true,
        retry: false,
        staleTime: POLICY_BRANCH_MEGA_STALE_TIME_MS,
        gcTime: POLICY_BRANCH_MEGA_GC_TIME_MS,
        refetchOnWindowFocus: false
    })
}

export async function prefetchPolicyBranchMegaReportWithFreshness(
    queryClient: QueryClient,
    args?: PolicyBranchMegaReportQueryArgs
): Promise<void> {
    const withFreshnessKey = buildPolicyBranchMegaWithFreshnessQueryKey(args)

    await queryClient.prefetchQuery({
        queryKey: withFreshnessKey,
        queryFn: () => loadPolicyBranchMegaReportWithFreshnessAndCache(queryClient, args),
        staleTime: POLICY_BRANCH_MEGA_STALE_TIME_MS,
        gcTime: POLICY_BRANCH_MEGA_GC_TIME_MS
    })
}

export function usePolicyBranchMegaReportNavQuery(
    options: UsePolicyBranchMegaNavOptions,
    args?: PolicyBranchMegaReportQueryArgs
): UseQueryResult<ReportDocumentDto, Error> {
    const queryClient = useQueryClient()
    const reportKey = buildPolicyBranchMegaQueryKey(args)
    const withFreshnessKey = buildPolicyBranchMegaWithFreshnessQueryKey(args)

    return useQuery({
        queryKey: reportKey,
        queryFn: async () => {
            const cachedPayload = queryClient.getQueryData<PolicyBranchMegaReportWithFreshnessDto>(
                withFreshnessKey
            )
            if (cachedPayload?.report) {
                return cachedPayload.report
            }

            return fetchPolicyBranchMegaReport(args)
        },
        initialData: () => {
            const cachedPayload = queryClient.getQueryData<PolicyBranchMegaReportWithFreshnessDto>(
                withFreshnessKey
            )
            return cachedPayload?.report
        },
        enabled: options.enabled,
        retry: false,
        staleTime: POLICY_BRANCH_MEGA_STALE_TIME_MS,
        gcTime: POLICY_BRANCH_MEGA_GC_TIME_MS,
        refetchOnWindowFocus: false
    })
}
