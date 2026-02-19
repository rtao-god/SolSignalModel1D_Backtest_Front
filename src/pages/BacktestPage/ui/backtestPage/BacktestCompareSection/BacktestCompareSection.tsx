import { Btn, Text } from '@/shared/ui'
import { BacktestSummaryView } from '../BacktestSummaryView/BacktestSummaryView'
import { BacktestPolicyRatiosSection } from '../BacktestPolicyRatiosSection/BacktestPolicyRatiosSection'
import cls from './BacktestCompareSection.module.scss'
import BacktestCompareSectionProps from './types'

function formatSignedDelta(value: number | null, digits = 2): string {
    if (value === null || !Number.isFinite(value)) {
        return 'n/a'
    }

    const sign = value > 0 ? '+' : ''
    return `${sign}${value.toFixed(digits)}`
}

export function BacktestCompareSection({
    profiles,
    profileAId,
    profileBId,
    summaryA,
    summaryB,
    policyRatiosA,
    policyRatiosB,
    deltaBestTotalPnlPct,
    deltaWorstMaxDdPct,
    deltaTotalTrades,
    compareError,
    isCompareLoading,
    onProfileAChange,
    onProfileBChange,
    onRunCompare
}: BacktestCompareSectionProps) {
    const profileA = profiles?.find(p => p.id === profileAId) ?? null
    const profileB = profiles?.find(p => p.id === profileBId) ?? null

    return (
        <section id='compare' className={cls.compareSection}>
            <Text type='h2'>Сравнение профилей A / B</Text>

            {profiles && profiles.length > 0 && (
                <div className={cls.compareSelectors}>
                    <label className={cls.selector}>
                        <Text>Профиль A</Text>
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
                    </label>

                    <label className={cls.selector}>
                        <Text>Профиль B</Text>
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
                    </label>
                </div>
            )}

            <div className={cls.compareMetrics}>
                <Text type='h3'>Сводка дельт (B - A)</Text>
                <div className={cls.metricsValues}>
                    <Text>BestTotalPnlPct: {formatSignedDelta(deltaBestTotalPnlPct)} %</Text>
                    <Text>WorstMaxDdPct: {formatSignedDelta(deltaWorstMaxDdPct)} %</Text>
                    <Text>TotalTrades: {formatSignedDelta(deltaTotalTrades, 0)}</Text>
                </div>
            </div>

            <Btn className={cls.runButton} onClick={onRunCompare} disabled={isCompareLoading}>
                {isCompareLoading ? 'Сравниваю профили...' : 'Запустить сравнение A/B'}
            </Btn>

            {compareError && <Text className={cls.errorText}>{compareError}</Text>}

            <div className={cls.columns}>
                <div className={cls.column}>
                    <Text type='h3'>Профиль A{profileA ? ` (${profileA.name || profileA.id})` : ''}</Text>
                    {summaryA ?
                        <BacktestSummaryView summary={summaryA} title='Summary профиля A' />
                    :   <Text>Ещё нет результата preview для профиля A.</Text>}
                    {policyRatiosA && (
                        <BacktestPolicyRatiosSection
                            report={policyRatiosA}
                            title='Метрики политик профиля A'
                            subtitle='Метрики построены по тому же one-shot прогона, что и summary профиля A.'
                        />
                    )}
                </div>

                <div className={cls.column}>
                    <Text type='h3'>Профиль B{profileB ? ` (${profileB.name || profileB.id})` : ''}</Text>
                    {summaryB ?
                        <BacktestSummaryView summary={summaryB} title='Summary профиля B' />
                    :   <Text>Ещё нет результата preview для профиля B.</Text>}
                    {policyRatiosB && (
                        <BacktestPolicyRatiosSection
                            report={policyRatiosB}
                            title='Метрики политик профиля B'
                            subtitle='Метрики построены по тому же one-shot прогона, что и summary профиля B.'
                        />
                    )}
                </div>
            </div>
        </section>
    )
}

