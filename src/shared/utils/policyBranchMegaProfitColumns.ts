import type { TableSectionDto } from '@/shared/types/report.types'

const MEGA_MONEY_EPSILON = 1e-9
const MEGA_PERCENT_EPSILON = 1e-9

export const POLICY_BRANCH_MEGA_TOTAL_RETURN_METRIC_KEYS = ['TotalPnl%', 'Wealth%'] as const

function parseFiniteNumberOrNull(raw: string | undefined): number | null {
    if (raw == null) return null

    const normalized = raw.trim().replace(/\s+/g, '').replace(',', '.')
    if (!normalized || normalized === '—' || normalized === 'нетданных' || normalized === 'nodata') {
        return null
    }

    const value = Number(normalized)
    if (!Number.isFinite(value)) {
        return null
    }

    return value
}

function buildTrimmedRow(
    row: string[] | undefined,
    indexesToKeep: readonly number[],
    sectionTitle: string,
    rowIndex: number
): string[] {
    if (!row) {
        throw new Error(
            `[policy-branch-mega] cannot normalize profit columns for empty row. section=${sectionTitle}, row=${rowIndex}.`
        )
    }

    return indexesToKeep.map(index => String(row[index] ?? ''))
}

function sectionHasDistinctWealthAndTotal(section: TableSectionDto): boolean {
    const columns = section.columns ?? []
    const rows = section.rows ?? []
    const wealthIdx = columns.indexOf('Wealth%')
    if (wealthIdx < 0) {
        return false
    }

    const totalPnlIdx = columns.indexOf('TotalPnl%')
    if (totalPnlIdx >= 0) {
        for (const row of rows) {
            const wealthValue = parseFiniteNumberOrNull(row?.[wealthIdx])
            const totalPnlValue = parseFiniteNumberOrNull(row?.[totalPnlIdx])
            if (
                wealthValue !== null &&
                totalPnlValue !== null &&
                Math.abs(wealthValue - totalPnlValue) > MEGA_PERCENT_EPSILON
            ) {
                return true
            }
        }
    }

    return false
}

function sectionShowsReinvestedActiveBalance(section: TableSectionDto): boolean {
    const columns = section.columns ?? []
    const rows = section.rows ?? []

    const onExchUsdIdx = columns.indexOf('OnExch$')
    const startCapUsdIdx = columns.indexOf('StartCap$')
    if (onExchUsdIdx >= 0 && startCapUsdIdx >= 0) {
        for (const row of rows) {
            const onExchUsd = parseFiniteNumberOrNull(row?.[onExchUsdIdx])
            const startCapUsd = parseFiniteNumberOrNull(row?.[startCapUsdIdx])
            if (onExchUsd !== null && startCapUsd !== null && onExchUsd > startCapUsd + MEGA_MONEY_EPSILON) {
                return true
            }
        }
    }

    const onExchPctIdx = columns.indexOf('OnExch%')
    if (onExchPctIdx >= 0) {
        for (const row of rows) {
            const onExchPct = parseFiniteNumberOrNull(row?.[onExchPctIdx])
            if (onExchPct !== null && onExchPct > MEGA_PERCENT_EPSILON) {
                return true
            }
        }
    }

    return false
}

/**
 * Возвращает главный profit-столбец после owner-нормализации mega-таблицы.
 * TotalPnl% имеет приоритет как основной итог, а Wealth% остаётся только
 * там, где у строки реально появляется отдельный wealth-смысл.
 */
export function resolvePolicyBranchMegaPrimaryProfitColumn(columns: readonly string[]): 'TotalPnl%' | 'Wealth%' | null {
    if (columns.includes('TotalPnl%')) {
        return 'TotalPnl%'
    }

    if (columns.includes('Wealth%')) {
        return 'Wealth%'
    }

    return null
}

/**
 * Схлопывает Wealth% в TotalPnl%, когда по показанным строкам у wealth нет отдельного смысла.
 * Если активный баланс нигде не растёт выше стартовой базы и отдельного TotalPnl%-расхождения нет,
 * UI не должен показывать два одинаковых столбца прибыли под разными названиями.
 */
export function normalizePolicyBranchMegaProfitColumns(sections: readonly TableSectionDto[]): TableSectionDto[] {
    if (!sections || sections.length === 0) {
        throw new Error('[policy-branch-mega] cannot normalize profit columns for empty sections list.')
    }

    if (
        sections.some(section => sectionHasDistinctWealthAndTotal(section)) ||
        sections.some(section => sectionShowsReinvestedActiveBalance(section))
    ) {
        return [...sections]
    }

    return sections.map(section => {
        const columns = section.columns ?? []
        const rows = section.rows ?? []
        const wealthIdx = columns.indexOf('Wealth%')
        if (wealthIdx < 0) {
            return section
        }

        const totalPnlIdx = columns.indexOf('TotalPnl%')
        if (totalPnlIdx >= 0) {
            const indexesToKeep = columns
                .map((_, index) => index)
                .filter(index => index !== wealthIdx)

            const nextColumns = indexesToKeep.map(index => columns[index]!)
            const nextRows = rows.map((row, rowIndex) =>
                buildTrimmedRow(row, indexesToKeep, section.title ?? 'n/a', rowIndex)
            )

            const nextSection: TableSectionDto = {
                ...section,
                columns: nextColumns,
                rows: nextRows
            }

            if (Array.isArray(section.columnKeys) && section.columnKeys.length >= columns.length) {
                nextSection.columnKeys = indexesToKeep.map(index => String(section.columnKeys![index] ?? nextColumns[index]))
            }

            return nextSection
        }

        const nextColumns = [...columns]
        nextColumns[wealthIdx] = 'TotalPnl%'

        const nextSection: TableSectionDto = {
            ...section,
            columns: nextColumns
        }

        if (Array.isArray(section.columnKeys) && section.columnKeys.length >= columns.length) {
            const nextColumnKeys = [...section.columnKeys]
            nextColumnKeys[wealthIdx] = 'TotalPnl%'
            nextSection.columnKeys = nextColumnKeys
        }

        return nextSection
    })
}
