import type {
    BacktestConfigDto,
    BacktestSummaryDto,
    BacktestPreviewRequestDto,
    BacktestProfileDto,
    BacktestProfileCreateDto,
    BacktestProfileUpdateDto
} from '@/shared/types/backtest.types'
import type { PolicyRatiosReportDto } from '@/shared/types/policyRatios.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import type { ApiEndpointBuilder } from '../types'
import { API_ROUTES } from '../routes'

/**
 * Эндпоинты домена бэктеста:
 * - baseline-конфиг;
 * - профили и их обновление;
 * - one-shot preview бэктеста;
 * - policy ratios по профилю.
 */
export const buildBacktestEndpoints = (builder: ApiEndpointBuilder) => {
    const {
        configGet,
        profilesListGet,
        profilesCreatePost,
        profileGetById,
        profileUpdatePatch,
        previewPost,
        policyRatiosGetByProfile
    } = API_ROUTES.backtest

    return {
        // baseline-конфиг бэктеста (legacy для старого UI)
        getBacktestConfig: builder.query<BacktestConfigDto, void>({
            query: () => ({
                url: configGet.path,
                method: configGet.method
            })
        }),

        // профили бэктеста
        getBacktestProfiles: builder.query<BacktestProfileDto[], void>({
            query: () => ({
                url: profilesListGet.path,
                method: profilesListGet.method
            }),
            providesTags: ['BacktestProfiles']
        }),

        // один профиль по id (с config)
        getBacktestProfileById: builder.query<BacktestProfileDto, string>({
            query: (id: string) => ({
                url: `${profileGetById.path}/${encodeURIComponent(id)}`,
                method: profileGetById.method
            }),
            providesTags: (_result, _error, id) => [{ type: 'BacktestProfiles', id }]
        }),

        // создание нового профиля на основе конфига
        createBacktestProfile: builder.mutation<BacktestProfileDto, BacktestProfileCreateDto>({
            query: (body: BacktestProfileCreateDto) => ({
                url: profilesCreatePost.path,
                method: profilesCreatePost.method,
                body
            }),
            invalidatesTags: ['BacktestProfiles']
        }),

        // частичное обновление профиля
        updateBacktestProfile: builder.mutation<BacktestProfileDto, { id: string; patch: BacktestProfileUpdateDto }>({
            query: ({ id, patch }) => ({
                url: `${profileUpdatePatch.path}/${encodeURIComponent(id)}`,
                method: profileUpdatePatch.method,
                body: patch
            }),
            invalidatesTags: ['BacktestProfiles']
        }),

        // one-shot preview бэктеста по конфигу
        previewBacktest: builder.mutation<BacktestSummaryDto, BacktestPreviewRequestDto>({
            query: (body: BacktestPreviewRequestDto) => ({
                url: previewPost.path,
                method: previewPost.method,
                body
            }),
            transformResponse: mapReportResponse
        }),

        // policy ratios по профилю бэктеста
        // По умолчанию тянем baseline-профиль.
        getBacktestPolicyRatios: builder.query<PolicyRatiosReportDto, string | undefined>({
            // Arg-типа string | undefined достаточно, чтобы не конфликтовать с encodeURIComponent.
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
