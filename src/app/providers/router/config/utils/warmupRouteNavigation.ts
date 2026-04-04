import type { QueryClient } from '@tanstack/react-query'
import type { AppDispatch } from '@/app/providers/StoreProvider/config/configureStore'
import {
    DEFAULT_POLICY_BRANCH_MEGA_REPORT_QUERY_ARGS,
    prefetchPolicyBranchMegaReportParts
} from '@/shared/api/tanstackQueries/policyBranchMega'
import { prefetchBacktestSharpMoveStatsReport } from '@/shared/api/tanstackQueries/backtestSharpMoveStats'
import { prefetchBacktestBoundedParameterStatsReport } from '@/shared/api/tanstackQueries/backtestBoundedParameterStats'
import { prefetchBacktestBtcWeaknessStatsReport } from '@/shared/api/tanstackQueries/backtestBtcWeaknessStats'
import { prefetchBacktestMicroOverlayStatsReport } from '@/shared/api/tanstackQueries/backtestMicroOverlayStats'
import { prefetchBacktestSlOverlayStatsReport } from '@/shared/api/tanstackQueries/backtestSlOverlayStats'
import { prefetchBacktestSlStrongDayStatsReport } from '@/shared/api/tanstackQueries/backtestSlStrongDayStats'
import { prefetchStatisticsBtcWeaknessLiveReport } from '@/shared/api/tanstackQueries/statisticsBtcWeaknessLive'
import { prefetchStatisticsMicroOverlayLiveReport } from '@/shared/api/tanstackQueries/statisticsMicroOverlayLive'
import { prefetchStatisticsSlOverlayLiveReport } from '@/shared/api/tanstackQueries/statisticsSlOverlayLive'
import { prefetchStatisticsSlStrongDayLiveReport } from '@/shared/api/tanstackQueries/statisticsSlStrongDayLive'
import { prefetchModelStatsReport } from '@/shared/api/tanstackQueries/modelStats'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'
import { logError } from '@/shared/lib/logging/logError'
import { prefetchRouteChunk } from '../routeConfig'
import { AppRoute } from '../types'

interface WarmupRouteNavigationOptions {
    diagnosticsArgs?: unknown
}

