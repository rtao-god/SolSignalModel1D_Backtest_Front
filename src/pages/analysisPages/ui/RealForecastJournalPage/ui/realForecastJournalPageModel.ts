import type { CurrentPredictionTrainingScope } from '@/shared/api/endpoints/reportEndpoints'
import type { AggregationMetricsSnapshotDto } from '@/shared/types/aggregation.types'
import type { PolicyEvaluationDto } from '@/shared/types/policyEvaluation.types'
import type {
    RealForecastJournalDayListItemDto,
    RealForecastJournalDayRecordDto,
    RealForecastJournalDirection,
    RealForecastJournalIndicatorSnapshotDto,
    RealForecastJournalIndicatorValueDto,
    RealForecastJournalMarginMode,
    RealForecastJournalPolicyBucket,
    RealForecastJournalPolicyRowDto
} from '@/shared/types/realForecastJournal.types'
import type { ReportDocumentDto, ReportSectionDto, TableSectionDto } from '@/shared/types/report.types'

export type RealForecastJournalComparisonSource = 'aggregation' | 'confidence-risk'
export type RealForecastJournalBranchFilter = 'all' | string
export type RealForecastJournalPolicySearchValue = string
export type RealForecastJournalIndicatorGroupFilter = 'all' | string

export interface RealForecastJournalPolicyViewFilters {
    bucket: RealForecastJournalPolicyBucket | 'total'
    slMode: 'all' | 'with-sl' | 'no-sl'
    branch: RealForecastJournalBranchFilter
    marginMode: 'all' | RealForecastJournalMarginMode
    policySearch: RealForecastJournalPolicySearchValue
}

export interface RealForecastJournalCombinedPolicyRow {
    rowKey: string
    policyName: string
    branch: string
    bucket: RealForecastJournalPolicyBucket
    evaluation: PolicyEvaluationDto | null
    margin: RealForecastJournalMarginMode | null
    hasDirection: boolean
    skipped: boolean
    isRiskDay: boolean
    direction: string
    leverage: number
    entryPrice: number | null
    bucketCapitalUsd: number | null
    stakeUsd: number | null
    stakePct: number | null
    derivedNotionalUsd: number | null
    publishedNotionalUsd: number | null
    slPct: number | null
    tpPct: number | null
    slPrice: number | null
    tpPrice: number | null
    liqPrice: number | null
    liqDistPct: number | null
    actualExitPrice: number | null
    actualExitReason: string | null
    actualExitPnlPct: number | null
    actualTrades: number | null
    actualTotalPnlPct: number | null
    actualMaxDdPct: number | null
    actualHadLiquidation: boolean | null
    actualWithdrawnUsd: number | null
    publishedInSessionOpenSnapshot: boolean
    finalizedAfterClose: boolean
}

export interface RealForecastJournalIndicatorComparisonRow {
    key: string
    label: string
    group: string
    unit: string | null
    sessionOpenDisplay: string
    closeDisplay: string | null
    deltaDisplay: string | null
    sessionOpenNumeric: number | null
    closeNumeric: number | null
}

export interface RealForecastJournalAggregationBenchmark {
    label: string
    accuracy: number
    microF1: number
    logLoss: number
    sampleSize: number
}

export interface RealForecastJournalLiveSummary {
    accuracy: number
    logLoss: number
    averageAssignedProbability: number
    calibrationGap: number
    sampleSize: number
}

export interface RealForecastJournalAggregationComparison {
    live: RealForecastJournalLiveSummary
    benchmark: RealForecastJournalAggregationBenchmark
    accuracyDelta: number
    logLossDelta: number
}

export interface RealForecastJournalConfidenceRiskRow {
    scope: CurrentPredictionTrainingScope
    bucket: string
    confidenceFromPct: number
    confidenceToPct: number
    confidenceAvgPct: number
    tradeDays: number
    winRatePct: number
}

export interface RealForecastJournalConfidenceRiskBucketComparison {
    bucket: string
    rangeLabel: string
    liveDays: number
    liveWinRate: number | null
    liveAverageConfidencePct: number | null
    benchmarkWinRate: number
    deltaWinRate: number | null
}

