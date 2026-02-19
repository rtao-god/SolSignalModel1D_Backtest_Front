import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import classNames from '@/shared/lib/helpers/classNames'
import {
    BucketFilterToggle,
    CurrentPredictionTrainingScopeToggle,
    ReportActualStatusCard,
    ReportTableTermsBlock,
    ReportViewControls,
    Text,
    TermTooltip,
    resolveCurrentPredictionTrainingScopeMeta
} from '@/shared/ui'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import type { KeyValueSectionDto, TableSectionDto } from '@/shared/types/report.types'
import { ReportTableCard } from '@/shared/ui/ReportTableCard'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import PageError from '@/shared/ui/errors/PageError/ui/PageError'
import { useBacktestConfidenceRiskReportQuery } from '@/shared/api/tanstackQueries/backtestConfidenceRisk'
import type { CurrentPredictionTrainingScope } from '@/shared/api/endpoints/reportEndpoints'
import {
    filterPolicyBranchMegaSectionsByBucketOrThrow,
    filterPolicyBranchMegaSectionsByMetricOrThrow,
    resolvePolicyBranchMegaBucketFromQuery,
    resolvePolicyBranchMegaMetricFromQuery,
    resolvePolicyBranchMegaTpSlModeFromQuery
} from '@/shared/utils/policyBranchMegaTabs'
import {
    DEFAULT_REPORT_BUCKET_MODE,
    DEFAULT_REPORT_METRIC_MODE,
    DEFAULT_REPORT_TP_SL_MODE,
    resolveReportViewCapabilities,
    validateReportViewSelectionOrThrow
} from '@/shared/utils/reportViewCapabilities'
import { resolveReportSourceEndpointOrThrow } from '@/shared/utils/reportSourceEndpoint'
import { applyReportTpSlModeToSectionsOrThrow } from '@/shared/utils/reportTpSlMode'
import type { BucketFilterOption } from '@/shared/ui/BucketFilterToggle'
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
            'Срез данных: FULL — вся история, TRAIN — обучающая часть, OOS — out‑of‑sample, RECENT — хвост последних дней. Это нужно, чтобы видеть стабильность правил на новых данных и на свежем хвосте.',
        tooltip: 'Срез данных (FULL/TRAIN/OOS/RECENT).'
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

const CONFIDENCE_SCOPE_TO_SPLIT: Record<CurrentPredictionTrainingScope, string> = {
    full: 'FULL',
    train: 'TRAIN',
    oos: 'OOS',
    recent: 'RECENT'
}

const DEFAULT_CONFIDENCE_SCOPE: CurrentPredictionTrainingScope = 'full'
const DEFAULT_CONFIDENCE_BUCKET = 'all'

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
    scope: CurrentPredictionTrainingScope
): BucketFilterOption[] {
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
        { value: DEFAULT_CONFIDENCE_BUCKET, label: 'Все бакеты' },
        ...orderedBuckets.map(bucket => ({ value: bucket, label: bucket }))
    ]
}

