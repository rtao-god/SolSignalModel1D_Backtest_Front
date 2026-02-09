import { useMemo } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { Link, TermTooltip, Text } from '@/shared/ui'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { EXPLAIN_MODELS_TABS } from '@/shared/utils/explainTabs'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'
import cls from './ExplainModelsPage.module.scss'
import type { ExplainModelsPageProps } from './types'

interface TermItem {
    term: string
    description: string
}

const OVERVIEW_TERMS: TermItem[] = [
    {
        term: 'Дневной слой (Move + Dir)',
        description:
            'Это основная модель. Сначала Move оценивает вероятность, что день вообще даст заметное движение. Затем Dir определяет направление этого движения.'
    },
    {
        term: 'Move (P(move))',
        description:
            'Бинарный прогноз: будет ли движение больше порога MinMove. Если нет, день считается кандидатом на FLAT.'
    },
    {
        term: 'Dir (P(up|move))',
        description:
            'Если Move считает, что движение есть, Dir решает направление: вверх или вниз. В down-режиме может использоваться отдельная dir-down модель.'
    },
    {
        term: 'Микро-слой (flat-only)',
        description:
            'Запускается только когда дневной слой дал FLAT. Уточняет, есть ли внутри боковика слабый наклон вверх или вниз.'
    },
    {
        term: 'SL-слой риска',
        description:
            'Оценивает вероятность, что позиция раньше ударится в SL, чем в TP. Это не направление рынка, а отдельный риск-слой.'
    },
    {
        term: 'Total-прогноз',
        description:
            'Финальные вероятности после всех слоев: Day -> Day+Micro -> Total(Day+Micro+SL). Именно их использует торговая логика.'
    }
]

const DAILY_TERMS: TermItem[] = [
    {
        term: 'Кто определяет FLAT',
        description:
            'В обучении класс FLAT ставит PathLabeler: если в окне [entry..baseline-exit) цена не дошла ни до +MinMove, ни до -MinMove от цены входа. В runtime FLAT дает дневная модель как максимум из ProbUp/ProbFlat/ProbDown.'
    },
    {
        term: 'UP / FLAT / DOWN',
        description:
            'Это три класса дня: рост / боковик / падение. В обучающей разметке это коды 2 / 1 / 0.'
    },
    {
        term: 'MinMove',
        description:
            'Порог минимального значимого движения цены за день (в долях от цены входа). Считается адаптивно из ATR и dynVol, затем ограничивается диапазоном 1.5%-8%.'
    },
    {
        term: 'ATR (Average True Range)',
        description:
            'Технический индикатор волатильности. В проекте используется ATR(14) по 6h-свечам SOL, дальше нормализуется как atrPct = ATR / entryPrice.'
    },
    {
        term: 'RegimeDownFlag',
        description:
            'Флаг медвежьего режима. Ставится, когда SolRet30 < -7% ИЛИ BtcRet30 < -5%.'
    },
    {
        term: 'HardRegimeIs2Flag',
        description:
            'Флаг «жесткого» режима. Ставится, когда |SolRet30| > 10% ИЛИ atrPct > 3.5%.'
    },
    {
        term: 'Тихий день (технически)',
        description:
            'День, когда в baseline-окне не было касания уровней +/-MinMove от entry. Такие дни попадают в класс FLAT.'
    }
]

const MICRO_TERMS: TermItem[] = [
    {
        term: 'Когда включается микро-модель',
        description:
            'Только когда дневной слой выдал FLAT. Если дневной слой выдал UP или DOWN, микро-модель не применяется.'
    },
    {
        term: 'MicroTruth',
        description:
            'Факт для обучения микро-модели. MicroTruth бывает только у дней с TrueLabel=FLAT (код 1). Для UP/DOWN он всегда отсутствует.'
    },
    {
        term: 'Минимум данных для микро',
        description:
            'Микро-модель отключается, если для обучения слишком мало данных: меньше 40 flat-дней или есть только один класс (только up или только down).'
    },
    {
        term: 'Зачем микро-слой',
        description:
            'Без него все FLAT-дни выглядели бы одинаково. Микро-слой помогает не терять слабые, но повторяющиеся направления внутри боковика.'
    }
]

const SL_TERMS: TermItem[] = [
    {
        term: 'TP (Take Profit)',
        description:
            'Целевой уровень прибыли. В текущем SL-пайплайне для разметки используется дневной TP=3%.'
    },
    {
        term: 'SL (Stop Loss)',
        description:
            'Уровень ограничения убытка. В текущем SL-пайплайне для разметки используется дневной SL=5%.'
    },
    {
        term: 'SlProb',
        description:
            'Вероятность, что сделка закроется по SL раньше TP. Ее предсказывает отдельная бинарная SL-модель.'
    },
    {
        term: 'SlHighDecision',
        description:
            'Флаг риск-дня. Становится true, когда SL-модель дала класс HighRisk и вероятность p >= 0.55.'
    },
    {
        term: 'StrongSignal по MinMove',
        description:
            'Для SL-фич есть признак «сильного дня» на основе MinMove. Базовый порог 3%, с коридором 0.8x..1.2x и учетом RegimeDown в серой зоне.'
    }
]

