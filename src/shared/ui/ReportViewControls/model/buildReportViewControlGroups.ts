import type { CurrentPredictionTrainingScope } from '@/shared/api/endpoints/reportEndpoints'
import {
    BUCKET_DESCRIPTION,
    CONF_BUCKET_DESCRIPTION,
    METRIC_VIEW_DESCRIPTION,
    SL_MODE_TERM_DESCRIPTION,
    TP_SL_MODE_DESCRIPTION,
    ZONAL_MODE_DESCRIPTION
} from '@/shared/consts/tooltipDomainTerms'
import type {
    PolicyBranchMegaBucketMode,
    PolicyBranchMegaMetricMode,
    PolicyBranchMegaSlMode,
    PolicyBranchMegaTpSlMode,
    PolicyBranchMegaZonalMode
} from '@/shared/utils/policyBranchMegaTabs'
import { resolveCurrentPredictionTrainingScopeMeta } from './currentPredictionTrainingScopeMeta'
import type { ReportViewControlGroup } from '../ui/ReportViewControls'

export type ModelStatsSegmentControlValue = 'OOS' | 'RECENT' | 'TRAIN' | 'FULL'
export type BusinessTechnicalViewControlValue = 'business' | 'technical'
export type ModelStatsViewControlValue = BusinessTechnicalViewControlValue

interface BuildMegaBucketControlGroupArgs {
    value: PolicyBranchMegaBucketMode
    onChange: (next: PolicyBranchMegaBucketMode) => void
}

interface BuildMegaMetricControlGroupArgs {
    value: PolicyBranchMegaMetricMode
    onChange: (next: PolicyBranchMegaMetricMode) => void
}

interface BuildMegaTpSlControlGroupArgs {
    value: PolicyBranchMegaTpSlMode
    onChange: (next: PolicyBranchMegaTpSlMode) => void
    label?: string
    ariaLabel?: string
    infoTooltip?: string
}

interface BuildMegaSlModeControlGroupArgs {
    value: PolicyBranchMegaSlMode
    onChange: (next: PolicyBranchMegaSlMode) => void
}

interface BuildMegaZonalControlGroupArgs {
    value: PolicyBranchMegaZonalMode
    onChange: (next: PolicyBranchMegaZonalMode) => void
    label?: string
}

interface BuildModelStatsSegmentControlGroupArgs {
    value: ModelStatsSegmentControlValue
    onChange: (next: ModelStatsSegmentControlValue) => void
}

interface BuildModelStatsViewControlGroupArgs {
    value: ModelStatsViewControlValue
    onChange: (next: ModelStatsViewControlValue) => void
}

interface BuildBusinessTechnicalViewControlGroupArgs {
    value: BusinessTechnicalViewControlValue
    onChange: (next: BusinessTechnicalViewControlValue) => void
    label?: string
    ariaLabel?: string
    infoTooltip?: string
    labels?: {
        business: string
        technical: string
    }
}

interface BuildTrainingScopeControlGroupArgs {
    value: CurrentPredictionTrainingScope
    onChange: (next: CurrentPredictionTrainingScope) => void
    label?: string
    ariaLabel?: string
    infoTooltip?: string
}

interface BuildConfidenceBucketControlGroupArgs {
    value: string
    options: readonly { value: string; label: string }[]
    onChange: (next: string) => void
}

interface BuildPredictionHistoryWindowControlGroupArgs<TValue extends string> {
    value: TValue
    options: readonly { value: TValue; label: string }[]
    onChange: (next: TValue) => void
    label?: string
    ariaLabel?: string
}

interface BuildPredictionPolicyBucketControlGroupArgs {
    value: PolicyBranchMegaBucketMode
    onChange: (next: PolicyBranchMegaBucketMode) => void
    label?: string
    ariaLabel?: string
}

export function buildMegaBucketControlGroup({
    value,
    onChange
}: BuildMegaBucketControlGroupArgs): ReportViewControlGroup<PolicyBranchMegaBucketMode> {
    return {
        key: 'mega-bucket',
        label: 'Бакет капитала',
        infoTooltip: BUCKET_DESCRIPTION,
        value,
        options: [
            { value: 'daily', label: 'Daily' },
            { value: 'intraday', label: 'Intraday' },
            { value: 'delayed', label: 'Delayed' },
            { value: 'total', label: 'Σ Все бакеты' }
        ],
        onChange
    }
}

