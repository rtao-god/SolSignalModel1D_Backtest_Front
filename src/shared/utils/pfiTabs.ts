import type { TableSectionDto } from '@/shared/types/report.types'

export interface PfiTabConfig {
    id: string
    label: string
    anchor: string
}

const PFI_TITLE_REGEX = /^PFI по фичам:\s*(.+?)(?:\s+thr=.*?)?(?:\s*\(AUC=.*?)?$/i

function extractModelLabelFromSectionTitle(title: string | null | undefined, index: number): string {
    if (!title) {
        return `Модель ${index + 1}`
    }

    const match = title.match(PFI_TITLE_REGEX)
    if (match && match[1]) {
        const normalized = match[1].trim()
        if (normalized.length > 0) {
            return normalized
        }
    }


    let working = title.replace(/^PFI по фичам:\s*/i, '').trim()
    const parenIdx = working.indexOf('(')
    if (parenIdx >= 0) {
        working = working.slice(0, parenIdx).trim()
    }

    if (!working) {
        return `Модель ${index + 1}`
    }

    return working
}

export function buildPfiTabsFromSections(sections: TableSectionDto[]): PfiTabConfig[] {
    return sections.map((section, index) => {
        const id = `pfi-model-${index + 1}`
        const anchor = id
        const label = extractModelLabelFromSectionTitle(section.title, index)

        return {
            id,
            label,
            anchor
        }
    })
}

