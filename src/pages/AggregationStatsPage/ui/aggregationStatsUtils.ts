import type {
    DayDirectionLabelDto,
    Prob3Dto,
    UtcDayKeyDto
} from '@/shared/types/aggregation.types'

/*
	Утилиты страницы AggregationStatsPage.

	- Форматирование UtcDayKey, вероятностей и меток.
*/

function toNumberOrNull(value: unknown): number | null {
    return typeof value === 'number' && Number.isFinite(value) ? value : null
}

function pad2(value: number): string {
    return value < 10 ? `0${value}` : String(value)
}

// Нормализует UtcDayKey в ISO-строку YYYY-MM-DD.
export function formatUtcDayKey(value: UtcDayKeyDto | null | undefined): string {
    if (!value) {
        return '—'
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

    if (year && month && day) {
        return `${year}-${pad2(month)}-${pad2(day)}`
    }

    return '—'
}

// Формат доли 0..1 в проценты.
export function formatPercent(value: number | null | undefined, digits: number = 1): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return '—'
    }
    const pct = value * 100
    return pct.toFixed(digits)
}

// Формат Prob3 в виде "Up / Flat / Down".
export function formatProb3(value: Prob3Dto | null | undefined): string {
    if (!value) {
        return '—'
    }

    const up = toNumberOrNull((value as Prob3Dto).Up ?? (value as any).up)
    const flat = toNumberOrNull((value as Prob3Dto).Flat ?? (value as any).flat)
    const down = toNumberOrNull((value as Prob3Dto).Down ?? (value as any).down)

    if (up === null || flat === null || down === null) {
        return '—'
    }

    return `${formatPercent(up)} / ${formatPercent(flat)} / ${formatPercent(down)}`
}

// Приводит метку направления к UI-подписке.
export function formatDayDirectionLabel(label: DayDirectionLabelDto): string {
    if (label === 'Down' || label === 0) return 'Падение'
    if (label === 'Flat' || label === 1) return 'Боковик'
    if (label === 'Up' || label === 2) return 'Рост'
    return String(label)
}

// Безопасно форматирует числовое значение.
export function formatNumber(value: number | null | undefined, digits: number = 2): string {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        return '—'
    }
    return value.toFixed(digits)
}

export function formatRange(from: UtcDayKeyDto | null | undefined, to: UtcDayKeyDto | null | undefined): string {
    const fromText = formatUtcDayKey(from)
    const toText = formatUtcDayKey(to)
    if (fromText === '—' && toText === '—') {
        return '—'
    }
    if (fromText === toText) {
        return fromText
    }
    return `${fromText} → ${toText}`
}
