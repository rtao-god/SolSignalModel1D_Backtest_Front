import { type ReactNode, useMemo } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { Link, TermTooltip, Text } from '@/shared/ui'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { EXPLAIN_FEATURES_TABS } from '@/shared/utils/explainTabs'
import { usePfiPerModelReportNavQuery } from '@/shared/api/tanstackQueries/pfi'
import type { ReportSectionDto, TableSectionDto } from '@/shared/types/report.types'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'
import cls from './ExplainFeaturesPage.module.scss'
import type { ExplainFeaturesPageProps } from './types'

interface TermItem {
    term: string
    description: ReactNode
}

interface PfiStat {
    count: number
    sumImportance: number
    countImportance: number
    sumCorr: number
    countCorr: number
    sumDeltaMean: number
    countDeltaMean: number
}

const OVERVIEW_TERMS: TermItem[] = [
    {
        term: 'Фича',
        description:
            'Числовой признак, который подается в модель на момент входа. Фича описывает состояние рынка, но сама по себе не является прогнозом.'
    },
    {
        term: 'PFI',
        description:
            'Permutation Feature Importance: мы перемешиваем одну фичу и смотрим, как падает качество модели. Если падение большое, фича действительно важна.'
    },
    {
        term: 'AUC',
        description:
            'Метрика качества бинарного классификатора. 0.5 = почти случайно, 1.0 = идеально.'
    },
    {
        term: 'ΔAUC',
        description:
            'Изменение AUC после перемешивания фичи. Чем больше падение по модулю, тем сильнее модель опирается на эту фичу.'
    },
    {
        term: 'Corr(score) (корреляция)',
        description:
            'Связь значения фичи со скором модели. Знак показывает направление связи (плюс/минус), модуль — ее силу.'
    },
    {
        term: 'ΔMean',
        description:
            'Разница средних значений фичи между классами 1 и 0 в отчете. Помогает понять, куда смещен признак у целевого класса.'
    }
]

function normalizeColumnName(value: string): string {
    return value.toLowerCase().replace(/\s+/g, '')
}

function findColumnIndex(columns: string[], keywords: string[]): number {
    const normalized = columns.map(normalizeColumnName)

    for (const keyword of keywords) {
        const key = normalizeColumnName(keyword)
        const idx = normalized.findIndex(col => col.includes(key))
        if (idx >= 0) return idx
    }

    return -1
}

function parseNumber(value?: string): number | null {
    if (!value) return null
    const cleaned = value
        .replace('%', '')
        .replace(',', '.')
        .replace('−', '-')
        .trim()

    const parsed = Number(cleaned)
    return Number.isFinite(parsed) ? parsed : null
}

function isTableSection(section: ReportSectionDto): section is TableSectionDto {
    return Array.isArray((section as TableSectionDto).columns) && Array.isArray((section as TableSectionDto).rows)
}

function formatMaybe(value: number | null, digits: number): string {
    if (value === null || !Number.isFinite(value)) return 'n/a'
    return value.toFixed(digits)
}

function buildPfiStats(sections: ReportSectionDto[] | undefined): Map<string, PfiStat> {
    const stats = new Map<string, PfiStat>()
    if (!sections) return stats

    sections.forEach(section => {
        if (!isTableSection(section)) return

        const columns = section.columns ?? []
        const rows = section.rows ?? []

        const nameIdx = findColumnIndex(columns, ['фича', 'feature', 'featurename'])
        if (nameIdx < 0) return

        const importanceIdx = findColumnIndex(columns, ['важность', 'importance', 'Δauc', 'deltaauc'])
        const corrIdx = findColumnIndex(columns, ['corr(score)', 'corrscore', 'corr'])
        const deltaMeanIdx = findColumnIndex(columns, ['Δmean', 'meanpos', 'meanneg'])

        rows.forEach(row => {
            const name = row[nameIdx]?.trim()
            if (!name) return

            const entry = stats.get(name) ?? {
                count: 0,
                sumImportance: 0,
                countImportance: 0,
                sumCorr: 0,
                countCorr: 0,
                sumDeltaMean: 0,
                countDeltaMean: 0
            }

            entry.count += 1

            const importance = importanceIdx >= 0 ? parseNumber(row[importanceIdx]) : null
            if (importance !== null) {
                entry.sumImportance += importance
                entry.countImportance += 1
            }

            const corr = corrIdx >= 0 ? parseNumber(row[corrIdx]) : null
            if (corr !== null) {
                entry.sumCorr += corr
                entry.countCorr += 1
            }

            const deltaMean = deltaMeanIdx >= 0 ? parseNumber(row[deltaMeanIdx]) : null
            if (deltaMean !== null) {
                entry.sumDeltaMean += deltaMean
                entry.countDeltaMean += 1
            }

            stats.set(name, entry)
        })
    })

    return stats
}

