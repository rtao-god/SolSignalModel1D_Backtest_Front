import { useMemo } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { Link, TermTooltip, Text } from '@/shared/ui'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'
import { usePolicyBranchMegaReportNavQuery } from '@/shared/api/tanstackQueries/policyBranchMega'
import type { TableSectionDto } from '@/shared/types/report.types'
import { ReportTableCard } from '@/shared/ui/ReportTableCard'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { tryParseNumberFromString } from '@/shared/ui/SortableTable'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import {
    buildPolicyBranchMegaTermsForColumns,
    getPolicyBranchMegaTermOrThrow,
    orderPolicyBranchMegaSectionsOrThrow,
    resolvePolicyBranchMegaSectionDescription
} from '@/shared/utils/policyBranchMegaTerms'
import { normalizePolicyBranchMegaTitle } from '@/shared/utils/policyBranchMegaTabs'
import cls from './Main.module.scss'
import MainProps from './types'

/*
    Main — главная страница проекта.

    Зачем:
        - Даёт понятную карту проекта и точку входа для покупателя/CTO/аналитика.
        - Показывает лучшую политику и её метрики на всей истории.
        - Объясняет ключевые термины без погружения в код.

    Источники данных и сайд-эффекты:
        - usePolicyBranchMegaReportNavQuery() для best policy и mega-метрик.

    Контракты:
        - policy_branch_mega должен содержать 3 части Policy Branch Mega.
        - Колонки обязаны быть описаны в policyBranchMegaTerms (иначе выводим ошибку блока).
*/

interface BestPolicyRowBundle {
    policy: string
    branch: string
    totalPnlPct: number
    part1: TableSectionDto
    part2: TableSectionDto
    part3: TableSectionDto
    part1Row: string[]
    part2Row: string[]
    part3Row: string[]
}

const DEFAULT_POLICY_BRANCH_TABS = [
    { label: 'Часть 1/3', anchor: 'policy-branch-section-1' },
    { label: 'Часть 2/3', anchor: 'policy-branch-section-2' },
    { label: 'Часть 3/3', anchor: 'policy-branch-section-3' }
]

// Отфильтровываем пустые секции без колонок.
function buildTableSections(sections: unknown[]): TableSectionDto[] {
    return (sections ?? []).filter(
        (section): section is TableSectionDto =>
            Array.isArray((section as TableSectionDto).columns) && (section as TableSectionDto).columns!.length > 0
    )
}

function columnIndexOrThrow(columns: string[] | undefined, title: string, tag: string): number {
    if (!columns || columns.length === 0) {
        throw new Error(`[main] ${tag} columns are empty.`)
    }

    const idx = columns.indexOf(title)
    if (idx < 0) {
        throw new Error(`[main] ${tag} column not found: ${title}.`)
    }

    return idx
}

function buildPolicyBranchKey(policy: string, branch: string): string {
    return `${policy}::${branch}`
}

// Достаём строку лучшей политики по TotalPnl% и связываем с частями 2/3, 3/3.
function resolveBestPolicyRowsOrThrow(sections: TableSectionDto[]): BestPolicyRowBundle {
    if (!sections || sections.length < 3) {
        throw new Error('[main] policy branch mega sections count is less than 3.')
    }

    const [part1, part2, part3] = sections

    const part1Columns = part1.columns ?? []
    const part1Rows = part1.rows ?? []

    if (part1Rows.length === 0) {
        throw new Error('[main] Policy Branch Mega Part 1 has no rows.')
    }

    const policyIdx = columnIndexOrThrow(part1Columns, 'Policy', 'part1')
    const branchIdx = columnIndexOrThrow(part1Columns, 'Branch', 'part1')
    const totalPnlIdx = columnIndexOrThrow(part1Columns, 'TotalPnl%', 'part1')

    let bestRow: string[] | null = null
    let bestTotal = -Infinity

    for (const row of part1Rows) {
        if (!row || row.length <= totalPnlIdx) {
            throw new Error('[main] Policy Branch Mega Part 1 row is malformed.')
        }

        const totalRaw = row[totalPnlIdx]
        const totalParsed = typeof totalRaw === 'string' ? tryParseNumberFromString(totalRaw) : null
        if (totalParsed === null) {
            throw new Error(`[main] TotalPnl% is not a number: ${totalRaw}`)
        }

        if (bestRow === null || totalParsed > bestTotal) {
            bestRow = row
            bestTotal = totalParsed
        }
    }

    if (!bestRow) {
        throw new Error('[main] Failed to resolve best policy row.')
    }

    const policyName = bestRow[policyIdx] ?? ''
    const branchName = bestRow[branchIdx] ?? ''

    if (!policyName || !branchName) {
        throw new Error('[main] Best policy row missing Policy or Branch.')
    }

    const key = buildPolicyBranchKey(policyName, branchName)

    const part2Row = resolveRowByPolicyOrThrow(part2, key, 'part2')
    const part3Row = resolveRowByPolicyOrThrow(part3, key, 'part3')

    return {
        policy: policyName,
        branch: branchName,
        totalPnlPct: bestTotal,
        part1,
        part2,
        part3,
        part1Row: bestRow,
        part2Row,
        part3Row
    }
}

