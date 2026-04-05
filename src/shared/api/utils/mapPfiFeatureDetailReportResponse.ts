import type {
    PfiFeatureDetailBlockDto,
    PfiFeatureDetailReportDto,
    PfiFeatureDetailReportKindDto,
    PfiFeatureDetailScoreScopeKeyDto,
    PfiFeatureHistoryRangeKeyDto,
    PfiFeatureHistoryCoverageDto,
    PfiFeatureValueOutcomeProfileDto,
    PfiFeatureValueOutcomePointDto,
    PfiFeatureDetailTableDto,
    PfiFeatureHistoryChartDto,
    PfiFeatureHistorySeriesDto,
    PfiFeatureHistoryVariantDto,
    PfiFeatureHistoryWindowDto,
    PfiFeatureRollingChartDto,
    PfiFeatureRollingPointDto,
    PfiFeatureRollingSeriesDto,
    PfiReportFamilyKeyDto
} from '@/shared/types/pfi.types'

// Маппер detail-отчёта PFI: жёстко валидирует структуру и типы, чтобы UI не скрывал ошибки данных.
function toObject(value: unknown, label: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`[ui] ${label} must be an object.`)
    }

    return value as Record<string, unknown>
}

function toRequiredString(value: unknown, label: string): string {
    if (typeof value !== 'string') {
        throw new Error(`[ui] ${label} must be a string.`)
    }

    const normalized = value.trim()
    if (normalized.length === 0) {
        throw new Error(`[ui] ${label} must be non-empty.`)
    }

    return normalized
}

function toOptionalString(value: unknown): string | undefined {
    if (value === null || typeof value === 'undefined') {
        return undefined
    }

    if (typeof value !== 'string') {
        throw new Error('[ui] optional PFI string field must be a string when provided.')
    }

    const normalized = value.trim()
    return normalized.length > 0 ? normalized : undefined
}

function toRequiredNumber(value: unknown, label: string): number {
    if (typeof value !== 'number' || Number.isNaN(value) || !Number.isFinite(value)) {
        throw new Error(`[ui] ${label} must be a finite number.`)
    }

    return value
}

function toRequiredBoolean(value: unknown, label: string): boolean {
    if (typeof value !== 'boolean') {
        throw new Error(`[ui] ${label} must be a boolean.`)
    }

    return value
}

function toRequiredPositiveInt(value: unknown, label: string): number {
    const numeric = toRequiredNumber(value, label)
    if (!Number.isInteger(numeric) || numeric <= 0) {
        throw new Error(`[ui] ${label} must be a positive integer.`)
    }

    return numeric
}

function toRequiredNonNegativeInt(value: unknown, label: string): number {
    const numeric = toRequiredNumber(value, label)
    if (!Number.isInteger(numeric) || numeric < 0) {
        throw new Error(`[ui] ${label} must be a non-negative integer.`)
    }

    return numeric
}

function toOptionalPositiveInt(value: unknown, label: string): number | undefined {
    if (value === null || typeof value === 'undefined') {
        return undefined
    }

    return toRequiredPositiveInt(value, label)
}

function toStringArray(value: unknown, label: string): string[] {
    if (!Array.isArray(value)) {
        throw new Error(`[ui] ${label} must be an array.`)
    }

    return value.map((item, index) => toRequiredString(item, `${label}[${index}]`))
}

function toNumberArray(value: unknown, label: string): number[] {
    if (!Array.isArray(value)) {
        throw new Error(`[ui] ${label} must be an array.`)
    }

    return value.map((item, index) => toRequiredNumber(item, `${label}[${index}]`))
}

function toRows(value: unknown, label: string): string[][] {
    if (!Array.isArray(value)) {
        throw new Error(`[ui] ${label} must be an array.`)
    }

    return value.map((row, rowIndex) => toStringArray(row, `${label}[${rowIndex}]`))
}

function parsePfiFeatureDetailKind(value: unknown, label: string): PfiFeatureDetailReportKindDto {
    const kind = toRequiredString(value, label)
    if (kind === 'pfi_per_model_feature_detail') {
        return kind
    }

    throw new Error(`[ui] ${label} has unsupported value: ${kind}.`)
}

