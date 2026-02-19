import type {
    BacktestConfigDto,
    BacktestSummaryDto,
    BacktestPreviewRequestDto,
    BacktestPreviewBundleDto,
    BacktestCompareRequestDto,
    BacktestCompareResponseDto,
    BacktestProfileDto,
    BacktestProfileCreateDto,
    BacktestProfileUpdateDto
} from '@/shared/types/backtest.types'
import type { PolicyRatiosReportDto } from '@/shared/types/policyRatios.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import type { ApiEndpointBuilder } from '../types'
import { API_ROUTES } from '../routes'

export const buildBacktestEndpoints = (builder: ApiEndpointBuilder) => {
    const {
        configGet,
        profilesListGet,
        profilesCreatePost,
        profileGetById,
        profileUpdatePatch,
        previewPost,
        previewFullPost,
        comparePost,
        policyRatiosGetByProfile
    } = API_ROUTES.backtest

    return {
        getBacktestConfig: builder.query<BacktestConfigDto, void>({
            query: () => ({
                url: configGet.path,
                method: configGet.method
            })
        }),
        getBacktestProfiles: builder.query<BacktestProfileDto[], void>({
            query: () => ({
                url: profilesListGet.path,
                method: profilesListGet.method
            }),
            providesTags: ['BacktestProfiles']
        }),
        getBacktestProfileById: builder.query<BacktestProfileDto, string>({
            query: (id: string) => ({
                url: `${profileGetById.path}/${encodeURIComponent(id)}`,
                method: profileGetById.method
            }),
            providesTags: (_result, _error, id) => [{ type: 'BacktestProfiles', id }]
        }),
        createBacktestProfile: builder.mutation<BacktestProfileDto, BacktestProfileCreateDto>({
            query: (body: BacktestProfileCreateDto) => ({
                url: profilesCreatePost.path,
                method: profilesCreatePost.method,
                body
            }),
            invalidatesTags: ['BacktestProfiles']
        }),
        updateBacktestProfile: builder.mutation<BacktestProfileDto, { id: string; patch: BacktestProfileUpdateDto }>({
            query: ({ id, patch }) => ({
                url: `${profileUpdatePatch.path}/${encodeURIComponent(id)}`,
                method: profileUpdatePatch.method,
                body: patch
            }),
            invalidatesTags: ['BacktestProfiles']
        }),
        previewBacktest: builder.mutation<BacktestSummaryDto, BacktestPreviewRequestDto>({
            query: (body: BacktestPreviewRequestDto) => ({
                url: previewPost.path,
                method: previewPost.method,
                body
            }),
            transformResponse: mapReportResponse
        }),
        previewBacktestFull: builder.mutation<BacktestPreviewBundleDto, BacktestPreviewRequestDto>({
            query: (body: BacktestPreviewRequestDto) => ({
                url: previewFullPost.path,
                method: previewFullPost.method,
                body
            }),
            transformResponse: (response: BacktestPreviewBundleDto) => ({
                ...response,
                summary: mapReportResponse(response.summary)
            })
        }),
        compareBacktestProfiles: builder.mutation<BacktestCompareResponseDto, BacktestCompareRequestDto>({
            query: (body: BacktestCompareRequestDto) => ({
                url: comparePost.path,
                method: comparePost.method,
                body
            }),
            transformResponse: (response: BacktestCompareResponseDto) => ({
                ...response,
                left: {
                    ...response.left,
                    preview: {
                        ...response.left.preview,
                        summary: mapReportResponse(response.left.preview.summary)
                    }
                },
                right: {
                    ...response.right,
                    preview: {
                        ...response.right.preview,
                        summary: mapReportResponse(response.right.preview.summary)
                    }
                }
            })
        }),

        getBacktestPolicyRatios: builder.query<PolicyRatiosReportDto, string | undefined>({
            query: (profileId: string | undefined = 'baseline') => {
                const effectiveId = profileId ?? 'baseline'

                return {
                    url: `${policyRatiosGetByProfile.path}/${encodeURIComponent(effectiveId)}`,
                    method: policyRatiosGetByProfile.method
                }
            }
        })
    }
}

