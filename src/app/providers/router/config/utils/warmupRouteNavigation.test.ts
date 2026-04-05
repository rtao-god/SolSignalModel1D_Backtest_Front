import { warmupRouteNavigation } from './warmupRouteNavigation'
import { AppRoute } from '../types'

const {
    prefetchRouteChunkMock,
    prefetchPolicyBranchMegaReportPartsMock,
    prefetchModelStatsReportMock,
    prefetchBacktestSharpMoveStatsReportMock,
    prefetchBacktestBoundedParameterStatsReportMock,
    prefetchBacktestBtcWeaknessStatsReportMock,
    prefetchStatisticsBtcWeaknessLiveReportMock,
    prefetchBacktestMicroOverlayStatsReportMock,
    prefetchStatisticsMicroOverlayLiveReportMock,
    prefetchBacktestSlOverlayStatsReportMock,
    prefetchStatisticsSlOverlayLiveReportMock,
    prefetchBacktestSlStrongDayStatsReportMock,
    prefetchStatisticsSlStrongDayLiveReportMock,
    defaultMegaArgs
} = vi.hoisted(() => ({
    prefetchRouteChunkMock: vi.fn(),
    prefetchPolicyBranchMegaReportPartsMock: vi.fn(() => Promise.resolve()),
    prefetchModelStatsReportMock: vi.fn(() => Promise.resolve()),
    prefetchBacktestSharpMoveStatsReportMock: vi.fn(() => Promise.resolve()),
    prefetchBacktestBoundedParameterStatsReportMock: vi.fn(() => Promise.resolve()),
    prefetchBacktestBtcWeaknessStatsReportMock: vi.fn(() => Promise.resolve()),
    prefetchStatisticsBtcWeaknessLiveReportMock: vi.fn(() => Promise.resolve()),
    prefetchBacktestMicroOverlayStatsReportMock: vi.fn(() => Promise.resolve()),
    prefetchStatisticsMicroOverlayLiveReportMock: vi.fn(() => Promise.resolve()),
    prefetchBacktestSlOverlayStatsReportMock: vi.fn(() => Promise.resolve()),
    prefetchStatisticsSlOverlayLiveReportMock: vi.fn(() => Promise.resolve()),
    prefetchBacktestSlStrongDayStatsReportMock: vi.fn(() => Promise.resolve()),
    prefetchStatisticsSlStrongDayLiveReportMock: vi.fn(() => Promise.resolve()),
    defaultMegaArgs: {
        history: null,
        bucket: null,
        bucketView: null,
        metric: null,
        tpSlMode: null,
        slMode: null,
        zonalMode: null
    }
}))

vi.mock('../routeConfig', () => ({
    prefetchRouteChunk: (routeId: AppRoute) => prefetchRouteChunkMock(routeId)
}))

vi.mock('@/shared/api/tanstackQueries/policyBranchMega', () => ({
    DEFAULT_POLICY_BRANCH_MEGA_REPORT_QUERY_ARGS: defaultMegaArgs,
    prefetchPolicyBranchMegaReportParts: (...args: unknown[]) => prefetchPolicyBranchMegaReportPartsMock(...args)
}))

vi.mock('@/shared/api/tanstackQueries/modelStats', () => ({
    prefetchModelStatsReport: (...args: unknown[]) => prefetchModelStatsReportMock(...args)
}))

vi.mock('@/shared/api/tanstackQueries/backtestSharpMoveStats', () => ({
    prefetchBacktestSharpMoveStatsReport: (...args: unknown[]) => prefetchBacktestSharpMoveStatsReportMock(...args)
}))

vi.mock('@/shared/api/tanstackQueries/backtestBoundedParameterStats', () => ({
    prefetchBacktestBoundedParameterStatsReport: (...args: unknown[]) =>
        prefetchBacktestBoundedParameterStatsReportMock(...args)
}))

vi.mock('@/shared/api/tanstackQueries/backtestBtcWeaknessStats', () => ({
    prefetchBacktestBtcWeaknessStatsReport: (...args: unknown[]) => prefetchBacktestBtcWeaknessStatsReportMock(...args)
}))