export interface RealForecastJournalConfidenceRiskComparison {
    live: RealForecastJournalLiveSummary
    weightedBenchmarkWinRate: number
    weightedDelta: number
    outOfRangeDays: number
    bucketRows: RealForecastJournalConfidenceRiskBucketComparison[]
}

interface AggregationSegmentCandidate {
    segmentName?: unknown
    segmentLabel?: unknown
    total?: unknown
    Total?: unknown
}

interface AggregationTotalCandidate {
    accuracy?: unknown
    Accuracy?: unknown
    microF1?: unknown
    MicroF1?: unknown
    logLoss?: unknown
    LogLoss?: unknown
    n?: unknown
    N?: unknown
}

interface ConfidenceRiskConfig {
    source: 'total' | 'day' | 'daymicro'
}

interface LiveFinalizedDaySummary {
    predictionDateUtc: string
    predictedDirection: RealForecastJournalDirection
    actualDirection: RealForecastJournalDirection
    matched: boolean
    assignedProbability: number
    dayConfidencePct: number
}

const EPSILON = 1e-12
const POLICY_TABLE_SECTION_KEY = 'leverage_policies'

function toFiniteNumber(value: unknown, label: string): number {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value
    }

    if (typeof value === 'string' && value.trim()) {
        const parsed = Number(value)
        if (Number.isFinite(parsed)) {
            return parsed
        }
    }

    throw new Error(`[real-forecast-journal] ${label} must be finite.`)
}

function toInteger(value: unknown, label: string): number {
    const parsed = toFiniteNumber(value, label)
    if (!Number.isInteger(parsed)) {
        throw new Error(`[real-forecast-journal] ${label} must be an integer.`)
    }

    return parsed
}

function toNonEmptyString(value: unknown, label: string): string {
    if (typeof value !== 'string' || !value.trim()) {
        throw new Error(`[real-forecast-journal] ${label} must be a non-empty string.`)
    }

    return value.trim()
}

function toObject(value: unknown, label: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`[real-forecast-journal] ${label} must be an object.`)
    }

    return value as Record<string, unknown>
}

function readRequiredField(raw: Record<string, unknown>, label: string, ...keys: string[]): unknown {
    for (const key of keys) {
        if (Object.prototype.hasOwnProperty.call(raw, key)) {
            return raw[key]
        }
    }

    throw new Error(`[real-forecast-journal] ${label} is missing.`)
}

function resolveScope(value: string): CurrentPredictionTrainingScope {
    const normalized = value.trim().toLowerCase()
    if (normalized === 'train') return 'train'
    if (normalized === 'oos') return 'oos'
    if (normalized === 'recent') return 'recent'
    if (normalized === 'full') return 'full'

    throw new Error(`[real-forecast-journal] unsupported scope: ${value}.`)
}

function resolveDirection(value: string): RealForecastJournalDirection {
    const normalized = value.trim().toUpperCase()
    if (normalized === 'UP') return 'UP'
    if (normalized === 'FLAT') return 'FLAT'
    if (normalized === 'DOWN') return 'DOWN'

    throw new Error(`[real-forecast-journal] unsupported direction: ${value}.`)
}

function directionToProbability(
    direction: RealForecastJournalDirection,
    day: RealForecastJournalDayListItemDto
): number {
    const probability =
        direction === 'UP' ? day.totalUpProbability
        : direction === 'FLAT' ? day.totalFlatProbability
        : day.totalDownProbability

    if (probability === null) {
        throw new Error(`[real-forecast-journal] probability is missing for direction=${direction}.`)
    }

    return probability
}

function buildPolicyRowKey(row: RealForecastJournalPolicyRowDto): string {
    return `${row.policyName}::${row.branch}::${row.bucket}`
}