function parsePfiFeatureHistoryRangeKey(value: unknown, label: string): PfiFeatureHistoryRangeKeyDto {
    if (value === null || typeof value === 'undefined') {
        return 'all'
    }

    const rangeKey = toRequiredString(value, label)
    if (rangeKey === 'all' || rangeKey === '180' || rangeKey === '730') {
        return rangeKey
    }

    throw new Error(`[ui] ${label} has unsupported value: ${rangeKey}.`)
}

function parsePfiFeatureDetailScoreScopeKey(value: unknown, label: string): PfiFeatureDetailScoreScopeKeyDto {
    if (value === null || typeof value === 'undefined') {
        return 'oos'
    }

    const scopeKey = toRequiredString(value, label)
    if (scopeKey === 'train_oof' || scopeKey === 'oos' || scopeKey === 'train' || scopeKey === 'full_history') {
        return scopeKey
    }

    throw new Error(`[ui] ${label} has unsupported value: ${scopeKey}.`)
}

function parsePfiFamily(value: unknown, label: string): PfiReportFamilyKeyDto {
    const family = toRequiredString(value, label)
    if (family === 'daily_model' || family === 'sl_model') {
        return family
    }

    throw new Error(`[ui] ${label} has unsupported value: ${family}.`)
}

function mapDescriptionBlock(raw: unknown, index: number): PfiFeatureDetailBlockDto {
    const payload = toObject(raw, `PfiFeatureDetailBlock[${index}]`)

    return {
        title: toRequiredString(payload.title, `PfiFeatureDetailBlock[${index}].title`),
        body: toRequiredString(payload.body, `PfiFeatureDetailBlock[${index}].body`)
    }
}

function mapTable(raw: unknown, label: string): PfiFeatureDetailTableDto {
    const payload = toObject(raw, label)
    const columns = toStringArray(payload.columns, `${label}.columns`)
    const columnKeys = toStringArray(payload.columnKeys, `${label}.columnKeys`)

    if (columns.length !== columnKeys.length) {
        throw new Error(
            `[ui] ${label} columns/columnKeys length mismatch. columns=${columns.length}, columnKeys=${columnKeys.length}.`
        )
    }

    return {
        title: toRequiredString(payload.title, `${label}.title`),
        columns,
        columnKeys,
        rows: toRows(payload.rows, `${label}.rows`)
    }
}

function mapOptionalTable(value: unknown, label: string): PfiFeatureDetailTableDto | undefined {
    if (value === null || typeof value === 'undefined') {
        return undefined
    }

    return mapTable(value, label)
}

function mapOptionalScoreScopeArray(value: unknown, label: string): PfiFeatureDetailScoreScopeKeyDto[] | undefined {
    if (value === null || typeof value === 'undefined') {
        return undefined
    }

    if (!Array.isArray(value)) {
        throw new Error(`[ui] ${label} must be an array.`)
    }

    return value.map((item, index) => parsePfiFeatureDetailScoreScopeKey(item, `${label}[${index}]`))
}

function mapOptionalHistoryRangeArray(value: unknown, label: string): PfiFeatureHistoryRangeKeyDto[] | undefined {
    if (value === null || typeof value === 'undefined') {
        return undefined
    }

    if (!Array.isArray(value)) {
        throw new Error(`[ui] ${label} must be an array.`)
    }

    return value.map((item, index) => parsePfiFeatureHistoryRangeKey(item, `${label}[${index}]`))
}

function mapOptionalHistoryCoverage(value: unknown, label: string): PfiFeatureHistoryCoverageDto | undefined {
    if (value === null || typeof value === 'undefined') {
        return undefined
    }

    const payload = toObject(value, label)
    return {
        requestedWindowCount: toRequiredNonNegativeInt(payload.requestedWindowCount, `${label}.requestedWindowCount`),
        successfulWindowCount: toRequiredNonNegativeInt(
            payload.successfulWindowCount,
            `${label}.successfulWindowCount`
        ),
        skippedWindowCount: toRequiredNonNegativeInt(payload.skippedWindowCount, `${label}.skippedWindowCount`),
        coverageStartDayKeyUtc: toOptionalString(payload.coverageStartDayKeyUtc),
        coverageEndDayKeyUtc: toOptionalString(payload.coverageEndDayKeyUtc)
    }
}

