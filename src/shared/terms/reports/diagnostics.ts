import { resolveCommonReportColumnTooltipOrNull } from '@/shared/terms/common'

export const DIAGNOSTICS_SHARED_TERM_KEYS = Object.freeze([
    'Policy',
    'Branch',
    'Bucket',
    'SL Mode',
    'AccRuin',
    'Recovered',
    'RecovDays',
    'ReqGain%',
    'StartCap$',
    'MarginUsed',
    'MinMove'
])

export function resolveDiagnosticsReportTermTooltipOrNull(title: string | undefined): string | null {
    return resolveCommonReportColumnTooltipOrNull(title)
}
