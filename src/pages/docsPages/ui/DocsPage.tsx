import classNames from '@/shared/lib/helpers/classNames'
import { Link } from '@/shared/ui'
import cls from './DocsPage.module.scss'

interface DocsPageProps {
    className?: string
}

export default function DocsPage({ className }: DocsPageProps) {
    return (
        <span className={classNames(cls.DocsPageRoot, {}, [className ?? ''])}>
            <section className={cls.hero}>
                <h1 className={cls.heroTitle}>Документация SolSignal 1D</h1>
                <p className={cls.heroSubtitle}>
                    Подробное описание дневной модели, микро-слоя, SL-модели, пайплайна данных, тестов и метрик. Всё,
                    что нужно, чтобы понять внутреннюю логику проекта и оценить качество сигналов.
                </p>
                <div className={cls.heroMeta}>
                    <div className={cls.metaPill}>Daily / Micro / SL-слой</div>
                    <div className={cls.metaPill}>Path-based labeling</div>
                    <div className={cls.metaPill}>Sanity-checks и leakage-тесты</div>
                </div>
            </section>

            <section className={cls.sections}>
                <h2 className={cls.sectionsTitle}>Разделы документации</h2>
                <div className={cls.cards}>
                    <Link to='/docs/models' className={cls.cardLink}>
                        <article className={cls.card}>
                            <h3 className={cls.cardTitle}>Модели и пайплайн</h3>
                            <p className={cls.cardText}>
                                Архитектура дневной модели (move/dir), микро-слоя и SL-уровня, используемые фичи и
                                полный путь данных: от свечей до финального решения.
                            </p>
                            <span className={cls.cardHint}>К описанию моделей →</span>
                        </article>
                    </Link>

                    <Link to='/docs/tests' className={cls.cardLink}>
                        <article className={cls.card}>
                            <h3 className={cls.cardTitle}>Тесты и self-check&apos;и</h3>
                            <p className={cls.cardText}>
                                Набор sanity-check&apos;ов, leakage-тестов и проверок стабильности, которые защищают от
                                утечек данных и некорректной работы пайплайна.
                            </p>
                            <span className={cls.cardHint}>К описанию тестов →</span>
                        </article>
                    </Link>

                    <Link to='/backtest/summary' className={cls.cardLink}>
                        <article className={cls.card}>
                            <h3 className={cls.cardTitle}>Интерпретация статистики</h3>
                            <p className={cls.cardText}>
                                Как читать отчёты бэктеста и профили: PnL, просадки, ликвидации, risk-прослойка и
                                типичные сценарии A/B-сравнения (будет вынесено в отдельный docs-раздел).
                            </p>
                            <span className={cls.cardHint}>Смотреть сводку бэктеста →</span>
                        </article>
                    </Link>
                </div>
            </section>
        </span>
    )
}
