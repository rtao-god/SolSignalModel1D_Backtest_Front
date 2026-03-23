import { ReactNode } from 'react'
import { BACKTEST_DESCRIPTION, POLICY_DESCRIPTION } from '@/shared/consts/tooltipDomainTerms'
import i18n from '@/shared/configs/i18n/i18n'
import { COMMON_TERM_TOOLTIP_REGISTRY, SL_MODEL_DESCRIPTION } from '@/shared/terms/common'
import type { SharedTermTooltipRuleDraft } from '@/shared/terms/types'
import { readActiveLocaleResource } from '@/shared/lib/i18n/readActiveLocaleResource'
import { BulletList } from '@/shared/ui/BulletList'
import TermTooltip from './TermTooltip'
import cls from './renderTermTooltipRichText.module.scss'
import { matchTermTooltips, normalizeComparableTerm, TermTooltipRegistryEntry } from '../lib/termTooltipMatcher'
import { buildSafeTermTooltipRegistry, formatTermTooltipRegistryIssue } from '../lib/termTooltipRegistryIntegrity'
import { resolveTermTooltipDescriptionContent } from '../lib/resolveTermTooltipDescriptionContent'
import { logError } from '@/shared/lib/logging/logError'

type InlineGlossaryRuleDraft = SharedTermTooltipRuleDraft

const TRAIN_SEGMENT_DESCRIPTION_RU: ReactNode =
    'Train — участок истории, который идёт в обучение версии модели с разделением истории перед проверкой на [[oos-segment|OOS]].\n\nЧто показывает:\n1) Это знакомые для модели дни до [[split-boundaries|границы между Train и OOS]].\n2) Именно на этих днях подстраиваются [[landing-model-weights|веса модели]] этой версии.\n3) Если страница включает train diagnostics, те же дни затем используются для разбора ошибок на знакомой истории.\n\nКак читать:\n1) После обучения модель может отдельно прогоняться по этим же дням, но это не проверка на новых датах.\n2) Во время самого прогноза факт дня всё равно не подаётся напрямую: сначала считаются вероятности, потом отчёт сравнивает их с реальным исходом.\n3) Сильный Train без сильного [[oos-segment|OOS]] не доказывает переносимость.'

const TRAIN_SEGMENT_DESCRIPTION_EN: ReactNode =
    'Train is the part of history used to fit the split version of the model before evaluation on [[oos-segment|OOS]].\n\nWhat it shows:\n1) These are the familiar days that sit before the [[split-boundaries|Train/OOS boundary]].\n2) This is the segment where the split model adjusts its [[landing-model-weights|model weights]].\n3) When train diagnostics is enabled, the same days are later reused to inspect mistakes on familiar history.\n\nHow to read it:\n1) The model may be scored on the same days after training, but that is not evaluation on new dates.\n2) During inference the realized outcome is still not fed into the model directly: probabilities are calculated first, then the report compares them with reality.\n3) A strong Train without a strong [[oos-segment|OOS]] does not prove transfer.'

const OOS_SEGMENT_DESCRIPTION_RU: ReactNode =
    'OOS (out-of-sample) — более поздняя часть истории после [[split-boundaries|границы между Train и OOS]], которую модель не видела при обучении.\n\nЧто показывает:\n1) Это самая честная проверка на новых днях внутри текущего разделения истории.\n2) Сначала модель обучается на [[train-segment|Train]], потом эта же версия без дообучения считает только дни OOS.\n3) Во время самого прогноза факт OOS-дня в модель не передаётся: сначала считаются вероятности по признакам дня, а реальный итог приклеивается к отчёту позже.\n\nКак читать:\n1) Именно OOS считается главным честным срезом.\n2) Если [[train-segment|Train]] высокий, а OOS слабый, система лучше выглядит на знакомой истории, чем на новых днях.\n3) Такой разрыв — сигнал слабой переносимости или риска [[leakage|утечки]].'

const OOS_SEGMENT_DESCRIPTION_EN: ReactNode =
    'OOS (out-of-sample) is the later post-split part of history that the model did not see during training.\n\nWhat it shows:\n1) This is the main honest check on newer days inside the current split setup.\n2) The model is first fit on [[train-segment|Train]], then the same fitted version scores only OOS days with no extra retraining.\n3) During inference the realized OOS outcome is not fed into the model directly: probabilities are calculated first, and the real outcome is attached to the report later.\n\nHow to read it:\n1) `OOS` is the main honest evaluation slice.\n2) If [[train-segment|Train]] stays high while OOS is weak, the system looks better on familiar history than it does on fresh data.\n3) That gap is a signal of weak transfer or possible [[leakage|leakage]].'

const SPLIT_BOUNDARIES_DESCRIPTION_RU: ReactNode =
    'Split-границы — правило, которое делит историю на Train и OOS по дню, когда окончательно закрывается рабочее окно [[landing-time-horizon|торгового дня]].\n\nЧто показывает:\nдвижок берёт самый поздний доступный такой день, отматывает назад 120 календарных дней и, если нужно, привязывает границу к каноническому торговому дню. Всё не позже границы попадает в Train, всё позже — в OOS.\n\nКак читать:\nграница считается по дню закрытия, а не по дню входа. Это не даёт дню остаться в Train только потому, что вход был раньше, хотя итог окна закрылся уже по OOS-стороне.'

const SPLIT_BOUNDARIES_DESCRIPTION_EN: ReactNode =
    'Split boundaries are the rule that cuts history into Train and OOS by the day when the base daily window is fully closed.\n\nWhat it shows:\nthe engine takes the latest available close day of that window, walks back 120 calendar days, and, if needed, snaps the boundary to the canonical trading day. Anything that closes no later than that boundary stays in Train; anything later goes to OOS.\n\nHow to read it:\nthe cut is based on close day rather than entry day. That prevents a day from staying in Train when the result of that window closes on the OOS side.'

const CURRENT_PREDICTION_MODEL_STACK_DESCRIPTION_RU: ReactNode =
    'Модели текущего прогноза — это не один классификатор, а последовательность слоёв, которые собирают итоговый ответ по шагам.\n\n1) [[current-prediction-daily-layer|Daily]] (Move + Dir) — базовый дневной слой. Он сначала оценивает, будет ли значимое движение, а затем задаёт базовый класс [[landing-day-up|рост]] / [[landing-day-flat|боковик]] / [[landing-day-down|падение]].\n\n2) [[landing-micro-model|Micro]] — уточняющий слой внутри [[landing-day-flat|боковика]]. Он пытается понять, есть ли внутри нейтрального дня слабый уклон вверх или вниз.\n\n3) [[sl-model|SL-модель]] — отдельный risk-слой, который оценивает шанс, что [[tp-sl|stop-loss]] сработает раньше [[tp-sl|take-profit]], и помечает рискованные дни.\n\n4) Total — не отдельная обученная модель, а итоговая сборка Day + Micro + SL, которую дальше читает слой [[policy|торговых правил]].\n\nКак читать:\nесли [[factor|фактор]] ссылается на модель, сначала нужно понять, к какому слою он относится: к базовому направлению дня, к уточнению боковика или к risk-слою.'

