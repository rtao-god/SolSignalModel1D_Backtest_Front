function resolveRuntimeTypographyToken(name: string, fallback: number): number {
    if (typeof window === 'undefined' || typeof document === 'undefined') {
        return fallback
    }

    const rawValue = window.getComputedStyle(document.documentElement).getPropertyValue(name).trim()
    const parsedValue = Number.parseFloat(rawValue.replace('px', ''))

    return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallback
}

export function getChartAxisFontSizePx(): number {
    return resolveRuntimeTypographyToken('--type-chart-axis-size', 11)
}

export function getTablePdfFontSizePx(): number {
    return resolveRuntimeTypographyToken('--type-table-body-dense-size', 11)
}

export function resolveChartAxisTickStyle(fill: string): { fill: string; fontSize: number } {
    return {
        fill,
        fontSize: getChartAxisFontSizePx()
    }
}

export function resolveTablePdfBodyStyles(): { fontSize: number; cellPadding: number } {
    return {
        fontSize: getTablePdfFontSizePx(),
        cellPadding: 4
    }
}
