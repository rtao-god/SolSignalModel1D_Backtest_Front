import type { ReportDocumentDto } from '@/shared/types/report.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { API_ROUTES } from '../routes'
import { createSuspenseReportHook } from './utils/createSuspenseReportHook'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { API_BASE_URL } from '../../configs/config'

/*
    backtestDiagnostics — TanStack Query hooks.

    Зачем:
        - Даёт доступ к отчёту backtest_diagnostics (ALL HISTORY, WITH SL).
*/

const BACKTEST_DIAGNOSTICS_QUERY_KEY = ['backtest', 'diagnostics'] as const
const { path } = API_ROUTES.backtest.diagnosticsGet

/*
    Suspense-хук для отчёта backtest_diagnostics.
*/
export const useBacktestDiagnosticsReportQuery = createSuspenseReportHook<ReportDocumentDto>({
    queryKey: BACKTEST_DIAGNOSTICS_QUERY_KEY,
    path,
    mapResponse: mapReportResponse
})

interface UseBacktestDiagnosticsNavOptions {
    enabled: boolean
}

async function fetchBacktestDiagnosticsReport(): Promise<ReportDocumentDto> {
    const resp = await fetch(`${API_BASE_URL}${path}`)

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(`Failed to load backtest diagnostics report: ${resp.status} ${text}`)
    }

    const raw = await resp.json()
    return mapReportResponse(raw)
}

/*
    Неспенсовый вариант для сайдбара.
*/
export function useBacktestDiagnosticsReportNavQuery(
    options: UseBacktestDiagnosticsNavOptions
): UseQueryResult<ReportDocumentDto, Error> {
    return useQuery({
        queryKey: BACKTEST_DIAGNOSTICS_QUERY_KEY,
        queryFn: fetchBacktestDiagnosticsReport,
        enabled: options.enabled
    })
}
