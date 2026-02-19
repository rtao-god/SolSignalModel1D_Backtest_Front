import type { TableSectionDto } from '@/shared/types/report.types'
import {
    normalizePolicyBranchMegaTitle,
    resolvePolicyBranchMegaBucketFromTitle,
    type PolicyBranchMegaBucketMode,
    type PolicyBranchMegaMetricMode,
    type PolicyBranchMegaTpSlMode,
    type PolicyBranchMegaZonalMode
} from '@/shared/utils/policyBranchMegaTabs'

export const DEFAULT_REPORT_BUCKET_MODE: PolicyBranchMegaBucketMode = 'daily'
export const DEFAULT_REPORT_METRIC_MODE: PolicyBranchMegaMetricMode = 'real'
export const DEFAULT_REPORT_TP_SL_MODE: PolicyBranchMegaTpSlMode = 'dynamic'
export const DEFAULT_REPORT_ZONAL_MODE: PolicyBranchMegaZonalMode = 'with-zonal'

const TP_SL_PART1_REQUIRED_COLUMNS = [
    'Policy',
    'Branch',
    'Days',
    'Tr',
    'TotalPnl%',
    'DynTP/SL Days',
    'DynTP/SL Tr',
    'DynTP/SL PnL%',
    'StatTP/SL Days',
    'StatTP/SL Tr',
    'StatTP/SL PnL%'
]

export interface ReportViewCapabilities {
    supportsBucketFiltering: boolean
    supportsMetricFiltering: boolean
    supportsTpSlFiltering: boolean
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

function hasTpSlColumns(columns: string[] | undefined): boolean {
    if (!columns || columns.length === 0) {
        return false
    }

    return TP_SL_PART1_REQUIRED_COLUMNS.every(column => columns.includes(column))
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
    const zonalValues = new Set<PolicyBranchMegaZonalMode>()
    for (const section of sections) {
        const bucket = resolvePolicyBranchMegaBucketFromTitle(section.title)
        if (bucket !== null) {
            bucketValues.add(bucket)
        }

        if (section.metadata?.kind === 'policy-branch-mega' && section.metadata.zonalMode) {
            zonalValues.add(section.metadata.zonalMode)
        }
    }

    const supportsBucketFiltering = bucketValues.size > 1

    const explicitMetricTagCount = sections.filter(section => hasExplicitMetricTag(section.title)).length
    const supportsMetricFiltering = explicitMetricTagCount > 0

    const supportsTpSlFiltering = sections.some(section => hasTpSlColumns(section.columns))

    return {
        supportsBucketFiltering,
        supportsMetricFiltering,
        supportsTpSlFiltering,
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
        throw new Error(
            `[${contextTag}] TP/SL mode switch is not supported for this report. requested=${selection.tpSl}.`
        )
    }
}