function buildPolicyEvaluationMap(
    report: ReportDocumentDto | null | undefined
): ReadonlyMap<string, PolicyEvaluationDto> {
    const result = new Map<string, PolicyEvaluationDto>()
    if (!report) {
        return result
    }

    for (const section of report.sections) {
        const tableSection = section as TableSectionDto
        if (
            tableSection.sectionKey !== POLICY_TABLE_SECTION_KEY ||
            !Array.isArray(tableSection.columnKeys) ||
            !Array.isArray(tableSection.rows)
        ) {
            continue
        }

        const policyIndex = tableSection.columnKeys.findIndex(columnKey => columnKey === 'policy')
        const branchIndex = tableSection.columnKeys.findIndex(columnKey => columnKey === 'branch')
        const bucketIndex = tableSection.columnKeys.findIndex(columnKey => columnKey === 'bucket')
        if (policyIndex < 0 || branchIndex < 0 || bucketIndex < 0) {
            continue
        }

        tableSection.rows.forEach((row, rowIndex) => {
            if (!Array.isArray(row)) {
                return
            }

            const evaluation = tableSection.rowEvaluations?.[rowIndex] ?? null
            if (!evaluation) {
                return
            }

            const policyName = String(row[policyIndex] ?? '').trim()
            const branch = String(row[branchIndex] ?? '').trim()
            const bucket = String(row[bucketIndex] ?? '').trim()
            if (!policyName || !branch || !bucket) {
                return
            }

            result.set(`${policyName}::${branch}::${bucket}`, evaluation)
        })
    }

    return result
}

function resolveActualPolicyRow(
    record: RealForecastJournalDayRecordDto,
    rowKey: string
): RealForecastJournalPolicyRowDto | null {
    if (!record.finalize) {
        return null
    }

    const match = record.finalize.snapshot.policyRows.find(candidate => buildPolicyRowKey(candidate) === rowKey)
    return match ?? null
}

function resolveRowNumericValue(primary: number | null, fallback: number | null): number | null {
    return primary ?? fallback
}

function buildDerivedNotionalUsd(row: RealForecastJournalPolicyRowDto): number | null {
    if (row.stakeUsd === null) {
        return null
    }

    return row.stakeUsd * row.leverage
}

function hasStopLoss(row: RealForecastJournalCombinedPolicyRow): boolean {
    return row.slPrice !== null && row.slPct !== null
}

function compareTextAsc(left: string, right: string): number {
    return left.localeCompare(right, 'en-US', { sensitivity: 'base' })
}

function compareBucket(left: RealForecastJournalPolicyBucket, right: RealForecastJournalPolicyBucket): number {
    const order: Record<RealForecastJournalPolicyBucket, number> = {
        daily: 0,
        intraday: 1,
        delayed: 2
    }

    return order[left] - order[right]
}

function compareDirectionBucketNames(left: string, right: string): number {
    const leftMatch = /^B(\d{2})$/i.exec(left)
    const rightMatch = /^B(\d{2})$/i.exec(right)
    if (leftMatch && rightMatch) {
        return Number(leftMatch[1]) - Number(rightMatch[1])
    }

    return compareTextAsc(left, right)
}

