import classNames from '@/shared/lib/helpers/classNames'
import { Link, Text } from '@/shared/ui'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'
import cls from './AnalysisPage.module.scss'
import type { AnalysisPageProps } from './types'

/*
    AnalysisPage — корневая страница вкладки «Анализ».

    Зачем:
        - Быстрый вход в таблицы PnL/рейтингов и разрезов по дням.
        - Ориентир по тому, какие отчёты читать для оценки прибыли.
*/

export default function AnalysisPage({ className }: AnalysisPageProps) {
    return (
        <div className={classNames(cls.root, {}, [className ?? ''])}>
            <section className={cls.hero}>
                <Text type='h1' className={cls.heroTitle}>
                    Анализ
                </Text>
                <Text className={cls.heroSubtitle}>
                    Аналитические отчёты по PnL, топам сделок/дней и поведению стратегий. Здесь проще всего понять, где
                    стратегия зарабатывает, где теряет, и в каких режимах рынка это происходит.
                </Text>
            </section>

            <section className={cls.sections}>
                <Text type='h2' className={cls.sectionsTitle}>
                    Разделы анализа
                </Text>
                <div className={cls.cards}>
                    <Link to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_RATINGS]} className={cls.cardLink}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                Рейтинги полисов
                            </Text>
                            <Text className={cls.cardText}>
                                Лучшие и худшие сделки/дни по результату, плюс сводный Equity/DD по топ‑3 политикам.
                                Идеальная точка входа, чтобы найти экстремальные просадки и аномально успешные периоды.
                            </Text>
                            <span className={cls.cardHint}>Открыть рейтинги →</span>
                        </article>
                    </Link>
                    <Link to={ROUTE_PATH[AppRoute.BACKTEST_POLICY_BRANCH_MEGA]} className={cls.cardLink}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                Policy Branch Mega
                            </Text>
                            <Text className={cls.cardText}>
                                Самая полная сводка метрик по каждой политике и ветке (BASE/ANTI‑D): доходность,
                                риск, устойчивость, восстановление, разрез long/short и средние темпы роста. Это
                                «главная таблица» для сравнения политик.
                            </Text>
                            <span className={cls.cardHint}>Открыть mega‑таблицы →</span>
                        </article>
                    </Link>
                    <Link to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_DAYSTATS]} className={cls.cardLink}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                Статистика по дням
                            </Text>
                            <Text className={cls.cardText}>
                                Разрезы по типам дней (UP/DOWN/FLAT) и по дням недели: WinRate, доля NoTrade и упущенная
                                возможность. Помогает понять, в каком режиме стратегия даёт лучший edge.
                            </Text>
                            <span className={cls.cardHint}>Открыть статистику →</span>
                        </article>
                    </Link>
                </div>
            </section>
        </div>
    )
}
