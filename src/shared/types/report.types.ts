export interface BaseSectionDto {
    title: string
    sectionType?: string
    [key: string]: unknown
}
export interface KeyValueItemDto {
    key: string
    value: string
}
export interface KeyValueSectionDto extends BaseSectionDto {
    items?: KeyValueItemDto[]
}
export interface TableSectionDto extends BaseSectionDto {
    title: string
    detailLevel?: TableDetailLevel
    columns?: string[]
    rows?: string[][]
}
export type ReportSectionDto = KeyValueSectionDto | TableSectionDto
export interface ReportDocumentDto {
    id: string
    kind: string
    title: string
    generatedAtUtc: string // DateTime → ISO-строка.
    sections: ReportSectionDto[]
}

export type TableDetailLevel = 'simple' | 'technical';