export function buildCombinedPolicyRows(
    record: RealForecastJournalDayRecordDto
): RealForecastJournalCombinedPolicyRow[] {
    // Источник morning snapshot может отсутствовать у частично восстановленной записи, поэтому page-model держит graceful merge через доступные срезы.
    const sessionOpenRows = record.forecastSnapshot?.policyRows ?? []
    const forecastEvaluations = buildPolicyEvaluationMap(record.forecastReport)
    const finalizedEvaluations = buildPolicyEvaluationMap(record.finalize?.report)
    const uniqueRows = new Map<string, RealForecastJournalPolicyRowDto>()

    for (const row of sessionOpenRows) {
        uniqueRows.set(buildPolicyRowKey(row), row)
    }

    if (record.finalize) {
        for (const row of record.finalize.snapshot.policyRows) {
            uniqueRows.set(buildPolicyRowKey(row), uniqueRows.get(buildPolicyRowKey(row)) ?? row)
        }
    }

    return Array.from(uniqueRows.values())
        .map(row => {
            const rowKey = buildPolicyRowKey(row)
            const actualRow = resolveActualPolicyRow(record, rowKey)

            return {
                rowKey,
                policyName: row.policyName,
                branch: row.branch,
                bucket: row.bucket,
                evaluation: finalizedEvaluations.get(rowKey) ?? forecastEvaluations.get(rowKey) ?? null,
                margin: row.margin,
                hasDirection: row.hasDirection,
                skipped: row.skipped,
                isRiskDay: row.isRiskDay,
                direction: row.direction,
                leverage: row.leverage,
                entryPrice: row.entry,
                bucketCapitalUsd: row.bucketCapitalUsd,
                stakeUsd: row.stakeUsd,
                stakePct: row.stakePct,
                derivedNotionalUsd: buildDerivedNotionalUsd(row),
                publishedNotionalUsd: row.notionalUsd,
                slPct: row.slPct,
                tpPct: row.tpPct,
                slPrice: row.slPrice,
                tpPrice: row.tpPrice,
                liqPrice: row.liqPrice,
                liqDistPct: row.liqDistPct,
                actualExitPrice: actualRow?.exitPrice ?? null,
                actualExitReason: actualRow?.exitReason?.trim() ? actualRow.exitReason : null,
                actualExitPnlPct: resolveRowNumericValue(actualRow?.exitPnlPct ?? null, null),
                actualTrades: resolveRowNumericValue(actualRow?.trades ?? null, null),
                actualTotalPnlPct: resolveRowNumericValue(actualRow?.totalPnlPct ?? null, null),
                actualMaxDdPct: resolveRowNumericValue(actualRow?.maxDdPct ?? null, null),
                actualHadLiquidation: actualRow?.hadLiquidation ?? null,
                actualWithdrawnUsd: resolveRowNumericValue(actualRow?.withdrawnTotal ?? null, null),
                publishedInSessionOpenSnapshot: sessionOpenRows.some(
                    candidate => buildPolicyRowKey(candidate) === rowKey
                ),
                finalizedAfterClose: actualRow !== null
            }
        })
        .sort((left, right) => {
            const byBucket = compareBucket(left.bucket, right.bucket)
            if (byBucket !== 0) return byBucket

            const byPolicy = compareTextAsc(left.policyName, right.policyName)
            if (byPolicy !== 0) return byPolicy

            return compareTextAsc(left.branch, right.branch)
        })
}

export function filterCombinedPolicyRows(
    rows: RealForecastJournalCombinedPolicyRow[],
    filters: RealForecastJournalPolicyViewFilters
): RealForecastJournalCombinedPolicyRow[] {
    const policySearch = filters.policySearch.trim().toLowerCase()

    return rows.filter(row => {
        if (filters.bucket !== 'total' && row.bucket !== filters.bucket) {
            return false
        }

        if (filters.branch !== 'all' && row.branch !== filters.branch) {
            return false
        }

        if (filters.marginMode !== 'all' && row.margin !== filters.marginMode) {
            return false
        }

        if (filters.slMode === 'with-sl' && (!row.hasDirection || !hasStopLoss(row))) {
            return false
        }

        if (filters.slMode === 'no-sl' && (!row.hasDirection || hasStopLoss(row))) {
            return false
        }

        if (!policySearch) {
            return true
        }

        const haystack = `${row.policyName} ${row.branch}`.toLowerCase()
        return haystack.includes(policySearch)
    })
}

export function buildPolicyBranchOptions(rows: RealForecastJournalCombinedPolicyRow[]): string[] {
    const options = new Set<string>()
    for (const row of rows) {
        options.add(row.branch)
    }

    return Array.from(options).sort(compareTextAsc)
}

export function buildIndicatorGroupOptions(record: RealForecastJournalDayRecordDto): string[] {
    const groups = new Set<string>()
    for (const item of record.sessionOpenIndicators?.items ?? []) {
        groups.add(item.group)
    }
    for (const item of record.finalize?.endOfDayIndicators.items ?? []) {
        groups.add(item.group)
    }

    return Array.from(groups).sort(compareTextAsc)
}

