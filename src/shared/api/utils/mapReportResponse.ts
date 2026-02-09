import type { ReportDocumentDto, ReportSectionDto } from '@/shared/types/report.types'

export function mapReportResponse(response: unknown): ReportDocumentDto {
    const raw: any = response
    const sections: ReportSectionDto[] = []

    const toStringOrThrow = (value: unknown, label: string): string => {
        if (value === null || typeof value === 'undefined') {
            throw new Error(`[ui] Missing report field (${label}).`)
        }
        return String(value)
    }
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
            sections.push({
                title: toStringOrThrow(tbl?.title, 'TableSection.title'),
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
                    :   []
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

