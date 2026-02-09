import { useMemo } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { Text, TermTooltip } from '@/shared/ui'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import type { KeyValueSectionDto, TableSectionDto } from '@/shared/types/report.types'
import { ReportTableCard } from '@/shared/ui/ReportTableCard'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import PageError from '@/shared/ui/errors/PageError/ui/PageError'
import { useBacktestConfidenceRiskReportQuery } from '@/shared/api/tanstackQueries/backtestConfidenceRisk'
import cls from './ConfidenceRiskPage.module.scss'
import type { ConfidenceRiskPageProps } from './types'

interface ConfidenceRiskTerm {
    key: string
    title: string
    description: string
    tooltip: string
}

const TERMS_TABLE: ConfidenceRiskTerm[] = [
    {
        key: 'Split',
        title: 'Split',
        description:
            'Срез данных: FULL — вся история, TRAIN — обучающая часть, OOS — out‑of‑sample. Это нужно, чтобы видеть стабильность правил на новых данных.',
        tooltip: 'Срез данных (FULL/TRAIN/OOS).'
    },
    {
        key: 'Bucket',
        title: 'Bucket',
        description:
            'Диапазон уверенности (бакет). Каждый бакет объединяет дни с близким уровнем уверенности модели.',
        tooltip: 'Диапазон confidence.'
    },
    {
        key: 'ConfFrom%',
        title: 'ConfFrom%',
        description: 'Нижняя граница уверенности бакета, в процентах.',
        tooltip: 'Нижняя граница confidence, %.'
    },
    {
        key: 'ConfTo%',
        title: 'ConfTo%',
        description: 'Верхняя граница уверенности бакета, в процентах.',
        tooltip: 'Верхняя граница confidence, %.'
    },
    {
        key: 'Days',
        title: 'Days',
        description: 'Сколько всего дней попало в бакет (включая дни без направления).',
        tooltip: 'Количество дней в бакете.'
    },
    {
        key: 'TradeDays',
        title: 'TradeDays',
        description: 'Сколько дней в бакете имели направленный сигнал (up/down).',
        tooltip: 'Дни с направлением.'
    },
    {
        key: 'TradeRate%',
        title: 'TradeRate%',
        description: 'Доля направленных дней от общего числа дней в бакете.',
        tooltip: 'TradeDays / Days, %.'
    },
    {
        key: 'ConfAvg%',
        title: 'ConfAvg%',
        description: 'Средняя уверенность внутри бакета (в процентах).',
        tooltip: 'Средняя confidence, %.'
    },
    {
        key: 'MFE_Avg%',
        title: 'MFE_Avg%',
        description:
            'Средний MFE (max favorable excursion): максимальный благоприятный ход цены за день, в % от входа.',
        tooltip: 'Средний MFE, %.'
    },
    {
        key: 'MFE_P50%',
        title: 'MFE_P50%',
        description: 'Медиана MFE: типичное значение благоприятного движения.',
        tooltip: 'MFE p50, %.'
    },
    {
        key: 'MFE_P90%',
        title: 'MFE_P90%',
        description: 'p90 по MFE: верхний хвост «сильных» движений.',
        tooltip: 'MFE p90, %.'
    },
    {
        key: 'MAE_Avg%',
        title: 'MAE_Avg%',
        description:
            'Средний MAE (max adverse excursion): максимальное неблагоприятное движение против позиции, в % от входа.',
        tooltip: 'Средний MAE, %.'
    },
    {
        key: 'MAE_P50%',
        title: 'MAE_P50%',
        description: 'Медиана MAE: типичное значение неблагоприятного движения.',
        tooltip: 'MAE p50, %.'
    },
    {
        key: 'MAE_P90%',
        title: 'MAE_P90%',
        description: 'p90 по MAE: верхний хвост «сильных» неблагоприятных движений.',
        tooltip: 'MAE p90, %.'
    },
    {
        key: 'TP_Reach%',
        title: 'TP_Reach%',
        description:
            'Доля TradeDays, где движение достигало базового TP из конфига. Чем выше — тем чаще тейк‑профит мог бы сработать.',
        tooltip: 'Дни, где достигнут TP, %.'
    },
    {
        key: 'SL_Reach%',
        title: 'SL_Reach%',
        description:
            'Доля TradeDays, где движение достигало базового SL из конфига. Чем выше — тем чаще риск «срыва» стоп‑лосса.',
        tooltip: 'Дни, где достигнут SL, %.'
    },
    {
        key: 'WinRate%',
        title: 'WinRate%',
        description:
            'Доля правильных направлений среди TradeDays. Это «чистая» точность направления по выбранному слою.',
        tooltip: 'Правильное направление, %.'
    }
]

