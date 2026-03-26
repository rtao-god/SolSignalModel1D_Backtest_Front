import { Btn, Text } from '@/shared/ui'
import { BacktestSummaryView } from '../BacktestSummaryView/BacktestSummaryView'
import { BacktestPolicyRatiosSection } from '../BacktestPolicyRatiosSection/BacktestPolicyRatiosSection'
import { useTranslation } from 'react-i18next'
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
    const { t } = useTranslation('reports')
    const profileA = profiles?.find(p => p.id === profileAId) ?? null
    const profileB = profiles?.find(p => p.id === profileBId) ?? null

    return (
        <section id='compare' className={cls.compareSection}>
            <Text type='h2'>{t('backtestFull.compareSection.title')}</Text>

            {profiles && profiles.length > 0 && (
                <div className={cls.compareSelectors}>
                    <label className={cls.selector}>
                        <Text>{t('backtestFull.compareSection.selectors.profileA')}</Text>
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
                        <Text>{t('backtestFull.compareSection.selectors.profileB')}</Text>
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
                <Text type='h3'>{t('backtestFull.compareSection.deltaSummaryTitle')}</Text>
                <div className={cls.metricsValues}>
                    <Text>BestTotalPnlPct: {formatSignedDelta(deltaBestTotalPnlPct)} %</Text>
                    <Text>WorstMaxDdPct: {formatSignedDelta(deltaWorstMaxDdPct)} %</Text>
                    <Text>TotalTrades: {formatSignedDelta(deltaTotalTrades, 0)}</Text>
                </div>
            </div>

            <Btn className={cls.runButton} onClick={onRunCompare} disabled={isCompareLoading}>
                {isCompareLoading ?
                    t('backtestFull.compareSection.runButton.loading')
                :   t('backtestFull.compareSection.runButton.default')}
            </Btn>

            {compareError && <Text className={cls.errorText}>{compareError}</Text>}

            <div className={cls.columns}>
                <div className={cls.column}>
                    <Text type='h3'>
                        {t('backtestFull.compareSection.columns.profileA')}
                        {profileA ? ` (${profileA.name || profileA.id})` : ''}
                    </Text>
                    {summaryA ?
                        <BacktestSummaryView
                            summary={summaryA}
                            title={t('backtestFull.compareSection.summaryTitle', { profile: 'A' })}
                        />
                    :   <Text>{t('backtestFull.compareSection.previewEmpty', { profile: 'A' })}</Text>}
                    {policyRatiosA && (
                        <BacktestPolicyRatiosSection
                            report={policyRatiosA}
                            title={t('backtestFull.compareSection.policyRatiosTitle', { profile: 'A' })}
                            subtitle={t('backtestFull.compareSection.policyRatiosSubtitle', { profile: 'A' })}
                        />
                    )}
                </div>

                <div className={cls.column}>
                    <Text type='h3'>
                        {t('backtestFull.compareSection.columns.profileB')}
                        {profileB ? ` (${profileB.name || profileB.id})` : ''}
                    </Text>
                    {summaryB ?
                        <BacktestSummaryView
                            summary={summaryB}
                            title={t('backtestFull.compareSection.summaryTitle', { profile: 'B' })}
                        />
                    :   <Text>{t('backtestFull.compareSection.previewEmpty', { profile: 'B' })}</Text>}
                    {policyRatiosB && (
                        <BacktestPolicyRatiosSection
                            report={policyRatiosB}
                            title={t('backtestFull.compareSection.policyRatiosTitle', { profile: 'B' })}
                            subtitle={t('backtestFull.compareSection.policyRatiosSubtitle', { profile: 'B' })}
                        />
                    )}
                </div>
            </div>
        </section>
    )
}
