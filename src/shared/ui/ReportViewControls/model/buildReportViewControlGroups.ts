import type { CurrentPredictionTrainingScope } from '@/shared/api/endpoints/reportEndpoints'
import type { CurrentPredictionBackfilledSplitStats } from '@/shared/api/tanstackQueries/currentPrediction'
import {
    BUCKET_DESCRIPTION,
    CONF_BUCKET_DESCRIPTION,
    DAILY_BUCKET_DESCRIPTION,
    DELAYED_BUCKET_DESCRIPTION,
    INTRADAY_BUCKET_DESCRIPTION,
    METRIC_VIEW_DESCRIPTION,
    SL_MODE_TERM_DESCRIPTION,
    TP_SL_MODE_DESCRIPTION,
    ZONAL_MODE_DESCRIPTION
} from '@/shared/consts/tooltipDomainTerms'
import type {
    PolicyBranchMegaBucketMode,
    PolicyBranchMegaTotalBucketView,
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

interface BuildMegaTotalBucketViewControlGroupArgs {
    value: PolicyBranchMegaTotalBucketView
    onChange: (next: PolicyBranchMegaTotalBucketView) => void
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
    splitStats?: CurrentPredictionBackfilledSplitStats | null
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

const PREDICTION_HISTORY_BUCKET_TOTAL_DESCRIPTION =
    'Σ Все бакеты — режим просмотра всех сделок из daily, intraday и delayed одновременно.\n\nКак работает:\nв таблицу попадают все строки трёх бакетов без объединения их в новый отдельный контур.\n\nЧто важно:\nэто не отдельный четвёртый бакет и не новая симуляция. Страница просто показывает все уже построенные строки вместе, чтобы можно было быстро сравнить, где сигнал реально дошёл до сделки, а где остался без исполнения.'

const PREDICTION_HISTORY_BUCKET_CONTEXT_DESCRIPTION =
    'На этой странице:\nпереключатель не пересчитывает прогноз и не меняет секции current prediction выше.\n\nОн только меняет, из какого bucket показываются строки в таблицах исполненных и пропущенных сигналов.'

const PREDICTION_HISTORY_BUCKET_FILTER_DESCRIPTION = `${BUCKET_DESCRIPTION}\n\n${PREDICTION_HISTORY_BUCKET_CONTEXT_DESCRIPTION}\n\n${DAILY_BUCKET_DESCRIPTION}\n\n${INTRADAY_BUCKET_DESCRIPTION}\n\n${DELAYED_BUCKET_DESCRIPTION}\n\n${PREDICTION_HISTORY_BUCKET_TOTAL_DESCRIPTION}\n\nКак читать:\nесли строка есть только в одном bucket, значит именно этот механизм исполнения реально довёл сигнал до сделки.`

const TRAINING_SCOPE_FULL_DESCRIPTION =
    'Полная история — самый широкий срез данных для этой версии модели.\n\nВ него попадают и обучающая часть истории, и более новые дни после train-границы.\n\nЭтот режим нужен, когда важно увидеть общую историческую устойчивость модели на длинной дистанции, а не только качество на одном участке.\n\nКак читать:\nхороший результат здесь полезен как общий фон, но его нельзя оценивать отдельно от OOS и от свежего хвоста, потому что старые режимы могут сглаживать текущие проблемы.'

const TRAINING_SCOPE_RECENT_DESCRIPTION =
    'Хвост истории — только самый свежий участок истории, который считается актуальным для текущего рынка. В текущем контракте это последние 240 торговых дней рабочего ряда модели.\n\nСюда попадает не весь OOS-период, а только его последняя часть, максимально близкая к сегодняшнему режиму рынка.\n\nЭтот режим нужен, когда важнее понять, как модель работает сейчас, а не как она выглядела в среднем по всему новому периоду.\n\nКак читать:\nесли Full и OOS выглядят терпимо, а хвост истории резко хуже, это ранний сигнал, что модель уже начала терять актуальность.'

function formatTrainingScopeDayCount(value: number): string {
    if (!Number.isInteger(value) || value <= 0) {
        throw new Error(`[training-scope] day count must be a positive integer. value=${value}.`)
    }

    return new Intl.NumberFormat('ru-RU').format(value)
}

function formatTrainingScopeShare(value: number): string {
    if (!Number.isFinite(value) || value <= 0 || value >= 1) {
        throw new Error(`[training-scope] share must be within (0, 1). value=${value}.`)
    }

    return new Intl.NumberFormat('ru-RU', {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    }).format(value * 100)
}

function buildTrainingScopeSplitSummary(splitStats: CurrentPredictionBackfilledSplitStats): string {
    return `Фактическая split-структура текущего архива: Train = ${formatTrainingScopeDayCount(splitStats.trainDays)} из ${formatTrainingScopeDayCount(splitStats.totalDays)} дней (${formatTrainingScopeShare(splitStats.trainShare)}%), OOS = ${formatTrainingScopeDayCount(splitStats.oosDays)} из ${formatTrainingScopeDayCount(splitStats.totalDays)} дней (${formatTrainingScopeShare(splitStats.oosShare)}%).\n\nТекущая [[split-boundaries|split-граница]] проходит так: Train <= ${splitStats.lastTrainDateUtc}, OOS >= ${splitStats.firstOosDateUtc}.`
}

function buildTrainingScopeTrainDescription(splitStats?: CurrentPredictionBackfilledSplitStats | null): string {
    const splitSummary = splitStats ? `\n\n${buildTrainingScopeSplitSummary(splitStats)}` : ''

    return `Train-only — только дни до [[split-boundaries|split-границы]], то есть до начала [[oos-segment|OOS]]-участка.\n\nЭтот режим использует только train-дни, на которых модель и обучалась. Поэтому такой срез полезен как внутренний ориентир качества обучения, но не как честная проверка на новых днях: для каждого train-дня причина «модель уже видела этот день на обучении» здесь не снята.\n\nЭто не доказывает автоматически любую возможную утечку, но именно самый прямой источник самооценки на знакомых примерах в Train-only остаётся.${splitSummary}\n\nКак читать:\nTrain-only нужен для контроля того, собрала ли модель рабочий паттерн на знакомой истории. Главная проверка всегда идёт через сравнение с OOS-only.`
}

function buildTrainingScopeOosDescription(splitStats?: CurrentPredictionBackfilledSplitStats | null): string {
    const splitSummary = splitStats ? `\n\n${buildTrainingScopeSplitSummary(splitStats)}` : ''

    return `OOS-only — только дни после [[split-boundaries|split-границы]].\n\nЗдесь модель не обучалась на самих этих днях внутри выбранного scope, поэтому причина «модель уже видела именно этот день на обучении» убрана.\n\nЭто не гарантирует отсутствие других утечек или идеальную переносимость, но именно эта самая грубая причина завышенной самооценки здесь снимается.${splitSummary}\n\nКак читать:\nэто основной срез для сравнения с Train-only. Если OOS-only заметно слабее, модель выглядит лучше на знакомой истории, чем на новых днях.`
}

function buildTrainingScopeOverviewDescription(splitStats?: CurrentPredictionBackfilledSplitStats | null): string {
    return `Режим обучения — выбор того, на каком историческом срезе собрана текущая версия модели и какой участок истории сейчас показывается на странице.\n\n${TRAINING_SCOPE_FULL_DESCRIPTION}\n\n${buildTrainingScopeTrainDescription(splitStats)}\n\n${buildTrainingScopeOosDescription(splitStats)}\n\n${TRAINING_SCOPE_RECENT_DESCRIPTION}`
}

export function buildCurrentPredictionLiveTrainingScopeDescription(
    splitStats?: CurrentPredictionBackfilledSplitStats | null
): string {
    return `${buildTrainingScopeOverviewDescription(splitStats)}\n\nНа этой странице:\nпри переключении загружается другая версия live-отчёта, поэтому меняются направление, вероятности, уверенность модели, статус и торговые блоки по политикам.`
}

export function buildCurrentPredictionHistoryTrainingScopeDescription(
    splitStats?: CurrentPredictionBackfilledSplitStats | null
): string {
    return `${buildTrainingScopeOverviewDescription(splitStats)}\n\nНа этой странице:\nпри переключении меняются доступные даты, подпись обучающего окна, карточки прогнозов за день и торговые блоки внутри них.`
}

export const CURRENT_PREDICTION_LIVE_TRAINING_SCOPE_DESCRIPTION = buildCurrentPredictionLiveTrainingScopeDescription()

export const CURRENT_PREDICTION_HISTORY_TRAINING_SCOPE_DESCRIPTION =
    buildCurrentPredictionHistoryTrainingScopeDescription()

function buildTrainingScopeTooltipByValue(
    splitStats?: CurrentPredictionBackfilledSplitStats | null
): Record<CurrentPredictionTrainingScope, string> {
    return {
        full: TRAINING_SCOPE_FULL_DESCRIPTION,
        train: buildTrainingScopeTrainDescription(splitStats),
        oos: buildTrainingScopeOosDescription(splitStats),
        recent: TRAINING_SCOPE_RECENT_DESCRIPTION
    }
}

const MEGA_TOTAL_BUCKET_VIEW_DESCRIPTION =
    'Режим показа всех бакетов — выбор того, как читать набор daily, intraday и delayed при `Σ Все бакеты`.\n\nС агрегацией: backend возвращает отдельный total-aggregate срез, где числа уже пересчитаны как общий результат по всем бакетам.\n\nБез агрегации: страница показывает реальные daily, intraday и delayed секции рядом друг с другом без пересчёта в новый synthetic bucket.\n\nКак читать:\nагрегация нужна для общего итога, раздельный режим — для сравнения, какой бакет дал результат сам по себе.'

const PREDICTION_HISTORY_WINDOW_ONE_YEAR_DESCRIPTION =
    '1 год — показывает только последний год history-ленты.\n\nЭтот режим нужен, когда важнее быстро проверить самое свежее поведение прогнозов, а не читать весь архив целиком.\n\nЧисла выше по странице не пересчитываются: меняется только видимый диапазон дат и карточек.'

const PREDICTION_HISTORY_WINDOW_TWO_YEARS_DESCRIPTION =
    '2 года — показывает последние два года history-ленты.\n\nЭто компромисс между свежестью и глубиной: уже видно смену рыночных режимов, но экран ещё не перегружается всей историей.\n\nЧисла выше по странице не пересчитываются: меняется только видимый диапазон дат и карточек.'

const PREDICTION_HISTORY_WINDOW_ALL_DESCRIPTION =
    'Вся история — показывает весь доступный history-архив по выбранному training-scope.\n\nЭтот режим нужен, когда важно увидеть полную хронологию решений без обрезания по свежему хвосту.\n\nЧисла выше по странице не пересчитываются: страница просто перестаёт скрывать более старые даты.'

export function buildMegaBucketControlGroup({
    value,
    onChange
}: BuildMegaBucketControlGroupArgs): ReportViewControlGroup<PolicyBranchMegaBucketMode> {
    return {
        key: 'mega-bucket',
        label: 'Бакет капитала',
        infoTooltip: BUCKET_DESCRIPTION,
        infoTooltipExcludeRuleIds: ['bucket'],
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

export function buildMegaTotalBucketViewControlGroup({
    value,
    onChange
}: BuildMegaTotalBucketViewControlGroupArgs): ReportViewControlGroup<PolicyBranchMegaTotalBucketView> {
    return {
        key: 'mega-total-bucket-view',
        label: 'Показ всех бакетов',
        infoTooltip: MEGA_TOTAL_BUCKET_VIEW_DESCRIPTION,
        value,
        options: [
            { value: 'aggregate', label: 'С агрегацией' },
            { value: 'separate', label: 'Без агрегации' }
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
    infoTooltip,
    splitStats
}: BuildTrainingScopeControlGroupArgs): ReportViewControlGroup<CurrentPredictionTrainingScope> {
    const trainingScopeOverviewDescription = infoTooltip ?? buildTrainingScopeOverviewDescription(splitStats)
    const tooltipByValue = buildTrainingScopeTooltipByValue(splitStats)

    return {
        key: 'training-scope',
        label,
        ariaLabel,
        infoTooltip: trainingScopeOverviewDescription,
        value,
        options: [
            {
                value: 'full',
                label: resolveCurrentPredictionTrainingScopeMeta('full').label,
                tooltip: tooltipByValue.full
            },
            {
                value: 'train',
                label: resolveCurrentPredictionTrainingScopeMeta('train').label,
                tooltip: tooltipByValue.train
            },
            {
                value: 'oos',
                label: resolveCurrentPredictionTrainingScopeMeta('oos').label,
                tooltip: tooltipByValue.oos
            },
            {
                value: 'recent',
                label: resolveCurrentPredictionTrainingScopeMeta('recent').label,
                tooltip: tooltipByValue.recent
            }
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
            'Окно истории — переключатель видимого диапазона ленты исторических прогнозов.\n\nПереключение не пересчитывает сами прогнозы заново. Страница меняет только то, какая часть уже построенной истории сейчас показана: последний год, два года или весь архив.\n\nЧто меняется:\nсписок карточек, пагинация, число видимых дней и доступный диапазон дат.\n\nЧто не меняется:\nсодержимое самих карточек и логика прогноза.\n\nКак читать:\nкороткое окно нужно для свежего хвоста, длинное — для поиска момента, где поведение модели изменилось.',
        value,
        options: options.map(option => ({
            value: option.value,
            label: option.label,
            tooltip:
                option.value === '365' ? PREDICTION_HISTORY_WINDOW_ONE_YEAR_DESCRIPTION
                : option.value === '730' ? PREDICTION_HISTORY_WINDOW_TWO_YEARS_DESCRIPTION
                : PREDICTION_HISTORY_WINDOW_ALL_DESCRIPTION
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
        infoTooltip: PREDICTION_HISTORY_BUCKET_FILTER_DESCRIPTION,
        infoTooltipExcludeRuleIds: ['bucket'],
        value,
        options: [
            {
                value: 'daily',
                label: 'Daily',
                tooltip: DAILY_BUCKET_DESCRIPTION,
                tooltipExcludeRuleIds: ['bucket-daily']
            },
            {
                value: 'intraday',
                label: 'Intraday',
                tooltip: INTRADAY_BUCKET_DESCRIPTION,
                tooltipExcludeRuleIds: ['bucket-intraday']
            },
            {
                value: 'delayed',
                label: 'Delayed',
                tooltip: DELAYED_BUCKET_DESCRIPTION,
                tooltipExcludeRuleIds: ['bucket-delayed']
            },
            {
                value: 'total',
                label: 'Σ Все бакеты',
                tooltip: PREDICTION_HISTORY_BUCKET_TOTAL_DESCRIPTION,
                tooltipExcludeRuleIds: ['bucket-total-aggregate']
            }
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
