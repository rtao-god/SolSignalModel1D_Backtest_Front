import type { ReportDocumentDto } from '@/shared/types/report.types'
import type { BacktestSummaryDto, BacktestBaselineSnapshotDto } from '@/shared/types/backtest.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { ApiEndpointBuilder } from '../types'

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
 * - backtest_summary (ReportDocument);
 * - лёгкий baseline-снимок бэктеста.
 */
export const buildReportEndpoints = (builder: ApiEndpointBuilder) => ({
    // ==== текущий прогноз ML-модели (последний снапшот) ====
    getCurrentPrediction: builder.query<ReportDocumentDto, void>({
        query: () => ({
            url: '/current-prediction',
            method: 'GET'
        }),
        transformResponse: mapReportResponse
    }),

    // ==== индекс доступных дат по текущему прогнозу ====
    // GET /api/current-prediction/dates?days=60
    getCurrentPredictionIndex: builder.query<CurrentPredictionIndexItemDto[], { days?: number } | void>({
        query: args => ({
            url: '/current-prediction/dates',
            method: 'GET',
            params: args && args.days ? { days: args.days } : undefined
        })
    }),

    // ==== отчёт по текущему прогнозу за конкретную дату ====
    // GET /api/current-prediction/by-date?dateUtc=YYYY-MM-DD
    getCurrentPredictionByDate: builder.query<ReportDocumentDto, { dateUtc: string }>({
        query: ({ dateUtc }) => ({
            url: '/current-prediction/by-date',
            method: 'GET',
            params: { dateUtc }
        }),
        transformResponse: mapReportResponse
    }),

    // ==== сводка бэктеста (baseline BacktestSummaryReport как ReportDocument) ====
    getBacktestBaselineSummary: builder.query<BacktestSummaryDto, void>({
        query: () => ({
            url: '/backtest/summary',
            method: 'GET'
        }),
        transformResponse: mapReportResponse
    }),

    // ==== лёгкий baseline-снимок бэктеста (DTO BacktestBaselineSnapshotDto) ====
    getBacktestBaselineSnapshot: builder.query<BacktestBaselineSnapshotDto, void>({
        query: () => ({
            url: '/backtest/baseline',
            method: 'GET'
        })
    })
})
