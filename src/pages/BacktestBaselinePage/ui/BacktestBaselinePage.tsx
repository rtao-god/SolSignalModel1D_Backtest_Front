import classNames from '@/shared/lib/helpers/classNames'
import cls from './BacktestBaselinePage.module.scss'
import { TermTooltip, Text } from '@/shared/ui'
import { enrichTermTooltipDescription } from '@/shared/ui/TermTooltip'
import { BacktestBaselineSnapshotDto, BacktestPolicySummaryDto } from '@/shared/types/backtest.types'
import type { PolicyEvaluationDto } from '@/shared/types/policyEvaluation.types'
import { useBacktestBaselineSnapshotQuery } from '@/shared/api/tanstackQueries/backtest'
import type { BacktestBaselinePageProps } from './types'
import { useTranslation } from 'react-i18next'
import { SectionDataState } from '@/shared/ui/errors/SectionDataState'
import { resolveCommonReportColumnTooltipOrNull } from '@/shared/terms/common'

const renderTooltip = (term: string, description?: string) =>
    description ?
        <TermTooltip term={term} description={enrichTermTooltipDescription(description, { term })} type='span' />
    :   term

function resolveEvaluationRowClass(evaluation: PolicyEvaluationDto | null): string | undefined {
    if (!evaluation) {
        return undefined
    }

    if (evaluation.status === 'good') return cls.rowGood
    if (evaluation.status === 'caution') return cls.rowCaution
    if (evaluation.status === 'bad') return cls.rowBad
    return cls.rowUnknown
}

function resolveEvaluationRowTitle(evaluation: PolicyEvaluationDto | null): string | undefined {
    const reasons = evaluation?.reasons?.map(reason => reason.message).filter(Boolean) ?? []
    if (reasons.length === 0) {
        return undefined
    }

    return reasons.join(' | ')
}

export default function BacktestBaselinePage({ className }: BacktestBaselinePageProps) {
    const { t } = useTranslation('reports')
    const { data, isLoading, isError, error, refetch } = useBacktestBaselineSnapshotQuery()

    const rootClassName = classNames(cls.BacktestBaselinePage, {}, [className ?? ''])

    return (
        <div className={rootClassName}>
            <Header snapshot={data ?? null} />

            <SectionDataState
                isLoading={isLoading}
                isError={isError}
                error={error}
                hasData={Boolean(data)}
                onRetry={refetch}
                title={t('backtestBaseline.page.errorTitle')}
                loadingText={t('errors:ui.pageDataBoundary.loading', { defaultValue: 'Loading data' })}
                logContext={{ source: 'backtest-baseline-page' }}>
                {data && (
                    <>
                        <GlobalParams snapshot={data} />
                        <PoliciesTable policies={data.policies ?? []} />
                    </>
                )}
            </SectionDataState>
        </div>
    )
}
interface HeaderProps {
    snapshot: BacktestBaselineSnapshotDto | null
}

function Header({ snapshot }: HeaderProps) {
    const { t } = useTranslation('reports')
    const generatedUtc = snapshot?.generatedAtUtc ? new Date(snapshot.generatedAtUtc) : null
    const generatedUtcStr = generatedUtc ? generatedUtc.toISOString().replace('T', ' ').replace('Z', ' UTC') : '—'
    const generatedLocalStr = generatedUtc ? generatedUtc.toLocaleString() : '—'

    return (
        <header className={cls.header}>
            <Text type='h1'>{t('backtestBaseline.header.title')}</Text>
            {snapshot && (
                <>
                    <Text>{t('backtestBaseline.header.snapshotId', { id: snapshot.id })}</Text>
                    <Text>{t('backtestBaseline.header.config', { configName: snapshot.configName })}</Text>
                    <Text>{t('backtestBaseline.header.generatedUtc', { generatedUtc: generatedUtcStr })}</Text>
                    <Text>{t('backtestBaseline.header.generatedLocal', { generatedLocal: generatedLocalStr })}</Text>
                </>
            )}
        </header>
    )
}
interface GlobalParamsProps {
    snapshot: BacktestBaselineSnapshotDto
}

