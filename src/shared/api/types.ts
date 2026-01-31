import type {
    BaseQueryFn,
    EndpointBuilder,
    FetchArgs,
    FetchBaseQueryError,
    FetchBaseQueryMeta
} from '@reduxjs/toolkit/query'

/*
	api — типы.

	Зачем:
		- Описывает контракт типов для API и RTK Query.
*/

/*
	Базовый тип baseQuery, совместимый с fetchBaseQuery.

	- Важно: meta = FetchBaseQueryMeta, чтобы тип совпадал с тем, что инферит createApi.
*/
type AppBaseQuery = BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError, {}, FetchBaseQueryMeta>

/*
	Общий билдер эндпоинтов для нашего api.

	- reducerPath: 'api'.
	- tagTypes: 'BacktestProfiles'.
*/
export type ApiEndpointBuilder = EndpointBuilder<AppBaseQuery, 'BacktestProfiles', 'api'>

