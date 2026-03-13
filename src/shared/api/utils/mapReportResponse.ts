import type {
    CapturedMegaBucketDto,
    CapturedMegaMetricVariantDto,
    CapturedMegaModeDto,
    CapturedMegaTpSlModeDto,
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

function toString(value: unknown, label: string): string {
    if (value === null || typeof value === 'undefined') {
        throw new Error(`[ui] Missing report field (${label}).`)
    }
    return String(value)
}

function toOptionalStringOrUndefined(value: unknown): string | undefined {
    if (value === null || typeof value === 'undefined') {
        return undefined
    }

    const normalized = String(value).trim()
    return normalized.length > 0 ? normalized : undefined
}

function toObject(value: unknown, label: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`[ui] ${label} must be an object.`)
    }

    return value as Record<string, unknown>
}

function parseTableKind(raw: unknown, label: string): CapturedTableKindDto {
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

function parseMegaMode(raw: unknown, label: string): CapturedMegaModeDto {
    if (typeof raw === 'number') {
        if (raw === 0) return 'with-sl'
        if (raw === 1) return 'no-sl'
        if (raw === 2) return 'all'
    }

    if (typeof raw === 'string') {
        const normalized = raw.trim().toLowerCase()
        if (normalized === 'all') return 'all'
        if (normalized === 'withsl' || normalized === 'with_sl' || normalized === 'with-sl') return 'with-sl'
        if (normalized === 'nosl' || normalized === 'no_sl' || normalized === 'no-sl') return 'no-sl'
    }

    throw new Error(`[ui] ${label} has unsupported value: ${String(raw)}.`)
}

function parseMegaTpSlMode(raw: unknown, label: string): CapturedMegaTpSlModeDto {
    if (typeof raw === 'number') {
        if (raw === 0) return 'all'
        if (raw === 1) return 'dynamic'
        if (raw === 2) return 'static'
    }

    if (typeof raw === 'string') {
        const normalized = raw.trim().toLowerCase()
        if (normalized === 'all') return 'all'
        if (normalized === 'dynamic') return 'dynamic'
        if (normalized === 'static') return 'static'
    }

    throw new Error(`[ui] ${label} has unsupported value: ${String(raw)}.`)
}

function parseMegaZonalMode(raw: unknown, label: string): CapturedMegaZonalModeDto {
    if (typeof raw === 'number') {
        if (raw === 0) return 'with-zonal'
        if (raw === 1) return 'without-zonal'
    }

    if (typeof raw === 'string') {
        const normalized = raw.trim().toLowerCase()
        if (normalized === 'withzonal' || normalized === 'with_zonal' || normalized === 'with-zonal') {
            return 'with-zonal'
        }
        if (normalized === 'withoutzonal' || normalized === 'without_zonal' || normalized === 'without-zonal') {
            return 'without-zonal'
        }
    }

    throw new Error(`[ui] ${label} has unsupported value: ${String(raw)}.`)
}

function parseMegaMetricVariant(raw: unknown, label: string): CapturedMegaMetricVariantDto {
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

function parseMegaBucket(raw: unknown, label: string): CapturedMegaBucketDto {
    if (typeof raw === 'number') {
        if (raw === 0) return 'daily'
        if (raw === 1) return 'intraday'
        if (raw === 2) return 'delayed'
        if (raw === 3) return 'total-aggregate'
        if (raw === 4) return 'total'
    }

    if (typeof raw === 'string') {
        const normalized = raw.trim().toLowerCase()
        if (normalized === 'daily') return 'daily'
        if (normalized === 'intraday') return 'intraday'
        if (normalized === 'delayed') return 'delayed'
        if (normalized === 'totalcombined' || normalized === 'total_combined' || normalized === 'total-combined') {
            return 'total'
        }
        if (normalized === 'total') return 'total'
        if (normalized === 'totalaggregate' || normalized === 'total_aggregate' || normalized === 'total-aggregate') {
            return 'total-aggregate'
        }
    }

    throw new Error(`[ui] ${label} has unsupported value: ${String(raw)}.`)
}

function parsePositiveInt(raw: unknown, label: string): number {
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

function mapTableMetadata(
    raw: unknown,
    tableTitle: string,
    options?: MapReportResponseOptions
): CapturedTableMetadataDto | undefined {
    if (raw === null || typeof raw === 'undefined') {
        return undefined
    }

    const policyMegaMetadataMode = resolvePolicyBranchMegaMetadataMode(options)
    const payload = toObject(raw, `TableSection.metadata (${tableTitle})`)
    const kind = parseTableKind(payload.kind, `TableSection.metadata.kind (${tableTitle})`)

    const metadata: CapturedTableMetadataDto = {
        kind
    }

    const isStrict = policyMegaMetadataMode === 'strict'
    const modeLabel = `TableSection.metadata.mode (${tableTitle})`
    const tpSlModeLabel = `TableSection.metadata.tpSlMode (${tableTitle})`
    const zonalModeLabel = `TableSection.metadata.zonalMode (${tableTitle})`
    const metricVariantLabel = `TableSection.metadata.metricVariant (${tableTitle})`
    const bucketLabel = `TableSection.metadata.bucket (${tableTitle})`
    const partLabel = `TableSection.metadata.part (${tableTitle})`

    if (payload.mode !== null && typeof payload.mode !== 'undefined') {
        metadata.mode = parseMegaMode(payload.mode, modeLabel)
    } else if (isStrict && kind === 'policy-branch-mega') {
        throw new Error(`[ui] ${modeLabel} is missing.`)
    }

    if (payload.tpSlMode !== null && typeof payload.tpSlMode !== 'undefined') {
        metadata.tpSlMode = parseMegaTpSlMode(payload.tpSlMode, tpSlModeLabel)
    } else if (isStrict && kind === 'policy-branch-mega') {
        throw new Error(`[ui] ${tpSlModeLabel} is missing.`)
    }

    if (payload.zonalMode !== null && typeof payload.zonalMode !== 'undefined') {
        metadata.zonalMode = parseMegaZonalMode(payload.zonalMode, zonalModeLabel)
    } else if (isStrict && kind === 'policy-branch-mega') {
        throw new Error(`[ui] ${zonalModeLabel} is missing.`)
    }

    if (payload.metricVariant !== null && typeof payload.metricVariant !== 'undefined') {
        metadata.metricVariant = parseMegaMetricVariant(payload.metricVariant, metricVariantLabel)
    } else if (isStrict && kind === 'policy-branch-mega') {
        throw new Error(`[ui] ${metricVariantLabel} is missing.`)
    }

    if (payload.bucket !== null && typeof payload.bucket !== 'undefined') {
        metadata.bucket = parseMegaBucket(payload.bucket, bucketLabel)
    } else if (isStrict && kind === 'policy-branch-mega') {
        throw new Error(`[ui] ${bucketLabel} is missing.`)
    }

    if (payload.part !== null && typeof payload.part !== 'undefined') {
        metadata.part = parsePositiveInt(payload.part, partLabel)
    } else if (isStrict && kind === 'policy-branch-mega') {
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
                sectionKey: toOptionalStringOrUndefined(kv?.sectionKey),
                title: toString(kv?.title, 'KeyValueSection.title'),
                items:
                    Array.isArray(kv?.items) ?
                        kv.items.map((it: any) => ({
                            itemKey: toOptionalStringOrUndefined(it?.itemKey),
                            key: toString(it?.key, 'KeyValueSection.item.key'),
                            value: toString(it?.value, 'KeyValueSection.item.value')
                        }))
                    :   []
            })
        }
    }

    if (Array.isArray(raw?.tableSections)) {
        for (const tbl of raw.tableSections) {
            const title = toString(tbl?.title, 'TableSection.title')

            sections.push({
                sectionKey: toOptionalStringOrUndefined(tbl?.sectionKey),
                title,
                columns:
                    Array.isArray(tbl?.columns) ?
                        tbl.columns.map((c: any, idx: number) => toString(c, `TableSection.columns[${idx}]`))
                    :   [],
                columnKeys:
                    Array.isArray(tbl?.columnKeys) ?
                        tbl.columnKeys.map((key: any, idx: number) => toString(key, `TableSection.columnKeys[${idx}]`))
                    :   undefined,
                rows:
                    Array.isArray(tbl?.rows) ?
                        tbl.rows.map((row: any) =>
                            Array.isArray(row) ?
                                row.map((cell: any, idx: number) => toString(cell, `TableSection.row.cell[${idx}]`))
                            :   []
                        )
                    :   [],
                metadata: mapTableMetadata(tbl?.metadata, title, options)
            })
        }
    }

    return {
        schemaVersion: parsePositiveInt(raw?.schemaVersion, 'Report.schemaVersion'),
        id: toString(raw?.id, 'Report.id'),
        kind: toString(raw?.kind, 'Report.kind'),
        title: toString(raw?.title, 'Report.title'),
        titleKey: toOptionalStringOrUndefined(raw?.titleKey),
        generatedAtUtc: toString(raw?.generatedAtUtc, 'Report.generatedAtUtc'),
        sections
    }
}

export function mapReportResponse(response: unknown): ReportDocumentDto {
    return mapReportResponseWithOptions(response, { policyBranchMegaMetadataMode: 'report-agnostic' })
}
