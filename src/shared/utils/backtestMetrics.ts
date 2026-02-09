import type { BacktestSummaryDto } from '@/shared/types/backtest.types'
import type { KeyValueSectionDto } from '@/shared/types/report.types'

export function getMetricValue(summary: BacktestSummaryDto | null, key: string): number | null {
    if (!summary) return null
    if (!Array.isArray(summary.sections)) return null

    for (const section of summary.sections) {
        const kv = section as KeyValueSectionDto
        if (!Array.isArray(kv.items)) continue

        const item = kv.items.find(it => it.key === key)
        if (!item) continue

        const normalized = String(item.value).replace('%', '').replace(',', '.')
        const value = Number(normalized)
        if (Number.isNaN(value)) continue

        return value
    }

    return null
}

