import { Text } from '@/shared/ui'
import type { BacktestConfigDto, BacktestProfileDto, BacktestSummaryDto } from '@/shared/types/backtest.types'
import type { PolicyRatiosReportDto } from '@/shared/types/policyRatios.types'
import { BacktestConfigEditor } from '../BacktestConfigEditor/BacktestConfigEditor'
import { BacktestSummaryView } from '../BacktestSummaryView/BacktestSummaryView'
import { BacktestPolicyRatiosSection } from '../BacktestPolicyRatiosSection/BacktestPolicyRatiosSection'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import { useTranslation } from 'react-i18next'
import cls from './BacktestWhatIfColumn.module.scss'
interface BacktestWhatIfColumnProps {
    currentProfile: BacktestProfileDto
    draftConfig: BacktestConfigDto
    selectedPolicies: Record<string, boolean>
    isPreviewLoading: boolean
    previewError: string | null
    previewSummary: BacktestSummaryDto | null
    previewPolicyRatios: PolicyRatiosReportDto | null
    onStopPctChange: (valueStr: string) => void
    onTpPctChange: (valueStr: string) => void
    onConfidenceRiskPctChange: (field: string, valueStr: string) => void
    onConfidenceRiskRawChange: (field: string, valueStr: string) => void
    onConfidenceRiskIntChange: (field: string, valueStr: string) => void
    onShiftDynamicTpSl: (mode: 'tighter' | 'wider') => void
    onPolicyEnabledChange: (name: string, checked: boolean) => void
    onPolicyLeverageChange: (name: string, valueStr: string) => void
    onRunPreview: () => void
}

export function BacktestWhatIfColumn({
    currentProfile,
    draftConfig,
    selectedPolicies,
    isPreviewLoading,
    previewError,
    previewSummary,
    previewPolicyRatios,
    onStopPctChange,
    onTpPctChange,
    onConfidenceRiskPctChange,
    onConfidenceRiskRawChange,
    onConfidenceRiskIntChange,
    onShiftDynamicTpSl,
    onPolicyEnabledChange,
    onPolicyLeverageChange,
    onRunPreview
}: BacktestWhatIfColumnProps) {
    const { t } = useTranslation('reports')

    return (
        <SectionErrorBoundary
            name='BacktestWhatIfColumn'
            fallback={({ error, reset }) => (
                <ErrorBlock
                    code='CLIENT'
                    title={t('backtestFull.whatIfColumn.errors.clientTitle')}
                    description={t('backtestFull.whatIfColumn.errors.clientDescription')}
                    details={error.message}
                    onRetry={reset}
                />
            )}>
            <div className={cls.column}>
                <Text type='h2'>{t('backtestFull.whatIfColumn.title')}</Text>

                <BacktestConfigEditor
                    currentProfile={currentProfile}
                    draftConfig={draftConfig}
                    selectedPolicies={selectedPolicies}
                    isPreviewLoading={isPreviewLoading}
                    previewError={previewError}
                    onStopPctChange={onStopPctChange}
                    onTpPctChange={onTpPctChange}
                    onConfidenceRiskPctChange={onConfidenceRiskPctChange}
                    onConfidenceRiskRawChange={onConfidenceRiskRawChange}
                    onConfidenceRiskIntChange={onConfidenceRiskIntChange}
                    onShiftDynamicTpSl={onShiftDynamicTpSl}
                    onPolicyEnabledChange={onPolicyEnabledChange}
                    onPolicyLeverageChange={onPolicyLeverageChange}
                    onRunPreview={onRunPreview}
                />

                <section className={cls.previewSection}>
                    <Text type='h2'>{t('backtestFull.whatIfColumn.previewTitle')}</Text>
                    {previewSummary ?
                        <BacktestSummaryView
                            summary={previewSummary}
                            title={t('backtestFull.whatIfColumn.previewSummaryTitle')}
                        />
                    :   <Text>{t('backtestFull.whatIfColumn.previewEmpty')}</Text>}
                    {previewPolicyRatios && (
                        <BacktestPolicyRatiosSection
                            report={previewPolicyRatios}
                            title={t('backtestFull.whatIfColumn.previewPolicyRatiosTitle')}
                            subtitle={t('backtestFull.whatIfColumn.previewPolicyRatiosSubtitle')}
                        />
                    )}
                </section>
            </div>
        </SectionErrorBoundary>
    )
}
