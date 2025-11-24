import type {
    BaseQueryFn,
    EndpointBuilder,
    FetchArgs,
    FetchBaseQueryError,
    FetchBaseQueryMeta
} from '@reduxjs/toolkit/query'

/**
 * Базовый тип baseQuery, совместимый с fetchBaseQuery.
 * Важно: meta = FetchBaseQueryMeta, а не {} / unknown,
 * чтобы тип совпадал с тем, что инферит createApi.
 */
type AppBaseQuery = BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError, {}, FetchBaseQueryMeta>

/**
 * Общий билдер эндпоинтов для нашего api:
 * - reducerPath: 'api'
 * - tagTypes: 'BacktestProfiles'
 */
export type ApiEndpointBuilder = EndpointBuilder<AppBaseQuery, 'BacktestProfiles', 'api'>