const CURRENT_PREDICTION_MODEL_STACK_DESCRIPTION_EN: ReactNode =
    'The current prediction model stack is not a single classifier. It is a layered pipeline that builds the final answer step by step.\n\n1) [[current-prediction-daily-layer|Daily]] (Move + Dir) is the base daily layer. It first estimates whether a meaningful move is likely, then sets the base UP / FLAT / DOWN class.\n\n2) [[landing-micro-model|Micro]] is the refinement layer inside FLAT scenarios. It tries to recover a weak directional tilt when the daily layer sees sideways action.\n\n3) [[sl-model|SL model]] is the risk layer that estimates whether [[tp-sl|stop-loss]] may hit before [[tp-sl|take-profit]] and marks elevated-risk days.\n\n4) Total is not a separate trained model. It is the final Day + Micro + SL aggregation that the [[policy|policy]] layer reads next.\n\nHow to read it:\nwhen a [[factor|factor]] references a model, the key question is which layer it belongs to: the base day direction, the FLAT refinement layer, or the risk layer.'

const CURRENT_PREDICTION_DAILY_LAYER_DESCRIPTION_RU: ReactNode =
    'Daily — базовый дневной слой current prediction.\n\nСначала он оценивает, ожидается ли достаточно заметное движение, а затем выбирает базовый класс дня: [[landing-day-up|рост]], [[landing-day-flat|боковик]] или [[landing-day-down|падение]].\n\nЭтот слой задаёт стартовый сценарий до любых уточнений от [[landing-micro-model|Micro]] и до риск-коррекции от [[sl-model|SL-модели]].'

const CURRENT_PREDICTION_DAILY_LAYER_DESCRIPTION_EN: ReactNode =
    'Daily is the base daily layer in current prediction.\n\nIt first estimates whether a meaningful move is likely, then selects the base day class: UP, FLAT, or DOWN.\n\nThis layer sets the starting scenario before any [[landing-micro-model|Micro]] refinement and before the risk correction from the [[sl-model|SL model]].'

function resolveLocalizedTrainingSegmentDescription(kind: 'train' | 'oos'): ReactNode {
    const isEnglish = i18n.resolvedLanguage?.startsWith('en') ?? i18n.language?.startsWith('en')

    if (kind === 'train') {
        return isEnglish ? TRAIN_SEGMENT_DESCRIPTION_EN : TRAIN_SEGMENT_DESCRIPTION_RU
    }

    return isEnglish ? OOS_SEGMENT_DESCRIPTION_EN : OOS_SEGMENT_DESCRIPTION_RU
}

function resolveLocalizedSplitBoundariesDescription(): ReactNode {
    const isEnglish = i18n.resolvedLanguage?.startsWith('en') ?? i18n.language?.startsWith('en')
    return isEnglish ? SPLIT_BOUNDARIES_DESCRIPTION_EN : SPLIT_BOUNDARIES_DESCRIPTION_RU
}

function resolveLocalizedCurrentPredictionModelStackDescription(): ReactNode {
    const isEnglish = i18n.resolvedLanguage?.startsWith('en') ?? i18n.language?.startsWith('en')
    return isEnglish ? CURRENT_PREDICTION_MODEL_STACK_DESCRIPTION_EN : CURRENT_PREDICTION_MODEL_STACK_DESCRIPTION_RU
}

function resolveLocalizedCurrentPredictionDailyLayerDescription(): ReactNode {
    const isEnglish = i18n.resolvedLanguage?.startsWith('en') ?? i18n.language?.startsWith('en')
    return isEnglish ? CURRENT_PREDICTION_DAILY_LAYER_DESCRIPTION_EN : CURRENT_PREDICTION_DAILY_LAYER_DESCRIPTION_RU
}

function resolveLocalizedReportTooltipDescription(descriptionKey: string, ruleId: string, term: string): ReactNode {
    const localizedDescription = i18n.t(descriptionKey, { ns: 'reports' })

    if (typeof localizedDescription !== 'string') {
        throw new Error(`[term-tooltip] Localized tooltip description must be a string for key "${descriptionKey}".`)
    }

    return renderTermTooltipRichText(localizedDescription, {
        excludeRuleIds: [ruleId],
        excludeTerms: [term]
    })
}

interface LocalizedGlossaryTermResource {
    id: string
    term: string
    description: string
}

function resolveLocalizedGlossaryTerm(namespace: 'docs' | 'guide', termId: string): LocalizedGlossaryTermResource {
    const errorSource = '[term-tooltip] localized glossary'
    const glossaryTerms = readActiveLocaleResource(i18n, namespace, 'page.glossary.terms', errorSource)

    if (!Array.isArray(glossaryTerms)) {
        throw new Error(`[term-tooltip] glossary terms must be an array. namespace=${namespace}.`)
    }

    const glossaryItem = glossaryTerms.find(item => {
        return item && typeof item === 'object' && (item as Record<string, unknown>).id === termId
    })

    if (!glossaryItem || typeof glossaryItem !== 'object') {
        throw new Error(`[term-tooltip] glossary term is missing. namespace=${namespace}, termId=${termId}.`)
    }

    const term = (glossaryItem as Record<string, unknown>).term
    const description = (glossaryItem as Record<string, unknown>).description

    if (typeof term !== 'string' || term.trim().length === 0) {
        throw new Error(`[term-tooltip] glossary term label is invalid. namespace=${namespace}, termId=${termId}.`)
    }

    if (typeof description !== 'string' || description.trim().length === 0) {
        throw new Error(
            `[term-tooltip] glossary term description is invalid. namespace=${namespace}, termId=${termId}.`
        )
    }

    return {
        id: termId,
        term,
        description
    }
}

function resolveLocalizedGlossaryTooltipDescription(namespace: 'docs' | 'guide', termId: string): ReactNode {
    const glossaryItem = resolveLocalizedGlossaryTerm(namespace, termId)

    return renderTermTooltipRichText(glossaryItem.description, {
        excludeRuleIds: [termId],
        excludeTerms: [glossaryItem.term]
    })
}

function createLocalizedReportTooltipRule(id: string, descriptionKey: string, term: string): InlineGlossaryRuleDraft {
    return {
        id,
        pattern: /$^/,
        description: () => resolveLocalizedReportTooltipDescription(descriptionKey, id, term),
        autolink: false
    }
}

