import type { CurrentPredictionTrainingScope } from '@/shared/api/endpoints/reportEndpoints'
import type { CurrentPredictionBackfilledTrainingScopeStats } from '@/shared/api/tanstackQueries/currentPrediction'
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
    PolicyBranchMegaHistoryMode,
    PolicyBranchMegaBucketMode,
    PolicyBranchMegaTotalBucketView,
    PolicyBranchMegaMetricMode,
    PolicyBranchMegaSlMode,
    PolicyBranchMegaTpSlMode,
    PolicyBranchMegaZonalMode
} from '@/shared/utils/policyBranchMegaTabs'
import type { ReportDocumentDto } from '@/shared/types/report.types'
import {
    resolveCurrentPredictionStructuredTrainingFacts,
    type CurrentPredictionStructuredTrainingFacts
} from '@/shared/utils/currentPredictionTrainingFacts'
import { resolveCurrentPredictionTrainingScopeMeta } from './currentPredictionTrainingScopeMeta'
import type { ReportViewControlGroup } from '../ui/ReportViewControls'

export type ModelStatsSegmentControlValue = 'OOS' | 'RECENT' | 'TRAIN' | 'FULL'
export type BusinessTechnicalViewControlValue = 'business' | 'technical'
export type ModelStatsViewControlValue = BusinessTechnicalViewControlValue

interface BuildMegaBucketControlGroupArgs {
    value: PolicyBranchMegaBucketMode
    onChange: (next: PolicyBranchMegaBucketMode) => void
}

