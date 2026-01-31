import { useSuspenseQuery, type UseSuspenseQueryResult } from '@tanstack/react-query'
import { API_BASE_URL } from '../../../configs/config'

/*
	createSuspenseReportHook — TanStack Query hooks.

	Зачем:
		- Даёт запросы для report-эндпоинтов и suspense-режима.
*/

interface CreateSuspenseReportHookOptions<T> {
    queryKey: readonly unknown[]
    path: string
    mapResponse: (raw: unknown) => T
}

/*
	Фабрика Suspense-хуков для отчётов, которые отдаются по простому GET без параметров.
*/
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

    return function useSuspenseReportQuery(): UseSuspenseQueryResult<T, Error> {
        return useSuspenseQuery({
            queryKey,
            queryFn: fetchReport
        })
    }
}

