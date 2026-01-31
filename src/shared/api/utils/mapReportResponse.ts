import type { ReportDocumentDto, ReportSectionDto } from '@/shared/types/report.types'

/*
	mapReportResponse — утилита API.

	Зачем:
		- Подготавливает ответ или запрос в формате UI.
*/

/*
	Универсальный маппер ReportDocument (backend) → ReportDocumentDto (frontend).

	- Переиспользуется в current-prediction / backtest-summary / preview.
	- Не дублирует логику в каждом эндпоинте.
*/
export function mapReportResponse(response: unknown): ReportDocumentDto {
    const raw: any = response
    const sections: ReportSectionDto[] = []

    // KeyValue-секции.
    if (Array.isArray(raw?.keyValueSections)) {
        for (const kv of raw.keyValueSections) {
            sections.push({
                title: String(kv?.title ?? ''),
                items:
                    Array.isArray(kv?.items) ?
                        kv.items.map((it: any) => ({
                            key: String(it?.key ?? ''),
                            value: String(it?.value ?? '')
                        }))
                    :   []
            })
        }
    }

    // Табличные секции.
    if (Array.isArray(raw?.tableSections)) {
        for (const tbl of raw.tableSections) {
            sections.push({
                title: String(tbl?.title ?? ''),
                columns: Array.isArray(tbl?.columns) ? tbl.columns.map((c: any) => String(c ?? '')) : [],
                rows:
                    Array.isArray(tbl?.rows) ?
                        tbl.rows.map((row: any) =>
                            Array.isArray(row) ? row.map((cell: any) => String(cell ?? '')) : []
                        )
                    :   []
            })
        }
    }

    return {
        id: String(raw?.id ?? ''),
        kind: String(raw?.kind ?? ''),
        title: String(raw?.title ?? ''),
        generatedAtUtc: String(raw?.generatedAtUtc ?? ''),
        sections
    }
}

