import type {
    BacktestBaselineSnapshotDto,
    BacktestPolicySummaryDto
} from '@/shared/types/backtest.types'
import type { PolicyRatiosPerPolicyDto, PolicyRatiosReportDto } from '@/shared/types/policyRatios.types'
import type {
    BacktestHistorySliceDto,
    CapturedMegaBucketDto,
    CapturedMegaMetricVariantDto,
    CapturedMegaModeDto,
    CapturedMegaTpSlModeDto,
    CapturedMegaZonalModeDto,
    CapturedTableKindDto,
    CapturedTableMetadataDto,
    ReportDocumentDto,
    ReportSectionDto
} from '@/shared/types/report.types'
import type {
    PolicyEvaluationDto,
    PolicyEvaluationMetricsDto,
    PolicyEvaluationReasonDto,
    PolicyEvaluationThresholdsDto
} from '@/shared/types/policyEvaluation.types'
import { mapPolicyPerformanceMetricsResponse } from './mapPolicyPerformanceMetrics'
import {
    reportHistorySliceCodec,
    reportMegaBucketCodec,
    reportMegaMetricVariantCodec,
    reportMegaModeCodec,
    reportMegaTpSlModeCodec,
    reportMegaZonalModeCodec,
    reportTableKindCodec
} from '@/shared/api/contracts/reportWireEnumCodec'

function toString(value: unknown, label: string): string {
    if (value === null || typeof value === 'undefined') {
        throw new Error(`[ui] Missing report field (${label}).`)
    }
    return String(value)
}

function toOptionalStringOrUndefined(value: unknown): string | undefined {
    if (value === null || typeof value === 'undefined') {
        return undefined
    }

    const normalized = String(value).trim()
    return normalized.length > 0 ? normalized : undefined
}

function toObject(value: unknown, label: string): Record<string, unknown> {
    if (!value || typeof value !== 'object' || Array.isArray(value)) {
        throw new Error(`[ui] ${label} must be an object.`)
    }

    return value as Record<string, unknown>
}

function toNullableNumber(value: unknown, label: string): number | null {
    if (value === null || typeof value === 'undefined') {
        return null
    }

    if (typeof value === 'number' && Number.isFinite(value)) {
        return value
    }

    throw new Error(`[ui] ${label} must be a finite number or null.`)
}

function toRequiredNumber(value: unknown, label: string): number {
    const parsed = toNullableNumber(value, label)
    if (parsed === null) {
        throw new Error(`[ui] ${label} must be a finite number.`)
    }

    return parsed
}

function toNullableInteger(value: unknown, label: string): number | null {
    const parsed = toNullableNumber(value, label)
    if (parsed === null) {
        return null
    }

    if (!Number.isInteger(parsed)) {
        throw new Error(`[ui] ${label} must be an integer or null.`)
    }

    return parsed
}

function toNullableBoolean(value: unknown, label: string): boolean | null {
    if (value === null || typeof value === 'undefined') {
        return null
    }

    if (typeof value === 'boolean') {
        return value
    }

    throw new Error(`[ui] ${label} must be a boolean or null.`)
}

function toRequiredBoolean(value: unknown, label: string): boolean {
    const parsed = toNullableBoolean(value, label)
    if (parsed === null) {
        throw new Error(`[ui] ${label} must be a boolean.`)
    }

    return parsed
}

function mapPolicyEvaluationReasonResponse(raw: unknown, label: string): PolicyEvaluationReasonDto {
    const payload = toObject(raw, label)

    return {
        code: toString(payload.code, `${label}.code`),
        message: toString(payload.message, `${label}.message`)
    }
}

function mapPolicyEvaluationThresholdsResponse(raw: unknown, label: string): PolicyEvaluationThresholdsDto {
    const payload = toObject(raw, label)

    return {
        maxDrawdownPct: toRequiredNumber(payload.maxDrawdownPct, `${label}.maxDrawdownPct`),
        minTradesCount: parsePositiveInt(payload.minTradesCount, `${label}.minTradesCount`),
        minCalmar: toRequiredNumber(payload.minCalmar, `${label}.minCalmar`),
        minSortino: toRequiredNumber(payload.minSortino, `${label}.minSortino`)
    }
}