const TERMS_CONFIG: Record<string, ConfidenceRiskTerm> = {
    Source: {
        key: 'Source',
        title: 'Source',
        description:
            'Какой слой вероятностей используется для оценки уверенности: Day / DayMicro / Total. От этого зависит, какие прогнозы попадают в бакеты.',
        tooltip: 'Слой вероятностей.'
    },
    ConfMin: {
        key: 'ConfMin',
        title: 'ConfMin',
        description:
            'Минимальная уверенность, от которой считается линейная шкала для динамики ставки/TP/SL. Ниже этого порога берётся минимум.',
        tooltip: 'Нижняя граница confidence.'
    },
    ConfMax: {
        key: 'ConfMax',
        title: 'ConfMax',
        description:
            'Максимальная уверенность, на которой достигаются максимальные множители динамики. Выше — уже не растёт.',
        tooltip: 'Верхняя граница confidence.'
    },
    BucketRange: {
        key: 'BucketRange',
        title: 'BucketRange',
        description:
            'Диапазон бакетов уверенности и их ширина. Нужен, чтобы понимать детализацию статистики.',
        tooltip: 'Диапазон бакетов.'
    },
    DailyTpPct: {
        key: 'DailyTpPct',
        title: 'DailyTpPct',
        description: 'Базовый дневной тейк‑профит из конфига бэктеста, в процентах.',
        tooltip: 'Базовый дневной TP.'
    },
    DailyStopPct: {
        key: 'DailyStopPct',
        title: 'DailyStopPct',
        description: 'Базовый дневной стоп‑лосс из конфига бэктеста, в процентах.',
        tooltip: 'Базовый дневной SL.'
    },
    CapMultiplier: {
        key: 'CapMultiplier',
        title: 'CapMultiplier',
        description:
            'Диапазон множителя ставки (cap fraction), который применяется поверх базовой ставки.',
        tooltip: 'Диапазон множителя ставки.'
    },
    TpMultiplier: {
        key: 'TpMultiplier',
        title: 'TpMultiplier',
        description:
            'Диапазон множителя TP, который применяется поверх базового дневного тейк‑профита.',
        tooltip: 'Диапазон множителя TP.'
    },
    SlMultiplier: {
        key: 'SlMultiplier',
        title: 'SlMultiplier',
        description:
            'Диапазон множителя SL, который применяется поверх базового дневного стоп‑лосса.',
        tooltip: 'Диапазон множителя SL.'
    },
    CapClamp: {
        key: 'CapClamp',
        title: 'CapClamp',
        description:
            'Жёсткие границы для доли капитала (cap fraction) после всех расчётов. Предохраняет от перегибов.',
        tooltip: 'Жёсткие границы ставки.'
    },
    TpClamp: {
        key: 'TpClamp',
        title: 'TpClamp',
        description: 'Жёсткие границы для дневного TP после расчётов.',
        tooltip: 'Жёсткие границы TP.'
    },
    SlClamp: {
        key: 'SlClamp',
        title: 'SlClamp',
        description: 'Жёсткие границы для дневного SL после расчётов.',
        tooltip: 'Жёсткие границы SL.'
    },
    ApplyToDynamicPolicies: {
        key: 'ApplyToDynamicPolicies',
        title: 'ApplyToDynamicPolicies',
        description:
            'Применяется ли динамика уверенности к политикам, которые уже умеют менять ставку/плечо.',
        tooltip: 'Динамика для dynamic‑policy.'
    },
    ExcludedDays: {
        key: 'ExcludedDays',
        title: 'ExcludedDays',
        description: 'Сколько дней исключено из Train/OOS разреза (вне окна).',
        tooltip: 'Исключённые дни.'
    }
}

