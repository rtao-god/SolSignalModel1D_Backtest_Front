import type { PolicyEvaluationDto } from './policyEvaluation.types'

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
    metadata?: CapturedTableMetadataDto
}
export interface TableSectionDto extends BaseSectionDto {
    title: string
    detailLevel?: TableDetailLevel
    columns?: string[]
    columnKeys?: string[]
    columnDescriptors?: ReportColumnDescriptorDto[]
    rows?: string[][]
    rowEvaluations?: Array<PolicyEvaluationDto | null>
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
export type CapturedMegaModeDto = 'all' | 'with-sl' | 'no-sl'
export type CapturedMegaZonalModeDto = 'with-zonal' | 'without-zonal'
export type CapturedMegaMetricVariantDto = 'real' | 'no-biggest-liq-loss'
export type CapturedMegaBucketDto = 'daily' | 'intraday' | 'delayed' | 'total' | 'total-aggregate'
export type CapturedMegaTpSlModeDto = 'all' | 'dynamic' | 'static'
export type BacktestHistorySliceDto = 'full_history' | 'train' | 'oos' | 'recent'

export interface CapturedTableMetadataDto {
    kind: CapturedTableKindDto
    historySlice?: BacktestHistorySliceDto
    mode?: CapturedMegaModeDto
    tpSlMode?: CapturedMegaTpSlModeDto
    zonalMode?: CapturedMegaZonalModeDto
    metricVariant?: CapturedMegaMetricVariantDto
    bucket?: CapturedMegaBucketDto
    part?: number
}

export interface ReportColumnDescriptorDto {
    columnKey: string
    displayLabel: string
    termKey: string
}
