import type { CurrentPredictionTrainingScope } from '@/shared/api/endpoints/reportEndpoints'
import type { PolicyPerformanceMetricsDto } from '@/shared/types/policyPerformanceMetrics.types'
import type { ReportDocumentDto } from '@/shared/types/report.types'

export type RealForecastJournalDayStatus =
    | 'scheduled'
    | 'captured'
    | 'finalized'
    | 'missed_capture'
    | 'recovered_exception'
export type RealForecastJournalRunKind = 'main' | 'preliminary'
export type RealForecastJournalDirection = 'UP' | 'FLAT' | 'DOWN'
export type RealForecastJournalPolicyBucket = 'daily' | 'intraday' | 'delayed'
export type RealForecastJournalMarginMode = 'cross' | 'isolated'
export type RealForecastJournalOpsHealthStatus = 'healthy' | 'degraded'
export type RealForecastJournalLiveRowStatus =
    | 'not-tracked'
    | 'open'
    | 'take-profit-hit'
    | 'stop-loss-hit'
    | 'liquidation-hit'
    | 'end-of-day'

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
    isSpotPolicy: boolean
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
    exitReason: string | null
    exitPnlPct: number | null
    performanceMetrics: PolicyPerformanceMetricsDto | null
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
    runKind: RealForecastJournalRunKind
    status: RealForecastJournalDayStatus
    trainingScope: CurrentPredictionTrainingScope
    predictionDateUtc: string
    capturedAtUtc: string | null
    entryUtc: string
    exitUtc: string
    forecastHash: string | null
    forecastSnapshot: RealForecastJournalSnapshotDto | null
    forecastReport: ReportDocumentDto | null
    sessionOpenIndicators: RealForecastJournalIndicatorSnapshotDto | null
    finalize: RealForecastJournalFinalizeRecordDto | null
}

export interface RealForecastJournalLiveRowObservationDto {
    rowKey: string
    policyName: string
    branch: string
    bucket: string
    status: RealForecastJournalLiveRowStatus
    eventTimeUtc: string | null
    eventPrice: number | null
    latestClosedMinuteOpenUtc: string | null
    observedHighPrice: number | null
    observedLowPrice: number | null
}

export interface RealForecastJournalLiveStatusDto {
    runKind: RealForecastJournalRunKind
    predictionDateUtc: string
    checkedAtUtc: string
    currentPrice: number
    currentPriceObservedAtUtc: string
    minuteObservationStartUtc: string
    minuteObservationThroughUtc: string
    rows: RealForecastJournalLiveRowObservationDto[]
}

export interface RealForecastJournalDayListItemDto {
    id: string
    runKind: RealForecastJournalRunKind
    predictionDateUtc: string
    status: RealForecastJournalDayStatus
    trainingScope: CurrentPredictionTrainingScope
    capturedAtUtc: string | null
    entryUtc: string
    exitUtc: string
    finalizedAtUtc: string | null
    predictedDirection: RealForecastJournalDirection | null
    predLabelDisplay: string | null
    microDisplay: string | null
    totalUpProbability: number | null
    totalFlatProbability: number | null
    totalDownProbability: number | null
    dayConfidence: number | null
    microConfidence: number | null
    actualDirection: RealForecastJournalDirection | null
    directionMatched: boolean | null
}

export interface RealForecastJournalOpsCheckpointDto {
    predictionDateUtc: string
    runKind: RealForecastJournalRunKind
    occurredAtUtc: string
}

/**
 * Runtime health journal worker-а и его ближайшие causal target-ы.
 * Контракт приходит с backend ops-status и остаётся каноничным источником NY/DST времени для UI-таймеров.
 */
export interface RealForecastJournalOpsStatusDto {
    runKind: RealForecastJournalRunKind
    health: RealForecastJournalOpsHealthStatus
    statusReason: string
    checkedAtUtc: string
    pollIntervalSeconds: number
    workerStartedAtUtc: string | null
    lastLoopStartedAtUtc: string | null
    lastLoopCompletedAtUtc: string | null
    workerHeartbeatStale: boolean
    consecutiveFailureCount: number
    lastFailureAtUtc: string | null
    lastFailureStage: string | null
    lastFailureMessage: string | null
    lastSuccessfulCapture: RealForecastJournalOpsCheckpointDto | null
    lastSuccessfulFinalize: RealForecastJournalOpsCheckpointDto | null
    activeRecordCount: number
    archiveRecordCount: number
    expectedCaptureDayUtc: string | null
    expectedCaptureTargetUtc: string | null
    expectedCaptureDayStatus: RealForecastJournalDayStatus | null
    nextCaptureDayUtc: string | null
    nextCaptureTargetUtc: string | null
    captureWindowClosed: boolean
    hasRecordForExpectedCaptureDay: boolean
    captureOverdue: boolean
    activePendingDayUtc: string | null
    activePendingExitUtc: string | null
    activePendingFinalizeDueUtc: string | null
    readyToFinalizeCount: number
    oldestReadyToFinalizeDayUtc: string | null
}