const TABLE_TERM_MAP = new Map(TERMS_TABLE.map(term => [term.title, term]))

function getTableTermOrThrow(title: string): ConfidenceRiskTerm {
    if (!title) {
        throw new Error('[confidence-risk] column title is empty.')
    }

    const term = TABLE_TERM_MAP.get(title)
    if (!term) {
        throw new Error(`[confidence-risk] unknown column term: ${title}`)
    }

    return term
}

function getConfigTermOrThrow(key: string): ConfidenceRiskTerm {
    if (!key) {
        throw new Error('[confidence-risk] config key is empty.')
    }

    const term = TERMS_CONFIG[key]
    if (!term) {
        throw new Error(`[confidence-risk] unknown config key: ${key}`)
    }

    return term
}

function formatUtc(dt: Date): string {
    const year = dt.getUTCFullYear()
    const month = String(dt.getUTCMonth() + 1).padStart(2, '0')
    const day = String(dt.getUTCDate()).padStart(2, '0')
    const hour = String(dt.getUTCHours()).padStart(2, '0')
    const minute = String(dt.getUTCMinutes()).padStart(2, '0')

    return `${year}-${month}-${day} ${hour}:${minute} UTC`
}

function buildTableSections(sections: unknown[]): TableSectionDto[] {
    return (sections ?? []).filter(
        (section): section is TableSectionDto =>
            Array.isArray((section as TableSectionDto).columns) && (section as TableSectionDto).columns!.length > 0
    )
}

function buildKeyValueSections(sections: unknown[]): KeyValueSectionDto[] {
    return (sections ?? []).filter(
        (section): section is KeyValueSectionDto => Array.isArray((section as KeyValueSectionDto).items)
    )
}

