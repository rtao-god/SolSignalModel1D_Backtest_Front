import { useSuspenseQuery, type UseSuspenseQueryResult } from '@tanstack/react-query'
import type { ReportDocumentDto } from '@/shared/types/report.types'
import type {
    CurrentPredictionIndexItemDto,
    CurrentPredictionSet,
    CurrentPredictionTrainingScope
} from '../endpoints/reportEndpoints'
import { mapReportResponse } from '../utils/mapReportResponse'
import { API_BASE_URL } from '../../configs/config'
import { API_ROUTES } from '../routes'

/*
	currentPrediction — TanStack Query hooks.

	Зачем:
		- Даёт запросы для report-эндпоинтов и suspense-режима.
*/

const { latestReport, datesIndex } = API_ROUTES.currentPrediction

// Ответ /api/current-prediction с двумя версиями текущего отчёта.
interface CurrentPredictionLatestResponse {
    live?: unknown
    backfilled?: unknown
}

async function fetchCurrentPrediction(
    set: CurrentPredictionSet,
    scope?: CurrentPredictionTrainingScope
): Promise<ReportDocumentDto> {
    // Scope применяется только к live-отчётам.
    const search = new URLSearchParams()
    if (set === 'live' && scope) {
        search.set('scope', scope)
    }

    const querySuffix = search.toString()
    const url = `${API_BASE_URL}${latestReport.path}${querySuffix ? `?${querySuffix}` : ''}`

    const resp = await fetch(url)

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Failed to load current prediction report: ${resp.status} ${text}`)
    }

    const raw = (await resp.json()) as CurrentPredictionLatestResponse
    const report = set === 'live' ? raw.live : raw.backfilled

    if (!report) {
        throw new Error(`Current prediction report "${set}" is missing in response`)
    }

    return mapReportResponse(report)
}

async function fetchCurrentPredictionIndex(
    set: CurrentPredictionSet,
    days: number
): Promise<CurrentPredictionIndexItemDto[]> {
    const search = new URLSearchParams()

    search.set('set', set)

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

// Suspense-версия отчёта по текущему прогнозу.
export function useCurrentPredictionReportQuery(
    set: CurrentPredictionSet = 'live',
    scope?: CurrentPredictionTrainingScope
): UseSuspenseQueryResult<ReportDocumentDto, Error> {
    return useSuspenseQuery({
        queryKey: ['current-prediction', 'latest', set, scope ?? 'default'],
        queryFn: () => fetchCurrentPrediction(set, scope)
    })
}

/*
	Suspense-версия индекса доступных дат по current_prediction.

	- По умолчанию используется 365 дней.
*/
export function useCurrentPredictionIndexQuery(
    set: CurrentPredictionSet = 'backfilled',
    days: number = 365
): UseSuspenseQueryResult<CurrentPredictionIndexItemDto[], Error> {
    return useSuspenseQuery({
        queryKey: ['current-prediction', 'dates', set, days],
        queryFn: () => fetchCurrentPredictionIndex(set, days)
    })
}

