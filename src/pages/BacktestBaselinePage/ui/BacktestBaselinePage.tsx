import classNames from '@/shared/lib/helpers/classNames'
import cls from './BacktestBaselinePage.module.scss'
import { TermTooltip, Text } from '@/shared/ui'
import { BacktestBaselineSnapshotDto, BacktestPolicySummaryDto } from '@/shared/types/backtest.types'
import { useBacktestBaselineSnapshotQuery } from '@/shared/api/tanstackQueries/backtest'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import type { BacktestBaselinePageProps } from './types'

const BASELINE_COLUMN_TOOLTIPS: Record<string, string> = {
    Политика: 'Имя торговой политики (стратегии), для которой приведены итоговые метрики.',
    Маржа: 'Режим маржи сделки: Cross или Isolated.',
    Режим: 'Ветка логики: Base или Anti‑direction (разворот направления при триггере риска).',
    'Итоговый PnL, %': 'Суммарная доходность по политике в процентах за период бэктеста.',
    'Max DD, %': 'Максимальная просадка капитала в процентах — ключевой риск‑показатель.',
    Ликвидации: 'Были ли ликвидации (Да/Нет). Критичный риск‑флаг.',
    'Withdraw, $': 'Сколько прибыли было выведено из капитала (если применимо).',
    Сделок: 'Количество сделок по политике за период.'
}

const renderTooltip = (term: string, description?: string) =>
    description ? <TermTooltip term={term} description={description} type='span' /> : term

/*
	BacktestBaselinePage — страница baseline-снимка бэктеста.

	Зачем:
		- Показывает метаданные baseline и таблицу политик.
		- Даёт лёгкий обзор без полного режима бэктеста.

	Источники данных и сайд-эффекты:
		- useBacktestBaselineSnapshotQuery() (TanStack Query).

	Контракты:
		- Внутренние секции получают валидный snapshot.
*/

export default function BacktestBaselinePage({ className }: BacktestBaselinePageProps) {
    const { data, isError, error, refetch } = useBacktestBaselineSnapshotQuery()

    const rootClassName = classNames(cls.BacktestBaselinePage, {}, [className ?? ''])

    return (
        <PageDataBoundary
            isError={isError}
            error={error}
            hasData={Boolean(data)}
            onRetry={refetch}
            errorTitle='Не удалось загрузить baseline бэктеста'>
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

// Пропсы шапки baseline-снимка.
interface HeaderProps {
    snapshot: BacktestBaselineSnapshotDto
}

/*
	Шапка baseline-снимка.

	- Показывает ID, конфиг и время генерации в UTC/локали.
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

// Пропсы блока глобальных параметров.
interface GlobalParamsProps {
    snapshot: BacktestBaselineSnapshotDto
}

/*
	Глобальные параметры бэктеста (SL/TP).

	- Конвертирует доли в проценты для человекочитаемого вида.
*/
function GlobalParams({ snapshot }: GlobalParamsProps) {
    const dailyStopPctStr = `${(snapshot.dailyStopPct * 100).toFixed(2)} %`
    const dailyTpPctStr = `${(snapshot.dailyTpPct * 100).toFixed(2)} %`

    return (
        <section className={cls.globalParams}>
            <Text type='h2'>Глобальные параметры</Text>
            <Text>
                Базовые настройки риска, применяемые ко всем политикам в baseline‑запуске. Эти значения задают дневные
                границы стоп‑лосса и тейк‑профита.
            </Text>
            <dl className={cls.kvList}>
                <div className={cls.kvRow}>
                    <dt>
                        {renderTooltip(
                            'Дневной стоп (SL)',
                            'Процентное ограничение убытка на день. Если цена проходит дальше — позиция закрывается.'
                        )}
                    </dt>
                    <dd>{dailyStopPctStr}</dd>
                </div>
                <div className={cls.kvRow}>
                    <dt>
                        {renderTooltip(
                            'Дневной тейк-профит (TP)',
                            'Процентное ограничение прибыли на день. При достижении уровня фиксируем прибыль.'
                        )}
                    </dt>
                    <dd>{dailyTpPctStr}</dd>
                </div>
            </dl>
        </section>
    )
}

// Пропсы таблицы политик.
interface PoliciesTableProps {
    policies: BacktestPolicySummaryDto[]
}

/*
	Таблица политик baseline.

	- Показывает итоговый PnL, просадки, ликвидации и счётчики сделок.
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
            <Text>
                Сводная таблица результатов baseline‑запуска для каждой политики. Это быстрый способ сравнить доходность
                и риск до детальных диагностик.
            </Text>
            <table className={cls.table}>
                <thead>
                    <tr>
                        <th>{renderTooltip('Политика', BASELINE_COLUMN_TOOLTIPS.Политика)}</th>
                        <th>{renderTooltip('Маржа', BASELINE_COLUMN_TOOLTIPS.Маржа)}</th>
                        <th>{renderTooltip('Режим', BASELINE_COLUMN_TOOLTIPS.Режим)}</th>
                        <th>{renderTooltip('Итоговый PnL, %', BASELINE_COLUMN_TOOLTIPS['Итоговый PnL, %'])}</th>
                        <th>{renderTooltip('Max DD, %', BASELINE_COLUMN_TOOLTIPS['Max DD, %'])}</th>
                        <th>{renderTooltip('Ликвидации', BASELINE_COLUMN_TOOLTIPS.Ликвидации)}</th>
                        <th>{renderTooltip('Withdraw, $', BASELINE_COLUMN_TOOLTIPS['Withdraw, $'])}</th>
                        <th>{renderTooltip('Сделок', BASELINE_COLUMN_TOOLTIPS.Сделок)}</th>
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