function createLocalizedGlossaryOwnerTooltipRule(
    id: string,
    namespace: 'docs' | 'guide',
    aliases: string[],
    title?: string,
    priority = 320
): InlineGlossaryRuleDraft {
    return {
        id,
        title,
        description: () => resolveLocalizedGlossaryTooltipDescription(namespace, id),
        aliases,
        priority
    }
}

function createLocalizedReportOwnerTooltipRule(
    id: string,
    descriptionKey: string,
    title: string,
    aliases: string[],
    priority = 320
): InlineGlossaryRuleDraft {
    return {
        id,
        title,
        description: () => resolveLocalizedReportTooltipDescription(descriptionKey, id, title),
        aliases,
        priority
    }
}

const TERM_TOOLTIP_REGISTRY_DRAFT: InlineGlossaryRuleDraft[] = [
    createLocalizedReportTooltipRule('landing-solana', 'main.tooltipRules.solana', 'Solana'),
    createLocalizedReportOwnerTooltipRule('landing-sol-usdt', 'main.tooltipRules.solUsdt', 'SOL/USDT', ['SOL/USDT']),
    createLocalizedReportOwnerTooltipRule('landing-ml-project', 'main.tooltipRules.mlProject', 'ML-проект', [
        'ML-проект',
        'ML project'
    ]),
    createLocalizedReportOwnerTooltipRule('landing-ml-model', 'main.tooltipRules.mlModel', 'ML model', [
        'ML model',
        'ML-модель'
    ]),
    createLocalizedReportOwnerTooltipRule(
        'landing-model-weights',
        'main.tooltipRules.modelWeights',
        'Model weights',
        ['Model weights', 'model weights', 'веса модели', 'весов модели']
    ),
    {
        id: 'landing-backtest',
        pattern: /$^/,
        title: 'Бэктест',
        description: BACKTEST_DESCRIPTION,
        autolink: false
    },
    {
        id: 'landing-trading-policy',
        pattern: /$^/,
        title: 'Policy',
        description: POLICY_DESCRIPTION,
        autolink: false
    },
    createLocalizedGlossaryOwnerTooltipRule('landing-omniscient', 'docs', ['Omniscient', 'omniscient'], 'Omniscient'),
    createLocalizedGlossaryOwnerTooltipRule('landing-interop', 'docs', ['Interop'], 'Interop'),
    {
        id: 'landing-oos',
        pattern: /$^/,
        description: () => resolveLocalizedTrainingSegmentDescription('oos'),
        autolink: false
    },
    createLocalizedGlossaryOwnerTooltipRule(
        'landing-report-document',
        'docs',
        ['ReportDocument', 'report document'],
        'ReportDocument'
    ),
    {
        id: 'landing-sl-model',
        pattern: /$^/,
        description: SL_MODEL_DESCRIPTION,
        autolink: false
    },
    createLocalizedGlossaryOwnerTooltipRule(
        'landing-leakage-guards',
        'docs',
        ['Leakage guards', 'leakage guards'],
        'Leakage guards'
    ),
    createLocalizedReportTooltipRule('landing-btc', 'main.tooltipRules.btc', 'BTC'),
    createLocalizedReportOwnerTooltipRule(
        'landing-macro-indicators',
        'main.tooltipRules.macroIndicators',
        'Macro indicators',
        ['Macro indicators']
    ),
    createLocalizedReportTooltipRule('landing-features', 'main.tooltipRules.features', 'Features'),
    createLocalizedReportTooltipRule('landing-signal', 'main.tooltipRules.signal', 'Signal'),
    createLocalizedReportTooltipRule('landing-forecast', 'main.tooltipRules.forecast', 'Forecast'),
    createLocalizedReportOwnerTooltipRule(
        'landing-current-prediction',
        'main.tooltipRules.currentPrediction',
        'Current prediction',
        ['Current prediction']
    ),
    createLocalizedReportOwnerTooltipRule(
        'landing-prediction-history',
        'main.tooltipRules.predictionHistory',
        'Prediction history',
        ['Prediction history']
    ),
    createLocalizedReportOwnerTooltipRule(
        'landing-backtest-summary',
        'main.tooltipRules.backtestSummary',
        'Backtest summary',
        ['Backtest summary']
    ),
    createLocalizedReportTooltipRule('landing-diagnostics', 'main.tooltipRules.diagnostics', 'Diagnostics'),
    createLocalizedReportTooltipRule('landing-analysis', 'main.tooltipRules.analysis', 'Analysis'),
    createLocalizedReportTooltipRule('landing-explain', 'main.tooltipRules.explain', 'Explain'),
    createLocalizedReportOwnerTooltipRule(
        'landing-truthfulness',
        'main.tooltipRules.truthfulness',
        'Truthfulness contour',
        ['Truthfulness contour', 'Data truthfulness', 'Правдивость данных']
    ),
    {
        id: 'landing-time-horizon',
        description: () =>
            resolveLocalizedReportTooltipDescription(
                'main.tooltipRules.timeHorizon',
                'landing-time-horizon',
                'Торговый день'
            ),
        aliases: ['торговый день', 'trading day', 'Торговый день по New York', 'New York trading day'],
        priority: 320
    },
    {
        id: 'landing-nyse-session',
        description: () =>
            resolveLocalizedReportTooltipDescription(
                'main.tooltipRules.nyseSession',
                'landing-nyse-session',
                'Американская сессия'
            ),
        aliases: [
            'американская сессия',
            'американской сессии',
            'U.S. regular session',
            'NYSE regular session',
            'regular session NYSE'
        ],
        priority: 320
    },
    createLocalizedReportTooltipRule(
        'landing-time-horizon-why',
        'main.tooltipRules.timeHorizonWhy',
        'Расчёт по Нью-Йорку'
    ),
    createLocalizedReportTooltipRule('landing-day-up', 'main.tooltipRules.dayUp', 'Рост'),
    createLocalizedReportTooltipRule('landing-day-down', 'main.tooltipRules.dayDown', 'Падение'),
    createLocalizedReportTooltipRule('landing-day-flat', 'main.tooltipRules.dayFlat', 'Боковик'),
    createLocalizedReportTooltipRule('landing-spot-policy', 'main.tooltipRules.spotPolicy', 'Spot strategy'),
    createLocalizedReportTooltipRule(
        'landing-real-forecast-journal',
        'main.tooltipRules.realForecastJournal',
        'Real forecast journal'
    ),
    createLocalizedReportTooltipRule('landing-reinvestment', 'main.tooltipRules.reinvestment', 'Реинвестирование'),
    createLocalizedReportOwnerTooltipRule('landing-early-preview', 'main.tooltipRules.earlyPreview', 'Early preview', [
        'Early preview',
        'ранний preview'
    ]),
    createLocalizedReportOwnerTooltipRule(
        'landing-path-labeling',
        'main.tooltipRules.pathBasedLabeling',
        'Path-based labeling',
        ['Path-based labeling']
    ),
    createLocalizedReportOwnerTooltipRule('landing-micro-model', 'main.tooltipRules.microModel', 'Micro model', [
        'Micro model',
        'микро-модель'
    ]),
    createLocalizedReportOwnerTooltipRule('landing-multi-layer', 'main.tooltipRules.multiLayer', 'Multi-layer', [
        'Multi-layer'
    ]),
    createLocalizedReportOwnerTooltipRule('landing-sl-risk', 'main.tooltipRules.slRisk', 'SL risk', ['SL risk']),
    createLocalizedReportTooltipRule('landing-guardrail', 'main.tooltipRules.guardrail', 'Guardrail'),
    createLocalizedReportTooltipRule('landing-specificity', 'main.tooltipRules.specificity', 'Specificity'),
    createLocalizedReportOwnerTooltipRule('landing-blame-split', 'main.tooltipRules.blameSplit', 'Blame split', [
        'Blame split'
    ]),
    createLocalizedReportTooltipRule('landing-hotspots', 'main.tooltipRules.hotspots', 'Hotspots'),
    createLocalizedReportTooltipRule('landing-pfi', 'main.tooltipRules.pfi', 'PFI'),
    createLocalizedReportOwnerTooltipRule(
        'landing-confusion-matrix',
        'main.tooltipRules.confusionMatrix',
        'Confusion matrix',
        ['Confusion matrix']
    ),
    createLocalizedReportOwnerTooltipRule('landing-model-metrics', 'main.tooltipRules.modelMetrics', 'Model metrics', [
        'Model metrics'
    ]),
    {
        id: 'landing-policy-branch-mega',
        title: 'Policy Branch Mega',
        description: () =>
            resolveLocalizedReportTooltipDescription(
                'main.tooltipRules.policyBranchMega',
                'landing-policy-branch-mega',
                'Policy Branch Mega'
            ),
        aliases: ['Policy Branch Mega', 'PolicyBranchMega', 'policy-branch-mega', 'policy_branch_mega'],
        priority: 320
    },
    createLocalizedReportTooltipRule('landing-no-trade', 'main.tooltipRules.noTrade', 'NoTrade'),
    createLocalizedReportTooltipRule('landing-attribution', 'main.tooltipRules.attribution', 'Attribution'),
    createLocalizedReportOwnerTooltipRule(
        'landing-feature-importance',
        'main.tooltipRules.featureImportance',
        'Feature importance',
        ['Feature importance']
    ),
    createLocalizedReportOwnerTooltipRule(
        'landing-aggregation',
        'main.tooltipRules.predictionAggregation',
        'Prediction aggregation',
        ['Prediction aggregation']
    ),
    createLocalizedReportOwnerTooltipRule('landing-all-history', 'main.tooltipRules.allHistory', 'All history', [
        'ALL HISTORY',
        'All history',
        'all history',
        'Full history',
        'full history',
        'Вся история',
        'вся история',
        'Полная история',
        'полная история'
    ]),
    createLocalizedReportOwnerTooltipRule(
        'landing-recent-tail-history',
        'main.tooltipRules.recentTailHistory',
        'Recent tail',
        [
            'Recent tail',
            'recent tail',
            'Latest tail',
            'latest tail',
            'Хвост истории',
            'хвост истории',
            'Свежий хвост',
            'свежий хвост',
            'Свежий хвост истории',
            'свежий хвост истории'
        ]
    ),
    createLocalizedReportOwnerTooltipRule(
        'landing-baseline-backtest',
        'main.tooltipRules.baselineBacktest',
        'Baseline backtest',
        ['Baseline backtest']
    ),
    createLocalizedReportOwnerTooltipRule(
        'landing-experimental-backtest',
        'main.tooltipRules.experimentalBacktest',
        'Experimental backtest',
        ['Experimental backtest']
    ),
    createLocalizedReportOwnerTooltipRule(
        'landing-model-confidence',
        'main.tooltipRules.modelConfidence',
        'Model confidence',
        ['Model confidence']
    ),
    createLocalizedReportOwnerTooltipRule(
        'landing-liquidation-buffer',
        'main.tooltipRules.liquidationBuffer',
        'Liquidation buffer',
        ['Liquidation buffer']
    ),
    createLocalizedReportOwnerTooltipRule(
        'landing-liq-unreachable-bucket',
        'main.tooltipRules.liqUnreachableBucket',
        'Liquidation is unreachable',
        ['Liquidation is unreachable', 'Ликвидация недостижима']
    ),
    ...COMMON_TERM_TOOLTIP_REGISTRY,
    {
        id: 'train-segment',
        pattern: /$^/,
        title: 'Train',
        description: () => resolveLocalizedTrainingSegmentDescription('train'),
        aliases: ['Train'],
        priority: 180
    },
    {
        id: 'oos-segment',
        pattern: /$^/,
        title: 'OOS',
        description: () => resolveLocalizedTrainingSegmentDescription('oos'),
        aliases: ['OOS', 'Out-of-sample', 'out-of-sample', 'out of sample'],
        priority: 180
    },
    {
        id: 'split-boundaries',
        pattern: /$^/,
        title: 'split-границы',
        description: () => resolveLocalizedSplitBoundariesDescription(),
        aliases: ['split-границы', 'split границы', 'split boundary', 'split boundaries', 'TrainUntilExitDayKeyUtc'],
        autolink: false
    },
    {
        id: 'current-prediction-model-stack',
        pattern: /$^/,
        title: 'Модели текущего прогноза',
        description: () => resolveLocalizedCurrentPredictionModelStackDescription(),
        autolink: false
    },
    {
        id: 'current-prediction-daily-layer',
        pattern: /$^/,
        title: 'Daily',
        description: () => resolveLocalizedCurrentPredictionDailyLayerDescription(),
        aliases: ['Daily', 'Daily layer', 'дневной слой'],
        autolink: false
    }
]

