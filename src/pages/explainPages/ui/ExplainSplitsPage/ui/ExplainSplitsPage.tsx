import { useMemo } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { TermTooltip, Text } from '@/shared/ui'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { EXPLAIN_SPLITS_TABS } from '@/shared/utils/explainTabs'
import cls from './ExplainSplitsPage.module.scss'
import type { ExplainSplitsPageProps } from './types'

interface TermItem {
    term: string
    description: string
}

const OVERVIEW_TERMS: TermItem[] = [
    {
        term: 'Train',
        description:
            'Часть истории, на которой реально обучаются модели. Любая настройка гиперпараметров и калибровка тоже делается только здесь.'
    },
    {
        term: 'OOS (Out-of-sample)',
        description:
            'Дни после границы train. Они не используются в обучении и показывают честную переносимость модели.'
    },
    {
        term: 'Recent (240d)',
        description:
            'Последние 240 торговых дней по EntryDayKeyUtc. Это отдельный «срез актуальности» текущего рынка.'
    },
    {
        term: 'Full history',
        description:
            'Все дни вместе (train + oos). Нужен для длинного горизонта и для сравнения с recent.'
    },
    {
        term: 'TrainUntilExitDayKeyUtc',
        description:
            'Граница сплита по дню baseline-exit, а не по дню входа. Это снижает риск утечки будущих данных в train.'
    },
    {
        term: 'EntryDayKeyUtc / ExitDayKeyUtc',
        description:
            'EntryDayKeyUtc — день входа, ExitDayKeyUtc — день конца baseline-окна. Для split используется именно ExitDayKeyUtc.'
    }
]

const TRAIN_TERMS: TermItem[] = [
    {
        term: 'Train-only',
        description:
            'Подмножество строк до границы TrainUntilExitDayKeyUtc. На этом наборе обучаются daily/micro/SL слои.'
    },
    {
        term: 'Минимальный объем train',
        description:
            'Для базового daily-обучения требуется минимум 100 строк. Для dir и micro слоев используются отдельные пороги в 40 строк.'
    },
    {
        term: 'Почему train нельзя смешивать с oos',
        description:
            'Если oos попадает в обучение, метрики искусственно завышаются и уже не отражают поведение на будущих данных.'
    }
]

const OOS_TERMS: TermItem[] = [
    {
        term: 'Честный контроль качества',
        description:
            'OOS играет роль «новых данных». Если модель устойчива, деградация относительно train ограничена.'
    },
    {
        term: 'Сильная просадка в OOS',
        description:
            'Обычно это сигнал переобучения, смены рыночного режима или того, что признаки перестали быть актуальными.'
    },
    {
        term: 'Strict split',
        description:
            'В strict-режиме excluded не допускаются: если день не классифицируется корректно по baseline-exit, пайплайн падает.'
    }
]

const RECENT_TERMS: TermItem[] = [
    {
        term: 'Последние 240 дней',
        description:
            'Берутся последние 240 EntryDayKeyUtc от максимальной даты назад: fromDay = maxDay - 239.'
    },
    {
        term: 'Что показывает recent',
        description:
            'Не «среднюю температуру», а поведение модели в текущем рыночном контексте.'
    },
    {
        term: 'Как трактовать',
        description:
            'Если full хорошо, а recent проседает — модель может быть исторически сильной, но сейчас нуждается в адаптации.'
    }
]

const FULL_TERMS: TermItem[] = [
    {
        term: 'Train + OOS',
        description:
            'Общий исторический горизонт для анализа стабильности на длинной дистанции.'
    },
    {
        term: 'Зачем нужен full',
        description:
            'Помогает увидеть редкие режимы рынка и понять, как модель переживает длинные циклы.'
    },
    {
        term: 'Почему full не главный сам по себе',
        description:
            'Сильный full не гарантирует сильный current режим. Поэтому full всегда читается вместе с recent.'
    }
]

