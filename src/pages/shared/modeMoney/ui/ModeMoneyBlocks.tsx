import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from '@/shared/lib/helpers/classNames'
import {
    type PolicyBranchMegaModeMoneySummaryRowDto,
    usePolicyBranchMegaModeMoneySummaryQuery
} from '@/shared/api/tanstackQueries/policyBranchMega'
import { useModeRegistryQuery } from '@/shared/api/tanstackQueries/modeRegistry'
import type { ModeId, ReportSliceId } from '@/entities/mode'
import { ReportTableCard, ReportTableTermsBlock, Text } from '@/shared/ui'
import { PageSectionDataState } from '@/shared/ui/errors/PageDataState'
import { renderTermTooltipRichText } from '@/shared/ui/TermTooltip'
import { resolveReportColumnTooltip, resolveReportTooltipLocale } from '@/shared/utils/reportTooltips'
import { resolveReportTooltipSelfAliases } from '@/shared/utils/reportTooltips'
import cls from '@/pages/shared/walkForward/ui/WalkForwardModePanels.module.scss'
import {
    buildModeMoneyDataFromMegaSummaryRow,
    resolveModeMoneySlice,
    resolveModeMoneySliceLabel,
    resolveModeMoneyMetricLabel,
    selectModeMoneySummaryRow,
    type ModeMoneyBlocksData
} from '../model/modeMoney'

interface ModeMoneyBlocksProps {
    data: ModeMoneyBlocksData
    domIdPrefix: string
    className?: string
    showTermsBlock?: boolean
}

interface ModeMoneySummaryPanelProps {
    mode: ModeId
    reportSlice?: ReportSliceId | null
    unavailableReason?: string | null
    showDefaultSliceNote?: boolean
    showTermsBlock?: boolean
    className?: string
}

interface ModeMoneyColumnDefinition {
    key: string
    label: string
    include: boolean
    value: () => string
}

interface ModeMoneyTermDefinition {
    key: string
    title: string
}

function requireMetricNumber(value: number | null | undefined, fieldName: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`[mode-money] required finite money metric is missing or invalid. field=${fieldName}, actual=${String(value)}.`)
    }

    return value
}

function requireMetricString(value: string | null | undefined, fieldName: string): string {
    if (!value?.trim()) {
        throw new Error(`[mode-money] required string field is missing or invalid. field=${fieldName}, actual=${String(value)}.`)
    }

    return value
}

function formatMetricInteger(value: number | null | undefined, fieldName: string): string {
    return requireMetricNumber(value, fieldName).toLocaleString('en-US', {
        maximumFractionDigits: 0
    })
}

function formatMetricNumber(value: number | null | undefined, fieldName: string, digits = 2): string {
    return requireMetricNumber(value, fieldName).toFixed(digits)
}

function formatMetricPercent(value: number | null | undefined, fieldName: string): string {
    return `${formatMetricNumber(value, fieldName)}%`
}

function formatMetricRatioPercent(value: number | null | undefined, fieldName: string): string {
    return `${formatMetricNumber(requireMetricNumber(value, fieldName) * 100, `${fieldName}.ratio`)}%`
}

function formatMetricUsd(value: number | null | undefined, fieldName: string): string {
    return requireMetricNumber(value, fieldName).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2
    })
}

function formatMetricBoolean(
    value: boolean | null | undefined,
    translate: (key: string) => string,
    fieldName: string
): string {
    if (typeof value !== 'boolean') {
        throw new Error(`[mode-money] required boolean money metric is missing or invalid. field=${fieldName}, actual=${String(value)}.`)
    }

    return value ? translate('modeMoney.bool.yes') : translate('modeMoney.bool.no')
}

function MetricCard({ label, value }: { label: string; value: string }) {
    return (
        <div className={cls.metricCard}>
            <div className={cls.metricLabel}>{renderTermTooltipRichText(label)}</div>
            <div className={cls.metricValue}>{value}</div>
        </div>
    )
}

function resolveModeMoneyStatusNote(
    row: PolicyBranchMegaModeMoneySummaryRowDto,
    translate: (key: string, options?: Record<string, unknown>) => string
): string {
    if (row.sourceStatus === 'diagnostic') {
        return translate('modeMoney.notes.diagnostic', {
            statusMessage: row.statusMessage,
            comparabilityNote: row.comparabilityNote
        })
    }

    return translate('modeMoney.notes.available', {
        statusMessage: row.statusMessage,
        comparabilityNote: row.comparabilityNote
    })
}