function buildDefaultAliases(rule: InlineGlossaryRuleDraft): string[] {
    if (rule.autolink === false) {
        return []
    }

    const aliases = new Set<string>()

    if (rule.title) {
        aliases.add(rule.title)
    }

    if (rule.aliases) {
        rule.aliases.forEach(alias => {
            if (alias && alias.trim().length > 0) {
                aliases.add(alias)
            }
        })
    }

    return [...aliases]
}

const TERM_TOOLTIP_REGISTRY: TermTooltipRegistryEntry[] = TERM_TOOLTIP_REGISTRY_DRAFT.map(rule => ({
    id: rule.id,
    title: rule.title,
    description: rule.description,
    aliases: buildDefaultAliases(rule),
    priority: rule.priority ?? 100,
    contexts: rule.contexts,
    excludeSelf: rule.excludeSelf ?? true,
    pattern: rule.pattern
}))

const SAFE_TERM_TOOLTIP_REGISTRY_RESULT = buildSafeTermTooltipRegistry(TERM_TOOLTIP_REGISTRY)
const TERM_TOOLTIP_REGISTRY_SAFE = SAFE_TERM_TOOLTIP_REGISTRY_RESULT.registry
const TERM_TOOLTIP_REGISTRY_ISSUES = SAFE_TERM_TOOLTIP_REGISTRY_RESULT.issues
const TERM_TOOLTIP_REGISTRY_BY_ID = new Map(TERM_TOOLTIP_REGISTRY_SAFE.map(rule => [rule.id, rule]))
let didReportTermTooltipRegistryIssues = false