vi.mock('@/shared/api/tanstackQueries/statisticsBtcWeaknessLive', () => ({
    prefetchStatisticsBtcWeaknessLiveReport: (...args: unknown[]) =>
        prefetchStatisticsBtcWeaknessLiveReportMock(...args)
}))

vi.mock('@/shared/api/tanstackQueries/backtestMicroOverlayStats', () => ({
    prefetchBacktestMicroOverlayStatsReport: (...args: unknown[]) =>
        prefetchBacktestMicroOverlayStatsReportMock(...args)
}))

vi.mock('@/shared/api/tanstackQueries/statisticsMicroOverlayLive', () => ({
    prefetchStatisticsMicroOverlayLiveReport: (...args: unknown[]) =>
        prefetchStatisticsMicroOverlayLiveReportMock(...args)
}))

vi.mock('@/shared/api/tanstackQueries/backtestSlOverlayStats', () => ({
    prefetchBacktestSlOverlayStatsReport: (...args: unknown[]) => prefetchBacktestSlOverlayStatsReportMock(...args)
}))

vi.mock('@/shared/api/tanstackQueries/statisticsSlOverlayLive', () => ({
    prefetchStatisticsSlOverlayLiveReport: (...args: unknown[]) => prefetchStatisticsSlOverlayLiveReportMock(...args)
}))

vi.mock('@/shared/api/tanstackQueries/backtestSlStrongDayStats', () => ({
    prefetchBacktestSlStrongDayStatsReport: (...args: unknown[]) => prefetchBacktestSlStrongDayStatsReportMock(...args)
}))

vi.mock('@/shared/api/tanstackQueries/statisticsSlStrongDayLive', () => ({
    prefetchStatisticsSlStrongDayLiveReport: (...args: unknown[]) =>
        prefetchStatisticsSlStrongDayLiveReportMock(...args)
}))