function buildIndicatorLookup(
    snapshot: RealForecastJournalIndicatorSnapshotDto
): Map<string, RealForecastJournalIndicatorValueDto> {
    return new Map(snapshot.items.map(item => [item.key, item]))
}

function formatIndicatorDelta(
    sessionOpen: RealForecastJournalIndicatorValueDto,
    close: RealForecastJournalIndicatorValueDto
): string | null {
    if (sessionOpen.numericValue === null || close.numericValue === null) {
        return null
    }

    const delta = close.numericValue - sessionOpen.numericValue
    if (!Number.isFinite(delta)) {
        throw new Error(`[real-forecast-journal] indicator delta is non-finite. key=${sessionOpen.key}.`)
    }

    if (sessionOpen.unit === '%') {
        return `${(delta * 100).toFixed(2)} p.p.`
    }

    if (sessionOpen.unit === '$') {
        return delta.toFixed(4)
    }

    return delta.toFixed(4)
}

export function buildIndicatorComparisonRows(
    record: RealForecastJournalDayRecordDto,
    selectedGroup: RealForecastJournalIndicatorGroupFilter
): RealForecastJournalIndicatorComparisonRow[] {
    const closeIndicators = record.finalize?.endOfDayIndicators ?? null
    const sessionOpenLookup =
        record.sessionOpenIndicators ?
            buildIndicatorLookup(record.sessionOpenIndicators)
        :   new Map<string, RealForecastJournalIndicatorValueDto>()
    const closeLookup =
        closeIndicators ?
            buildIndicatorLookup(closeIndicators)
        :   new Map<string, RealForecastJournalIndicatorValueDto>()
    const keys = new Set<string>([...sessionOpenLookup.keys(), ...closeLookup.keys()])

    return Array.from(keys)
        .map(key => {
            const sessionOpen = sessionOpenLookup.get(key) ?? null
            const close = closeLookup.get(key) ?? null
            const source = sessionOpen ?? close
            if (!source) {
                throw new Error(`[real-forecast-journal] indicator row source is missing. key=${key}.`)
            }

            return {
                key,
                label: source.label,
                group: source.group,
                unit: source.unit,
                sessionOpenDisplay: sessionOpen?.displayValue ?? 'Not published in the fixed morning forecast',
                closeDisplay: close?.displayValue ?? null,
                deltaDisplay: sessionOpen && close ? formatIndicatorDelta(sessionOpen, close) : null,
                sessionOpenNumeric: sessionOpen?.numericValue ?? null,
                closeNumeric: close?.numericValue ?? null
            }
        })
        .filter(row => selectedGroup === 'all' || row.group === selectedGroup)
        .sort((left, right) => {
            const byGroup = compareTextAsc(left.group, right.group)
            if (byGroup !== 0) return byGroup
            return compareTextAsc(left.label, right.label)
        })
}

function collectFinalizedDays(dayList: RealForecastJournalDayListItemDto[]): LiveFinalizedDaySummary[] {
    return dayList
        .filter(
            (
                item
            ): item is RealForecastJournalDayListItemDto & {
                actualDirection: RealForecastJournalDirection
                directionMatched: boolean
                predLabelDisplay: string
                totalUpProbability: number
                totalFlatProbability: number
                totalDownProbability: number
                dayConfidence: number
            } =>
                item.status === 'finalized' &&
                item.actualDirection !== null &&
                item.directionMatched !== null &&
                item.predLabelDisplay !== null &&
                item.totalUpProbability !== null &&
                item.totalFlatProbability !== null &&
                item.totalDownProbability !== null &&
                item.dayConfidence !== null
        )
        .map(item => {
            const predictedDirection = resolveDirection(item.predLabelDisplay)
            const assignedProbability = directionToProbability(predictedDirection, item)
            if (!(assignedProbability > 0 && assignedProbability <= 1)) {
                throw new Error(
                    `[real-forecast-journal] assigned probability is outside (0, 1]. date=${item.predictionDateUtc}.`
                )
            }

            return {
                predictionDateUtc: item.predictionDateUtc,
                predictedDirection,
                actualDirection: item.actualDirection,
                matched: item.directionMatched,
                assignedProbability,
                dayConfidencePct: item.dayConfidence * 100
            }
        })
}

