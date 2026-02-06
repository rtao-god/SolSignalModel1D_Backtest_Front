import type { ReportDocumentDto } from '@/shared/types/report.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { API_ROUTES } from '../routes'
import { createSuspenseReportHook } from './utils/createSuspenseReportHook'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { API_BASE_URL } from '../../configs/config'

/*
    policyBranchMega — TanStack Query hooks.

    Зачем:
        - Даёт доступ к отчёту policy_branch_mega (Policy Branch Mega, all history, with SL).
*/

const POLICY_BRANCH_MEGA_QUERY_KEY = ['backtest', 'policy-branch-mega'] as const
const { path } = API_ROUTES.backtest.policyBranchMegaGet

/*
    Suspense-хук для отчёта policy_branch_mega.
*/
export const usePolicyBranchMegaReportQuery = createSuspenseReportHook<ReportDocumentDto>({
    queryKey: POLICY_BRANCH_MEGA_QUERY_KEY,
    path,
    mapResponse: mapReportResponse
})

interface UsePolicyBranchMegaNavOptions {
    enabled: boolean
}

// Низкоуровневый fetch для не-suspense вариантов (Main/Sidebar).
async function fetchPolicyBranchMegaReport(): Promise<ReportDocumentDto> {
    const resp = await fetch(`${API_BASE_URL}${path}`)

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Failed to load policy branch mega report: ${resp.status} ${text}`)
    }

    const raw = await resp.json()
    return mapReportResponse(raw)
}

/*
    Неспенсовый вариант для сайдбара и Main.
*/
export function usePolicyBranchMegaReportNavQuery(
    options: UsePolicyBranchMegaNavOptions
): UseQueryResult<ReportDocumentDto, Error> {
    return useQuery({
        queryKey: POLICY_BRANCH_MEGA_QUERY_KEY,
        queryFn: fetchPolicyBranchMegaReport,
        enabled: options.enabled
    })
}