export default function ConfidenceRiskPage({ className }: ConfidenceRiskPageProps) {
    const { data, isError, error, refetch } = useBacktestConfidenceRiskReportQuery()

    const tableSections = useMemo(() => buildTableSections(data?.sections ?? []), [data])
    const keyValueSections = useMemo(() => buildKeyValueSections(data?.sections ?? []), [data])

    const configState = useMemo(() => {
        if (!data) {
            return { section: null as KeyValueSectionDto | null, error: null as Error | null }
        }

        if (keyValueSections.length === 0) {
            return { section: null as KeyValueSectionDto | null, error: null as Error | null }
        }

        const section = keyValueSections[0]

        try {
            ;(section.items ?? []).forEach(item => {
                if (!item?.key) {
                    throw new Error('[confidence-risk] config item key is empty.')
                }
                getConfigTermOrThrow(item.key)
            })

            return { section, error: null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to validate confidence risk config.')
            return { section: null as KeyValueSectionDto | null, error: safeError }
        }
    }, [data, keyValueSections])

    const generatedAtState = useMemo(() => {
        if (!data) return { value: null as Date | null, error: null as Error | null }

        if (!data.generatedAtUtc) {
            return { value: null, error: new Error('[confidence-risk] generatedAtUtc is missing.') }
        }

        const parsed = new Date(data.generatedAtUtc)
        if (Number.isNaN(parsed.getTime())) {
            return {
                value: null,
                error: new Error(`[confidence-risk] generatedAtUtc is invalid: ${data.generatedAtUtc}`)
            }
        }

        return { value: parsed, error: null }
    }, [data])

    const rootClassName = classNames(cls.root, {}, [className ?? ''])

    const renderColumnTitle = (title: string) => {
        const term = getTableTermOrThrow(title)
        return renderTermTooltipTitle(title, term.tooltip)
    }

    let content: JSX.Element | null = null

    if (data) {
        if (generatedAtState.error || !generatedAtState.value) {
            const err =
                generatedAtState.error ??
                new Error('[confidence-risk] generatedAtUtc is missing after validation.')

            content = (
                <PageError
                    title='Отчёт уверенности без корректной даты генерации'
                    message='generatedAtUtc отсутствует или невалиден. Проверь сериализацию отчётов.'
                    error={err}
                    onRetry={refetch}
                />
            )
        } else if (configState.error) {
            content = (
                <PageError
                    title='Отчёт уверенности имеет неверный конфиг'
                    message='Секция конфигурации не распознана. Проверь ключи и формат ключ‑значение.'
                    error={configState.error}
                    onRetry={refetch}
                />
            )
        } else if (tableSections.length === 0) {
            content = <Text>Таблица уверенности пустая. Проверь генерацию отчёта на бэкенде.</Text>
        } else {
            const generatedUtc = generatedAtState.value

            content = (
                <div className={rootClassName}>
                    <header className={cls.hero}>
                        <div>
                            <Text type='h1' className={cls.heroTitle}>
                                Уверенность и TP/SL
                            </Text>
                            <Text className={cls.heroSubtitle}>
                                Сводка по бакетам уверенности модели: сколько дней дают направление, как часто
                                достигаются TP/SL и какие типичные MFE/MAE. Это опорная статистика для настройки
                                динамического тейк‑профита, стоп‑лосса и размера ставки.
                            </Text>
                        </div>

                        <div className={cls.meta}>
                            <Text>Report: {data.title}</Text>
                            <Text>Kind: {data.kind}</Text>
                            <Text>Generated (UTC): {formatUtc(generatedUtc)}</Text>
                            <Text>Generated (local): {generatedUtc.toLocaleString()}</Text>
                        </div>
                    </header>

                    {configState.section && (
                        <section className={cls.configBlock}>
                            <div className={cls.configHeader}>
                                <Text type='h3' className={cls.configTitle}>
                                    Конфиг расчёта
                                </Text>
                                <Text className={cls.configSubtitle}>
                                    Базовые параметры, которые использовались при сборке bucket‑статистики.
                                </Text>
                            </div>
                            <div className={cls.configGrid}>
                                {(configState.section.items ?? []).map(item => {
                                    const term = getConfigTermOrThrow(item.key)
                                    return (
                                        <div key={item.key} className={cls.configItem}>
                                            <div className={cls.configKeyRow}>
                                                <TermTooltip term={term.title} description={term.tooltip} type='span' />
                                                <Text className={cls.configValue}>{item.value}</Text>
                                            </div>
                                            <Text className={cls.configDescription}>{term.description}</Text>
                                        </div>
                                    )
                                })}
                            </div>
                        </section>
                    )}

                    <section className={cls.sectionBlock}>
                        <div className={cls.termsBlock} data-tooltip-boundary>
                            <div className={cls.termsHeader}>
                                <Text type='h3' className={cls.termsTitle}>
                                    Термины таблицы
                                </Text>
                                <Text className={cls.termsSubtitle}>
                                    Объяснения всех показателей, которые используются в таблице уверенности.
                                </Text>
                            </div>
                            <div className={cls.termsGrid}>
                                {TERMS_TABLE.map(term => (
                                    <div key={term.key} className={cls.termItem}>
                                        <TermTooltip term={term.title} description={term.tooltip} type='span' />
                                        <Text className={cls.termDescription}>{term.description}</Text>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {tableSections.map((section, index) => {
                            const domId = `confidence-risk-${index + 1}`
                            const title = section.title || `Confidence bucket table ${index + 1}`

                            return (
                                <ReportTableCard
                                    key={`${section.title}-${index}`}
                                    title={title}
                                    description='Сводка по бакетам уверенности и их торговым характеристикам.'
                                    columns={section.columns ?? []}
                                    rows={section.rows ?? []}
                                    domId={domId}
                                    renderColumnTitle={renderColumnTitle}
                                />
                            )
                        })}
                    </section>
                </div>
            )
        }
    }

    return (
        <PageDataBoundary
            isError={isError}
            error={error}
            hasData={Boolean(data)}
            onRetry={refetch}
            errorTitle='Не удалось загрузить отчёт уверенности'>
            {content}
        </PageDataBoundary>
    )
}