function mapValueOutcomePoint(raw: unknown, label: string): PfiFeatureValueOutcomePointDto {
    const payload = toObject(raw, label)

    const upProbability =
        payload.upProbability === null || typeof payload.upProbability === 'undefined'
            ? undefined
            : toRequiredNumber(payload.upProbability, `${label}.upProbability`)
    const flatProbability =
        payload.flatProbability === null || typeof payload.flatProbability === 'undefined'
            ? undefined
            : toRequiredNumber(payload.flatProbability, `${label}.flatProbability`)
    const downProbability =
        payload.downProbability === null || typeof payload.downProbability === 'undefined'
            ? undefined
            : toRequiredNumber(payload.downProbability, `${label}.downProbability`)
    const longShortEdge =
        payload.longShortEdge === null || typeof payload.longShortEdge === 'undefined'
            ? undefined
            : toRequiredNumber(payload.longShortEdge, `${label}.longShortEdge`)

    return {
        value: toRequiredNumber(payload.value, `${label}.value`),
        supportCount: toRequiredNonNegativeInt(payload.supportCount, `${label}.supportCount`),
        upProbability,
        flatProbability,
        downProbability,
        longShortEdge
    }
}

function mapOptionalValueOutcomeProfile(
    value: unknown,
    label: string
): PfiFeatureValueOutcomeProfileDto | undefined {
    if (value === null || typeof value === 'undefined') {
        return undefined
    }

    const payload = toObject(value, label)
    if (!Array.isArray(payload.points)) {
        throw new Error(`[ui] ${label}.points must be an array.`)
    }

    const points = payload.points.map((item, index) => mapValueOutcomePoint(item, `${label}.points[${index}]`))
    if (points.length === 0) {
        throw new Error(`[ui] ${label}.points must not be empty.`)
    }

    return {
        title: toRequiredString(payload.title, `${label}.title`),
        description: toRequiredString(payload.description, `${label}.description`),
        scaleTitle: toRequiredString(payload.scaleTitle, `${label}.scaleTitle`),
        scaleUnit: toRequiredString(payload.scaleUnit, `${label}.scaleUnit`),
        valueDecimals: toRequiredNonNegativeInt(payload.valueDecimals, `${label}.valueDecimals`),
        gridStep: toRequiredNumber(payload.gridStep, `${label}.gridStep`),
        observationCount: toRequiredPositiveInt(payload.observationCount, `${label}.observationCount`),
        coverageStartDayKeyUtc: toOptionalString(payload.coverageStartDayKeyUtc),
        coverageEndDayKeyUtc: toOptionalString(payload.coverageEndDayKeyUtc),
        points
    }
}

function mapHistoryWindow(raw: unknown, label: string): PfiFeatureHistoryWindowDto {
    const payload = toObject(raw, label)

    return {
        startDayKeyUtc: toRequiredString(payload.startDayKeyUtc, `${label}.startDayKeyUtc`),
        endDayKeyUtc: toRequiredString(payload.endDayKeyUtc, `${label}.endDayKeyUtc`)
    }
}

function mapHistorySeries(raw: unknown, label: string, expectedWindows: number): PfiFeatureHistorySeriesDto {
    const payload = toObject(raw, label)
    const values = toNumberArray(payload.values, `${label}.values`)
    if (values.length !== expectedWindows) {
        throw new Error(
            `[ui] ${label}.values length mismatch. expected=${expectedWindows}, actual=${values.length}.`
        )
    }

    return {
        featureName: toRequiredString(payload.featureName, `${label}.featureName`),
        isPrimary: toRequiredBoolean(payload.isPrimary, `${label}.isPrimary`),
        comparisonRank: toOptionalPositiveInt(payload.comparisonRank, `${label}.comparisonRank`),
        values
    }
}

