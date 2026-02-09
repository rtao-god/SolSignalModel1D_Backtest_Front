import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { buildBacktestEndpoints } from './endpoints/buildBacktestEndpoints'
import { ApiEndpointBuilder } from './types'
import { buildUserEndpoints } from './endpoints/userEndpoints'
import { buildReportEndpoints } from './endpoints/reportEndpoints'
import { modelStatsEndpoints } from './endpoints/modelStatsEndpoints'
import { pfiEndpoints } from './endpoints/pfiEndpoints'
import { aggregationEndpoints } from './endpoints/aggregationEndpoints'
import { API_BASE_URL } from '../configs/config'

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
            ...buildUserEndpoints(b),
            ...buildReportEndpoints(b),
            ...buildBacktestEndpoints(b),
            ...pfiEndpoints(b),
            ...modelStatsEndpoints(b),
            ...aggregationEndpoints(b)
        }
    }
})

export const {
    useGetUserQuery,
    useChangeUserDetailsMutation,
    useGetCurrentPredictionQuery,
    useGetCurrentPredictionIndexQuery,
    useGetCurrentPredictionByDateQuery,
    useGetBacktestBaselineSummaryQuery,
    useGetBacktestBaselineSnapshotQuery,
    useGetBacktestDiagnosticsReportQuery,
    useGetBacktestConfigQuery,
    useGetBacktestProfilesQuery,
    useGetBacktestProfileByIdQuery,
    useCreateBacktestProfileMutation,
    useUpdateBacktestProfileMutation,
    usePreviewBacktestMutation,
    useGetBacktestPolicyRatiosQuery,
    useGetPfiPerModelReportQuery,
    useGetModelStatsReportQuery,
    useGetAggregationProbsQuery,
    useGetAggregationMetricsQuery
} = api

