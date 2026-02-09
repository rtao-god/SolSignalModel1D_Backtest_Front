import type { Prob3Dto } from '@/shared/types/aggregation.types'

function ensureFiniteNumber(value: unknown, label?: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        const context = label ? ` (${label})` : ''
        throw new Error(`[ui] Missing or invalid numeric value${context}.`)
    }
    return value
}
export function formatCount(value: number | null | undefined, label?: string): string {
    const safeValue = ensureFiniteNumber(value, label)
    return safeValue.toLocaleString('ru-RU')
}
export function formatPercent(value: number | null | undefined, digits: number = 1, label?: string): string {
    const safeValue = ensureFiniteNumber(value, label)
    const pct = safeValue * 100
    return pct.toFixed(digits)
}
export function formatNumber(value: number | null | undefined, digits: number = 2, label?: string): string {
    const safeValue = ensureFiniteNumber(value, label)
    return safeValue.toFixed(digits)
}
export function formatProb3(value: Prob3Dto | null | undefined, label?: string): string {
    if (!value || typeof value !== 'object') {
        const context = label ? ` (${label})` : ''
        throw new Error(`[ui] Missing Prob3 value${context}.`)
    }

    const up = ensureFiniteNumber((value as Prob3Dto).Up ?? (value as any).up ?? (value as any).PUp ?? (value as any).pUp, `${label ?? 'Prob3'}.Up`)
    const flat = ensureFiniteNumber(
        (value as Prob3Dto).Flat ?? (value as any).flat ?? (value as any).PFlat ?? (value as any).pFlat,
        `${label ?? 'Prob3'}.Flat`
    )
    const down = ensureFiniteNumber(
        (value as Prob3Dto).Down ?? (value as any).down ?? (value as any).PDown ?? (value as any).pDown,
        `${label ?? 'Prob3'}.Down`
    )

    const sum = up + flat + down
    if (!(sum > 0.0)) {
        const context = label ? ` (${label})` : ''
        throw new Error(`[ui] Prob3 sum must be > 0${context}.`)
    }

    return `${formatPercent(up, 1, `${label ?? 'Prob3'}.Up`)} / ${formatPercent(flat, 1, `${label ?? 'Prob3'}.Flat`)} / ${formatPercent(down, 1, `${label ?? 'Prob3'}.Down`)}`
}
