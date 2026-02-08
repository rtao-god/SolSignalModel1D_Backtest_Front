import type { ReportDocumentDto } from '@/shared/types/report.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { API_ROUTES } from '../routes'
import { createSuspenseReportHook } from './utils/createSuspenseReportHook'

/*
    backtestConfidenceRisk — TanStack Query hooks.

    Зачем:
        - Даёт доступ к отчёту backtest_confidence_risk (bucket-статистика уверенности).
*/

const BACKTEST_CONFIDENCE_RISK_QUERY_KEY = ['backtest', 'confidence-risk'] as const
const { path } = API_ROUTES.backtest.confidenceRiskGet

/*
    Suspense-хук для отчёта backtest_confidence_risk.
*/
export const useBacktestConfidenceRiskReportQuery = createSuspenseReportHook<ReportDocumentDto>({
    queryKey: BACKTEST_CONFIDENCE_RISK_QUERY_KEY,
    path,
    mapResponse: mapReportResponse
})
