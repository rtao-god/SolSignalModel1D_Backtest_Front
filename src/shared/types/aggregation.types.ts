/*
	aggregation.types — DTO для агрегации вероятностей и метрик.

	Зачем:
		- Описывает контракт снапшотов AggregationProbsSnapshot и AggregationMetricsSnapshot.
*/

// Поддержка разных форм сериализации UtcDayKey (string или объект с полями).
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

// Тройка вероятностей (up/flat/down) из Prob3.
export interface Prob3Dto {
    Up: number
    Flat: number
    Down: number
    Sum?: number
}

// Средние вероятности слоя (AggregationLayerAvg).
export interface AggregationLayerAvgDto {
    PUp: number
    PFlat: number
    PDown: number
    Sum: number
}

export type DayDirectionLabelDto = number | 'Down' | 'Flat' | 'Up'

// Одна строка для debug-таблицы последних дней.
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

// Снапшот одного сегмента вероятностей.
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

// Снапшот агрегированных вероятностей.
export interface AggregationProbsSnapshotDto {
    MinDateUtc: UtcDayKeyDto
    MaxDateUtc: UtcDayKeyDto
    TotalInputRecords: number
    ExcludedCount: number
    Segments: AggregationProbsSegmentSnapshotDto[]
    DebugLastDays: AggregationProbsDebugRowDto[]
}

// Метрики слоя (accuracy, confusion и т.п.).
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

// Метрики одного сегмента (Train/OOS/Recent/Full).
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

// Снапшот агрегированных метрик.
export interface AggregationMetricsSnapshotDto {
    TotalInputRecords: number
    ExcludedCount: number
    Segments: AggregationMetricsSegmentSnapshotDto[]
}