function mapHistoryVariant(raw: unknown, label: string, expectedWindows: number): PfiFeatureHistoryVariantDto {
    const payload = toObject(raw, label)
    if (!Array.isArray(payload.series)) {
        throw new Error(`[ui] ${label}.series must be an array.`)
    }

    const series = payload.series.map((item, index) =>
        mapHistorySeries(item, `${label}.series[${index}]`, expectedWindows)
    )

    if (series.length === 0) {
        throw new Error(`[ui] ${label}.series must not be empty.`)
    }

    const primaryCount = series.filter(item => item.isPrimary).length
    if (primaryCount !== 1) {
        throw new Error(`[ui] ${label}.series must contain exactly one primary line.`)
    }

    return {
        variantKey: toRequiredString(payload.variantKey, `${label}.variantKey`),
        title: toRequiredString(payload.title, `${label}.title`),
        metricTitle: toRequiredString(payload.metricTitle, `${label}.metricTitle`),
        metricUnit: toRequiredString(payload.metricUnit, `${label}.metricUnit`),
        lowerValuesAreBetter: toRequiredBoolean(payload.lowerValuesAreBetter, `${label}.lowerValuesAreBetter`),
        valueDecimals: toRequiredNonNegativeInt(payload.valueDecimals, `${label}.valueDecimals`),
        series
    }
}

function mapHistoryChart(raw: unknown, index: number): PfiFeatureHistoryChartDto {
    const label = `PfiFeatureHistoryChart[${index}]`
    const payload = toObject(raw, label)

    if (!Array.isArray(payload.windows)) {
        throw new Error(`[ui] ${label}.windows must be an array.`)
    }

    const windows = payload.windows.map((item, windowIndex) =>
        mapHistoryWindow(item, `${label}.windows[${windowIndex}]`)
    )

    if (windows.length === 0) {
        throw new Error(`[ui] ${label}.windows must not be empty.`)
    }

    if (!Array.isArray(payload.variants)) {
        throw new Error(`[ui] ${label}.variants must be an array.`)
    }

    const variants = payload.variants.map((item, variantIndex) =>
        mapHistoryVariant(item, `${label}.variants[${variantIndex}]`, windows.length)
    )

    if (variants.length === 0) {
        throw new Error(`[ui] ${label}.variants must not be empty.`)
    }

    const defaultVariantKey = toRequiredString(payload.defaultVariantKey, `${label}.defaultVariantKey`)
    if (!variants.some(variant => variant.variantKey === defaultVariantKey)) {
        throw new Error(`[ui] ${label}.defaultVariantKey does not match any variant.`)
    }

    return {
        chartKey: toRequiredString(payload.chartKey, `${label}.chartKey`),
        title: toRequiredString(payload.title, `${label}.title`),
        description: toRequiredString(payload.description, `${label}.description`),
        defaultVariantKey,
        modelKey: toRequiredString(payload.modelKey, `${label}.modelKey`),
        modelDisplayName: toRequiredString(payload.modelDisplayName, `${label}.modelDisplayName`),
        scoreScopeKey: toRequiredString(payload.scoreScopeKey, `${label}.scoreScopeKey`),
        windowDays: toRequiredPositiveInt(payload.windowDays, `${label}.windowDays`),
        stepDays: toRequiredPositiveInt(payload.stepDays, `${label}.stepDays`),
        windows,
        variants
    }
}

function mapOptionalHistoryCharts(value: unknown): PfiFeatureHistoryChartDto[] | undefined {
    if (value === null || typeof value === 'undefined') {
        return undefined
    }

    if (!Array.isArray(value)) {
        throw new Error('[ui] PfiFeatureDetailReport.historyCharts must be an array.')
    }

    return value.map((chart, index) => mapHistoryChart(chart, index))
}

function mapRollingPoint(raw: unknown, label: string): PfiFeatureRollingPointDto {
    const payload = toObject(raw, label)

    return {
        windowStartDayKeyUtc: toRequiredString(payload.windowStartDayKeyUtc, `${label}.windowStartDayKeyUtc`),
        windowEndDayKeyUtc: toRequiredString(payload.windowEndDayKeyUtc, `${label}.windowEndDayKeyUtc`),
        value: toRequiredNumber(payload.value, `${label}.value`)
    }
}

