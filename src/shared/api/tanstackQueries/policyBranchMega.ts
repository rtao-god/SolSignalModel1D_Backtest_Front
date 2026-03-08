import type { ReportDocumentDto } from '@/shared/types/report.types'
import { mapReportResponseWithOptions } from '../utils/mapReportResponse'
import { API_ROUTES } from '../routes'
import { useQuery, useQueryClient, type QueryClient, type UseQueryResult } from '@tanstack/react-query'
import { API_BASE_URL } from '../../configs/config'
import { resolveReportSourceEndpointOrThrow } from '@/shared/utils/reportSourceEndpoint'

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
    metric?: string | null
    tpSlMode?: string | null
    slMode?: string | null
    zonalMode?: string | null
}

const POLICY_BRANCH_MEGA_STALE_TIME_MS = 2 * 60 * 1000
const POLICY_BRANCH_MEGA_GC_TIME_MS = 15 * 60 * 1000

function buildPolicyBranchMegaPath(args?: PolicyBranchMegaReportQueryArgs): string {
    const params = new URLSearchParams()

    if (args?.bucket) {
        params.set('bucket', args.bucket)
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

export interface PolicyBranchMegaReportWithFreshnessDto {
    report: ReportDocumentDto
    freshness: PolicyBranchMegaFreshnessInfoDto
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
        diagnosticsGeneratedAtUtc: toOptionalString(payload.diagnosticsGeneratedAtUtc)
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

    const report = await fetchPolicyBranchMegaReport(args)
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

    return { report, freshness }
}

async function loadPolicyBranchMegaReportWithFreshnessAndCache(
    queryClient: QueryClient,
    args?: PolicyBranchMegaReportQueryArgs
): Promise<PolicyBranchMegaReportWithFreshnessDto> {
    const payload = await fetchPolicyBranchMegaReportWithFreshness(args)
    queryClient.setQueryData(buildPolicyBranchMegaQueryKey(args), payload.report)
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