export function buildMegaMetricControlGroup({
    value,
    onChange
}: BuildMegaMetricControlGroupArgs): ReportViewControlGroup<PolicyBranchMegaMetricMode> {
    return {
        key: 'mega-metric',
        label: 'Режим метрик',
        infoTooltip: METRIC_VIEW_DESCRIPTION,
        value,
        options: [
            { value: 'real', label: 'REAL' },
            { value: 'no-biggest-liq-loss', label: 'NO BIGGEST LIQ LOSS' }
        ],
        onChange
    }
}

export function buildMegaTpSlControlGroup({
    value,
    onChange,
    label = 'Dynamic-risk режим',
    ariaLabel,
    infoTooltip = TP_SL_MODE_DESCRIPTION
}: BuildMegaTpSlControlGroupArgs): ReportViewControlGroup<PolicyBranchMegaTpSlMode> {
    return {
        key: 'mega-tpsl',
        label,
        ariaLabel,
        infoTooltip,
        value,
        options: [
            { value: 'all', label: 'ALL' },
            { value: 'dynamic', label: 'DYNAMIC RISK' },
            { value: 'static', label: 'STATIC BASE' }
        ],
        onChange
    }
}

export function buildMegaSlModeControlGroup({
    value,
    onChange
}: BuildMegaSlModeControlGroupArgs): ReportViewControlGroup<PolicyBranchMegaSlMode> {
    return {
        key: 'mega-slmode',
        label: 'SL-режим',
        infoTooltip: SL_MODE_TERM_DESCRIPTION,
        value,
        options: [
            { value: 'all', label: 'ALL' },
            { value: 'with-sl', label: 'WITH SL' },
            { value: 'no-sl', label: 'NO SL' }
        ],
        onChange
    }
}

export function buildMegaZonalControlGroup({
    value,
    onChange,
    label = 'Зональный риск'
}: BuildMegaZonalControlGroupArgs): ReportViewControlGroup<PolicyBranchMegaZonalMode> {
    return {
        key: 'mega-zonal',
        label,
        infoTooltip: ZONAL_MODE_DESCRIPTION,
        value,
        options: [
            { value: 'with-zonal', label: 'С зональностью' },
            { value: 'without-zonal', label: 'Без зональности' }
        ],
        onChange
    }
}

export function buildModelStatsSegmentControlGroup({
    value,
    onChange
}: BuildModelStatsSegmentControlGroupArgs): ReportViewControlGroup<ModelStatsSegmentControlValue> {
    return {
        key: 'model-stats-segment',
        label: 'Сегмент данных',
        infoTooltip:
            'Что это: выбор server-side сегмента отчёта по истории модели. Как работает в движке: backend возвращает только один сегмент OOS, RECENT, TRAIN или FULL. Какие числа меняются: состав моделей, sample counts и метрики внутри таблиц. Зачем сравнивать: видно, где качество держится на новых данных, а где остаётся только на обучении.',
        value,
        options: [
            { value: 'OOS', label: 'OOS' },
            { value: 'RECENT', label: 'RECENT' },
            { value: 'TRAIN', label: 'TRAIN' },
            { value: 'FULL', label: 'FULL' }
        ],
        onChange
    }
}

export function buildModelStatsViewControlGroup({
    value,
    onChange
}: BuildModelStatsViewControlGroupArgs): ReportViewControlGroup<ModelStatsViewControlValue> {
    return buildBusinessTechnicalViewControlGroup({
        value,
        onChange,
        label: 'Режим представления',
        infoTooltip:
            'Что это: уровень детализации model-stats. Как работает в движке: backend возвращает либо business, либо technical набор секций. Какие числа меняются: состав таблиц и колонок в документе, а не только их видимость. Зачем сравнивать: business режим нужен для чтения результата, technical режим для разбора диагностических деталей модели.',
        labels: {
            business: 'BUSINESS',
            technical: 'TECHNICAL'
        }
    })
}