function buildModeMoneyTermItems(
    definitions: readonly ModeMoneyTermDefinition[],
    language: string
) {
    const locale = resolveReportTooltipLocale(language)

    return definitions
        .map(definition => {
            const tooltip = resolveReportColumnTooltip('walk_forward_money', undefined, definition.title, locale)
            if (!tooltip) {
                return null
            }

            return {
                key: definition.key,
                title: definition.title,
                description: tooltip,
                tooltip,
                selfAliases: resolveReportTooltipSelfAliases('walk_forward_money', definition.title)
            }
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
}

/*
    ModeMoneyBlocks — общие money/risk-блоки, которые изначально жили на TBM/Walk-Forward money-странице.

    Зачем:
        - Дают один owner UI-контракт для лучшей политики, капитала и аварийного риска.
        - Позволяют fixed-split и mega-страницам переиспользовать тот же блок без второго локального представления.

    Контракты:
        - Компонент получает уже выбранную лучшую policy и обязательные money-метрики.
        - Поля, которых нет у источника, не подделываются: соответствующие колонки просто не рендерятся.

    Источники данных:
        - Walk-Forward money pages передают сюда best-policy артефакт.
        - Fixed-split и mega-страницы передают owner row из /api/backtest/policy-branch-mega/mode-money-summary.
*/
export function ModeMoneyBlocks({
    data,
    domIdPrefix,
    className,
    showTermsBlock = true
}: ModeMoneyBlocksProps) {
    const { t, i18n } = useTranslation('reports')
    const label = (metricKey: string) => resolveModeMoneyMetricLabel(data.metricDescriptors, metricKey)

    const summaryCards = useMemo(
        () => [
            {
                key: 'policy',
                label: t('modeMoney.summary.policy'),
                value: requireMetricString(data.policyName, 'policyName')
            },
            {
                key: 'branch',
                label: t('modeMoney.summary.branch'),
                value: requireMetricString(data.policyBranch, 'policyBranch')
            },
            {
                key: 'totalPnlPct',
                label: label('TotalPnlPct'),
                value: formatMetricPercent(data.metrics.totalPnlPct, 'metrics.totalPnlPct')
            },
            {
                key: 'totalPnlUsd',
                label: label('TotalPnlUsd'),
                value: formatMetricUsd(data.metrics.totalPnlUsd, 'metrics.totalPnlUsd')
            },
            {
                key: 'maxDdPct',
                label: label('MaxDdPct'),
                value: formatMetricPercent(data.metrics.maxDdPct, 'metrics.maxDdPct')
            },
            {
                key: 'sharpe',
                label: label('Sharpe'),
                value: formatMetricNumber(data.metrics.sharpe, 'metrics.sharpe')
            },
            {
                key: 'tradesCount',
                label: label('TradesCount'),
                value: formatMetricInteger(data.metrics.tradesCount, 'metrics.tradesCount')
            },
            {
                key: 'startCapitalUsd',
                label: label('StartCapitalUsd'),
                value: formatMetricUsd(data.metrics.startCapitalUsd, 'metrics.startCapitalUsd')
            },
            {
                key: 'equityNowUsd',
                label: label('EquityNowUsd'),
                value: formatMetricUsd(data.metrics.equityNowUsd, 'metrics.equityNowUsd')
            },
            {
                key: 'fundingNetUsd',
                label: label('FundingNetUsd'),
                value: formatMetricUsd(data.metrics.fundingNetUsd, 'metrics.fundingNetUsd')
            }
        ],
        [data, t]
    )

    const bestPolicyColumns = useMemo<ModeMoneyColumnDefinition[]>(
        () => [
            {
                key: 'policy',
                label: t('modeMoney.tables.bestPolicy.columns.policy'),
                include: true,
                value: () => requireMetricString(data.policyName, 'policyName')
            },
            {
                key: 'branch',
                label: t('modeMoney.tables.bestPolicy.columns.branch'),
                include: true,
                value: () => requireMetricString(data.policyBranch, 'policyBranch')
            },
            {
                key: 'bucket',
                label: t('modeMoney.tables.bestPolicy.columns.bucket'),
                include: Boolean(data.bucket),
                value: () => requireMetricString(data.bucket, 'bucket')
            },
            {
                key: 'slice',
                label: t('modeMoney.tables.bestPolicy.columns.slice'),
                include: Boolean(data.sliceLabel),
                value: () => requireMetricString(data.sliceLabel, 'sliceLabel')
            },
            {
                key: 'execution',
                label: t('modeMoney.tables.bestPolicy.columns.execution'),
                include: Boolean(data.executionLabel),
                value: () => requireMetricString(data.executionLabel, 'executionLabel')
            },
            {
                key: 'score',
                label: t('modeMoney.tables.bestPolicy.columns.score'),
                include: data.scoreValue !== null,
                value: () => formatMetricNumber(data.scoreValue, 'scoreValue', 4)
            },
            {
                key: 'evaluation',
                label: t('modeMoney.tables.bestPolicy.columns.evaluation'),
                include: Boolean(data.evaluationStatus),
                value: () => requireMetricString(data.evaluationStatus, 'evaluationStatus')
            },
            {
                key: 'tradesCount',
                label: label('TradesCount'),
                include: true,
                value: () => formatMetricInteger(data.metrics.tradesCount, 'metrics.tradesCount')
            },
            {
                key: 'totalPnlPct',
                label: label('TotalPnlPct'),
                include: true,
                value: () => formatMetricPercent(data.metrics.totalPnlPct, 'metrics.totalPnlPct')
            },
            {
                key: 'totalPnlUsd',
                label: label('TotalPnlUsd'),
                include: true,
                value: () => formatMetricUsd(data.metrics.totalPnlUsd, 'metrics.totalPnlUsd')
            },
            {
                key: 'maxDdPct',
                label: label('MaxDdPct'),
                include: true,
                value: () => formatMetricPercent(data.metrics.maxDdPct, 'metrics.maxDdPct')
            },
            {
                key: 'winRate',
                label: label('WinRate'),
                include: true,
                value: () => formatMetricRatioPercent(data.metrics.winRate, 'metrics.winRate')
            }
        ],
        [data, t]
    )

    const capitalColumns = useMemo<ModeMoneyColumnDefinition[]>(
        () => [
            {
                key: 'startCapitalUsd',
                label: label('StartCapitalUsd'),
                include: true,
                value: () => formatMetricUsd(data.metrics.startCapitalUsd, 'metrics.startCapitalUsd')
            },
            {
                key: 'equityNowUsd',
                label: label('EquityNowUsd'),
                include: true,
                value: () => formatMetricUsd(data.metrics.equityNowUsd, 'metrics.equityNowUsd')
            },
            {
                key: 'withdrawnTotalUsd',
                label: label('WithdrawnTotalUsd'),
                include: true,
                value: () => formatMetricUsd(data.metrics.withdrawnTotalUsd, 'metrics.withdrawnTotalUsd')
            },
            {
                key: 'fundingNetUsd',
                label: label('FundingNetUsd'),
                include: true,
                value: () => formatMetricUsd(data.metrics.fundingNetUsd, 'metrics.fundingNetUsd')
            },
            {
                key: 'fundingPaidUsd',
                label: label('FundingPaidUsd'),
                include: true,
                value: () => formatMetricUsd(data.metrics.fundingPaidUsd, 'metrics.fundingPaidUsd')
            },
            {
                key: 'fundingReceivedUsd',
                label: label('FundingReceivedUsd'),
                include: true,
                value: () => formatMetricUsd(data.metrics.fundingReceivedUsd, 'metrics.fundingReceivedUsd')
            },
            {
                key: 'fundingEventCount',
                label: label('FundingEventCount'),
                include: true,
                value: () => formatMetricInteger(data.metrics.fundingEventCount, 'metrics.fundingEventCount')
            },
            {
                key: 'tradesWithFundingCount',
                label: label('TradesWithFundingCount'),
                include: true,
                value: () =>
                    formatMetricInteger(data.metrics.tradesWithFundingCount, 'metrics.tradesWithFundingCount')
            }
        ],
        [data, t]
    )

    const riskColumns = useMemo<ModeMoneyColumnDefinition[]>(
        () => [
            {
                key: 'hadLiquidation',
                label: label('HadLiquidation'),
                include: true,
                value: () => formatMetricBoolean(data.metrics.hadLiquidation, t, 'metrics.hadLiquidation')
            },
            {
                key: 'realLiquidationCount',
                label: label('RealLiquidationCount'),
                include: true,
                value: () =>
                    formatMetricInteger(data.metrics.realLiquidationCount, 'metrics.realLiquidationCount')
            },
            {
                key: 'fundingLiquidationCount',
                label: label('FundingLiquidationCount'),
                include: true,
                value: () =>
                    formatMetricInteger(data.metrics.fundingLiquidationCount, 'metrics.fundingLiquidationCount')
            },
            {
                key: 'fundingBucketDeathCount',
                label: label('FundingBucketDeathCount'),
                include: true,
                value: () =>
                    formatMetricInteger(data.metrics.fundingBucketDeathCount, 'metrics.fundingBucketDeathCount')
            },
            {
                key: 'mixedBucketDeathCount',
                label: label('MixedBucketDeathCount'),
                include: true,
                value: () =>
                    formatMetricInteger(data.metrics.mixedBucketDeathCount, 'metrics.mixedBucketDeathCount')
            },
            {
                key: 'accountRuinCount',
                label: label('AccountRuinCount'),
                include: true,
                value: () => formatMetricInteger(data.metrics.accountRuinCount, 'metrics.accountRuinCount')
            },
            {
                key: 'balanceDead',
                label: label('BalanceDead'),
                include: true,
                value: () => formatMetricBoolean(data.metrics.balanceDead, t, 'metrics.balanceDead')
            }
        ],
        [data, t]
    )

    const visibleBestPolicyColumns = bestPolicyColumns.filter(column => column.include)
    const visibleCapitalColumns = capitalColumns.filter(column => column.include)
    const visibleRiskColumns = riskColumns.filter(column => column.include)

    const terms = useMemo(
        () =>
            buildModeMoneyTermItems(
                [
                    { key: 'policy', title: 'Policy' },
                    { key: 'branch', title: 'Branch' },
                    { key: 'bucket', title: 'Bucket' },
                    { key: 'totalPnlPct', title: label('TotalPnlPct') },
                    { key: 'totalPnlUsd', title: label('TotalPnlUsd') },
                    { key: 'maxDdPct', title: label('MaxDdPct') },
                    { key: 'sharpe', title: label('Sharpe') },
                    { key: 'tradesCount', title: label('TradesCount') },
                    { key: 'winRate', title: label('WinRate') },
                    { key: 'startCapitalUsd', title: label('StartCapitalUsd') },
                    { key: 'equityNowUsd', title: label('EquityNowUsd') },
                    { key: 'withdrawnTotalUsd', title: label('WithdrawnTotalUsd') },
                    { key: 'fundingNetUsd', title: label('FundingNetUsd') },
                    { key: 'fundingPaidUsd', title: label('FundingPaidUsd') },
                    { key: 'fundingReceivedUsd', title: label('FundingReceivedUsd') },
                    { key: 'fundingEventCount', title: label('FundingEventCount') },
                    { key: 'tradesWithFundingCount', title: label('TradesWithFundingCount') },
                    { key: 'hadLiquidation', title: label('HadLiquidation') },
                    { key: 'realLiquidationCount', title: label('RealLiquidationCount') },
                    { key: 'fundingLiquidationCount', title: label('FundingLiquidationCount') },
                    { key: 'accountRuinCount', title: label('AccountRuinCount') },
                    { key: 'balanceDead', title: label('BalanceDead') }
                ],
                i18n.language
            ),
        [data.metricDescriptors, i18n.language]
    )

    return (
        <div className={classNames(cls.stack, {}, [className ?? ''])}>
            {showTermsBlock && terms.length > 0 && (
                <ReportTableTermsBlock
                    terms={terms}
                    enhanceDomainTerms
                    showTermTitleTooltip={false}
                    title={t('modeMoney.terms.title')}
                    subtitle={t('modeMoney.terms.subtitle')}
                />
            )}

            <div className={cls.metricsGrid}>
                {summaryCards.map(card => (
                    <MetricCard key={card.key} label={card.label} value={card.value} />
                ))}
            </div>

            <ReportTableCard
                title={t('modeMoney.tables.bestPolicy.title')}
                description={t('modeMoney.tables.bestPolicy.description')}
                domId={`${domIdPrefix}-best-policy`}
                columns={visibleBestPolicyColumns.map(column => column.label)}
                rows={[visibleBestPolicyColumns.map(column => column.value())]}
            />

            <ReportTableCard
                title={t('modeMoney.tables.capital.title')}
                description={t('modeMoney.tables.capital.description')}
                domId={`${domIdPrefix}-capital`}
                columns={visibleCapitalColumns.map(column => column.label)}
                rows={[visibleCapitalColumns.map(column => column.value())]}
            />

            <ReportTableCard
                title={t('modeMoney.tables.risk.title')}
                description={t('modeMoney.tables.risk.description')}
                domId={`${domIdPrefix}-risk`}
                columns={visibleRiskColumns.map(column => column.label)}
                rows={[visibleRiskColumns.map(column => column.value())]}
            />
        </div>
    )
}

export default function ModeMoneySummaryPanel({
    mode,
    reportSlice = null,
    unavailableReason = null,
    showDefaultSliceNote = false,
    showTermsBlock = true,
    className
}: ModeMoneySummaryPanelProps) {
    const { t } = useTranslation('reports')
    const modeRegistryQuery = useModeRegistryQuery()
    const modeMoneySummaryQuery = usePolicyBranchMegaModeMoneySummaryQuery({
        enabled: unavailableReason === null
    })
    const modeRegistry = modeRegistryQuery.data ?? null
    const effectiveSlice = useMemo(
        () =>
            unavailableReason ?
                null
            :   resolveModeMoneySlice(modeRegistry, mode, reportSlice),
        [mode, modeRegistry, reportSlice, unavailableReason]
    )
    const sliceLabel = useMemo(
        () => resolveModeMoneySliceLabel(modeRegistry, mode, effectiveSlice),
        [effectiveSlice, mode, modeRegistry]
    )
    const selectedRow = useMemo(
        () => selectModeMoneySummaryRow(modeMoneySummaryQuery.data?.rows ?? null, mode, effectiveSlice),
        [effectiveSlice, mode, modeMoneySummaryQuery.data?.rows]
    )
    const blocksData = useMemo(
        () =>
            selectedRow && modeMoneySummaryQuery.data ?
                buildModeMoneyDataFromMegaSummaryRow(
                    selectedRow,
                    sliceLabel,
                    modeMoneySummaryQuery.data.moneyMetricDescriptors
                )
            :   null,
        [modeMoneySummaryQuery.data, selectedRow, sliceLabel]
    )

    if (unavailableReason) {
        return (
            <div className={classNames(cls.stack, {}, [className ?? ''])}>
                <div className={cls.noteCard}>
                    <Text type='h3'>{t('modeMoney.state.unavailableTitle')}</Text>
                    <Text className={cls.subtitle}>{unavailableReason}</Text>
                </div>
            </div>
        )
    }

    return (
        <div className={classNames(cls.stack, {}, [className ?? ''])}>
            {showDefaultSliceNote && !reportSlice && sliceLabel && (
                <Text className={cls.subtitle}>{t('modeMoney.notes.defaultSlice', { slice: sliceLabel })}</Text>
            )}
            {selectedRow && (
                <Text className={cls.subtitle}>{resolveModeMoneyStatusNote(selectedRow, t)}</Text>
            )}

            <PageSectionDataState
                isLoading={modeRegistryQuery.isLoading || modeMoneySummaryQuery.isLoading}
                isError={Boolean(modeRegistryQuery.error || modeMoneySummaryQuery.error)}
                error={modeRegistryQuery.error ?? modeMoneySummaryQuery.error ?? null}
                hasData={Boolean(blocksData)}
                onRetry={() => {
                    void modeRegistryQuery.refetch()
                    void modeMoneySummaryQuery.refetch()
                }}
                title={t('modeMoney.state.errorTitle')}
                description={t('modeMoney.state.errorMessage')}
                loadingText={t('errors:ui.pageDataBoundary.loading', { defaultValue: 'Loading data' })}
                logContext={{ source: 'mode-money-summary' }}>
                {blocksData ?
                    <ModeMoneyBlocks
                        data={blocksData}
                        domIdPrefix={`mode-money-${mode}-${effectiveSlice ?? 'unknown'}`}
                        showTermsBlock={showTermsBlock}
                    />
                :   !modeRegistryQuery.isLoading &&
                    !modeMoneySummaryQuery.isLoading &&
                    effectiveSlice &&
                    sliceLabel && (
                        <div className={cls.noteCard}>
                            <Text type='h3'>{t('modeMoney.state.emptyTitle')}</Text>
                            <Text className={cls.subtitle}>
                                {t('modeMoney.state.emptyDescription', { slice: sliceLabel })}
                            </Text>
                        </div>
                    )}
            </PageSectionDataState>
        </div>
    )
}
