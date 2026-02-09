import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import { useAggregationMetricsQuery, useAggregationProbsQuery } from '@/shared/api/tanstackQueries/aggregation'
import type { AggregationMetricsSnapshotDto, AggregationProbsSnapshotDto } from '@/shared/types/aggregation.types'
import type { AggregationStatsPageProps } from './types'
import { AggregationStatsPageInner } from './AggregationStatsPageInner'

export default function AggregationStatsPage({ className }: AggregationStatsPageProps) {
    const probsQuery = useAggregationProbsQuery()
    const metricsQuery = useAggregationMetricsQuery()

    const probsResult = normalizeProbsSnapshot(probsQuery.data)
    const metricsResult = normalizeMetricsSnapshot(metricsQuery.data)

    const normalizedProbs = probsResult.value
    const normalizedMetrics = metricsResult.value

    const isValidProbs = Boolean(normalizedProbs)
    const isValidMetrics = Boolean(normalizedMetrics)

    const validationError = probsResult.error ?? metricsResult.error

    const hasData = Boolean(isValidProbs && isValidMetrics)
    const isError = Boolean(probsQuery.isError || metricsQuery.isError || validationError)
    const error = probsQuery.error ?? metricsQuery.error ?? validationError

    const handleRetry = () => {
        probsQuery.refetch()
        metricsQuery.refetch()
    }

    return (
        <PageDataBoundary
            isError={isError}
            error={error}
            hasData={hasData}
            onRetry={handleRetry}
            errorTitle='Не удалось загрузить агрегацию прогнозов'>
            {hasData && normalizedProbs && normalizedMetrics && (
                <AggregationStatsPageInner className={className} probs={normalizedProbs} metrics={normalizedMetrics} />
            )}
        </PageDataBoundary>
    )
}

function normalizeProbsSnapshot(input: AggregationProbsSnapshotDto | undefined | null): {
    value: AggregationProbsSnapshotDto | null
    error: Error | null
} {
    if (!input) {
        return {
            value: null,
            error: new Error('Aggregation probs snapshot invalid: response is empty.')
        }
    }

    const raw = input as any
    const rawSegments = raw.Segments ?? raw.segments
    const rawDebugLastDays = raw.DebugLastDays ?? raw.debugLastDays

    const errors: string[] = []
    if (!Array.isArray(rawSegments)) errors.push('Segments missing')
    if (!Array.isArray(rawDebugLastDays)) errors.push('DebugLastDays missing')

    if (errors.length > 0) {
        return {
            value: null,
            error: new Error(`Aggregation probs snapshot invalid: ${errors.join('; ')}`)
        }
    }

    const segments = rawSegments.map((segment: any, index: number) =>
        normalizeProbsSegment(segment, index, errors)
    )
    const debugLastDays = rawDebugLastDays.map((row: any, index: number) =>
        normalizeDebugRow(row, index, errors)
    )

    if (errors.length > 0) {
        return {
            value: null,
            error: new Error(`Aggregation probs snapshot invalid: ${errors.join('; ')}`)
        }
    }

    return {
        value: {
            MinDateUtc: raw.MinDateUtc ?? raw.minDateUtc,
            MaxDateUtc: raw.MaxDateUtc ?? raw.maxDateUtc,
            TotalInputRecords: toNumberOrNaNWithError(
                raw.TotalInputRecords ?? raw.totalInputRecords,
                errors,
                'TotalInputRecords'
            ),
            ExcludedCount: toNumberOrNaNWithError(raw.ExcludedCount ?? raw.excludedCount, errors, 'ExcludedCount'),
            Segments: segments,
            DebugLastDays: debugLastDays
        },
        error: null
    }
}

function normalizeMetricsSnapshot(input: AggregationMetricsSnapshotDto | undefined | null): {
    value: AggregationMetricsSnapshotDto | null
    error: Error | null
} {
    if (!input) {
        return {
            value: null,
            error: new Error('Aggregation metrics snapshot invalid: response is empty.')
        }
    }

    const raw = input as any
    const rawSegments = raw.Segments ?? raw.segments

    if (!Array.isArray(rawSegments)) {
        return {
            value: null,
            error: new Error('Aggregation metrics snapshot invalid: Segments missing.')
        }
    }

    const errors: string[] = []
    const segments = rawSegments.map((segment: any, index: number) =>
        normalizeMetricsSegment(segment, index, errors)
    )

    if (errors.length > 0) {
        return {
            value: null,
            error: new Error(`Aggregation metrics snapshot invalid: ${errors.join('; ')}`)
        }
    }

    return {
        value: {
            TotalInputRecords: toNumberOrNaNWithError(
                raw.TotalInputRecords ?? raw.totalInputRecords,
                errors,
                'Metrics.TotalInputRecords'
            ),
            ExcludedCount: toNumberOrNaNWithError(
                raw.ExcludedCount ?? raw.excludedCount,
                errors,
                'Metrics.ExcludedCount'
            ),
            Segments: segments
        },
        error: null
    }
}

