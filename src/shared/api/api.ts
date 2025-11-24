import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { TUserDataForPutRequest } from '@/entities/User/model/types/UserSchema'
import { UserData } from '@/shared/types/user.types'
import type { ReportDocumentDto, ReportSectionDto } from '@/shared/types/report.types'
import type {
    BacktestConfigDto,
    BacktestSummaryDto,
    BacktestPreviewRequestDto,
    BacktestBaselineSnapshotDto
} from '@/shared/types/backtest.types'

// Базовый env VITE_API_BASE_URL=http://localhost:5289/api
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

/**
 * Универсальный маппер ReportDocument → ReportDocumentDto с плоским массивом sections.
 * Используется для current-prediction, backtest-summary, preview.
 */
const mapReportResponse = (response: any): ReportDocumentDto => {
    const sections: ReportSectionDto[] = []

    // KeyValue секции
    if (Array.isArray(response.keyValueSections)) {
        for (const kv of response.keyValueSections) {
            sections.push({
                title: String(kv.title ?? ''),
                items:
                    Array.isArray(kv.items) ?
                        kv.items.map((it: any) => ({
                            key: String(it.key ?? ''),
                            value: String(it.value ?? '')
                        }))
                    :   []
            })
        }
    }

    // Табличные секции
    if (Array.isArray(response.tableSections)) {
        for (const tbl of response.tableSections) {
            sections.push({
                title: String(tbl.title ?? ''),
                columns: Array.isArray(tbl.columns) ? tbl.columns.map((c: any) => String(c ?? '')) : [],
                rows:
                    Array.isArray(tbl.rows) ?
                        tbl.rows.map((row: any) =>
                            Array.isArray(row) ? row.map((cell: any) => String(cell ?? '')) : []
                        )
                    :   []
            })
        }
    }

    return {
        id: String(response.id ?? ''),
        kind: String(response.kind ?? ''),
        title: String(response.title ?? ''),
        generatedAtUtc: String(response.generatedAtUtc ?? ''),
        sections
    }
}

export const api = createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({
        baseUrl: API_BASE_URL,
        prepareHeaders: (headers, { getState }) => {
            // Здесь ожидается auth-слайс, в котором лежит токен
            const token = (getState() as any).auth?.token
            if (token) {
                headers.set('authorization', `Bearer ${token}`)
            }
            return headers
        }
    }),
    endpoints: builder => ({
        // ==== старые эндпоинты ====
        getUser: builder.query<UserData, void>({
            query: () => ({
                url: '/users-detail/',
                method: 'GET'
            })
        }),

        changeUserDetails: builder.mutation<UserData, TUserDataForPutRequest>({
            query: data => ({
                url: '/users-detail/',
                method: 'PUT',
                body: data
            })
        }),

        // ==== текущий прогноз ML-модели ====
        getCurrentPrediction: builder.query<ReportDocumentDto, void>({
            query: () => ({
                url: '/current-prediction',
                method: 'GET'
            }),
            transformResponse: mapReportResponse
        }),

        // ==== сводка бэктеста (baseline BacktestSummaryReport) ====
        getBacktestBaselineSummary: builder.query<BacktestSummaryDto, void>({
            query: () => ({
                // baseUrl = http://localhost:5289/api -> здесь только относительный путь
                url: '/backtest/summary',
                method: 'GET'
            }),
            transformResponse: mapReportResponse
        }),

        // ==== baseline-снимок бэктеста (лёгкий DTO, без секций) ====
        getBacktestBaseline: builder.query<BacktestBaselineSnapshotDto, void>({
            query: () => ({
                url: '/backtest/baseline',
                method: 'GET'
            })
        }),

        // ==== baseline-конфиг бэктеста ====
        getBacktestConfig: builder.query<BacktestConfigDto, void>({
            query: () => ({
                url: '/backtest/config',
                method: 'GET'
            })
        }),

        // ==== one-shot preview бэктеста по конфигу ====
        previewBacktest: builder.mutation<BacktestSummaryDto, BacktestPreviewRequestDto>({
            query: body => ({
                url: '/backtest/preview',
                method: 'POST',
                body
            }),
            transformResponse: mapReportResponse
        })
    })
})

export const {
    useGetUserQuery,
    useChangeUserDetailsMutation,
    useGetCurrentPredictionQuery,
    useGetBacktestBaselineSummaryQuery,
    useGetBacktestBaselineQuery,
    useGetBacktestConfigQuery,
    usePreviewBacktestMutation
} = api