function buildPfiNote(featureName: string, stats: Map<string, PfiStat>, hasReport: boolean): string {
    if (!hasReport) {
        return 'PFI: отчёт ещё не загружен, значения появятся после загрузки.'
    }

    const item = stats.get(featureName)
    if (!item) {
        return 'PFI: фича не найдена в отчёте или не посчитана.'
    }

    const avgImportance = item.countImportance > 0 ? item.sumImportance / item.countImportance : null
    const avgCorr = item.countCorr > 0 ? item.sumCorr / item.countCorr : null
    const avgDeltaMean = item.countDeltaMean > 0 ? item.sumDeltaMean / item.countDeltaMean : null

    return `PFI по ${item.count} моделям: влияние на качество (ΔAUC) ≈ ${formatMaybe(avgImportance, 2)}; связь со скором (corr) ≈ ${formatMaybe(avgCorr, 3)}; разница средних классов (ΔMean) ≈ ${formatMaybe(avgDeltaMean, 4)}.`
}

function buildFeatureDescription(
    baseText: string,
    featureName: string,
    stats: Map<string, PfiStat>,
    hasReport: boolean
) {
    const pfiLine = buildPfiNote(featureName, stats, hasReport)

    return (
        <div className={cls.tooltipBody}>
            <Text className={cls.tooltipParagraph}>{baseText}</Text>
            <Text className={cls.tooltipMeta}>{pfiLine}</Text>
        </div>
    )
}

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