function normalizeMetricsSegment(
    segment: any,
    index: number,
    errors: string[]
): AggregationMetricsSnapshotDto['Segments'][number] {
    const segmentName = segment?.SegmentName ?? segment?.segmentName ?? `Segment#${index + 1}`
    const segmentLabel = segment?.SegmentLabel ?? segment?.segmentLabel ?? segmentName

    const day = normalizeLayerMetrics(segment?.Day ?? segment?.day, segmentName, 'Day', errors)
    const dayMicro = normalizeLayerMetrics(segment?.DayMicro ?? segment?.dayMicro, segmentName, 'DayMicro', errors)
    const total = normalizeLayerMetrics(segment?.Total ?? segment?.total, segmentName, 'Total', errors)

    return {
        SegmentName: segmentName,
        SegmentLabel: segmentLabel,
        FromDateUtc: segment?.FromDateUtc ?? segment?.fromDateUtc ?? null,
        ToDateUtc: segment?.ToDateUtc ?? segment?.toDateUtc ?? null,
        RecordsCount: toNumberOrNaNWithError(
            segment?.RecordsCount ?? segment?.recordsCount,
            errors,
            `${segmentName}.RecordsCount`
        ),
        Day: day,
        DayMicro: dayMicro,
        Total: total
    }
}

function normalizeProbsSegment(
    segment: any,
    index: number,
    errors: string[]
): AggregationProbsSnapshotDto['Segments'][number] {
    const segmentName = segment?.SegmentName ?? segment?.segmentName ?? `Segment#${index + 1}`
    const segmentLabel = segment?.SegmentLabel ?? segment?.segmentLabel ?? segmentName

    const day = normalizeLayerAvg(segment?.Day ?? segment?.day, segmentName, 'Day', errors)
    const dayMicro = normalizeLayerAvg(segment?.DayMicro ?? segment?.dayMicro, segmentName, 'DayMicro', errors)
    const total = normalizeLayerAvg(segment?.Total ?? segment?.total, segmentName, 'Total', errors)

    return {
        SegmentName: segmentName,
        SegmentLabel: segmentLabel,
        FromDateUtc: segment?.FromDateUtc ?? segment?.fromDateUtc ?? null,
        ToDateUtc: segment?.ToDateUtc ?? segment?.toDateUtc ?? null,
        RecordsCount: toNumberOrNaNWithError(
            segment?.RecordsCount ?? segment?.recordsCount,
            errors,
            `${segmentName}.RecordsCount`
        ),
        Day: day,
        DayMicro: dayMicro,
        Total: total,
        AvgConfDay: toNumberOrNaNWithError(
            segment?.AvgConfDay ?? segment?.avgConfDay,
            errors,
            `${segmentName}.AvgConfDay`
        ),
        AvgConfMicro: toNumberOrNaNWithError(
            segment?.AvgConfMicro ?? segment?.avgConfMicro,
            errors,
            `${segmentName}.AvgConfMicro`
        ),
        RecordsWithSlScore: toNumberOrNaNWithError(
            segment?.RecordsWithSlScore ?? segment?.recordsWithSlScore,
            errors,
            `${segmentName}.RecordsWithSlScore`
        )
    }
}

function normalizeLayerAvg(
    layer: any,
    segmentName: string,
    layerKey: string,
    errors: string[]
): AggregationProbsSnapshotDto['Segments'][number]['Day'] {
    if (!layer) {
        errors.push(`${segmentName}.${layerKey} missing`)
        return {
            PUp: Number.NaN,
            PFlat: Number.NaN,
            PDown: Number.NaN,
            Sum: Number.NaN
        }
    }

    return {
        PUp: toNumberOrNaNWithError(layer.PUp ?? layer.pUp, errors, `${segmentName}.${layerKey}.PUp`),
        PFlat: toNumberOrNaNWithError(layer.PFlat ?? layer.pFlat, errors, `${segmentName}.${layerKey}.PFlat`),
        PDown: toNumberOrNaNWithError(layer.PDown ?? layer.pDown, errors, `${segmentName}.${layerKey}.PDown`),
        Sum: toNumberOrNaNWithError(layer.Sum ?? layer.sum, errors, `${segmentName}.${layerKey}.Sum`)
    }
}

