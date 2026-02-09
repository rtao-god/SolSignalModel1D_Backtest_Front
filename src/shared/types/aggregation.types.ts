export type UtcDayKeyDto =
    | string
    | {
          DayNumber?: number
          dayNumber?: number
          IsoDate?: string
          isoDate?: string
          Value?: string
          value?: string
          Year?: number
          year?: number
          Month?: number
          month?: number
          Day?: number
          day?: number
      }
export interface Prob3Dto {
    Up: number
    Flat: number
    Down: number
    Sum?: number
}
export interface AggregationLayerAvgDto {
    PUp: number
    PFlat: number
    PDown: number
    Sum: number
}

export type DayDirectionLabelDto = number | 'Down' | 'Flat' | 'Up'
export interface AggregationProbsDebugRowDto {
    DateUtc: UtcDayKeyDto
    TrueLabel: DayDirectionLabelDto
    PredDay: DayDirectionLabelDto
    PredDayMicro: DayDirectionLabelDto
    PredTotal: DayDirectionLabelDto
    PDay: Prob3Dto
    PDayMicro: Prob3Dto
    PTotal: Prob3Dto
    MicroUsed: boolean
    SlUsed: boolean
    MicroAgree: boolean
    SlPenLong: boolean
    SlPenShort: boolean
}
export interface AggregationProbsSegmentSnapshotDto {
    SegmentName: string
    SegmentLabel: string
    FromDateUtc: UtcDayKeyDto | null
    ToDateUtc: UtcDayKeyDto | null
    RecordsCount: number
    Day: AggregationLayerAvgDto
    DayMicro: AggregationLayerAvgDto
    Total: AggregationLayerAvgDto
    AvgConfDay: number
    AvgConfMicro: number
    RecordsWithSlScore: number
}
export interface AggregationProbsSnapshotDto {
    MinDateUtc: UtcDayKeyDto
    MaxDateUtc: UtcDayKeyDto
    TotalInputRecords: number
    ExcludedCount: number
    Segments: AggregationProbsSegmentSnapshotDto[]
    DebugLastDays: AggregationProbsDebugRowDto[]
}
export interface LayerMetricsSnapshotDto {
    LayerName: string
    Confusion: number[][]
    N: number
    Correct: number
    Accuracy: number
    MicroF1: number
    LogLoss: number
    InvalidForLogLoss: number
    ValidForLogLoss: number
}
export interface AggregationMetricsSegmentSnapshotDto {
    SegmentName: string
    SegmentLabel: string
    FromDateUtc: UtcDayKeyDto | null
    ToDateUtc: UtcDayKeyDto | null
    RecordsCount: number
    Day: LayerMetricsSnapshotDto
    DayMicro: LayerMetricsSnapshotDto
    Total: LayerMetricsSnapshotDto
}
export interface AggregationMetricsSnapshotDto {
    TotalInputRecords: number
    ExcludedCount: number
    Segments: AggregationMetricsSegmentSnapshotDto[]
}