function formatGroupedTermTooltipRegistryIssues(): string[] {
    const duplicateIdMessages: string[] = []
    const aliasCollisionsByRulePair = new Map<
        string,
        {
            existingRuleId: string
            conflictingRuleId: string
            labels: Set<string>
        }
    >()

    TERM_TOOLTIP_REGISTRY_ISSUES.forEach(issue => {
        if (issue.type === 'duplicate-id') {
            duplicateIdMessages.push(formatTermTooltipRegistryIssue(issue))
            return
        }

        const pairKey = `${issue.existingRuleId}=>${issue.conflictingRuleId}`
        const currentCollision = aliasCollisionsByRulePair.get(pairKey) ?? {
            existingRuleId: issue.existingRuleId,
            conflictingRuleId: issue.conflictingRuleId,
            labels: new Set<string>()
        }

        currentCollision.labels.add(issue.comparableLabel)
        aliasCollisionsByRulePair.set(pairKey, currentCollision)
    })

    const aliasCollisionMessages = [...aliasCollisionsByRulePair.values()].map(collision => {
        const sampleLabels = [...collision.labels].sort((left, right) => left.localeCompare(right))
        return `[term-tooltip] alias collision detected between ${collision.existingRuleId} and ${collision.conflictingRuleId}. labels=${sampleLabels.join(', ')}.`
    })

    return [...duplicateIdMessages, ...aliasCollisionMessages]
}

function reportTermTooltipRegistryIssues(): void {
    if (didReportTermTooltipRegistryIssues || TERM_TOOLTIP_REGISTRY_ISSUES.length === 0) {
        return
    }

    didReportTermTooltipRegistryIssues = true
    formatGroupedTermTooltipRegistryIssues().forEach(message => {
        logError(new Error(message), undefined, {
            source: 'term-tooltip-registry',
            domain: 'app_runtime',
            severity: 'warning'
        })
    })
}

interface RenderTermTooltipRichTextOptions {
    excludeTerms?: string[]
    excludeRuleIds?: string[]
    excludeRuleTitles?: string[]
    recursionDepth?: number
    maxRecursionDepth?: number
    resolveExplicitTermLink?: (termId: string) => { to: string; onWarmup?: () => void } | null
}

interface StructuredParagraphTextBlock {
    type: 'text'
    lines: string[]
}

interface StructuredParagraphBulletListBlock {
    type: 'bullet-list'
    items: string[]
}

type StructuredParagraphBlock = StructuredParagraphTextBlock | StructuredParagraphBulletListBlock

function normalizeOrderedListParagraphs(text: string): string {
    let next = text

    // ".... 1) ... 2) ..." -> каждый пункт с новой строки и пустой строкой между пунктами.
    // Важно: не разбиваем "0)" (например в диапазонах/идентификаторах), чтобы не появлялись лишние абзацы.
    next = next.replace(/([^\n])\s+([1-9]\d*\))/g, '$1\n\n$2')
    // "... \n2) ..." -> добавляем пустую строку перед пунктом, если её нет.
    next = next.replace(/([^\n])\n([1-9]\d*\))/g, '$1\n\n$2')
    // ".... Пример: ..." -> переносим пример в отдельный абзац.
    next = next.replace(/([^\n])\s+(Пример:)/g, '$1\n\n$2')
    // ".... Ориентир чтения: ..." -> отдельный абзац для блока интерпретации.
    next = next.replace(/([^\n])\s+(Ориентир чтения:)/g, '$1\n\n$2')
    // ".... Как читать: ..." -> отдельный абзац для читаемости.
    next = next.replace(/([^\n])\s+(Как читать:)/g, '$1\n\n$2')
    // ".... true:/false: ..." -> отдельные смысловые блоки.
    next = next.replace(/([^\n])\s+(true:|false:)/g, '$1\n\n$2')

    return next
}

function normalizeBrokenExplicitTermMarkup(text: string): string {
    let next = text

    // Битая разметка вида [[term|Label] не должна вытекать в UI как сырой служебный синтаксис.
    next = next.replace(/\[\[([a-z0-9_-]+)\|([^\]\n]+)\](?!\])/gi, '$2')
    next = next.replace(/\[\[([a-z0-9_-]+)\|([^\]\n]+)$/gim, '$2')

    return next
}

function splitNonEmptyParagraphs(text: string): string[] {
    return text.split(/\n{2,}/).filter(paragraph => paragraph.trim().length > 0)
}

function isBulletListLine(line: string): boolean {
    return /^(?:[-*•])\s+/.test(line)
}

function stripBulletListMarker(line: string): string {
    return line.replace(/^(?:[-*•])\s+/, '').trim()
}

function stripExplicitTermMarkup(text: string): string {
    return parseExplicitTermMarkupSegments(normalizeBrokenExplicitTermMarkup(text))
        .map(segment => (segment.type === 'term' ? segment.label : segment.value))
        .join('')
}

interface ExplicitTermMarkupSegmentText {
    type: 'text'
    value: string
}

interface ExplicitTermMarkupSegmentTerm {
    type: 'term'
    termId: string
    label: string
}

type ExplicitTermMarkupSegment = ExplicitTermMarkupSegmentText | ExplicitTermMarkupSegmentTerm

function parseExplicitTermMarkupSegments(text: string): ExplicitTermMarkupSegment[] {
    const pattern = /\[\[([a-z0-9_-]+)\|([^\]]+)\]\]/gi
    const segments: ExplicitTermMarkupSegment[] = []

    let lastIndex = 0
    let next = pattern.exec(text)

    while (next) {
        const full = next[0] ?? ''
        const termId = next[1]?.trim() ?? ''
        const label = next[2]?.trim() ?? ''
        const start = next.index ?? 0

        if (start > lastIndex) {
            segments.push({
                type: 'text',
                value: text.slice(lastIndex, start)
            })
        }

        if (termId && label) {
            segments.push({
                type: 'term',
                termId,
                label
            })
        } else if (full) {
            segments.push({
                type: 'text',
                value: full
            })
        }

        lastIndex = start + full.length
        next = pattern.exec(text)
    }

    if (lastIndex < text.length) {
        segments.push({
            type: 'text',
            value: text.slice(lastIndex)
        })
    }

    return segments.length > 0 ? segments : [{ type: 'text', value: text }]
}

