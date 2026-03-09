import { useQuery, type QueryClient, type UseQueryResult } from '@tanstack/react-query'
import type { ReportDocumentDto } from '@/shared/types/report.types'
import type {
    CurrentPredictionIndexItemDto,
    CurrentPredictionSet,
    CurrentPredictionTrainingScope
} from '../endpoints/reportEndpoints'
import { normalizeCurrentPredictionDateUtcOrThrow } from '@/shared/utils/currentPredictionDate'
import { mapReportResponse } from '../utils/mapReportResponse'
import { API_BASE_URL } from '../../configs/config'
import { API_ROUTES } from '../routes'

const { latestReport, datesIndex } = API_ROUTES.currentPrediction
const CURRENT_PREDICTION_INDEX_CACHE_TTL_MS = 24 * 60 * 60 * 1000
const DEFAULT_CURRENT_PREDICTION_SCOPE: CurrentPredictionTrainingScope = 'full'
const DEFAULT_CURRENT_PREDICTION_SET: CurrentPredictionSet = 'live'
const DEFAULT_HISTORY_PREDICTION_SET: CurrentPredictionSet = 'backfilled'

export interface CurrentPredictionBackfilledSplitStats {
    trainDays: number
    oosDays: number
    totalDays: number
    trainShare: number
    oosShare: number
    lastTrainDateUtc: string
    firstOosDateUtc: string
}

interface CurrentPredictionBackfilledSplitStatsState {
    data: CurrentPredictionBackfilledSplitStats | null
    isLoading: boolean
    error: Error | null
}

interface CurrentPredictionLatestResponse {
    live?: unknown
    backfilled?: unknown
}

async function fetchCurrentPrediction(
    set: CurrentPredictionSet,
    scope?: CurrentPredictionTrainingScope
): Promise<ReportDocumentDto> {
    const search = new URLSearchParams()
    if (set === 'live' && scope) {
        search.set('scope', scope)
    }

    const querySuffix = search.toString()
    const url = `${API_BASE_URL}${latestReport.path}${querySuffix ? `?${querySuffix}` : ''}`

    const resp = await fetch(url, { cache: 'no-store' })

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Failed to load current prediction report: ${resp.status} ${text}`)
    }

    const raw = (await resp.json()) as CurrentPredictionLatestResponse
    const report = set === 'live' ? raw.live : raw.backfilled

    if (!report) {
        const scopeLabel = scope ?? 'train'
        throw new Error(`Current prediction report "${set}" is missing in response (scope=${scopeLabel}).`)
    }

    return mapReportResponse(report)
}

async function fetchCurrentPredictionIndex(
    set: CurrentPredictionSet,
    days?: number,
    scope?: CurrentPredictionTrainingScope
): Promise<CurrentPredictionIndexItemDto[]> {
    const search = new URLSearchParams()

    search.set('set', set)

    if (typeof days === 'number' && Number.isFinite(days) && days > 0) {
        search.set('days', String(days))
    }
    if (scope) {
        search.set('scope', scope)
    }

    const querySuffix = search.toString()
    const url = `${API_BASE_URL}${datesIndex.path}${querySuffix ? `?${querySuffix}` : ''}`

    const resp = await fetch(url)

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Failed to load current prediction index: ${resp.status} ${text}`)
    }

    const payload = (await resp.json()) as Array<{ id?: unknown; predictionDateUtc?: unknown }>
    if (!Array.isArray(payload)) {
        throw new Error('[current-prediction] index payload must be an array.')
    }

    return payload.map((item, index) => {
        if (typeof item?.id !== 'string' || !item.id.trim()) {
            throw new Error(`[current-prediction] index item id is invalid at index=${index}.`)
        }
        if (typeof item?.predictionDateUtc !== 'string') {
            throw new Error(`[current-prediction] index item predictionDateUtc is invalid at index=${index}.`)
        }

        return {
            id: item.id,
            predictionDateUtc: normalizeCurrentPredictionDateUtcOrThrow(item.predictionDateUtc)
        }
    })
}

function collectUniquePredictionDates(index: CurrentPredictionIndexItemDto[] | undefined): string[] {
    if (!index || index.length === 0) {
        return []
    }

    return Array.from(new Set(index.map(item => item.predictionDateUtc))).sort((left, right) =>
        left < right ? -1
        : left > right ? 1
        : 0
    )
}

