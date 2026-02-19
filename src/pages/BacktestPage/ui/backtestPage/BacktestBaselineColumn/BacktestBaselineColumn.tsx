import { Text } from '@/shared/ui'
import type { BacktestSummaryDto } from '@/shared/types/backtest.types'
import type { PolicyRatiosReportDto } from '@/shared/types/policyRatios.types'
import { BacktestSummaryView } from '../BacktestSummaryView/BacktestSummaryView'
import { BacktestPolicyRatiosSection } from '../BacktestPolicyRatiosSection/BacktestPolicyRatiosSection'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
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
    return (
        <SectionErrorBoundary
            name='BacktestBaselineColumn'
            fallback={({ error, reset }) => (
                <ErrorBlock
                    code='CLIENT'
                    title='Ошибка в блоке baseline'
                    description='Блок baseline временно недоступен из-за ошибки на клиенте. What-if и сравнение профилей остаются доступными.'
                    details={error.message}
                    onRetry={reset}
                />
            )}>
            <div className={cls.column}>
                <Text type='h2'>{sectionTitle}</Text>
                {summaryLoading ?
                    <Text>Пересчитываю baseline summary для выбранного TP/SL режима...</Text>
                : summaryError ?
                    <ErrorBlock
                        code='DATA'
                        title='Не удалось получить baseline summary'
                        description='Summary для выбранного TP/SL режима недоступен.'
                        details={summaryError}
                        compact
                    />
                : baselineSummary ?
                    <BacktestSummaryView summary={baselineSummary} title={summaryTitle} />
                :   <Text>Нет baseline summary для выбранного TP/SL режима.</Text>}
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
