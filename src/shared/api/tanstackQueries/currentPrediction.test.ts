import { fetchCurrentPredictionHistoryPage, fetchCurrentPredictionLivePayload } from './currentPrediction'

function jsonResponse(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), {
        status,
        headers: {
            'Content-Type': 'application/json'
        }
    })
}

describe('currentPrediction published payload queries', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    test('loads live payload with embedded training scope stats in one request', async () => {
        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input)

            if (url.includes('/api/current-prediction/payload?scope=full')) {
                return jsonResponse({
                    report: {
                        schemaVersion: 1,
                        id: 'current-live',
                        kind: 'current_prediction',
                        title: 'Current prediction',
                        generatedAtUtc: '2026-03-23T09:00:00Z',
                        sections: []
                    },
                    publication: {
                        targetPredictionDateUtc: '2026-03-24',
                        publishedPredictionDateUtc: '2026-03-23',
                        isTargetPredictionDatePublished: false,
                        expectedPreview: true
                    },
                    trainingScopeStats: {
                        fullStartDateUtc: '2021-10-11',
                        fullEndDateUtc: '2026-03-21',
                        fullDays: 1112,
                        trainStartDateUtc: '2021-10-11',
                        trainEndDateUtc: '2025-11-20',
                        trainDays: 1031,
                        oosStartDateUtc: '2025-11-21',
                        oosEndDateUtc: '2026-03-21',
                        oosDays: 81,
                        recentStartDateUtc: '2025-11-21',
                        recentEndDateUtc: '2026-03-21',
                        recentDays: 81,
                        splitHoldoutCalendarDays: 120,
                        recentTailRowsLimit: 240,
                        recentMatchesOos: true,
                        totalDays: 1112,
                        trainShare: 0.927,
                        oosShare: 0.073,
                        lastTrainDateUtc: '2025-11-20',
                        firstOosDateUtc: '2025-11-21'
                    }
                })
            }

            throw new Error(`Unexpected url: ${url}`)
        })

        vi.stubGlobal('fetch', fetchMock)

        const payload = await fetchCurrentPredictionLivePayload('full')

        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(payload.report.id).toBe('current-live')
        expect(payload.publication?.publishedPredictionDateUtc).toBe('2026-03-23')
        expect(payload.publication?.isTargetPredictionDatePublished).toBe(false)
        expect(payload.trainingScopeStats?.recentTailRowsLimit).toBe(240)
        expect(payload.trainingScopeStats?.firstOosDateUtc).toBe('2025-11-21')
    })

    test('accepts live payload without publication metadata during rolling deploy', async () => {
        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input)

            if (url.includes('/api/current-prediction/payload?scope=full')) {
                return jsonResponse({
                    report: {
                        schemaVersion: 1,
                        id: 'current-live-legacy',
                        kind: 'current_prediction',
                        title: 'Current prediction legacy payload',
                        generatedAtUtc: '2026-03-23T09:00:00Z',
                        sections: []
                    }
                })
            }

            throw new Error(`Unexpected url: ${url}`)
        })

        vi.stubGlobal('fetch', fetchMock)

        const payload = await fetchCurrentPredictionLivePayload('full')

        expect(payload.report.id).toBe('current-live-legacy')
        expect(payload.publication).toBeNull()
    })

    test('loads history page from one page endpoint without catalog and item subrequests', async () => {
        const fetchMock = vi.fn(async (input: RequestInfo | URL) => {
            const url = String(input)

            if (url.includes('/api/current-prediction/history/catalog')) {
                throw new Error('history catalog endpoint must not be used in history page flow')
            }

            if (url.includes('/api/current-prediction/history/items')) {
                throw new Error('history items endpoint must not be used in history page flow')
            }

            if (
                url.includes('/api/current-prediction/history/page?') &&
                url.includes('set=backfilled') &&
                url.includes('scope=full') &&
                url.includes('page=2') &&
                url.includes('pageSize=10') &&
                url.includes('days=365')
            ) {
                return jsonResponse({
                    page: 2,
                    pageSize: 10,
                    totalPages: 8,
                    totalBuiltReports: 73,
                    filteredReports: 73,
                    hasPrevPage: true,
                    hasNextPage: true,
                    earliestBuiltPredictionDateUtc: '2025-01-01',
                    latestBuiltPredictionDateUtc: '2026-03-21',
                    missingBuiltWeekdays: 0,
                    expectedBuiltWeekdays: 73,
                    missingBuiltFromDateUtc: '2025-01-01',
                    missingBuiltToDateUtc: '2026-03-21',
                    items: [
                        {
                            id: 'history-2026-03-20',
                            predictionDateUtc: '2026-03-20',
                            report: {
                                schemaVersion: 1,
                                id: 'history-2026-03-20',
                                kind: 'current_prediction',
                                title: 'History report',
                                generatedAtUtc: '2026-03-20T21:00:00Z',
                                sections: []
                            }
                        }
                    ],
                    trainingScopeStats: {
                        fullStartDateUtc: '2021-10-11',
                        fullEndDateUtc: '2026-03-21',
                        fullDays: 1112,
                        trainStartDateUtc: '2021-10-11',
                        trainEndDateUtc: '2025-11-20',
                        trainDays: 1031,
                        oosStartDateUtc: '2025-11-21',
                        oosEndDateUtc: '2026-03-21',
                        oosDays: 81,
                        recentStartDateUtc: '2025-11-21',
                        recentEndDateUtc: '2026-03-21',
                        recentDays: 81,
                        splitHoldoutCalendarDays: 120,
                        recentTailRowsLimit: 240,
                        recentMatchesOos: true,
                        totalDays: 1112,
                        trainShare: 0.927,
                        oosShare: 0.073,
                        lastTrainDateUtc: '2025-11-20',
                        firstOosDateUtc: '2025-11-21'
                    }
                })
            }

            throw new Error(`Unexpected url: ${url}`)
        })

        vi.stubGlobal('fetch', fetchMock)

        const page = await fetchCurrentPredictionHistoryPage({
            set: 'backfilled',
            scope: 'full',
            page: 2,
            pageSize: 10,
            days: 365
        })

        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(page.page).toBe(2)
        expect(page.items).toHaveLength(1)
        expect(page.items[0]?.predictionDateUtc).toBe('2026-03-20')
        expect(page.trainingScopeStats?.lastTrainDateUtc).toBe('2025-11-20')
    })
})
