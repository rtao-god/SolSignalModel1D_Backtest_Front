import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import type { ReportDocumentDto } from '@/shared/types/report.types'
import type {
    CurrentPredictionIndexItemDto,
    CurrentPredictionSet,
    CurrentPredictionTrainingScope
} from '../endpoints/reportEndpoints'
import { mapReportResponse } from '../utils/mapReportResponse'
import { API_BASE_URL } from '../../configs/config'
import { API_ROUTES } from '../routes'

const { latestReport, datesIndex } = API_ROUTES.currentPrediction
const CURRENT_PREDICTION_INDEX_CACHE_TTL_MS = 24 * 60 * 60 * 1000

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

    return (await resp.json()) as CurrentPredictionIndexItemDto[]
}
export function useCurrentPredictionReportQuery(
    set: CurrentPredictionSet = 'live',
    scope?: CurrentPredictionTrainingScope
): UseQueryResult<ReportDocumentDto, Error> {
    return useQuery({
        queryKey: ['current-prediction', 'latest', set, scope ?? 'default'],
        queryFn: () => fetchCurrentPrediction(set, scope),
        retry: false
    })
}

export function useCurrentPredictionIndexQuery(
    set: CurrentPredictionSet = 'backfilled',
    days?: number,
    scope?: CurrentPredictionTrainingScope
): UseQueryResult<CurrentPredictionIndexItemDto[], Error> {
    return useQuery({
        queryKey: ['current-prediction', 'dates', set, scope ?? 'train', days ?? 'all'],
        queryFn: () => fetchCurrentPredictionIndex(set, days, scope),
        retry: false,
        // Индекс истории по текущему прогнозу фактически статичен в рамках пользовательской сессии:
        // при переключении окна 365/730/all повторно используем ранее загруженные данные из кэша.
        staleTime: CURRENT_PREDICTION_INDEX_CACHE_TTL_MS,
        gcTime: CURRENT_PREDICTION_INDEX_CACHE_TTL_MS,
        refetchOnMount: false,
        refetchOnReconnect: false,
        refetchOnWindowFocus: false
    })
}

