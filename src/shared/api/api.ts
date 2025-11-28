import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import { buildBacktestEndpoints } from './endpoints/buildBacktestEndpoints'
import { ApiEndpointBuilder } from './types'
import { buildUserEndpoints } from './endpoints/userEndpoints'
import { buildReportEndpoints } from './endpoints/reportEndpoints'
import { pfiEndpoints } from './endpoints/pfiEndpoints'
import { modelStatsEndpoints } from './endpoints/modelStatsEndpoints'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL

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
            // ==== user ====
            ...buildUserEndpoints(b),

            // ==== reports ====
            ...buildReportEndpoints(b),

            // ==== backtest ====
            ...buildBacktestEndpoints(b),

            // ==== PFI ====
            ...pfiEndpoints(b),

            // ==== ML model stats ====
            ...modelStatsEndpoints(b)
        }
    }
})

export const {
    // user
    useGetUserQuery,
    useChangeUserDetailsMutation,

    // reports
    useGetCurrentPredictionQuery,
    useGetBacktestBaselineSummaryQuery,
    useGetBacktestBaselineSnapshotQuery,

    // backtest
    useGetBacktestConfigQuery,
    useGetBacktestProfilesQuery,
    useGetBacktestProfileByIdQuery,
    useCreateBacktestProfileMutation,
    useUpdateBacktestProfileMutation,
    usePreviewBacktestMutation,

    // PFI
    useGetPfiPerModelReportQuery,

    // ML model stats
    useGetModelStatsReportQuery
} = api
