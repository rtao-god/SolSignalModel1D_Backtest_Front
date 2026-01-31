import { Text } from '@/shared/ui'
import type { BacktestSummaryDto } from '@/shared/types/backtest.types'
import { BacktestSummaryView } from './BacktestSummaryView/BacktestSummaryView'
import { BacktestPolicyRatiosSection } from './BacktestPolicyRatiosSection/BacktestPolicyRatiosSection'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import cls from './BacktestPage.module.scss'

/*
	BacktestBaselineColumn — колонка baseline-бэктеста.

	Зачем:
		- Показывает baseline summary и метрики политик.

	Контракты:
		- baselineSummary содержит валидный summary бэктеста.
*/

// Пропсы колонки baseline-бэктеста.
interface BacktestBaselineColumnProps {
    baselineSummary: BacktestSummaryDto
}

export function BacktestBaselineColumn({ baselineSummary }: BacktestBaselineColumnProps) {
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
                <Text type='h2'>Baseline (консольный бэктест)</Text>
                <BacktestSummaryView summary={baselineSummary} title='Baseline summary' />
                <BacktestPolicyRatiosSection profileId='baseline' />
            </div>
        </SectionErrorBoundary>
    )
}
