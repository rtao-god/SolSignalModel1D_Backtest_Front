import { warmupRouteNavigation } from './warmupRouteNavigation'
import { AppRoute } from '../types'

const prefetchRouteChunkMock = vi.fn()

vi.mock('../routeConfig', () => ({
    prefetchRouteChunk: (routeId: AppRoute) => prefetchRouteChunkMock(routeId)
}))

describe('warmupRouteNavigation', () => {
    afterEach(() => {
        prefetchRouteChunkMock.mockReset()
    })

    test('warms only the route chunk and does not touch data clients', () => {
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
    })
})
