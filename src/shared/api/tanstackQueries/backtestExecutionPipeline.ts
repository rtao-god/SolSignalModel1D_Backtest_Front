import type { ReportDocumentDto } from '@/shared/types/report.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { API_ROUTES } from '../routes'
import { createSuspenseReportHook } from './utils/createSuspenseReportHook'

const BACKTEST_EXECUTION_PIPELINE_QUERY_KEY = ['backtest', 'execution-pipeline'] as const
const { path } = API_ROUTES.backtest.executionPipelineGet

export const useBacktestExecutionPipelineReportQuery = createSuspenseReportHook<ReportDocumentDto>({
    queryKey: BACKTEST_EXECUTION_PIPELINE_QUERY_KEY,
    path,
    mapResponse: mapReportResponse
})

