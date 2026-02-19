import type {
    CapturedMegaBucketDto,
    CapturedMegaMetricVariantDto,
    CapturedMegaModeDto,
    CapturedMegaZonalModeDto,
    CapturedTableKindDto,
    CapturedTableMetadataDto,
    ReportDocumentDto,
    ReportSectionDto
} from '@/shared/types/report.types'

type PolicyBranchMegaMetadataMode = 'strict' | 'report-agnostic'

export interface MapReportResponseOptions {
    policyBranchMegaMetadataMode?: PolicyBranchMegaMetadataMode
}

function toStringOrThrow(value: unknown, label: string): string {
    if (value === null || typeof value === 'undefined') {
        throw new Error(`[ui] Missing report field (${label}).`)
    }
    return String(value)
}

function toObjectOrThrow(value: unknown, label: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`[ui] ${label} must be an object.`)
    }

    return value as Record<string, unknown>
}

function parseTableKindOrThrow(raw: unknown, label: string): CapturedTableKindDto {
    if (typeof raw === 'number') {
        if (raw === 0) return 'unknown'
        if (raw === 1) return 'policy-branch-mega'
        if (raw === 2) return 'top-trades'
    }

    if (typeof raw === 'string') {
        const normalized = raw.trim().toLowerCase()
        if (normalized === 'unknown') return 'unknown'
        if (normalized === 'policybranchmega' || normalized === 'policy_branch_mega') return 'policy-branch-mega'
        if (normalized === 'toptrades' || normalized === 'top_trades' || normalized === 'top-trades')
            return 'top-trades'
    }

    throw new Error(`[ui] ${label} has unsupported value: ${String(raw)}.`)
}

function parseMegaModeOrThrow(raw: unknown, label: string): CapturedMegaModeDto {
    if (typeof raw === 'number') {
        if (raw === 0) return 'with-sl'
        if (raw === 1) return 'no-sl'
    }

    if (typeof raw === 'string') {
        const normalized = raw.trim().toLowerCase()
        if (normalized === 'withsl' || normalized === 'with_sl' || normalized === 'with-sl') return 'with-sl'
        if (normalized === 'nosl' || normalized === 'no_sl' || normalized === 'no-sl') return 'no-sl'
    }

    throw new Error(`[ui] ${label} has unsupported value: ${String(raw)}.`)
}

function parseMegaZonalModeOrThrow(raw: unknown, label: string): CapturedMegaZonalModeDto {
    if (typeof raw === 'number') {
        if (raw === 0) return 'with-zonal'
        if (raw === 1) return 'without-zonal'
    }

    if (typeof raw === 'string') {
        const normalized = raw.trim().toLowerCase()
        if (normalized === 'withzonal' || normalized === 'with_zonal' || normalized === 'with-zonal') {
            return 'with-zonal'
        }
        if (
            normalized === 'withoutzonal' ||
            normalized === 'without_zonal' ||
            normalized === 'without-zonal'
        ) {
            return 'without-zonal'
        }
    }

    throw new Error(`[ui] ${label} has unsupported value: ${String(raw)}.`)
}

function parseMegaMetricVariantOrThrow(raw: unknown, label: string): CapturedMegaMetricVariantDto {
    if (typeof raw === 'number') {
        if (raw === 0) return 'real'
        if (raw === 1) return 'no-biggest-liq-loss'
    }

    if (typeof raw === 'string') {
        const normalized = raw.trim().toLowerCase()
        if (normalized === 'real') return 'real'
        if (
            normalized === 'nobiggestliqloss' ||
            normalized === 'no_biggest_liq_loss' ||
            normalized === 'no-biggest-liq-loss'
        ) {
            return 'no-biggest-liq-loss'
        }
    }

    throw new Error(`[ui] ${label} has unsupported value: ${String(raw)}.`)
}

function parseMegaBucketOrThrow(raw: unknown, label: string): CapturedMegaBucketDto {
    if (typeof raw === 'number') {
        if (raw === 0) return 'daily'
        if (raw === 1) return 'intraday'
        if (raw === 2) return 'delayed'
        if (raw === 3) return 'total-aggregate'
    }

    if (typeof raw === 'string') {
        const normalized = raw.trim().toLowerCase()
        if (normalized === 'daily') return 'daily'
        if (normalized === 'intraday') return 'intraday'
        if (normalized === 'delayed') return 'delayed'
        if (normalized === 'totalaggregate' || normalized === 'total_aggregate' || normalized === 'total-aggregate') {
            return 'total-aggregate'
        }
    }

    throw new Error(`[ui] ${label} has unsupported value: ${String(raw)}.`)
}

function parsePositiveIntOrThrow(raw: unknown, label: string): number {
    if (typeof raw === 'number' && Number.isFinite(raw) && Number.isInteger(raw) && raw > 0) {
        return raw
    }

    if (typeof raw === 'string') {
        const normalized = raw.trim()
        if (normalized.length > 0) {
            const parsed = Number(normalized)
            if (Number.isFinite(parsed) && Number.isInteger(parsed) && parsed > 0) {
                return parsed
            }
        }
    }

    throw new Error(`[ui] ${label} must be a positive integer. value=${String(raw)}.`)
}

