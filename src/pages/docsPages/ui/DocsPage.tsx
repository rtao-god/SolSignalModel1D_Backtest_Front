import classNames from '@/shared/lib/helpers/classNames'
import { TermTooltip, Text } from '@/shared/ui'
import cls from './DocsPage.module.scss'
import type { DocsPageProps } from './types'

export default function DocsPage({ className }: DocsPageProps) {
    return (
        <div className={classNames(cls.DocsPageRoot, {}, [className ?? ''])}>
            <header className={cls.hero}>
                <Text type='h1' className={cls.heroTitle}>
                    Документация
                </Text>
                <Text className={cls.heroSubtitle}>
                    Короткие гайды по чтению ключевых страниц. Здесь собраны простые объяснения метрик и терминов, чтобы
                    даже начинающий инвестор понимал, что именно показывает каждый отчёт.
                </Text>
                <div className={cls.heroMeta}>
                    <span className={cls.metaPill}>ML‑модель</span>
                    <span className={cls.metaPill}>Бэктесты</span>
                    <span className={cls.metaPill}>Диагностика</span>
                    <span className={cls.metaPill}>Текущие прогнозы</span>
                </div>
            </header>

            <section className={cls.sections}>
                <Text type='h2' className={cls.sectionsTitle}>
                    Как читать отчёты
                </Text>
                <div className={cls.cards}>
                    <article className={cls.card} id='model-stats-overview'>
                        <Text type='h3' className={cls.cardTitle}>
                            Статистика моделей (ModelStats)
                        </Text>
                        <Text className={cls.cardText}>
                            Здесь оценивается качество ML‑моделей на разных выборках. Сегменты{' '}
                            <TermTooltip
                                term='OOS'
                                type='span'
                                description='OOS (out‑of‑sample) — данные, полностью исключённые из обучения. Метрики на OOS дают честную оценку качества без переобучения.'
                            />{' '}
                            и{' '}
                            <TermTooltip
                                term='Train'
                                type='span'
                                description='Train — обучающая выборка. Метрики обычно выше, чем на OOS, поэтому сравнение Train vs OOS важно для контроля переобучения.'
                            />{' '}
                            показывают, насколько модель «держится» на новых данных. В режиме «Технический» отображаются
                            матрицы ошибок и пороги SL‑модели.
                        </Text>
                    </article>

                    <article className={cls.card} id='current-prediction-overview'>
                        <Text type='h3' className={cls.cardTitle}>
                            Текущий прогноз
                        </Text>
                        <Text className={cls.cardText}>
                            Страница показывает финальный прогноз по дню: направление, план сделок и риски. Обратите
                            внимание на{' '}
                            <TermTooltip
                                term='MinMove'
                                type='span'
                                description='MinMove — минимальный осмысленный ход цены. Это прокси волатильности: чем выше, тем «размашистее» день.'
                            />{' '}
                            и сигналы{' '}
                            <TermTooltip
                                term='SL‑модели'
                                type='span'
                                description='SL‑модель оценивает риск попадания в стоп‑лосс. Высокий SL‑риск означает, что входы стоит делать осторожнее.'
                            />{' '}
                            — они отвечают за контроль риска.
                        </Text>
                    </article>

                    <article className={cls.card} id='aggregation-overview'>
                        <Text type='h3' className={cls.cardTitle}>
                            Агрегация прогнозов
                        </Text>
                        <Text className={cls.cardText}>
                            Здесь усредняются вероятности классов и считаются метрики качества по слоям Day /
                            Day+Micro / Total. Метрики{' '}
                            <TermTooltip
                                term='Accuracy'
                                type='span'
                                description='Accuracy — доля правильных предсказаний (Correct / N). Чем выше, тем лучше.'
                            />{' '}
                            и{' '}
                            <TermTooltip
                                term='LogLoss'
                                type='span'
                                description='LogLoss измеряет, насколько вероятности «доверчивы» к правильному классу. Чем меньше, тем лучше.'
                            />{' '}
                            помогают понять, насколько модель уверенно предсказывает результат.
                        </Text>
                    </article>

                    <article className={cls.card} id='pfi-overview'>
                        <Text type='h3' className={cls.cardTitle}>
                            PFI — важность признаков
                        </Text>
                        <Text className={cls.cardText}>
                            PFI показывает, насколько падает качество модели, если перемешать признак. Ключевая метрика{' '}
                            <TermTooltip
                                term='ΔAUC'
                                type='span'
                                description='ΔAUC — насколько падает AUC при перемешивании признака. Чем больше падение, тем важнее признак.'
                            />{' '}
                            помогает понять, какие фичи реально влияют на прогноз.
                        </Text>
                    </article>
                </div>
            </section>
        </div>
    )
}