function buildLiveSummary(days: LiveFinalizedDaySummary[]): RealForecastJournalLiveSummary {
    if (days.length === 0) {
        throw new Error('[real-forecast-journal] live summary requires at least one finalized day.')
    }

    const matchedCount = days.filter(day => day.matched).length
    const accuracy = matchedCount / days.length
    const logLoss =
        days.reduce((sum, day) => sum + -Math.log(Math.max(day.assignedProbability, EPSILON)), 0) / days.length
    const averageAssignedProbability = days.reduce((sum, day) => sum + day.assignedProbability, 0) / days.length

    return {
        accuracy,
        logLoss,
        averageAssignedProbability,
        calibrationGap: averageAssignedProbability - accuracy,
        sampleSize: days.length
    }
}

function resolveAggregationSegmentName(value: unknown): CurrentPredictionTrainingScope {
    if (typeof value !== 'string' || !value.trim()) {
        throw new Error('[real-forecast-journal] aggregation segmentName is missing.')
    }

    return resolveScope(value)
}

export function resolveAggregationBenchmark(
    metrics: AggregationMetricsSnapshotDto,
    scope: CurrentPredictionTrainingScope
): RealForecastJournalAggregationBenchmark {
    const rawSegments =
        (metrics as { segments?: unknown; Segments?: unknown }).segments ?? (metrics as { Segments?: unknown }).Segments
    if (!Array.isArray(rawSegments)) {
        throw new Error('[real-forecast-journal] aggregation metrics segments are missing.')
    }

    const segment = rawSegments
        .map(candidate => toObject(candidate, 'aggregation.segment'))
        .find(
            candidate =>
                resolveAggregationSegmentName(
                    String(readRequiredField(candidate, 'segmentName', 'segmentName', 'SegmentName'))
                ) === scope
        )

    if (!segment) {
        throw new Error(`[real-forecast-journal] aggregation segment for scope=${scope} was not found.`)
    }

    const segmentCandidate = segment as AggregationSegmentCandidate
    const totalCandidate = toObject(
        segmentCandidate.total ?? segmentCandidate.Total,
        'aggregation.segment.total'
    ) as AggregationTotalCandidate

    return {
        label: toNonEmptyString(
            readRequiredField(segment, 'segmentLabel', 'segmentLabel', 'SegmentLabel'),
            'segmentLabel'
        ),
        accuracy: toFiniteNumber(
            readRequiredField(totalCandidate as Record<string, unknown>, 'Accuracy', 'accuracy', 'Accuracy'),
            'Accuracy'
        ),
        microF1: toFiniteNumber(
            readRequiredField(totalCandidate as Record<string, unknown>, 'MicroF1', 'microF1', 'MicroF1'),
            'MicroF1'
        ),
        logLoss: toFiniteNumber(
            readRequiredField(totalCandidate as Record<string, unknown>, 'LogLoss', 'logLoss', 'LogLoss'),
            'LogLoss'
        ),
        sampleSize: toInteger(readRequiredField(totalCandidate as Record<string, unknown>, 'N', 'n', 'N'), 'N')
    }
}

export function buildAggregationComparison(
    dayList: RealForecastJournalDayListItemDto[],
    metrics: AggregationMetricsSnapshotDto,
    scope: CurrentPredictionTrainingScope
): RealForecastJournalAggregationComparison {
    const finalizedDays = collectFinalizedDays(dayList)
    const live = buildLiveSummary(finalizedDays)
    const benchmark = resolveAggregationBenchmark(metrics, scope)

    return {
        live,
        benchmark,
        accuracyDelta: live.accuracy - benchmark.accuracy,
        logLossDelta: live.logLoss - benchmark.logLoss
    }
}

