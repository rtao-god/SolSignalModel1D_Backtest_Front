import type { QueryClient } from '@tanstack/react-query'
import type { AppDispatch } from '@/app/providers/StoreProvider/config/configureStore'
import { api } from '@/shared/api'
import type { CurrentPredictionIndexItemDto } from '@/shared/api/endpoints/reportEndpoints'
import { prefetchAggregationStats } from '@/shared/api/tanstackQueries/aggregation'
import {
    prefetchBacktestBaselineSnapshot,
    prefetchBacktestBaselineSummaryReport
} from '@/shared/api/tanstackQueries/backtest'
import { prefetchBacktestConfidenceRiskReport } from '@/shared/api/tanstackQueries/backtestConfidenceRisk'
import { prefetchBacktestDiagnosticsReport } from '@/shared/api/tanstackQueries/backtestDiagnostics'
import { prefetchBacktestExecutionPipelineReport } from '@/shared/api/tanstackQueries/backtestExecutionPipeline'
import {
    prefetchCurrentPredictionHistoryIndex,
    prefetchCurrentPredictionLatestReport
} from '@/shared/api/tanstackQueries/currentPrediction'
import { prefetchModelStatsReport } from '@/shared/api/tanstackQueries/modelStats'
import { prefetchPfiPerModelReport } from '@/shared/api/tanstackQueries/pfi'
import { prefetchPolicyBranchMegaReportWithFreshness } from '@/shared/api/tanstackQueries/policyBranchMega'
import { prefetchRouteChunk } from '../routeConfig'
import { AppRoute } from '../types'

interface RouteWarmupContext {
    queryClient: QueryClient
    dispatch?: AppDispatch
}

type RouteDataPrefetcher = (context: RouteWarmupContext) => Promise<void>

const CURRENT_PREDICTION_HISTORY_FULL_INDEX_QUERY_KEY = [
    'current-prediction',
    'dates',
    'backfilled',
    'full',
    'all'
] as const

const DIAGNOSTICS_REPORT_PREFETCH_ROUTES: AppRoute[] = [
    AppRoute.BACKTEST_DIAGNOSTICS,
    AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL,
    AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS,
    AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS,
    AppRoute.BACKTEST_DIAGNOSTICS_OTHER,
    AppRoute.BACKTEST_DIAGNOSTICS_RATINGS,
    AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS
]

function dispatchWarmupThunk(dispatch: AppDispatch, thunk: unknown): void {
    // Dispatch в warmup получает RTK thunk actions от api.endpoints.*.initiate.
    // Явное приведение нужно из-за текущего типа AppDispatch в проекте.
    void (dispatch as unknown as (action: unknown) => unknown)(thunk)
}

const ROUTE_DATA_PREFETCHERS: Partial<Record<AppRoute, RouteDataPrefetcher>> = {
    [AppRoute.MAIN]: ({ queryClient }) => prefetchPolicyBranchMegaReportWithFreshness(queryClient),
    [AppRoute.CURRENT_PREDICTION]: ({ queryClient }) => prefetchCurrentPredictionLatestReport(queryClient),
    [AppRoute.CURRENT_PREDICTION_HISTORY]: async ({ queryClient, dispatch }) => {
        await prefetchCurrentPredictionHistoryIndex(queryClient)

        if (!dispatch) {
            return
        }

        const fullIndex = queryClient.getQueryData<CurrentPredictionIndexItemDto[]>(
            CURRENT_PREDICTION_HISTORY_FULL_INDEX_QUERY_KEY
        )
        const latestDateUtc = fullIndex?.[0]?.predictionDateUtc
        if (!latestDateUtc) {
            return
        }

        dispatchWarmupThunk(
            dispatch,
            api.endpoints.getCurrentPredictionByDate.initiate(
                {
                    set: 'backfilled',
                    scope: 'full',
                    dateUtc: `${latestDateUtc}T00:00:00Z`
                },
                { subscribe: false, forceRefetch: false }
            )
        )
    },
    [AppRoute.MODELS_STATS]: ({ queryClient }) => prefetchModelStatsReport(queryClient),
    [AppRoute.AGGREGATION_STATS]: ({ queryClient }) => prefetchAggregationStats(queryClient),
    [AppRoute.BACKTEST_BASELINE]: ({ queryClient }) => prefetchBacktestBaselineSnapshot(queryClient),
    [AppRoute.BACKTEST_SUMMARY]: ({ queryClient }) => prefetchBacktestBaselineSummaryReport(queryClient),
    [AppRoute.BACKTEST_FULL]: async ({ queryClient, dispatch }) => {
        await prefetchBacktestBaselineSummaryReport(queryClient)

        if (!dispatch) {
            return
        }

        dispatchWarmupThunk(
            dispatch,
            api.endpoints.getBacktestProfiles.initiate(undefined, {
                subscribe: false,
                forceRefetch: false
            })
        )
        dispatchWarmupThunk(
            dispatch,
            api.endpoints.getBacktestPolicyRatios.initiate('baseline', {
                subscribe: false,
                forceRefetch: false
            })
        )
    },
    [AppRoute.BACKTEST_POLICY_BRANCH_MEGA]: ({ queryClient }) => prefetchPolicyBranchMegaReportWithFreshness(queryClient),
    [AppRoute.BACKTEST_CONFIDENCE_RISK]: ({ queryClient }) => prefetchBacktestConfidenceRiskReport(queryClient),
    [AppRoute.BACKTEST_EXECUTION_PIPELINE]: ({ queryClient }) => prefetchBacktestExecutionPipelineReport(queryClient),
    [AppRoute.PFI_PER_MODEL]: ({ queryClient }) => prefetchPfiPerModelReport(queryClient),
    [AppRoute.EXPLAIN_FEATURES]: ({ queryClient }) => prefetchPfiPerModelReport(queryClient)
}

for (const routeId of DIAGNOSTICS_REPORT_PREFETCH_ROUTES) {
    ROUTE_DATA_PREFETCHERS[routeId] = ({ queryClient }) => prefetchBacktestDiagnosticsReport(queryClient)
}

export function warmupRouteNavigation(routeId: AppRoute, queryClient: QueryClient, dispatch?: AppDispatch): void {
    prefetchRouteChunk(routeId)

    const dataPrefetcher = ROUTE_DATA_PREFETCHERS[routeId]
    if (!dataPrefetcher) {
        return
    }

    // Prefetch в навигации является best-effort оптимизацией и не должен ломать переход.
    void dataPrefetcher({ queryClient, dispatch }).catch(() => {})
}
