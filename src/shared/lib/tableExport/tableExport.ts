// Утилита экспорта табличных данных в разные форматы.
// Сейчас поддерживаются:
//  - CSV (без зависимостей);
//  - PDF (через jsPDF + jspdf-autotable).

import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

export type TableExportFormat = 'pdf' | 'csv'

export interface TableExportOptions {
    columns: string[]
    rows: Array<Array<string | number | boolean | null | undefined>>
    fileBaseName: string
    format: TableExportFormat
}

/**
 * Простая нормализация имени файла:
 * - убираем потенциально проблемные символы;
 * - режем слишком длинные варианты.
 */
function sanitizeFileName(raw: string): string {
    const fallback = 'table'
    const base = (raw || fallback).trim()
    const trimmed = base.slice(0, 80)
    // Разрешаем буквы, цифры, дефис, подчёркивание и точку.
    return trimmed.replace(/[^a-zA-Z0-9._-]+/g, '_') || fallback
}

/**
 * Скачивание произвольного Blob как файла.
 * Универсальный helper, чтобы не дублировать логику.
 */
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

/**
 * Преобразование таблицы в CSV-строку.
 * Здесь можно легко поменять разделитель (',' или ';').
 * Для русскоязычных Excel/LibreOffice часто удобнее ';'.
 */
function toCsv(columns: string[], rows: Array<Array<unknown>>, separator: string = ';'): string {
    const escapeCell = (value: unknown): string => {
        if (value === null || value === undefined) {
            return ''
        }

        const str = String(value)
        // Экранируем кавычки по стандарту CSV: "" → """
        const escaped = str.replace(/"/g, '""')
        // Всегда оборачиваем в кавычки, чтобы спокойно жить с разделителями и переносами строк.
        return `"${escaped}"`
    }

    const headerLine = columns.map(col => escapeCell(col)).join(separator)
    const dataLines = rows.map(row => row.map(cell => escapeCell(cell)).join(separator))

    // Добавляем BOM, чтобы Excel/LibreOffice корректно понимали UTF-8.
    const content = [headerLine, ...dataLines].join('\r\n')
    return '\uFEFF' + content
}

/**
 * Экспорт таблицы в CSV-файл.
 */
function exportCsv(columns: string[], rows: Array<Array<unknown>>, fileBaseName: string): void {
    const csv = toCsv(columns, rows)
    const fileName = `${sanitizeFileName(fileBaseName)}.csv`
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })

    downloadBlob(blob, fileName)
}

/**
 * Экспорт таблицы в PDF через jsPDF + jspdf-autotable.
 * Это даёт более-менее аккуратную табличную верстку "как в отчёте".
 */
function exportPdf(columns: string[], rows: Array<Array<unknown>>, fileBaseName: string): void {
    // Преобразуем всё в строки заранее, чтобы не ломать автотаблицу.
    const head = [columns.map(col => (col ?? '').toString())]
    const body = rows.map(row => row.map(cell => (cell ?? '').toString()))

    const doc = new jsPDF({
        orientation: 'landscape', // широкой таблице обычно так удобнее
        unit: 'pt',
        format: 'a4'
    })

    const title = sanitizeFileName(fileBaseName) || 'Table'
    doc.setFontSize(12)
    doc.text(title, 40, 30)

    // @ts-ignore - типы автотаблиц зависят от версии пакета
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

/**
 * Внешняя точка входа: экспортирует таблицу в указанный формат.
 * Если формат неизвестен, можно расширить логику (xlsx и т.п.).
 */
export function exportTable(options: TableExportOptions): void {
    const { columns, rows, fileBaseName, format } = options

    // Нормализуем строки/колонки на всякий случай.
    const safeColumns = (columns ?? []).map(col => col ?? '')
    const safeRows = (rows ?? []).map(row => row ?? [])

    if (format === 'csv') {
        exportCsv(safeColumns, safeRows, fileBaseName)
        return
    }

    if (format === 'pdf') {
        exportPdf(safeColumns, safeRows, fileBaseName)
        return
    }

    // На будущее: сюда можно добавить другие форматы (xlsx и т.д.).
    // Пока просто fallback в CSV.
    exportCsv(safeColumns, safeRows, fileBaseName)
}