function GlobalParams({ snapshot }: GlobalParamsProps) {
    const { t } = useTranslation('reports')
    const dailyStopPctStr = `${(snapshot.dailyStopPct * 100).toFixed(2)} %`
    const dailyTpPctStr = `${(snapshot.dailyTpPct * 100).toFixed(2)} %`

    return (
        <section className={cls.globalParams}>
            <Text type='h2'>{t('backtestBaseline.globalParams.title')}</Text>
            <Text>{t('backtestBaseline.globalParams.description')}</Text>
            <dl className={cls.kvList}>
                <div className={cls.kvRow}>
                    <dt>
                        {renderTooltip(
                            t('backtestBaseline.globalParams.dailySl.term'),
                            t('backtestBaseline.globalParams.dailySl.tooltip')
                        )}
                    </dt>
                    <dd>{dailyStopPctStr}</dd>
                </div>
                <div className={cls.kvRow}>
                    <dt>
                        {renderTooltip(
                            t('backtestBaseline.globalParams.dailyTp.term'),
                            t('backtestBaseline.globalParams.dailyTp.tooltip')
                        )}
                    </dt>
                    <dd>{dailyTpPctStr}</dd>
                </div>
            </dl>
        </section>
    )
}
interface PoliciesTableProps {
    policies: BacktestPolicySummaryDto[]
}

function PoliciesTable({ policies }: PoliciesTableProps) {
    const { t, i18n } = useTranslation('reports')
    const tooltipLocale = (i18n.resolvedLanguage ?? i18n.language).startsWith('ru') ? 'ru' : 'en'
    const resolveSharedReportTooltip = (title: string): string => {
        const description = resolveCommonReportColumnTooltipOrNull(title, tooltipLocale)
        if (!description) {
            throw new Error(`Missing shared report tooltip for '${title}' in BacktestBaselinePage.`)
        }

        return description
    }

    const tableColumns = [
        {
            label: t('backtestBaseline.table.columns.policy.label'),
            tooltip: resolveSharedReportTooltip('Policy')
        },
        {
            label: t('backtestBaseline.table.columns.margin.label'),
            tooltip: t('backtestBaseline.table.columns.margin.tooltip')
        },
        {
            label: t('backtestBaseline.table.columns.mode.label'),
            tooltip: t('backtestBaseline.table.columns.mode.tooltip')
        },
        {
            label: t('backtestBaseline.table.columns.totalPnlPct.label'),
            tooltip: t('backtestBaseline.table.columns.totalPnlPct.tooltip')
        },
        {
            label: t('backtestBaseline.table.columns.maxDdPct.label'),
            tooltip: t('backtestBaseline.table.columns.maxDdPct.tooltip')
        },
        {
            label: t('backtestBaseline.table.columns.liquidations.label'),
            tooltip: t('backtestBaseline.table.columns.liquidations.tooltip')
        },
        {
            label: t('backtestBaseline.table.columns.withdrawUsd.label'),
            tooltip: t('backtestBaseline.table.columns.withdrawUsd.tooltip')
        },
        {
            label: t('backtestBaseline.table.columns.trades.label'),
            tooltip: t('backtestBaseline.table.columns.trades.tooltip')
        }
    ]

    if (!Array.isArray(policies) || policies.length === 0) {
        return (
            <section className={cls.policiesSection}>
                <Text type='h2'>{t('backtestBaseline.table.empty.title')}</Text>
                <Text>{t('backtestBaseline.table.empty.description')}</Text>
            </section>
        )
    }

    return (
        <section className={cls.policiesSection}>
            <Text type='h2'>{t('backtestBaseline.table.title')}</Text>
            <Text>{t('backtestBaseline.table.description')}</Text>
            <table className={cls.table}>
                <thead>
                    <tr>
                        {tableColumns.map(column => (
                            <th key={column.label}>{renderTooltip(column.label, column.tooltip)}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {policies.map(policy => (
                        <tr
                            key={`${policy.policyName}_${policy.marginMode}_${String(policy.useAntiDirectionOverlay)}`}
                            className={resolveEvaluationRowClass(policy.evaluation)}
                            title={resolveEvaluationRowTitle(policy.evaluation)}>
                            <td>{policy.policyName}</td>
                            <td>{policy.marginMode}</td>
                            <td>
                                {policy.useAntiDirectionOverlay ?
                                    t('backtestBaseline.table.mode.antiDirection')
                                :   t('backtestBaseline.table.mode.base')}
                            </td>
                            <td>{(policy.totalPnlPct * 100).toFixed(2)}</td>
                            <td>{(policy.maxDrawdownPct * 100).toFixed(2)}</td>
                            <td>
                                {policy.hadLiquidation ?
                                    t('backtestBaseline.table.liquidations.yes')
                                :   t('backtestBaseline.table.liquidations.no')}
                            </td>
                            <td>{policy.withdrawnTotal.toFixed(2)}</td>
                            <td>{policy.tradesCount}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    )
}
