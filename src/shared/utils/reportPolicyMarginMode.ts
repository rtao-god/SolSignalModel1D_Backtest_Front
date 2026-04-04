import type { ReportDocumentDto, ReportSectionDto, TableSectionDto } from '@/shared/types/report.types'
import { buildReportColumnContractDescriptors } from './reportColumnKeys'

const POLICY_COLUMN_KEYS = new Set(['policy_name', 'policy'])
const POLICY_COLUMN_TITLES = new Set(['policy', 'policyname', 'name'])
const MARGIN_COLUMN_KEYS = new Set(['margin_mode', 'margin'])
const MARGIN_COLUMN_TITLES = new Set(['margin', 'marginmode', 'margin mode'])

// В пользовательской таблице имя policy уже раскрывает режим маржи,
// если в этой строке явно есть Cross или Isolated.
function normalizeTitleToken(value: string): string {
    return value.trim().toLowerCase()
}

function findColumnIndex(section: TableSectionDto, matcher: (key: string, label: string) => boolean): number {
    const columns = section.columns ?? []
    if (columns.length === 0) {
        return -1
    }

    const descriptors = buildReportColumnContractDescriptors(columns, section.columnKeys)
    return descriptors.findIndex(descriptor => matcher(descriptor.key.trim().toLowerCase(), normalizeTitleToken(descriptor.label)))
}

function normalizeMarginModeToken(value: unknown): 'cross' | 'isolated' | null {
    if (typeof value !== 'string') {
        return null
    }

    const normalized = value.trim().toLowerCase()
    if (normalized === 'cross') return 'cross'
    if (normalized === 'isolated') return 'isolated'
    return null
}

function policyNameAlreadyShowsMarginMode(policyName: unknown, marginMode: 'cross' | 'isolated'): boolean {
    if (typeof policyName !== 'string') {
        return false
    }

    return policyName.toLowerCase().includes(marginMode)
}

function normalizeDisplayToken(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null
    }

    const normalized = value.trim()
    return normalized.length > 0 ? normalized : null
}

function sectionHasDuplicatePolicyMarginColumn(
    section: TableSectionDto,
    policyColumnIndex: number,
    marginColumnIndex: number
): boolean {
    const rows = section.rows ?? []
    if (rows.length === 0) {
        return false
    }

    for (const row of rows) {
        if (!Array.isArray(row) || row.length <= Math.max(policyColumnIndex, marginColumnIndex)) {
            return false
        }

        const marginMode = normalizeMarginModeToken(row[marginColumnIndex])
        if (!marginMode || !policyNameAlreadyShowsMarginMode(row[policyColumnIndex], marginMode)) {
            return false
        }
    }

    return true
}

export function pruneDuplicatePolicyMarginColumn(section: TableSectionDto): TableSectionDto {
    const policyColumnIndex = findColumnIndex(
        section,
        (key, label) => POLICY_COLUMN_KEYS.has(key) || POLICY_COLUMN_TITLES.has(label)
    )
    const marginColumnIndex = findColumnIndex(
        section,
        (key, label) => MARGIN_COLUMN_KEYS.has(key) || MARGIN_COLUMN_TITLES.has(label)
    )

    if (
        policyColumnIndex < 0 ||
        marginColumnIndex < 0 ||
        policyColumnIndex === marginColumnIndex ||
        !sectionHasDuplicatePolicyMarginColumn(section, policyColumnIndex, marginColumnIndex)
    ) {
        return section
    }

    return {
        ...section,
        columns: (section.columns ?? []).filter((_, columnIndex) => columnIndex !== marginColumnIndex),
        columnKeys:
            Array.isArray(section.columnKeys) ?
                section.columnKeys.filter((_, columnIndex) => columnIndex !== marginColumnIndex)
            :   section.columnKeys,
        rows: (section.rows ?? []).map(row => row.filter((_, columnIndex) => columnIndex !== marginColumnIndex))
    }
}

export function buildPolicyDisplayLabel(input: {
    policyName: unknown
    branch?: unknown
    marginMode?: unknown
}): string | null {
    const policyName = normalizeDisplayToken(input.policyName)
    if (!policyName) {
        return null
    }

    const branch = normalizeDisplayToken(input.branch)
    const marginMode = normalizeDisplayToken(input.marginMode)
    const normalizedMarginMode = normalizeMarginModeToken(marginMode)
    const shouldShowMarginMode =
        marginMode !== null &&
        (!normalizedMarginMode || !policyNameAlreadyShowsMarginMode(policyName, normalizedMarginMode))

    return [policyName, branch, shouldShowMarginMode ? marginMode : null].filter(Boolean).join(' · ')
}

export function pruneDuplicatePolicyMarginColumns(sections: TableSectionDto[]): TableSectionDto[] {
    return sections.map(section => pruneDuplicatePolicyMarginColumn(section))
}

export function pruneDuplicatePolicyMarginColumnsInReportSections(sections: ReportSectionDto[]): ReportSectionDto[] {
    return sections.map(section => {
        const tableSection = section as TableSectionDto
        if (!Array.isArray(tableSection.columns) || !Array.isArray(tableSection.rows)) {
            return section
        }

        return pruneDuplicatePolicyMarginColumn(tableSection)
    })
}

export function pruneDuplicatePolicyMarginColumnsInReport(report: ReportDocumentDto): ReportDocumentDto {
    return {
        ...report,
        sections: pruneDuplicatePolicyMarginColumnsInReportSections(report.sections ?? [])
    }
}
