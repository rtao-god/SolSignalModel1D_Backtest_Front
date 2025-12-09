import classNames from '@/shared/lib/helpers/classNames'
import cls from './BacktestBaselinePage.module.scss'
import { Text } from '@/shared/ui'
import { BacktestBaselineSnapshotDto, BacktestPolicySummaryDto } from '@/shared/types/backtest.types'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import { resolveAppError } from '@/shared/lib/errors/resolveAppError'
import { useBacktestBaselineSnapshotQuery } from '@/shared/api/tanstackQueries/backtest'

interface BacktestBaselinePageProps {
    className?: string
}

/**
 * Страница, показывающая лёгкий baseline-снимок бэктеста:
 * - метаданные (configName, время генерации, SL/TP);
 * - таблицу политик с PnL, просадкой и ликвидациями.
 * Данные приходят через Suspense-хук useBacktestBaselineSnapshotQuery.
 */
export default function BacktestBaselinePage({ className }: BacktestBaselinePageProps) {
    const { data, isError, error } = useBacktestBaselineSnapshotQuery()

    const rootClassName = classNames(cls.BacktestBaselinePage, {}, [className ?? ''])

    if (isError || !data) {
        const resolved = isError ? resolveAppError(error) : undefined

        return (
            <div className={rootClassName}>
                <ErrorBlock
                    code={resolved?.code ?? (isError ? 'UNKNOWN' : 'EMPTY')}
                    title={resolved?.title ?? 'Не удалось загрузить baseline бэктеста'}
                    description={
                        resolved?.description ??
                        'Проверьте, что бэкенд запущен и endpoint снапшота baseline-бэктеста отдаёт данные.'
                    }
                    details={resolved?.rawMessage}
                />
            </div>
        )
    }

    return (
        <div className={rootClassName}>
            <Header snapshot={data} />
            <GlobalParams snapshot={data} />
            <PoliciesTable policies={data.policies ?? []} />
        </div>
    )
}

interface HeaderProps {
    snapshot: BacktestBaselineSnapshotDto
}

/**
 * Шапка: базовая информация о снапшоте + время в UTC и локали.
 */
function Header({ snapshot }: HeaderProps) {
    const generatedUtc = snapshot.generatedAtUtc ? new Date(snapshot.generatedAtUtc) : null
    const generatedUtcStr = generatedUtc ? generatedUtc.toISOString().replace('T', ' ').replace('Z', ' UTC') : '—'
    const generatedLocalStr = generatedUtc ? generatedUtc.toLocaleString() : '—'

    return (
        <header className={cls.header}>
            <Text type='h1'>Baseline бэктеста</Text>
            <Text>ID снапшота: {snapshot.id}</Text>
            <Text>Конфиг: {snapshot.configName}</Text>
            <Text>Сгенерировано (UTC): {generatedUtcStr}</Text>
            <Text>Сгенерировано (локальное время): {generatedLocalStr}</Text>
        </header>
    )
}

interface GlobalParamsProps {
    snapshot: BacktestBaselineSnapshotDto
}

/**
 * Блок с глобальными параметрами бэктеста (SL/TP).
 * Проценты конвертируются из долей (0.05 → 5.00 %).
 */
function GlobalParams({ snapshot }: GlobalParamsProps) {
    const dailyStopPctStr = `${(snapshot.dailyStopPct * 100).toFixed(2)} %`
    const dailyTpPctStr = `${(snapshot.dailyTpPct * 100).toFixed(2)} %`

    return (
        <section className={cls.globalParams}>
            <Text type='h2'>Глобальные параметры</Text>
            <dl className={cls.kvList}>
                <div className={cls.kvRow}>
                    <dt>Дневной стоп (SL)</dt>
                    <dd>{dailyStopPctStr}</dd>
                </div>
                <div className={cls.kvRow}>
                    <dt>Дневной тейк-профит (TP)</dt>
                    <dd>{dailyTpPctStr}</dd>
                </div>
            </dl>
        </section>
    )
}

interface PoliciesTableProps {
    policies: BacktestPolicySummaryDto[]
}

/**
 * Таблица по политикам:
 * - имя, режим маржи, base/anti;
 * - итоговый PnL, max DD, ликвидации;
 * - суммарный withdraw и количество сделок.
 */
function PoliciesTable({ policies }: PoliciesTableProps) {
    if (!Array.isArray(policies) || policies.length === 0) {
        return (
            <section className={cls.policiesSection}>
                <Text type='h2'>Политики</Text>
                <Text>Нет данных по политикам.</Text>
            </section>
        )
    }

    return (
        <section className={cls.policiesSection}>
            <Text type='h2'>Политики (baseline, WITH SL)</Text>
            <table className={cls.table}>
                <thead>
                    <tr>
                        <th>Политика</th>
                        <th>Маржа</th>
                        <th>Режим</th>
                        <th>Итоговый PnL, %</th>
                        <th>Max DD, %</th>
                        <th>Ликвидации</th>
                        <th>Withdraw, $</th>
                        <th>Сделок</th>
                    </tr>
                </thead>
                <tbody>
                    {policies.map(policy => (
                        <tr key={`${policy.policyName}_${policy.marginMode}_${String(policy.useAntiDirectionOverlay)}`}>
                            <td>{policy.policyName}</td>
                            <td>{policy.marginMode}</td>
                            <td>{policy.useAntiDirectionOverlay ? 'Anti-direction' : 'Base'}</td>
                            <td>{(policy.totalPnlPct * 100).toFixed(2)}</td>
                            <td>{(policy.maxDrawdownPct * 100).toFixed(2)}</td>
                            <td>{policy.hadLiquidation ? 'Да' : 'Нет'}</td>
                            <td>{policy.withdrawnTotal.toFixed(2)}</td>
                            <td>{policy.tradesCount}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </section>
    )
}
