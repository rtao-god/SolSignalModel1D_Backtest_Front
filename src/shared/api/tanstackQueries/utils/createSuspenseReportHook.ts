import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { API_BASE_URL } from '../../../configs/config'

interface CreateSuspenseReportHookOptions<T> {
    queryKey: readonly unknown[]
    path: string
    mapResponse: (raw: unknown) => T
}

const REPORT_QUERY_STALE_TIME_MS = 2 * 60 * 1000
const REPORT_QUERY_GC_TIME_MS = 15 * 60 * 1000

export function createSuspenseReportHook<T>({ queryKey, path, mapResponse }: CreateSuspenseReportHookOptions<T>) {
    async function fetchReport(): Promise<T> {
        const resp = await fetch(`${API_BASE_URL}${path}`)

        if (!resp.ok) {
            const text = await resp.text().catch(() => '')
            throw new Error(`Failed to load report from ${path}: ${resp.status} ${text}`)
        }

        const raw = await resp.json()
        return mapResponse(raw)
    }

    return function useReportQuery(): UseQueryResult<T, Error> {
        return useQuery({
            queryKey,
            queryFn: fetchReport,
            retry: false,
            staleTime: REPORT_QUERY_STALE_TIME_MS,
            gcTime: REPORT_QUERY_GC_TIME_MS,
            refetchOnWindowFocus: false
        })
    }
}
