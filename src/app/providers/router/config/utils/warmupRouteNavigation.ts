import type { QueryClient } from '@tanstack/react-query'
import type { AppDispatch } from '@/app/providers/StoreProvider/config/configureStore'
import { api } from '@/shared/api'
import { prefetchAggregationStats } from '@/shared/api/tanstackQueries/aggregation'
import {
    prefetchBacktestBaselineSnapshot,
    prefetchBacktestBaselineSummaryReport
} from '@/shared/api/tanstackQueries/backtest'
import { prefetchBacktestConfidenceRiskReport } from '@/shared/api/tanstackQueries/backtestConfidenceRisk'
import {
    BACKTEST_DIAGNOSTICS_QUERY_SCOPES,
    prefetchBacktestDiagnosticsReport
} from '@/shared/api/tanstackQueries/backtestDiagnostics'
import { prefetchBacktestExecutionPipelineReport } from '@/shared/api/tanstackQueries/backtestExecutionPipeline'
import {
    DEFAULT_CURRENT_PREDICTION_HISTORY_PAGE,
    DEFAULT_CURRENT_PREDICTION_HISTORY_PAGE_SIZE,
    DEFAULT_BACKFILLED_HISTORY_SCOPE,
    prefetchCurrentPredictionHistoryPage,
    prefetchCurrentPredictionLatestReport
} from '@/shared/api/tanstackQueries/currentPrediction'
import { prefetchRealForecastJournalDayList } from '@/shared/api/tanstackQueries/realForecastJournal'
import { prefetchModelStatsReport } from '@/shared/api/tanstackQueries/modelStats'
import { prefetchPfiPerModelReport } from '@/shared/api/tanstackQueries/pfi'
import { prefetchPolicyBranchMegaReportWithFreshness } from '@/shared/api/tanstackQueries/policyBranchMega'
import { DEFAULT_POLICY_BRANCH_MEGA_REPORT_QUERY_ARGS } from '@/shared/api/tanstackQueries/policyBranchMega'
import type { BacktestDiagnosticsReportQueryArgs } from '@/shared/api/tanstackQueries/backtestDiagnostics'
import type { PolicyBranchMegaReportQueryArgs } from '@/shared/api/tanstackQueries/policyBranchMega'
import { logError } from '@/shared/lib/logging/logError'
import { prefetchRouteChunk } from '../routeConfig'
import { AppRoute } from '../types'

interface RouteWarmupContext {
    queryClient: QueryClient
    dispatch?: AppDispatch
    diagnosticsArgs?: BacktestDiagnosticsReportQueryArgs
    policyBranchMegaArgs?: PolicyBranchMegaReportQueryArgs
}

type RouteDataPrefetcher = (context: RouteWarmupContext) => Promise<void>

const DIAGNOSTICS_REPORT_PREFETCH_ROUTES: AppRoute[] = [
    AppRoute.BACKTEST_DIAGNOSTICS,
    AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL,
    AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS,
    AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS,
    AppRoute.BACKTEST_DIAGNOSTICS_OTHER,
    AppRoute.BACKTEST_DIAGNOSTICS_RATINGS,
    AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS
]

function resolveDiagnosticsPrefetchScope(routeId: AppRoute) {
    switch (routeId) {
        case AppRoute.BACKTEST_DIAGNOSTICS:
            return BACKTEST_DIAGNOSTICS_QUERY_SCOPES.backtestPage
        case AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL:
            return BACKTEST_DIAGNOSTICS_QUERY_SCOPES.guardrailPage
        case AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS:
            return BACKTEST_DIAGNOSTICS_QUERY_SCOPES.decisionsPage
        case AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS:
            return BACKTEST_DIAGNOSTICS_QUERY_SCOPES.hotspotsPage
        case AppRoute.BACKTEST_DIAGNOSTICS_OTHER:
            return BACKTEST_DIAGNOSTICS_QUERY_SCOPES.otherPage
        case AppRoute.BACKTEST_DIAGNOSTICS_RATINGS:
            return BACKTEST_DIAGNOSTICS_QUERY_SCOPES.ratingsPage
        case AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS:
            return BACKTEST_DIAGNOSTICS_QUERY_SCOPES.dayStatsPage
        default:
            return undefined
    }
}

