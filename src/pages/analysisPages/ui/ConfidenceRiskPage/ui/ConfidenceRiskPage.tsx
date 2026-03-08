import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import classNames from '@/shared/lib/helpers/classNames'
import {
    ReportActualStatusCard,
    ReportTableTermsBlock,
    ReportViewControls,
    Text,
    TermTooltip,
    resolveCurrentPredictionTrainingScopeMeta,
    type ReportViewControlGroup,
    buildConfidenceBucketControlGroup,
    buildTrainingScopeControlGroup
} from '@/shared/ui'
import { enrichTermTooltipDescription, renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import type { KeyValueSectionDto, TableSectionDto } from '@/shared/types/report.types'
import { ReportTableCard } from '@/shared/ui/ReportTableCard'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import PageError from '@/shared/ui/errors/PageError/ui/PageError'
import { useBacktestConfidenceRiskReportQuery } from '@/shared/api/tanstackQueries/backtestConfidenceRisk'
import type { CurrentPredictionTrainingScope } from '@/shared/api/endpoints/reportEndpoints'
import { resolveReportSourceEndpointOrThrow } from '@/shared/utils/reportSourceEndpoint'
import cls from './ConfidenceRiskPage.module.scss'
import type { ConfidenceRiskPageProps } from './types'

interface ConfidenceRiskTerm {
    key: string
    title: string
    description: string
    tooltip: string
}

type ConfidenceRiskUiLocale = 'ru' | 'en'

interface ConfidenceRiskTermTemplate {
    key: string
    title: string
    description: Record<ConfidenceRiskUiLocale, string>
    tooltip: Record<ConfidenceRiskUiLocale, string>
}

interface ConfidenceBucketOption {
    value: string
    label: string
}

const TERMS_TABLE_TEMPLATES: readonly ConfidenceRiskTermTemplate[] = [
    {
        key: 'Split',
        title: 'Split',
        description: {
            ru: 'Срез данных: FULL — вся история, TRAIN — обучающая часть, OOS — out‑of‑sample, RECENT — хвост последних дней. Это нужно, чтобы видеть стабильность правил на новых данных и на свежем хвосте.',
            en: 'Data split: FULL is full history, TRAIN is training segment, OOS is out-of-sample, RECENT is latest tail window. Used to check rule stability on fresh and unseen data.'
        },
        tooltip: {
            ru: 'Срез данных (FULL/TRAIN/OOS/RECENT).',
            en: 'Data split (FULL/TRAIN/OOS/RECENT).'
        }
    },
    {
        key: 'Bucket',
        title: 'Bucket',
        description: {
            ru: 'Диапазон уверенности (бакет). Каждый бакет объединяет дни с близким уровнем уверенности модели.',
            en: 'Confidence range bucket. Each bucket groups days with similar model confidence.'
        },
        tooltip: {
            ru: 'Диапазон confidence.',
            en: 'Confidence range.'
        }
    },
    {
        key: 'ConfFrom%',
        title: 'ConfFrom%',
        description: {
            ru: 'Нижняя граница уверенности бакета, в процентах.',
            en: 'Lower confidence boundary of the bucket, in percent.'
        },
        tooltip: {
            ru: 'Нижняя граница confidence, %.',
            en: 'Lower confidence boundary, %.'
        }
    },
    {
        key: 'ConfTo%',
        title: 'ConfTo%',
        description: {
            ru: 'Верхняя граница уверенности бакета, в процентах.',
            en: 'Upper confidence boundary of the bucket, in percent.'
        },
        tooltip: {
            ru: 'Верхняя граница confidence, %.',
            en: 'Upper confidence boundary, %.'
        }
    },
    {
        key: 'Days',
        title: 'Days',
        description: {
            ru: 'Сколько всего дней попало в бакет (включая дни без направления).',
            en: 'Total days in the bucket (including no-direction days).'
        },
        tooltip: {
            ru: 'Количество дней в бакете.',
            en: 'Number of days in the bucket.'
        }
    },
    {
        key: 'TradeDays',
        title: 'TradeDays',
        description: {
            ru: 'Сколько дней в бакете имели направленный сигнал (up/down).',
            en: 'Days in the bucket with directional signal (up/down).'
        },
        tooltip: {
            ru: 'Дни с направлением.',
            en: 'Directional days.'
        }
    },
    {
        key: 'TradeRate%',
        title: 'TradeRate%',
        description: {
            ru: 'Доля направленных дней от общего числа дней в бакете.',
            en: 'Share of directional days out of all days in the bucket.'
        },
        tooltip: {
            ru: 'TradeDays / Days, %.',
            en: 'TradeDays / Days, %.'
        }
    },
    {
        key: 'ConfAvg%',
        title: 'ConfAvg%',
        description: {
            ru: 'Средняя уверенность внутри бакета (в процентах).',
            en: 'Average confidence inside the bucket, in percent.'
        },
        tooltip: {
            ru: 'Средняя confidence, %.',
            en: 'Average confidence, %.'
        }
    },
    {
        key: 'MFE_Avg%',
        title: 'MFE_Avg%',
        description: {
            ru: 'Средний MFE (max favorable excursion): максимальный благоприятный ход цены за день, в % от входа.',
            en: 'Average MFE (max favorable excursion): max favorable move during the day, % from entry.'
        },
        tooltip: {
            ru: 'Средний MFE, %.',
            en: 'Average MFE, %.'
        }
    },
    {
        key: 'MFE_P50%',
        title: 'MFE_P50%',
        description: {
            ru: 'Медиана MFE: типичное значение благоприятного движения.',
            en: 'Median MFE: typical favorable move value.'
        },
        tooltip: {
            ru: 'MFE p50, %.',
            en: 'MFE p50, %.'
        }
    },
    {
        key: 'MFE_P90%',
        title: 'MFE_P90%',
        description: {
            ru: 'p90 по MFE: верхний хвост «сильных» движений.',
            en: 'MFE p90: upper tail of strong favorable moves.'
        },
        tooltip: {
            ru: 'MFE p90, %.',
            en: 'MFE p90, %.'
        }
    },
    {
        key: 'MAE_Avg%',
        title: 'MAE_Avg%',
        description: {
            ru: 'Средний MAE (max adverse excursion): максимальное неблагоприятное движение против позиции, в % от входа.',
            en: 'Average MAE (max adverse excursion): max adverse move against position during day, % from entry.'
        },
        tooltip: {
            ru: 'Средний MAE, %.',
            en: 'Average MAE, %.'
        }
    },
    {
        key: 'MAE_P50%',
        title: 'MAE_P50%',
        description: {
            ru: 'Медиана MAE: типичное значение неблагоприятного движения.',
            en: 'Median MAE: typical adverse move value.'
        },
        tooltip: {
            ru: 'MAE p50, %.',
            en: 'MAE p50, %.'
        }
    },
    {
        key: 'MAE_P90%',
        title: 'MAE_P90%',
        description: {
            ru: 'p90 по MAE: верхний хвост «сильных» неблагоприятных движений.',
            en: 'MAE p90: upper tail of strong adverse moves.'
        },
        tooltip: {
            ru: 'MAE p90, %.',
            en: 'MAE p90, %.'
        }
    },
    {
        key: 'TP_Reach%',
        title: 'TP_Reach%',
        description: {
            ru: 'Доля TradeDays, где движение достигало базового TP из конфига. Чем выше — тем чаще тейк‑профит мог бы сработать.',
            en: 'Share of TradeDays where move reached base TP from config. Higher value means TP was reachable more often.'
        },
        tooltip: {
            ru: 'Дни, где достигнут TP, %.',
            en: 'Days with TP reached, %.'
        }
    },
    {
        key: 'SL_Reach%',
        title: 'SL_Reach%',
        description: {
            ru: 'Доля TradeDays, где движение достигало базового SL из конфига. Чем выше — тем чаще риск «срыва» стоп‑лосса.',
            en: 'Share of TradeDays where move reached base SL from config. Higher value means stop-loss risk is triggered more often.'
        },
        tooltip: {
            ru: 'Дни, где достигнут SL, %.',
            en: 'Days with SL reached, %.'
        }
    },
    {
        key: 'WinRate%',
        title: 'WinRate%',
        description: {
            ru: 'Доля правильных направлений среди TradeDays. Это «чистая» точность направления по выбранному слою.',
            en: 'Share of correct directions among TradeDays. Pure directional accuracy for selected slice.'
        },
        tooltip: {
            ru: 'Правильное направление, %.',
            en: 'Correct direction, %.'
        }
    }
]

const TERMS_CONFIG_TEMPLATES: readonly ConfidenceRiskTermTemplate[] = [
    {
        key: 'Source',
        title: 'Source',
        description: {
            ru: 'Какой слой вероятностей используется для оценки уверенности: Day / DayMicro / Total. От этого зависит, какие прогнозы попадают в бакеты.',
            en: 'Which probability layer is used for confidence assessment: Day / DayMicro / Total. This controls which forecasts are mapped into buckets.'
        },
        tooltip: {
            ru: 'Слой вероятностей.',
            en: 'Probability layer.'
        }
    },
    {
        key: 'ConfMin',
        title: 'ConfMin',
        description: {
            ru: 'Минимальная уверенность, от которой считается линейная шкала для динамики ставки/TP/SL. Ниже этого порога берётся минимум.',
            en: 'Minimum confidence used as linear-scale lower bound for dynamic stake/TP/SL. Below threshold, minimum multipliers are used.'
        },
        tooltip: {
            ru: 'Нижняя граница confidence.',
            en: 'Lower confidence boundary.'
        }
    },
    {
        key: 'ConfMax',
        title: 'ConfMax',
        description: {
            ru: 'Максимальная уверенность, на которой достигаются максимальные множители динамики. Выше — уже не растёт.',
            en: 'Maximum confidence where dynamic multipliers reach their top values. Above this threshold, values no longer increase.'
        },
        tooltip: {
            ru: 'Верхняя граница confidence.',
            en: 'Upper confidence boundary.'
        }
    },
    {
        key: 'BucketRange',
        title: 'BucketRange',
        description: {
            ru: 'Диапазон бакетов уверенности и их ширина. Нужен, чтобы понимать детализацию статистики.',
            en: 'Confidence-bucket range and width. Helps interpret granularity of statistics.'
        },
        tooltip: {
            ru: 'Диапазон бакетов.',
            en: 'Bucket range.'
        }
    },
    {
        key: 'DailyTpPct',
        title: 'DailyTpPct',
        description: {
            ru: 'Базовый дневной тейк‑профит из конфига бэктеста, в процентах.',
            en: 'Base daily take-profit from backtest config, in percent.'
        },
        tooltip: {
            ru: 'Базовый дневной TP.',
            en: 'Base daily TP.'
        }
    },
    {
        key: 'DailyStopPct',
        title: 'DailyStopPct',
        description: {
            ru: 'Базовый дневной стоп‑лосс из конфига бэктеста, в процентах.',
            en: 'Base daily stop-loss from backtest config, in percent.'
        },
        tooltip: {
            ru: 'Базовый дневной SL.',
            en: 'Base daily SL.'
        }
    },
    {
        key: 'CapMultiplier',
        title: 'CapMultiplier',
        description: {
            ru: 'Диапазон множителя ставки (cap fraction), который применяется поверх базовой ставки.',
            en: 'Stake multiplier range (cap fraction) applied over base stake.'
        },
        tooltip: {
            ru: 'Диапазон множителя ставки.',
            en: 'Stake multiplier range.'
        }
    },
    {
        key: 'TpMultiplier',
        title: 'TpMultiplier',
        description: {
            ru: 'Диапазон множителя TP, который применяется поверх базового дневного тейк‑профита.',
            en: 'TP multiplier range applied over base daily take-profit.'
        },
        tooltip: {
            ru: 'Диапазон множителя TP.',
            en: 'TP multiplier range.'
        }
    },
    {
        key: 'SlMultiplier',
        title: 'SlMultiplier',
        description: {
            ru: 'Диапазон множителя SL, который применяется поверх базового дневного стоп‑лосса.',
            en: 'SL multiplier range applied over base daily stop-loss.'
        },
        tooltip: {
            ru: 'Диапазон множителя SL.',
            en: 'SL multiplier range.'
        }
    },
    {
        key: 'CapClamp',
        title: 'CapClamp',
        description: {
            ru: 'Жёсткие границы для доли капитала (cap fraction) после всех расчётов. Предохраняет от перегибов.',
            en: 'Hard bounds for cap fraction after all calculations. Prevents extreme over-sizing.'
        },
        tooltip: {
            ru: 'Жёсткие границы ставки.',
            en: 'Hard stake bounds.'
        }
    },
    {
        key: 'TpClamp',
        title: 'TpClamp',
        description: {
            ru: 'Жёсткие границы для дневного TP после расчётов.',
            en: 'Hard bounds for daily TP after calculations.'
        },
        tooltip: {
            ru: 'Жёсткие границы TP.',
            en: 'Hard TP bounds.'
        }
    },
    {
        key: 'SlClamp',
        title: 'SlClamp',
        description: {
            ru: 'Жёсткие границы для дневного SL после расчётов.',
            en: 'Hard bounds for daily SL after calculations.'
        },
        tooltip: {
            ru: 'Жёсткие границы SL.',
            en: 'Hard SL bounds.'
        }
    },
    {
        key: 'ApplyToDynamicPolicies',
        title: 'ApplyToDynamicPolicies',
        description: {
            ru: 'Применяется ли динамика уверенности к политикам, которые уже умеют менять ставку/плечо.',
            en: 'Whether confidence dynamics are applied to policies that already adjust stake/leverage.'
        },
        tooltip: {
            ru: 'Динамика для dynamic‑policy.',
            en: 'Dynamics for dynamic-policy.'
        }
    },
    {
        key: 'ExcludedDays',
        title: 'ExcludedDays',
        description: {
            ru: 'Сколько дней исключено из Train/OOS разреза (вне окна).',
            en: 'How many days were excluded from Train/OOS slices (outside window).'
        },
        tooltip: {
            ru: 'Исключённые дни.',
            en: 'Excluded days.'
        }
    }
]

const CONFIDENCE_SCOPE_TO_SPLIT: Record<CurrentPredictionTrainingScope, string> = {
    full: 'FULL',
    train: 'TRAIN',
    oos: 'OOS',
    recent: 'RECENT'
}

const DEFAULT_CONFIDENCE_SCOPE: CurrentPredictionTrainingScope = 'full'
const DEFAULT_CONFIDENCE_BUCKET = 'all'

function resolveConfidenceRiskUiLocale(language: string): ConfidenceRiskUiLocale {
    return language.toLowerCase().startsWith('ru') ? 'ru' : 'en'
}

function resolveConfidenceScopeFromQueryOrThrow(raw: string | null): CurrentPredictionTrainingScope {
    if (!raw) {
        return DEFAULT_CONFIDENCE_SCOPE
    }

    const normalized = raw.trim().toLowerCase()
    if (normalized === 'full') return 'full'
    if (normalized === 'train') return 'train'
    if (normalized === 'oos') return 'oos'
    if (normalized === 'recent') return 'recent'

    throw new Error(`[confidence-risk] invalid scope query value: ${raw}.`)
}

function findColumnIndexByTitleOrThrow(columns: string[], title: string): number {
    const index = columns.findIndex(column => column.trim().toLowerCase() === title.trim().toLowerCase())
    if (index < 0) {
        throw new Error(`[confidence-risk] required column is missing: ${title}.`)
    }

    return index
}

function compareConfidenceBucketNames(left: string, right: string): number {
    if (left === right) return 0
    if (left === 'OUT_OF_RANGE') return 1
    if (right === 'OUT_OF_RANGE') return -1

    const leftMatch = /^B(\d{2})$/i.exec(left)
    const rightMatch = /^B(\d{2})$/i.exec(right)

    if (leftMatch && rightMatch) {
        const leftValue = Number(leftMatch[1])
        const rightValue = Number(rightMatch[1])
        return leftValue - rightValue
    }

    return left.localeCompare(right, 'en-US', { sensitivity: 'base' })
}

function buildConfidenceBucketOptionsOrThrow(
    sections: TableSectionDto[],
    scope: CurrentPredictionTrainingScope,
    allBucketsLabel: string
): ConfidenceBucketOption[] {
    if (!Array.isArray(sections) || sections.length === 0) {
        throw new Error('[confidence-risk] table sections are missing for bucket options.')
    }

    const splitLabel = CONFIDENCE_SCOPE_TO_SPLIT[scope]
    const uniqueBucketNames = new Set<string>()

    sections.forEach(section => {
        if (!Array.isArray(section.columns) || !Array.isArray(section.rows)) {
            throw new Error('[confidence-risk] invalid table section while reading confidence buckets.')
        }

        const splitIndex = findColumnIndexByTitleOrThrow(section.columns, 'Split')
        const bucketIndex = findColumnIndexByTitleOrThrow(section.columns, 'Bucket')

        section.rows.forEach((row, rowIndex) => {
            if (!Array.isArray(row)) {
                throw new Error(
                    `[confidence-risk] row is not an array while reading confidence buckets. rowIndex=${rowIndex}.`
                )
            }

            const splitValue = row[splitIndex]?.trim().toUpperCase()
            const bucketValue = row[bucketIndex]?.trim()

            if (splitValue === splitLabel && bucketValue) {
                uniqueBucketNames.add(bucketValue)
            }
        })
    })

    if (uniqueBucketNames.size === 0) {
        throw new Error(`[confidence-risk] no rows found for selected scope: ${scope}.`)
    }

    const orderedBuckets = Array.from(uniqueBucketNames).sort(compareConfidenceBucketNames)

    return [
        { value: DEFAULT_CONFIDENCE_BUCKET, label: allBucketsLabel },
        ...orderedBuckets.map(bucket => ({ value: bucket, label: bucket }))
    ]
}

function resolveConfidenceBucketFromQueryOrThrow(raw: string | null, options: ConfidenceBucketOption[]): string {
    if (!raw) {
        return DEFAULT_CONFIDENCE_BUCKET
    }

    const normalized = raw.trim()
    const supported = options.some(option => option.value === normalized)
    if (!supported) {
        throw new Error(`[confidence-risk] invalid confidence bucket query value: ${raw}.`)
    }

    return normalized
}

function getTableTermOrThrow(title: string, tableTermMap: ReadonlyMap<string, ConfidenceRiskTerm>): ConfidenceRiskTerm {
    if (!title) {
        throw new Error('[confidence-risk] column title is empty.')
    }

    const term = tableTermMap.get(title)
    if (!term) {
        throw new Error(`[confidence-risk] unknown column term: ${title}`)
    }

    return term
}

function getConfigTermOrThrow(
    key: string,
    termsConfigMap: ReadonlyMap<string, ConfidenceRiskTerm>
): ConfidenceRiskTerm {
    if (!key) {
        throw new Error('[confidence-risk] config key is empty.')
    }

    const term = termsConfigMap.get(key)
    if (!term) {
        throw new Error(`[confidence-risk] unknown config key: ${key}`)
    }

    return term
}

function buildTableSections(sections: unknown[]): TableSectionDto[] {
    return (sections ?? []).filter(
        (section): section is TableSectionDto =>
            Array.isArray((section as TableSectionDto).columns) && (section as TableSectionDto).columns!.length > 0
    )
}

function buildKeyValueSections(sections: unknown[]): KeyValueSectionDto[] {
    return (sections ?? []).filter((section): section is KeyValueSectionDto =>
        Array.isArray((section as KeyValueSectionDto).items)
    )
}

export default function ConfidenceRiskPage({ className }: ConfidenceRiskPageProps) {
    const { t, i18n } = useTranslation('reports')
    const [searchParams, setSearchParams] = useSearchParams()
    const { data, isLoading, isError, error, refetch } = useBacktestConfidenceRiskReportQuery({
        scope: searchParams.get('scope'),
        confidenceBucket: searchParams.get('confBucket')
    })
    const {
        data: optionsData,
        isLoading: isOptionsLoading,
        isError: isOptionsError,
        error: optionsError
    } = useBacktestConfidenceRiskReportQuery({
        scope: searchParams.get('scope'),
        confidenceBucket: null
    })
    const termsLocale = useMemo(
        () => resolveConfidenceRiskUiLocale(i18n.resolvedLanguage ?? i18n.language),
        [i18n.language, i18n.resolvedLanguage]
    )

    const tableTerms = useMemo(
        () =>
            TERMS_TABLE_TEMPLATES.map(template => ({
                key: template.key,
                title: template.title,
                description: template.description[termsLocale],
                tooltip: template.tooltip[termsLocale]
            })),
        [termsLocale]
    )
    const tableTermMap = useMemo(() => new Map(tableTerms.map(term => [term.title, term])), [tableTerms])

    const configTerms = useMemo(
        () =>
            TERMS_CONFIG_TEMPLATES.map(template => ({
                key: template.key,
                title: template.title,
                description: template.description[termsLocale],
                tooltip: template.tooltip[termsLocale]
            })),
        [termsLocale]
    )
    const configTermsMap = useMemo(() => new Map(configTerms.map(term => [term.key, term])), [configTerms])

    const tableSections = useMemo(() => buildTableSections(data?.sections ?? []), [data])
    const optionsTableSections = useMemo(() => buildTableSections(optionsData?.sections ?? []), [optionsData])
    const keyValueSections = useMemo(() => buildKeyValueSections(data?.sections ?? []), [data])
    const scopeState = useMemo(() => {
        try {
            return {
                value: resolveConfidenceScopeFromQueryOrThrow(searchParams.get('scope')),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse confidence-risk scope query.')
            return {
                value: DEFAULT_CONFIDENCE_SCOPE,
                error: safeError
            }
        }
    }, [searchParams])
    const scopeMetaState = useMemo(() => {
        try {
            return {
                value: resolveCurrentPredictionTrainingScopeMeta(scopeState.value),
                error: null as Error | null
            }
        } catch (err) {
            const safeError =
                err instanceof Error ? err : new Error('Failed to resolve current prediction training scope metadata.')
            return {
                value: null,
                error: safeError
            }
        }
    }, [scopeState.value])

    const sourceEndpointState = useMemo(() => {
        try {
            return {
                value: resolveReportSourceEndpointOrThrow(),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to resolve report source endpoint.')
            return {
                value: null as string | null,
                error: safeError
            }
        }
    }, [])

    const confidenceBucketOptionsState = useMemo(() => {
        if (scopeState.error) {
            return {
                options: [] as ConfidenceBucketOption[],
                error: scopeState.error
            }
        }

        try {
            return {
                options: buildConfidenceBucketOptionsOrThrow(
                    optionsTableSections,
                    scopeState.value,
                    t('confidenceRisk.filters.allBuckets')
                ),
                error: null as Error | null
            }
        } catch (err) {
            const safeError =
                err instanceof Error ? err : new Error('Failed to build confidence bucket options for selected scope.')
            return {
                options: [] as ConfidenceBucketOption[],
                error: safeError
            }
        }
    }, [optionsTableSections, scopeState.error, scopeState.value, t])

    const confidenceBucketState = useMemo(() => {
        if (confidenceBucketOptionsState.error) {
            return {
                value: DEFAULT_CONFIDENCE_BUCKET,
                error: confidenceBucketOptionsState.error
            }
        }

        try {
            return {
                value: resolveConfidenceBucketFromQueryOrThrow(
                    searchParams.get('confBucket'),
                    confidenceBucketOptionsState.options
                ),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse confidence bucket query.')
            return {
                value: DEFAULT_CONFIDENCE_BUCKET,
                error: safeError
            }
        }
    }, [confidenceBucketOptionsState.error, confidenceBucketOptionsState.options, searchParams])

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
                getConfigTermOrThrow(item.key, configTermsMap)
            })

            return { section, error: null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to validate confidence risk config.')
            return { section: null as KeyValueSectionDto | null, error: safeError }
        }
    }, [configTermsMap, data, keyValueSections])

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
        const term = getTableTermOrThrow(title, tableTermMap)
        return renderTermTooltipTitle(title, term.tooltip)
    }

    const handleScopeChange = (next: CurrentPredictionTrainingScope) => {
        if (next === scopeState.value) return
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('scope', next)
        nextParams.set('confBucket', DEFAULT_CONFIDENCE_BUCKET)
        setSearchParams(nextParams, { replace: true })
    }

    const handleConfidenceBucketChange = (next: string) => {
        if (next === confidenceBucketState.value) return
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('confBucket', next)
        setSearchParams(nextParams, { replace: true })
    }

    const controlGroups = useMemo(() => {
        if (scopeMetaState.error || !scopeMetaState.value || confidenceBucketOptionsState.error) {
            return [] as ReportViewControlGroup[]
        }

        return [
            buildTrainingScopeControlGroup({
                value: scopeState.value,
                onChange: handleScopeChange
            }),
            buildConfidenceBucketControlGroup({
                value: confidenceBucketState.value,
                options: confidenceBucketOptionsState.options,
                onChange: handleConfidenceBucketChange
            })
        ] as ReportViewControlGroup[]
    }, [
        confidenceBucketOptionsState.error,
        confidenceBucketOptionsState.options,
        confidenceBucketState.value,
        scopeMetaState.error,
        scopeMetaState.value,
        scopeState.value
    ])

    let content: JSX.Element | null = null

    if (data && optionsData) {
        if (generatedAtState.error || !generatedAtState.value) {
            const err =
                generatedAtState.error ?? new Error('[confidence-risk] generatedAtUtc is missing after validation.')

            content = (
                <PageError
                    title={t('confidenceRisk.page.errors.invalidGeneratedAt.title')}
                    message={t('confidenceRisk.page.errors.invalidGeneratedAt.message')}
                    error={err}
                    onRetry={refetch}
                />
            )
        } else if (sourceEndpointState.error || !sourceEndpointState.value) {
            const err =
                sourceEndpointState.error ??
                new Error('[confidence-risk] report source endpoint is missing after validation.')

            content = (
                <PageError
                    title={t('confidenceRisk.page.errors.invalidSource.title')}
                    message={t('confidenceRisk.page.errors.invalidSource.message')}
                    error={err}
                    onRetry={refetch}
                />
            )
        } else if (scopeState.error) {
            content = (
                <PageError
                    title={t('confidenceRisk.page.errors.scopeQuery.title')}
                    message={t('confidenceRisk.page.errors.scopeQuery.message')}
                    error={scopeState.error}
                    onRetry={refetch}
                />
            )
        } else if (scopeMetaState.error || !scopeMetaState.value) {
            content = (
                <PageError
                    title={t('confidenceRisk.page.errors.scopeMeta.title')}
                    message={t('confidenceRisk.page.errors.scopeMeta.message')}
                    error={
                        scopeMetaState.error ??
                        new Error('[confidence-risk] scope metadata is missing after validation.')
                    }
                    onRetry={refetch}
                />
            )
        } else if (confidenceBucketOptionsState.error) {
            content = (
                <PageError
                    title={t('confidenceRisk.page.errors.bucketOptions.title')}
                    message={t('confidenceRisk.page.errors.bucketOptions.message')}
                    error={confidenceBucketOptionsState.error}
                    onRetry={refetch}
                />
            )
        } else if (confidenceBucketState.error) {
            content = (
                <PageError
                    title={t('confidenceRisk.page.errors.confBucketQuery.title')}
                    message={t('confidenceRisk.page.errors.confBucketQuery.message')}
                    error={confidenceBucketState.error}
                    onRetry={refetch}
                />
            )
        } else if (configState.error) {
            content = (
                <PageError
                    title={t('confidenceRisk.page.errors.config.title')}
                    message={t('confidenceRisk.page.errors.config.message')}
                    error={configState.error}
                    onRetry={refetch}
                />
            )
        } else if (tableSections.length === 0) {
            content = <Text>{t('confidenceRisk.page.emptyTable')}</Text>
        } else {
            content = (
                <div className={rootClassName}>
                    <header className={cls.hero}>
                        <div>
                            <Text type='h1' className={cls.heroTitle}>
                                {t('confidenceRisk.page.title')}
                            </Text>
                            <Text className={cls.heroSubtitle}>{t('confidenceRisk.page.subtitle')}</Text>

                            <ReportViewControls groups={controlGroups} />
                            <Text className={cls.scopeHint}>{scopeMetaState.value.hint}</Text>
                        </div>

                        <ReportActualStatusCard
                            statusMode='debug'
                            statusTitle={t('confidenceRisk.page.status.title')}
                            statusMessage={t('confidenceRisk.page.status.message')}
                            dataSource={sourceEndpointState.value!}
                            reportTitle={data.title}
                            reportId={data.id}
                            reportKind={data.kind}
                            generatedAtUtc={data.generatedAtUtc}
                        />
                    </header>

                    {configState.section && (
                        <section className={cls.configBlock}>
                            <div className={cls.configHeader}>
                                <Text type='h3' className={cls.configTitle}>
                                    {t('confidenceRisk.page.config.title')}
                                </Text>
                                <Text className={cls.configSubtitle}>{t('confidenceRisk.page.config.subtitle')}</Text>
                            </div>
                            <div className={cls.configGrid}>
                                {(configState.section.items ?? []).map(item => {
                                    const term = getConfigTermOrThrow(item.key, configTermsMap)
                                    return (
                                        <div key={item.key} className={cls.configItem}>
                                            <div className={cls.configKeyRow}>
                                                <TermTooltip
                                                    term={term.title}
                                                    description={enrichTermTooltipDescription(term.tooltip, {
                                                        term: term.title,
                                                        excludeTerms: [term.title],
                                                        excludeRuleTitles: [term.title]
                                                    })}
                                                    type='span'
                                                />
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
                        <ReportTableTermsBlock
                            terms={tableTerms}
                            subtitle={t('confidenceRisk.page.termsSubtitle')}
                            className={cls.termsBlock}
                        />

                        {tableSections.map((section, index) => {
                            const domId = `confidence-risk-${index + 1}`
                            const title =
                                section.title || t('confidenceRisk.page.tableTitleFallback', { index: index + 1 })

                            return (
                                <ReportTableCard
                                    key={`${section.title}-${index}`}
                                    title={title}
                                    description={t('confidenceRisk.page.tableDescription')}
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
            isLoading={isLoading || isOptionsLoading}
            isError={isError || isOptionsError}
            error={error ?? optionsError}
            hasData={Boolean(data && optionsData)}
            onRetry={refetch}
            errorTitle={t('confidenceRisk.page.errorTitle')}>
            {content}
        </PageDataBoundary>
    )
}
