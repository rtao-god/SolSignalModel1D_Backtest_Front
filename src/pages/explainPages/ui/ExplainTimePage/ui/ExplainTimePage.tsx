import { useMemo } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { TermTooltip, Text } from '@/shared/ui'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { EXPLAIN_TIME_TABS } from '@/shared/utils/explainTabs'
import cls from './ExplainTimePage.module.scss'
import type { ExplainTimePageProps } from './types'

interface TermItem {
    term: string
    description: string
}

const OVERVIEW_TERMS: TermItem[] = [
    {
        term: 'NY-morning',
        description:
            'Точка входа торгового дня. По текущему контракту NyWindowing: 08:00 по Нью-Йорку летом (DST) и 07:00 зимой.'
    },
    {
        term: 'DST (Daylight Saving Time)',
        description:
            'Сезонный перевод времени в Нью-Йорке. В коде время входа выбирается с учетом DST, чтобы правило было стабильным по локальному NY-времени.'
    },
    {
        term: 'EntryUtc',
        description:
            'UTC-момент входа в торговый день. От него вычисляются baseline-exit и day-key значения.'
    },
    {
        term: 'NyTradingDay',
        description:
            'Локальный торговый день Нью-Йорка (без выходных). Это удобный бизнес-ключ для дневной торговли.'
    }
]

const BASELINE_TERMS: TermItem[] = [
    {
        term: 'Baseline-exit',
        description:
            'Конец базового окна дня: следующее NY-утро минус 2 минуты. Этот момент используется в разметке и в split.'
    },
    {
        term: 'Friday -> Monday',
        description:
            'Для входа в пятницу baseline-exit переносится на понедельник, чтобы дневное окно не заканчивалось на выходных.'
    },
    {
        term: 'Почему именно -2 минуты',
        description:
            'Небольшой технический зазор перед следующим входом. Это делает границу окна более стабильной для лейблинга и split-контракта.'
    }
]

const DAYKEY_TERMS: TermItem[] = [
    {
        term: 'EntryDayKeyUtc',
        description:
            'День входа в формате UTC day-key (00:00 UTC). Нужен для стабильных отчетов и агрегаций.'
    },
    {
        term: 'ExitDayKeyUtc',
        description:
            'День baseline-exit в формате UTC day-key. Именно он используется как граница train/oos.'
    },
    {
        term: 'TrainUntilExitDayKeyUtc',
        description:
            'Каноническая граница split: train включает дни, у которых ExitDayKeyUtc <= TrainUntilExitDayKeyUtc.'
    },
    {
        term: 'BaselineExitUtc',
        description:
            'UTC-момент конца baseline-окна. Из него получается ExitDayKeyUtc.'
    }
]

const WEEKEND_TERMS: TermItem[] = [
    {
        term: 'Технический фильтр выходных',
        description:
            'Функция TryCreateNyTradingEntryUtc не создает торговый вход для NY-субботы и NY-воскресенья.'
    },
    {
        term: 'Почему выходные исключены',
        description:
            'Бизнес-правило проекта: в выходные часто слабая волатильность, такие дни добавляют шум и ухудшают качество обучения.'
    },
    {
        term: 'Что это дает',
        description:
            'Меньше неинформативных дней в train и более чистая связь «фичи -> движение» на рабочих торговых днях.'
    },
    {
        term: 'Будущее расширение',
        description:
            'Можно сделать отдельную weekend-ветку/модель: обучать ее только на выходных и торговать отдельно от weekday-модели.'
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

export default function ExplainTimePage({ className }: ExplainTimePageProps) {
    const sections = useMemo(() => EXPLAIN_TIME_TABS, [])
    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections,
        syncHash: true
    })

    return (
        <div className={classNames(cls.ExplainTimePage, {}, [className ?? ''])} data-tooltip-boundary>
            <header className={cls.headerRow}>
                <div>
                    <Text type='h2'>Время и торговые дни</Text>
                    <Text className={cls.subtitle}>
                        Временной контракт здесь очень строгий: фиксированная точка входа, понятный конец окна дня и
                        единый day-key для train/oos split.
                    </Text>
                </div>
            </header>

            <div className={cls.sectionsGrid}>
                <section id='explain-time-overview' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        NY-торговый день
                    </Text>
                    <Text className={cls.sectionText}>
                        Каждый торговый день начинается в одной и той же NY-точке входа. Это снимает неоднозначность
                        «с какого момента считать день».
                    </Text>
                    <div className={cls.tableWrap}>
                        <table className={cls.infoTable}>
                            <thead>
                                <tr>
                                    <th>Сезон NY</th>
                                    <th>Локальное время входа</th>
                                    <th>Комментарий</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Лето (DST)</td>
                                    <td>08:00 NY</td>
                                    <td>Проверяется через DST-флаг на локальном NY-дне</td>
                                </tr>
                                <tr>
                                    <td>Зима (без DST)</td>
                                    <td>07:00 NY</td>
                                    <td>Та же точка по контракту NyWindowing</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <TermGrid items={OVERVIEW_TERMS} />
                </section>

                <section id='explain-time-baseline' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        Baseline-exit
                    </Text>
                    <Text className={cls.sectionText}>
                        Baseline-exit задает «официальный конец дня» для оценки движения. Этот момент критичен и для
                        разметки, и для границы train/oos.
                    </Text>
                    <TermGrid items={BASELINE_TERMS} />
                </section>

                <section id='explain-time-day-keys' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        Day-key и типы времени
                    </Text>
                    <Text className={cls.sectionText}>
                        Day-key типы нужны, чтобы в коде не путались «день входа» и «день выхода». Именно это защищает
                        split от неявных ошибок.
                    </Text>
                    <TermGrid items={DAYKEY_TERMS} />
                </section>

                <section id='explain-time-weekend' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        Выходные и исключения
                    </Text>
                    <Text className={cls.sectionText}>
                        По текущему правилу проект не торгует NY-выходные. Это и технический фильтр в коде, и
                        осознанное продуктовое решение по качеству данных.
                    </Text>
                    <TermGrid items={WEEKEND_TERMS} />
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
