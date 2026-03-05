import classNames from '@/shared/lib/helpers/classNames'
import cls from './BacktestBaselinePage.module.scss'
import { TermTooltip, Text } from '@/shared/ui'
import { enrichTermTooltipDescription } from '@/shared/ui/TermTooltip'
import { BacktestBaselineSnapshotDto, BacktestPolicySummaryDto } from '@/shared/types/backtest.types'
import { useBacktestBaselineSnapshotQuery } from '@/shared/api/tanstackQueries/backtest'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import type { BacktestBaselinePageProps } from './types'
import { useTranslation } from 'react-i18next'

const renderTooltip = (term: string, description?: string) =>
    description ?
        <TermTooltip term={term} description={enrichTermTooltipDescription(description, { term })} type='span' />
    :   term

export default function BacktestBaselinePage({ className }: BacktestBaselinePageProps) {
    const { t } = useTranslation('reports')
    const { data, isError, error, refetch } = useBacktestBaselineSnapshotQuery()

    const rootClassName = classNames(cls.BacktestBaselinePage, {}, [className ?? ''])

    return (
        <PageDataBoundary
            isError={isError}
            error={error}
            hasData={Boolean(data)}
            onRetry={refetch}
            errorTitle={t('backtestBaseline.page.errorTitle')}>
            {data && (
                <div className={rootClassName}>
                    <Header snapshot={data} />
                    <GlobalParams snapshot={data} />
                    <PoliciesTable policies={data.policies ?? []} />
                </div>
            )}
        </PageDataBoundary>
    )
}
interface HeaderProps {
    snapshot: BacktestBaselineSnapshotDto
}

function Header({ snapshot }: HeaderProps) {
    const { t } = useTranslation('reports')
    const generatedUtc = snapshot.generatedAtUtc ? new Date(snapshot.generatedAtUtc) : null
    const generatedUtcStr = generatedUtc ? generatedUtc.toISOString().replace('T', ' ').replace('Z', ' UTC') : '—'
    const generatedLocalStr = generatedUtc ? generatedUtc.toLocaleString() : '—'

    return (
        <header className={cls.header}>
            <Text type='h1'>{t('backtestBaseline.header.title')}</Text>
            <Text>{t('backtestBaseline.header.snapshotId', { id: snapshot.id })}</Text>
            <Text>{t('backtestBaseline.header.config', { configName: snapshot.configName })}</Text>
            <Text>{t('backtestBaseline.header.generatedUtc', { generatedUtc: generatedUtcStr })}</Text>
            <Text>{t('backtestBaseline.header.generatedLocal', { generatedLocal: generatedLocalStr })}</Text>
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
    const { t } = useTranslation('reports')

    const tableColumns = [
        {
            label: t('backtestBaseline.table.columns.policy.label'),
            tooltip: t('backtestBaseline.table.columns.policy.tooltip')
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
                        <tr key={`${policy.policyName}_${policy.marginMode}_${String(policy.useAntiDirectionOverlay)}`}>
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