function resolveStructuredParagraphBlocks(paragraph: string): StructuredParagraphBlock[] {
    const lines = paragraph.split('\n').filter(line => line.trim().length > 0)

    if (lines.length === 0) {
        return []
    }

    const blocks: StructuredParagraphBlock[] = []
    let textLines: string[] = []
    let bulletItems: string[] = []

    const flushTextLines = () => {
        if (textLines.length === 0) {
            return
        }

        blocks.push({
            type: 'text',
            lines: textLines
        })
        textLines = []
    }

    const flushBulletItems = () => {
        if (bulletItems.length === 0) {
            return
        }

        blocks.push({
            type: 'bullet-list',
            items: bulletItems
        })
        bulletItems = []
    }

    lines.forEach(line => {
        const normalizedLine = line.trim()

        if (isBulletListLine(normalizedLine)) {
            flushTextLines()
            bulletItems.push(stripBulletListMarker(normalizedLine))
            return
        }

        flushBulletItems()
        textLines.push(line)
    })

    flushTextLines()
    flushBulletItems()

    return blocks
}

function renderStructuredParagraph(
    paragraph: string,
    keyPrefix: string,
    renderLine: (line: string, lineKey: string) => ReactNode
): ReactNode | null {
    const blocks = resolveStructuredParagraphBlocks(paragraph)

    if (blocks.length === 0) {
        return null
    }

    return (
        <span key={keyPrefix} className={cls.paragraph}>
            {blocks.map((block, blockIndex) => (
                <span key={`${keyPrefix}-block-${blockIndex}`} className={cls.paragraphBlock}>
                    {block.type === 'text' ?
                        block.lines.map((line, lineIndex) => (
                            <span key={`${keyPrefix}-line-${blockIndex}-${lineIndex}`} className={cls.line}>
                                {renderLine(line, `${keyPrefix}-line-${blockIndex}-${lineIndex}`)}
                            </span>
                        ))
                    :   <BulletList
                            items={block.items.map((item, itemIndex) => ({
                                key: `${keyPrefix}-bullet-${blockIndex}-${itemIndex}`,
                                content: renderLine(item, `${keyPrefix}-bullet-${blockIndex}-${itemIndex}`)
                            }))}
                        />
                    }
                </span>
            ))}
        </span>
    )
}

function resolveRegistryForRender(
    excludedRuleIds: Set<string>,
    excludedRuleTitles: Set<string>
): TermTooltipRegistryEntry[] {
    const excludedIds = new Set(excludedRuleIds)

    if (excludedRuleTitles.size > 0) {
        TERM_TOOLTIP_REGISTRY_SAFE.forEach(rule => {
            if (!rule.title) {
                return
            }

            const normalizedTitle = normalizeComparableTerm(rule.title)
            if (normalizedTitle && excludedRuleTitles.has(normalizedTitle)) {
                excludedIds.add(rule.id)
            }
        })
    }

    return TERM_TOOLTIP_REGISTRY_SAFE.filter(rule => !excludedIds.has(rule.id))
}

function buildNestedDescription(
    rule: TermTooltipRegistryEntry,
    matchedValue: string,
    excludedRuleIds: Set<string>,
    recursionDepth: number,
    maxRecursionDepth: number
): ReactNode {
    return resolveTermTooltipDescriptionContent(rule.description, {
        resolveString: resolvedDescription => {
            if (recursionDepth >= maxRecursionDepth) {
                return renderPlainTextBlocks(stripExplicitTermMarkup(resolvedDescription))
            }

            const selfExclusions = [matchedValue]
            if (rule.title) {
                selfExclusions.push(rule.title)
            }

            return renderTermTooltipRichText(resolvedDescription, {
                excludeTerms: selfExclusions,
                excludeRuleIds: [...excludedRuleIds, rule.id],
                excludeRuleTitles: rule.title ? [rule.title] : [],
                recursionDepth: recursionDepth + 1,
                maxRecursionDepth
            })
        }
    })
}

function renderAutolinkedTextSegment(
    text: string,
    registry: TermTooltipRegistryEntry[],
    excludedTerms: Set<string>,
    excludedRuleIds: Set<string>,
    recursionDepth: number,
    maxRecursionDepth: number,
    keyPrefix: string
): ReactNode[] {
    const matches = matchTermTooltips(text, registry, excludedRuleIds, excludedTerms)
    if (matches.length === 0) {
        const wholeText = renderTextSegment(text, `${keyPrefix}-text-0`)
        return wholeText ? [wholeText] : []
    }

    const nodes: ReactNode[] = []
    let cursor = 0

    matches.forEach((match, index) => {
        if (match.start > cursor) {
            const leadingText = renderTextSegment(text.slice(cursor, match.start), `${keyPrefix}-text-${cursor}`)
            if (leadingText) {
                nodes.push(leadingText)
            }
        }

        nodes.push(
            <TermTooltip
                key={`${keyPrefix}-${match.rule.id}-${index}-${match.start}`}
                term={match.value}
                tooltipTitle={match.rule.title}
                description={() =>
                    buildNestedDescription(match.rule, match.value, excludedRuleIds, recursionDepth, maxRecursionDepth)
                }
                type='span'
                className={cls.inlineTerm}
            />
        )

        cursor = match.end
    })

    if (cursor < text.length) {
        const trailingText = renderTextSegment(text.slice(cursor), `${keyPrefix}-text-${cursor}`)
        if (trailingText) {
            nodes.push(trailingText)
        }
    }

    return nodes
}

