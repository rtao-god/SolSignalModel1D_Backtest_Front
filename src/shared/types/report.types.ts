export interface BaseSectionDto {
    title: string
    sectionKey?: string
    sectionType?: string
    [key: string]: unknown
}
export interface KeyValueItemDto {
    itemKey?: string
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
    columnKeys?: string[]
    rows?: string[][]
    metadata?: CapturedTableMetadataDto
}
export type ReportSectionDto = KeyValueSectionDto | TableSectionDto
export interface ReportDocumentDto {
    schemaVersion: number
    id: string
    kind: string
    title: string
    titleKey?: string
    generatedAtUtc: string // DateTime → ISO-строка.
    sections: ReportSectionDto[]
}

export type TableDetailLevel = 'simple' | 'technical'

export type CapturedTableKindDto = 'unknown' | 'policy-branch-mega' | 'top-trades'
export type CapturedMegaModeDto = 'with-sl' | 'no-sl'
export type CapturedMegaZonalModeDto = 'with-zonal' | 'without-zonal'
export type CapturedMegaMetricVariantDto = 'real' | 'no-biggest-liq-loss'
export type CapturedMegaBucketDto = 'daily' | 'intraday' | 'delayed' | 'total-aggregate'
export type CapturedMegaTpSlModeDto = 'all' | 'dynamic' | 'static'

export interface CapturedTableMetadataDto {
    kind: CapturedTableKindDto
    mode?: CapturedMegaModeDto
    tpSlMode?: CapturedMegaTpSlModeDto
    zonalMode?: CapturedMegaZonalModeDto
    metricVariant?: CapturedMegaMetricVariantDto
    bucket?: CapturedMegaBucketDto
    part?: number
}