interface BuildMegaHistoryControlGroupArgs {
    value: PolicyBranchMegaHistoryMode
    onChange: (next: PolicyBranchMegaHistoryMode) => void
    availableValues?: readonly PolicyBranchMegaHistoryMode[]
    splitStats?: CurrentPredictionBackfilledTrainingScopeStats | null
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
    infoTooltipAppendix?: string
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
    splitStats?: CurrentPredictionBackfilledTrainingScopeStats | null
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

interface BuildSelectionControlGroupArgs<TValue extends string> {
    key: string
    label: string
    value: TValue
    options: readonly {
        value: TValue
        label: string
        tooltip?: string
        tooltipExcludeTerms?: string[]
        tooltipExcludeRuleIds?: string[]
    }[]
    onChange: (next: TValue) => void
    ariaLabel?: string
    infoTooltip?: string
    infoTooltipExcludeTerms?: string[]
    infoTooltipExcludeRuleIds?: string[]
}

interface BuildTrainingScopeControlGroupArgs {
    value: CurrentPredictionTrainingScope
    onChange: (next: CurrentPredictionTrainingScope) => void
    label?: string
    ariaLabel?: string
    infoTooltip?: string
    splitStats?: CurrentPredictionBackfilledTrainingScopeStats | null
    scopes?: readonly CurrentPredictionTrainingScope[]
}

interface BuildCurrentPredictionLiveTrainingScopeDescriptionArgs {
    splitStats?: CurrentPredictionBackfilledTrainingScopeStats | null
    fullReport?: ReportDocumentDto | null
    oosReport?: ReportDocumentDto | null
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

const GENERIC_TRAINING_SCOPE_FULL_DESCRIPTION =
    `[[landing-all-history|Full]]

[[landing-all-history|Full]] — это режим 100% завершённой истории страницы. В обучение попадают все дни, по которым уже известен итог [[landing-time-horizon|торгового дня]]. После этого эта же обученная версия модели заново проходит по всей истории и строит прогнозы для тех же дней без разделения на [[train-segment|Train]] и [[landing-oos|OOS]].

Технически здесь важны два шага. Сначала завершённые дни нужны только для обучения: по ним модель один раз подстраивает [[landing-model-weights|веса модели]]. Потом начинается сам пересчёт истории. В этот момент модель уже не получает готовый итог конкретного дня в лоб: она видит только те рыночные данные, которые доступны на момент расчёта, считает вероятности и лишь потом отчёт приклеивает реальный итог дня. Поэтому full-режим меняет старые прогнозы через новые [[landing-model-weights|веса модели]], а не через прямое запоминание дня.

Что показывает
1) Самую дообученную версию модели.
2) Историю, где один и тот же день может войти и в обучение, и в повторный прогноз.
3) Полный пересчёт без честного разделения на новые и обучающие дни.

Когда смотреть
1) Когда нужна модель в её самой дообученной версии.
2) Когда важно понять, что покажет версия модели, которой дали весь завершённый прошлый опыт.
3) На live-странице именно этот режим ближе всего к варианту "дать модели максимум прошлого перед прогнозом следующего дня".

Что важно
1) [[landing-all-history|Full]] нужен не для честной проверки качества на новых днях, а для просмотра самой обученной версии модели.
2) Здесь нельзя делать вывод "модель честно прошла новые дни", потому что эти же дни могли участвовать в обучении.
3) Старые full-прогнозы могут меняться после нового пересчёта, потому что модель получила больше завершённой истории и иначе подстроила [[landing-model-weights|веса модели]].
4) Для честной проверки качества на новых днях [[landing-all-history|Full]] всегда сравнивается с [[landing-oos|OOS]].

Пример
1) Если старый full-прогноз за ту же дату изменился после нового пересчёта, это не значит, что система просто подставила готовый ответ за этот день.
2) Это значит, что модель получила больше завершённой истории, по-другому подстроила [[landing-model-weights|веса модели]] и заново пересчитала тот же день уже новой обученной версией.`

const GENERIC_TRAINING_SCOPE_TRAIN_DESCRIPTION =
    `[[train-segment|Train]]

[[train-segment|Train]] — это обучающая часть перед базовым [[landing-oos|OOS]]. Правило пары Train / OOS читается так: более ранние 70% полной истории остаются в [[train-segment|Train]], а более новые 30% уходят в [[landing-oos|OOS]]. Сначала модель подстраивает на [[train-segment|Train]] [[landing-model-weights|веса модели]], а потом эта же версия может отдельно прогоняться по тем же дням. Поэтому [[train-segment|Train]] показывает не честную проверку новых дат, а поведение модели на знакомой истории.

Во время этого прогона готовый итог дня тоже не подаётся в модель напрямую. Сначала считаются вероятности по данным дня, потом отчёт отдельным шагом добавляет реальный итог. Но сами дни уже участвовали в обучении, поэтому это всё равно диагностика на знакомой истории.

Что показывает
1) Обучающий участок модели в режиме с разделением истории.
2) Ошибки и спорные места, которые удобно разобрать до просмотра [[landing-oos|OOS]].
3) Где модель слишком уверена и где её решение оказывается пограничным.

Когда смотреть
Этот режим нужен для разбора ошибок на знакомой истории.

Что важно
1) Сильный [[train-segment|Train]] сам по себе не означает хорошее качество на новых днях.
2) Главный вывод по качеству всё равно читается через [[landing-oos|OOS]].
3) Большой разрыв между [[train-segment|Train]] и [[landing-oos|OOS]] — сигнал слабой переносимости или риска [[leakage|утечки]].

Пример
Если на [[train-segment|Train]] метрики выглядят ровно, а на [[landing-oos|OOS]] качество резко падает, модель хорошо подстроилась под знакомую историю, но хуже работает на новых датах.`

const GENERIC_TRAINING_SCOPE_OOS_DESCRIPTION =
    `[[landing-oos|OOS]]

[[landing-oos|OOS]] — это базовый пользовательский хвост новых дней. Правило режима закрепляет за [[landing-oos|OOS]] последние 30% полной истории, а более ранние 70% остаются в [[train-segment|Train]]. Сначала модель обучается на [[train-segment|Train]], после этого обучение останавливается, и уже эта же версия модели идёт на новые дни [[landing-oos|OOS]]. Поэтому [[landing-oos|OOS]] ближе всего к ответу на вопрос, как модель держится на новых датах.

Технически режим работает без смешения дней. Сначала модель учится только на [[train-segment|Train]]. Потом эта же версия без дообучения проходит только по дням [[landing-oos|OOS]]. Во время самого прогноза фактический исход OOS-дня в модель не передаётся: сначала считаются вероятности по данным дня, а реальный итог добавляется к отчёту уже после этого.

Что показывает
1) Самую честную проверку на новых днях внутри текущего разделения истории.
2) То, как модель переносится на более позднюю часть истории.
3) Качество на днях, которых не было в обучении.

Когда смотреть
Это главный режим, когда нужен практический ответ на вопрос: держится ли модель на новых днях или хорошо выглядит только на знакомой истории.

Что важно
1) Если [[train-segment|Train]] заметно сильнее, чем [[landing-oos|OOS]], модель хуже переносится на новые даты.
2) Один из первых рисков в таком разрыве — [[leakage|утечка]] или слишком слабая работа на новой части истории.
3) Именно поэтому [[landing-oos|OOS]] считается главным честным режимом чтения качества.

Пример
Если на [[train-segment|Train]] метрики ровные, а на [[landing-oos|OOS]] резко падают, модель плохо работает на новых днях или нужно проверить риск [[leakage|утечки]].`

const GENERIC_TRAINING_SCOPE_RECENT_DESCRIPTION =
    `[[landing-recent-tail-history|Recent]]

[[landing-recent-tail-history|Recent]] — это не отдельное обучение, а короткий пользовательский хвост внутри [[landing-oos|OOS]]. Правило режима закрепляет за ним последние 15% полной истории. Этот кусок целиком лежит внутри более широкого [[landing-oos|OOS]], для которого базовое правило остаётся 30%.

[[landing-recent-tail-history|Recent]] не создаёт новую модель и не запускает новый прогнозный проход. Меняется только то, какой самый свежий участок уже готовой проверки на новых днях сейчас показан на странице.

Что показывает
1) Только самый свежий конец [[landing-oos|OOS]].
2) То, что происходит с качеством именно в последние дни, а не в среднем по всей OOS-истории.

Когда смотреть
Этот режим нужен, когда важнее всего понять, не портится ли модель именно на последнем участке истории.

Что важно
1) [[landing-recent-tail-history|Recent]] всегда нужно читать рядом с [[landing-oos|OOS]], потому что это его хвост, а не отдельная проверка.
2) Если каноничный [[landing-oos|OOS]] уже короткий, [[landing-recent-tail-history|Recent]] может полностью совпасть с ним.
3) Если общий [[landing-oos|OOS]] ещё выглядит нормально, а [[landing-recent-tail-history|Recent]] уже слабее, ухудшение начинается именно на последних днях.

Пример
Если за весь [[landing-oos|OOS]] метрики ещё держатся, а в [[landing-recent-tail-history|Recent]] уже заметна просадка, проблема сидит в самом свежем участке истории.`

function formatTrainingScopeDayCount(value: number): string {
    if (!Number.isInteger(value) || value < 0) {
        throw new Error(`[training-scope] day count must be a non-negative integer. value=${value}.`)
    }

    return new Intl.NumberFormat('ru-RU').format(value)
}

function formatTrainingScopePercent(value: number): string {
    if (!Number.isFinite(value) || value <= 0 || value >= 100) {
        throw new Error(`[training-scope] share percent must stay within (0;100). value=${value}.`)
    }

    return `${formatTrainingScopeDayCount(value)}%`
}

function resolveComplementTrainingScopePercent(value: number): number {
    if (!Number.isFinite(value) || value <= 0 || value >= 100) {
        throw new Error(`[training-scope] share percent must stay within (0;100). value=${value}.`)
    }

    return 100 - value
}

function extractTrainingScopeYear(dayKeyUtc: string): string {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dayKeyUtc)) {
        throw new Error(`[training-scope] invalid day key. value=${dayKeyUtc}.`)
    }

    return dayKeyUtc.slice(0, 4)
}

function formatTrainingScopeYearRange(startDateUtc: string, endDateUtc: string): string {
    const startYear = extractTrainingScopeYear(startDateUtc)
    const endYear = extractTrainingScopeYear(endDateUtc)

    return startYear === endYear ? startYear : `${startYear} — ${endYear}`
}

function resolveRussianCountWord(
    value: number,
    singular: string,
    dual: string,
    plural: string
): string {
    const absValue = Math.abs(value) % 100
    const lastDigit = absValue % 10

    if (absValue >= 11 && absValue <= 19) {
        return plural
    }

    if (lastDigit === 1) {
        return singular
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
        return dual
    }

    return plural
}

function formatTrainingScopeCount(
    value: number,
    singular: string,
    dual: string,
    plural: string
): string {
    return `${formatTrainingScopeDayCount(value)} ${resolveRussianCountWord(value, singular, dual, plural)}`
}

function parseTrainingScopeDayKeyUtc(dayKeyUtc: string): Date {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayKeyUtc)
    if (!match) {
        throw new Error(`[training-scope] invalid day key. value=${dayKeyUtc}.`)
    }

    return new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])))
}

