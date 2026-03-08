import type { ReportDocumentDto } from '@/shared/types/report.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { API_ROUTES } from '../routes'
import type { QueryClient } from '@tanstack/react-query'
import {
    createSuspenseReportHook,
    prefetchSuspenseReport,
    type SuspenseReportQueryConfig
} from './utils/createSuspenseReportHook'

const BACKTEST_EXECUTION_PIPELINE_QUERY_KEY = ['backtest', 'execution-pipeline'] as const
const { path } = API_ROUTES.backtest.executionPipelineGet

const BACKTEST_EXECUTION_PIPELINE_REPORT_CONFIG: SuspenseReportQueryConfig<ReportDocumentDto> = {
    queryKey: BACKTEST_EXECUTION_PIPELINE_QUERY_KEY,
    path,
    mapResponse: mapReportResponse
}

export const useBacktestExecutionPipelineReportQuery = createSuspenseReportHook<ReportDocumentDto>(
    BACKTEST_EXECUTION_PIPELINE_REPORT_CONFIG
)

export async function prefetchBacktestExecutionPipelineReport(queryClient: QueryClient): Promise<void> {
    await prefetchSuspenseReport(queryClient, BACKTEST_EXECUTION_PIPELINE_REPORT_CONFIG)
}