function resolveConfidenceBucketFromQueryOrThrow(raw: string | null, options: BucketFilterOption[]): string {
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

function filterConfidenceRowsByScopeAndBucketOrThrow(
    sections: TableSectionDto[],
    scope: CurrentPredictionTrainingScope,
    bucket: string
): TableSectionDto[] {
    if (!Array.isArray(sections) || sections.length === 0) {
        throw new Error('[confidence-risk] table sections are missing for scope filtering.')
    }

    const splitLabel = CONFIDENCE_SCOPE_TO_SPLIT[scope]

    const filtered = sections.map(section => {
        if (!Array.isArray(section.columns) || !Array.isArray(section.rows)) {
            throw new Error('[confidence-risk] invalid table section while filtering by scope.')
        }

        const splitIndex = findColumnIndexByTitleOrThrow(section.columns, 'Split')
        const bucketIndex = findColumnIndexByTitleOrThrow(section.columns, 'Bucket')

        const rows = section.rows.filter((row, rowIndex) => {
            if (!Array.isArray(row)) {
                throw new Error(`[confidence-risk] row is not an array while filtering. rowIndex=${rowIndex}.`)
            }

            const splitValue = row[splitIndex]?.trim().toUpperCase()
            const bucketValue = row[bucketIndex]?.trim()

            if (splitValue !== splitLabel) {
                return false
            }

            if (bucket === DEFAULT_CONFIDENCE_BUCKET) {
                return true
            }

            return bucketValue === bucket
        })

        return {
            ...section,
            rows
        }
    })

    const rowsCount = filtered.reduce((sum, section) => sum + (section.rows?.length ?? 0), 0)
    if (rowsCount === 0) {
        throw new Error(
            `[confidence-risk] no rows found after scope/bucket filtering. scope=${scope}, bucket=${bucket}.`
        )
    }

    return filtered
}

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
    const [searchParams, setSearchParams] = useSearchParams()

    const tableSections = useMemo(() => buildTableSections(data?.sections ?? []), [data])
    const keyValueSections = useMemo(() => buildKeyValueSections(data?.sections ?? []), [data])
    const viewCapabilities = useMemo(() => resolveReportViewCapabilities(tableSections), [tableSections])
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
                err instanceof Error
                    ? err
                    : new Error('Failed to resolve current prediction training scope metadata.')
            return {
                value: null,
                error: safeError
            }
        }
    }, [scopeState.value])

    const bucketState = useMemo(() => {
        try {
            const bucket = resolvePolicyBranchMegaBucketFromQuery(searchParams.get('bucket'), DEFAULT_REPORT_BUCKET_MODE)
            return { value: bucket, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse confidence-risk bucket query.')
            return { value: DEFAULT_REPORT_BUCKET_MODE, error: safeError }
        }
    }, [searchParams])

    const metricState = useMemo(() => {
        try {
            const metric = resolvePolicyBranchMegaMetricFromQuery(searchParams.get('metric'), DEFAULT_REPORT_METRIC_MODE)
            return { value: metric, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse confidence-risk metric query.')
            return { value: DEFAULT_REPORT_METRIC_MODE, error: safeError }
        }
    }, [searchParams])

    const tpSlState = useMemo(() => {
        try {
            const mode = resolvePolicyBranchMegaTpSlModeFromQuery(searchParams.get('tpsl'), DEFAULT_REPORT_TP_SL_MODE)
            return { value: mode, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse confidence-risk tpsl query.')
            return { value: DEFAULT_REPORT_TP_SL_MODE, error: safeError }
        }
    }, [searchParams])

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

    const viewSelectionState = useMemo(() => {
        try {
            validateReportViewSelectionOrThrow(
                {
                    bucket: bucketState.value,
                    metric: metricState.value,
                    tpSl: tpSlState.value
                },
                viewCapabilities,
                'confidence-risk'
            )
            return { error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to validate confidence-risk view state.')
            return { error: safeError }
        }
    }, [bucketState.value, metricState.value, tpSlState.value, viewCapabilities])

    const filteredTableSectionsState = useMemo(() => {
        if (viewSelectionState.error) {
            return { sections: [] as TableSectionDto[], error: viewSelectionState.error }
        }

        try {
            let nextSections = tableSections

            if (viewCapabilities.supportsBucketFiltering) {
                nextSections = filterPolicyBranchMegaSectionsByBucketOrThrow(nextSections, bucketState.value)
            }

            if (viewCapabilities.supportsMetricFiltering) {
                nextSections = filterPolicyBranchMegaSectionsByMetricOrThrow(nextSections, metricState.value)
            }

            if (viewCapabilities.supportsTpSlFiltering) {
                nextSections = applyReportTpSlModeToSectionsOrThrow(
                    nextSections,
                    tpSlState.value,
                    'confidence-risk'
                )
            }

            return { sections: nextSections, error: null as Error | null }
        } catch (err) {
            const safeError =
                err instanceof Error ? err : new Error('Failed to filter confidence-risk sections by bucket/metric.')
            return { sections: [] as TableSectionDto[], error: safeError }
        }
    }, [bucketState.value, metricState.value, tableSections, tpSlState.value, viewCapabilities, viewSelectionState.error])

    const confidenceBucketOptionsState = useMemo(() => {
        if (scopeState.error) {
            return {
                options: [] as BucketFilterOption[],
                error: scopeState.error
            }
        }

        if (filteredTableSectionsState.error) {
            return {
                options: [] as BucketFilterOption[],
                error: filteredTableSectionsState.error
            }
        }

        try {
            return {
                options: buildConfidenceBucketOptionsOrThrow(filteredTableSectionsState.sections, scopeState.value),
                error: null as Error | null
            }
        } catch (err) {
            const safeError =
                err instanceof Error ? err : new Error('Failed to build confidence bucket options for selected scope.')
            return {
                options: [] as BucketFilterOption[],
                error: safeError
            }
        }
    }, [filteredTableSectionsState.error, filteredTableSectionsState.sections, scopeState.error, scopeState.value])

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

    const scopeFilteredTableSectionsState = useMemo(() => {
        if (filteredTableSectionsState.error) {
            return {
                sections: [] as TableSectionDto[],
                error: filteredTableSectionsState.error
            }
        }

        if (scopeState.error) {
            return {
                sections: [] as TableSectionDto[],
                error: scopeState.error
            }
        }

        if (confidenceBucketState.error) {
            return {
                sections: [] as TableSectionDto[],
                error: confidenceBucketState.error
            }
        }

        try {
            return {
                sections: filterConfidenceRowsByScopeAndBucketOrThrow(
                    filteredTableSectionsState.sections,
                    scopeState.value,
                    confidenceBucketState.value
                ),
                error: null as Error | null
            }
        } catch (err) {
            const safeError =
                err instanceof Error ? err : new Error('Failed to filter confidence-risk rows by scope and bucket.')
            return {
                sections: [] as TableSectionDto[],
                error: safeError
            }
        }
    }, [
        confidenceBucketState.error,
        confidenceBucketState.value,
        filteredTableSectionsState.error,
        filteredTableSectionsState.sections,
        scopeState.error,
        scopeState.value
    ])

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

    const handleBucketChange = (next: typeof bucketState.value) => {
        if (next === bucketState.value) return
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('bucket', next)
        setSearchParams(nextParams, { replace: true })
    }

    const handleMetricChange = (next: typeof metricState.value) => {
        if (next === metricState.value) return
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('metric', next)
        setSearchParams(nextParams, { replace: true })
    }

    const handleTpSlModeChange = (next: typeof tpSlState.value) => {
        if (next === tpSlState.value) return
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('tpsl', next)
        setSearchParams(nextParams, { replace: true })
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
        } else if (sourceEndpointState.error || !sourceEndpointState.value) {
            const err =
                sourceEndpointState.error ??
                new Error('[confidence-risk] report source endpoint is missing after validation.')

            content = (
                <PageError
                    title='Confidence risk report source is invalid'
                    message='API source endpoint is missing or invalid. Проверь VITE_API_BASE_URL / VITE_DEV_API_PROXY_TARGET.'
                    error={err}
                    onRetry={refetch}
                />
            )
        } else if (bucketState.error) {
            content = (
                <PageError
                    title='Confidence risk bucket query is invalid'
                    message='Query parameter \"bucket\" is invalid. Expected daily, intraday, delayed, or total.'
                    error={bucketState.error}
                    onRetry={refetch}
                />
            )
        } else if (metricState.error) {
            content = (
                <PageError
                    title='Confidence risk metric query is invalid'
                    message='Query parameter \"metric\" is invalid. Expected real or no-biggest-liq-loss.'
                    error={metricState.error}
                    onRetry={refetch}
                />
            )
        } else if (tpSlState.error) {
            content = (
                <PageError
                    title='Confidence risk TP/SL query is invalid'
                    message='Query parameter \"tpsl\" is invalid. Expected all, dynamic, or static.'
                    error={tpSlState.error}
                    onRetry={refetch}
                />
            )
        } else if (viewSelectionState.error) {
            content = (
                <PageError
                    title='Confidence risk view mode is unsupported for this report'
                    message='Выбранный bucket/metric/tpsl режим не поддерживается структурой текущего отчёта.'
                    error={viewSelectionState.error}
                    onRetry={refetch}
                />
            )
        } else if (filteredTableSectionsState.error) {
            content = (
                <PageError
                    title='Confidence risk sections are missing'
                    message='Report sections for the selected bucket/metric were not found or are tagged inconsistently.'
                    error={filteredTableSectionsState.error}
                    onRetry={refetch}
                />
            )
        } else if (scopeState.error) {
            content = (
                <PageError
                    title='Confidence risk scope query is invalid'
                    message='Query parameter \"scope\" is invalid. Expected full, train, oos, or recent.'
                    error={scopeState.error}
                    onRetry={refetch}
                />
            )
        } else if (scopeMetaState.error || !scopeMetaState.value) {
            content = (
                <PageError
                    title='Confidence risk scope metadata is invalid'
                    message='Не удалось определить метаданные выбранного scope-режима.'
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
                    title='Confidence risk bucket options are missing'
                    message='Для выбранного scope не удалось построить список confidence-бакетов.'
                    error={confidenceBucketOptionsState.error}
                    onRetry={refetch}
                />
            )
        } else if (confidenceBucketState.error) {
            content = (
                <PageError
                    title='Confidence risk confidence-bucket query is invalid'
                    message='Query parameter \"confBucket\" is invalid for selected scope.'
                    error={confidenceBucketState.error}
                    onRetry={refetch}
                />
            )
        } else if (scopeFilteredTableSectionsState.error) {
            content = (
                <PageError
                    title='Confidence risk scope filtering failed'
                    message='Не удалось применить фильтр scope/confidence-bucket к таблице отчёта.'
                    error={scopeFilteredTableSectionsState.error}
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
        } else if (scopeFilteredTableSectionsState.sections.length === 0) {
            content = <Text>Таблица уверенности пустая. Проверь генерацию отчёта на бэкенде.</Text>
        } else {
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

                            <ReportViewControls
                                bucket={bucketState.value}
                                metric={metricState.value}
                                tpSlMode={tpSlState.value}
                                capabilities={viewCapabilities}
                                onBucketChange={handleBucketChange}
                                onMetricChange={handleMetricChange}
                                onTpSlModeChange={handleTpSlModeChange}
                            />

                            <div className={cls.scopeControls}>
                                <div className={cls.scopeControlBlock}>
                                    <Text className={cls.scopeControlLabel}>Срез данных:</Text>
                                    <CurrentPredictionTrainingScopeToggle
                                        value={scopeState.value}
                                        onChange={handleScopeChange}
                                        className={cls.scopeToggle}
                                        ariaLabel='Срез confidence-risk: full/train/oos/recent'
                                    />
                                    <Text className={cls.scopeHint}>{scopeMetaState.value.hint}</Text>
                                </div>
                                <div className={cls.scopeControlBlock}>
                                    <Text className={cls.scopeControlLabel}>Бакет confidence:</Text>
                                    <BucketFilterToggle
                                        value={confidenceBucketState.value}
                                        options={confidenceBucketOptionsState.options}
                                        onChange={handleConfidenceBucketChange}
                                        className={cls.scopeBucketToggle}
                                        ariaLabel='Фильтр confidence-бакета для выбранного scope'
                                    />
                                </div>
                            </div>
                        </div>

                        <ReportActualStatusCard
                            statusMode='debug'
                            statusTitle='DEBUG: freshness not verified'
                            statusMessage='Status endpoint для backtest_confidence_risk не настроен: показываются metadata отчёта без freshness-проверки.'
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
                        <ReportTableTermsBlock
                            terms={TERMS_TABLE}
                            subtitle='Объяснения всех показателей, которые используются в таблице уверенности.'
                            className={cls.termsBlock}
                        />

                        {scopeFilteredTableSectionsState.sections.map((section, index) => {
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
