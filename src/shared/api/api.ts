import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { buildBacktestEndpoints } from './endpoints/buildBacktestEndpoints'
import { ApiEndpointBuilder } from './types'
import { buildUserEndpoints } from './endpoints/userEndpoints'
import { buildReportEndpoints } from './endpoints/reportEndpoints'
import { modelStatsEndpoints } from './endpoints/modelStatsEndpoints'
import { pfiEndpoints } from './endpoints/pfiEndpoints'
import { aggregationEndpoints } from './endpoints/aggregationEndpoints'
import { API_BASE_URL } from '../configs/config'

/*
	api — корневой RTK Query API.

	Зачем:
		- Централизует baseUrl, заголовки и сборку доменных эндпоинтов.
*/

export const api = createApi({
    reducerPath: 'api',
    baseQuery: fetchBaseQuery({
        baseUrl: API_BASE_URL,
        prepareHeaders: (headers, { getState }) => {
            const token = (getState() as any).auth?.token
            if (token) {
                headers.set('authorization', `Bearer ${token}`)
            }
            return headers
        }
    }),
    tagTypes: ['BacktestProfiles'],
    endpoints: builder => {
        const b = builder as unknown as ApiEndpointBuilder

        return {
            // Эндпоинты пользователя.
            ...buildUserEndpoints(b),

            // Отчёты и текущий прогноз.
            ...buildReportEndpoints(b),

            // Бэктест-эндпоинты.
            ...buildBacktestEndpoints(b),

            // PFI-отчёты.
            ...pfiEndpoints(b),

            // Статистика ML-моделей.
            ...modelStatsEndpoints(b),

            // Агрегация вероятностей и метрик.
            ...aggregationEndpoints(b)
        }
    }
})

export const {
    // Пользовательские хуки.
    useGetUserQuery,
    useChangeUserDetailsMutation,

    // Хуки отчётов и текущего прогноза.
    useGetCurrentPredictionQuery,
    useGetCurrentPredictionIndexQuery,
    useGetCurrentPredictionByDateQuery,
    useGetBacktestBaselineSummaryQuery,
    useGetBacktestBaselineSnapshotQuery,

    // Хуки бэктеста.
    useGetBacktestConfigQuery,
    useGetBacktestProfilesQuery,
    useGetBacktestProfileByIdQuery,
    useCreateBacktestProfileMutation,
    useUpdateBacktestProfileMutation,
    usePreviewBacktestMutation,
    useGetBacktestPolicyRatiosQuery,

    // Хуки PFI-отчётов.
    useGetPfiPerModelReportQuery,

    // Хуки статистики ML-моделей.
    useGetModelStatsReportQuery,

    // Хуки агрегации вероятностей и метрик.
    useGetAggregationProbsQuery,
    useGetAggregationMetricsQuery
} = api