function mapPolicyEvaluationMetricsResponse(raw: unknown, label: string): PolicyEvaluationMetricsDto {
    const payload = toObject(raw, label)

    return {
        marginMode: toOptionalStringOrUndefined(payload.marginMode) ?? null,
        totalPnlPct: toNullableNumber(payload.totalPnlPct, `${label}.totalPnlPct`),
        maxDdPct: toNullableNumber(payload.maxDdPct, `${label}.maxDdPct`),
        maxDdNoLiqPct: toNullableNumber(payload.maxDdNoLiqPct, `${label}.maxDdNoLiqPct`),
        effectiveMaxDdPct: toNullableNumber(payload.effectiveMaxDdPct, `${label}.effectiveMaxDdPct`),
        hadLiquidation: toNullableBoolean(payload.hadLiquidation, `${label}.hadLiquidation`),
        realLiquidationCount: toNullableInteger(payload.realLiquidationCount, `${label}.realLiquidationCount`),
        accountRuinCount: toNullableInteger(payload.accountRuinCount, `${label}.accountRuinCount`),
        balanceDead: toNullableBoolean(payload.balanceDead, `${label}.balanceDead`),
        tradesCount: toNullableInteger(payload.tradesCount, `${label}.tradesCount`),
        calmar: toNullableNumber(payload.calmar, `${label}.calmar`),
        sortino: toNullableNumber(payload.sortino, `${label}.sortino`)
    }
}

function mapPolicyEvaluationResponse(raw: unknown, label: string): PolicyEvaluationDto | null {
    if (raw === null || typeof raw === 'undefined') {
        return null
    }

    const payload = toObject(raw, label)

    return {
        profileId: toString(payload.profileId, `${label}.profileId`),
        policySetupId: toOptionalStringOrUndefined(payload.policySetupId) ?? null,
        status: toString(payload.status, `${label}.status`) as PolicyEvaluationDto['status'],
        reasons:
            Array.isArray(payload.reasons) ?
                payload.reasons.map((item: unknown, index: number) =>
                    mapPolicyEvaluationReasonResponse(item, `${label}.reasons[${index}]`)
                )
            :   [],
        thresholds:
            payload.thresholds === null || typeof payload.thresholds === 'undefined' ?
                null
            :   mapPolicyEvaluationThresholdsResponse(payload.thresholds, `${label}.thresholds`),
        metrics: mapPolicyEvaluationMetricsResponse(payload.metrics ?? {}, `${label}.metrics`)
    }
}

function parseTableKind(raw: unknown, label: string): CapturedTableKindDto {
    return reportTableKindCodec.parse(raw, label)
}

function parseMegaMode(raw: unknown, label: string): CapturedMegaModeDto {
    return reportMegaModeCodec.parse(raw, label)
}

function parseBacktestHistorySlice(raw: unknown, label: string): BacktestHistorySliceDto {
    return reportHistorySliceCodec.parse(raw, label)
}

function parseMegaTpSlMode(raw: unknown, label: string): CapturedMegaTpSlModeDto {
    return reportMegaTpSlModeCodec.parse(raw, label)
}

function parseMegaZonalMode(raw: unknown, label: string): CapturedMegaZonalModeDto {
    return reportMegaZonalModeCodec.parse(raw, label)
}

function parseMegaMetricVariant(raw: unknown, label: string): CapturedMegaMetricVariantDto {
    return reportMegaMetricVariantCodec.parse(raw, label)
}

function parseMegaBucket(raw: unknown, label: string): CapturedMegaBucketDto {
    return reportMegaBucketCodec.parse(raw, label)
}

function parsePositiveInt(raw: unknown, label: string): number {
    if (typeof raw === 'number' && Number.isFinite(raw) && Number.isInteger(raw) && raw > 0) {
        return raw
    }

    if (typeof raw === 'string') {
        const normalized = raw.trim()
        if (normalized.length > 0) {
            const parsed = Number(normalized)
            if (Number.isFinite(parsed) && Number.isInteger(parsed) && parsed > 0) {
                return parsed
            }
        }
    }

    throw new Error(`[ui] ${label} must be a positive integer. value=${String(raw)}.`)
}

function mapBacktestPolicySummaryResponse(raw: unknown, label: string): BacktestPolicySummaryDto {
    const payload = toObject(raw, label)

    return {
        policyName: toString(payload.policyName, `${label}.policyName`),
        marginMode: toString(payload.marginMode, `${label}.marginMode`),
        useAntiDirectionOverlay: toRequiredBoolean(
            payload.useAntiDirectionOverlay,
            `${label}.useAntiDirectionOverlay`
        ),
        performanceMetrics: mapPolicyPerformanceMetricsResponse(payload.performanceMetrics, {
            owner: 'ui',
            label: `${label}.performanceMetrics`
        }),
        evaluation: mapPolicyEvaluationResponse(payload.evaluation, `${label}.evaluation`)
    }
}