describe('warmupRouteNavigation', () => {
    afterEach(() => {
        prefetchRouteChunkMock.mockClear()
        prefetchPolicyBranchMegaReportPartsMock.mockClear()
        prefetchModelStatsReportMock.mockClear()
        prefetchBacktestSharpMoveStatsReportMock.mockClear()
        prefetchBacktestBoundedParameterStatsReportMock.mockClear()
        prefetchBacktestBtcWeaknessStatsReportMock.mockClear()
        prefetchStatisticsBtcWeaknessLiveReportMock.mockClear()
        prefetchBacktestMicroOverlayStatsReportMock.mockClear()
        prefetchStatisticsMicroOverlayLiveReportMock.mockClear()
        prefetchBacktestSlOverlayStatsReportMock.mockClear()
        prefetchStatisticsSlOverlayLiveReportMock.mockClear()
        prefetchBacktestSlStrongDayStatsReportMock.mockClear()
        prefetchStatisticsSlStrongDayLiveReportMock.mockClear()
    })

    test('warms only the route chunk for non-mega routes', () => {
        const prefetchQueryMock = vi.fn()
        const fetchQueryMock = vi.fn()
        const ensureQueryDataMock = vi.fn()
        const queryClient = {
            prefetchQuery: prefetchQueryMock,
            fetchQuery: fetchQueryMock,
            ensureQueryData: ensureQueryDataMock
        } as unknown as Parameters<typeof warmupRouteNavigation>[1]
        const dispatch = vi.fn()

        warmupRouteNavigation(AppRoute.CURRENT_PREDICTION_HISTORY, queryClient, dispatch)

        expect(prefetchRouteChunkMock).toHaveBeenCalledTimes(1)
        expect(prefetchRouteChunkMock).toHaveBeenCalledWith(AppRoute.CURRENT_PREDICTION_HISTORY)
        expect(prefetchQueryMock).not.toHaveBeenCalled()
        expect(fetchQueryMock).not.toHaveBeenCalled()
        expect(ensureQueryDataMock).not.toHaveBeenCalled()
        expect(dispatch).not.toHaveBeenCalled()
        expect(prefetchPolicyBranchMegaReportPartsMock).not.toHaveBeenCalled()
        expect(prefetchModelStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestSharpMoveStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestBoundedParameterStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestBtcWeaknessStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchStatisticsBtcWeaknessLiveReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestMicroOverlayStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchStatisticsMicroOverlayLiveReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestSlOverlayStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchStatisticsSlOverlayLiveReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestSlStrongDayStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchStatisticsSlStrongDayLiveReportMock).not.toHaveBeenCalled()
    })

    test('warms pfi-per-model chunk together with the default model-quality report only', () => {
        const queryClient = {
            prefetchQuery: vi.fn(),
            fetchQuery: vi.fn(),
            ensureQueryData: vi.fn()
        } as unknown as Parameters<typeof warmupRouteNavigation>[1]

        warmupRouteNavigation(AppRoute.PFI_PER_MODEL, queryClient)

        expect(prefetchRouteChunkMock).toHaveBeenCalledTimes(1)
        expect(prefetchRouteChunkMock).toHaveBeenCalledWith(AppRoute.PFI_PER_MODEL)
        expect(prefetchModelStatsReportMock).toHaveBeenCalledTimes(1)
        expect(prefetchModelStatsReportMock).toHaveBeenCalledWith(queryClient)
        expect(prefetchPolicyBranchMegaReportPartsMock).not.toHaveBeenCalled()
        expect(prefetchBacktestSharpMoveStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestBoundedParameterStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestBtcWeaknessStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchStatisticsBtcWeaknessLiveReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestMicroOverlayStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchStatisticsMicroOverlayLiveReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestSlOverlayStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchStatisticsSlOverlayLiveReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestSlStrongDayStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchStatisticsSlStrongDayLiveReportMock).not.toHaveBeenCalled()
    })

    test('warms pfi-sl chunk together with the default model-quality report only', () => {
        const queryClient = {
            prefetchQuery: vi.fn(),
            fetchQuery: vi.fn(),
            ensureQueryData: vi.fn()
        } as unknown as Parameters<typeof warmupRouteNavigation>[1]

        warmupRouteNavigation(AppRoute.PFI_SL_MODEL, queryClient)

        expect(prefetchRouteChunkMock).toHaveBeenCalledTimes(1)
        expect(prefetchRouteChunkMock).toHaveBeenCalledWith(AppRoute.PFI_SL_MODEL)
        expect(prefetchModelStatsReportMock).toHaveBeenCalledTimes(1)
        expect(prefetchModelStatsReportMock).toHaveBeenCalledWith(queryClient)
        expect(prefetchPolicyBranchMegaReportPartsMock).not.toHaveBeenCalled()
        expect(prefetchBacktestSharpMoveStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestBoundedParameterStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestBtcWeaknessStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchStatisticsBtcWeaknessLiveReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestMicroOverlayStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchStatisticsMicroOverlayLiveReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestSlOverlayStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchStatisticsSlOverlayLiveReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestSlStrongDayStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchStatisticsSlStrongDayLiveReportMock).not.toHaveBeenCalled()
    })

    test.each([
        {
            routeId: AppRoute.BACKTEST_SHARP_MOVE_STATS,
            reportPrefetchMockName: 'sharp'
        },
        {
            routeId: AppRoute.BACKTEST_BOUNDED_PARAMETER_STATS,
            reportPrefetchMockName: 'bounded'
        }
    ])('warms statistics route chunk and published payload for $routeId', ({ routeId, reportPrefetchMockName }) => {
        const queryClient = {
            prefetchQuery: vi.fn(),
            fetchQuery: vi.fn(),
            ensureQueryData: vi.fn()
        } as unknown as Parameters<typeof warmupRouteNavigation>[1]

        warmupRouteNavigation(routeId, queryClient)

        expect(prefetchRouteChunkMock).toHaveBeenCalledTimes(1)
        expect(prefetchRouteChunkMock).toHaveBeenCalledWith(routeId)

        if (reportPrefetchMockName === 'sharp') {
            expect(prefetchBacktestSharpMoveStatsReportMock).toHaveBeenCalledTimes(1)
            expect(prefetchBacktestSharpMoveStatsReportMock).toHaveBeenCalledWith(queryClient)
            expect(prefetchBacktestBoundedParameterStatsReportMock).not.toHaveBeenCalled()
        } else {
            expect(prefetchBacktestBoundedParameterStatsReportMock).toHaveBeenCalledTimes(1)
            expect(prefetchBacktestBoundedParameterStatsReportMock).toHaveBeenCalledWith(queryClient)
            expect(prefetchBacktestSharpMoveStatsReportMock).not.toHaveBeenCalled()
        }

        expect(prefetchBacktestBtcWeaknessStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchStatisticsBtcWeaknessLiveReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestMicroOverlayStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchStatisticsMicroOverlayLiveReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestSlOverlayStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchStatisticsSlOverlayLiveReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestSlStrongDayStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchStatisticsSlStrongDayLiveReportMock).not.toHaveBeenCalled()
        expect(prefetchPolicyBranchMegaReportPartsMock).not.toHaveBeenCalled()
        expect(prefetchModelStatsReportMock).not.toHaveBeenCalled()
    })

    test('warms BTC weakness route chunk together with historical and live payloads', () => {
        const queryClient = {
            prefetchQuery: vi.fn(),
            fetchQuery: vi.fn(),
            ensureQueryData: vi.fn()
        } as unknown as Parameters<typeof warmupRouteNavigation>[1]

        warmupRouteNavigation(AppRoute.BACKTEST_BTC_WEAKNESS_STATS, queryClient)

        expect(prefetchRouteChunkMock).toHaveBeenCalledTimes(1)
        expect(prefetchRouteChunkMock).toHaveBeenCalledWith(AppRoute.BACKTEST_BTC_WEAKNESS_STATS)
        expect(prefetchBacktestBtcWeaknessStatsReportMock).toHaveBeenCalledTimes(1)
        expect(prefetchBacktestBtcWeaknessStatsReportMock).toHaveBeenCalledWith(queryClient)
        expect(prefetchStatisticsBtcWeaknessLiveReportMock).toHaveBeenCalledTimes(1)
        expect(prefetchStatisticsBtcWeaknessLiveReportMock).toHaveBeenCalledWith(queryClient)
        expect(prefetchBacktestSharpMoveStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestBoundedParameterStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchPolicyBranchMegaReportPartsMock).not.toHaveBeenCalled()
        expect(prefetchModelStatsReportMock).not.toHaveBeenCalled()
    })

    test('warms micro-overlay route chunk together with historical and live payloads', () => {
        const queryClient = {
            prefetchQuery: vi.fn(),
            fetchQuery: vi.fn(),
            ensureQueryData: vi.fn()
        } as unknown as Parameters<typeof warmupRouteNavigation>[1]

        warmupRouteNavigation(AppRoute.BACKTEST_MICRO_OVERLAY_STATS, queryClient)

        expect(prefetchRouteChunkMock).toHaveBeenCalledTimes(1)
        expect(prefetchRouteChunkMock).toHaveBeenCalledWith(AppRoute.BACKTEST_MICRO_OVERLAY_STATS)
        expect(prefetchBacktestMicroOverlayStatsReportMock).toHaveBeenCalledTimes(1)
        expect(prefetchBacktestMicroOverlayStatsReportMock).toHaveBeenCalledWith(queryClient)
        expect(prefetchStatisticsMicroOverlayLiveReportMock).toHaveBeenCalledTimes(1)
        expect(prefetchStatisticsMicroOverlayLiveReportMock).toHaveBeenCalledWith(queryClient)
        expect(prefetchBacktestSlOverlayStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchStatisticsSlOverlayLiveReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestSlStrongDayStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchStatisticsSlStrongDayLiveReportMock).not.toHaveBeenCalled()
    })

    test('warms trade-risk route chunk together with historical and live payloads', () => {
        const queryClient = {
            prefetchQuery: vi.fn(),
            fetchQuery: vi.fn(),
            ensureQueryData: vi.fn()
        } as unknown as Parameters<typeof warmupRouteNavigation>[1]

        warmupRouteNavigation(AppRoute.BACKTEST_SL_OVERLAY_STATS, queryClient)

        expect(prefetchRouteChunkMock).toHaveBeenCalledTimes(1)
        expect(prefetchRouteChunkMock).toHaveBeenCalledWith(AppRoute.BACKTEST_SL_OVERLAY_STATS)
        expect(prefetchBacktestSlOverlayStatsReportMock).toHaveBeenCalledTimes(1)
        expect(prefetchBacktestSlOverlayStatsReportMock).toHaveBeenCalledWith(queryClient)
        expect(prefetchStatisticsSlOverlayLiveReportMock).toHaveBeenCalledTimes(1)
        expect(prefetchStatisticsSlOverlayLiveReportMock).toHaveBeenCalledWith(queryClient)
        expect(prefetchBacktestMicroOverlayStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchStatisticsMicroOverlayLiveReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestSlStrongDayStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchStatisticsSlStrongDayLiveReportMock).not.toHaveBeenCalled()
    })

    test('warms strong-day route chunk together with historical and live payloads', () => {
        const queryClient = {
            prefetchQuery: vi.fn(),
            fetchQuery: vi.fn(),
            ensureQueryData: vi.fn()
        } as unknown as Parameters<typeof warmupRouteNavigation>[1]

        warmupRouteNavigation(AppRoute.BACKTEST_SL_STRONG_DAY_STATS, queryClient)

        expect(prefetchRouteChunkMock).toHaveBeenCalledTimes(1)
        expect(prefetchRouteChunkMock).toHaveBeenCalledWith(AppRoute.BACKTEST_SL_STRONG_DAY_STATS)
        expect(prefetchBacktestSlStrongDayStatsReportMock).toHaveBeenCalledTimes(1)
        expect(prefetchBacktestSlStrongDayStatsReportMock).toHaveBeenCalledWith(queryClient)
        expect(prefetchStatisticsSlStrongDayLiveReportMock).toHaveBeenCalledTimes(1)
        expect(prefetchStatisticsSlStrongDayLiveReportMock).toHaveBeenCalledWith(queryClient)
        expect(prefetchBacktestMicroOverlayStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchStatisticsMicroOverlayLiveReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestSlOverlayStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchStatisticsSlOverlayLiveReportMock).not.toHaveBeenCalled()
    })

    test('warms mega route chunk and published payload cache together', () => {
        const queryClient = {
            prefetchQuery: vi.fn(),
            fetchQuery: vi.fn(),
            ensureQueryData: vi.fn()
        } as unknown as Parameters<typeof warmupRouteNavigation>[1]

        warmupRouteNavigation(AppRoute.BACKTEST_POLICY_BRANCH_MEGA, queryClient)

        expect(prefetchRouteChunkMock).toHaveBeenCalledTimes(1)
        expect(prefetchRouteChunkMock).toHaveBeenCalledWith(AppRoute.BACKTEST_POLICY_BRANCH_MEGA)
        expect(prefetchPolicyBranchMegaReportPartsMock).toHaveBeenCalledTimes(1)
        expect(prefetchPolicyBranchMegaReportPartsMock).toHaveBeenCalledWith(queryClient, defaultMegaArgs)
        expect(prefetchModelStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestSharpMoveStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestBoundedParameterStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestBtcWeaknessStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchStatisticsBtcWeaknessLiveReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestMicroOverlayStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchStatisticsMicroOverlayLiveReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestSlOverlayStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchStatisticsSlOverlayLiveReportMock).not.toHaveBeenCalled()
        expect(prefetchBacktestSlStrongDayStatsReportMock).not.toHaveBeenCalled()
        expect(prefetchStatisticsSlStrongDayLiveReportMock).not.toHaveBeenCalled()
    })
})
