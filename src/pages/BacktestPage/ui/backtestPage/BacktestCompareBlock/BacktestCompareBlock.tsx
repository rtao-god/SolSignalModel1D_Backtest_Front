import type { BacktestProfileDto, BacktestSummaryDto } from '@/shared/types/backtest.types'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import { BacktestCompareSection } from '../BacktestCompareSection/BacktestCompareSection'
import cls from './BacktestCompareBlock.module.scss'

/*
	BacktestCompareBlock — обёртка сравнения профилей.

	Зачем:
		- Защищает секцию сравнения через SectionErrorBoundary.

	Контракты:
		- profiles содержит список доступных профилей.
*/

// Пропсы блока сравнения профилей.
interface BacktestCompareBlockProps {
    profiles: BacktestProfileDto[]
    profileAId: string | null
    profileBId: string | null
    summaryA: BacktestSummaryDto | null
    summaryB: BacktestSummaryDto | null
    compareError: string | null
    isCompareLoading: boolean
    onProfileAChange: (id: string | null) => void
    onProfileBChange: (id: string | null) => void
    onRunCompare: () => void
}

export function BacktestCompareBlock({
    profiles,
    profileAId,
    profileBId,
    summaryA,
    summaryB,
    compareError,
    isCompareLoading,
    onProfileAChange,
    onProfileBChange,
    onRunCompare
}: BacktestCompareBlockProps) {
    return (
        <div className={cls.root}>
            <SectionErrorBoundary
                name='BacktestCompareSection'
                fallback={({ error, reset }) => (
                    <ErrorBlock
                        code='CLIENT'
                        title='Блок сравнения профилей временно недоступен'
                        description='При отрисовке блока сравнения A/B произошла ошибка на клиенте. Baseline и What-if продолжают работать.'
                        details={error.message}
                        onRetry={reset}
                    />
                )}>
                <BacktestCompareSection
                    profiles={profiles}
                    profileAId={profileAId}
                    profileBId={profileBId}
                    summaryA={summaryA}
                    summaryB={summaryB}
                    compareError={compareError}
                    isCompareLoading={isCompareLoading}
                    onProfileAChange={onProfileAChange}
                    onProfileBChange={onProfileBChange}
                    onRunCompare={onRunCompare}
                />
            </SectionErrorBoundary>
        </div>
    )
}