const AGGREGATION_TERMS: TermItem[] = [
    {
        term: 'Day',
        description: 'Вероятности только после дневного слоя (без микро и без SL).'
    },
    {
        term: 'Day+Micro',
        description:
            'Вероятности после микро-слоя. Микро перераспределяет часть вероятности только в flat-сценариях.'
    },
    {
        term: 'Total (Day+Micro+SL)',
        description:
            'Итоговые вероятности после SL-оверлея. Они отражают не только направление, но и риск попасть в стоп.'
    },
    {
        term: 'ProbUp / ProbFlat / ProbDown',
        description:
            'Три вероятности финального прогноза. Их сумма всегда равна 1.0, а итоговый класс выбирается по максимуму.'
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

export default function ExplainModelsPage({ className }: ExplainModelsPageProps) {
    const sections = useMemo(() => EXPLAIN_MODELS_TABS, [])
    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections,
        syncHash: true
    })

    return (
        <div className={classNames(cls.ExplainModelsPage, {}, [className ?? ''])} data-tooltip-boundary>
            <header className={cls.headerRow}>
                <div>
                    <Text type='h2'>Модели</Text>
                    <Text className={cls.subtitle}>
                        В проекте несколько слоев моделей: один отвечает за направление, второй уточняет боковик,
                        третий оценивает риск SL. Ниже показано, как это работает шаг за шагом.
                    </Text>
                    <div className={cls.linkRow}>
                        <Text className={cls.linkLabel}>
                            Подробные метрики по моделям, классам и качеству прогноза — в отдельном разделе.
                        </Text>
                        <Link to={ROUTE_PATH[AppRoute.MODELS_STATS]} className={cls.linkButton}>
                            Подробнее
                        </Link>
                    </div>
                </div>
            </header>

            <div className={cls.sectionsGrid}>
                <section id='explain-models-overview' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        Общий обзор слоев
                    </Text>
                    <Text className={cls.sectionText}>
                        Сигнал строится по цепочке: сначала дневная модель, потом микро-уточнение для FLAT, затем
                        риск-оверлей SL.
                    </Text>
                    <div className={cls.tableWrap}>
                        <table className={cls.infoTable}>
                            <thead>
                                <tr>
                                    <th>Слой</th>
                                    <th>Что решает</th>
                                    <th>Выход</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Day (Move+Dir)</td>
                                    <td>Есть ли значимое движение и куда оно направлено</td>
                                    <td>ProbUp / ProbFlat / ProbDown</td>
                                </tr>
                                <tr>
                                    <td>Micro (flat-only)</td>
                                    <td>Уточняет FLAT-дни: легкий уклон вверх или вниз</td>
                                    <td>Day+Micro</td>
                                </tr>
                                <tr>
                                    <td>SL</td>
                                    <td>Оценивает риск, что сделка выбьется по стопу раньше цели</td>
                                    <td>Total (финальный слой)</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <TermGrid items={OVERVIEW_TERMS} />
                </section>

                <section id='explain-models-daily' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        Дневная модель
                    </Text>
                    <Text className={cls.sectionText}>
                        Это основной слой, который каждый день выдает три вероятности: рост, боковик или падение.
                    </Text>
                    <div className={cls.tableWrap}>
                        <table className={cls.infoTable}>
                            <thead>
                                <tr>
                                    <th>Класс</th>
                                    <th>Техническое условие разметки (обучение)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>UP (2)</td>
                                    <td>В baseline-окне первым достигнут уровень entry * (1 + MinMove)</td>
                                </tr>
                                <tr>
                                    <td>DOWN (0)</td>
                                    <td>В baseline-окне первым достигнут уровень entry * (1 - MinMove)</td>
                                </tr>
                                <tr>
                                    <td>FLAT (1)</td>
                                    <td>Ни один из уровней +/-MinMove не достигнут до baseline-exit</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <TermGrid items={DAILY_TERMS} />
                </section>

                <section id='explain-models-micro' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        Микро-модель
                    </Text>
                    <Text className={cls.sectionText}>
                        Микро-модель не «заменяет» дневную. Она работает только поверх FLAT-прогноза дневного слоя.
                    </Text>
                    <ul className={cls.noteList}>
                        <li>Если дневной слой дал UP или DOWN, микро-слой не участвует.</li>
                        <li>Если дневной слой дал FLAT, микро-слой может уточнить направление внутри боковика.</li>
                        <li>Это снижает потери сигналов в днях со слабым, но устойчивым уклоном.</li>
                    </ul>
                    <TermGrid items={MICRO_TERMS} />
                </section>

                <section id='explain-models-sl' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        SL-модель
                    </Text>
                    <Text className={cls.sectionText}>
                        SL-модель отвечает на вопрос риска: «Скорее дойдем до стопа или до цели?». Она не выбирает
                        направление рынка, а корректирует его с точки зрения риска.
                    </Text>
                    <div className={cls.tableWrap}>
                        <table className={cls.infoTable}>
                            <thead>
                                <tr>
                                    <th>Параметр</th>
                                    <th>Текущее правило</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Порог риска</td>
                                    <td>SlHighDecision=true, если p &gt;= 0.55 и модель предсказала HighRisk</td>
                                </tr>
                                <tr>
                                    <td>TP для разметки</td>
                                    <td>3% от цены входа</td>
                                </tr>
                                <tr>
                                    <td>SL для разметки</td>
                                    <td>5% от цены входа</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <TermGrid items={SL_TERMS} />
                </section>

                <section id='explain-models-aggregation' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        Сборка сигнала
                    </Text>
                    <Text className={cls.sectionText}>
                        Финальный прогноз собирается в три шага. Каждый следующий шаг дорабатывает вероятности
                        предыдущего, а не игнорирует их.
                    </Text>
                    <ol className={cls.noteList}>
                        <li>Строим Day-вероятности (без микро и SL).</li>
                        <li>Если дневной прогноз FLAT, применяем микро-оверлей и получаем Day+Micro.</li>
                        <li>Применяем SL-оверлей и получаем Total, который идет в торговое решение.</li>
                    </ol>
                    <TermGrid items={AGGREGATION_TERMS} />
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
