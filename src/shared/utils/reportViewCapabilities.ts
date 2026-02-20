import type { TableSectionDto } from '@/shared/types/report.types'
import {
    normalizePolicyBranchMegaTitle,
    resolvePolicyBranchMegaBucketFromTitle,
    resolvePolicyBranchMegaModeFromTitle,
    type PolicyBranchMegaBucketMode,
    type PolicyBranchMegaMetricMode,
    type PolicyBranchMegaSlMode,
    type PolicyBranchMegaTpSlMode,
    type PolicyBranchMegaZonalMode
} from '@/shared/utils/policyBranchMegaTabs'

export const DEFAULT_REPORT_BUCKET_MODE: PolicyBranchMegaBucketMode = 'daily'
export const DEFAULT_REPORT_METRIC_MODE: PolicyBranchMegaMetricMode = 'real'
export const DEFAULT_REPORT_TP_SL_MODE: PolicyBranchMegaTpSlMode = 'all'
export const DEFAULT_REPORT_SL_MODE: PolicyBranchMegaSlMode = 'all'
export const DEFAULT_REPORT_ZONAL_MODE: PolicyBranchMegaZonalMode = 'with-zonal'

export interface ReportViewCapabilities {
    supportsBucketFiltering: boolean
    supportsMetricFiltering: boolean
    supportsTpSlFiltering: boolean
    supportsSlModeFiltering?: boolean
    supportsZonalFiltering?: boolean
}

export interface ReportViewSelection {
    bucket: PolicyBranchMegaBucketMode
    metric: PolicyBranchMegaMetricMode
    tpSl: PolicyBranchMegaTpSlMode
}

function hasExplicitMetricTag(title: string | undefined): boolean {
    const normalized = normalizePolicyBranchMegaTitle(title).toUpperCase()
    if (!normalized) return false

    return normalized.includes('NO BIGGEST LIQ LOSS') || normalized.includes('[REAL]')
}

export function resolveReportViewCapabilities(sections: TableSectionDto[]): ReportViewCapabilities {
    if (!sections || sections.length === 0) {
        return {
            supportsBucketFiltering: false,
            supportsMetricFiltering: false,
            supportsTpSlFiltering: false,
            supportsZonalFiltering: false
        }
    }

    const bucketValues = new Set<PolicyBranchMegaBucketMode>()
    const slModeValues = new Set<PolicyBranchMegaSlMode>()
    const tpSlValues = new Set<PolicyBranchMegaTpSlMode>()
    const zonalValues = new Set<PolicyBranchMegaZonalMode>()
    for (const section of sections) {
        const bucket = resolvePolicyBranchMegaBucketFromTitle(section.title)
        if (bucket !== null) {
            bucketValues.add(bucket)
        }

        const metadataMode = section.metadata?.kind === 'policy-branch-mega' ? (section.metadata.mode ?? null) : null
        if (metadataMode) {
            slModeValues.add(metadataMode)
        } else {
            const modeFromTitle = resolvePolicyBranchMegaModeFromTitle(section.title)
            if (modeFromTitle !== null) {
                slModeValues.add(modeFromTitle)
            }
        }

        if (section.metadata?.kind === 'policy-branch-mega' && section.metadata.zonalMode) {
            zonalValues.add(section.metadata.zonalMode)
        }

        if (section.metadata?.kind === 'policy-branch-mega' && section.metadata.tpSlMode) {
            tpSlValues.add(section.metadata.tpSlMode)
        }
    }

    const supportsBucketFiltering = bucketValues.size > 1

    const explicitMetricTagCount = sections.filter(section => hasExplicitMetricTag(section.title)).length
    const supportsMetricFiltering = explicitMetricTagCount > 0

    // TP/SL-срез включаем только когда все секции относятся к policy-branch-mega
    // и backend явно вернул полный набор tp/sl режимов через metadata.tpSlMode.
    const policyMegaSections = sections.filter(section => section.metadata?.kind === 'policy-branch-mega').length
    const hasFullTpSlCoverage =
        tpSlValues.has('all') &&
        tpSlValues.has('dynamic') &&
        tpSlValues.has('static')
    const supportsTpSlFiltering = policyMegaSections === sections.length && hasFullTpSlCoverage

    return {
        supportsBucketFiltering,
        supportsMetricFiltering,
        supportsTpSlFiltering,
        supportsSlModeFiltering: slModeValues.size > 1,
        supportsZonalFiltering: zonalValues.size > 1
    }
}

export function validateReportViewSelectionOrThrow(
    selection: ReportViewSelection,
    capabilities: ReportViewCapabilities,
    contextTag: string
) {
    if (!capabilities.supportsBucketFiltering && selection.bucket !== DEFAULT_REPORT_BUCKET_MODE) {
        throw new Error(
            `[${contextTag}] bucket filter is not supported for this report. requested=${selection.bucket}.`
        )
    }

    if (!capabilities.supportsMetricFiltering && selection.metric !== DEFAULT_REPORT_METRIC_MODE) {
        throw new Error(
            `[${contextTag}] metric mode switch is not supported for this report. requested=${selection.metric}.`
        )
    }

    if (!capabilities.supportsTpSlFiltering && selection.tpSl !== DEFAULT_REPORT_TP_SL_MODE) {
        throw new Error(`[${contextTag}] tpsl mode switch is not supported for this report. requested=${selection.tpSl}.`)
    }
}