function mapRollingSeries(raw: unknown, index: number): PfiFeatureRollingSeriesDto {
    const label = `PfiFeatureRollingSeries[${index}]`
    const payload = toObject(raw, label)

    if (!Array.isArray(payload.points)) {
        throw new Error(`[ui] ${label}.points must be an array.`)
    }

    const points = payload.points.map((point, pointIndex) =>
        mapRollingPoint(point, `${label}.points[${pointIndex}]`)
    )

    if (points.length === 0) {
        throw new Error(`[ui] ${label}.points must not be empty.`)
    }

    return {
        featureName: toRequiredString(payload.featureName, `${label}.featureName`),
        isPrimary: toRequiredBoolean(payload.isPrimary, `${label}.isPrimary`),
        points
    }
}

function mapRollingChart(raw: unknown, label: string): PfiFeatureRollingChartDto {
    const payload = toObject(raw, label)

    if (!Array.isArray(payload.series)) {
        throw new Error(`[ui] ${label}.series must be an array.`)
    }

    const series = payload.series.map((item, index) => mapRollingSeries(item, index))
    if (series.length === 0) {
        throw new Error(`[ui] ${label}.series must not be empty.`)
    }

    const primaryCount = series.filter(item => item.isPrimary).length
    if (primaryCount !== 1) {
        throw new Error(`[ui] ${label}.series must contain exactly one primary line.`)
    }

    const expectedPoints = series[0]?.points.length ?? 0
    if (expectedPoints === 0) {
        throw new Error(`[ui] ${label}.series points must not be empty.`)
    }

    for (const item of series) {
        if (item.points.length !== expectedPoints) {
            throw new Error(
                `[ui] ${label}.series points length mismatch. expected=${expectedPoints}, actual=${item.points.length}.`
            )
        }
    }

    return {
        title: toRequiredString(payload.title, `${label}.title`),
        metricTitle: toRequiredString(payload.metricTitle, `${label}.metricTitle`),
        metricUnit: toRequiredString(payload.metricUnit, `${label}.metricUnit`),
        modelKey: toRequiredString(payload.modelKey, `${label}.modelKey`),
        modelDisplayName: toRequiredString(payload.modelDisplayName, `${label}.modelDisplayName`),
        scoreScopeKey: toRequiredString(payload.scoreScopeKey, `${label}.scoreScopeKey`),
        windowDays: toRequiredPositiveInt(payload.windowDays, `${label}.windowDays`),
        stepDays: toRequiredPositiveInt(payload.stepDays, `${label}.stepDays`),
        series
    }
}

function mapOptionalRollingChart(value: unknown, label: string): PfiFeatureRollingChartDto | undefined {
    if (value === null || typeof value === 'undefined') {
        return undefined
    }

    return mapRollingChart(value, label)
}

function convertLegacyRollingChart(chart: PfiFeatureRollingChartDto): PfiFeatureHistoryChartDto {
    const windows = chart.series[0]?.points.map(point => ({
        startDayKeyUtc: point.windowStartDayKeyUtc,
        endDayKeyUtc: point.windowEndDayKeyUtc
    }))

    if (!windows || windows.length === 0) {
        throw new Error('[ui] legacy PFI rolling chart has no windows.')
    }

    return {
        chartKey: 'pfi_importance',
        title: chart.title,
        description: 'Старый формат отчёта содержит только график полезности признака по скользящим окнам.',
        defaultVariantKey: 'delta_auc_pp',
        modelKey: chart.modelKey,
        modelDisplayName: chart.modelDisplayName,
        scoreScopeKey: chart.scoreScopeKey,
        windowDays: chart.windowDays,
        stepDays: chart.stepDays,
        windows,
        variants: [
            {
                variantKey: 'delta_auc_pp',
                title: 'PFI',
                metricTitle: chart.metricTitle,
                metricUnit: chart.metricUnit,
                lowerValuesAreBetter: false,
                valueDecimals: 2,
                series: chart.series.map(series => ({
                    featureName: series.featureName,
                    isPrimary: series.isPrimary,
                    values: series.points.map(point => point.value)
                }))
            }
        ]
    }
}

