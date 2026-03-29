import { API_BASE_URL } from '@/shared/configs/config'

function trimTrailingSlashes(value: string): string {
    return value.replace(/\/+$/, '')
}

/**
 * Возвращает опубликованный базовый адрес API для экранов, которые читают готовые отчёты.
 * Контракт здесь общий для dev и production: адрес уже должен быть подготовлен upstream.
 */
export function resolveReportSourceEndpoint(): string {
    const base = API_BASE_URL.trim()
    if (!base) {
        throw new Error('[report-source] API_BASE_URL is empty.')
    }

    return trimTrailingSlashes(base)
}
