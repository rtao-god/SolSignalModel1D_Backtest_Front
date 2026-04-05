import { useQuery, type QueryClient, type UseQueryResult } from '@tanstack/react-query'
import { API_BASE_URL } from '../../../configs/config'
import { QUERY_POLICY_REGISTRY } from '@/shared/configs/queryPolicies'
import { buildDetailedRequestErrorMessage } from './requestErrorMessage'

export interface SuspenseReportQueryConfig<T> {
    queryKey: readonly unknown[]
    path: string
    mapResponse: (raw: unknown) => T
}

function buildSuspenseReportQueryOptions<T>(config: SuspenseReportQueryConfig<T>): {
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
                throw new Error(buildDetailedRequestErrorMessage(`Failed to load report from ${config.path}`, resp, text))
            }

            const raw = await resp.json()
            return config.mapResponse(raw)
        },
        retry: false,
        staleTime: QUERY_POLICY_REGISTRY.suspenseReports.staleTimeMs,
        gcTime: QUERY_POLICY_REGISTRY.suspenseReports.gcTimeMs,
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
