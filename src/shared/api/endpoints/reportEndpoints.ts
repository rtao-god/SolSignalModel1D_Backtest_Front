import type { ReportDocumentDto } from '@/shared/types/report.types'
import type { BacktestSummaryDto, BacktestBaselineSnapshotDto } from '@/shared/types/backtest.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { ApiEndpointBuilder } from '../types'

/**
 * Эндпоинты, работающие с ReportDocument / лёгкими снапшотами бэктеста.
 * Сюда входят:
 * - текущий прогноз ML-модели;
 * - backtest_summary (ReportDocument);
 * - лёгкий baseline-снимок бэктеста.
 */
export const buildReportEndpoints = (builder: ApiEndpointBuilder) => ({
    // ==== текущий прогноз ML-модели ====
    getCurrentPrediction: builder.query<ReportDocumentDto, void>({
        query: () => ({
            url: '/current-prediction',
            method: 'GET'
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