// Ищем соответствующую строку по ключу policy+branch.
function resolveRowByPolicyOrThrow(section: TableSectionDto, key: string, tag: string): string[] {
    const columns = section.columns ?? []
    const rows = section.rows ?? []

    const policyIdx = columnIndexOrThrow(columns, 'Policy', tag)
    const branchIdx = columnIndexOrThrow(columns, 'Branch', tag)

    const map = new Map<string, string[]>()

    for (const row of rows) {
        if (!row || row.length <= Math.max(policyIdx, branchIdx)) {
            throw new Error(`[main] ${tag} row is malformed.`)
        }

        const policy = row[policyIdx] ?? ''
        const branch = row[branchIdx] ?? ''
        if (!policy || !branch) {
            throw new Error(`[main] ${tag} row missing Policy or Branch.`)
        }

        const rowKey = buildPolicyBranchKey(policy, branch)
        if (map.has(rowKey)) {
            throw new Error(`[main] ${tag} has duplicate policy row for ${rowKey}.`)
        }

        map.set(rowKey, row)
    }

    const resolved = map.get(key)
    if (!resolved) {
        throw new Error(`[main] ${tag} row not found for ${key}.`)
    }

    return resolved
}

// Ищем конкретную метрику по всем трём частям mega-таблиц.
function resolveMetricValue(bundle: BestPolicyRowBundle, title: string): string {
    const candidates: Array<{ columns: string[]; row: string[] }> = [
        { columns: bundle.part1.columns ?? [], row: bundle.part1Row },
        { columns: bundle.part2.columns ?? [], row: bundle.part2Row },
        { columns: bundle.part3.columns ?? [], row: bundle.part3Row }
    ]

    for (const candidate of candidates) {
        const idx = candidate.columns.indexOf(title)
        if (idx >= 0) {
            if (candidate.row.length <= idx) {
                throw new Error(`[main] metric value is missing for ${title}.`)
            }
            const value = candidate.row[idx]
            if (value === undefined || value === null || value === '') {
                throw new Error(`[main] metric value is empty for ${title}.`)
            }
            return value
        }
    }

    throw new Error(`[main] metric not found in policy branch mega parts: ${title}.`)
}

// Короткое бизнес-описание выбранной политики (для витрины).
function renderPolicyDescription(policyName: string, branchName: string): string[] {
    const description: string[] = []

    if (policyName.toLowerCase().includes('spot_conf_cap')) {
        description.push(
            'Кап‑доля (cap fraction) зависит от уверенности модели Conf_Day: при Conf_Day ≤ 0.50 берётся capMin = 10%, далее линейно растёт до capMax = 100%. Это чисто каузальная логика, без будущих данных.'
        )
        description.push('Плечо всегда 1x, поэтому стратегия ведёт себя как спотовая.')
    } else {
        description.push(
            `Это не spot_conf_cap. Конкретные правила плеча и cap‑доли смотри в колонках Lev/Cap — они отражают фактические значения, использованные в бэктесте.`
        )
    }

    description.push(
        `Ветка ${branchName}: если условия anti‑direction выполняются (risk‑day + MinMove 0.5–12% + запас до ликвидации ≥ 2× MinMove), направление сделки инвертируется.`
    )

    return description
}