function normalizeDebugRow(
    row: any,
    index: number,
    errors: string[]
): AggregationProbsSnapshotDto['DebugLastDays'][number] {
    if (!row) {
        errors.push(`DebugLastDays[${index}] missing`)
        return {
            DateUtc: '',
            TrueLabel: Number.NaN,
            PredDay: Number.NaN,
            PredDayMicro: Number.NaN,
            PredTotal: Number.NaN,
            PDay: { Up: Number.NaN, Flat: Number.NaN, Down: Number.NaN },
            PDayMicro: { Up: Number.NaN, Flat: Number.NaN, Down: Number.NaN },
            PTotal: { Up: Number.NaN, Flat: Number.NaN, Down: Number.NaN },
            MicroUsed: false,
            SlUsed: false,
            MicroAgree: false,
            SlPenLong: false,
            SlPenShort: false
        }
    }

    const dateUtc = row.DateUtc ?? row.dateUtc ?? row.dateUTC ?? row.dateUtcKey ?? row.dateKey ?? ''
    const trueLabel = row.TrueLabel ?? row.trueLabel
    const predDay = row.PredDay ?? row.predDay
    const predDayMicro = row.PredDayMicro ?? row.predDayMicro
    const predTotal = row.PredTotal ?? row.predTotal

    if (!dateUtc) {
        errors.push(`DebugLastDays[${index}].DateUtc missing`)
    }

    if (
        typeof trueLabel === 'undefined' &&
        typeof predDay === 'undefined' &&
        typeof predDayMicro === 'undefined' &&
        typeof predTotal === 'undefined'
    ) {
        errors.push(`DebugLastDays[${index}] labels missing`)
    }

    const pDay = normalizeProb3(row.PDay ?? row.pDay, errors, `DebugLastDays[${index}].PDay`)
    const pDayMicro = normalizeProb3(
        row.PDayMicro ?? row.pDayMicro,
        errors,
        `DebugLastDays[${index}].PDayMicro`
    )
    const pTotal = normalizeProb3(row.PTotal ?? row.pTotal, errors, `DebugLastDays[${index}].PTotal`)

    const microUsed = requireBool(
        toBoolOrNull(row.MicroUsed ?? row.microUsed),
        errors,
        `DebugLastDays[${index}].MicroUsed`
    )
    const slUsed = requireBool(
        toBoolOrNull(row.SlUsed ?? row.slUsed),
        errors,
        `DebugLastDays[${index}].SlUsed`
    )
    const microAgree = requireBool(
        toBoolOrNull(row.MicroAgree ?? row.microAgree),
        errors,
        `DebugLastDays[${index}].MicroAgree`
    )
    const slPenLong = requireBool(
        toBoolOrNull(row.SlPenLong ?? row.slPenLong),
        errors,
        `DebugLastDays[${index}].SlPenLong`
    )
    const slPenShort = requireBool(
        toBoolOrNull(row.SlPenShort ?? row.slPenShort),
        errors,
        `DebugLastDays[${index}].SlPenShort`
    )

    return {
        DateUtc: dateUtc,
        TrueLabel: trueLabel,
        PredDay: predDay,
        PredDayMicro: predDayMicro,
        PredTotal: predTotal,
        PDay: pDay,
        PDayMicro: pDayMicro,
        PTotal: pTotal,
        MicroUsed: microUsed,
        SlUsed: slUsed,
        MicroAgree: microAgree,
        SlPenLong: slPenLong,
        SlPenShort: slPenShort
    }
}

