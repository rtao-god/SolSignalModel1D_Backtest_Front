import type { CurrentPredictionTrainingScope } from '@/shared/api/endpoints/reportEndpoints'
import type { ReportDocumentDto } from '@/shared/types/report.types'

export type RealForecastJournalDayStatus = 'captured' | 'finalized'
export type RealForecastJournalDirection = 'UP' | 'FLAT' | 'DOWN'
export type RealForecastJournalPolicyBucket = 'daily' | 'intraday' | 'delayed'
export type RealForecastJournalMarginMode = 'cross' | 'isolated'

export interface RealForecastJournalProbabilityDto {
    up: number
    flat: number
    down: number
}

export interface RealForecastJournalActualDayDto {
    trueLabel: number
    entry: number
    maxHigh24: number
    minLow24: number
    close24: number
    minMove: number
}

export interface RealForecastJournalPolicyRowDto {
    policyName: string
    branch: string
    bucket: RealForecastJournalPolicyBucket
    margin: RealForecastJournalMarginMode | null
    isRiskDay: boolean
    hasDirection: boolean
    skipped: boolean
    direction: string
    leverage: number
    entry: number
    slPct: number | null
    tpPct: number | null
    slPrice: number | null
    tpPrice: number | null
    notionalUsd: number | null
    positionQty: number | null
    liqPrice: number | null
    liqDistPct: number | null
    bucketCapitalUsd: number | null
    stakeUsd: number | null
    stakePct: number | null
    exitPrice: number | null
    exitReason: string
    exitPnlPct: number | null
    trades: number | null
    totalPnlPct: number | null
    maxDdPct: number | null
    hadLiquidation: boolean | null
    withdrawnTotal: number | null
}

export interface RealForecastJournalSnapshotDto {
    generatedAtUtc: string
    predictionDateUtc: string
    asOfUtc: string
    dataCutoffUtc: string
    entryUtc: string
    exitUtc: string
    predLabel: number
    predLabelDisplay: string
    microDisplay: string
    pTotal: RealForecastJournalProbabilityDto
    confDay: number
    confMicro: number
    entry: number
    minMove: number
    reason: string
    previewNote: string | null
    actualDay: RealForecastJournalActualDayDto | null
    policyRows: RealForecastJournalPolicyRowDto[]
}

export interface RealForecastJournalIndicatorValueDto {
    key: string
    group: string
    label: string
    numericValue: number | null
    displayValue: string
    unit: string | null
}

export interface RealForecastJournalIndicatorSnapshotDto {
    phase: string
    anchorUtc: string
    featureBarOpenUtc: string
    featureBarCloseUtc: string
    indicatorDayUtc: string
    items: RealForecastJournalIndicatorValueDto[]
}

export interface RealForecastJournalFinalizeRecordDto {
    finalizedAtUtc: string
    forecastHash: string
    snapshot: RealForecastJournalSnapshotDto
    report: ReportDocumentDto
    endOfDayIndicators: RealForecastJournalIndicatorSnapshotDto
}

export interface RealForecastJournalDayRecordDto {
    id: string
    trainingScope: CurrentPredictionTrainingScope
    predictionDateUtc: string
    capturedAtUtc: string
    entryUtc: string
    exitUtc: string
    forecastHash: string
    forecastSnapshot: RealForecastJournalSnapshotDto
    forecastReport: ReportDocumentDto
    morningIndicators: RealForecastJournalIndicatorSnapshotDto
    finalize: RealForecastJournalFinalizeRecordDto | null
}

export interface RealForecastJournalDayListItemDto {
    id: string
    predictionDateUtc: string
    status: RealForecastJournalDayStatus
    trainingScope: CurrentPredictionTrainingScope
    capturedAtUtc: string
    entryUtc: string
    exitUtc: string
    finalizedAtUtc: string | null
    predLabelDisplay: string
    microDisplay: string
    totalUpProbability: number
    totalFlatProbability: number
    totalDownProbability: number
    dayConfidence: number
    microConfidence: number
    actualDirection: RealForecastJournalDirection | null
    directionMatched: boolean | null
}
