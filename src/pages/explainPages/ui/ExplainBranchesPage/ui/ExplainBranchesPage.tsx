import { useMemo } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { TermTooltip, Text } from '@/shared/ui'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { EXPLAIN_BRANCHES_TABS } from '@/shared/utils/explainTabs'
import cls from './ExplainBranchesPage.module.scss'
import type { ExplainBranchesPageProps } from './types'

interface TermItem {
    term: string
    description: string
}

const OVERVIEW_TERMS: TermItem[] = [
    {
        term: 'Policy',
        description:
            'Политика определяет, как рассчитываются плечо, размер позиции, TP/SL и skip-правила. Ветки показывают, как одна и та же политика ведет себя при разных правилах направления.'
    },
    {
        term: 'Branch',
        description:
            'Ветка — это режим прогона PnL внутри одной политики. В проекте ключевые ветки: BASE и ANTI-D.'
    },
    {
        term: 'BASE',
        description:
            'Базовая ветка: направление сделки берется прямо из прогноза модели, без переворота.'
    },
    {
        term: 'ANTI-D (anti-direction)',
        description:
            'Защитная ветка: в риск-день может перевернуть направление сделки на противоположное, если выполнены фильтры безопасности.'
    }
]

const BASE_TERMS: TermItem[] = [
    {
        term: 'Как выбирается направление',
        description:
            'Для BASE берется текущий предикт: long для UP (или micro-up), short для DOWN (или micro-down).'
    },
    {
        term: 'Что показывает BASE',
        description:
            'Чистое качество сигналов модели без anti-direction. Это эталон, с которым сравнивают все защитные надстройки.'
    },
    {
        term: 'Почему BASE важна',
        description:
            'Если сразу смотреть только на ANTI-D, непонятно, спасает ли защита систему или просто скрывает слабую базовую модель.'
    }
]

const ANTI_TERMS: TermItem[] = [
    {
        term: 'Anti-direction',
        description:
            'Технически это swap направлений: было long -> станет short, было short -> станет long.'
    },
    {
        term: 'RiskDay (SlHighDecision)',
        description:
            'Главный триггер ANTI-D. Если SL-слой не пометил день как high-risk, переворота не будет.'
    },
    {
        term: 'Где применяется переворот',
        description:
            'Переворот применяется до симуляции сделок, поэтому влияет на все bucket-решения этого дня.'
    },
    {
        term: 'Зачем ANTI-D',
        description:
            'Цель ветки — снизить тяжесть плохих дней и просадки. Это trade-off: иногда защита режет и прибыль.'
    }
]

const CONDITIONS_TERMS: TermItem[] = [
    {
        term: 'SlHighDecision=true',
        description:
            'Без этого флага ANTI-D не включается. Missing или false означает: торгуем как BASE.'
    },
    {
        term: 'MinMove в диапазоне 0.5%-12%',
        description:
            'Если MinMove < 0.5% или > 12%, переворот не применяется. Это защита от слишком тихих и слишком экстремальных дней.'
    },
    {
        term: 'Запас до ликвидации >= 2xMinMove',
        description:
            'До ликвидации должен быть буфер минимум в два MinMove. Иначе anti-direction считается слишком рискованным.'
    },
    {
        term: 'Корректное плечо',
        description:
            'ANTI-D не запускается с невалидным плечом: leverage должен быть конечным и > 0.'
    }
]