export function mapPfiFeatureDetailReportResponse(raw: unknown): PfiFeatureDetailReportDto {
    const payload = toObject(raw, 'PfiFeatureDetailReport')

    if (!Array.isArray(payload.descriptionBlocks)) {
        throw new Error('[ui] PfiFeatureDetailReport.descriptionBlocks must be an array.')
    }

    const familyKey = parsePfiFamily(payload.familyKey, 'PfiFeatureDetailReport.familyKey')
    const descriptionBlocks = payload.descriptionBlocks.map((block, index) => mapDescriptionBlock(block, index))
    const historyCharts = mapOptionalHistoryCharts(payload.historyCharts)
    const legacyRollingChart = mapOptionalRollingChart(
        payload.rollingImportanceChart,
        'PfiFeatureDetailReport.rollingImportanceChart'
    )
    const scoreScopeKey = parsePfiFeatureDetailScoreScopeKey(payload.scoreScopeKey, 'PfiFeatureDetailReport.scoreScopeKey')
    const availableScoreScopeKeys =
        mapOptionalScoreScopeArray(payload.availableScoreScopeKeys, 'PfiFeatureDetailReport.availableScoreScopeKeys') ??
        [scoreScopeKey]
    const historyRangeKey = parsePfiFeatureHistoryRangeKey(
        payload.historyRangeKey,
        'PfiFeatureDetailReport.historyRangeKey'
    )
    const availableHistoryRangeKeys =
        mapOptionalHistoryRangeArray(payload.availableHistoryRangeKeys, 'PfiFeatureDetailReport.availableHistoryRangeKeys') ??
        [historyRangeKey]

    return {
        id: toRequiredString(payload.id, 'PfiFeatureDetailReport.id'),
        kind: parsePfiFeatureDetailKind(payload.kind, 'PfiFeatureDetailReport.kind'),
        featureName: toRequiredString(payload.featureName, 'PfiFeatureDetailReport.featureName'),
        familyKey,
        featureSchemaKey: toRequiredString(payload.featureSchemaKey, 'PfiFeatureDetailReport.featureSchemaKey'),
        generatedAtUtc: toRequiredString(payload.generatedAtUtc, 'PfiFeatureDetailReport.generatedAtUtc'),
        trainUntilExitDayKeyUtc: toOptionalString(payload.trainUntilExitDayKeyUtc),
        scoreScopeKey,
        availableScoreScopeKeys,
        availableHistoryRangeKeys,
        historyRangeKey,
        descriptionBlocks,
        sectionStatsTable: mapOptionalTable(payload.sectionStatsTable, 'PfiFeatureDetailReport.sectionStatsTable'),
        peerFeaturesTable: mapOptionalTable(payload.peerFeaturesTable, 'PfiFeatureDetailReport.peerFeaturesTable'),
        modelQualityTable: mapOptionalTable(payload.modelQualityTable, 'PfiFeatureDetailReport.modelQualityTable'),
        contributionStatsTable: mapOptionalTable(
            payload.contributionStatsTable,
            'PfiFeatureDetailReport.contributionStatsTable'
        ),
        valueBucketsTable: mapOptionalTable(payload.valueBucketsTable, 'PfiFeatureDetailReport.valueBucketsTable'),
        valueOutcomeProfile: mapOptionalValueOutcomeProfile(
            payload.valueOutcomeProfile,
            'PfiFeatureDetailReport.valueOutcomeProfile'
        ),
        historyCoverage: mapOptionalHistoryCoverage(payload.historyCoverage, 'PfiFeatureDetailReport.historyCoverage'),
        historyCharts:
            historyCharts && historyCharts.length > 0
                ? historyCharts
                : legacyRollingChart
                  ? [convertLegacyRollingChart(legacyRollingChart)]
                  : []
    }
}
