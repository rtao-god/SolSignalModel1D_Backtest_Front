import type { DayDirectionLabelDto, UtcDayKeyDto } from '@/shared/types/aggregation.types'
import { formatIsoDateHuman } from '@/shared/utils/dateFormat'
import { formatCount, formatPercent, formatProb3, formatNumber } from '@/shared/utils/numberFormat'

function pad2(value: number): string {
    return value < 10 ? `0${value}` : String(value)
}

function toNumberOrNull(value: unknown): number | null {
    if (value === null || value === undefined) {
        return null
    }
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : null
    }
    if (typeof value === 'string') {
        const trimmed = value.trim()
        if (!trimmed) {
            return null
        }
        const parsed = Number(trimmed)
        return Number.isFinite(parsed) ? parsed : null
    }
    return null
}
export function formatUtcDayKey(value: UtcDayKeyDto | null | undefined): string {
    if (!value) {
        throw new Error('[ui] Missing UtcDayKey value.')
    }

    if (typeof value === 'string') {
        return value.length >= 10 ? value.substring(0, 10) : value
    }

    const iso = value.IsoDate ?? value.isoDate
    if (typeof iso === 'string' && iso.length > 0) {
        return iso.length >= 10 ? iso.substring(0, 10) : iso
    }

    const rawValue = value.Value ?? value.value
    if (typeof rawValue === 'string' && rawValue.length > 0) {
        return rawValue.length >= 10 ? rawValue.substring(0, 10) : rawValue
    }

    const year = toNumberOrNull(value.Year ?? value.year)
    const month = toNumberOrNull(value.Month ?? value.month)
    const day = toNumberOrNull(value.Day ?? value.day)

    if (year !== null && month !== null && day !== null) {
        return `${year}-${pad2(month)}-${pad2(day)}`
    }

    throw new Error('[ui] UtcDayKey value is invalid or incomplete.')
}
export function formatUtcDayKeyHuman(value: UtcDayKeyDto | null | undefined): string {
    const iso = formatUtcDayKey(value)
    return formatIsoDateHuman(iso, { locale: 'ru-RU', omitYearForCurrent: true, timeZone: 'UTC' })
}
export function formatDayDirectionLabel(label: DayDirectionLabelDto): string {
    if (label === null || typeof label === 'undefined') {
        throw new Error('[ui] Missing DayDirectionLabel value.')
    }
    if (typeof label === 'number' && !Number.isFinite(label)) {
        throw new Error('[ui] Invalid DayDirectionLabel value.')
    }
    if (label === 'Down' || label === 0) return 'Падение'
    if (label === 'Flat' || label === 1) return 'Боковик'
    if (label === 'Up' || label === 2) return 'Рост'
    throw new Error(`[ui] Unknown DayDirectionLabel value: ${String(label)}.`)
}

export function formatRange(from: UtcDayKeyDto | null | undefined, to: UtcDayKeyDto | null | undefined): string {
    const fromText = formatUtcDayKey(from)
    const toText = formatUtcDayKey(to)
    if (fromText === toText) {
        return fromText
    }
    return `${fromText} → ${toText}`
}
export { formatCount, formatPercent, formatProb3, formatNumber }