export default function ExplainFeaturesPage({ className }: ExplainFeaturesPageProps) {
    const { data: pfiReport } = usePfiPerModelReportNavQuery({ enabled: true })
    const pfiStats = useMemo(() => buildPfiStats(pfiReport?.sections), [pfiReport])
    const hasPfiReport = Boolean(pfiReport)

    const sections = useMemo(() => EXPLAIN_FEATURES_TABS, [])
    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections,
        syncHash: true
    })

    const featureItem = (featureName: string, text: string): TermItem => ({
        term: featureName,
        description: buildFeatureDescription(text, featureName, pfiStats, hasPfiReport)
    })

    const RETURN_FEATURES: TermItem[] = [
        featureItem('SolRet30', 'Доходность SOL за 30 последних 6h-баров (примерно 7.5 дня): close[t]/close[t-30]-1.'),
        featureItem('BtcRet30', 'Доходность BTC за те же 30 6h-баров. Дает контекст общего рыночного режима.'),
        featureItem('SolBtcRet30', 'Разница SolRet30 - BtcRet30. Показывает относительную силу SOL против BTC.'),
        featureItem('SolRet1', 'Доходность SOL за 1 последний 6h-бар.'),
        featureItem('SolRet3', 'Доходность SOL за 3 последних 6h-бара (18 часов).'),
        featureItem('BtcRet1', 'Доходность BTC за 1 последний 6h-бар.'),
        featureItem('BtcRet3', 'Доходность BTC за 3 последних 6h-бара.'),
        featureItem('GapBtcSol1', 'Разница BTC и SOL на горизонте 1 бара: BtcRet1 - SolRet1.'),
        featureItem('GapBtcSol3', 'Разница BTC и SOL на горизонте 3 баров: BtcRet3 - SolRet3.')
    ]

    const INDICATOR_FEATURES: TermItem[] = [
        featureItem('FngNorm', 'Нормализованный индекс Fear & Greed: (FNG - 50) / 50. Показывает рыночный сентимент.'),
        featureItem('DxyChg30', 'Изменение DXY за 30 дней. В коде дополнительно ограничивается диапазоном [-3%; +3%].'),
        featureItem('GoldChg30', 'Изменение PAXG за 30 последних 6h-баров (примерно 7.5 дня).'),
        featureItem('BtcVs200', 'Положение BTC относительно SMA200: (BTC_close - SMA200) / SMA200.')
    ]

    const MOMENTUM_FEATURES: TermItem[] = [
        featureItem('SolRsiCenteredScaled', 'RSI(14) по SOL, центрирован и масштабирован: (RSI - 50) / 100.'),
        featureItem('RsiSlope3Scaled', 'Наклон RSI за 3 шага (18 часов), также масштабирован /100.'),
        featureItem(
            'AtrPct',
            'ATR(14) по 6h-свечам SOL, нормализованный на цену входа: atrPct = ATR / entryPrice. ATR — технический индикатор волатильности.'
        ),
        featureItem('DynVol', 'Среднее абсолютное движение цены за 10 последних 6h-баров.')
    ]

    const REGIME_FEATURES: TermItem[] = [
        featureItem(
            'RegimeDownFlag',
            'Флаг медвежьего режима. В коде включается, если SolRet30 < -7% или BtcRet30 < -5%.'
        ),
        featureItem(
            'HardRegimeIs2Flag',
            'Флаг жесткого режима. Включается, если |SolRet30| > 10% или AtrPct > 3.5%.'
        ),
        featureItem('SolAboveEma50', 'Положение SOL относительно EMA50: (entryPrice - EMA50) / EMA50.'),
        featureItem('SolEma50vs200', 'Трендовый спред SOL: (EMA50 - EMA200) / EMA200.'),
        featureItem('BtcEma50vs200', 'Трендовый спред BTC: (EMA50 - EMA200) / EMA200.')
    ]

    return (
        <div className={classNames(cls.ExplainFeaturesPage, {}, [className ?? ''])} data-tooltip-boundary>
            <header className={cls.headerRow}>
                <div>
                    <Text type='h2'>Фичи и индикаторы</Text>
                    <Text className={cls.subtitle}>
                        Ниже перечислены все признаки, которые реально подаются в модель. Для каждого признака есть
                        понятное описание и фактические метрики важности из PFI.
                    </Text>
                    <div className={cls.linkRow}>
                        <Text className={cls.linkLabel}>PFI по моделям:</Text>
                        <Link to={ROUTE_PATH[AppRoute.PFI_PER_MODEL]} className={cls.inlineLink}>
                            {ROUTE_PATH[AppRoute.PFI_PER_MODEL]}
                        </Link>
                    </div>
                </div>
            </header>

            <div className={cls.sectionsGrid}>
                <section id='explain-features-overview' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        Как читать фичи
                    </Text>
                    <Text className={cls.sectionText}>
                        PFI-метрики часто выглядят сложными. Таблица ниже расшифровывает их простым языком.
                    </Text>
                    <div className={cls.tableWrap}>
                        <table className={cls.infoTable}>
                            <thead>
                                <tr>
                                    <th>Метрика</th>
                                    <th>Что означает</th>
                                    <th>Как читать</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>ΔAUC</td>
                                    <td>Насколько падает качество модели после перемешивания одной фичи</td>
                                    <td>Чем больше по модулю, тем важнее фича</td>
                                </tr>
                                <tr>
                                    <td>Corr(score)</td>
                                    <td>Корреляция значения фичи со скором модели</td>
                                    <td>Знак = направление связи, модуль = сила связи</td>
                                </tr>
                                <tr>
                                    <td>ΔMean</td>
                                    <td>Разница среднего значения фичи между классом 1 и классом 0</td>
                                    <td>Показывает, в какую сторону сдвинут признак у целевого класса</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    <TermGrid items={OVERVIEW_TERMS} />
                </section>

                <section id='explain-features-returns' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        Доходности и относительная динамика
                    </Text>
                    <Text className={cls.sectionText}>
                        Это базовый блок: как двигались SOL и BTC на коротком и среднем горизонте, и кто из них был
                        сильнее.
                    </Text>
                    <TermGrid items={RETURN_FEATURES} />
                </section>

                <section id='explain-features-indicators' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        Индикаторы и макро‑сигналы
                    </Text>
                    <Text className={cls.sectionText}>
                        Эти признаки добавляют контекст: настроение рынка, долларовый фон и положение BTC относительно
                        длинной средней.
                    </Text>
                    <TermGrid items={INDICATOR_FEATURES} />
                </section>

                <section id='explain-features-momentum' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        Momentum и волатильность
                    </Text>
                    <Text className={cls.sectionText}>
                        Блок про скорость движения и «нервность» рынка: RSI, ATR и динамическая волатильность.
                    </Text>
                    <TermGrid items={MOMENTUM_FEATURES} />
                </section>

                <section id='explain-features-regime' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        Режимы и EMA
                    </Text>
                    <Text className={cls.sectionText}>
                        Здесь собраны флаги рыночных режимов и трендовые EMA-связки. Они помогают модели переключать
                        поведение в разных фазах рынка.
                    </Text>
                    <TermGrid items={REGIME_FEATURES} />
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