function normalizeLayerMetrics(
    layer: any,
    segmentName: string,
    layerKey: string,
    errors: string[]
): AggregationMetricsSnapshotDto['Segments'][number]['Day'] {
    if (!layer) {
        errors.push(`${segmentName}.${layerKey} missing`)
        return {
            LayerName: layerKey,
            Confusion: [],
            N: Number.NaN,
            Correct: Number.NaN,
            Accuracy: Number.NaN,
            MicroF1: Number.NaN,
            LogLoss: Number.NaN,
            InvalidForLogLoss: Number.NaN,
            ValidForLogLoss: Number.NaN
        }
    }

    const confusion = normalizeConfusionMatrix(
        layer.Confusion ?? layer.confusion,
        errors,
        `${segmentName}.${layerKey}.Confusion`
    )

    return {
        LayerName: layer.LayerName ?? layer.layerName ?? layerKey,
        Confusion: confusion,
        N: toNumberOrNaNWithError(layer.N ?? layer.n, errors, `${segmentName}.${layerKey}.N`),
        Correct: toNumberOrNaNWithError(layer.Correct ?? layer.correct, errors, `${segmentName}.${layerKey}.Correct`),
        Accuracy: toNumberOrNaNWithError(layer.Accuracy ?? layer.accuracy, errors, `${segmentName}.${layerKey}.Accuracy`),
        MicroF1: toNumberOrNaNWithError(layer.MicroF1 ?? layer.microF1, errors, `${segmentName}.${layerKey}.MicroF1`),
        LogLoss: toNumberOrNaNWithError(layer.LogLoss ?? layer.logLoss, errors, `${segmentName}.${layerKey}.LogLoss`),
        InvalidForLogLoss: toNumberOrNaNWithError(
            layer.InvalidForLogLoss ?? layer.invalidForLogLoss,
            errors,
            `${segmentName}.${layerKey}.InvalidForLogLoss`
        ),
        ValidForLogLoss: toNumberOrNaNWithError(
            layer.ValidForLogLoss ?? layer.validForLogLoss,
            errors,
            `${segmentName}.${layerKey}.ValidForLogLoss`
        )
    }
}

function toNumberOrNaN(value: unknown): number {
    return typeof value === 'number' && Number.isFinite(value) ? value : Number.NaN
}

function toNumberOrNaNWithError(value: unknown, errors: string[], label: string): number {
    const num = toNumberOrNaN(value)
    if (!Number.isFinite(num)) {
        errors.push(`${label} missing or invalid`)
    }
    return num
}

function toBoolOrNull(value: unknown): boolean | null {
    if (value === true) return true
    if (value === false) return false
    return null
}

function requireBool(value: boolean | null, errors: string[], label: string): boolean {
    if (value === null) {
        errors.push(`${label} missing`)
        return false
    }
    return value
}

function normalizeProb3(
    value: any,
    errors: string[],
    label: string
): { Up: number; Flat: number; Down: number; Sum?: number } {
    if (!value || typeof value !== 'object') {
        errors.push(`${label} missing`)
        return { Up: Number.NaN, Flat: Number.NaN, Down: Number.NaN, Sum: Number.NaN }
    }

    const up = toNumberOrNaN(value.Up ?? value.up ?? value.PUp ?? value.pUp)
    const flat = toNumberOrNaN(value.Flat ?? value.flat ?? value.PFlat ?? value.pFlat)
    const down = toNumberOrNaN(value.Down ?? value.down ?? value.PDown ?? value.pDown)
    const sumRaw = toNumberOrNaN(value.Sum ?? value.sum)
    const sum = Number.isFinite(sumRaw) ? sumRaw : up + flat + down

    if (!Number.isFinite(up)) errors.push(`${label}.Up missing or invalid`)
    if (!Number.isFinite(flat)) errors.push(`${label}.Flat missing or invalid`)
    if (!Number.isFinite(down)) errors.push(`${label}.Down missing or invalid`)
    if (!Number.isFinite(sum)) errors.push(`${label}.Sum missing or invalid`)
    if (Number.isFinite(sum) && sum <= 0.0)
        errors.push(`${label}.Sum <= 0 (up=${up}, flat=${flat}, down=${down})`)

    if (!Number.isFinite(up) && !Number.isFinite(flat) && !Number.isFinite(down)) {
        errors.push(`${label} invalid`)
    }

    return { Up: up, Flat: flat, Down: down, Sum: sum }
}

function normalizeConfusionMatrix(
    value: any,
    errors: string[],
    label: string
): number[][] {
    if (!Array.isArray(value)) {
        errors.push(`${label} missing or invalid`)
        return [
            [Number.NaN, Number.NaN, Number.NaN],
            [Number.NaN, Number.NaN, Number.NaN],
            [Number.NaN, Number.NaN, Number.NaN]
        ]
    }

    const rows: number[][] = []
    if (value.length !== 3) {
        errors.push(`${label} must have 3 rows`)
    }

    for (let r = 0; r < 3; r++) {
        const row = Array.isArray(value[r]) ? value[r] : []
        if (!Array.isArray(value[r]) || row.length !== 3) {
            errors.push(`${label}[${r}] must have 3 columns`)
        }

        const parsedRow: number[] = []
        for (let c = 0; c < 3; c++) {
            const cell = toNumberOrNaNWithError(row[c], errors, `${label}[${r}][${c}]`)
            parsedRow.push(cell)
        }

        rows.push(parsedRow)
    }

    return rows
}
