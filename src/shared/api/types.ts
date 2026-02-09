import type {
    BaseQueryFn,
    EndpointBuilder,
    FetchArgs,
    FetchBaseQueryError,
    FetchBaseQueryMeta
} from '@reduxjs/toolkit/query'

type AppBaseQuery = BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError, {}, FetchBaseQueryMeta>

export type ApiEndpointBuilder = EndpointBuilder<AppBaseQuery, 'BacktestProfiles', 'api'>

