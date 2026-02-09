import classNames from '@/shared/lib/helpers/classNames'
import { Link, Text } from '@/shared/ui'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'
import cls from './DiagnosticsPage.module.scss'
import type { DiagnosticsPageProps } from './types'

export default function DiagnosticsPage({ className }: DiagnosticsPageProps) {
    return (
        <div className={classNames(cls.root, {}, [className ?? ''])}>
            <section className={cls.hero}>
                <Text type='h1' className={cls.heroTitle}>
                    Диагностика
                </Text>
                <Text className={cls.heroSubtitle}>
                    Карта диагностических отчётов: риск, guardrail, решения и hotspots. Каждый блок — отдельная страница
                    с подробными таблицами, где видно причины просадок и ошибки модели.
                </Text>
            </section>

            <section className={cls.sections}>
                <Text type='h2' className={cls.sectionsTitle}>
                    Разделы диагностики
                </Text>
                <div className={cls.cards}>
                    <Link to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS]} className={cls.cardLink}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                Риск и ликвидации
                            </Text>
                            <Text className={cls.cardText}>
                                Equity/DD, ликвидации, дистанции до ликвидации и риск‑метрики. База для поиска причин
                                «слива» и оценки устойчивости.
                            </Text>
                            <span className={cls.cardHint}>Открыть риск‑отчёт →</span>
                        </article>
                    </Link>
                    <Link to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_GUARDRAIL]} className={cls.cardLink}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                Guardrail / Specificity
                            </Text>
                            <Text className={cls.cardText}>
                                Confusion matrix для фильтра, rolling‑пороги и экономический эффект блокировок
                                «плохих» дней. Здесь видно, спасает ли guardrail прибыль или мешает.
                            </Text>
                            <span className={cls.cardHint}>Открыть guardrail →</span>
                        </article>
                    </Link>
                    <Link to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_DECISIONS]} className={cls.cardLink}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                Решения / Attribution
                            </Text>
                            <Text className={cls.cardText}>
                                Кто и почему принял финальное решение: разложение по актёрам, причинам и blame‑split.
                                Помогает понять, виноват сигнал или фильтры политики.
                            </Text>
                            <span className={cls.cardHint}>Открыть решения →</span>
                        </article>
                    </Link>
                    <Link to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_HOTSPOTS]} className={cls.cardLink}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                Hotspots / NoTrade
                            </Text>
                            <Text className={cls.cardText}>
                                Hotspots низкого покрытия, частого NoTrade и противоположных решений. Показывает, где
                                стратегия «проваливается» и теряет дни.
                            </Text>
                            <span className={cls.cardHint}>Открыть hotspots →</span>
                        </article>
                    </Link>
                    <Link to={ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS_OTHER]} className={cls.cardLink}>
                        <article className={cls.card}>
                            <Text type='h3' className={cls.cardTitle}>
                                Прочее
                            </Text>
                            <Text className={cls.cardText}>
                                Редкие или новые диагностические таблицы, которые пока не попали в основные группы.
                            </Text>
                            <span className={cls.cardHint}>Открыть прочее →</span>
                        </article>
                    </Link>
                </div>
            </section>
        </div>
    )
}