function buildBackfilledSplitStats(
    trainIndex: CurrentPredictionIndexItemDto[],
    oosIndex: CurrentPredictionIndexItemDto[]
): CurrentPredictionBackfilledSplitStats {
    const trainDates = collectUniquePredictionDates(trainIndex)
    const oosDates = collectUniquePredictionDates(oosIndex)

    if (trainDates.length === 0) {
        throw new Error('[current-prediction] backfilled train split index is empty.')
    }
    if (oosDates.length === 0) {
        throw new Error('[current-prediction] backfilled oos split index is empty.')
    }

    const overlap = trainDates.filter(date => oosDates.includes(date))
    if (overlap.length > 0) {
        throw new Error(
            `[current-prediction] backfilled train/oos split index overlaps by prediction date. overlap=${overlap.slice(0, 5).join(', ')}.`
        )
    }

    const lastTrainDateUtc = trainDates[trainDates.length - 1]
    const firstOosDateUtc = oosDates[0]

    if (lastTrainDateUtc >= firstOosDateUtc) {
        throw new Error(
            `[current-prediction] backfilled split boundary is invalid. lastTrainDateUtc=${lastTrainDateUtc}, firstOosDateUtc=${firstOosDateUtc}.`
        )
    }

    const trainDays = trainDates.length
    const oosDays = oosDates.length
    const totalDays = trainDays + oosDays

    return {
        trainDays,
        oosDays,
        totalDays,
        trainShare: trainDays / totalDays,
        oosShare: oosDays / totalDays,
        lastTrainDateUtc,
        firstOosDateUtc
    }
}
export function useCurrentPredictionReportQuery(
    set: CurrentPredictionSet = 'live',
    scope?: CurrentPredictionTrainingScope
): UseQueryResult<ReportDocumentDto, Error> {
    const queryOptions = buildCurrentPredictionReportQueryOptions(set, scope)
    return useQuery(queryOptions)
}

export function useCurrentPredictionIndexQuery(
    set: CurrentPredictionSet = 'backfilled',
    days?: number,
    scope?: CurrentPredictionTrainingScope
): UseQueryResult<CurrentPredictionIndexItemDto[], Error> {
    const queryOptions = buildCurrentPredictionIndexQueryOptions(set, days, scope)
    return useQuery(queryOptions)
}

export function useCurrentPredictionBackfilledSplitStats(): CurrentPredictionBackfilledSplitStatsState {
    const trainIndexQuery = useCurrentPredictionIndexQuery(DEFAULT_HISTORY_PREDICTION_SET, undefined, 'train')
    const oosIndexQuery = useCurrentPredictionIndexQuery(DEFAULT_HISTORY_PREDICTION_SET, undefined, 'oos')

    if (trainIndexQuery.error) {
        return {
            data: null,
            isLoading: false,
            error: trainIndexQuery.error
        }
    }

    if (oosIndexQuery.error) {
        return {
            data: null,
            isLoading: false,
            error: oosIndexQuery.error
        }
    }

    if (!trainIndexQuery.data || !oosIndexQuery.data) {
        return {
            data: null,
            isLoading: trainIndexQuery.isLoading || oosIndexQuery.isLoading,
            error: null
        }
    }

    try {
        return {
            data: buildBackfilledSplitStats(trainIndexQuery.data, oosIndexQuery.data),
            isLoading: false,
            error: null
        }
    } catch (error) {
        return {
            data: null,
            isLoading: false,
            error: error instanceof Error ? error : new Error(String(error))
        }
    }
}

function buildCurrentPredictionReportQueryOptions(
    set: CurrentPredictionSet,
    scope?: CurrentPredictionTrainingScope
) {
    return {
        queryKey: ['current-prediction', 'latest', set, scope ?? 'default'] as const,
        queryFn: () => fetchCurrentPrediction(set, scope),
        retry: false
    }
}

function buildCurrentPredictionIndexQueryOptions(
    set: CurrentPredictionSet,
    days?: number,
    scope?: CurrentPredictionTrainingScope
) {
    return {
        queryKey: ['current-prediction', 'dates', set, scope ?? 'train', days ?? 'all'] as const,
        queryFn: () => fetchCurrentPredictionIndex(set, days, scope),
        retry: false,
        // Индекс истории по текущему прогнозу фактически статичен в рамках пользовательской сессии:
        // при переключении окна 365/730/all повторно используем ранее загруженные данные из кэша.
        staleTime: CURRENT_PREDICTION_INDEX_CACHE_TTL_MS,
        gcTime: CURRENT_PREDICTION_INDEX_CACHE_TTL_MS,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false
    }
}

export async function prefetchCurrentPredictionLatestReport(queryClient: QueryClient): Promise<void> {
    const queryOptions = buildCurrentPredictionReportQueryOptions(
        DEFAULT_CURRENT_PREDICTION_SET,
        DEFAULT_CURRENT_PREDICTION_SCOPE
    )
    await queryClient.prefetchQuery(queryOptions)
}

export async function prefetchCurrentPredictionHistoryIndex(queryClient: QueryClient): Promise<void> {
    const queryOptions = buildCurrentPredictionIndexQueryOptions(
        DEFAULT_HISTORY_PREDICTION_SET,
        undefined,
        DEFAULT_CURRENT_PREDICTION_SCOPE
    )
    await queryClient.prefetchQuery(queryOptions)
}
