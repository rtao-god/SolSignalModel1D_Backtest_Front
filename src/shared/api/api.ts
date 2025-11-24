import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react'
import type { TUserDataForPutRequest } from '@/entities/User/model/types/UserSchema'
import type { UserData } from '@/shared/types/user.types'
import type { ReportDocumentDto } from '@/shared/types/report.types'
import type { BacktestBaselineSnapshotDto } from '@/shared/types/backtest.types'
import { mapReportResponse } from './utils/mapReportResponse'
import { buildBacktestEndpoints } from './endpoints/buildBacktestEndpoints'

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
    endpoints: builder => ({
        // ==== user ====
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

        // ==== reports: current-prediction, backtest summary, baseline snapshot ====
        getCurrentPrediction: builder.query<ReportDocumentDto, void>({
            query: () => ({
                url: '/current-prediction',
                method: 'GET'
            }),
            transformResponse: mapReportResponse
        }),

        getBacktestBaselineSummary: builder.query<ReportDocumentDto, void>({
            query: () => ({
                url: '/backtest/summary',
                method: 'GET'
            }),
            transformResponse: mapReportResponse
        }),

        getBacktestBaselineSnapshot: builder.query<BacktestBaselineSnapshotDto, void>({
            query: () => ({
                url: '/backtest/baseline',
                method: 'GET'
            })
        }),

        // ==== backtest (config / profiles / preview) ====
        ...buildBacktestEndpoints(builder)
    })
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
    usePreviewBacktestMutation
} = api
