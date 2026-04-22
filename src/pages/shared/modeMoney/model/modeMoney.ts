import {
    getDefaultModeReportSlice,
    tryGetModeRegistryMode,
    tryGetModeReportSliceDescriptor,
    type ModeId,
    type ModeRegistryDto,
    type ReportSliceId
} from '@/entities/mode'
import type {
    BestPolicyContractDto,
    BestPolicyPerMarginModeDto
} from '@/shared/api/tanstackQueries/walkForwardModes'
import type {
    CompletePolicyPerformanceMetricsDto,
    PolicyPerformanceMetricDescriptorDto,
    PolicyBranchMegaModeMoneySummaryRowDto
} from '@/shared/api/tanstackQueries/policyBranchMega'
import type { PolicyPerformanceMetricsDto } from '@/shared/types/policyPerformanceMetrics.types'

export interface ModeMoneyBlocksData {
    policyName: string
    policyBranch: string
    bucket: string | null
    sliceLabel: string | null
    executionLabel: string | null
    scoreValue: number | null
    evaluationStatus: string | null
    metrics: PolicyPerformanceMetricsDto
    metricDescriptors: readonly PolicyPerformanceMetricDescriptorDto[]
}

export const MODE_MONEY_EFFECTIVE_MAX_DD_METRIC_KEY = 'EffectiveMaxDdPct'

export function resolveModeMoneyMetricLabel(
    descriptors: readonly PolicyPerformanceMetricDescriptorDto[] | null | undefined,
    metricKey: string
): string {
    const descriptor = descriptors?.find(item => item.metricKey === metricKey)
    if (!descriptor?.displayLabel.trim()) {
        throw new Error(
            `[mode-money] money metric descriptor is missing. owner=PolicyPerformanceMetricCatalog; expected=descriptor for ${metricKey}; actual=absent; requiredAction=rebuild backend mode money summary and pass moneyMetricDescriptors to the money block renderer.`
        )
    }

    return descriptor.displayLabel
}

export function resolveBestPolicyContract(perMarginMode: BestPolicyPerMarginModeDto | null | undefined): BestPolicyContractDto | null {
    const cross = perMarginMode?.cross ?? null
    const isolated = perMarginMode?.isolated ?? null

    if (!cross) {
        return isolated
    }

    if (!isolated) {
        return cross
    }

    return cross.score.value >= isolated.score.value ? cross : isolated
}

export function resolveMoneySliceByReportSlice<TSlice extends { slice: ReportSliceId }>(
    slices: TSlice[] | null | undefined,
    reportSlice: ReportSliceId
): TSlice | null {
    if (!slices || slices.length === 0) {
        return null
    }

    return slices.find(slice => slice.slice === reportSlice) ?? null
}

export function resolveModeMoneySlice(
    modeRegistry: ModeRegistryDto | null | undefined,
    mode: ModeId,
    requestedSlice?: ReportSliceId | null
): ReportSliceId | null {
    if (requestedSlice) {
        return requestedSlice
    }

    if (!modeRegistry || !tryGetModeRegistryMode(modeRegistry, mode)) {
        return null
    }

    return getDefaultModeReportSlice(modeRegistry, mode)
}

export function selectModeMoneySummaryRow(
    rows: readonly PolicyBranchMegaModeMoneySummaryRowDto[] | null | undefined,
    mode: ModeId,
    slice: ReportSliceId | null
): PolicyBranchMegaModeMoneySummaryRowDto | null {
    if (!rows || rows.length === 0 || !slice) {
        return null
    }

    return rows.find(row => row.modeKey === mode && row.sliceKey === slice) ?? null
}

export function resolveModeMoneySliceLabel(
    modeRegistry: ModeRegistryDto | null | undefined,
    mode: ModeId,
    slice: ReportSliceId | null
): string | null {
    if (!slice) {
        return null
    }

    if (!modeRegistry) {
        return slice
    }

    return tryGetModeReportSliceDescriptor(modeRegistry, mode, slice)?.displayLabel ?? slice
}

export function buildModeMoneyDataFromWalkForwardBestPolicy(
    bestPolicy: BestPolicyContractDto,
    sliceLabel: string | null,
    metricDescriptors: readonly PolicyPerformanceMetricDescriptorDto[]
): ModeMoneyBlocksData {
    return {
        policyName: bestPolicy.policyName,
        policyBranch: bestPolicy.policyBranch,
        bucket: bestPolicy.bucket,
        sliceLabel,
        executionLabel: null,
        scoreValue: bestPolicy.score.value,
        evaluationStatus: bestPolicy.evaluation.status,
        metrics: bestPolicy.metrics,
        metricDescriptors
    }
}

export function buildModeMoneyDataFromMegaSummaryRow(
    row: PolicyBranchMegaModeMoneySummaryRowDto,
    sliceLabel: string | null,
    metricDescriptors: readonly PolicyPerformanceMetricDescriptorDto[]
): ModeMoneyBlocksData {
    return {
        policyName: row.policyName,
        policyBranch: row.policyBranch,
        bucket: null,
        sliceLabel,
        executionLabel: row.executionDescriptor,
        scoreValue: null,
        evaluationStatus: null,
        metrics: row.moneyMetrics as CompletePolicyPerformanceMetricsDto,
        metricDescriptors
    }
}
