import type { ReportDocumentDto } from '@/shared/types/report.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { API_ROUTES } from '../routes'
import { createSuspenseReportHook } from './utils/createSuspenseReportHook'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { API_BASE_URL } from '../../configs/config'

const POLICY_BRANCH_MEGA_QUERY_KEY = ['backtest', 'policy-branch-mega'] as const
const POLICY_BRANCH_MEGA_WITH_FRESHNESS_QUERY_KEY = ['backtest', 'policy-branch-mega', 'with-freshness'] as const
const { path } = API_ROUTES.backtest.policyBranchMegaGet
const { path: statusPath } = API_ROUTES.backtest.policyBranchMegaStatusGet

export type PolicyBranchMegaFreshnessState = 'fresh' | 'stale' | 'missing' | 'unknown'
export type PolicyBranchMegaSourceMode = 'actual' | 'debug'

interface UsePolicyBranchMegaNavOptions {
    enabled: boolean
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
        typeof payload.message === 'string' && payload.message.trim().length > 0
            ? payload.message.trim()
            : `policy_branch_mega status: ${state}`

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
    if (!status) {
        return {
            sourceMode: 'debug',
            state: 'unknown',
            message: 'Не удалось проверить актуальность отчёта (status endpoint недоступен).',
            lagSeconds: null,
            policyBranchMegaId: null,
            policyBranchMegaGeneratedAtUtc: null,
            diagnosticsId: null,
            diagnosticsGeneratedAtUtc: null
        }
    }

    return {
        sourceMode: status.state === 'fresh' ? 'actual' : 'debug',
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

async function fetchPolicyBranchMegaReport(): Promise<ReportDocumentDto> {
    const resp = await fetch(`${API_BASE_URL}${path}`, { cache: 'no-store' })

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Failed to load policy branch mega report: ${resp.status} ${text}`)
    }

    const raw = await resp.json()
    return mapReportResponse(raw)
}

async function fetchPolicyBranchMegaReportWithFreshness(): Promise<PolicyBranchMegaReportWithFreshnessDto> {
    let status: PolicyBranchMegaStatusDto | null = null

    try {
        status = await fetchPolicyBranchMegaStatusOrNull()
    } catch {
        status = null
    }

    if (status?.state === 'missing') {
        throw new Error(
            '[policy-branch-mega] Актуальный отчёт policy_branch_mega отсутствует. Сначала перегенерируй отчёты бэктеста.'
        )
    }

    if (status?.state === 'stale') {
        const lagHint =
            typeof status.lagSeconds === 'number' && status.lagSeconds > 0
                ? ` Отставание: ${Math.round(status.lagSeconds / 60)} мин.`
                : ''
        throw new Error(
            `[policy-branch-mega] Отчёт policy_branch_mega устарел относительно backtest_diagnostics.${lagHint} Перегенерируй Policy Branch Mega.`
        )
    }

    const report = await fetchPolicyBranchMegaReport()
    const freshness = toFreshnessInfo(status)

    return { report, freshness }
}

export const usePolicyBranchMegaReportQuery = createSuspenseReportHook<ReportDocumentDto>({
    queryKey: POLICY_BRANCH_MEGA_QUERY_KEY,
    path,
    mapResponse: mapReportResponse
})

export function usePolicyBranchMegaReportWithFreshnessQuery(): UseQueryResult<PolicyBranchMegaReportWithFreshnessDto, Error> {
    return useQuery({
        queryKey: POLICY_BRANCH_MEGA_WITH_FRESHNESS_QUERY_KEY,
        queryFn: fetchPolicyBranchMegaReportWithFreshness,
        retry: false,
        refetchOnWindowFocus: true
    })
}

export function usePolicyBranchMegaReportNavQuery(
    options: UsePolicyBranchMegaNavOptions
): UseQueryResult<ReportDocumentDto, Error> {
    return useQuery({
        queryKey: POLICY_BRANCH_MEGA_QUERY_KEY,
        queryFn: fetchPolicyBranchMegaReport,
        enabled: options.enabled,
        retry: false
    })
}
