import type { ReportDocumentDto } from '@/shared/types/report.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { API_ROUTES } from '../routes'
import type { QueryClient, UseQueryResult } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'
import { API_BASE_URL } from '../../configs/config'
import type { CurrentPredictionTrainingScope } from '../endpoints/reportEndpoints'

const BACKTEST_CONFIDENCE_RISK_QUERY_KEY = ['backtest', 'confidence-risk'] as const
const { path } = API_ROUTES.backtest.confidenceRiskGet
const DEFAULT_BACKTEST_CONFIDENCE_RISK_SCOPE: CurrentPredictionTrainingScope = 'full'

const BACKTEST_CONFIDENCE_RISK_SCOPE_TO_API_VALUE: Record<CurrentPredictionTrainingScope, string> = {
    full: 'full',
    train: 'train',
    oos: 'oos',
    recent: 'recent'
}

export interface BacktestConfidenceRiskQueryArgs {
    scope?: string | null
    confidenceBucket?: string | null
}

interface BacktestConfidenceRiskQueryOptions {
    enabled?: boolean
}

export function resolveBacktestConfidenceRiskScope(raw: string | null | undefined): CurrentPredictionTrainingScope {
    if (!raw) {
        return DEFAULT_BACKTEST_CONFIDENCE_RISK_SCOPE
    }

    const normalized = raw.trim().toLowerCase()

    if (
        normalized === 'full' ||
        normalized === 'full history' ||
        normalized === 'full-history' ||
        normalized === 'full_history'
    ) {
        return 'full'
    }
    if (normalized === 'train' || normalized === 'train only' || normalized === 'train-only') return 'train'
    if (
        normalized === 'oos' ||
        normalized === 'out-of-sample' ||
        normalized === 'out of sample' ||
        normalized === 'out_of_sample' ||
        normalized === 'oos only' ||
        normalized === 'oos-only' ||
        normalized === 'oos_only'
    ) {
        return 'oos'
    }
    if (
        normalized === 'recent' ||
        normalized === 'recent tail' ||
        normalized === 'recent-tail' ||
        normalized === 'recent_tail'
    ) {
        return 'recent'
    }

    throw new Error(`[confidence-risk] invalid scope query value: ${raw}.`)
}

function resolveBacktestConfidenceRiskApiScope(raw: string | null | undefined): string {
    return BACKTEST_CONFIDENCE_RISK_SCOPE_TO_API_VALUE[resolveBacktestConfidenceRiskScope(raw)]
}

function buildBacktestConfidenceRiskPath(args?: BacktestConfidenceRiskQueryArgs): string {
    const params = new URLSearchParams()

    if (args?.scope) {
        params.set('scope', resolveBacktestConfidenceRiskApiScope(args.scope))
    }

    if (args?.confidenceBucket) {
        params.set('confBucket', args.confidenceBucket)
    }

    const query = params.toString()
    return query ? `${path}?${query}` : path
}

function buildBacktestConfidenceRiskQueryKey(args?: BacktestConfidenceRiskQueryArgs) {
    return [
        ...BACKTEST_CONFIDENCE_RISK_QUERY_KEY,
        args?.scope ? resolveBacktestConfidenceRiskScope(args.scope) : null,
        args?.confidenceBucket ?? null
    ] as const
}

async function fetchBacktestConfidenceRiskReport(args?: BacktestConfidenceRiskQueryArgs): Promise<ReportDocumentDto> {
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
    args?: BacktestConfidenceRiskQueryArgs,
    options?: BacktestConfidenceRiskQueryOptions
): UseQueryResult<ReportDocumentDto, Error> =>
    useQuery({
        queryKey: buildBacktestConfidenceRiskQueryKey(args),
        queryFn: () => fetchBacktestConfidenceRiskReport(args),
        enabled: options?.enabled ?? true,
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