function TermGrid({ items }: { items: TermItem[] }) {
    return (
        <div className={cls.termGrid}>
            {items.map(item => (
                <TermTooltip
                    key={item.term}
                    term={item.term}
                    description={item.description}
                    type='span'
                    className={cls.termItem}
                />
            ))}
        </div>
    )
}

export default function ExplainSplitsPage({ className }: ExplainSplitsPageProps) {
    const sections = useMemo(() => EXPLAIN_SPLITS_TABS, [])
    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections,
        syncHash: true
    })

    return (
        <div className={classNames(cls.ExplainSplitsPage, {}, [className ?? ''])} data-tooltip-boundary>
            <header className={cls.headerRow}>
                <div>
                    <Text type='h2'>Train / OOS / Recent / Full</Text>
                    <Text className={cls.subtitle}>
                        Разделение истории нужно, чтобы одновременно видеть качество обучения, честную проверку на
                        новых данных и актуальность на последних 240 днях.
                    </Text>
                </div>
            </header>

            <div className={cls.sectionsGrid}>
                <section id='explain-splits-overview' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        Зачем нужны сплиты
                    </Text>
                    <Text className={cls.sectionText}>
                        Один набор метрик не отвечает на вопрос «модель хороша исторически» и «модель хороша сейчас»
                        одновременно.
                    </Text>
                    <div className={cls.tableWrap}>
                        <table className={cls.infoTable}>
                            <thead>
                                <tr>
                                    <th>Срез</th>
                                    <th>Что включает</th>
                                    <th>Основной вопрос</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Train</td>
                                    <td>Дни до TrainUntilExitDayKeyUtc</td>
                                    <td>На чем обучилась модель?</td>
                                </tr>
                                <tr>
                                    <td>OOS</td>
                                    <td>Дни после TrainUntilExitDayKeyUtc</td>
                                    <td>Как модель ведет себя на новых данных?</td>
                                </tr>
                                <tr>
                                    <td>Recent</td>
                                    <td>Последние 240 EntryDayKeyUtc</td>
                                    <td>Насколько модель актуальна сейчас?</td>
                                </tr>
                                <tr>
                                    <td>Full</td>
                                    <td>Train + OOS</td>
                                    <td>Какова общая устойчивость на длинном горизонте?</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <TermGrid items={OVERVIEW_TERMS} />
                </section>

                <section id='explain-splits-train' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        Train
                    </Text>
                    <Text className={cls.sectionText}>
                        Это единственный сегмент, который разрешено использовать для обучения. Любая утечка OOS в
                        train ломает честность проверки.
                    </Text>
                    <TermGrid items={TRAIN_TERMS} />
                </section>

                <section id='explain-splits-oos' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        OOS
                    </Text>
                    <Text className={cls.sectionText}>
                        OOS — это «реальность после обучения». Именно этот сегмент важнее всего для понимания
                        переносимости модели.
                    </Text>
                    <TermGrid items={OOS_TERMS} />
                </section>

                <section id='explain-splits-recent' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        Recent (последние 240 дней)
                    </Text>
                    <Text className={cls.sectionText}>
                        Recent не заменяет full-history, а дополняет его. Это отдельный индикатор текущей
                        работоспособности модели.
                    </Text>
                    <TermGrid items={RECENT_TERMS} />
                </section>

                <section id='explain-splits-full' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        Full history
                    </Text>
                    <Text className={cls.sectionText}>
                        Full нужен для долгой ретроспективы. Но финальное решение обычно принимают, учитывая и full, и
                        recent одновременно.
                    </Text>
                    <TermGrid items={FULL_TERMS} />
                </section>
            </div>

            <SectionPager
                sections={sections}
                currentIndex={currentIndex}
                canPrev={canPrev}
                canNext={canNext}
                onPrev={handlePrev}
                onNext={handleNext}
            />
        </div>
    )
}