export function mapBacktestBaselineSnapshotResponse(raw: unknown): BacktestBaselineSnapshotDto {
    const payload = toObject(raw, 'BacktestBaselineSnapshot')

    if (!Array.isArray(payload.policies)) {
        throw new Error('[ui] BacktestBaselineSnapshot.policies must be an array.')
    }

    return {
        id: toString(payload.id, 'BacktestBaselineSnapshot.id'),
        generatedAtUtc: toString(payload.generatedAtUtc, 'BacktestBaselineSnapshot.generatedAtUtc'),
        configName: toString(payload.configName, 'BacktestBaselineSnapshot.configName'),
        dailyStopPct: toRequiredNumber(payload.dailyStopPct, 'BacktestBaselineSnapshot.dailyStopPct'),
        dailyTpPct: toRequiredNumber(payload.dailyTpPct, 'BacktestBaselineSnapshot.dailyTpPct'),
        policies: payload.policies.map((policy, index) =>
            mapBacktestPolicySummaryResponse(policy, `BacktestBaselineSnapshot.policies[${index}]`)
        )
    }
}

function mapPolicyRatiosPolicyResponse(raw: unknown, label: string): PolicyRatiosPerPolicyDto {
    const payload = toObject(raw, label)

    return {
        policyName: toString(payload.policyName, `${label}.policyName`),
        bucket: toString(payload.bucket, `${label}.bucket`),
        marginMode: toOptionalStringOrUndefined(payload.marginMode) ?? null,
        performanceMetrics: mapPolicyPerformanceMetricsResponse(payload.performanceMetrics, {
            owner: 'ui',
            label: `${label}.performanceMetrics`
        }),
        evaluation: mapPolicyEvaluationResponse(payload.evaluation, `${label}.evaluation`)
    }
}

export function mapPolicyRatiosReportResponse(raw: unknown): PolicyRatiosReportDto {
    const payload = toObject(raw, 'PolicyRatiosReport')

    if (!Array.isArray(payload.policies)) {
        throw new Error('[ui] PolicyRatiosReport.policies must be an array.')
    }

    return {
        backtestId: toString(payload.backtestId, 'PolicyRatiosReport.backtestId'),
        fromDateUtc: toOptionalStringOrUndefined(payload.fromDateUtc) ?? null,
        toDateUtc: toOptionalStringOrUndefined(payload.toDateUtc) ?? null,
        policies: payload.policies.map((policy, index) =>
            mapPolicyRatiosPolicyResponse(policy, `PolicyRatiosReport.policies[${index}]`)
        )
    }
}