export default function Main({ className }: MainProps) {
    const rootClassName = classNames(cls.MainPage, {}, [className ?? ''])

    const { data, isError, error, refetch, isLoading } = usePolicyBranchMegaReportNavQuery({ enabled: true })

    const tableSections = useMemo(() => buildTableSections(data?.sections ?? []), [data])

    const megaSectionsState = useMemo(() => {
        if (!data) return { sections: [] as TableSectionDto[], error: null as Error | null }

        try {
            const ordered = orderPolicyBranchMegaSectionsOrThrow(tableSections)
            return { sections: ordered, error: null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse policy branch mega sections.')
            return { sections: [] as TableSectionDto[], error: safeError }
        }
    }, [data, tableSections])

    const bestPolicyState = useMemo(() => {
        if (!data) return { best: null as BestPolicyRowBundle | null, error: null as Error | null }

        if (megaSectionsState.error) {
            return { best: null as BestPolicyRowBundle | null, error: megaSectionsState.error }
        }

        try {
            const best = resolveBestPolicyRowsOrThrow(megaSectionsState.sections)
            return { best, error: null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to resolve best policy row.')
            return { best: null as BestPolicyRowBundle | null, error: safeError }
        }
    }, [data, megaSectionsState])

    const bestPolicyHighlightsState = useMemo(() => {
        if (!bestPolicyState.best) return { items: [] as Array<{ title: string; tooltip: string; value: string }>, error: null as Error | null }

        try {
            const items = [
                'TotalPnl%',
                'TotalPnl$',
                'MaxDD%',
                'Sharpe',
                'Sortino',
                'Calmar',
                'CAGR%',
                'WinRate%',
                'HadLiq'
            ]

            const mapped = items.map(title => {
                const term = getPolicyBranchMegaTermOrThrow(title)
                const value = resolveMetricValue(bestPolicyState.best!, title)

                return {
                    title,
                    tooltip: term.tooltip,
                    value
                }
            })

            return { items: mapped, error: null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to build best policy highlights.')
            return { items: [] as Array<{ title: string; tooltip: string; value: string }>, error: safeError }
        }
    }, [bestPolicyState.best])

    const bestPolicyMetaState = useMemo(() => {
        if (!bestPolicyState.best) return { items: [] as Array<{ title: string; tooltip: string; value: string }>, error: null as Error | null }

        try {
            const items = ['StartDay', 'EndDay', 'Days', 'StopReason']

            const mapped = items.map(title => {
                const term = getPolicyBranchMegaTermOrThrow(title)
                const value = resolveMetricValue(bestPolicyState.best!, title)

                return {
                    title,
                    tooltip: term.tooltip,
                    value
                }
            })

            return { items: mapped, error: null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to build best policy meta info.')
            return { items: [] as Array<{ title: string; tooltip: string; value: string }>, error: safeError }
        }
    }, [bestPolicyState.best])

    const bestPolicyParts = useMemo(() => {
        if (!bestPolicyState.best) return []

        return [
            {
                id: 'policy-branch-part-1',
                section: bestPolicyState.best.part1,
                row: bestPolicyState.best.part1Row,
                label: 'Часть 1/3'
            },
            {
                id: 'policy-branch-part-2',
                section: bestPolicyState.best.part2,
                row: bestPolicyState.best.part2Row,
                label: 'Часть 2/3'
            },
            {
                id: 'policy-branch-part-3',
                section: bestPolicyState.best.part3,
                row: bestPolicyState.best.part3Row,
                label: 'Часть 3/3'
            }
        ]
    }, [bestPolicyState.best])

    const renderColumnTitle = (title: string) => {
        const term = getPolicyBranchMegaTermOrThrow(title)
        return renderTermTooltipTitle(title, term.tooltip)
    }

    return (
        <div className={rootClassName}>
            <section className={cls.hero}>
                <Text type='h1' className={cls.heroTitle}>
                    SolSignal 1D ML‑модель
                </Text>
                <Text className={cls.heroSubtitle}>
                    Дневная ML‑модель, которая прогнозирует движение SOL/USDT по данным BTC, макро‑индикаторам и
                    внутренним фичам. На сайте собраны прогнозы, бэктесты и диагностики, чтобы быстро понять «что
                    модель говорит сейчас» и «как это работало на истории».
                </Text>
                <div className={cls.heroMeta}>
                    <div className={cls.metaPill}>24h горизонт</div>
                    <div className={cls.metaPill}>Path-based labeling</div>
                    <div className={cls.metaPill}>Multi-layer (day / micro / SL)</div>
                    <div className={cls.metaPill}>Backtest + diagnostics</div>
                </div>
            </section>

            <section className={cls.overview}>
                <Text type='h2' className={cls.sectionTitle}>
                    Что уже делает проект
                </Text>
                <div className={cls.overviewGrid}>
                    <article className={cls.overviewCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            Прогнозы и торговые планы
                        </Text>
                        <Text className={cls.cardText}>
                            Модель ежедневно даёт направление дня, оценивает minMove, риск SL‑дней и формирует план
                            сделок по политикам. Всё это доступно в «Текущем прогнозе» и «Истории прогнозов».
                        </Text>
                    </article>
                    <article className={cls.overviewCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            Бэктест на всей истории
                        </Text>
                        <Text className={cls.cardText}>
                            Пайплайн считает итоговую доходность, просадки и ликвидации по всем политикам, а также
                            строит сводку и глубокие диагностические отчёты (включая mega‑таблицы).
                        </Text>
                    </article>
                    <article className={cls.overviewCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            Диагностика качества решений
                        </Text>
                        <Text className={cls.cardText}>
                            Есть отдельные блоки по guardrail/specificity, blame‑split, hotspots и статистике по дням —
                            чтобы понимать, где стратегия теряет деньги и почему.
                        </Text>
                    </article>
                    <article className={cls.overviewCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            Метрики моделей и PFI
                        </Text>
                        <Text className={cls.cardText}>
                            Отчёты по качеству моделей (confusion, SL‑метрики) и важности признаков. Они помогают
                            объяснить «почему модель решает именно так».
                        </Text>
                    </article>
                </div>
            </section>

            <section className={cls.flow}>
                <Text type='h2' className={cls.sectionTitle}>
                    Рекомендуемый путь пользователя
                </Text>
                <Text className={cls.flowSubtitle}>
                    Если вы покупатель/инвестор/CTO, начните с факта «что модель говорит сейчас», затем проверьте
                    историю и PnL‑метрики.
                </Text>
                <div className={cls.flowRow}>
                    <div className={cls.flowStep}>Текущий прогноз</div>
                    <div className={cls.flowArrow}>→</div>
                    <div className={cls.flowStep}>История прогнозов</div>
                    <div className={cls.flowArrow}>→</div>
                    <div className={cls.flowStep}>Сводка бэктеста (PnL)</div>
                    <div className={cls.flowArrow}>→</div>
                    <div className={cls.flowStep}>Policy Branch Mega</div>
                    <div className={cls.flowArrow}>→</div>
                    <div className={cls.flowStep}>Диагностика</div>
                </div>
            </section>

            <SectionErrorBoundary name='MainBestPolicy'>
                <section className={cls.bestPolicy}>
                    <div className={cls.bestPolicyHeader}>
                        <div>
                            <Text type='h2' className={cls.sectionTitle}>
                                Лучшая политика на истории
                            </Text>
                            <Text className={cls.bestPolicySubtitle}>
                                Выбираем политику с максимальным TotalPnl% в mega‑таблице (ALL HISTORY, WITH SL).
                                Критерий можно легко заменить, но сейчас он максимально прозрачен для бизнеса.
                            </Text>
                        </div>
                        <Link to={ROUTE_PATH[AppRoute.BACKTEST_POLICY_BRANCH_MEGA]} className={cls.bestPolicyLink}>
                            Открыть полный Policy Branch Mega →
                        </Link>
                    </div>

                    {isLoading ? (
                        <Text>Загружаю mega‑таблицы…</Text>
                    ) : isError ? (
                        <ErrorBlock
                            code='NETWORK'
                            title='Не удалось загрузить mega‑таблицу'
                            description='Бэкенд не вернул policy_branch_mega. Проверь генерацию отчёта.'
                            details={error instanceof Error ? error.message : String(error ?? '')}
                            onRetry={refetch}
                        />
                    ) : megaSectionsState.error ? (
                        <ErrorBlock
                            code='DATA'
                            title='Некорректная структура mega‑таблицы'
                            description='Не удалось распознать секции Policy Branch Mega.'
                            details={megaSectionsState.error.message}
                        />
                    ) : bestPolicyState.error ? (
                        <ErrorBlock
                            code='DATA'
                            title='Не удалось определить лучшую политику'
                            description='Проверь колонки и данные mega‑таблиц.'
                            details={bestPolicyState.error.message}
                        />
                    ) : bestPolicyState.best ? (
                        <>
                            <div className={cls.bestPolicyHero}>
                                <div>
                                    <Text type='h3' className={cls.bestPolicyName}>
                                        {bestPolicyState.best.policy} / {bestPolicyState.best.branch}
                                    </Text>
                                    <Text className={cls.bestPolicyNote}>
                                        Лучший результат по TotalPnl%: {bestPolicyState.best.totalPnlPct.toFixed(2)}%.
                                    </Text>
                                </div>

                                {bestPolicyMetaState.error ? (
                                    <ErrorBlock
                                        code='DATA'
                                        title='Ошибка при чтении мета‑параметров'
                                        description='Не удалось собрать ключевые поля периода для лучшей политики.'
                                        details={bestPolicyMetaState.error.message}
                                    />
                                ) : (
                                    <div className={cls.bestPolicyMeta}>
                                        {bestPolicyMetaState.items.map(item => (
                                            <div key={item.title} className={cls.bestPolicyMetaItem}>
                                                <TermTooltip
                                                    term={item.title}
                                                    description={item.tooltip}
                                                    type='span'
                                                />
                                                <span className={cls.bestPolicyMetaValue}>{item.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {bestPolicyHighlightsState.error ? (
                                <ErrorBlock
                                    code='DATA'
                                    title='Ошибка при чтении ключевых метрик'
                                    description='Не удалось собрать основные метрики лучшей политики.'
                                    details={bestPolicyHighlightsState.error.message}
                                />
                            ) : (
                                <div className={cls.bestPolicyMetrics}>
                                    {bestPolicyHighlightsState.items.map(item => (
                                        <div key={item.title} className={cls.metricCard}>
                                            <TermTooltip
                                                term={item.title}
                                                description={item.tooltip}
                                                type='span'
                                            />
                                            <span className={cls.metricValue}>{item.value}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className={cls.bestPolicyDescription}>
                                {renderPolicyDescription(bestPolicyState.best.policy, bestPolicyState.best.branch).map(
                                    line => (
                                        <Text key={line} className={cls.bestPolicyText}>
                                            {line}
                                        </Text>
                                    )
                                )}
                            </div>

                            <div className={cls.bestPolicyTables}>
                                {bestPolicyParts.map(part => {
                                    const terms = buildPolicyBranchMegaTermsForColumns(part.section.columns ?? [])
                                    const description = resolvePolicyBranchMegaSectionDescription(part.section.title)
                                    const normalizedTitle =
                                        normalizePolicyBranchMegaTitle(part.section.title) || part.label

                                    return (
                                        <SectionErrorBoundary key={part.id} name={`BestPolicy:${part.id}`}>
                                            <div className={cls.partBlock}>
                                                <div className={cls.termsBlock} data-tooltip-boundary>
                                                    <div className={cls.termsHeader}>
                                                        <Text type='h3' className={cls.termsTitle}>
                                                            Термины {part.label}
                                                        </Text>
                                                        <Text className={cls.termsSubtitle}>
                                                            {description ??
                                                                'Подробные определения всех метрик, которые используются в этой части.'}
                                                        </Text>
                                                    </div>
                                                    <div className={cls.termsGrid}>
                                                        {terms.map(term => (
                                                            <div key={`${part.id}-${term.key}`} className={cls.termItem}>
                                                                <TermTooltip
                                                                    term={term.title}
                                                                    description={term.tooltip}
                                                                    type='span'
                                                                />
                                                                <Text className={cls.termDescription}>
                                                                    {term.description}
                                                                </Text>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                <ReportTableCard
                                                    title={normalizedTitle}
                                                    description={description ?? undefined}
                                                    columns={part.section.columns ?? []}
                                                    rows={[part.row]}
                                                    domId={part.id}
                                                    renderColumnTitle={renderColumnTitle}
                                                />
                                            </div>
                                        </SectionErrorBoundary>
                                    )
                                })}
                            </div>
                        </>
                    ) : (
                        <Text>Нет данных по policy_branch_mega. Запусти генерацию отчётов на бэкенде.</Text>
                    )}
                </section>
            </SectionErrorBoundary>

            <section className={cls.sections}>
                <Text type='h2' className={cls.sectionTitle}>
                    Карта разделов проекта
                </Text>
                <div className={cls.navCards}>
                    <article className={cls.navCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            Прогнозы
                        </Text>
                        <Text className={cls.cardText}>
                            Главная точка входа для клиента: текущий прогноз и история решений.
                        </Text>
                        <div className={cls.navLinks}>
                            <Link to={ROUTE_PATH[AppRoute.CURRENT_PREDICTION]} className={cls.navLink}>
                                Текущий прогноз →
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.CURRENT_PREDICTION_HISTORY]} className={cls.navLink}>
                                История прогнозов →
                            </Link>
                        </div>
                    </article>

                    <article className={cls.navCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            Бэктест
                        </Text>
                        <Text className={cls.cardText}>
                            Бизнес‑точка контроля: сколько заработали, какой риск и какова устойчивость стратегии.
                        </Text>
                        <div className={cls.navLinks}>
                            <Link to={ROUTE_PATH[AppRoute.BACKTEST_SUMMARY]} className={cls.navLink}>
                                Сводка бэктеста (PnL) →
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.BACKTEST_BASELINE]} className={cls.navLink}>
                                Baseline бэктест →
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.BACKTEST_FULL]} className={cls.navLink}>
                                Экспериментальный бэктест (beta) →
                            </Link>
                        </div>
                    </article>

                    <article className={cls.navCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            Анализ
                        </Text>
                        <Text className={cls.cardText}>
                            Отчёты о том, где стратегия зарабатывает и как выглядят лучшие/худшие периоды.
                        </Text>
                        <div className={cls.navLinks}>
                            <Link to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_RATINGS]} className={cls.navLink}>
                                Рейтинги полисов →
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS]} className={cls.navLink}>
                                Статистика по дням →
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.BACKTEST_POLICY_BRANCH_MEGA]} className={cls.navLink}>
                                Policy Branch Mega →
                            </Link>
                            <div className={cls.navSublinks}>
                                {DEFAULT_POLICY_BRANCH_TABS.map(tab => (
                                    <Link
                                        key={tab.anchor}
                                        to={`${ROUTE_PATH[AppRoute.BACKTEST_POLICY_BRANCH_MEGA]}#${tab.anchor}`}
                                        className={cls.navSubLink}>
                                        {tab.label}
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </article>

                    <article className={cls.navCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            Диагностика
                        </Text>
                        <Text className={cls.cardText}>
                            Где стратегия теряет деньги, какие решения ошибочны и что блокирует guardrail.
                        </Text>
                        <div className={cls.navLinks}>
                            <Link to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS]} className={cls.navLink}>
                                Риск и ликвидации →
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL]} className={cls.navLink}>
                                Guardrail / Specificity →
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS]} className={cls.navLink}>
                                Решения / Attribution →
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS]} className={cls.navLink}>
                                Hotspots / NoTrade →
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_OTHER]} className={cls.navLink}>
                                Прочее →
                            </Link>
                        </div>
                    </article>

                    <article className={cls.navCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            Модели и фичи
                        </Text>
                        <Text className={cls.cardText}>
                            Качество моделей, агрегации и важность признаков для объяснения решений.
                        </Text>
                        <div className={cls.navLinks}>
                            <Link to={ROUTE_PATH[AppRoute.MODELS_STATS]} className={cls.navLink}>
                                Статистика моделей →
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.AGGREGATION_STATS]} className={cls.navLink}>
                                Агрегация прогнозов →
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.PFI_PER_MODEL]} className={cls.navLink}>
                                PFI по моделям →
                            </Link>
                        </div>
                    </article>

                    <article className={cls.navCard}>
                        <Text type='h3' className={cls.cardTitle}>
                            Документация
                        </Text>
                        <Text className={cls.cardText}>
                            Технические описания модели, тестов и терминов для разбора «по косточкам».
                        </Text>
                        <div className={cls.navLinks}>
                            <Link to={ROUTE_PATH[AppRoute.DOCS]} className={cls.navLink}>
                                Документация →
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.DOCS_MODELS]} className={cls.navLink}>
                                Модели →
                            </Link>
                            <Link to={ROUTE_PATH[AppRoute.DOCS_TESTS]} className={cls.navLink}>
                                Тесты →
                            </Link>
                        </div>
                    </article>
                </div>
            </section>
        </div>
    )
}
