import { useCallback, useMemo } from 'react'
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
    buildTrainingScopeControlGroup,
    renderTermTooltipRichText
} from '@/shared/ui'
import { enrichTermTooltipDescription, renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import type { KeyValueSectionDto, TableSectionDto } from '@/shared/types/report.types'
import { ReportTableCard } from '@/shared/ui/ReportTableCard'
import {
    resolveBacktestConfidenceRiskScope,
    useBacktestConfidenceRiskReportQuery
} from '@/shared/api/tanstackQueries/backtestConfidenceRisk'
import {
    useCurrentPredictionBackfilledTrainingScopeStatsQuery,
    type CurrentPredictionBackfilledTrainingScopeStats
} from '@/shared/api/tanstackQueries/currentPrediction'
import {
    buildPublishedReportVariantCompatibleOptions,
    resolvePublishedReportVariantSelection,
    usePublishedReportVariantCatalogQuery,
    PUBLISHED_REPORT_VARIANT_FAMILIES
} from '@/shared/api/tanstackQueries/reportVariants'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'
import type { CurrentPredictionTrainingScope } from '@/shared/api/endpoints/reportEndpoints'
import { resolveReportSourceEndpoint } from '@/shared/utils/reportSourceEndpoint'
import { pruneDuplicatePolicyMarginColumns } from '@/shared/utils/reportPolicyMarginMode'
import cls from './ConfidenceRiskPage.module.scss'
import type { ConfidenceRiskPageProps } from './types'
import { PageDataState, PageSectionDataState } from '@/shared/ui/errors/PageDataState'

interface ConfidenceRiskTerm {
    key: string
    title: string
    description: string
    tooltip: string
    aliases: readonly string[]
}

type ConfidenceRiskUiLocale = 'ru' | 'en'

interface ConfidenceRiskTermTemplate {
    key: string
    title: string
    aliases?: readonly string[]
}

interface ConfidenceBucketOption {
    value: string
    label: string
}

const TERMS_TABLE_TEMPLATES: readonly ConfidenceRiskTermTemplate[] = [
    { key: 'Split', title: 'Split' },
    { key: 'Bucket', title: 'Bucket' },
    { key: 'ConfidenceFrom%', title: 'ConfidenceFrom%', aliases: ['ConfFrom%'] },
    { key: 'ConfidenceTo%', title: 'ConfidenceTo%', aliases: ['ConfTo%'] },
    { key: 'Days', title: 'Days' },
    { key: 'TradeDays', title: 'TradeDays' },
    { key: 'TradeRate%', title: 'TradeRate%' },
    { key: 'ConfidenceAvg%', title: 'ConfidenceAvg%', aliases: ['ConfAvg%'] },
    { key: 'MFE_Avg%', title: 'MFE_Avg%' },
    { key: 'MFE_P50%', title: 'MFE_P50%' },
    { key: 'MFE_P90%', title: 'MFE_P90%' },
    { key: 'MAE_Avg%', title: 'MAE_Avg%' },
    { key: 'MAE_P50%', title: 'MAE_P50%' },
    { key: 'MAE_P90%', title: 'MAE_P90%' },
    { key: 'TakeProfitReach%', title: 'TakeProfitReach%', aliases: ['TP_Reach%'] },
    { key: 'StopLossReach%', title: 'StopLossReach%', aliases: ['SL_Reach%'] },
    { key: 'WinRate%', title: 'WinRate%' }
]

const TERMS_CONFIG_TEMPLATES: readonly ConfidenceRiskTermTemplate[] = [
    { key: 'Source', title: 'Source' },
    { key: 'ConfidenceMin', title: 'ConfidenceMin', aliases: ['ConfMin'] },
    { key: 'ConfidenceMax', title: 'ConfidenceMax', aliases: ['ConfMax'] },
    { key: 'ConfidenceBucketRange', title: 'ConfidenceBucketRange', aliases: ['BucketRange'] },
    { key: 'DailyTpPct', title: 'DailyTpPct' },
    { key: 'DailyStopPct', title: 'DailyStopPct' },
    { key: 'CapFractionMultiplier', title: 'CapFractionMultiplier', aliases: ['CapMultiplier'] },
    { key: 'TakeProfitMultiplier', title: 'TakeProfitMultiplier', aliases: ['TpMultiplier'] },
    { key: 'StopLossMultiplier', title: 'StopLossMultiplier', aliases: ['SlMultiplier'] },
    { key: 'CapFractionClamp', title: 'CapFractionClamp', aliases: ['CapClamp'] },
    { key: 'TakeProfitClamp', title: 'TakeProfitClamp', aliases: ['TpClamp'] },
    { key: 'StopLossClamp', title: 'StopLossClamp', aliases: ['SlClamp'] },
    { key: 'ApplyToDynamicPolicies', title: 'ApplyToDynamicPolicies' },
    { key: 'ExcludedDays', title: 'ExcludedDays' },
    { key: 'RecentDays', title: 'RecentDays' }
]

const DEFAULT_CONFIDENCE_SCOPE: CurrentPredictionTrainingScope = 'full'
const DEFAULT_CONFIDENCE_BUCKET = 'all'

function resolveConfidenceRiskUiLocale(language: string): ConfidenceRiskUiLocale {
    return language.toLowerCase().startsWith('ru') ? 'ru' : 'en'
}

function buildConfidenceRiskTerm(
    template: ConfidenceRiskTermTemplate,
    locale: ConfidenceRiskUiLocale,
    resolver: (key: string, locale: ConfidenceRiskUiLocale) => string | null,
    scope: 'table' | 'config'
): ConfidenceRiskTerm {
    const description = resolver(template.key, locale)

    if (!description) {
        throw new Error(`[confidence-risk] full ${scope} term description is missing: ${template.key}.`)
    }

    return {
        key: template.key,
        title: template.title,
        description,
        tooltip: description,
        aliases: template.aliases ?? []
    }
}

function buildConfidenceRiskTermLookup(
    terms: readonly ConfidenceRiskTerm[],
    tokenSelector: (term: ConfidenceRiskTerm) => readonly string[]
): ReadonlyMap<string, ConfidenceRiskTerm> {
    // Карта сводит допустимые токены одного и того же поля к одному описанию термина.
    const lookup = new Map<string, ConfidenceRiskTerm>()

    terms.forEach(term => {
        tokenSelector(term).forEach(token => {
            lookup.set(token, term)
        })
    })

    return lookup
}

function formatConfidenceRiskScopeDays(value: number, locale: ConfidenceRiskUiLocale): string {
    const formatted = new Intl.NumberFormat(locale === 'ru' ? 'ru-RU' : 'en-US').format(value)

    if (locale !== 'ru') {
        return `${formatted} days`
    }

    const absValue = Math.abs(value) % 100
    const lastDigit = absValue % 10

    if (absValue >= 11 && absValue <= 19) {
        return `${formatted} дней`
    }

    if (lastDigit === 1) {
        return `${formatted} день`
    }

    if (lastDigit >= 2 && lastDigit <= 4) {
        return `${formatted} дня`
    }

    return `${formatted} дней`
}

function buildConfidenceRiskScopeBreakdown(
    locale: ConfidenceRiskUiLocale,
    splitStats?: CurrentPredictionBackfilledTrainingScopeStats | null
): string {
    if (!splitStats) {
        return locale === 'ru' ?
                '1) [[landing-all-history|Full]] = 100% завершённой истории.\n2) [[train-segment|Train]] = более ранние 70% полной истории перед базовым [[landing-oos|OOS]] 30%.\n3) [[landing-oos|OOS]] = последние 30% полной истории.\n4) [[landing-recent-tail-history|Recent]] = последние 15% полной истории внутри [[landing-oos|OOS]] 30%.'
            :   '1) [[landing-all-history|Full]] = 100% of completed history.\n2) [[train-segment|Train]] = the earlier 70% of full history before the base [[landing-oos|OOS]] 30%.\n3) [[landing-oos|OOS]] = the latest 30% of full history.\n4) [[landing-recent-tail-history|Recent]] = the latest 15% of full history inside [[landing-oos|OOS]] 30%.'
    }

    return locale === 'ru' ?
            `1) [[landing-all-history|Full]] = 100% завершённой истории. Сейчас это ${formatConfidenceRiskScopeDays(splitStats.fullDays, locale)}.\n2) [[train-segment|Train]] = более ранние 70% полной истории перед базовым [[landing-oos|OOS]] 30%. Сейчас это ${formatConfidenceRiskScopeDays(splitStats.trainDays, locale)}.\n3) [[landing-oos|OOS]] = последние 30% полной истории. Сейчас это ${formatConfidenceRiskScopeDays(splitStats.oosDays, locale)}.\n4) [[landing-recent-tail-history|Recent]] = последние 15% полной истории внутри [[landing-oos|OOS]] 30%. Сейчас это ${formatConfidenceRiskScopeDays(splitStats.recentDays, locale)}.`
        :   `1) [[landing-all-history|Full]] = 100% of completed history. This currently contains ${formatConfidenceRiskScopeDays(splitStats.fullDays, locale)}.\n2) [[train-segment|Train]] = the earlier 70% of full history before the base [[landing-oos|OOS]] 30%. This currently contains ${formatConfidenceRiskScopeDays(splitStats.trainDays, locale)}.\n3) [[landing-oos|OOS]] = the latest 30% of full history. This currently contains ${formatConfidenceRiskScopeDays(splitStats.oosDays, locale)}.\n4) [[landing-recent-tail-history|Recent]] = the latest 15% of full history inside [[landing-oos|OOS]] 30%. This currently contains ${formatConfidenceRiskScopeDays(splitStats.recentDays, locale)}.`
}

function resolveConfidenceRiskTableTermDescription(
    key: string,
    locale: ConfidenceRiskUiLocale,
    splitStats?: CurrentPredictionBackfilledTrainingScopeStats | null
): string | null {
    switch (key) {
        case 'Split':
            return locale === 'ru' ?
                    `Split — какой исторический срез сейчас показан в таблице.\n\nЧто показывает:\n${buildConfidenceRiskScopeBreakdown(locale, splitStats)}\n\nКак читать:\nэтот столбец нужен, чтобы не смешивать обучающую часть, базовый [[landing-oos|OOS]] 30% и короткий хвост [[landing-recent-tail-history|Recent]] 15% в одном выводе.\n\nПример:\nесли правило выглядит сильным на [[train-segment|Train]], но слабеет на [[landing-oos|OOS]], проблема сидит в переносе на новые дни, а не в confidence-bucket.`
                :   `Split is the history slice currently shown in the table.\n\nWhat it shows:\n${buildConfidenceRiskScopeBreakdown(locale, splitStats)}\n\nHow to read it:\nthis column prevents mixing the training part, the base [[landing-oos|OOS]] 30%, and the short [[landing-recent-tail-history|Recent]] 15% tail in one conclusion.\n\nExample:\nif a rule looks strong on [[train-segment|Train]] but weakens on [[landing-oos|OOS]], the problem sits in transfer to new days rather than in the confidence bucket itself.`
        case 'Bucket':
            return locale === 'ru' ?
                    'Bucket на этой странице означает [[confidence-bucket|confidence-bucket]], а не торговый [[bucket|Bucket]] исполнения.\n\nЧто показывает:\nстрока собирает дни с близким уровнем уверенности модели и считает по этой группе частоту входов, движение цены и достижение базовых TP/SL.\n\nКак читать:\nесли соседние confidence-bucket сильно различаются по WinRate% или MAE/MFE, именно уверенность модели связана с изменением качества входа.\n\nПример:\nbucket B07 и B08 могут лежать рядом по confidence, но уже давать разную частоту достижения тейк-профита.'
                :   'Bucket on this page means a [[confidence-bucket|confidence-bucket]], not an execution [[bucket|Bucket]].\n\nWhat it shows:\nrow statistics are grouped by similar confidence levels and then measured for trade frequency, price path, and base TP/SL reach.\n\nHow to read it:\nif neighboring confidence buckets behave very differently in WinRate% or MAE/MFE, model confidence is genuinely linked to execution quality.\n\nExample:\nB07 and B08 can look close in confidence but already show different take-profit reach behavior.'
        case 'ConfidenceFrom%':
            return locale === 'ru' ?
                    'ConfidenceFrom% — нижняя граница confidence-bucket в процентах.\n\nЧто показывает:\nона задаёт, с какого уровня уверенности дни начинают попадать в эту строку.\n\nКак читать:\nполе важно только в паре с ConfidenceTo%, потому что вместе они задают точный диапазон bucket.\n\nПример:\nConfidenceFrom%=58 означает, что в строку не попадают дни с уверенностью ниже 58%.'
                :   'ConfidenceFrom% is the lower confidence boundary of the bucket in percent.\n\nWhat it shows:\nit marks where the row starts accepting days by model confidence.\n\nHow to read it:\nthis field only makes sense together with ConfidenceTo%, because both numbers define the exact bucket range.\n\nExample:\nConfidenceFrom%=58 means the row excludes days below 58% confidence.'
        case 'ConfidenceTo%':
            return locale === 'ru' ?
                    'ConfidenceTo% — верхняя граница confidence-bucket в процентах.\n\nЧто показывает:\nона задаёт, до какого уровня уверенности включительно дни относятся к этой строке.\n\nКак читать:\nвместе с ConfidenceFrom% поле показывает ширину bucket и помогает понять, насколько грубо или тонко нарезана статистика.\n\nПример:\nесли ConfidenceFrom%=58 и ConfidenceTo%=62, строка описывает только этот узкий диапазон уверенности.'
                :   'ConfidenceTo% is the upper confidence boundary of the bucket in percent.\n\nWhat it shows:\nit marks how far the row extends before the next confidence bucket begins.\n\nHow to read it:\ntogether with ConfidenceFrom% it shows how narrow or wide the bucket statistics really are.\n\nExample:\nif ConfidenceFrom%=58 and ConfidenceTo%=62, the row describes only that narrow confidence band.'
        case 'Days':
            return locale === 'ru' ?
                    'Days — сколько всего дней попало в confidence-bucket.\n\nЧто показывает:\nсюда входят не только дни с фактическим входом, но и дни без направления или без сделки, если их confidence попала в тот же диапазон.\n\nКак читать:\nDays — это статистическая база bucket. Чем она меньше, тем осторожнее нужно читать проценты рядом.\n\nПример:\nDays=18 делает WinRate% куда менее устойчивым, чем Days=420.'
                :   'Days is the total number of days that entered the confidence bucket.\n\nWhat it shows:\nit includes not only executed trade days, but also no-direction or no-trade days if their confidence belongs to the same range.\n\nHow to read it:\nDays is the statistical base of the bucket. The smaller it is, the more fragile the neighboring percentages become.\n\nExample:\nDays=18 makes WinRate% much less stable than Days=420.'
        case 'TradeDays':
            return locale === 'ru' ?
                    'TradeDays — сколько дней внутри bucket вообще дошли до направленного торгового сценария.\n\nЧто показывает:\nсюда попадают только дни, где был хотя бы рабочий directional-кандидат, а не просто любой день из диапазона confidence.\n\nКак читать:\nесли TradeDays сильно меньше Days, этот bucket часто остаётся без реального торгового входа даже при похожей уверенности.\n\nПример:\nDays=300 и TradeDays=90 означают, что большая часть дней bucket не превращается в directional setup.'
                :   'TradeDays is how many days inside the bucket actually reached a directional trading setup.\n\nWhat it shows:\nit counts only days that produced a workable directional candidate rather than every day inside the confidence range.\n\nHow to read it:\nif TradeDays is far below Days, this bucket often stays without a real tradeable direction despite similar confidence.\n\nExample:\nDays=300 and TradeDays=90 mean most days in the bucket never became a directional setup.'
        case 'TradeRate%':
            return locale === 'ru' ?
                    'TradeRate% — доля TradeDays от всех Days внутри confidence-bucket.\n\nЧто показывает:\nметрика отвечает на вопрос, как часто этот уровень уверенности вообще доводит день до направленного торгового сценария.\n\nКак читать:\nвысокий TradeRate% означает, что bucket чаще приводит к рабочему входу, а низкий — что эта уверенность часто остаётся без сделки.\n\nФормула:\nTradeDays / Days * 100.'
                :   'TradeRate% is the share of TradeDays out of all Days inside the confidence bucket.\n\nWhat it shows:\nit answers how often this confidence level actually leads to a directional trading setup.\n\nHow to read it:\na high TradeRate% means the bucket more often converts into a workable entry, while a low value means many days stop before trade execution.\n\nFormula:\nTradeDays / Days * 100.'
        case 'ConfidenceAvg%':
            return locale === 'ru' ?
                    'ConfidenceAvg% — средняя уверенность модели внутри текущего confidence-bucket.\n\nЧто показывает:\nэто не граница bucket, а фактический средний уровень уверенности по дням, которые попали в строку.\n\nКак читать:\nесли среднее смещено ближе к верхней или нижней границе, bucket использовался неравномерно и соседние buckets стоит сравнивать внимательнее.'
                :   'ConfidenceAvg% is the average model confidence inside the current confidence bucket.\n\nWhat it shows:\nit is not a bucket boundary, but the realized mean confidence of the days that landed in the row.\n\nHow to read it:\nif the mean sits close to one boundary, the bucket is populated unevenly and neighboring buckets should be compared more carefully.'
        case 'MFE_Avg%':
            return locale === 'ru' ?
                    'MFE_Avg% — средний лучший ход цены после входа в сделку, то есть насколько далеко рынок успевал уйти в прибыльную сторону до конца торгового окна.\n\nЧто показывает:\nдля [[position|LONG]] это значит, насколько высоко цена успевала подняться выше цены входа; для [[position|SHORT]] — насколько глубоко цена успевала опуститься ниже цены входа. Метрика смотрит не на фактический выход, а на лучший момент внутри дня, который рынок вообще давал позиции.\n\nКак читать:\nрост MFE_Avg% означает, что этот confidence-bucket чаще даёт рабочее пространство в пользу сделки. Но сам по себе средний рост ещё не гарантирует устойчивый результат: его нужно сопоставлять с типичным движением и с ценой риска по MAE.\n\nПример:\nMFE_Avg%=2.4 означает, что после входа рынок в среднем успевал проходить около 2.4% в прибыльную сторону от цены входа, даже если сделка потом закрывалась раньше или по другому сценарию.'
                :   'MFE_Avg% is the average best price move after entry, meaning how far the market managed to travel into profit before the trading window ended.\n\nWhat it shows:\nfor a [[position|LONG]] trade, it shows how high price managed to rise above the entry; for a [[position|SHORT]] trade, it shows how far price managed to fall below the entry. The metric does not look at the actual exit. It looks at the best intraday point the market offered to the position.\n\nHow to read it:\na rising MFE_Avg% means this confidence bucket more often gives usable room in favor of the trade. But the average alone is not enough: it still has to be compared with typical behavior and with MAE as the path cost.\n\nExample:\nMFE_Avg%=2.4 means that after entry the market managed to travel about 2.4% in the profitable direction from the entry price on average, even if the trade later exited earlier or by another path.'
        case 'MFE_P50%':
            return locale === 'ru' ?
                    'MFE_P50% — медианный максимум благоприятного движения внутри дня.\n\nЧто показывает:\nэто типичное, а не экстремальное значение MFE для bucket.\n\nКак читать:\nесли MFE_Avg% сильно выше MFE_P50%, результат bucket тянут несколько очень сильных дней, а не типичная картина.'
                :   'MFE_P50% is the median maximum favorable move inside the day.\n\nWhat it shows:\nit is the typical MFE value of the bucket rather than the tail average.\n\nHow to read it:\nif MFE_Avg% sits far above MFE_P50%, a few very strong days are pulling the bucket upward instead of the typical case.'
        case 'MFE_P90%':
            return locale === 'ru' ?
                    'MFE_P90% — верхний хвост благоприятного внутридневного движения.\n\nЧто показывает:\nэто уровень, который достигают только самые сильные примерно 10% наблюдений bucket.\n\nКак читать:\nметрика нужна, чтобы отделить обычный ход в пользу сделки от редких особенно сильных импульсов.'
                :   'MFE_P90% is the upper tail of favorable intraday movement.\n\nWhat it shows:\nit marks the level reached only by the strongest roughly 10% of bucket observations.\n\nHow to read it:\nthis metric separates ordinary in-favor movement from rare unusually strong impulse days.'
        case 'MAE_Avg%':
            return locale === 'ru' ?
                    'MAE_Avg% — средний худший ход цены после входа в сделку, то есть насколько далеко рынок успевал уйти в убыточную сторону до конца торгового окна.\n\nЧто показывает:\nдля [[position|LONG]] это значит, насколько глубоко цена успевала опуститься ниже цены входа; для [[position|SHORT]] — насколько высоко цена успевала подняться выше цены входа. Метрика смотрит не на итоговый результат дня, а на самый болезненный момент пути цены внутри дня.\n\nКак читать:\nрост MAE_Avg% означает, что даже дни с правильным направлением чаще проходят через более болезненный путь цены. Тогда точность сигнала приходится оплачивать более тяжёлой просадкой внутри дня.\n\nПример:\nMAE_Avg%=1.8 означает, что после входа рынок в среднем успевал проходить около 1.8% в убыточную сторону от цены входа, прежде чем день завершался.'
                :   'MAE_Avg% is the average worst price move after entry, meaning how far the market managed to travel into loss before the trading window ended.\n\nWhat it shows:\nfor a [[position|LONG]] trade, it shows how far price managed to fall below the entry; for a [[position|SHORT]] trade, it shows how far price managed to rise above the entry. The metric does not describe the final day result. It captures the most painful intraday point along the path.\n\nHow to read it:\na rising MAE_Avg% means even directionally correct days more often go through a more painful path against the trade. In that case signal accuracy is being paid for by a heavier intraday drawdown.\n\nExample:\nMAE_Avg%=1.8 means that after entry the market managed to move about 1.8% in the loss direction from the entry price on average before the day finished.'
        case 'MAE_P50%':
            return locale === 'ru' ?
                    'MAE_P50% — медианный максимум неблагоприятного движения.\n\nЧто показывает:\nэто типичная глубина adverse-движения для bucket, а не отдельные экстремумы.\n\nКак читать:\nесли медиана already высока, проблема bucket не в нескольких хвостовых днях, а в обычной траектории сделки.'
                :   'MAE_P50% is the median maximum adverse move.\n\nWhat it shows:\nit is the typical adverse depth of the bucket rather than a few isolated extremes.\n\nHow to read it:\nif the median is already high, the bucket problem sits in the normal trade path rather than in just a few tail days.'
        case 'MAE_P90%':
            return locale === 'ru' ?
                    'MAE_P90% — верхний хвост неблагоприятного движения против позиции.\n\nЧто показывает:\nэто уровень worst-case adverse path для самых тяжёлых примерно 10% наблюдений bucket.\n\nКак читать:\nрост MAE_P90% означает, что хвост риска в этом диапазоне уверенности становится заметно тяжелее среднего.'
                :   'MAE_P90% is the upper tail of the adverse move against the position.\n\nWhat it shows:\nit is the worst-case adverse path level for the heaviest roughly 10% of bucket observations.\n\nHow to read it:\nrising MAE_P90% means the tail risk of this confidence range becomes materially heavier than the average case.'
        case 'TakeProfitReach%':
            return locale === 'ru' ?
                    'TakeProfitReach% — как часто движение дня вообще доходило до базового [[tp-sl|take-profit]] из конфига.\n\nЧто показывает:\nметрика отвечает только на вопрос достижимости этого уровня внутри дня. Она не говорит, что сделка реально закрылась по тейк-профиту, потому что раньше могли сработать другие правила выхода.\n\nКак читать:\nвысокий TakeProfitReach% показывает, что bucket чаще даёт достаточный ход в пользу сделки для базовой цели по прибыли. Но без сравнения со [[StopLossReach%|StopLossReach%]] не видно, какой ценой этот ход достаётся.\n\nПример:\nTakeProfitReach%=68 означает, что примерно в 68 из 100 дней траектория цены хотя бы один раз доходила до базового тейк-профита, даже если итоговый выход потом был другим.'
                :   'TakeProfitReach% shows how often the day path reached the base [[tp-sl|take-profit]] from the config.\n\nWhat it shows:\nit only answers whether that level became reachable during the day. It does not say the trade actually exited by take-profit, because another exit rule may have triggered earlier.\n\nHow to read it:\na high TakeProfitReach% means this bucket more often offers enough favorable room to reach the baseline profit target. But without comparing it to [[StopLossReach%|StopLossReach%]], the path cost of that room is still hidden.\n\nExample:\nTakeProfitReach%=68 means that in about 68 out of 100 days the price path touched the baseline take-profit at least once, even if the final exit was different.'
        case 'StopLossReach%':
            return locale === 'ru' ?
                    'StopLossReach% — как часто движение дня доходило до базового [[tp-sl|stop-loss]] из конфига.\n\nЧто показывает:\nэто не обязательно реальный выход по стоп-лоссу. Метрика показывает, что внутри дня траектория цены хотя бы раз заходила в зону, где базовая защита уже должна была бы сработать.\n\nКак читать:\nрост StopLossReach% означает, что bucket чаще проходит через болезненный путь цены против позиции. Если показатель растёт вместе с [[TakeProfitReach%|TakeProfitReach%]], день даёт и ход в пользу сделки, и заметную цену риска.\n\nПример:\nStopLossReach%=41 означает, что примерно в 41 из 100 дней рынок хотя бы один раз доходил до базового стоп-лосса.'
                :   'StopLossReach% shows how often the day path reached the base [[tp-sl|stop-loss]] from the config.\n\nWhat it shows:\nit is not necessarily an actual stop-loss exit. The metric shows that the intraday path entered the zone where the baseline protection would already have fired.\n\nHow to read it:\na rising StopLossReach% means the bucket more often goes through a painful path against the position. If it rises together with [[TakeProfitReach%|TakeProfitReach%]], the day offers both favorable room and a visible risk cost.\n\nExample:\nStopLossReach%=41 means that in about 41 out of 100 days the market touched the baseline stop-loss at least once.'
        case 'WinRate%':
            return locale === 'ru' ?
                    'WinRate% — доля дней с фактическим входом, где направление сигнала оказалось верным.\n\nЧто показывает:\nэто частота правильного направления внутри текущего confidence-bucket без учёта размера позиции и без оценки того, насколько тяжёлым был путь цены до правильного исхода.\n\nКак читать:\nвысокий WinRate% сам по себе не делает bucket хорошим. Его нужно сопоставлять с MFE, MAE, [[TakeProfitReach%|TakeProfitReach%]] и [[StopLossReach%|StopLossReach%]], чтобы понять цену такой точности.\n\nПример:\nWinRate%=72 означает, что примерно в 72 из 100 дней с реальным входом направление сделки оказалось верным, но это ещё не говорит, насколько болезненным был путь до этого результата.'
                :   'WinRate% is the share of executed-trade days where the signal direction was correct.\n\nWhat it shows:\nit is the directional hit rate of the current confidence bucket without stake sizing and without saying how painful the path was before reaching the correct outcome.\n\nHow to read it:\na high WinRate% alone does not make the bucket good. It has to be read together with MFE, MAE, [[TakeProfitReach%|TakeProfitReach%]], and [[StopLossReach%|StopLossReach%]] to understand the cost of that accuracy.\n\nExample:\nWinRate%=72 means that in about 72 out of 100 executed-trade days the trade direction was correct, but it still says nothing about how painful the path was before getting there.'
        default:
            return null
    }
}

function resolveConfidenceRiskConfigTermDescription(
    key: string,
    locale: ConfidenceRiskUiLocale,
    splitStats?: CurrentPredictionBackfilledTrainingScopeStats | null
): string | null {
    switch (key) {
        case 'Source':
            return locale === 'ru' ?
                    'Source — какой слой вероятностей используется для bucket-статистики: [[current-prediction-daily-layer|Daily]], Day + [[landing-micro-model|Micro]] или финальный Total.\n\nЧто показывает:\nот этого выбора зависит, на какой именно уверенности строятся confidence-bucket и какие дни попадают в каждый диапазон.\n\nКак читать:\nесли при смене Source buckets начинают вести себя по-другому, причина сидит не в исполнении сделки, а в том, какой слой прогноза даёт уверенность.'
                :   'Source defines which probability layer drives the confidence-bucket statistics: [[current-prediction-daily-layer|Daily]], Day + [[landing-micro-model|Micro]], or the final Total layer.\n\nWhat it shows:\nit controls which confidence values are bucketed and therefore which days enter each range.\n\nHow to read it:\nif bucket behavior changes after switching Source, the difference comes from the confidence layer itself rather than from trade execution.'
        case 'ConfidenceMin':
            return locale === 'ru' ?
                    'ConfidenceMin — нижняя рабочая граница уверенности для линейной шкалы dynamic-настроек.\n\nЧто показывает:\nниже этого порога система перестаёт дальше уменьшать множители и использует минимальный рабочий уровень.\n\nКак читать:\nэто нижняя точка интервала, внутри которого уверенность реально влияет на размер ставки, TP и SL.'
                :   'ConfidenceMin is the lower working confidence bound of the linear scaling used by dynamic settings.\n\nWhat it shows:\nbelow this threshold the engine stops decreasing multipliers further and stays at the minimum working level.\n\nHow to read it:\nit is the lower edge of the interval where confidence still actively changes stake, TP, and SL.'
        case 'ConfidenceMax':
            return locale === 'ru' ?
                    'ConfidenceMax — верхняя рабочая граница уверенности для dynamic-масштабирования.\n\nЧто показывает:\nвыше этого порога множители уже не растут дальше и считаются достигшими максимума.\n\nКак читать:\nConfidenceMax нужен, чтобы очень высокая уверенность не разгоняла риск бесконечно.'
                :   'ConfidenceMax is the upper working confidence bound of dynamic scaling.\n\nWhat it shows:\nabove this threshold multipliers stop growing and are treated as already capped.\n\nHow to read it:\nConfidenceMax prevents extremely high confidence from inflating risk without a ceiling.'
        case 'ConfidenceBucketRange':
            return locale === 'ru' ?
                    'ConfidenceBucketRange — диапазон confidence-bucket и их рабочая ширина.\n\nЧто показывает:\nполе задаёт, откуда начинается нарезка confidence и насколько детально система делит историю на buckets.\n\nКак читать:\nузкие buckets дают более точную, но более тонкую статистику; широкие buckets грубее, но устойчивее по числу наблюдений.'
                :   'ConfidenceBucketRange is the overall confidence-bucket span together with the bucket width.\n\nWhat it shows:\nit defines where confidence bucketing starts and how finely the history is partitioned.\n\nHow to read it:\nnarrow buckets give more precise but thinner statistics, while wide buckets are rougher but usually more stable by sample size.'
        case 'DailyTpPct':
            return locale === 'ru' ?
                    'DailyTpPct — базовый дневной [[tp-sl|take-profit]] из конфига.\n\nЧто показывает:\nэто исходная цель фиксации прибыли до любых dynamic-множителей и clamp-ограничений.\n\nКак читать:\nесли bucket часто достигает этот уровень, базовый тейк-профит для такого слоя уверенности выглядит достижимым.'
                :   'DailyTpPct is the base daily [[tp-sl|take-profit]] from the config.\n\nWhat it shows:\nit is the starting profit target before any dynamic multipliers or clamp limits are applied.\n\nHow to read it:\nif a bucket often reaches this level, the baseline take-profit looks achievable for that confidence layer.'
        case 'DailyStopPct':
            return locale === 'ru' ?
                    'DailyStopPct — базовый дневной [[tp-sl|stop-loss]] из конфига.\n\nЧто показывает:\nэто исходная защитная дистанция до всех dynamic-корректировок и clamp-ограничений.\n\nКак читать:\nесли bucket часто доходит до этого уровня, базовый стоп-лосс для такого confidence-слоя уже регулярно оказывается под давлением.'
                :   'DailyStopPct is the base daily [[tp-sl|stop-loss]] from the config.\n\nWhat it shows:\nit is the starting protective distance before any dynamic adjustments and clamp limits.\n\nHow to read it:\nif a bucket often reaches this level, the baseline stop-loss is regularly under pressure for that confidence layer.'
        case 'CapFractionMultiplier':
            return locale === 'ru' ?
                    'CapFractionMultiplier — диапазон множителя, которым dynamic-слой меняет [[cap-fraction|долю капитала на сделку]].\n\nЧто показывает:\nпри слабой и сильной уверенности система масштабирует базовый размер входа внутри этих границ.\n\nКак читать:\nэтот параметр отвечает не за направление сделки, а за то, насколько агрессивно bucket масштабирует ставку по уверенности.'
                :   'CapFractionMultiplier is the multiplier range used by the dynamic layer to rescale [[cap-fraction|capital share per trade]].\n\nWhat it shows:\nweak and strong confidence values move the base stake within these bounds.\n\nHow to read it:\nthis parameter is about risk sizing, not about trade direction.'
        case 'TakeProfitMultiplier':
            return locale === 'ru' ?
                    'TakeProfitMultiplier — диапазон множителя для [[tp-sl|take-profit]] поверх базового дневного уровня.\n\nЧто показывает:\nвнутри этих границ dynamic-слой делает цель по прибыли ближе или дальше в зависимости от confidence.\n\nКак читать:\nесли диапазон узкий, confidence слабее влияет на тейк-профит; если широкий, bucket сильнее меняет ожидание по ходу в пользу сделки.'
                :   'TakeProfitMultiplier is the multiplier range applied to the base [[tp-sl|take-profit]].\n\nWhat it shows:\ninside these bounds the dynamic layer moves the profit target closer or farther depending on confidence.\n\nHow to read it:\na narrow range means confidence has little effect on take-profit, while a wide range makes the target more adaptive.'
        case 'StopLossMultiplier':
            return locale === 'ru' ?
                    'StopLossMultiplier — диапазон множителя для [[tp-sl|stop-loss]] поверх базового дневного уровня.\n\nЧто показывает:\nчерез этот диапазон dynamic-слой делает защиту жёстче или мягче в зависимости от уверенности.\n\nКак читать:\nесли диапазон смещён вниз, bucket чаще режет риск; если вверх — чаще даёт стоп-лоссу больше пространства.'
                :   'StopLossMultiplier is the multiplier range applied to the base [[tp-sl|stop-loss]].\n\nWhat it shows:\nthrough this range the dynamic layer makes protection tighter or looser depending on confidence.\n\nHow to read it:\na range tilted downward cuts risk more often, while an upward tilt gives the stop more breathing room.'
        case 'CapFractionClamp':
            return locale === 'ru' ?
                    'CapFractionClamp — жёсткие нижняя и верхняя границы для итоговой [[cap-fraction|доли капитала на сделку]].\n\nЧто показывает:\nдаже если confidence-масштабирование хочет сделать ставку слишком маленькой или слишком большой, итог всё равно остаётся внутри этих пределов.\n\nКак читать:\nClamp защищает bucket от экстремального over-sizing и от слишком маленькой символической позиции.'
                :   'CapFractionClamp is the hard lower and upper bound for the final [[cap-fraction|capital share per trade]].\n\nWhat it shows:\neven if confidence scaling wants to push stake too low or too high, the final value stays inside these limits.\n\nHow to read it:\nthe clamp protects the bucket from extreme over-sizing and from symbolic under-sized entries.'
        case 'TakeProfitClamp':
            return locale === 'ru' ?
                    'TakeProfitClamp — жёсткие границы для итогового [[tp-sl|take-profit]] после всех расчётов.\n\nЧто показывает:\nэто финальная защита от нереалистично близкого или слишком далёкого тейк-профита.\n\nКак читать:\nClamp отделяет адаптивность от произвола: dynamic может сдвигать TP, но не за эти границы.'
                :   'TakeProfitClamp is the hard bound for the final [[tp-sl|take-profit]] after all calculations.\n\nWhat it shows:\nit is the final protection against unrealistically tight or too distant profit targets.\n\nHow to read it:\nthe clamp keeps dynamic behavior adaptive without letting TP drift into nonsense ranges.'
        case 'StopLossClamp':
            return locale === 'ru' ?
                    'StopLossClamp — жёсткие границы для итогового [[tp-sl|stop-loss]] после всех расчётов.\n\nЧто показывает:\nэто предельный рабочий диапазон, внутри которого stop-loss ещё считается допустимым для стратегии.\n\nКак читать:\nClamp не даёт dynamic-слою превратить stop-loss в шумовой или, наоборот, чрезмерно далёкий аварийный уровень.'
                :   'StopLossClamp is the hard bound for the final [[tp-sl|stop-loss]] after all calculations.\n\nWhat it shows:\nit defines the outer working range within which the stop-loss is still acceptable for the strategy.\n\nHow to read it:\nthe clamp stops the dynamic layer from turning stop-loss into either a noise-level stop or an excessively distant emergency level.'
        case 'ApplyToDynamicPolicies':
            return locale === 'ru' ?
                    'ApplyToDynamicPolicies — применяется ли confidence-динамика даже к тем [[policy|Policy]], которые уже сами умеют менять риск.\n\nЧто показывает:\nполе отвечает на вопрос, накладывается ли внешний confidence-слой поверх уже динамической Policy или такие политики оставляются как есть.\n\nКак читать:\nесли флаг включён, итоговый риск на странице может быть комбинацией внутренней динамики Policy и внешнего confidence-слоя.'
                :   'ApplyToDynamicPolicies tells whether confidence dynamics are also applied to [[policy|Policy]] variants that already adjust risk internally.\n\nWhat it shows:\nit answers whether the outer confidence layer is stacked on top of already dynamic policies or whether such policies are left untouched.\n\nHow to read it:\nwhen the flag is on, final risk can become a combination of internal policy dynamics and the external confidence layer.'
        case 'ExcludedDays':
            return locale === 'ru' ?
                    `ExcludedDays — сколько дней осталось за пределами выбранного Split.\n\nЧто показывает:\n1) Для [[landing-all-history|Full]] это число должно быть равно нулю, потому что режим использует все 100% завершённой истории.\n2) Для [[train-segment|Train]] excluded — это более новые 30%, которые ушли в [[landing-oos|OOS]].\n3) Для [[landing-oos|OOS]] excluded — это более ранние 70%, которые остались в [[train-segment|Train]].\n4) Для [[landing-recent-tail-history|Recent]] excluded — всё, что лежит вне короткого хвоста 15%.\n\nКак читать:\nполе показывает, насколько уже выбранный срез по сравнению с полной историей.${splitStats ? ` Сейчас published Full = ${formatConfidenceRiskScopeDays(splitStats.fullDays, locale)}, Train = ${formatConfidenceRiskScopeDays(splitStats.trainDays, locale)}, OOS = ${formatConfidenceRiskScopeDays(splitStats.oosDays, locale)}, Recent = ${formatConfidenceRiskScopeDays(splitStats.recentDays, locale)}.` : ''}`
                :   `ExcludedDays is how many days stay outside the selected Split.\n\nWhat it shows:\n1) For [[landing-all-history|Full]] this should be zero because the mode uses all 100% of completed history.\n2) For [[train-segment|Train]] excluded days are the newer 30% that moved into [[landing-oos|OOS]].\n3) For [[landing-oos|OOS]] excluded days are the earlier 70% that stayed in [[train-segment|Train]].\n4) For [[landing-recent-tail-history|Recent]] excluded days are everything outside the short 15% tail.\n\nHow to read it:\nthis field shows how much narrower the selected slice became relative to full history.${splitStats ? ` The current published sizes are Full = ${formatConfidenceRiskScopeDays(splitStats.fullDays, locale)}, Train = ${formatConfidenceRiskScopeDays(splitStats.trainDays, locale)}, OOS = ${formatConfidenceRiskScopeDays(splitStats.oosDays, locale)}, Recent = ${formatConfidenceRiskScopeDays(splitStats.recentDays, locale)}.` : ''}`
        case 'RecentDays':
            return locale === 'ru' ?
                    `RecentDays — сколько дней вошло в короткий пользовательский хвост [[landing-recent-tail-history|Recent]].\n\nЧто показывает:\n1) Это отдельный счётчик для режима последних 15% полной истории внутри более широкого [[landing-oos|OOS]] 30%.\n2) Поле показывает размер свежего окна, по которому считается RECENT без смешивания со всей историей.${splitStats ? `\n3) Сейчас published [[landing-recent-tail-history|Recent]] содержит ${formatConfidenceRiskScopeDays(splitStats.recentDays, locale)}.` : ''}\n\nКак читать:\nесли RECENT резко расходится с [[landing-all-history|Full]] или [[landing-oos|OOS]], это поле помогает понять, насколько коротким был свежий хвост наблюдений.`
                :   `RecentDays is how many days entered the short user [[landing-recent-tail-history|Recent]] tail.\n\nWhat it shows:\n1) It is a dedicated counter for the latest 15% of full history inside the wider [[landing-oos|OOS]] 30%.\n2) The field fixes the fresh window used by RECENT without mixing it with the whole history.${splitStats ? `\n3) The current published [[landing-recent-tail-history|Recent]] slice contains ${formatConfidenceRiskScopeDays(splitStats.recentDays, locale)}.` : ''}\n\nHow to read it:\nif RECENT diverges sharply from [[landing-all-history|Full]] or [[landing-oos|OOS]], this field helps explain how short the fresh observation tail really was.`
        default:
            return null
    }
}

