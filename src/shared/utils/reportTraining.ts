import type { KeyValueSectionDto, ReportDocumentDto, ReportSectionDto } from '@/shared/types/report.types'

/*
	reportTraining — извлечение метаданных об обучении моделей из ReportDocument.

	Зачем:
		- Достаёт строку обучения модели из key-value секций отчёта.
		- Поддерживает совместимость со старым и новым названием ключа.

	Контракты:
		- Бэкенд кладёт текст обучения в key-value секцию отчёта.
*/

// Новый ключ (обобщённый, без привязки к train).
const TRAINING_KEY = 'Обучение моделей (диапазон)'
// Старый ключ (оставляем для обратной совместимости).
const LEGACY_TRAINING_KEY = 'Обучение моделей (диапазон train)'

function isKeyValueSection(section: ReportSectionDto): section is KeyValueSectionDto {
    // Типовой guard на key-value секцию.
    return Array.isArray((section as KeyValueSectionDto).items)
}

// Возвращает строку обучения, если она есть в отчёте.
export function resolveTrainingLabel(report: ReportDocumentDto | null | undefined): string | null {
    // Нет отчёта или секций — нечего искать.
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