const USAGE_TERMS: TermItem[] = [
    {
        term: 'PnL %',
        description:
            'Суммарная доходность ветки. Сравнивается вместе с рисковыми метриками, а не сама по себе.'
    },
    {
        term: 'MaxDD %',
        description:
            'Максимальная просадка. Часто именно здесь видно, реально ли ANTI-D защищает систему.'
    },
    {
        term: 'Trade% / NoTrade%',
        description:
            'Доля торговых и пропущенных дней. Защита может улучшать риск, но иногда уменьшает частоту сделок.'
    },
    {
        term: 'Policy Branch Mega',
        description:
            'Главная сравнительная таблица по веткам и политикам: помогает быстро увидеть цену защиты в доходности и риске.'
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

export default function ExplainBranchesPage({ className }: ExplainBranchesPageProps) {
    const sections = useMemo(() => EXPLAIN_BRANCHES_TABS, [])
    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections,
        syncHash: true
    })

    return (
        <div className={classNames(cls.ExplainBranchesPage, {}, [className ?? ''])} data-tooltip-boundary>
            <header className={cls.headerRow}>
                <div>
                    <Text type='h2'>Ветки BASE / ANTI-D</Text>
                    <Text className={cls.subtitle}>
                        Ветки нужны, чтобы сравнить два режима одной и той же политики: без защитного переворота и с
                        защитным переворотом направления в риск-дни.
                    </Text>
                </div>
            </header>

            <div className={cls.sectionsGrid}>
                <section id='explain-branches-overview' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        Зачем нужны ветки
                    </Text>
                    <Text className={cls.sectionText}>
                        Это не «разные модели», а разные правила исполнения одного и того же прогноза.
                    </Text>
                    <div className={cls.tableWrap}>
                        <table className={cls.infoTable}>
                            <thead>
                                <tr>
                                    <th>Ветка</th>
                                    <th>Как работает</th>
                                    <th>Когда полезна</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>BASE</td>
                                    <td>Торгует по исходному направлению модели</td>
                                    <td>Эталон качества сигнала без защит</td>
                                </tr>
                                <tr>
                                    <td>ANTI-D</td>
                                    <td>В риск-день может перевернуть направление</td>
                                    <td>Проверка, можно ли снизить просадки</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <TermGrid items={OVERVIEW_TERMS} />
                </section>

                <section id='explain-branches-base' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        BASE
                    </Text>
                    <Text className={cls.sectionText}>
                        BASE показывает, что дает сама модель без страховки. Это обязательная точка отсчета для любого
                        улучшения.
                    </Text>
                    <TermGrid items={BASE_TERMS} />
                </section>

                <section id='explain-branches-anti' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        ANTI-D
                    </Text>
                    <Text className={cls.sectionText}>
                        ANTI-D не работает «всегда». Это строго условный режим, который включается только при наборе
                        конкретных сигналов риска.
                    </Text>
                    <TermGrid items={ANTI_TERMS} />
                </section>

                <section id='explain-branches-conditions' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        Условия включения ANTI-D
                    </Text>
                    <Text className={cls.sectionText}>
                        Ниже — точные фильтры из PnL-логики. Если хотя бы один фильтр не проходит, ветка работает как
                        BASE.
                    </Text>
                    <div className={cls.tableWrap}>
                        <table className={cls.infoTable}>
                            <thead>
                                <tr>
                                    <th>Фильтр</th>
                                    <th>Порог</th>
                                    <th>Что это защищает</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>SL риск-день</td>
                                    <td>SlHighDecision=true</td>
                                    <td>Без риска переворот не нужен</td>
                                </tr>
                                <tr>
                                    <td>MinMove</td>
                                    <td>0.5%..12%</td>
                                    <td>Отсекаем шум и экстремумы</td>
                                </tr>
                                <tr>
                                    <td>Буфер до ликвидации</td>
                                    <td>liqAdversePct &gt;= 2xMinMove</td>
                                    <td>Переворот не должен загонять в тонкий буфер</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <TermGrid items={CONDITIONS_TERMS} />
                </section>

                <section id='explain-branches-usage' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        Как читать результаты
                    </Text>
                    <Text className={cls.sectionText}>
                        Сравнивайте ветки как пакет метрик: доходность + просадка + частота сделок. Одна метрика не
                        показывает полную картину.
                    </Text>
                    <TermGrid items={USAGE_TERMS} />
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
