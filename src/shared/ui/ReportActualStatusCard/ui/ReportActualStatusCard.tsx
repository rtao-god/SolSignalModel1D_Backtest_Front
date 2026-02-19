import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui'
import cls from './ReportActualStatusCard.module.scss'

export type ReportActualStatusMode = 'actual' | 'debug'

export interface ReportActualStatusLine {
    label: string
    value: string
}

interface ReportActualStatusCardProps {
    statusMode: ReportActualStatusMode
    statusTitle?: string
    statusMessage?: string
    statusLagMinutes?: number | null
    dataSource: string
    reportTitle: string
    reportId: string
    reportKind: string
    generatedAtUtc: string
    statusLines?: ReportActualStatusLine[]
    className?: string
}

function formatUtcOrThrow(value: string): string {
    if (!value || value.trim().length === 0) {
        throw new Error('[report-meta] generatedAtUtc is empty.')
    }

    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
        throw new Error(`[report-meta] generatedAtUtc is invalid: ${value}`)
    }

    const year = parsed.getUTCFullYear()
    const month = String(parsed.getUTCMonth() + 1).padStart(2, '0')
    const day = String(parsed.getUTCDate()).padStart(2, '0')
    const hour = String(parsed.getUTCHours()).padStart(2, '0')
    const minute = String(parsed.getUTCMinutes()).padStart(2, '0')

    return `${year}-${month}-${day} ${hour}:${minute} UTC`
}

function ensureNonEmptyOrThrow(value: string, label: string): string {
    if (!value || value.trim().length === 0) {
        throw new Error(`[report-meta] ${label} is empty.`)
    }

    return value.trim()
}

export default function ReportActualStatusCard({
    statusMode,
    statusTitle,
    statusMessage,
    statusLagMinutes,
    dataSource,
    reportTitle,
    reportId,
    reportKind,
    generatedAtUtc,
    statusLines,
    className
}: ReportActualStatusCardProps) {
    const safeDataSource = ensureNonEmptyOrThrow(dataSource, 'dataSource')
    const safeReportTitle = ensureNonEmptyOrThrow(reportTitle, 'reportTitle')
    const safeReportId = ensureNonEmptyOrThrow(reportId, 'reportId')
    const safeReportKind = ensureNonEmptyOrThrow(reportKind, 'reportKind')

    const generatedUtcText = formatUtcOrThrow(generatedAtUtc)
    const generatedLocalText = new Date(generatedAtUtc).toLocaleString()

    const resolvedTitle =
        statusTitle ??
        (statusMode === 'actual'
            ? 'ACTUAL: latest verified (for current API source)'
            : 'DEBUG: freshness not verified')

    const validatedStatusLines = (statusLines ?? []).map(line => ({
        label: ensureNonEmptyOrThrow(line.label, 'statusLine.label'),
        value: ensureNonEmptyOrThrow(line.value, `statusLine.value:${line.label}`)
    }))

    return (
        <div className={classNames(cls.root, {}, [className ?? ''])}>
            <Text
                className={classNames(
                    cls.badge,
                    {
                        [cls.badgeActual]: statusMode === 'actual',
                        [cls.badgeDebug]: statusMode !== 'actual'
                    },
                    []
                )}>
                {resolvedTitle}
            </Text>

            {statusMessage && <Text>{statusMessage}</Text>}
            {statusLagMinutes !== null && statusLagMinutes !== undefined && statusLagMinutes > 0 && (
                <Text>Lag vs diagnostics: {Math.round(statusLagMinutes)} min</Text>
            )}

            <Text>Data source: {safeDataSource}</Text>
            <Text>Report: {safeReportTitle}</Text>
            <Text>Report ID: {safeReportId}</Text>
            <Text>Kind: {safeReportKind}</Text>

            {validatedStatusLines.map(line => (
                <Text key={`${line.label}:${line.value}`}>
                    {line.label}: {line.value}
                </Text>
            ))}

            <Text>Generated (UTC): {generatedUtcText}</Text>
            <Text>Generated (local): {generatedLocalText}</Text>
        </div>
    )
}
