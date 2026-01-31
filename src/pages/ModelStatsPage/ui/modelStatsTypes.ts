import type { KeyValueSectionDto, ReportSectionDto, TableSectionDto } from '@/shared/types/report.types'
import type { useModelStatsReportQuery } from '@/shared/api/tanstackQueries/modelStats'

// className прокидывается в корневой контейнер ModelStatsPageInner.
export interface ModelStatsPageProps {
    className?: string
}

/*
	Пропсы карточки таблицы.

	- Определяет входные данные для рендера одной table-секции.

	Контракты:
		- domId используется для якоря (hash/scroll) и aria-labelledby.
*/
export interface ModelStatsTableCardProps {
    section: TableSectionDto
    domId: string
}

/*
	Режимы визуализации отчёта.

	- Разделяет агрегированные (business) и диагностические (technical) представления.
*/
export type ViewMode = 'business' | 'technical'

/*
	Пропсы переключателя режима отчёта (business/technical).

	Контракты:
		- onChange должен быть идемпотентным.
*/
export interface ModelStatsModeToggleProps {
    mode: ViewMode
    onChange: (mode: ViewMode) => void
}

/*
	Ключи сегментов данных.

	- Служат базой для фильтрации секций отчёта и подписей в UI.
*/
export type SegmentKey = 'OOS' | 'TRAIN' | 'FULL' | 'RECENT'

/*
	Описание сегмента, извлекаемое из заголовка секции.

	Контракты:
		- prefix должен совпадать с префиксом, который генерирует отчёт.
*/
export interface SegmentInfo {
    key: SegmentKey
    prefix: string
}

/*
	Глобальные метаданные прогона из key-value секции отчёта.

	Контракты:
		- Числа приходят строками и парсятся безопасно.
*/
export interface GlobalMeta {
    runKind: string
    hasOos: boolean
    trainRecordsCount: number
    oosRecordsCount: number
    totalRecordsCount: number
    recentDays: number
    recentRecordsCount: number
}

/*
	Подпись и описание сегмента для UI.
*/
export interface ResolvedSegmentMeta {
    label: string
    description: string
}

/*
	Пропсы сегментного переключателя.

	- segments уже отсортирован под UI.
*/
export interface SegmentToggleProps {
    segments: SegmentInfo[]
    value: SegmentKey | null
    onChange: (segment: SegmentKey) => void
}

/*
	Тип данных отчёта статистики моделей, получаемый из хука.
*/
export type ModelStatsReport = NonNullable<ReturnType<typeof useModelStatsReportQuery>['data']>

/*
	Пропсы внутреннего компонента страницы.

	Контракты:
		- data должен быть валидным и не null.
*/
export interface ModelStatsPageInnerProps {
    className?: string
    data: ModelStatsReport
}

/*
	Псевдонимы DTO для type-guards.

	- Упрощают импорты в utils, где нужны специализации DTO.
*/
export type ReportSection = ReportSectionDto
export type KeyValueSection = KeyValueSectionDto
export type TableSection = TableSectionDto
