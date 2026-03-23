function truncatePreview(value: string, maxLength = 180): string {
    return value.length <= maxLength ? value : `${value.slice(0, maxLength - 1)}…`
}

function stringifyPreview(value: unknown): string {
    try {
        return truncatePreview(JSON.stringify(value))
    } catch {
        return truncatePreview(String(value))
    }
}

/**
 * Дает короткое, но предметное описание неожиданного runtime-значения.
 * Нужен для validation/runtime ошибок, где важно видеть не только тип, но и реальный payload.
 */
export function describeUnexpectedValue(value: unknown): string {
    if (value === null) {
        return 'null'
    }

    if (value === undefined) {
        return 'undefined'
    }

    if (typeof value === 'string') {
        return `string(${JSON.stringify(truncatePreview(value))})`
    }

    if (typeof value === 'number') {
        return Number.isFinite(value) ? `number(${value})` : `number(${String(value)})`
    }

    if (typeof value === 'boolean') {
        return `boolean(${value})`
    }

    if (typeof value === 'bigint') {
        return `bigint(${value.toString()})`
    }

    if (typeof value === 'symbol') {
        return `symbol(${String(value)})`
    }

    if (typeof value === 'function') {
        return `function(${value.name || 'anonymous'})`
    }

    if (Array.isArray(value)) {
        return `array(length=${value.length}, preview=${stringifyPreview(value.slice(0, 4))})`
    }

    if (value instanceof Date) {
        return `Date(${Number.isNaN(value.getTime()) ? 'Invalid Date' : value.toISOString()})`
    }

    if (typeof value === 'object') {
        const record = value as Record<string, unknown>
        const keys = Object.keys(record)
        const keyPreview = keys.slice(0, 6).join(', ')
        return `object(keys=[${keyPreview}], preview=${stringifyPreview(record)})`
    }

    return String(value)
}

export function buildUnexpectedValueErrorMessage(
    scope: string,
    label: string,
    expected: string,
    actualValue: unknown
): string {
    return `[${scope}] ${label} expected ${expected}, received ${describeUnexpectedValue(actualValue)}.`
}
