import type { ReportDocumentDto } from '@/shared/types/report.types'
import type { BacktestSummaryDto, BacktestBaselineSnapshotDto } from '@/shared/types/backtest.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { ApiEndpointBuilder } from '../types'
import { API_ROUTES } from '../routes'

/**
 * Элемент индекса по current_prediction-отчётам.
 * Используется для списка доступных дат на фронте.
 */
export interface CurrentPredictionIndexItemDto {
    id: string
    predictionDateUtc: string
}

/**
 * Эндпоинты, работающие с ReportDocument / лёгкими снапшотами бэктеста.
 * Сюда входят:
 * - текущий прогноз ML-модели;
 * - индекс и отчёт по конкретной дате;
 * - backtest_summary (ReportDocument);
 * - лёгкий baseline-снимок бэктеста.
 */
export const buildReportEndpoints = (builder: ApiEndpointBuilder) => {
    const { latestReport, datesIndex, byDateReport } = API_ROUTES.currentPrediction

    const { baselineSummaryGet, baselineSnapshotGet } = API_ROUTES.backtest

    return {
        // ==== текущий прогноз ML-модели (последний снапшот) ====
        getCurrentPrediction: builder.query<ReportDocumentDto, void>({
            query: () => ({
                url: latestReport.path,
                method: latestReport.method
            }),
            transformResponse: mapReportResponse
        }),

        // ==== индекс доступных дат по текущему прогнозу ====
        // GET /api/current-prediction/dates?days=60
        getCurrentPredictionIndex: builder.query<CurrentPredictionIndexItemDto[], { days?: number } | void>({
            query: args => {
                const params = args && args.days ? { days: args.days } : undefined

                return {
                    url: datesIndex.path,
                    method: datesIndex.method,
                    params
                }
            }
        }),

        // ==== отчёт по текущему прогнозу за конкретную дату ====
        // GET /api/current-prediction/by-date?dateUtc=YYYY-MM-DD
        getCurrentPredictionByDate: builder.query<ReportDocumentDto, { dateUtc: string }>({
            query: ({ dateUtc }) => ({
                url: byDateReport.path,
                method: byDateReport.method,
                params: { dateUtc }
            }),
            transformResponse: mapReportResponse
        }),

        // ==== сводка бэктеста (baseline BacktestSummaryReport как ReportDocument) ====
        getBacktestBaselineSummary: builder.query<BacktestSummaryDto, void>({
            query: () => ({
                url: baselineSummaryGet.path,
                method: baselineSummaryGet.method
            }),
            transformResponse: mapReportResponse
        }),

        // ==== лёгкий baseline-снимок бэктеста (DTO BacktestBaselineSnapshotDto) ====
        getBacktestBaselineSnapshot: builder.query<BacktestBaselineSnapshotDto, void>({
            query: () => ({
                url: baselineSnapshotGet.path,
                method: baselineSnapshotGet.method
            })
        })
    }
}
