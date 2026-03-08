import { useQuery, type QueryClient, type UseQueryResult } from '@tanstack/react-query'
import { API_BASE_URL } from '../../../configs/config'

export interface SuspenseReportQueryConfig<T> {
    queryKey: readonly unknown[]
    path: string
    mapResponse: (raw: unknown) => T
}

const REPORT_QUERY_STALE_TIME_MS = 2 * 60 * 1000
const REPORT_QUERY_GC_TIME_MS = 15 * 60 * 1000

function buildSuspenseReportQueryOptions<T>(
    config: SuspenseReportQueryConfig<T>
): {
    queryKey: readonly unknown[]
    queryFn: () => Promise<T>
    retry: false
    staleTime: number
    gcTime: number
    refetchOnWindowFocus: false
} {
    return {
        queryKey: config.queryKey,
        queryFn: async () => {
            const resp = await fetch(`${API_BASE_URL}${config.path}`)

            if (!resp.ok) {
                const text = await resp.text().catch(() => '')
                throw new Error(`Failed to load report from ${config.path}: ${resp.status} ${text}`)
            }

            const raw = await resp.json()
            return config.mapResponse(raw)
        },
        retry: false,
        staleTime: REPORT_QUERY_STALE_TIME_MS,
        gcTime: REPORT_QUERY_GC_TIME_MS,
        refetchOnWindowFocus: false
    }
}

export function createSuspenseReportHook<T>(config: SuspenseReportQueryConfig<T>) {
    return function useReportQuery(): UseQueryResult<T, Error> {
        const queryOptions = buildSuspenseReportQueryOptions(config)

        return useQuery(queryOptions)
    }
}

export async function prefetchSuspenseReport<T>(
    queryClient: QueryClient,
    config: SuspenseReportQueryConfig<T>
): Promise<void> {
    const queryOptions = buildSuspenseReportQueryOptions(config)
    await queryClient.prefetchQuery(queryOptions)
}
