import { Text } from '@/shared/ui'
import type { BacktestProfileDto, BacktestSummaryDto } from '@/shared/types/backtest.types'
import { BacktestSummaryView } from '../BacktestSummaryView/BacktestSummaryView'
import { getMetricValue } from '@/shared/utils/backtestMetrics'
import cls from './BacktestCompareSection.module.scss'

interface BacktestCompareSectionProps {
    profiles: BacktestProfileDto[] | undefined
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

/**
 * Секция сравнения двух профилей A/B:
 * - выбор профилей;
 * - компактный comparator по ключевым метрикам;
 * - две карточки BacktestSummaryView с результатами preview.
 */
export function BacktestCompareSection({
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
}: BacktestCompareSectionProps) {
    const profileA = profiles?.find(p => p.id === profileAId) ?? null
    const profileB = profiles?.find(p => p.id === profileBId) ?? null

    const profileABestPnl = getMetricValue(summaryA, 'BestTotalPnlPct')
    const profileBBestPnl = getMetricValue(summaryB, 'BestTotalPnlPct')

    const profileADrawdown = getMetricValue(summaryA, 'WorstMaxDdPct')
    const profileBDrawdown = getMetricValue(summaryB, 'WorstMaxDdPct')

    return (
        <section id='compare' className={cls.compareSection}>
            <Text type='h2'>Сравнение профилей A / B</Text>

            {/* Выбор профилей для слотов A и B */}
            {profiles && profiles.length > 0 && (
                <div className={cls.compareSelectors}>
                    <div className={cls.selector}>
                        <Text type='p'>Профиль A:</Text>
                        <select
                            value={profileAId ?? ''}
                            onChange={e => onProfileAChange(e.target.value)}
                            className={cls.select}>
                            {profiles.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name || p.id}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className={cls.selector}>
                        <Text type='p'>Профиль B:</Text>
                        <select
                            value={profileBId ?? ''}
                            onChange={e => onProfileBChange(e.target.value)}
                            className={cls.select}>
                            {profiles.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name || p.id}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
            )}

            {/* Компактный comparator по основным метрикам */}
            <div className={cls.compareMetrics}>
                <Text type='h3'>Основные метрики (preview A/B)</Text>
                <div className={cls.metricsValues}>
                    <Text type='p'>
                        BestTotalPnlPct:&nbsp;A ={profileABestPnl !== null ? ` ${profileABestPnl.toFixed(2)} %` : ' —'},
                        B ={profileBBestPnl !== null ? ` ${profileBBestPnl.toFixed(2)} %` : ' —'}
                    </Text>
                    <Text type='p'>
                        WorstMaxDdPct:&nbsp;A ={profileADrawdown !== null ? ` ${profileADrawdown.toFixed(2)} %` : ' —'},
                        B ={profileBDrawdown !== null ? ` ${profileBDrawdown.toFixed(2)} %` : ' —'}
                    </Text>
                </div>
            </div>

            <button type='button' className={cls.runButton} onClick={onRunCompare} disabled={isCompareLoading}>
                {isCompareLoading ? 'Сравниваю профили...' : 'Запустить сравнение A/B'}
            </button>

            {compareError && (
                <Text type='p' className={cls.errorText}>
                    {compareError}
                </Text>
            )}

            <div className={cls.columns}>
                <div className={cls.column}>
                    <Text type='h3'>Профиль A{profileA ? ` (${profileA.name || profileA.id})` : ''}</Text>
                    {summaryA ?
                        <BacktestSummaryView summary={summaryA} title='Результат профиля A' />
                    :   <Text type='p'>Ещё нет результата preview для профиля A.</Text>}
                </div>

                <div className={cls.column}>
                    <Text type='h3'>Профиль B{profileB ? ` (${profileB.name || profileB.id})` : ''}</Text>
                    {summaryB ?
                        <BacktestSummaryView summary={summaryB} title='Результат профиля B' />
                    :   <Text type='p'>Ещё нет результата preview для профиля B.</Text>}
                </div>
            </div>
        </section>
    )
}