export function buildBusinessTechnicalViewControlGroup({
    value,
    onChange,
    label = 'Режим представления',
    ariaLabel,
    infoTooltip,
    labels = {
        business: 'Business',
        technical: 'Technical'
    }
}: BuildBusinessTechnicalViewControlGroupArgs): ReportViewControlGroup<BusinessTechnicalViewControlValue> {
    return {
        key: 'business-technical-view',
        label,
        ariaLabel,
        infoTooltip,
        value,
        options: [
            { value: 'business', label: labels.business },
            { value: 'technical', label: labels.technical }
        ],
        onChange
    }
}

export function buildTrainingScopeControlGroup({
    value,
    onChange,
    label = 'Срез данных',
    ariaLabel,
    infoTooltip =
        'Что это: выбор split истории для confidence-risk. Как работает в движке: backend пересчитывает таблицу только для выбранного Full, Train, OOS или Recent среза. Какие числа меняются: Days, TradeDays, WinRate, TP/SL reach и MFE/MAE по выбранному split. Зачем сравнивать: видно, держится ли зависимость качества от confidence на свежих и unseen данных.'
}: BuildTrainingScopeControlGroupArgs): ReportViewControlGroup<CurrentPredictionTrainingScope> {
    return {
        key: 'training-scope',
        label,
        ariaLabel,
        infoTooltip,
        value,
        options: [
            { value: 'full', label: resolveCurrentPredictionTrainingScopeMeta('full').label },
            { value: 'train', label: resolveCurrentPredictionTrainingScopeMeta('train').label },
            { value: 'oos', label: resolveCurrentPredictionTrainingScopeMeta('oos').label },
            { value: 'recent', label: resolveCurrentPredictionTrainingScopeMeta('recent').label }
        ],
        onChange
    }
}

export function buildPredictionHistoryWindowControlGroup<TValue extends string>({
    value,
    options,
    onChange,
    label = 'Окно истории',
    ariaLabel
}: BuildPredictionHistoryWindowControlGroupArgs<TValue>): ReportViewControlGroup<TValue> {
    return {
        key: 'prediction-history-window',
        label,
        ariaLabel,
        infoTooltip:
            'Что это: диапазон уже построенной history-ленты current prediction. Как работает в движке: backend по-прежнему отдаёт index built-снимков, а frontend режет только видимый диапазон дат на 1 год, 2 года или всю историю без пересчёта самих report snapshots. Какие числа меняются: total visible cards, pagination, currently visible count и набор загружаемых дат в списке. Зачем сравнивать: можно быстро перейти от свежего хвоста к длинной истории и проверить, где именно менялось поведение прогнозов.',
        value,
        options: options.map(option => ({
            value: option.value,
            label: option.label
        })),
        onChange
    }
}

export function buildPredictionPolicyBucketControlGroup({
    value,
    onChange,
    label = 'Бакет сделок',
    ariaLabel
}: BuildPredictionPolicyBucketControlGroupArgs): ReportViewControlGroup<PolicyBranchMegaBucketMode> {
    return {
        key: 'prediction-policy-bucket',
        label,
        ariaLabel,
        infoTooltip:
            'Что это: выбор bucket внутри leverage-policies таблицы в карточке дня. Как работает в движке: backend уже присылает строки по daily, intraday и delayed бакетам, а переключатель на странице только выбирает, какой bucket показать в executed и skipped секциях для текущего отчёта. Какие числа меняются: набор строк сделок, skipped signals и summary причин пропуска по выбранному bucket. Зачем сравнивать: видно, в каком bucket политика реально открыла позицию, а где сигнал был отфильтрован или не дошёл до входа.',
        value,
        options: [
            { value: 'daily', label: 'Daily' },
            { value: 'intraday', label: 'Intraday' },
            { value: 'delayed', label: 'Delayed' },
            { value: 'total', label: 'Σ Все бакеты' }
        ],
        onChange
    }
}

export function buildConfidenceBucketControlGroup({
    value,
    options,
    onChange
}: BuildConfidenceBucketControlGroupArgs): ReportViewControlGroup<string> {
    return {
        key: 'confidence-bucket',
        label: 'Confidence-bucket',
        infoTooltip: CONF_BUCKET_DESCRIPTION,
        value,
        options: options.map(option => ({
            value: option.value,
            label: option.label
        })),
        onChange
    }
}
