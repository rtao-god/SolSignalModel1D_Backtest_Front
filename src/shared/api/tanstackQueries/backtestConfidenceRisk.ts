import type { ReportDocumentDto } from '@/shared/types/report.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { API_ROUTES } from '../routes'
import type { QueryClient, UseQueryResult } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { API_BASE_URL } from '../../configs/config'

const BACKTEST_CONFIDENCE_RISK_QUERY_KEY = ['backtest', 'confidence-risk'] as const
const { path } = API_ROUTES.backtest.confidenceRiskGet

export interface BacktestConfidenceRiskQueryArgs {
    scope?: string | null
    confidenceBucket?: string | null
}

function buildBacktestConfidenceRiskPath(args?: BacktestConfidenceRiskQueryArgs): string {
    const params = new URLSearchParams()

    if (args?.scope) {
        params.set('scope', args.scope)
    }

    if (args?.confidenceBucket) {
        params.set('confBucket', args.confidenceBucket)
    }

    const query = params.toString()
    return query ? `${path}?${query}` : path
}

function buildBacktestConfidenceRiskQueryKey(args?: BacktestConfidenceRiskQueryArgs) {
    return [...BACKTEST_CONFIDENCE_RISK_QUERY_KEY, args?.scope ?? null, args?.confidenceBucket ?? null] as const
}

async function fetchBacktestConfidenceRiskReport(
    args?: BacktestConfidenceRiskQueryArgs
): Promise<ReportDocumentDto> {
    const reportPath = buildBacktestConfidenceRiskPath(args)
    const resp = await fetch(`${API_BASE_URL}${reportPath}`)

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Failed to load confidence-risk report: ${resp.status} ${text}`)
    }

    const raw = await resp.json()
    return mapReportResponse(raw)
}

export const useBacktestConfidenceRiskReportQuery = (
    args?: BacktestConfidenceRiskQueryArgs
): UseQueryResult<ReportDocumentDto, Error> =>
    useQuery({
        queryKey: buildBacktestConfidenceRiskQueryKey(args),
        queryFn: () => fetchBacktestConfidenceRiskReport(args),
        retry: false
    })

export async function prefetchBacktestConfidenceRiskReport(
    queryClient: QueryClient,
    args?: BacktestConfidenceRiskQueryArgs
): Promise<void> {
    await queryClient.prefetchQuery({
        queryKey: buildBacktestConfidenceRiskQueryKey(args),
        queryFn: () => fetchBacktestConfidenceRiskReport(args)
    })
}
