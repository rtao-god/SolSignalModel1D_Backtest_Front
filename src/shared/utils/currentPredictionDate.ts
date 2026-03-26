const ISO_DATE_ONLY_REGEX = /^\d{4}-\d{2}-\d{2}$/
const ISO_UTC_MIDNIGHT_REGEX = /^(\d{4}-\d{2}-\d{2})T00:00:00(?:\.0{1,7})?Z$/

/**
 * Канонизирует дату current-prediction к UTC day-key формата YYYY-MM-DD.
 * Индекс истории может отдавать либо day-key, либо midnight ISO instant, но
 * UI и query-string должны работать только с одним форматом без ручной склейки.
 */
export function normalizeCurrentPredictionDateUtc(raw: string): string {
    const normalized = raw.trim()
    if (!normalized) {
        throw new Error('[current-prediction] dateUtc is required.')
    }

    if (ISO_DATE_ONLY_REGEX.test(normalized)) {
        return normalized
    }

    const isoMidnightMatch = normalized.match(ISO_UTC_MIDNIGHT_REGEX)
    if (isoMidnightMatch?.[1]) {
        return isoMidnightMatch[1]
    }

    throw new Error(
        `[current-prediction] dateUtc must be an ISO date (YYYY-MM-DD) or UTC midnight instant. value=${raw}.`
    )
}
