export type TableExportFormat = 'pdf' | 'csv'

export interface TableExportOptions {
    columns: string[]
    rows: Array<Array<string | number | boolean | null | undefined>>
    fileBaseName: string
    format: TableExportFormat
}

type JsPdfConstructor = typeof import('jspdf').default
type AutoTableFunction = typeof import('jspdf-autotable').default

interface PdfExportDependencies {
    jsPDF: JsPdfConstructor
    autoTable: AutoTableFunction
}

let pdfExportDependenciesPromise: Promise<PdfExportDependencies> | null = null

async function loadPdfExportDependencies(): Promise<PdfExportDependencies> {
    if (!pdfExportDependenciesPromise) {
        pdfExportDependenciesPromise = Promise.all([import('jspdf'), import('jspdf-autotable')]).then(
            ([jspdfModule, autoTableModule]) => ({
                jsPDF: jspdfModule.default,
                autoTable: autoTableModule.default
            })
        )
    }

    return pdfExportDependenciesPromise
}

function sanitizeFileName(raw: string): string {
    const fallback = 'table'
    const base = (raw || fallback).trim()
    const trimmed = base.slice(0, 80)
    return trimmed.replace(/[^a-zA-Z0-9._-]+/g, '_') || fallback
}

function downloadBlob(blob: Blob, fileNameWithExt: string): void {
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')

    link.href = url
    link.download = fileNameWithExt
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    URL.revokeObjectURL(url)
}

function toCsv(columns: string[], rows: Array<Array<unknown>>, separator: string = ';'): string {
    const escapeCell = (value: unknown): string => {
        if (value === null || value === undefined) {
            return ''
        }

        const str = String(value)
        const escaped = str.replace(/"/g, '""')
        return `"${escaped}"`
    }

    const headerLine = columns.map(col => escapeCell(col)).join(separator)
    const dataLines = rows.map(row => row.map(cell => escapeCell(cell)).join(separator))
    const content = [headerLine, ...dataLines].join('\r\n')
    return '\uFEFF' + content
}
function exportCsv(columns: string[], rows: Array<Array<unknown>>, fileBaseName: string): void {
    const csv = toCsv(columns, rows)
    const fileName = `${sanitizeFileName(fileBaseName)}.csv`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })

    downloadBlob(blob, fileName)
}

async function exportPdf(columns: string[], rows: Array<Array<unknown>>, fileBaseName: string): Promise<void> {
    const { jsPDF, autoTable } = await loadPdfExportDependencies()
    const head = [columns.map(col => (col ?? '').toString())]
    const body = rows.map(row => row.map(cell => (cell ?? '').toString()))

    const doc = new jsPDF({
        orientation: 'landscape', // Широкой таблице обычно так удобнее.
        unit: 'pt',
        format: 'a4'
    })

    const title = sanitizeFileName(fileBaseName) || 'Table'
    doc.setFontSize(12)
    doc.text(title, 40, 30)

    // @ts-ignore - типы автотаблиц зависят от версии пакета.
    autoTable(doc, {
        head,
        body,
        startY: 50,
        theme: 'grid',
        styles: {
            fontSize: 8,
            cellPadding: 4
        },
        headStyles: {
            fillColor: [30, 30, 40]
        }
    })

    const fileName = `${sanitizeFileName(fileBaseName)}.pdf`
    doc.save(fileName)
}

export async function exportTable(options: TableExportOptions): Promise<void> {
    const { columns, rows, fileBaseName, format } = options
    const safeColumns = (columns ?? []).map(col => col ?? '')
    const safeRows = (rows ?? []).map(row => row ?? [])

    if (format === 'csv') {
        exportCsv(safeColumns, safeRows, fileBaseName)
        return
    }

    if (format === 'pdf') {
        await exportPdf(safeColumns, safeRows, fileBaseName)
        return
    }

    exportCsv(safeColumns, safeRows, fileBaseName)
}