function countTrainingScopeCalendarDays(startDateUtc: string, endDateUtc: string): number {
    // Live training facts приходят только границами окна, поэтому размер окна восстанавливается по day-key диапазону.
    const startDate = parseTrainingScopeDayKeyUtc(startDateUtc)
    const endDate = parseTrainingScopeDayKeyUtc(endDateUtc)
    const daySpan = Math.floor((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1

    if (!Number.isInteger(daySpan) || daySpan <= 0) {
        throw new Error(`[training-scope] invalid calendar day span. start=${startDateUtc}; end=${endDateUtc}.`)
    }

    return daySpan
}

function countTrainingScopeWeekdaysWithoutWeekends(startDateUtc: string, endDateUtc: string): number {
    const startDate = parseTrainingScopeDayKeyUtc(startDateUtc)
    const calendarDays = countTrainingScopeCalendarDays(startDateUtc, endDateUtc)
    let weekdayCount = 0

    // Диапазоны current prediction приходят только как day-key границы, поэтому число рабочих дней
    // считается здесь же по календарю без субботы и воскресенья.
    for (let offset = 0; offset < calendarDays; offset += 1) {
        const currentDay = new Date(startDate.getTime() + offset * 24 * 60 * 60 * 1000)
        const dayOfWeekUtc = currentDay.getUTCDay()

        if (dayOfWeekUtc !== 0 && dayOfWeekUtc !== 6) {
            weekdayCount += 1
        }
    }

    if (weekdayCount < 0) {
        throw new Error(
            `[training-scope] weekday count must stay non-negative. start=${startDateUtc}; end=${endDateUtc}.`
        )
    }

    return weekdayCount
}

function formatTrainingScopeTradingDayCount(value: number): string {
    return `${formatTrainingScopeDayCount(value)} [[landing-time-horizon|${resolveRussianCountWord(
        value,
        'торговый день',
        'торговых дня',
        'торговых дней'
    )}]]`
}

function buildTrainingScopeRangeFact(startDateUtc: string, endDateUtc: string): string {
    const calendarDays = countTrainingScopeCalendarDays(startDateUtc, endDateUtc)
    const tradingDaysWithoutWeekends = countTrainingScopeWeekdaysWithoutWeekends(startDateUtc, endDateUtc)

    if (calendarDays === tradingDaysWithoutWeekends) {
        return `${formatTrainingScopeYearRange(startDateUtc, endDateUtc)} (${formatTrainingScopeTradingDayCount(tradingDaysWithoutWeekends)})`
    }

    return `${formatTrainingScopeYearRange(startDateUtc, endDateUtc)} (${formatTrainingScopeCount(calendarDays, 'календарный день', 'календарных дня', 'календарных дней')}; в расчёт без выходных попадает ${formatTrainingScopeTradingDayCount(tradingDaysWithoutWeekends)}. [[why-weekends|Почему?]])`
}

function buildTrainingScopeCalendarFact(startDateUtc: string, endDateUtc: string): string {
    return buildTrainingScopeRangeFact(startDateUtc, endDateUtc)
}

function buildTrainingScopeSplitRuleFact(oosHistoryDaySharePercent?: number | null): string {
    const explicitShareFact =
        typeof oosHistoryDaySharePercent === 'number' &&
        Number.isFinite(oosHistoryDaySharePercent) &&
        oosHistoryDaySharePercent > 0 ?
            ` Базовое правило пары Train / OOS такое: последние ${formatTrainingScopePercent(oosHistoryDaySharePercent)} полной истории относятся к [[landing-oos|OOS]], а более ранние ${formatTrainingScopePercent(resolveComplementTrainingScopePercent(oosHistoryDaySharePercent))} остаются в [[train-segment|Train]].`
        :   ' Дальше история делится на более ранний [[train-segment|Train]] и более новые дни [[landing-oos|OOS]] по owner-правилу split recipe.'

    return `[[split-boundaries|Граница между Train и OOS]] считается по дню, когда окончательно закрывается рабочее окно [[landing-time-horizon|торгового дня]].${explicitShareFact}`
}

function buildGenericTrainingScopeOverviewDescription(): string {
    return `Что такое режимы и зачем они нужны

На страницах прогноза одна и та же модель открывается в нескольких режимах, потому что каждый режим меняет правило обучения и кусок истории на экране:
1) [[landing-all-history|Full]] — 100% завершённой истории.
2) [[landing-oos|OOS]] — базовый пользовательский хвост новых дней: последние 30% полной истории.
3) [[landing-recent-tail-history|Recent]] — короткий пользовательский хвост: последние 15% полной истории внутри более широкого [[landing-oos|OOS]].
4) [[train-segment|Train]] — обучающая часть перед базовым [[landing-oos|OOS]]: более ранние 70% полной истории.

У всех режимов одна техническая схема. Сначала весь разрешённый диапазон дней идёт в обучение: по нему модель один раз подстраивает [[landing-model-weights|веса модели]]. Потом начинается сам прогноз: модель видит только данные дня на момент расчёта, считает вероятности и не получает готовый итог этого дня в лоб. Реальный итог приклеивается к записи позже, уже на уровне отчёта. Поэтому режим меняет не оформление страницы, а две вещи: какой прошлый опыт разрешён для обучения и какие дни потом показываются как история или проверка.`
}

function buildCurrentPredictionHistoryFullDescription(
    splitStats: CurrentPredictionBackfilledTrainingScopeStats
): string {
    return `[[landing-all-history|Full]]

[[landing-all-history|Full]] — это режим 100% завершённой истории страницы: ${buildTrainingScopeRangeFact(splitStats.fullStartDateUtc, splitStats.fullEndDateUtc)}. В текущем опубликованном каталоге это ${formatTrainingScopeCount(splitStats.fullDays, 'день', 'дня', 'дней')}. Под "завершённой" здесь понимаются только те дни, по которым уже известен итог [[landing-time-horizon|торгового дня]]. На этом же диапазоне модель один раз обучается, подстраивает [[landing-model-weights|веса модели]] и потом этой же обученной версией заново проходит по всей истории. Поэтому здесь вместе видны и более ранние дни, и более новые дни, а один и тот же день может участвовать и как прошлый опыт для обучения, и как день повторного прогноза.

Технически [[landing-all-history|Full]] работает в два шага. Сначала завершённые дни нужны только для обучения: по ним модель один раз подстраивает [[landing-model-weights|веса модели]]. Потом начинается сам пересчёт истории. В этот момент готовый итог конкретного дня в модель уже не подаётся: движок видит только те рыночные данные, которые были доступны на момент расчёта, считает вероятности этой же обученной версией модели и лишь после этого отчёт отдельным шагом приклеивает реальный итог дня.

Что показывает
1) Самую дообученную версию модели на всей завершённой истории.
2) Исторический пересчёт без разделения на [[train-segment|Train]] и [[landing-oos|OOS]].
3) Полную историю прогнозов, где один и тот же день может входить и в обучение, и в повторный прогноз.

Когда смотреть
1) Когда нужна модель в её самой дообученной версии.
2) Когда важно понять, что покажет версия модели, которой дали весь завершённый прошлый опыт.
3) На live-странице именно этот режим ближе всего к варианту "дать модели максимум прошлого перед прогнозом следующего дня".

Что важно
1) [[landing-all-history|Full]] нужен не для честной проверки качества на новых днях, а для просмотра самой обученной версии модели.
2) Здесь нельзя делать вывод "модель честно прошла новые дни", потому что эти же дни могли участвовать в обучении.
3) Старые дни в [[landing-all-history|Full]] могут меняться после нового пересчёта, потому что модель получила больше завершённой истории и по-новому подстроила [[landing-model-weights|веса модели]].
4) Для честной проверки на новых днях ориентиром остаётся [[landing-oos|OOS]].

Пример
1) После расширения завершённой истории старый прогноз за 2024 год может стать другим.
2) Это не значит, что система просто подставила в прогноз готовый ответ за 2024 год.
3) Это значит, что модель получила больше завершённой истории, по-другому подстроила [[landing-model-weights|веса модели]] и заново пересчитала тот же 2024 год уже новой обученной версией.`
}

function buildCurrentPredictionHistoryOosDescription(
    splitStats: CurrentPredictionBackfilledTrainingScopeStats
): string {
    const trainPercent = resolveComplementTrainingScopePercent(splitStats.oosHistoryDaySharePercent)

    return `[[landing-oos|OOS]]

[[landing-oos|OOS]] — это базовый пользовательский хвост новых дней. Правило режима закрепляет за [[landing-oos|OOS]] последние ${formatTrainingScopePercent(splitStats.oosHistoryDaySharePercent)} полной истории, а за [[train-segment|Train]] — более ранние ${formatTrainingScopePercent(trainPercent)}. В текущем опубликованном каталоге [[landing-oos|OOS]] сейчас содержит ${formatTrainingScopeCount(splitStats.oosDays, 'день', 'дня', 'дней')}: ${buildTrainingScopeRangeFact(splitStats.oosStartDateUtc, splitStats.oosEndDateUtc)}. Перед ним идёт [[train-segment|Train]] с ${formatTrainingScopeCount(splitStats.trainDays, 'день', 'дня', 'дней')}: ${buildTrainingScopeRangeFact(splitStats.trainStartDateUtc, splitStats.trainEndDateUtc)}. Сначала модель обучается только на [[train-segment|Train]], потом обучение останавливается, и уже эта же версия модели идёт на дни [[landing-oos|OOS]].

Технически режим работает отдельно от [[landing-all-history|Full]]. Сначала модель учится только на [[train-segment|Train]]. Потом эта же версия без дообучения проходит только по дням [[landing-oos|OOS]]. Во время самого прогноза фактический исход OOS-дня в модель не передаётся: сначала считаются вероятности по данным дня, а реальный итог добавляется к отчёту уже после этого.

Что показывает
1) Только дни [[landing-oos|OOS]] без обучающих дней [[train-segment|Train]].
2) То, насколько модель переносится на новые даты после обучения на более ранней истории.
3) Самую честную проверку качества внутри текущего разделения истории.

Когда смотреть
Это главный режим, когда нужен прямой ответ на вопрос: держится ли модель на новых днях или хорошо выглядит только на знакомой истории.

Что важно
1) При появлении новых завершённых дней граница между [[train-segment|Train]] и [[landing-oos|OOS]] двигается автоматически.
2) Если [[train-segment|Train]] заметно сильнее, чем [[landing-oos|OOS]], модель хуже переносится на новые даты.
3) Один из первых рисков в таком разрыве — [[leakage|утечка]] или слишком слабая работа на более новой части истории.

Пример
Если на [[train-segment|Train]] точность, уверенность и другие метрики выглядят ровно, а на [[landing-oos|OOS]] они резко падают, значит модель плохо прогнозирует новые даты или нужно проверить риск [[leakage|утечки]].`
}

function buildCurrentPredictionHistoryRecentDescription(
    splitStats: CurrentPredictionBackfilledTrainingScopeStats
): string {
    const recentCoverageLine =
        splitStats.recentMatchesOos ?
            `Сейчас каноничный [[landing-oos|OOS]] такой же короткий, поэтому [[landing-recent-tail-history|Recent]] и [[landing-oos|OOS]] совпадают.`
        :   `Сейчас [[landing-recent-tail-history|Recent]] короче полного [[landing-oos|OOS]] и показывает только его более короткий свежий хвост.`

    return `[[landing-recent-tail-history|Recent]]

[[landing-recent-tail-history|Recent]] — это не отдельное обучение, а короткий пользовательский хвост новых дней. Правило режима закрепляет за ним последние ${formatTrainingScopePercent(splitStats.recentHistoryDaySharePercent)} полной истории. В текущем опубликованном каталоге этот хвост сейчас содержит ${formatTrainingScopeCount(splitStats.recentDays, 'день', 'дня', 'дней')}: ${buildTrainingScopeRangeFact(splitStats.recentStartDateUtc, splitStats.recentEndDateUtc)}. Он целиком лежит внутри более широкого [[landing-oos|OOS]], для которого базовое правило остаётся ${formatTrainingScopePercent(splitStats.oosHistoryDaySharePercent)}. ${recentCoverageLine}

[[landing-recent-tail-history|Recent]] режется по правилу доли дней полной истории. Новая модель здесь не обучается и новый прогнозный проход не строится.

Что показывает
1) Не весь [[landing-oos|OOS]], а только его самый свежий конец.
2) То, что происходит с качеством именно в последние дни, а не в среднем по всей OOS-истории.

Когда смотреть
Этот режим нужен, когда важнее всего понять, не портится ли модель именно на последнем участке истории.

Что важно
1) [[landing-recent-tail-history|Recent]] всегда нужно читать рядом с [[landing-oos|OOS]], потому что это его хвост, а не отдельная проверка.
2) Если весь [[landing-oos|OOS]] короче лимита, [[landing-recent-tail-history|Recent]] полностью совпадает с ним.
3) Если общий [[landing-oos|OOS]] ещё выглядит нормально, а [[landing-recent-tail-history|Recent]] уже слабее, ухудшение начинается именно на последних днях.

Пример
Если за весь [[landing-oos|OOS]] метрики ещё держатся, а в [[landing-recent-tail-history|Recent]] уже заметна просадка, проблема сидит в самом свежем участке истории.`
}

function buildCurrentPredictionHistoryTrainDescription(
    splitStats: CurrentPredictionBackfilledTrainingScopeStats
): string {
    const trainPercent = resolveComplementTrainingScopePercent(splitStats.oosHistoryDaySharePercent)

    return `[[train-segment|Train]]

[[train-segment|Train]] — это обучающая часть перед базовым [[landing-oos|OOS]]. В паре Train / OOS правило режима читается так: более ранние ${formatTrainingScopePercent(trainPercent)} полной истории остаются в [[train-segment|Train]], а последние ${formatTrainingScopePercent(splitStats.oosHistoryDaySharePercent)} уходят в [[landing-oos|OOS]]. В текущем опубликованном каталоге [[train-segment|Train]] сейчас содержит ${formatTrainingScopeCount(splitStats.trainDays, 'день', 'дня', 'дней')}: ${buildTrainingScopeRangeFact(splitStats.trainStartDateUtc, splitStats.trainEndDateUtc)}. После обучения эта же версия модели отдельным прогоном считается по тем же дням, поэтому [[train-segment|Train]] показывает не честную проверку на новых датах, а поведение модели на уже знакомой истории.

Во время этого прогона готовый итог дня тоже не подаётся в модель напрямую. Сначала считаются вероятности по данным дня, потом отчёт отдельным шагом добавляет реальный итог. Но сами дни уже участвовали в обучении, поэтому это всё равно диагностика на знакомой истории.

Что показывает
1) Тот же обучающий участок, который используется в режиме с разделением истории.
2) Реальные диагностические блоки страницы: Train diagnostics metrics, Worst mistakes (in-sample), Confident mistakes (in-sample), Borderline days (lowest margin).
3) Где модель ошибается, где она слишком уверена и где решение оказывается пограничным.

Когда смотреть
Этот режим нужен для внутреннего разбора модели: какие ошибки она делает на знакомой истории и в каких местах проблема видна ещё до выхода на новые даты.

Что важно
1) Сильный [[train-segment|Train]] сам по себе не означает хорошее качество на новых днях.
2) Если нужен главный вывод по качеству, ориентиром остаётся [[landing-oos|OOS]].
3) Большой разрыв между [[train-segment|Train]] и [[landing-oos|OOS]] — сигнал слабой переносимости или риска [[leakage|утечки]].

Пример
Если на [[train-segment|Train]] ошибки редкие, а на [[landing-oos|OOS]] качество резко падает, модель хорошо подстроилась под знакомую историю, но хуже работает на новых датах.`
}

function buildCurrentPredictionLiveFullDescription(
    splitStats: CurrentPredictionBackfilledTrainingScopeStats | null | undefined,
    fullFacts: CurrentPredictionStructuredTrainingFacts | null
): string {
    const fitFact =
        fullFacts?.fitWindowStartDayKeyUtc && fullFacts?.fitWindowEndDayKeyUtc ?
            buildTrainingScopeCalendarFact(fullFacts.fitWindowStartDayKeyUtc, fullFacts.fitWindowEndDayKeyUtc)
        : splitStats ? buildTrainingScopeRangeFact(splitStats.fullStartDateUtc, splitStats.fullEndDateUtc)
        : null
    const scoreFact =
        fullFacts?.scoreWindowStartDayKeyUtc && fullFacts?.scoreWindowEndDayKeyUtc ?
            buildTrainingScopeCalendarFact(fullFacts.scoreWindowStartDayKeyUtc, fullFacts.scoreWindowEndDayKeyUtc)
        : null

    return `[[landing-all-history|Full]]

[[landing-all-history|Full]] на live-странице — это текущий прогноз модели, которая обучена на 100% завершённой истории: ${fitFact ?? 'доступный диапазон пока не прочитан'}. Здесь в обучение попадает весь доступный диапазон до последнего завершённого дня, а потом эта же обученная версия считает текущую карточку${scoreFact ? ` за ${scoreFact}` : ''}. Разделения на [[train-segment|Train]] и [[landing-oos|OOS]] в этом режиме нет.

Во время live-расчёта факт текущего дня ещё неизвестен, поэтому в модель попадают только данные текущего дня на момент расчёта. Смысл сравнения с [[landing-oos|OOS]] здесь в другом: посмотреть, насколько текущий прогноз меняется от того, дали модели весь доступный прошлый опыт или остановили обучение раньше.

Что показывает
1) Самую дообученную live-версию модели.
2) Текущий день, посчитанный после обучения на всей завершённой истории.
3) Режим без разделения истории на [[train-segment|Train]] и [[landing-oos|OOS]].

Когда смотреть
Этот режим нужен, когда важна максимально дообученная версия текущей модели и хочется сравнить её с более строгой [[landing-oos|OOS]]-версией.

Что важно
1) Верх обучения всегда упирается в последний завершённый день доступной истории.
2) [[landing-all-history|Full]] даёт максимум прошлого опыта, но не является главным честным режимом проверки переноса на новые дни.
3) Для такого сравнения ориентиром остаётся [[landing-oos|OOS]].

Пример
Если [[landing-all-history|Full]] даёт по текущему дню заметно более сильный сигнал, чем [[landing-oos|OOS]], полный прошлый опыт делает текущий прогноз увереннее, чем более строгая версия с разделением истории.`
}

function buildCurrentPredictionLiveOosDescription(
    splitStats: CurrentPredictionBackfilledTrainingScopeStats | null | undefined,
    oosFacts: CurrentPredictionStructuredTrainingFacts | null
): string {
    const trainPercent =
        typeof splitStats?.oosHistoryDaySharePercent === 'number' ?
            resolveComplementTrainingScopePercent(splitStats.oosHistoryDaySharePercent)
        : null
    const trainFact =
        oosFacts?.trainWindowStartDayKeyUtc && oosFacts?.trainWindowEndDayKeyUtc ?
            buildTrainingScopeCalendarFact(oosFacts.trainWindowStartDayKeyUtc, oosFacts.trainWindowEndDayKeyUtc)
        : splitStats ? buildTrainingScopeRangeFact(splitStats.trainStartDateUtc, splitStats.trainEndDateUtc)
        : null
    const scoreFact =
        oosFacts?.scoreWindowStartDayKeyUtc && oosFacts?.scoreWindowEndDayKeyUtc ?
            buildTrainingScopeCalendarFact(oosFacts.scoreWindowStartDayKeyUtc, oosFacts.scoreWindowEndDayKeyUtc)
        : null

    return `[[landing-oos|OOS]]

[[landing-oos|OOS]] на live-странице — это текущий прогноз модели, которая сначала обучилась только на [[train-segment|Train]]${trainPercent ? ` (${formatTrainingScopePercent(trainPercent)} полной истории)` : ''}${trainFact ? `: ${trainFact}` : ''}, а потом без дообучения считает текущий день${scoreFact ? ` за ${scoreFact}` : ''}. Для этой пары базовое правило остаётся тем же: более новые ${splitStats ? formatTrainingScopePercent(splitStats.oosHistoryDaySharePercent) : '30%'} полной истории в обучение не входят.

Во время live-расчёта модель, как и в [[landing-all-history|Full]], не видит факт текущего дня. Разница только в объёме прошлого опыта: здесь текущий день считает версия, которая остановилась на [[train-segment|Train]] и не училась на более новых днях.

Что показывает
1) Более строгую live-версию текущего прогноза после разделения истории.
2) То, как текущий день выглядит у модели без обучения на более новой части истории.
3) ${buildTrainingScopeSplitRuleFact(splitStats?.oosHistoryDaySharePercent)}

Когда смотреть
Это главный live-режим, когда нужен ответ на вопрос: держится ли текущий прогноз у более строгой версии модели или красиво выглядит только у максимально дообученного [[landing-all-history|Full]].

Что важно
1) При появлении новых завершённых дней граница [[train-segment|Train]] / [[landing-oos|OOS]] двигается автоматически.
2) Если [[landing-oos|OOS]] заметно слабее [[landing-all-history|Full]], текущий прогноз сильно зависит от более новой истории, которой не было у строгой версии модели.
3) Именно поэтому [[landing-oos|OOS]] остаётся главным live-режимом для проверки переноса на новые даты.

Пример
Если [[landing-all-history|Full]] даёт уверенный прогноз по текущему дню, а [[landing-oos|OOS]] по тому же дню заметно слабее, строгая версия модели переносит свой сигнал хуже, чем максимально дообученная версия.`
}

function buildTrainingScopeControlOverviewDescription(
    splitStats?: CurrentPredictionBackfilledTrainingScopeStats | null
): string {
    if (!splitStats) {
        return buildGenericTrainingScopeOverviewDescription()
    }

    return `Что такое режимы и зачем нужны срезы

Срез меняет две вещи: какой кусок полной истории идёт в обучение и какие дни потом остаются на экране.
1) [[landing-all-history|Full]] — 100% завершённой истории. Сейчас это ${formatTrainingScopeCount(splitStats.fullDays, 'день', 'дня', 'дней')}.
2) [[train-segment|Train]] — более ранние ${formatTrainingScopePercent(resolveComplementTrainingScopePercent(splitStats.oosHistoryDaySharePercent))} полной истории перед базовым [[landing-oos|OOS]]. Сейчас это ${formatTrainingScopeCount(splitStats.trainDays, 'день', 'дня', 'дней')}.
3) [[landing-oos|OOS]] — базовый пользовательский хвост новых дней: последние ${formatTrainingScopePercent(splitStats.oosHistoryDaySharePercent)} полной истории. Сейчас это ${formatTrainingScopeCount(splitStats.oosDays, 'день', 'дня', 'дней')}.
4) [[landing-recent-tail-history|Recent]] — короткий пользовательский хвост: последние ${formatTrainingScopePercent(splitStats.recentHistoryDaySharePercent)} полной истории внутри более широкого [[landing-oos|OOS]]. Сейчас это ${formatTrainingScopeCount(splitStats.recentDays, 'день', 'дня', 'дней')}.

Процент здесь показывает правило режима, а число дней рядом показывает, сколько опубликованных дней реально попало в этот срез сейчас.`
}

// Этот owner-текст одновременно используется в tooltip переключателя и в верхнем explain-блоке prediction-страниц.
export function buildCurrentPredictionLiveTrainingScopeDescription(
    args: BuildCurrentPredictionLiveTrainingScopeDescriptionArgs = {}
): string {
    const { splitStats, fullReport, oosReport } = args
    const fullFacts = resolveCurrentPredictionStructuredTrainingFacts(fullReport)
    const oosFacts = resolveCurrentPredictionStructuredTrainingFacts(oosReport)

    return `Что такое режимы и зачем они нужны

На live-странице режим меняет не набор карточек, а историю обучения текущей модели.

1) [[landing-all-history|Full]] даёт текущий прогноз версии, которая обучена на всей завершённой истории.
2) [[landing-oos|OOS]] даёт текущий прогноз версии, которая обучалась только на [[train-segment|Train]] и не использовала более новые дни.

Оба режима считают один и тот же текущий день. Разница между ними не в факте текущего дня и не в другом наборе рыночных данных, а только в том, какой прошлый опыт получила модель до этого расчёта.

${buildCurrentPredictionLiveFullDescription(splitStats, fullFacts)}

${buildCurrentPredictionLiveOosDescription(splitStats, oosFacts)}

Что на этой странице не показывается
Live-страница не раскрывает всю историю по дням, поэтому здесь остаются только два режима.
1) [[train-segment|Train]] не выводится отдельно, потому что страница не показывает обучающую историю по датам.
2) [[landing-recent-tail-history|Recent]] не выводится отдельно, потому что страница показывает одну текущую карточку, а не ленту [[landing-oos|OOS]].

Что меняется на этой странице при переключении режима
1) Меняются вероятности, итоговое направление и уверенность.
2) Меняются временные поля и статус публикации.
3) Меняются блоки live-отчёта и блоки по политикам внутри карточки.`
}

export function buildCurrentPredictionHistoryTrainingScopeDescription(
    splitStats?: CurrentPredictionBackfilledTrainingScopeStats | null
): string {
    if (!splitStats) {
        return `${buildTrainingScopeControlOverviewDescription()}

${GENERIC_TRAINING_SCOPE_FULL_DESCRIPTION}

${GENERIC_TRAINING_SCOPE_OOS_DESCRIPTION}

${GENERIC_TRAINING_SCOPE_RECENT_DESCRIPTION}

${GENERIC_TRAINING_SCOPE_TRAIN_DESCRIPTION}

Что меняется на этой странице при переключении режима
1) Меняются доступные даты и число карточек.
2) Меняется служебный блок про обучение.
3) Меняются сами карточки прогноза и блоки по политикам внутри них.
4) В [[train-segment|Train]] страница переключает вводный текст на диагностический режим и скрывает таблицы сделок по политикам.`
    }

    return `Что такое режимы и зачем они нужны

На этой странице режим меняет две вещи: какой кусок полной истории идёт в обучение и какие дни потом попадают в историю.
1) [[landing-all-history|Full]] — 100% завершённой истории. Сейчас это ${formatTrainingScopeCount(splitStats.fullDays, 'день', 'дня', 'дней')}.
2) [[landing-oos|OOS]] — базовый пользовательский хвост новых дней. Правило режима: ${formatTrainingScopePercent(splitStats.oosHistoryDaySharePercent)} полной истории. Сейчас это ${formatTrainingScopeCount(splitStats.oosDays, 'день', 'дня', 'дней')}.
3) [[landing-recent-tail-history|Recent]] — короткий пользовательский хвост. Правило режима: ${formatTrainingScopePercent(splitStats.recentHistoryDaySharePercent)} полной истории. Сейчас это ${formatTrainingScopeCount(splitStats.recentDays, 'день', 'дня', 'дней')}.
4) [[train-segment|Train]] — обучающая часть перед базовым OOS. В этой паре правило читается как ${formatTrainingScopePercent(resolveComplementTrainingScopePercent(splitStats.oosHistoryDaySharePercent))} Train и ${formatTrainingScopePercent(splitStats.oosHistoryDaySharePercent)} OOS. Сейчас это ${formatTrainingScopeCount(splitStats.trainDays, 'день', 'дня', 'дней')}.

Технически у всех режимов схема одна. Сначала весь разрешённый диапазон идёт в обучение: по нему модель один раз подстраивает [[landing-model-weights|веса модели]]. Потом начинается сам прогноз: модель видит только данные дня на момент расчёта, считает вероятности и не получает готовый итог этого дня в лоб. Реальный итог приклеивается к записи позже, уже на уровне отчёта. Процент в описании показывает правило режима, а число дней рядом показывает, сколько опубликованных дней реально попало в этот режим сейчас.

${buildCurrentPredictionHistoryFullDescription(splitStats)}

${buildCurrentPredictionHistoryOosDescription(splitStats)}

${buildCurrentPredictionHistoryRecentDescription(splitStats)}

${buildCurrentPredictionHistoryTrainDescription(splitStats)}

Что меняется на этой странице при переключении режима
1) Меняются диапазон дат и число карточек.
2) Меняются описание режима обучения и поле Рабочий контур обучения.
3) Меняется сама история прогнозов, потому что страница показывает другой режим.
4) В [[train-segment|Train]] страница переключает вводный текст на диагностический режим и скрывает таблицы сделок по политикам.`
}

export const CURRENT_PREDICTION_LIVE_TRAINING_SCOPE_DESCRIPTION = buildCurrentPredictionLiveTrainingScopeDescription()

export const CURRENT_PREDICTION_HISTORY_TRAINING_SCOPE_DESCRIPTION =
    buildCurrentPredictionHistoryTrainingScopeDescription()

const DEFAULT_CURRENT_PREDICTION_SCOPE_ORDER: readonly CurrentPredictionTrainingScope[] = [
    'full',
    'train',
    'oos',
    'recent'
]

const MEGA_TOTAL_BUCKET_VIEW_DESCRIPTION =
    'Показ всех бакетов — выбор того, как читать `Σ Все бакеты`.\n\nС агрегацией:\nстраница показывает один общий итог по daily, intraday и delayed.\n\nБез агрегации:\nстраница показывает эти же бакеты отдельно, чтобы был виден вклад каждого.\n\nКак читать:\nагрегация нужна для общего результата, раздельный режим — для сравнения, какой бакет дал прибыль, просадку или пропуск сделки.'

function buildMegaHistorySliceDescription(splitStats?: CurrentPredictionBackfilledTrainingScopeStats | null): string {
    if (!splitStats) {
        return 'Срез истории — выбор участка backtest-истории для расчёта таблицы.\n\nВся история:\nстраница использует 100% доступного диапазона.\n\nOOS:\nстраница оставляет базовый хвост новых дней. Правило этого режима — последние 30% полной истории. Дополняющая обучающая часть Train занимает более ранние 70% полной истории.\n\nХвост OOS:\nстраница оставляет только короткий пользовательский хвост внутри OOS. Правило этого режима — последние 15% полной истории.\n\nКак читать:\nсравнение OOS 30% и короткого хвоста 15% показывает, держится ли результат на самом свежем участке новой истории.'
    }

    const trainPercent = resolveComplementTrainingScopePercent(splitStats.oosHistoryDaySharePercent)

    return `Срез истории — выбор участка backtest-истории для расчёта таблицы.

Вся история:
страница использует 100% доступного диапазона. Сейчас это ${formatTrainingScopeCount(splitStats.fullDays, 'день', 'дня', 'дней')}.

OOS:
страница оставляет базовый хвост новых дней. Правило этого режима — последние ${formatTrainingScopePercent(splitStats.oosHistoryDaySharePercent)} полной истории. Сейчас это ${formatTrainingScopeCount(splitStats.oosDays, 'день', 'дня', 'дней')}. Дополняющая обучающая часть Train занимает более ранние ${formatTrainingScopePercent(trainPercent)}: ${formatTrainingScopeCount(splitStats.trainDays, 'день', 'дня', 'дней')}.

Хвост OOS:
страница оставляет только короткий пользовательский хвост внутри OOS. Правило этого режима — последние ${formatTrainingScopePercent(splitStats.recentHistoryDaySharePercent)} полной истории. Сейчас это ${formatTrainingScopeCount(splitStats.recentDays, 'день', 'дня', 'дней')}.

Как читать:
сравнение OOS ${formatTrainingScopePercent(splitStats.oosHistoryDaySharePercent)} и короткого хвоста ${formatTrainingScopePercent(splitStats.recentHistoryDaySharePercent)} показывает, держится ли результат на самом свежем участке новой истории.`
}

const PREDICTION_HISTORY_WINDOW_ONE_YEAR_DESCRIPTION =
    '1 год — показывает только последний год ленты прогнозов.\n\nЭтот режим нужен, когда важнее быстро проверить самое свежее поведение модели, а не читать всю историю сразу.\n\nЧисла выше по странице не пересчитываются: меняется только видимый диапазон дат и карточек.'

const PREDICTION_HISTORY_WINDOW_TWO_YEARS_DESCRIPTION =
    '2 года — показывает последние два года ленты прогнозов.\n\nЭто компромисс между свежестью и глубиной: уже видно смену рыночных режимов, но экран ещё не перегружается всей историей.\n\nЧисла выше по странице не пересчитываются: меняется только видимый диапазон дат и карточек.'

const PREDICTION_HISTORY_WINDOW_ALL_DESCRIPTION =
    'Вся история — показывает всю доступную историю прогнозов по выбранному режиму обучения.\n\nЭтот режим нужен, когда важно увидеть полную хронологию карточек без обрезания по более старым датам.\n\nЧисла выше по странице не пересчитываются: страница просто перестаёт скрывать более ранние дни.'

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

export function buildMegaHistoryControlGroup({
    value,
    onChange,
    availableValues,
    splitStats
}: BuildMegaHistoryControlGroupArgs): ReportViewControlGroup<PolicyBranchMegaHistoryMode> {
    const defaultHistoryValues: PolicyBranchMegaHistoryMode[] = ['full_history', 'oos', 'recent']
    const allowedValues = new Set<PolicyBranchMegaHistoryMode>(availableValues ?? defaultHistoryValues)
    const allOptions: Array<{ value: PolicyBranchMegaHistoryMode; label: string }> = [
        { value: 'full_history', label: 'Вся история' },
        { value: 'oos', label: 'OOS' },
        { value: 'recent', label: 'Хвост OOS' }
    ]
    const options = allOptions.filter(option => allowedValues.has(option.value))

    return {
        key: 'mega-history',
        label: 'Срез истории',
        infoTooltip: buildMegaHistorySliceDescription(splitStats),
        value,
        options,
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
    infoTooltip = TP_SL_MODE_DESCRIPTION,
    infoTooltipAppendix
}: BuildMegaTpSlControlGroupArgs): ReportViewControlGroup<PolicyBranchMegaTpSlMode> {
    const resolvedInfoTooltip = infoTooltipAppendix
        ? `${infoTooltip}\n\n${infoTooltipAppendix}`
        : infoTooltip

    return {
        key: 'mega-tpsl',
        label,
        ariaLabel,
        infoTooltip: resolvedInfoTooltip,
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

function buildModelStatsSegmentDescription(splitStats?: CurrentPredictionBackfilledTrainingScopeStats | null): string {
    if (!splitStats) {
        return 'Сегмент данных — выбор участка истории модели для сравнения.\n\nFULL показывает 100% завершённой истории.\n\nTRAIN показывает обучающую часть перед базовым OOS: правило пары читается как 70% Train и 30% OOS.\n\nOOS показывает базовый пользовательский хвост новых дней: 30% полной истории.\n\nRECENT показывает короткий пользовательский хвост: 15% полной истории внутри OOS.\n\nКак читать:\nсравнение сегментов помогает увидеть, где качество держится на новых днях, а где остаётся только на знакомой истории.'
    }

    const trainPercent = resolveComplementTrainingScopePercent(splitStats.oosHistoryDaySharePercent)

    return `Сегмент данных — выбор участка истории модели для сравнения.

FULL показывает 100% завершённой истории. Сейчас это ${formatTrainingScopeCount(splitStats.fullDays, 'день', 'дня', 'дней')}.

TRAIN показывает обучающую часть перед базовым OOS. Правило пары читается как ${formatTrainingScopePercent(trainPercent)} Train и ${formatTrainingScopePercent(splitStats.oosHistoryDaySharePercent)} OOS. Сейчас это ${formatTrainingScopeCount(splitStats.trainDays, 'день', 'дня', 'дней')}.

OOS показывает базовый пользовательский хвост новых дней: ${formatTrainingScopePercent(splitStats.oosHistoryDaySharePercent)} полной истории. Сейчас это ${formatTrainingScopeCount(splitStats.oosDays, 'день', 'дня', 'дней')}.

RECENT показывает короткий пользовательский хвост: ${formatTrainingScopePercent(splitStats.recentHistoryDaySharePercent)} полной истории внутри OOS. Сейчас это ${formatTrainingScopeCount(splitStats.recentDays, 'день', 'дня', 'дней')}.

Как читать:
сравнение сегментов помогает увидеть, где качество держится на новых днях, а где остаётся только на знакомой истории.`
}

export function buildModelStatsSegmentControlGroup({
    value,
    onChange,
    splitStats
}: BuildModelStatsSegmentControlGroupArgs): ReportViewControlGroup<ModelStatsSegmentControlValue> {
    return {
        key: 'model-stats-segment',
        label: 'Сегмент данных',
        infoTooltip: buildModelStatsSegmentDescription(splitStats),
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
            'Режим представления — выбор глубины отчёта model-stats.\n\nBUSINESS оставляет основные таблицы и ключевые метрики.\n\nTECHNICAL добавляет более подробные таблицы и служебные детали модели.\n\nКак читать:\nBUSINESS нужен для быстрого вывода по качеству, TECHNICAL — для разбора причин и различий между моделями.',
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

export function buildSelectionControlGroup<TValue extends string>({
    key,
    label,
    value,
    options,
    onChange,
    ariaLabel,
    infoTooltip,
    infoTooltipExcludeTerms,
    infoTooltipExcludeRuleIds
}: BuildSelectionControlGroupArgs<TValue>): ReportViewControlGroup<TValue> {
    return {
        key,
        label,
        ariaLabel,
        infoTooltip,
        infoTooltipExcludeTerms,
        infoTooltipExcludeRuleIds,
        value,
        options,
        onChange
    }
}

export function buildTrainingScopeControlGroup({
    value,
    onChange,
    label = 'Срез данных',
    ariaLabel,
    infoTooltip,
    splitStats,
    scopes = DEFAULT_CURRENT_PREDICTION_SCOPE_ORDER
}: BuildTrainingScopeControlGroupArgs): ReportViewControlGroup<CurrentPredictionTrainingScope> {
    const trainingScopeOverviewDescription = infoTooltip ?? buildTrainingScopeControlOverviewDescription(splitStats)
    const uniqueScopes = Array.from(new Set(scopes))
    if (uniqueScopes.length === 0) {
        throw new Error('[training-scope] At least one scope option must be provided.')
    }

    return {
        key: 'training-scope',
        label,
        ariaLabel,
        infoTooltip: trainingScopeOverviewDescription,
        value,
        options: uniqueScopes.map(scope => ({
            value: scope,
            label: resolveCurrentPredictionTrainingScopeMeta(scope).label,
            tooltip: resolveCurrentPredictionTrainingScopeMeta(scope, splitStats).hint
        })),
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
