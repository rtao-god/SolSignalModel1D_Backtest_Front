import type { ReportDocumentDto } from '@/shared/types/report.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { API_ROUTES } from '../routes'
import { createSuspenseReportHook } from './utils/createSuspenseReportHook'

const BACKTEST_CONFIDENCE_RISK_QUERY_KEY = ['backtest', 'confidence-risk'] as const
const { path } = API_ROUTES.backtest.confidenceRiskGet

export const useBacktestConfidenceRiskReportQuery = createSuspenseReportHook<ReportDocumentDto>({
    queryKey: BACKTEST_CONFIDENCE_RISK_QUERY_KEY,
    path,
    mapResponse: mapReportResponse
})
