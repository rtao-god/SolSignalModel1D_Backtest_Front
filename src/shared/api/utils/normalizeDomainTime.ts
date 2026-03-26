import { buildUnexpectedValueErrorMessage } from '@/shared/lib/errors/describeUnexpectedValue'

interface NormalizeDomainTimeOptions {
    scope: string
}

const DOTNET_TICKS_AT_UNIX_EPOCH = 621355968000000000n

/**
 * Нормализует backend-представления UtcDayKey в каноничную строку YYYY-MM-DD.
 * Поддерживает и строковый формат, и .NET object-form сериализацию value object.
 */
export function normalizeUtcDayKey(value: unknown, label: string, options: NormalizeDomainTimeOptions): string {
    if (typeof value === 'string') {
        const normalized = value.trim()
        if (/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
            return normalized
        }
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const raw = value as Record<string, unknown>
        const iso = readOptionalField(raw, 'isoDate', 'IsoDate', 'value', 'Value')
        if (typeof iso === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(iso.trim())) {
            return iso.trim()
        }

        const year = readOptionalField(raw, 'year', 'Year')
        const month = readOptionalField(raw, 'month', 'Month')
        const day = readOptionalField(raw, 'day', 'Day')

        if (
            typeof year === 'number' &&
            typeof month === 'number' &&
            typeof day === 'number' &&
            Number.isInteger(year) &&
            Number.isInteger(month) &&
            Number.isInteger(day)
        ) {
            return `${year.toString().padStart(4, '0')}-${month.toString().padStart(2, '0')}-${day
                .toString()
                .padStart(2, '0')}`
        }
    }

    throw new Error(buildUnexpectedValueErrorMessage(options.scope, label, 'a UTC day key', value))
}

/**
 * Нормализует backend-представления UtcInstant в каноничную ISO-строку UTC.
 * Поддерживает строку, ticks и .NET object-form со split-полями даты и времени.
 */
export function normalizeUtcInstant(value: unknown, label: string, options: NormalizeDomainTimeOptions): string {
    if (typeof value === 'string') {
        const parsed = new Date(value)
        if (!Number.isNaN(parsed.getTime())) {
            return parsed.toISOString()
        }
    }

    if (value && typeof value === 'object' && !Array.isArray(value)) {
        const raw = value as Record<string, unknown>
        const asString = readOptionalField(raw, 'value', 'Value', 'iso', 'Iso')
        if (typeof asString === 'string') {
            const parsed = new Date(asString)
            if (!Number.isNaN(parsed.getTime())) {
                return parsed.toISOString()
            }
        }

        const ticks = readOptionalField(raw, 'ticks', 'Ticks')
        if ((typeof ticks === 'number' && Number.isFinite(ticks)) || typeof ticks === 'string') {
            const tickValue = BigInt(String(ticks))
            const unixMs = Number((tickValue - DOTNET_TICKS_AT_UNIX_EPOCH) / 10000n)
            const parsed = new Date(unixMs)
            if (!Number.isNaN(parsed.getTime())) {
                return parsed.toISOString()
            }
        }

        const year = readOptionalField(raw, 'year', 'Year')
        const month = readOptionalField(raw, 'month', 'Month')
        const day = readOptionalField(raw, 'day', 'Day')
        const hour = readOptionalField(raw, 'hour', 'Hour')
        const minute = readOptionalField(raw, 'minute', 'Minute')
        const second = readOptionalField(raw, 'second', 'Second')
        const millisecond = readOptionalField(raw, 'millisecond', 'Millisecond')

        if (
            typeof year === 'number' &&
            typeof month === 'number' &&
            typeof day === 'number' &&
            typeof hour === 'number' &&
            typeof minute === 'number' &&
            typeof second === 'number'
        ) {
            return new Date(
                Date.UTC(year, month - 1, day, hour, minute, second, typeof millisecond === 'number' ? millisecond : 0)
            ).toISOString()
        }
    }

    throw new Error(buildUnexpectedValueErrorMessage(options.scope, label, 'a UTC instant', value))
}

function readOptionalField(raw: Record<string, unknown>, ...keys: string[]): unknown {
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(raw, key)) {
            return raw[key]
        }
    }

    return undefined
}