function dispatchWarmupThunk(dispatch: AppDispatch, thunk: unknown): void {
    // Dispatch в warmup получает RTK thunk actions от api.endpoints.*.initiate.
    // Явное приведение нужно из-за текущего типа AppDispatch в проекте.
    void (dispatch as unknown as (action: unknown) => unknown)(thunk)
}

const ROUTE_DATA_PREFETCHERS: Partial<Record<AppRoute, RouteDataPrefetcher>> = {
    [AppRoute.CURRENT_PREDICTION]: ({ queryClient }) => prefetchCurrentPredictionLatestReport(queryClient),
    [AppRoute.CURRENT_PREDICTION_HISTORY]: ({ queryClient }) =>
        prefetchCurrentPredictionHistoryPage(queryClient, {
            page: DEFAULT_CURRENT_PREDICTION_HISTORY_PAGE,
            pageSize: DEFAULT_CURRENT_PREDICTION_HISTORY_PAGE_SIZE,
            scope: DEFAULT_BACKFILLED_HISTORY_SCOPE
        }),
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
    [AppRoute.BACKTEST_POLICY_BRANCH_MEGA]: ({ queryClient, policyBranchMegaArgs }) =>
        prefetchPolicyBranchMegaReportWithFreshness(queryClient, {
            ...(policyBranchMegaArgs ?? DEFAULT_POLICY_BRANCH_MEGA_REPORT_QUERY_ARGS),
            part: 1
        }),
    [AppRoute.BACKTEST_CONFIDENCE_RISK]: ({ queryClient }) => prefetchBacktestConfidenceRiskReport(queryClient),
    [AppRoute.ANALYSIS_REAL_FORECAST_JOURNAL]: ({ queryClient }) => prefetchRealForecastJournalDayList(queryClient),
    [AppRoute.BACKTEST_EXECUTION_PIPELINE]: ({ queryClient, diagnosticsArgs }) =>
        prefetchBacktestExecutionPipelineReport(queryClient, diagnosticsArgs),
    [AppRoute.PFI_PER_MODEL]: ({ queryClient }) => prefetchPfiPerModelReport(queryClient),
    [AppRoute.EXPLAIN_FEATURES]: ({ queryClient }) => prefetchPfiPerModelReport(queryClient)
}

for (const routeId of DIAGNOSTICS_REPORT_PREFETCH_ROUTES) {
    ROUTE_DATA_PREFETCHERS[routeId] = ({ queryClient, diagnosticsArgs }) =>
        prefetchBacktestDiagnosticsReport(queryClient, diagnosticsArgs, {
            scope: resolveDiagnosticsPrefetchScope(routeId)
        })
}

interface WarmupRouteNavigationOptions {
    diagnosticsArgs?: BacktestDiagnosticsReportQueryArgs
    policyBranchMegaArgs?: PolicyBranchMegaReportQueryArgs
}

export function warmupRouteNavigation(
    routeId: AppRoute,
    queryClient: QueryClient,
    dispatch?: AppDispatch,
    options?: WarmupRouteNavigationOptions
): void {
    prefetchRouteChunk(routeId)

    const dataPrefetcher = ROUTE_DATA_PREFETCHERS[routeId]
    if (!dataPrefetcher) {
        return
    }

    // Prefetch в навигации является best-effort оптимизацией и не должен ломать переход.
    void dataPrefetcher({
        queryClient,
        dispatch,
        diagnosticsArgs: options?.diagnosticsArgs,
        policyBranchMegaArgs: options?.policyBranchMegaArgs
    }).catch(error => {
        const normalizedError =
            error instanceof Error ? error : new Error(String(error ?? 'Unknown route data prefetch error.'))
        logError(normalizedError, undefined, {
            source: 'route-data-prefetch',
            domain: 'api_transport',
            severity: 'warning',
            extra: { routeId }
        })
    })
}
