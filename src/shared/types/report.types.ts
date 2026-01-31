/*
	report.types — типы.

	Зачем:
		- Описывает DTO и доменные типы.
*/
// Базовый тип любой секции отчёта.
export interface BaseSectionDto {
    title: string
    // Если на бэке есть discriminator (SectionType/Kind) — сюда он приедет.
    sectionType?: string
    // Остальные поля, чтобы не падать при расширении модели.
    [key: string]: unknown
}

// Элемент "ключ-значение" в KeyValueSection.
export interface KeyValueItemDto {
    key: string
    value: string
}

// Секция "ключ-значение".
export interface KeyValueSectionDto extends BaseSectionDto {
    items?: KeyValueItemDto[]
}

// Табличная секция.
export interface TableSectionDto extends BaseSectionDto {
    title: string
    // Можно дополнительно ввести level, если решим добавить его на бэке.
    detailLevel?: TableDetailLevel
    columns?: string[]
    rows?: string[][]
}

// Объединённый тип секций.
export type ReportSectionDto = KeyValueSectionDto | TableSectionDto

// Корневой DTO для ReportDocument.
export interface ReportDocumentDto {
    id: string
    kind: string
    title: string
    generatedAtUtc: string // DateTime → ISO-строка.
    sections: ReportSectionDto[]
}

export type TableDetailLevel = 'simple' | 'technical';

