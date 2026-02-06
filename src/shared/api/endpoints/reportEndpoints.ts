import type { ReportDocumentDto } from '@/shared/types/report.types'
import type { BacktestSummaryDto, BacktestBaselineSnapshotDto } from '@/shared/types/backtest.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { ApiEndpointBuilder } from '../types'
import { API_ROUTES } from '../routes'

/*
	reportEndpoints — endpoints API.

	Зачем:
		- Собирает RTK Query endpoints для домена.
*/

/*
	Элемент индекса по current_prediction-отчётам.

	- Используется для списка доступных дат на фронте.
*/
export interface CurrentPredictionIndexItemDto {
    id: string
    predictionDateUtc: string
}

// Набор текущего прогноза: live (as-of) или backfilled (строгий).
export type CurrentPredictionSet = 'live' | 'backfilled'

// Режим обучения моделей для live-прогноза.
export type CurrentPredictionTrainingScope = 'train' | 'full' | 'oos' | 'recent'

/*
	Ответ /api/current-prediction.

	- Бэкенд возвращает оба отчёта (live/backfilled).
	- Поля могут быть null, если отчёты не сохранены.
*/
export interface CurrentPredictionLatestDto {
    live: ReportDocumentDto | null
    backfilled: ReportDocumentDto | null
}

/*
	Эндпоинты, работающие с ReportDocument и лёгкими снапшотами бэктеста.

	- Текущий прогноз ML-модели.
	- Индекс и отчёт по конкретной дате.
	- Backtest_summary (ReportDocument).
	- Лёгкий baseline-снимок бэктеста.
*/
export const buildReportEndpoints = (builder: ApiEndpointBuilder) => {
    const { latestReport, datesIndex, byDateReport } = API_ROUTES.currentPrediction

    const { baselineSummaryGet, baselineSnapshotGet, diagnosticsGet } = API_ROUTES.backtest

    return {
        // Текущий прогноз ML-модели (последний снапшот).
        getCurrentPrediction: builder.query<CurrentPredictionLatestDto, void>({
            query: () => ({
                url: latestReport.path,
                method: latestReport.method
            }),
            transformResponse: raw => {
                const payload = raw as { live?: unknown; backfilled?: unknown }

                return {
                    live: payload.live ? mapReportResponse(payload.live) : null,
                    backfilled: payload.backfilled ? mapReportResponse(payload.backfilled) : null
                }
            }
        }),

        // Индекс доступных дат по текущему прогнозу (GET /api/current-prediction/dates?set=live|backfilled&days=60).
        getCurrentPredictionIndex: builder.query<
            CurrentPredictionIndexItemDto[],
            { set: CurrentPredictionSet; days?: number }
        >({
            query: ({ set, days }) => {
                const params = days ? { set, days } : { set }

                return {
                    url: datesIndex.path,
                    method: datesIndex.method,
                    params
                }
            }
        }),

        // Отчёт по текущему прогнозу за конкретную дату (GET /api/current-prediction/by-date?set=...&dateUtc=YYYY-MM-DD).
        getCurrentPredictionByDate: builder.query<ReportDocumentDto, { set: CurrentPredictionSet; dateUtc: string }>({
            query: ({ set, dateUtc }) => ({
                url: byDateReport.path,
                method: byDateReport.method,
                params: { set, dateUtc }
            }),
            transformResponse: mapReportResponse
        }),

        // Сводка бэктеста (baseline BacktestSummaryReport как ReportDocument).
        getBacktestBaselineSummary: builder.query<BacktestSummaryDto, void>({
            query: () => ({
                url: baselineSummaryGet.path,
                method: baselineSummaryGet.method
            }),
            transformResponse: mapReportResponse
        }),

        // Лёгкий baseline-снимок бэктеста (DTO BacktestBaselineSnapshotDto).
        getBacktestBaselineSnapshot: builder.query<BacktestBaselineSnapshotDto, void>({
            query: () => ({
                url: baselineSnapshotGet.path,
                method: baselineSnapshotGet.method
            })
        }),

        // Диагностика бэктеста (ReportDocument, kind = "backtest_diagnostics").
        getBacktestDiagnosticsReport: builder.query<ReportDocumentDto, void>({
            query: () => ({
                url: diagnosticsGet.path,
                method: diagnosticsGet.method
            }),
            transformResponse: mapReportResponse
        })
    }
}

