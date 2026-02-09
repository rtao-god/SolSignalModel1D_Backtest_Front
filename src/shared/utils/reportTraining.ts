import type { KeyValueSectionDto, ReportDocumentDto, ReportSectionDto } from '@/shared/types/report.types'
const TRAINING_KEY = 'Обучение моделей (диапазон)'
const LEGACY_TRAINING_KEY = 'Обучение моделей (диапазон train)'

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
            if (item?.key === TRAINING_KEY || item?.key === LEGACY_TRAINING_KEY) {
                return String(item.value ?? '')
            }
        }
    }

    return null
}