function getTableTerm(title: string, tableTermMap: ReadonlyMap<string, ConfidenceRiskTerm>): ConfidenceRiskTerm {
    if (!title) {
        throw new Error('[confidence-risk] column title is empty.')
    }

    const term = tableTermMap.get(title)
    if (!term) {
        throw new Error(`[confidence-risk] unknown column term: ${title}`)
    }

    return term
}

function getConfigTerm(key: string, termsConfigMap: ReadonlyMap<string, ConfidenceRiskTerm>): ConfidenceRiskTerm {
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
    const tableSections = (sections ?? []).filter(
        (section): section is TableSectionDto =>
            Array.isArray((section as TableSectionDto).columns) && (section as TableSectionDto).columns!.length > 0
    )

    return pruneDuplicatePolicyMarginColumns(tableSections)
}

function buildKeyValueSections(sections: unknown[]): KeyValueSectionDto[] {
    return (sections ?? []).filter((section): section is KeyValueSectionDto =>
        Array.isArray((section as KeyValueSectionDto).items)
    )
}

export default function ConfidenceRiskPage({ className }: ConfidenceRiskPageProps) {
    const { t, i18n } = useTranslation('reports')
    const [searchParams, setSearchParams] = useSearchParams()
    const rawScopeQuery = searchParams.get('scope')
    const rawConfidenceBucketQuery = searchParams.get('confBucket')
    const variantCatalogQuery = usePublishedReportVariantCatalogQuery(
        PUBLISHED_REPORT_VARIANT_FAMILIES.backtestConfidenceRisk
    )
    const scopeState = useMemo(() => {
        try {
            return {
                value: resolveBacktestConfidenceRiskScope(rawScopeQuery),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to parse confidence-risk scope query.', {
                source: 'confidence-risk-scope-query',
                domain: 'ui_section',
                owner: 'confidence-risk-page',
                expected: 'Confidence-risk page should parse a valid training scope from URL params.',
                requiredAction: 'Inspect confidence-risk scope query and supported scope values.'
            })
            return {
                value: DEFAULT_CONFIDENCE_SCOPE,
                error: safeError
            }
        }
    }, [rawScopeQuery])
    const variantResolutionState = useMemo(() => {
        if (!variantCatalogQuery.data || scopeState.error) {
            return {
                value: null,
                error: scopeState.error
            }
        }

        try {
            return {
                value: resolvePublishedReportVariantSelection(variantCatalogQuery.data, {
                    scope: rawScopeQuery,
                    confBucket: rawConfidenceBucketQuery
                }),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to resolve confidence-risk report variant.', {
                source: 'confidence-risk-variant',
                domain: 'ui_section',
                owner: 'confidence-risk-page',
                expected: 'Confidence-risk page should resolve a catalog-compatible published report variant.',
                requiredAction: 'Inspect confidence-risk URL params and published variant catalog.'
            })
            return {
                value: null,
                error: safeError
            }
        }
    }, [rawConfidenceBucketQuery, rawScopeQuery, scopeState.error, variantCatalogQuery.data])
    const canLoadConfidenceRiskReport =
        Boolean(variantCatalogQuery.data) && !variantCatalogQuery.isError && !variantResolutionState.error
    const { data, isLoading, isError, error, refetch } = useBacktestConfidenceRiskReportQuery(
        {
            scope: canLoadConfidenceRiskReport ? variantResolutionState.value?.selection.scope ?? null : null,
            confidenceBucket:
                canLoadConfidenceRiskReport ? variantResolutionState.value?.selection.confBucket ?? null : null
        },
        {
            enabled: canLoadConfidenceRiskReport
        }
    )
    const trainingScopeStatsQuery = useCurrentPredictionBackfilledTrainingScopeStatsQuery()
    const termsLocale = useMemo(
        () => resolveConfidenceRiskUiLocale(i18n.resolvedLanguage ?? i18n.language),
        [i18n.language, i18n.resolvedLanguage]
    )

    const tableTerms = useMemo(
        () =>
            TERMS_TABLE_TEMPLATES.map(template =>
                buildConfidenceRiskTerm(
                    template,
                    termsLocale,
                    (key, locale) => resolveConfidenceRiskTableTermDescription(key, locale, trainingScopeStatsQuery.data ?? null),
                    'table'
                )
            ),
        [termsLocale, trainingScopeStatsQuery.data]
    )
    const tableTermMap = useMemo(
        () => buildConfidenceRiskTermLookup(tableTerms, term => [term.title, ...term.aliases]),
        [tableTerms]
    )

    const configTerms = useMemo(
        () =>
            TERMS_CONFIG_TEMPLATES.map(template =>
                buildConfidenceRiskTerm(
                    template,
                    termsLocale,
                    (key, locale) =>
                        resolveConfidenceRiskConfigTermDescription(key, locale, trainingScopeStatsQuery.data ?? null),
                    'config'
                )
            ),
        [termsLocale, trainingScopeStatsQuery.data]
    )
    const configTermsMap = useMemo(
        () => buildConfidenceRiskTermLookup(configTerms, term => [term.key, ...term.aliases]),
        [configTerms]
    )

    const tableSections = useMemo(() => buildTableSections(data?.sections ?? []), [data])
    const keyValueSections = useMemo(() => buildKeyValueSections(data?.sections ?? []), [data])
    const effectiveScope = useMemo(
        () =>
            variantResolutionState.value ?
                resolveBacktestConfidenceRiskScope(variantResolutionState.value.selection.scope)
            :   scopeState.value,
        [scopeState.value, variantResolutionState.value]
    )
    const scopeMetaState = useMemo(() => {
        try {
            return {
                value: resolveCurrentPredictionTrainingScopeMeta(effectiveScope, trainingScopeStatsQuery.data ?? null),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to resolve current prediction training scope metadata.', {
                source: 'confidence-risk-scope-meta',
                domain: 'ui_section',
                owner: 'confidence-risk-page',
                expected: 'Confidence-risk page should resolve training scope metadata for the selected scope.',
                requiredAction: 'Inspect current prediction training scope metadata registry.'
            })
            return {
                value: null,
                error: safeError
            }
        }
    }, [effectiveScope, trainingScopeStatsQuery.data])

    const sourceEndpointState = useMemo(() => {
        try {
            return {
                value: resolveReportSourceEndpoint(),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to resolve report source endpoint.', {
                source: 'confidence-risk-source-endpoint',
                domain: 'ui_section',
                owner: 'confidence-risk-page',
                expected: 'Confidence-risk page should resolve a non-empty report source endpoint.',
                requiredAction: 'Inspect API base URL configuration and report source endpoint resolver.'
            })
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

        if (variantCatalogQuery.isError) {
            return {
                options: [] as ConfidenceBucketOption[],
                error:
                    variantCatalogQuery.error ??
                    normalizeErrorLike(null, 'Failed to load confidence-risk catalog.', {
                        source: 'confidence-risk-catalog-query',
                        domain: 'ui_section',
                        owner: 'confidence-risk-page',
                        expected: 'Confidence-risk page should receive a published variant catalog or a detailed API error.',
                        requiredAction: 'Inspect confidence-risk catalog endpoint and response envelope.'
                    })
            }
        }

        if (!variantCatalogQuery.data || !variantResolutionState.value) {
            return {
                options: [] as ConfidenceBucketOption[],
                error: variantResolutionState.error
            }
        }

        try {
            return {
                options: buildPublishedReportVariantCompatibleOptions(
                    variantCatalogQuery.data,
                    variantResolutionState.value.selection,
                    'confBucket'
                ).map(option => ({
                    value: option.value,
                    label:
                        option.value === DEFAULT_CONFIDENCE_BUCKET ? t('confidenceRisk.filters.allBuckets') : option.label
                })),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to build confidence bucket options for selected scope.', {
                source: 'confidence-risk-bucket-options',
                domain: 'ui_section',
                owner: 'confidence-risk-page',
                expected: 'Confidence-risk page should build compatible confidence bucket options from the published catalog.',
                requiredAction: 'Inspect bucket option builder and the selected scope/variant.'
            })
            return {
                options: [] as ConfidenceBucketOption[],
                error: safeError
            }
        }
    }, [scopeState.error, t, variantCatalogQuery.data, variantCatalogQuery.error, variantCatalogQuery.isError, variantResolutionState.error, variantResolutionState.value])

    const confidenceBucketState = useMemo(() => {
        if (confidenceBucketOptionsState.error) {
            return {
                value: DEFAULT_CONFIDENCE_BUCKET,
                error: confidenceBucketOptionsState.error
            }
        }

        if (!variantResolutionState.value) {
            return {
                value: DEFAULT_CONFIDENCE_BUCKET,
                error: variantResolutionState.error
            }
        }

        return {
            value: variantResolutionState.value.selection.confBucket,
            error: null as Error | null
        }
    }, [confidenceBucketOptionsState.error, variantResolutionState.error, variantResolutionState.value])

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
                getConfigTerm(item.key, configTermsMap)
            })

            return { section, error: null }
        } catch (err) {
            const safeError = normalizeErrorLike(err, 'Failed to validate confidence risk config.', {
                source: 'confidence-risk-config',
                domain: 'ui_section',
                owner: 'confidence-risk-page',
                expected: 'Confidence-risk page should validate config items against known term metadata.',
                requiredAction: 'Inspect confidence-risk config section and term registry.'
            })
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
        const term = getTableTerm(title, tableTermMap)
        return renderTermTooltipTitle(title, term.tooltip)
    }

    const handleScopeChange = useCallback(
        (next: CurrentPredictionTrainingScope) => {
            if (next === effectiveScope) return
            const nextParams = new URLSearchParams(searchParams)
            nextParams.set('scope', next)
            nextParams.set('confBucket', DEFAULT_CONFIDENCE_BUCKET)
            setSearchParams(nextParams, { replace: true })
        },
        [effectiveScope, searchParams, setSearchParams]
    )

    const handleConfidenceBucketChange = useCallback(
        (next: string) => {
            if (next === confidenceBucketState.value) return
            const nextParams = new URLSearchParams(searchParams)
            nextParams.set('confBucket', next)
            setSearchParams(nextParams, { replace: true })
        },
        [confidenceBucketState.value, searchParams, setSearchParams]
    )
    const handleRetry = useCallback(() => {
        void variantCatalogQuery.refetch()
        void refetch()
    }, [refetch, variantCatalogQuery])

    const controlGroups = useMemo(() => {
        if (scopeMetaState.error || !scopeMetaState.value || confidenceBucketOptionsState.error) {
            return [] as ReportViewControlGroup[]
        }

        return [
            buildTrainingScopeControlGroup({
                value: effectiveScope,
                onChange: handleScopeChange,
                splitStats: trainingScopeStatsQuery.data ?? null
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
        handleConfidenceBucketChange,
        effectiveScope,
        handleScopeChange,
        scopeMetaState.error,
        scopeMetaState.value,
        trainingScopeStatsQuery.data,
    ])
    const controlsError =
        scopeState.error ??
        variantResolutionState.error ??
        scopeMetaState.error ??
        confidenceBucketOptionsState.error ??
        confidenceBucketState.error ??
        null
    const reportStateError =
        error ??
        (variantCatalogQuery.isError ?
            (variantCatalogQuery.error ??
                normalizeErrorLike(null, 'Failed to load confidence-risk catalog.', {
                    source: 'confidence-risk-catalog-query',
                    domain: 'ui_section',
                    owner: 'confidence-risk-page',
                    expected: 'Confidence-risk page should receive a published variant catalog or a detailed API error.',
                    requiredAction: 'Inspect confidence-risk catalog endpoint and response envelope.'
                }))
        :   null) ??
        generatedAtState.error ??
        sourceEndpointState.error ??
        null
    const hasReadyReport = Boolean(data && generatedAtState.value && sourceEndpointState.value)

    return (
        <div className={rootClassName}>
            <PageDataState
                shell={
                    <>
                        <header className={cls.hero}>
                            <div>
                                <Text type='h1' className={cls.heroTitle}>
                                    {t('confidenceRisk.page.title')}
                                </Text>
                                <Text className={cls.heroSubtitle}>{t('confidenceRisk.page.subtitle')}</Text>

                                <ReportViewControls groups={controlGroups} />
                                {scopeMetaState.value && <Text className={cls.scopeHint}>{scopeMetaState.value.hint}</Text>}
                                {controlsError && (
                                    <PageSectionDataState
                                        className={cls.termsBlock}
                                        isError
                                        error={controlsError}
                                        hasData={false}
                                        title={
                                            scopeState.error ? t('confidenceRisk.page.errors.scopeQuery.title')
                                            : scopeMetaState.error ?
                                                t('confidenceRisk.page.errors.scopeMeta.title')
                                            : confidenceBucketOptionsState.error ?
                                                t('confidenceRisk.page.errors.bucketOptions.title')
                                            :   t('confidenceRisk.page.errors.confBucketQuery.title')
                                        }
                                        description={
                                            scopeState.error ? t('confidenceRisk.page.errors.scopeQuery.message')
                                            : scopeMetaState.error ?
                                                t('confidenceRisk.page.errors.scopeMeta.message')
                                            : confidenceBucketOptionsState.error ?
                                                t('confidenceRisk.page.errors.bucketOptions.message')
                                            :   t('confidenceRisk.page.errors.confBucketQuery.message')
                                        }
                                        logContext={{ source: 'confidence-risk-controls' }}>
                                        {null}
                                    </PageSectionDataState>
                                )}
                            </div>

                            {hasReadyReport && data && sourceEndpointState.value && (
                                <ReportActualStatusCard
                                    statusMode='actual'
                                    statusTitle={t('confidenceRisk.page.status.title')}
                                    statusMessage={t('confidenceRisk.page.status.message')}
                                    dataSource={sourceEndpointState.value}
                                    reportTitle={data.title}
                                    reportId={data.id}
                                    reportKind={data.kind}
                                    generatedAtUtc={data.generatedAtUtc}
                                />
                            )}
                        </header>

                        <section className={cls.sectionBlock}>
                            <ReportTableTermsBlock
                                terms={tableTerms}
                                subtitle={t('confidenceRisk.page.termsSubtitle')}
                                enhanceDomainTerms
                                className={cls.termsBlock}
                            />
                        </section>
                    </>
                }
                isLoading={false}
                isError={false}
                hasData
                title={t('confidenceRisk.page.title')}>
                {!controlsError && (
                    <PageSectionDataState
                        isLoading={variantCatalogQuery.isPending || isLoading}
                        isError={Boolean(isError || reportStateError)}
                        error={reportStateError}
                        hasData={hasReadyReport}
                        onRetry={handleRetry}
                        title={
                            generatedAtState.error ? t('confidenceRisk.page.errors.invalidGeneratedAt.title')
                            : sourceEndpointState.error ?
                                t('confidenceRisk.page.errors.invalidSource.title')
                            :   t('confidenceRisk.page.errorTitle')
                        }
                        description={
                            generatedAtState.error ? t('confidenceRisk.page.errors.invalidGeneratedAt.message')
                            : sourceEndpointState.error ?
                                t('confidenceRisk.page.errors.invalidSource.message')
                            :   undefined
                        }
                        loadingText={t('errors:ui.pageDataBoundary.loading', { defaultValue: 'Loading data' })}
                        logContext={{
                            source: 'confidence-risk-report',
                            extra: { scope: effectiveScope, confBucket: rawConfidenceBucketQuery }
                        }}>
                        {data && (
                            <>
                                <PageSectionDataState
                                    isError={Boolean(configState.error)}
                                    error={configState.error}
                                    hasData={!configState.error}
                                    onRetry={handleRetry}
                                    title={t('confidenceRisk.page.errors.config.title')}
                                    description={t('confidenceRisk.page.errors.config.message')}
                                    logContext={{ source: 'confidence-risk-config' }}>
                                    {configState.section && (
                                        <section className={cls.configBlock}>
                                            <div className={cls.configHeader}>
                                                <Text type='h3' className={cls.configTitle}>
                                                    {t('confidenceRisk.page.config.title')}
                                                </Text>
                                                <Text className={cls.configSubtitle}>
                                                    {t('confidenceRisk.page.config.subtitle')}
                                                </Text>
                                            </div>
                                            <div className={cls.configGrid}>
                                                {(configState.section.items ?? []).map(item => {
                                                    const term = getConfigTerm(item.key, configTermsMap)
                                                    return (
                                                        <div key={item.key} className={cls.configItem}>
                                                            <div className={cls.configKeyRow}>
                                                                <TermTooltip
                                                                    term={term.title}
                                                                    description={enrichTermTooltipDescription(
                                                                        term.tooltip,
                                                                        {
                                                                            term: term.title,
                                                                            excludeTerms: [term.title],
                                                                            excludeRuleTitles: [term.title]
                                                                        }
                                                                    )}
                                                                    type='span'
                                                                />
                                                                <Text className={cls.configValue}>{item.value}</Text>
                                                            </div>
                                                            <Text className={cls.configDescription}>
                                                                {renderTermTooltipRichText(term.description, {
                                                                    excludeTerms: [term.title],
                                                                    excludeRuleTitles: [term.title]
                                                                })}
                                                            </Text>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        </section>
                                    )}
                                </PageSectionDataState>

                                <section className={cls.sectionBlock}>
                                    {tableSections.length === 0 ?
                                        <Text>{t('confidenceRisk.page.emptyTable')}</Text>
                                    :   tableSections.map((section, index) => {
                                            const domId = `confidence-risk-${index + 1}`
                                            const title =
                                                section.title ||
                                                t('confidenceRisk.page.tableTitleFallback', { index: index + 1 })

                                            return (
                                                <ReportTableCard
                                                    key={`${section.title}-${index}`}
                                                    title={title}
                                                    description={t('confidenceRisk.page.tableDescription')}
                                                    columns={section.columns ?? []}
                                                    rows={section.rows ?? []}
                                                    rowEvaluations={section.rowEvaluations ?? []}
                                                    domId={domId}
                                                    renderColumnTitle={renderColumnTitle}
                                                />
                                            )
                                        })
                                    }
                                </section>
                            </>
                        )}
                    </PageSectionDataState>
                )}
            </PageDataState>
        </div>
    )
}