export function warmupRouteNavigation(
    routeId: AppRoute,
    queryClient: QueryClient,
    _dispatch?: AppDispatch,
    _options?: WarmupRouteNavigationOptions
): void {
    prefetchRouteChunk(routeId)

    if (routeId === AppRoute.PFI_PER_MODEL || routeId === AppRoute.PFI_SL_MODEL) {
        // Обе PFI-страницы открываются с published слоем качества моделей.
        // Диагностический PFI-документ остаётся lazy и не должен прогреваться до явного переключения режима.
        void prefetchModelStatsReport(queryClient).catch(error => {
            const normalizedError = normalizeErrorLike(error, 'Unknown model overview warmup error.', {
                source: routeId === AppRoute.PFI_PER_MODEL ? 'pfi-per-model-warmup' : 'pfi-sl-model-warmup',
                domain: 'route_runtime',
                owner: routeId === AppRoute.PFI_PER_MODEL ? 'route-warmup.pfi-per-model' : 'route-warmup.pfi-sl-model',
                expected:
                    routeId === AppRoute.PFI_PER_MODEL ?
                        'Route warmup should prefetch the default model-quality report for /features/pfi-per-model.'
                    :   'Route warmup should prefetch the default model-quality report for /features/pfi-sl.',
                requiredAction: 'Inspect the model-stats published endpoint and route warmup query contract.',
                extra: { routeId }
            })
            logError(normalizedError, undefined, {
                source: routeId === AppRoute.PFI_PER_MODEL ? 'pfi-per-model-warmup' : 'pfi-sl-model-warmup',
                domain: 'route_runtime',
                severity: 'warning',
                extra: { routeId }
            })
        })
        return
    }

    if (routeId === AppRoute.BACKTEST_SHARP_MOVE_STATS) {
        void prefetchBacktestSharpMoveStatsReport(queryClient).catch(error => {
            const normalizedError = normalizeErrorLike(error, 'Unknown sharp-move route warmup error.', {
                source: 'sharp-move-warmup',
                domain: 'route_runtime',
                owner: 'route-warmup.sharp-move',
                expected: 'Route warmup should prefetch the published sharp-move statistics payload.',
                requiredAction: 'Inspect the sharp-move published endpoint and its variant catalog.',
                extra: { routeId }
            })
            logError(normalizedError, undefined, {
                source: 'sharp-move-warmup',
                domain: 'route_runtime',
                severity: 'warning',
                extra: { routeId }
            })
        })
        return
    }

    if (routeId === AppRoute.BACKTEST_BOUNDED_PARAMETER_STATS) {
        void prefetchBacktestBoundedParameterStatsReport(queryClient).catch(error => {
            const normalizedError = normalizeErrorLike(error, 'Unknown bounded-parameter route warmup error.', {
                source: 'bounded-parameter-warmup',
                domain: 'route_runtime',
                owner: 'route-warmup.bounded-parameter',
                expected: 'Route warmup should prefetch the published bounded-parameter statistics payload.',
                requiredAction: 'Inspect the bounded-parameter published endpoint and its variant catalog.',
                extra: { routeId }
            })
            logError(normalizedError, undefined, {
                source: 'bounded-parameter-warmup',
                domain: 'route_runtime',
                severity: 'warning',
                extra: { routeId }
            })
        })
        return
    }

    if (routeId === AppRoute.BACKTEST_BTC_WEAKNESS_STATS) {
        // BTC-страница строится из двух owner-источников: published backtest report и live journal summary.
        // Прогрев нужен для обоих, иначе первый экран открывается с двумя независимыми loading-slot.
        void Promise.all([
            prefetchBacktestBtcWeaknessStatsReport(queryClient),
            prefetchStatisticsBtcWeaknessLiveReport(queryClient)
        ]).catch(error => {
            const normalizedError = normalizeErrorLike(error, 'Unknown BTC weakness route warmup error.', {
                source: 'btc-weakness-warmup',
                domain: 'route_runtime',
                owner: 'route-warmup.btc-weakness',
                expected: 'Route warmup should prefetch both the historical and live BTC weakness reports.',
                requiredAction: 'Inspect the BTC weakness endpoints and the route warmup query contract.',
                extra: { routeId }
            })
            logError(normalizedError, undefined, {
                source: 'btc-weakness-warmup',
                domain: 'route_runtime',
                severity: 'warning',
                extra: { routeId }
            })
        })
        return
    }

    if (routeId === AppRoute.BACKTEST_MICRO_OVERLAY_STATS) {
        void Promise.all([
            prefetchBacktestMicroOverlayStatsReport(queryClient),
            prefetchStatisticsMicroOverlayLiveReport(queryClient)
        ]).catch(error => {
            const normalizedError = normalizeErrorLike(error, 'Unknown micro-overlay route warmup error.', {
                source: 'micro-overlay-warmup',
                domain: 'route_runtime',
                owner: 'route-warmup.micro-overlay',
                expected: 'Route warmup should prefetch both the historical and live micro-overlay reports.',
                requiredAction: 'Inspect the micro-overlay endpoints and the route warmup query contract.',
                extra: { routeId }
            })
            logError(normalizedError, undefined, {
                source: 'micro-overlay-warmup',
                domain: 'route_runtime',
                severity: 'warning',
                extra: { routeId }
            })
        })
        return
    }

    if (routeId === AppRoute.BACKTEST_SL_OVERLAY_STATS) {
        void Promise.all([
            prefetchBacktestSlOverlayStatsReport(queryClient),
            prefetchStatisticsSlOverlayLiveReport(queryClient)
        ]).catch(error => {
            const normalizedError = normalizeErrorLike(error, 'Unknown SL-overlay route warmup error.', {
                source: 'sl-overlay-warmup',
                domain: 'route_runtime',
                owner: 'route-warmup.sl-overlay',
                expected: 'Route warmup should prefetch both the historical and live SL-overlay reports.',
                requiredAction: 'Inspect the SL-overlay endpoints and the route warmup query contract.',
                extra: { routeId }
            })
            logError(normalizedError, undefined, {
                source: 'sl-overlay-warmup',
                domain: 'route_runtime',
                severity: 'warning',
                extra: { routeId }
            })
        })
        return
    }

    if (routeId === AppRoute.BACKTEST_SL_STRONG_DAY_STATS) {
        void Promise.all([
            prefetchBacktestSlStrongDayStatsReport(queryClient),
            prefetchStatisticsSlStrongDayLiveReport(queryClient)
        ]).catch(error => {
            const normalizedError = normalizeErrorLike(error, 'Unknown SL strong-day route warmup error.', {
                source: 'sl-strong-day-warmup',
                domain: 'route_runtime',
                owner: 'route-warmup.sl-strong-day',
                expected: 'Route warmup should prefetch both the historical and live SL strong-day reports.',
                requiredAction: 'Inspect the SL strong-day endpoints and the route warmup query contract.',
                extra: { routeId }
            })
            logError(normalizedError, undefined, {
                source: 'sl-strong-day-warmup',
                domain: 'route_runtime',
                severity: 'warning',
                extra: { routeId }
            })
        })
        return
    }

    if (routeId !== AppRoute.BACKTEST_POLICY_BRANCH_MEGA) {
        return
    }

    // Mega-таблица читает опубликованную статику по частям.
    // Прогреваем все payload-срезы ещё на hover/focus, чтобы первый экран и scroll-переходы
    // открывались из тёплого кэша без промежуточных loading-slot.
    void prefetchPolicyBranchMegaReportParts(queryClient, DEFAULT_POLICY_BRANCH_MEGA_REPORT_QUERY_ARGS).catch(error => {
        const normalizedError = normalizeErrorLike(error, 'Unknown mega route warmup error.', {
            source: 'policy-branch-mega-warmup',
            domain: 'route_runtime',
            extra: { routeId }
        })
        logError(normalizedError, undefined, {
            source: 'policy-branch-mega-warmup',
            domain: 'route_runtime',
            severity: 'warning',
            extra: { routeId }
        })
    })
}
