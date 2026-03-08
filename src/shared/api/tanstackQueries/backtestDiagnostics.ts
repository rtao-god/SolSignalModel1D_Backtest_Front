import type { ReportDocumentDto } from '@/shared/types/report.types'
import { mapReportResponseWithOptions } from '../utils/mapReportResponse'
import { API_ROUTES } from '../routes'
import { useQuery, type QueryClient, type UseQueryResult } from '@tanstack/react-query'
import { API_BASE_URL } from '../../configs/config'

const BACKTEST_DIAGNOSTICS_QUERY_KEY = ['backtest', 'diagnostics'] as const
const { path } = API_ROUTES.backtest.diagnosticsGet

interface UseBacktestDiagnosticsNavOptions {
    enabled: boolean
}

export interface BacktestDiagnosticsReportQueryArgs {
    tpSlMode?: string | null
    zonalMode?: string | null
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

function buildBacktestDiagnosticsPath(args?: BacktestDiagnosticsReportQueryArgs): string {
    const params = new URLSearchParams()

    if (args?.tpSlMode) {
        params.set('tpsl', args.tpSlMode)
    }

    if (args?.zonalMode) {
        params.set('zonal', args.zonalMode)
    }

    const query = params.toString()
    return query ? `${path}?${query}` : path
}

function buildBacktestDiagnosticsQueryKey(args?: BacktestDiagnosticsReportQueryArgs) {
    return [
        ...BACKTEST_DIAGNOSTICS_QUERY_KEY,
        args?.tpSlMode ?? null,
        args?.zonalMode ?? null
    ] as const
}

async function fetchBacktestDiagnosticsReport(
    args?: BacktestDiagnosticsReportQueryArgs
): Promise<ReportDocumentDto> {
    const reportPath = buildBacktestDiagnosticsPath(args)
    const resp = await fetch(`${API_BASE_URL}${reportPath}`)

    if (!resp.ok) {
        const text = await resp.text().catch(() => '')
        throw new Error(formatBacktestDiagnosticsError(resp.status, text))
    }

    const raw = await resp.json()
    return mapReportResponseWithOptions(raw, { policyBranchMegaMetadataMode: 'report-agnostic' })
}

function useBacktestDiagnosticsQuery(
    args: BacktestDiagnosticsReportQueryArgs | undefined,
    enabled: boolean
): UseQueryResult<ReportDocumentDto, Error> {
    const queryOptions = buildBacktestDiagnosticsQueryOptions(args, enabled)

    return useQuery(queryOptions)
}

function buildBacktestDiagnosticsQueryOptions(
    args: BacktestDiagnosticsReportQueryArgs | undefined,
    enabled: boolean
) {
    return {
        queryKey: buildBacktestDiagnosticsQueryKey(args),
        queryFn: () => fetchBacktestDiagnosticsReport(args),
        enabled,
        retry: false
    }
}

export function useBacktestDiagnosticsReportQuery(
    args?: BacktestDiagnosticsReportQueryArgs
): UseQueryResult<ReportDocumentDto, Error> {
    return useBacktestDiagnosticsQuery(args, true)
}

export function useBacktestDiagnosticsReportNavQuery(
    options: UseBacktestDiagnosticsNavOptions,
    args?: BacktestDiagnosticsReportQueryArgs
): UseQueryResult<ReportDocumentDto, Error> {
    return useBacktestDiagnosticsQuery(args, options.enabled)
}

export async function prefetchBacktestDiagnosticsReport(
    queryClient: QueryClient,
    args?: BacktestDiagnosticsReportQueryArgs
): Promise<void> {
    const queryOptions = buildBacktestDiagnosticsQueryOptions(args, true)
    await queryClient.prefetchQuery({
        queryKey: queryOptions.queryKey,
        queryFn: queryOptions.queryFn,
        retry: queryOptions.retry
    })
}