function resolvePolicyBranchMegaMetadataMode(options?: MapReportResponseOptions): PolicyBranchMegaMetadataMode {
    return options?.policyBranchMegaMetadataMode ?? 'report-agnostic'
}

function mapTableMetadataOrThrow(
    raw: unknown,
    tableTitle: string,
    options?: MapReportResponseOptions
): CapturedTableMetadataDto | undefined {
    if (raw === null || typeof raw === 'undefined') {
        return undefined
    }

    const policyMegaMetadataMode = resolvePolicyBranchMegaMetadataMode(options)
    const payload = toObjectOrThrow(raw, `TableSection.metadata (${tableTitle})`)
    const kind = parseTableKindOrThrow(payload.kind, `TableSection.metadata.kind (${tableTitle})`)

    const metadata: CapturedTableMetadataDto = {
        kind
    }

    if (kind !== 'policy-branch-mega') {
        return metadata
    }

    const isStrict = policyMegaMetadataMode === 'strict'
    const modeLabel = `TableSection.metadata.mode (${tableTitle})`
    const zonalModeLabel = `TableSection.metadata.zonalMode (${tableTitle})`
    const metricVariantLabel = `TableSection.metadata.metricVariant (${tableTitle})`
    const bucketLabel = `TableSection.metadata.bucket (${tableTitle})`
    const partLabel = `TableSection.metadata.part (${tableTitle})`

    // В report-agnostic режиме допускаем legacy policy-branch-metadata без zonal-полей,
    // чтобы нерелевантные страницы (например day-stats) не падали из-за чужих секций.
    // Для policy_branch_mega endpoint включается strict-режим и эти поля обязательны.
    if (payload.mode !== null && typeof payload.mode !== 'undefined') {
        metadata.mode = parseMegaModeOrThrow(payload.mode, modeLabel)
    } else if (isStrict) {
        throw new Error(`[ui] ${modeLabel} is missing.`)
    }

    if (payload.zonalMode !== null && typeof payload.zonalMode !== 'undefined') {
        metadata.zonalMode = parseMegaZonalModeOrThrow(payload.zonalMode, zonalModeLabel)
    } else if (isStrict) {
        throw new Error(`[ui] ${zonalModeLabel} is missing.`)
    }

    if (payload.metricVariant !== null && typeof payload.metricVariant !== 'undefined') {
        metadata.metricVariant = parseMegaMetricVariantOrThrow(payload.metricVariant, metricVariantLabel)
    } else if (isStrict) {
        throw new Error(`[ui] ${metricVariantLabel} is missing.`)
    }

    if (payload.bucket !== null && typeof payload.bucket !== 'undefined') {
        metadata.bucket = parseMegaBucketOrThrow(payload.bucket, bucketLabel)
    } else if (isStrict) {
        throw new Error(`[ui] ${bucketLabel} is missing.`)
    }

    if (payload.part !== null && typeof payload.part !== 'undefined') {
        metadata.part = parsePositiveIntOrThrow(payload.part, partLabel)
    } else if (isStrict) {
        throw new Error(`[ui] ${partLabel} is missing.`)
    }

    return metadata
}

export function mapReportResponseWithOptions(response: unknown, options?: MapReportResponseOptions): ReportDocumentDto {
    const raw: any = response
    const sections: ReportSectionDto[] = []

    if (Array.isArray(raw?.keyValueSections)) {
        for (const kv of raw.keyValueSections) {
            sections.push({
                title: toStringOrThrow(kv?.title, 'KeyValueSection.title'),
                items:
                    Array.isArray(kv?.items) ?
                        kv.items.map((it: any) => ({
                            key: toStringOrThrow(it?.key, 'KeyValueSection.item.key'),
                            value: toStringOrThrow(it?.value, 'KeyValueSection.item.value')
                        }))
                    :   []
            })
        }
    }

    if (Array.isArray(raw?.tableSections)) {
        for (const tbl of raw.tableSections) {
            const title = toStringOrThrow(tbl?.title, 'TableSection.title')

            sections.push({
                title,
                columns: Array.isArray(tbl?.columns)
                    ? tbl.columns.map((c: any, idx: number) => toStringOrThrow(c, `TableSection.columns[${idx}]`))
                    : [],
                rows:
                    Array.isArray(tbl?.rows) ?
                        tbl.rows.map((row: any) =>
                            Array.isArray(row)
                                ? row.map((cell: any, idx: number) =>
                                      toStringOrThrow(cell, `TableSection.row.cell[${idx}]`)
                                  )
                                : []
                        )
                    : [],
                metadata: mapTableMetadataOrThrow(tbl?.metadata, title, options)
            })
        }
    }

    return {
        id: toStringOrThrow(raw?.id, 'Report.id'),
        kind: toStringOrThrow(raw?.kind, 'Report.kind'),
        title: toStringOrThrow(raw?.title, 'Report.title'),
        generatedAtUtc: toStringOrThrow(raw?.generatedAtUtc, 'Report.generatedAtUtc'),
        sections
    }
}

export function mapReportResponse(response: unknown): ReportDocumentDto {
    return mapReportResponseWithOptions(response, { policyBranchMegaMetadataMode: 'report-agnostic' })
}
