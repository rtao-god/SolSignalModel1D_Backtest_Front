import type { ReportDocumentDto } from '@/shared/types/report.types'
import { mapReportResponseWithOptions } from '../utils/mapReportResponse'
import { API_ROUTES } from '../routes'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { API_BASE_URL } from '../../configs/config'

const BACKTEST_DIAGNOSTICS_QUERY_KEY = ['backtest', 'diagnostics'] as const
const { path } = API_ROUTES.backtest.diagnosticsGet

interface UseBacktestDiagnosticsNavOptions {
    enabled: boolean
}

interface ApiErrorPayload {
    error?: string
    message?: string
    title?: string
    detail?: string
}

function formatBacktestDiagnosticsError(status: number, bodyText: string): string {
    if (!bodyText) {
        return `Failed to load backtest diagnostics report: ${status}`
    }

    try {
        const payload = JSON.parse(bodyText) as ApiErrorPayload
        const details = [payload.error, payload.message ?? payload.detail ?? payload.title]
            .filter((value): value is string => typeof value === 'string' && value.trim().length > 0)
            .join(' | ')

        if (details) {
            return `Failed to load backtest diagnostics report: ${status} ${details}`
        }
    } catch {
        // ignore invalid JSON payload and fall back to plain response text
    }

    return `Failed to load backtest diagnostics report: ${status} ${bodyText}`
}

async function fetchBacktestDiagnosticsReport(): Promise<ReportDocumentDto> {
    const resp = await fetch(`${API_BASE_URL}${path}`)

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(formatBacktestDiagnosticsError(resp.status, text))
    }

    const raw = await resp.json()
    return mapReportResponseWithOptions(raw, { policyBranchMegaMetadataMode: 'report-agnostic' })
}

function useBacktestDiagnosticsQuery(enabled: boolean): UseQueryResult<ReportDocumentDto, Error> {
    return useQuery({
        queryKey: BACKTEST_DIAGNOSTICS_QUERY_KEY,
        queryFn: fetchBacktestDiagnosticsReport,
        enabled,
        retry: false
    })
}

export function useBacktestDiagnosticsReportQuery(): UseQueryResult<ReportDocumentDto, Error> {
    return useBacktestDiagnosticsQuery(true)
}

export function useBacktestDiagnosticsReportNavQuery(
    options: UseBacktestDiagnosticsNavOptions
): UseQueryResult<ReportDocumentDto, Error> {
    return useBacktestDiagnosticsQuery(options.enabled)
}
