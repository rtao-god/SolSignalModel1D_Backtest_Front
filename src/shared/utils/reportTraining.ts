import type { KeyValueSectionDto, ReportDocumentDto, ReportSectionDto } from '@/shared/types/report.types'
const TRAINING_ITEM_KEY = 'training_scope_range'

function isKeyValueSection(section: ReportSectionDto): section is KeyValueSectionDto {
    return Array.isArray((section as KeyValueSectionDto).items)
}
export function resolveTrainingLabel(report: ReportDocumentDto | null | undefined): string | null {
    if (!report || !Array.isArray(report.sections)) {
        return null
    }

    for (const section of report.sections) {
        if (!isKeyValueSection(section)) continue
        const items = section.items ?? []
        for (const item of items) {
            if (item?.itemKey === TRAINING_ITEM_KEY) {
                return String(item.value ?? '')
            }
        }
    }

    return null
}