function renderInlineRichText(
    text: string,
    registry: TermTooltipRegistryEntry[],
    excludedTerms: Set<string>,
    excludedRuleIds: Set<string>,
    excludedRuleTitles: Set<string>,
    recursionDepth: number,
    maxRecursionDepth: number,
    keyPrefix: string,
    resolveExplicitTermLink?: (termId: string) => { to: string; onWarmup?: () => void } | null
): ReactNode[] {
    const segments = parseExplicitTermMarkupSegments(text)
    const nodes: ReactNode[] = []
    let segmentKey = 0

    segments.forEach(segment => {
        if (segment.type === 'term') {
            const rule = TERM_TOOLTIP_REGISTRY_BY_ID.get(segment.termId)
            if (!rule || excludedRuleIds.has(rule.id)) {
                const fallbackLabel = renderTextSegment(segment.label, `explicit-fallback-${keyPrefix}-${segmentKey}`)
                if (fallbackLabel) {
                    nodes.push(fallbackLabel)
                }
                return
            }

            const normalizedLabel = normalizeComparableTerm(segment.label)
            const normalizedRuleTitle = normalizeComparableTerm(rule.title ?? '')
            if (
                (normalizedLabel && (excludedTerms.has(normalizedLabel) || excludedRuleTitles.has(normalizedLabel))) ||
                (normalizedRuleTitle && excludedRuleTitles.has(normalizedRuleTitle))
            ) {
                const excludedLabel = renderTextSegment(segment.label, `explicit-excluded-${keyPrefix}-${segmentKey}`)
                if (excludedLabel) {
                    nodes.push(excludedLabel)
                }
                return
            }

            const explicitTermLink = resolveExplicitTermLink?.(segment.termId) ?? null

            nodes.push(
                <TermTooltip
                    key={`explicit-${rule.id}-${keyPrefix}-${segmentKey}`}
                    term={segment.label}
                    tooltipTitle={rule.title}
                    description={() =>
                        buildNestedDescription(rule, segment.label, excludedRuleIds, recursionDepth, maxRecursionDepth)
                    }
                    type='span'
                    className={cls.inlineTerm}
                    to={explicitTermLink?.to}
                    onWarmup={explicitTermLink?.onWarmup}
                />
            )
            segmentKey += 1
            return
        }

        if (!segment.value) {
            return
        }

        nodes.push(
            ...renderAutolinkedTextSegment(
                segment.value,
                registry,
                excludedTerms,
                excludedRuleIds,
                recursionDepth,
                maxRecursionDepth,
                `${keyPrefix}-${segmentKey}`
            )
        )
        segmentKey += 1
    })

    return nodes
}

interface MatcherFixture {
    id: string
    text: string
    expectedRuleIds: string[]
}

const TERM_TOOLTIP_MATCHER_FIXTURES: MatcherFixture[] = [
    {
        id: 'sl-model-priority',
        text: 'день помечен как риск-день по SL-модели',
        expectedRuleIds: ['sl-model']
    },
    {
        id: 'percentage-points',
        text: 'цена улучшения — 4 п.п. доходности',
        expectedRuleIds: ['percentage-points']
    },
    {
        id: 'backticked-min-move',
        text: 'если `MinMove` растёт, фильтр становится строже',
        expectedRuleIds: ['min-move']
    },
    {
        id: 'quoted-pnl',
        text: 'метрика "PnL" уже пересчитана',
        expectedRuleIds: ['pnl']
    },
    {
        id: 'backticked-train-oos',
        text: 'сравнение `Train` и `OOS` показывает переносимость',
        expectedRuleIds: ['train-segment', 'oos-segment']
    },
    {
        id: 'first-event',
        text: 'выход по first-event цепочке',
        expectedRuleIds: ['first-event']
    },
    {
        id: 'tp-sl-mode',
        text: 'TP/SL mode — фильтр по типу уровней выхода',
        expectedRuleIds: ['tp-sl-mode-term']
    },
    {
        id: 'exposure-not-position',
        text: 'рост экспозиции увеличивает хвостовой риск',
        expectedRuleIds: ['exposure']
    },
    {
        id: 'dynamic-tp-sl-priority',
        text: 'DynTP/SL PnL% зависит от числа dynamic-сделок',
        expectedRuleIds: ['dynamic-tp-sl']
    },
    {
        id: 'executed-at-utc',
        text: 'вход открылся в момент ExecutedAtUtc',
        expectedRuleIds: ['executed-at-utc']
    },
    {
        id: 'trade-count',
        text: 'Tr, PnL и DD пересчитываются',
        expectedRuleIds: ['trade-count', 'pnl', 'dd']
    },
    {
        id: 'recovery',
        text: 'recovery после глубокой просадки затянулся',
        expectedRuleIds: ['recovery', 'drawdown']
    },
    {
        id: 'risk-layers',
        text: 'Policy, Branch и risk-слои формируют вход на день',
        expectedRuleIds: ['policy', 'branch', 'risk-layers']
    },
    {
        id: 'policy-branch-mega-term',
        text: 'Policy Branch Mega собирает полную историческую таблицу',
        expectedRuleIds: ['landing-policy-branch-mega']
    },
    {
        id: 'why-first-event',
        text: 'Почему? (first-event)',
        expectedRuleIds: ['why-first-event']
    },
    {
        id: 'why-no-biggest-liq-loss',
        text: 'Почему? (NO BIGGEST LIQ LOSS)',
        expectedRuleIds: ['why-no-biggest-liq-loss']
    },
    {
        id: 'why-bucket',
        text: 'Почему? (bucket)',
        expectedRuleIds: ['why-bucket']
    },
    {
        id: 'landing-time-horizon-term',
        text: 'Торговый день открывает рабочее окно проекта',
        expectedRuleIds: ['landing-time-horizon']
    },
    {
        id: 'leakage-term',
        text: 'утечка будущих данных искажает историю',
        expectedRuleIds: ['leakage']
    }
]

let didValidateMatcherFixtures = false
let matcherFixtureValidationError: Error | null = null
let didReportMatcherFixtureValidationError = false

function collectMatcherFixtureValidationError(): Error | null {
    if (didValidateMatcherFixtures) {
        return null
    }

    if (matcherFixtureValidationError) {
        return matcherFixtureValidationError
    }

    try {
        TERM_TOOLTIP_MATCHER_FIXTURES.forEach(fixture => {
            const found = matchTermTooltips(
                fixture.text,
                TERM_TOOLTIP_REGISTRY_SAFE,
                new Set<string>(),
                new Set<string>()
            ).map(match => match.rule.id)

            const missing = fixture.expectedRuleIds.filter(expected => !found.includes(expected))
            if (missing.length > 0) {
                throw new Error(
                    `[term-tooltip] matcher fixture failed: ${fixture.id}. Missing rules: ${missing.join(', ')}. Found: ${found.join(', ')}.`
                )
            }
        })
    } catch (error) {
        matcherFixtureValidationError = error instanceof Error ? error : new Error(String(error))
        return matcherFixtureValidationError
    }

    didValidateMatcherFixtures = true
    return null
}

function reportMatcherFixtureValidationError(): void {
    if (!import.meta.env.DEV || didReportMatcherFixtureValidationError) {
        return
    }

    reportTermTooltipRegistryIssues()

    const error = collectMatcherFixtureValidationError()
    if (!error) {
        return
    }

    didReportMatcherFixtureValidationError = true
    logError(error, undefined, {
        source: 'term-tooltip-matcher-fixtures',
        domain: 'app_runtime',
        severity: 'warning'
    })
}

