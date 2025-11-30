import type {
    BacktestConfigDto,
    BacktestSummaryDto,
    BacktestPreviewRequestDto,
    BacktestProfileDto,
    BacktestProfileCreateDto,
    BacktestProfileUpdateDto
} from '@/shared/types/backtest.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import type { ApiEndpointBuilder } from '../types'
import type { PolicyRatiosReportDto } from '@/shared/types/policyRatios.types'

/**
 * Эндпоинты домена бэктеста:
 * - чтение baseline-конфига (legacy);
 * - чтение профилей;
 * - чтение одного профиля с конфигом;
 * - создание профиля;
 * - частичное обновление профиля;
 * - one-shot preview бэктеста по конфигу.
 */
export const buildBacktestEndpoints = (builder: ApiEndpointBuilder) => ({
    // ==== baseline-конфиг бэктеста (legacy для старого UI) ====
    getBacktestConfig: builder.query<BacktestConfigDto, void>({
        query: () => ({
            url: '/backtest/config',
            method: 'GET'
        })
    }),

    // ==== профили бэктеста ====
    getBacktestProfiles: builder.query<BacktestProfileDto[], void>({
        query: () => ({
            url: '/backtest/profiles',
            method: 'GET'
        }),
        providesTags: ['BacktestProfiles']
    }),

    // один профиль по id (с config)
    getBacktestProfileById: builder.query<BacktestProfileDto, string>({
        query: (id: string) => ({
            url: `/backtest/profiles/${encodeURIComponent(id)}`,
            method: 'GET'
        }),
        providesTags: (_result, _error, id) => [{ type: 'BacktestProfiles', id }]
    }),

    // ==== создание нового профиля на основе конфига ====
    createBacktestProfile: builder.mutation<BacktestProfileDto, BacktestProfileCreateDto>({
        query: (body: BacktestProfileCreateDto) => ({
            url: '/backtest/profiles',
            method: 'POST',
            body
        }),
        invalidatesTags: ['BacktestProfiles']
    }),

    // ==== частичное обновление профиля ====
    updateBacktestProfile: builder.mutation<BacktestProfileDto, { id: string; patch: BacktestProfileUpdateDto }>({
        query: ({ id, patch }) => ({
            url: `/backtest/profiles/${encodeURIComponent(id)}`,
            method: 'PATCH',
            body: patch
        }),
        invalidatesTags: ['BacktestProfiles']
    }),

    // ==== one-shot preview бэктеста по конфигу ====
    previewBacktest: builder.mutation<BacktestSummaryDto, BacktestPreviewRequestDto>({
        query: (body: BacktestPreviewRequestDto) => ({
            url: '/backtest/preview',
            method: 'POST',
            body
        }),
        transformResponse: mapReportResponse
    }),

    // ==== policy ratios по профилю бэктеста ====
    // По умолчанию тянем baseline-профиль.
    getBacktestPolicyRatios: builder.query<PolicyRatiosReportDto, string | void>({
        query: (profileId: string | void = 'baseline') => ({
            url: `/backtest/policy-ratios/${encodeURIComponent(profileId)}`,
            method: 'GET'
        })
    })
})