function resolveConfidenceRiskSource(configSection: ReportSectionDto | undefined): ConfidenceRiskConfig {
    if (!configSection || !('items' in configSection) || !Array.isArray(configSection.items)) {
        throw new Error('[real-forecast-journal] confidence-risk config section is missing.')
    }

    const sourceItem = configSection.items.find(item => item.itemKey === 'source' || item.key === 'Source')
    if (!sourceItem) {
        throw new Error('[real-forecast-journal] confidence-risk source config is missing.')
    }

    const normalized = sourceItem.value.trim().toLowerCase()
    if (normalized === 'total') return { source: 'total' }
    if (normalized === 'day') return { source: 'day' }
    if (normalized === 'day+micro' || normalized === 'daymicro') return { source: 'daymicro' }

    throw new Error(`[real-forecast-journal] unsupported confidence-risk source: ${sourceItem.value}.`)
}

function resolveConfidenceValuePct(day: LiveFinalizedDaySummary, config: ConfidenceRiskConfig): number {
    if (config.source === 'total') {
        return day.assignedProbability * 100
    }

    if (config.source === 'day') {
        return day.dayConfidencePct
    }

    throw new Error(
        '[real-forecast-journal] confidence-risk source=daymicro is not supported by current day-list payload.'
    )
}

export function resolveConfidenceRiskRows(
    report: ReportDocumentDto,
    scope: CurrentPredictionTrainingScope
): { config: ConfidenceRiskConfig; rows: RealForecastJournalConfidenceRiskRow[] } {
    const config = resolveConfidenceRiskSource(
        report.sections.find(section => section.sectionKey === 'confidence_risk_config')
    )
    const tableSection = report.sections.find(
        (section): section is TableSectionDto =>
            section.sectionKey === 'confidence_buckets' &&
            Array.isArray((section as TableSectionDto).rows) &&
            Array.isArray((section as TableSectionDto).columnKeys)
    )

    if (!tableSection) {
        throw new Error('[real-forecast-journal] confidence-risk table section is missing.')
    }

    const rows = tableSection.rows ?? []
    const columnKeys = tableSection.columnKeys ?? []
    const keyToIndex = new Map(columnKeys.map((key, index) => [key, index]))
    const requiredKeys = [
        'split',
        'bucket',
        'confidence_from_pct',
        'confidence_to_pct',
        'confidence_average_pct',
        'trade_days',
        'win_rate_pct'
    ] as const

    for (const key of requiredKeys) {
        if (!keyToIndex.has(key)) {
            throw new Error(`[real-forecast-journal] confidence-risk column is missing. key=${key}.`)
        }
    }

    const parsedRows = rows
        .map((row, rowIndex) => {
            if (!Array.isArray(row)) {
                throw new Error(`[real-forecast-journal] confidence-risk row must be an array. index=${rowIndex}.`)
            }

            const rowScope = resolveScope(String(row[keyToIndex.get('split')!]))
            return {
                scope: rowScope,
                bucket: toNonEmptyString(row[keyToIndex.get('bucket')!], `confidence-risk.bucket[${rowIndex}]`),
                confidenceFromPct: toFiniteNumber(
                    row[keyToIndex.get('confidence_from_pct')!],
                    `confidence-risk.from[${rowIndex}]`
                ),
                confidenceToPct: toFiniteNumber(
                    row[keyToIndex.get('confidence_to_pct')!],
                    `confidence-risk.to[${rowIndex}]`
                ),
                confidenceAvgPct: toFiniteNumber(
                    row[keyToIndex.get('confidence_average_pct')!],
                    `confidence-risk.avg[${rowIndex}]`
                ),
                tradeDays: toInteger(row[keyToIndex.get('trade_days')!], `confidence-risk.tradeDays[${rowIndex}]`),
                winRatePct: toFiniteNumber(row[keyToIndex.get('win_rate_pct')!], `confidence-risk.winRate[${rowIndex}]`)
            }
        })
        .filter(row => row.scope === scope)
        .sort((left, right) => compareDirectionBucketNames(left.bucket, right.bucket))

    if (parsedRows.length === 0) {
        throw new Error(`[real-forecast-journal] confidence-risk rows for scope=${scope} are missing.`)
    }

    return {
        config,
        rows: parsedRows
    }
}