function renderPlainTextBlocks(text: string): ReactNode {
    // Plain-text fallback обязан убирать и валидный explicit-term markup тоже.
    // Иначе любая внутренняя ошибка в rich-text renderer возвращает пользователю сырой [[term|label]] синтаксис.
    const normalizedText = normalizeOrderedListParagraphs(stripExplicitTermMarkup(text))
    const paragraphs = splitNonEmptyParagraphs(normalizedText)

    if (paragraphs.length === 0) {
        return text
    }

    const shouldRenderStructuredBlocks = paragraphs.length > 1 || paragraphs.some(paragraph => paragraph.includes('\n'))

    if (!shouldRenderStructuredBlocks) {
        return renderTextSegment(paragraphs[0], 'plain-text-0') ?? paragraphs[0]
    }

    return (
        <>
            {paragraphs.map((paragraph, paragraphIndex) => {
                return renderStructuredParagraph(paragraph, `plain-paragraph-${paragraphIndex}`, line => line)
            })}
        </>
    )
}

function renderTextSegment(text: string, key: string): ReactNode | null {
    if (!text) {
        return null
    }

    return (
        <span key={key} className={cls.textSegment}>
            {text}
        </span>
    )
}

export function resolveMatchingTermTooltipRuleIds(text: string): string[] {
    if (!text || text.trim().length === 0) {
        return []
    }

    reportTermTooltipRegistryIssues()

    return Array.from(
        new Set(
            matchTermTooltips(text, TERM_TOOLTIP_REGISTRY_SAFE, new Set<string>(), new Set<string>()).map(
                match => match.rule.id
            )
        )
    )
}

export function resolveRegisteredTermTooltipRuleIds(): string[] {
    reportTermTooltipRegistryIssues()
    return [...TERM_TOOLTIP_REGISTRY_BY_ID.keys()]
}

/**
 * Возвращает канонический tooltip-rule по shared term id.
 * Это owner-точка для страниц, которые хотят переиспользовать общий термин,
 * а не держать локальный дубликат его описания.
 */
export function resolveRegisteredTermTooltipRuleById(termId: string): TermTooltipRegistryEntry {
    reportTermTooltipRegistryIssues()

    const resolved = TERM_TOOLTIP_REGISTRY_BY_ID.get(termId)
    if (!resolved) {
        throw new Error(`[term-tooltip] unknown term id: ${termId}.`)
    }

    return resolved
}

export function resolveRegisteredTermTooltipTitle(termId: string): string | null {
    return resolveRegisteredTermTooltipRuleById(termId).title ?? null
}

/**
 * Возвращает shared tooltip-rule ids, чьи канонические title/aliases
 * точно совпадают с локальным label термина.
 *
 * Этот helper нужен page-level i18n readers, чтобы запрещать локальные
 * дубли canonical owner-терминов и принудительно переводить их на sharedTermId.
 */
export function resolveRegisteredTermTooltipRuleIdsByExactLabel(label: string): string[] {
    reportTermTooltipRegistryIssues()

    const normalizedLabel = normalizeComparableTerm(label)
    if (!normalizedLabel) {
        return []
    }

    return TERM_TOOLTIP_REGISTRY_SAFE.flatMap(rule => {
        const normalizedCandidates = [rule.title ?? '', ...(rule.aliases ?? [])]
            .map(candidate => normalizeComparableTerm(candidate))
            .filter(candidate => candidate.length > 0)

        return normalizedCandidates.includes(normalizedLabel) ? [rule.id] : []
    })
}

export function renderRegisteredTermTooltipDescriptionById(termId: string, matchedValue: string): ReactNode {
    const rule = resolveRegisteredTermTooltipRuleById(termId)

    return buildNestedDescription(rule, matchedValue, new Set<string>([termId]), 0, 2)
}

export function renderTermTooltipRichText(text: string, options?: RenderTermTooltipRichTextOptions): ReactNode {
    if (!text || text.trim().length === 0) {
        return text
    }

    try {
        reportTermTooltipRegistryIssues()

        const normalizedText = normalizeOrderedListParagraphs(normalizeBrokenExplicitTermMarkup(text))

        const excludedTerms = new Set(
            (options?.excludeTerms ?? []).map(item => normalizeComparableTerm(item)).filter(item => item.length > 0)
        )
        const excludedRuleIds = new Set(
            (options?.excludeRuleIds ?? []).map(item => item.trim()).filter(item => item.length > 0)
        )
        const excludedRuleTitles = new Set(
            (options?.excludeRuleTitles ?? [])
                .map(item => normalizeComparableTerm(item))
                .filter(item => item.length > 0)
        )
        const recursionDepth = options?.recursionDepth ?? 0
        const maxRecursionDepth = options?.maxRecursionDepth ?? 2

        const registry = resolveRegistryForRender(excludedRuleIds, excludedRuleTitles)
        const paragraphs = splitNonEmptyParagraphs(normalizedText)

        if (paragraphs.length === 0) {
            return text
        }

        const shouldRenderStructuredBlocks =
            paragraphs.length > 1 || paragraphs.some(paragraph => paragraph.includes('\n'))

        if (!shouldRenderStructuredBlocks) {
            return (
                <>
                    {renderInlineRichText(
                        // Однострочный chunk может приходить как левая или правая часть
                        // уже разрезанного rich-text блока. Пробелы по краям здесь значимы:
                        // их потеря склеивает обычный текст с соседним tooltip-термином.
                        paragraphs[0],
                        registry,
                        excludedTerms,
                        excludedRuleIds,
                        excludedRuleTitles,
                        recursionDepth,
                        maxRecursionDepth,
                        'paragraph-0',
                        options?.resolveExplicitTermLink
                    )}
                </>
            )
        }

        return (
            <>
                {paragraphs.map((paragraph, paragraphIndex) => {
                    return renderStructuredParagraph(paragraph, `paragraph-${paragraphIndex}`, (line, lineKey) =>
                        renderInlineRichText(
                            line,
                            registry,
                            excludedTerms,
                            excludedRuleIds,
                            excludedRuleTitles,
                            recursionDepth,
                            maxRecursionDepth,
                            lineKey,
                            options?.resolveExplicitTermLink
                        )
                    )
                })}
            </>
        )
    } catch (error) {
        const normalizedError =
            error instanceof Error ? error : new Error(String(error ?? 'Unknown term tooltip error.'))
        logError(normalizedError, undefined, {
            source: 'term-tooltip-render',
            domain: 'app_runtime',
            severity: 'warning',
            extra: {
                text
            }
        })

        return renderPlainTextBlocks(text)
    }
}

reportMatcherFixtureValidationError()
