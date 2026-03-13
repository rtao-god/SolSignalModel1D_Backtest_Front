import type { ReportDocumentDto } from '@/shared/types/report.types'
import { mapReportResponseWithOptions } from '../utils/mapReportResponse'
import { API_ROUTES } from '../routes'
import { useQuery, type QueryClient, type UseQueryResult } from '@tanstack/react-query'
import { API_BASE_URL } from '../../configs/config'

const BACKTEST_DIAGNOSTICS_QUERY_KEY = ['backtest', 'diagnostics'] as const
const { path } = API_ROUTES.backtest.diagnosticsGet

export const BACKTEST_DIAGNOSTICS_QUERY_SCOPES = {
    backtestPage: 'diagnostics-page-backtest',
    guardrailPage: 'diagnostics-page-guardrail',
    decisionsPage: 'diagnostics-page-decisions',
    hotspotsPage: 'diagnostics-page-hotspots',
    otherPage: 'diagnostics-page-other',
    ratingsPage: 'diagnostics-page-ratings',
    dayStatsPage: 'diagnostics-page-day-stats',
    sidebarNav: 'diagnostics-sidebar-nav'
} as const

export type BacktestDiagnosticsQueryScope =
    (typeof BACKTEST_DIAGNOSTICS_QUERY_SCOPES)[keyof typeof BACKTEST_DIAGNOSTICS_QUERY_SCOPES]

interface UseBacktestDiagnosticsNavOptions {
    enabled: boolean
    scope?: BacktestDiagnosticsQueryScope
}

interface BacktestDiagnosticsQueryOptions {
    enabled?: boolean
    scope?: BacktestDiagnosticsQueryScope
}

export interface BacktestDiagnosticsReportQueryArgs {
    bucket?: string | null
    tpSlMode?: string | null
    slMode?: string | null
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

    if (args?.bucket) {
        params.set('bucket', args.bucket)
    }

    if (args?.tpSlMode) {
        params.set('tpsl', args.tpSlMode)
    }

    if (args?.slMode) {
        params.set('slmode', args.slMode)
    }

    if (args?.zonalMode) {
        params.set('zonal', args.zonalMode)
    }

    const query = params.toString()
    return query ? `${path}?${query}` : path
}

// Один backend endpoint питает несколько diagnostics-страниц и навигацию.
// Scope изолирует TanStack cache между владельцами UI, чтобы ошибка одной зоны не переезжала в другую.
export function buildBacktestDiagnosticsQueryKey(
    args?: BacktestDiagnosticsReportQueryArgs,
    scope?: BacktestDiagnosticsQueryScope
) {
    return [
        ...BACKTEST_DIAGNOSTICS_QUERY_KEY,
        scope ?? 'diagnostics-default',
        args?.bucket ?? null,
        args?.tpSlMode ?? null,
        args?.slMode ?? null,
        args?.zonalMode ?? null
    ] as const
}

async function fetchBacktestDiagnosticsReport(args?: BacktestDiagnosticsReportQueryArgs): Promise<ReportDocumentDto> {
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
    options?: BacktestDiagnosticsQueryOptions
): UseQueryResult<ReportDocumentDto, Error> {
    const queryOptions = buildBacktestDiagnosticsQueryOptions(args, options)

    return useQuery(queryOptions)
}

function buildBacktestDiagnosticsQueryOptions(
    args: BacktestDiagnosticsReportQueryArgs | undefined,
    options?: BacktestDiagnosticsQueryOptions
) {
    return {
        queryKey: buildBacktestDiagnosticsQueryKey(args, options?.scope),
        queryFn: () => fetchBacktestDiagnosticsReport(args),
        enabled: options?.enabled ?? true,
        retry: false
    }
}

export function useBacktestDiagnosticsReportQuery(
    args?: BacktestDiagnosticsReportQueryArgs,
    options?: BacktestDiagnosticsQueryOptions
): UseQueryResult<ReportDocumentDto, Error> {
    return useBacktestDiagnosticsQuery(args, options)
}

export function useBacktestDiagnosticsReportNavQuery(
    options: UseBacktestDiagnosticsNavOptions,
    args?: BacktestDiagnosticsReportQueryArgs
): UseQueryResult<ReportDocumentDto, Error> {
    return useBacktestDiagnosticsQuery(args, options)
}

export async function prefetchBacktestDiagnosticsReport(
    queryClient: QueryClient,
    args?: BacktestDiagnosticsReportQueryArgs,
    options?: BacktestDiagnosticsQueryOptions
): Promise<void> {
    const queryOptions = buildBacktestDiagnosticsQueryOptions(args, options)
    await queryClient.prefetchQuery({
        queryKey: queryOptions.queryKey,
        queryFn: queryOptions.queryFn,
        retry: queryOptions.retry
    })
}
