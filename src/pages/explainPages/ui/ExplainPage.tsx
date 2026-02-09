import classNames from '@/shared/lib/helpers/classNames'
import { Link, Text } from '@/shared/ui'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'
import cls from './ExplainPage.module.scss'
import type { ExplainPageProps } from './types'

export default function ExplainPage({ className }: ExplainPageProps) {
    return (
        <div className={classNames(cls.ExplainPageRoot, {}, [className ?? ''])}>
            <header className={cls.hero}>
                <Text type='h1' className={cls.heroTitle}>
                    Объяснение проекта
                </Text>
                <Text className={cls.heroSubtitle}>
                    Карта проекта для первого знакомства: что внутри системы, как связаны ее части, какие есть
                    модели/ветки/сплиты, как устроено время, тесты, отчеты и структура решений.
                </Text>
                <div className={cls.heroMeta}>
                    <span className={cls.metaPill}>Модели</span>
                    <span className={cls.metaPill}>Ветки</span>
                    <span className={cls.metaPill}>Данные</span>
                    <span className={cls.metaPill}>Время</span>
                    <span className={cls.metaPill}>Архитектура</span>
                </div>
            </header>

            <section className={cls.sections}>
                <Text type='h2' className={cls.sectionsTitle}>
                    Разделы объяснения
                </Text>
                <div className={cls.cards}>
                    <Link to={ROUTE_PATH[AppRoute.EXPLAIN_MODELS]} className={cls.cardLink}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                Модели
                            </Text>
                            <Text className={cls.cardText}>
                                Техническое объяснение всех слоев модели: кто дает FLAT, как работает micro, что
                                делает SL-слой и как собирается финальный прогноз.
                            </Text>
                            <span className={cls.cardHint}>Открыть модели →</span>
                        </article>
                    </Link>

                    <Link to={ROUTE_PATH[AppRoute.EXPLAIN_BRANCHES]} className={cls.cardLink}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                Ветки BASE / ANTI-D
                            </Text>
                            <Text className={cls.cardText}>
                                Для чего нужны BASE и ANTI-D, какие точные фильтры включают anti-direction и как это
                                влияет на PnL/просадки.
                            </Text>
                            <span className={cls.cardHint}>Открыть ветки →</span>
                        </article>
                    </Link>

                    <Link to={ROUTE_PATH[AppRoute.EXPLAIN_SPLITS]} className={cls.cardLink}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                Train / OOS / Recent / Full
                            </Text>
                            <Text className={cls.cardText}>
                                Почему граница строится по baseline-exit day-key, чем отличаются train и OOS и зачем
                                отдельно смотреть recent (последние 240 дней).
                            </Text>
                            <span className={cls.cardHint}>Открыть сплиты →</span>
                        </article>
                    </Link>

                    <Link to={ROUTE_PATH[AppRoute.EXPLAIN_PROJECT]} className={cls.cardLink}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                О проекте
                            </Text>
                            <Text className={cls.cardText}>
                                Полная техническая карта решения: causal/omniscient, проекты в .sln, контур отчетов,
                                API, тесты и anti-leakage защиты.
                            </Text>
                            <span className={cls.cardHint}>Открыть описание →</span>
                        </article>
                    </Link>

                    <Link to={ROUTE_PATH[AppRoute.EXPLAIN_TIME]} className={cls.cardLink}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                Время и торговые дни
                            </Text>
                            <Text className={cls.cardText}>
                                NY-вход, baseline-exit, day-key, DST-правила и логика исключения выходных.
                            </Text>
                            <span className={cls.cardHint}>Открыть правила времени →</span>
                        </article>
                    </Link>

                    <Link to={ROUTE_PATH[AppRoute.EXPLAIN_FEATURES]} className={cls.cardLink}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                Фичи и индикаторы
                            </Text>
                            <Text className={cls.cardText}>
                                Все признаки модели с простым описанием, формулами и фактическими PFI-метриками по
                                данным отчета.
                            </Text>
                            <span className={cls.cardHint}>Открыть фичи →</span>
                        </article>
                    </Link>
                </div>
            </section>
        </div>
    )
}