function mapSectionMetadata(
    raw: unknown,
    sectionTitle: string
): CapturedTableMetadataDto | undefined {
    if (raw === null || typeof raw === 'undefined') {
        return undefined
    }

    const payload = toObject(raw, `ReportSection.metadata (${sectionTitle})`)
    const kind = parseTableKind(payload.kind, `ReportSection.metadata.kind (${sectionTitle})`)

    const metadata: CapturedTableMetadataDto = {
        kind
    }

    const historySliceLabel = `ReportSection.metadata.historySlice (${sectionTitle})`
    const modeLabel = `ReportSection.metadata.mode (${sectionTitle})`
    const tpSlModeLabel = `ReportSection.metadata.tpSlMode (${sectionTitle})`
    const zonalModeLabel = `ReportSection.metadata.zonalMode (${sectionTitle})`
    const metricVariantLabel = `ReportSection.metadata.metricVariant (${sectionTitle})`
    const bucketLabel = `ReportSection.metadata.bucket (${sectionTitle})`
    const partLabel = `ReportSection.metadata.part (${sectionTitle})`

    if (payload.historySlice !== null && typeof payload.historySlice !== 'undefined') {
        metadata.historySlice = parseBacktestHistorySlice(payload.historySlice, historySliceLabel)
    } else if (kind === 'policy-branch-mega') {
        throw new Error(`[ui] ${historySliceLabel} is missing.`)
    }

    if (payload.mode !== null && typeof payload.mode !== 'undefined') {
        metadata.mode = parseMegaMode(payload.mode, modeLabel)
    } else if (kind === 'policy-branch-mega') {
        throw new Error(`[ui] ${modeLabel} is missing.`)
    }

    if (payload.tpSlMode !== null && typeof payload.tpSlMode !== 'undefined') {
        metadata.tpSlMode = parseMegaTpSlMode(payload.tpSlMode, tpSlModeLabel)
    } else if (kind === 'policy-branch-mega') {
        throw new Error(`[ui] ${tpSlModeLabel} is missing.`)
    }

    if (payload.zonalMode !== null && typeof payload.zonalMode !== 'undefined') {
        metadata.zonalMode = parseMegaZonalMode(payload.zonalMode, zonalModeLabel)
    } else if (kind === 'policy-branch-mega') {
        throw new Error(`[ui] ${zonalModeLabel} is missing.`)
    }

    if (payload.metricVariant !== null && typeof payload.metricVariant !== 'undefined') {
        metadata.metricVariant = parseMegaMetricVariant(payload.metricVariant, metricVariantLabel)
    } else if (kind === 'policy-branch-mega') {
        throw new Error(`[ui] ${metricVariantLabel} is missing.`)
    }

    if (payload.bucket !== null && typeof payload.bucket !== 'undefined') {
        metadata.bucket = parseMegaBucket(payload.bucket, bucketLabel)
    } else if (kind === 'policy-branch-mega') {
        throw new Error(`[ui] ${bucketLabel} is missing.`)
    }

    if (payload.part !== null && typeof payload.part !== 'undefined') {
        metadata.part = parsePositiveInt(payload.part, partLabel)
    } else if (kind === 'policy-branch-mega') {
        throw new Error(`[ui] ${partLabel} is missing.`)
    }

    return metadata
}

export function mapReportResponse(response: unknown): ReportDocumentDto {
    const raw: any = response
    const sections: ReportSectionDto[] = []

    if (Array.isArray(raw?.keyValueSections)) {
        for (const kv of raw.keyValueSections) {
            const title = toString(kv?.title, 'KeyValueSection.title')
            sections.push({
                sectionKey: toOptionalStringOrUndefined(kv?.sectionKey),
                title,
                metadata: mapSectionMetadata(kv?.metadata, title),
                items:
                    Array.isArray(kv?.items) ?
                        kv.items.map((it: any) => ({
                            itemKey: toOptionalStringOrUndefined(it?.itemKey),
                            key: toString(it?.key, 'KeyValueSection.item.key'),
                            value: toString(it?.value, 'KeyValueSection.item.value')
                        }))
                    :   []
            })
        }
    }

    if (Array.isArray(raw?.tableSections)) {
        for (const tbl of raw.tableSections) {
            const title = toString(tbl?.title, 'TableSection.title')

            sections.push({
                sectionKey: toOptionalStringOrUndefined(tbl?.sectionKey),
                title,
                columns:
                    Array.isArray(tbl?.columns) ?
                        tbl.columns.map((c: any, idx: number) => toString(c, `TableSection.columns[${idx}]`))
                    :   [],
                columnKeys:
                    Array.isArray(tbl?.columnKeys) ?
                        tbl.columnKeys.map((key: any, idx: number) => toString(key, `TableSection.columnKeys[${idx}]`))
                    :   undefined,
                rows:
                    Array.isArray(tbl?.rows) ?
                        tbl.rows.map((row: any) =>
                            Array.isArray(row) ?
                                row.map((cell: any, idx: number) => toString(cell, `TableSection.row.cell[${idx}]`))
                            :   []
                        )
                    :   [],
                rowEvaluations:
                    Array.isArray(tbl?.rowEvaluations) ?
                        tbl.rowEvaluations.map((item: unknown, index: number) =>
                            mapPolicyEvaluationResponse(item, `TableSection.rowEvaluations[${index}]`)
                        )
                    :   [],
                metadata: mapSectionMetadata(tbl?.metadata, title)
            })
        }
    }

    return {
        schemaVersion: parsePositiveInt(raw?.schemaVersion, 'Report.schemaVersion'),
        id: toString(raw?.id, 'Report.id'),
        kind: toString(raw?.kind, 'Report.kind'),
        title: toString(raw?.title, 'Report.title'),
        titleKey: toOptionalStringOrUndefined(raw?.titleKey),
        generatedAtUtc: toString(raw?.generatedAtUtc, 'Report.generatedAtUtc'),
        sections
    }
}
