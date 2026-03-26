import { Text } from '@/shared/ui'
import type { BacktestSummaryDto } from '@/shared/types/backtest.types'
import type { PolicyRatiosReportDto } from '@/shared/types/policyRatios.types'
import { BacktestSummaryView } from '../BacktestSummaryView/BacktestSummaryView'
import { BacktestPolicyRatiosSection } from '../BacktestPolicyRatiosSection/BacktestPolicyRatiosSection'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import { useTranslation } from 'react-i18next'
import cls from './BacktestBaselineColumn.module.scss'
interface BacktestBaselineColumnProps {
    baselineSummary: BacktestSummaryDto | null
    sectionTitle: string
    summaryTitle: string
    summaryLoading?: boolean
    summaryError?: string | null
    policyRatiosReport?: PolicyRatiosReportDto | null
    policyRatiosLoading?: boolean
    policyRatiosError?: string | null
}

export function BacktestBaselineColumn({
    baselineSummary,
    sectionTitle,
    summaryTitle,
    summaryLoading = false,
    summaryError = null,
    policyRatiosReport,
    policyRatiosLoading = false,
    policyRatiosError = null
}: BacktestBaselineColumnProps) {
    const { t } = useTranslation('reports')

    return (
        <SectionErrorBoundary
            name='BacktestBaselineColumn'
            fallback={({ error, reset }) => (
                <ErrorBlock
                    code='CLIENT'
                    title={t('backtestFull.baselineColumn.errors.clientTitle')}
                    description={t('backtestFull.baselineColumn.errors.clientDescription')}
                    details={error.message}
                    onRetry={reset}
                />
            )}>
            <div className={cls.column}>
                <Text type='h2'>{sectionTitle}</Text>
                {summaryLoading ?
                    <Text>{t('backtestFull.baselineColumn.loadingSummary')}</Text>
                : summaryError ?
                    <ErrorBlock
                        code='DATA'
                        title={t('backtestFull.baselineColumn.errors.summaryTitle')}
                        description={t('backtestFull.baselineColumn.errors.summaryDescription')}
                        details={summaryError}
                        compact
                    />
                : baselineSummary ?
                    <BacktestSummaryView summary={baselineSummary} title={summaryTitle} />
                :   <Text>{t('backtestFull.baselineColumn.emptySummary')}</Text>}
                <BacktestPolicyRatiosSection
                    profileId='baseline'
                    report={policyRatiosReport}
                    isLoadingExternal={policyRatiosLoading}
                    externalError={policyRatiosError}
                />
            </div>
        </SectionErrorBoundary>
    )
}