function resolveBucketForConfidenceOrNull(
    confidencePct: number,
    rows: RealForecastJournalConfidenceRiskRow[]
): RealForecastJournalConfidenceRiskRow | null {
    const ordered = [...rows].sort((left, right) => left.confidenceFromPct - right.confidenceFromPct)

    for (let index = 0; index < ordered.length; index++) {
        const row = ordered[index]
        const isLast = index === ordered.length - 1
        if (
            confidencePct >= row.confidenceFromPct &&
            (confidencePct < row.confidenceToPct || (isLast && confidencePct <= row.confidenceToPct))
        ) {
            return row
        }
    }

    return null
}

export function buildConfidenceRiskComparison(
    dayList: RealForecastJournalDayListItemDto[],
    report: ReportDocumentDto,
    scope: CurrentPredictionTrainingScope
): RealForecastJournalConfidenceRiskComparison {
    const finalizedDays = collectFinalizedDays(dayList)
    const live = buildLiveSummary(finalizedDays)
    const baseline = resolveConfidenceRiskRows(report, scope)
    const bucketMap = new Map<
        string,
        { benchmark: RealForecastJournalConfidenceRiskRow; days: LiveFinalizedDaySummary[] }
    >()
    let outOfRangeDays = 0

    for (const row of baseline.rows) {
        bucketMap.set(row.bucket, { benchmark: row, days: [] })
    }

    for (const day of finalizedDays) {
        const confidencePct = resolveConfidenceValuePct(day, baseline.config)
        const bucket = resolveBucketForConfidenceOrNull(confidencePct, baseline.rows)
        if (!bucket) {
            outOfRangeDays++
            continue
        }

        const entry = bucketMap.get(bucket.bucket)
        if (!entry) {
            throw new Error(`[real-forecast-journal] bucket mapping is missing. bucket=${bucket.bucket}.`)
        }

        entry.days.push(day)
    }

    const bucketRows = Array.from(bucketMap.values())
        .filter(entry => entry.days.length > 0)
        .map(entry => {
            const liveDays = entry.days.length
            const matched = entry.days.filter(day => day.matched).length
            const liveWinRate = matched / liveDays
            const liveAverageConfidencePct =
                entry.days.reduce((sum, day) => sum + resolveConfidenceValuePct(day, baseline.config), 0) / liveDays

            return {
                bucket: entry.benchmark.bucket,
                rangeLabel: `${entry.benchmark.confidenceFromPct.toFixed(2)}-${entry.benchmark.confidenceToPct.toFixed(2)}%`,
                liveDays,
                liveWinRate,
                liveAverageConfidencePct,
                benchmarkWinRate: entry.benchmark.winRatePct / 100,
                deltaWinRate: liveWinRate - entry.benchmark.winRatePct / 100
            }
        })
        .sort((left, right) => compareDirectionBucketNames(left.bucket, right.bucket))

    if (bucketRows.length === 0) {
        throw new Error('[real-forecast-journal] no finalized live days matched confidence-risk buckets.')
    }

    const matchedWeightedSum = bucketRows.reduce((sum, row) => sum + row.benchmarkWinRate * row.liveDays, 0)
    const totalBucketDays = bucketRows.reduce((sum, row) => sum + row.liveDays, 0)
    if (totalBucketDays <= 0) {
        throw new Error('[real-forecast-journal] bucket day count must be positive.')
    }

    const weightedBenchmarkWinRate = matchedWeightedSum / totalBucketDays

    return {
        live,
        weightedBenchmarkWinRate,
        weightedDelta: live.accuracy - weightedBenchmarkWinRate,
        outOfRangeDays,
        bucketRows
    }
}
