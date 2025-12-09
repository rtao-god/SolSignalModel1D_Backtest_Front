import { useSuspenseQuery, type UseSuspenseQueryResult } from '@tanstack/react-query'
import type { ReportDocumentDto } from '@/shared/types/report.types'
import type { CurrentPredictionIndexItemDto } from '../endpoints/reportEndpoints'
import { mapReportResponse } from '../utils/mapReportResponse'
import { API_BASE_URL } from '../../configs/config'
import { API_ROUTES } from '../routes'

const { latestReport, datesIndex } = API_ROUTES.currentPrediction

async function fetchCurrentPrediction(): Promise<ReportDocumentDto> {
    const resp = await fetch(`${API_BASE_URL}${latestReport.path}`)

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Failed to load current prediction report: ${resp.status} ${text}`)
    }

    const raw = await resp.json()
    return mapReportResponse(raw)
}

async function fetchCurrentPredictionIndex(days: number): Promise<CurrentPredictionIndexItemDto[]> {
    const search = new URLSearchParams()

    if (Number.isFinite(days) && days > 0) {
        search.set('days', String(days))
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

/**
 * Suspense-версия отчёта по текущему прогнозу.
 */
export function useCurrentPredictionReportQuery(): UseSuspenseQueryResult<ReportDocumentDto, Error> {
    return useSuspenseQuery({
        queryKey: ['current-prediction', 'latest'],
        queryFn: fetchCurrentPrediction
    })
}

/**
 * Suspense-версия индекса доступных дат по current_prediction.
 * По умолчанию используется 365 дней.
 */
export function useCurrentPredictionIndexQuery(
    days: number = 365
): UseSuspenseQueryResult<CurrentPredictionIndexItemDto[], Error> {
    return useSuspenseQuery({
        queryKey: ['current-prediction', 'dates', days],
        queryFn: () => fetchCurrentPredictionIndex(days)
    })
}
