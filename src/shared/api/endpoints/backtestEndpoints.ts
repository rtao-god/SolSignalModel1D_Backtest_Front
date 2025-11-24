import type {
    BacktestConfigDto,
    BacktestSummaryDto,
    BacktestPreviewRequestDto,
    BacktestProfileDto
} from '@/shared/types/backtest.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import type { ApiEndpointBuilder } from '../types'

/**
 * Пейлоад для создания профиля бэктеста.
 * category сейчас нужен только для будущей классификации ("user", "system" и т.п.).
 */
export interface BacktestProfileCreatePayload {
    name: string
    description?: string | null
    category?: string
    isFavorite?: boolean // ← добавить эту строку
    config: BacktestConfigDto
}

/**
 * Эндпоинты домена бэктеста:
 * - чтение baseline-конфига (legacy);
 * - чтение профилей;
 * - чтение одного профиля с конфигом;
 * - создание профиля;
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

    // ==== профили бэктеста (лёгкий список без config) ====
    getBacktestProfiles: builder.query<BacktestProfileDto[], void>({
        query: () => ({
            url: '/backtest/profiles',
            method: 'GET'
        })
    }),

    // ==== один профиль по id (с полем config) ====
    getBacktestProfileById: builder.query<BacktestProfileDto, string>({
        query: (id: string) => ({
            url: `/backtest/profiles/${encodeURIComponent(id)}`,
            method: 'GET'
        })
    }),

    // ==== создание нового профиля на основе конфига ====
    createBacktestProfile: builder.mutation<BacktestProfileDto, BacktestProfileCreatePayload>({
        query: body => ({
            url: '/backtest/profiles',
            method: 'POST',
            body
        })
    }),

    // ==== one-shot preview бэктеста по конфигу ====
    previewBacktest: builder.mutation<BacktestSummaryDto, BacktestPreviewRequestDto>({
        query: (body: BacktestPreviewRequestDto) => ({
            url: '/backtest/preview',
            method: 'POST',
            body
        }),
        transformResponse: mapReportResponse
    })
})
