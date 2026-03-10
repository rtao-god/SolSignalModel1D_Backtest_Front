import { ReactNode } from 'react'
import { BACKTEST_DESCRIPTION, POLICY_DESCRIPTION } from '@/shared/consts/tooltipDomainTerms'
import i18n from '@/shared/configs/i18n/i18n'
import { COMMON_TERM_TOOLTIP_REGISTRY } from '@/shared/terms/common'
import type { SharedTermTooltipRuleDraft } from '@/shared/terms/types'
import { BulletList } from '@/shared/ui/BulletList'
import TermTooltip from './TermTooltip'
import cls from './renderTermTooltipRichText.module.scss'
import { matchTermTooltips, normalizeComparableTerm, TermTooltipRegistryEntry } from '../lib/termTooltipMatcher'
import { buildSafeTermTooltipRegistry, formatTermTooltipRegistryIssue } from '../lib/termTooltipRegistryIntegrity'

type InlineGlossaryRuleDraft = SharedTermTooltipRuleDraft

const TRAIN_SEGMENT_DESCRIPTION_RU: ReactNode =
    'Train — часть истории, на которой модель обучалась и под которую подгонялись веса.\n\nЧто показывает:\nнасколько хорошо модель описывает уже виденные данные.\n\nКак читать:\nсильный `Train` полезен только рядом с [[oos-segment|OOS]]. Если на обучении всё отлично, а на новых днях метрика резко падает, это признак переобучения или утечки будущих данных, а не силы сигнала.'

const TRAIN_SEGMENT_DESCRIPTION_EN: ReactNode =
    'Train is the history segment used to fit the model weights.\n\nWhat it shows:\nhow well the model describes data it has already seen.\n\nHow to read it:\na strong `Train` is only useful together with [[oos-segment|OOS]]. If training looks excellent but quality drops on new days, that points to overfit or future-data leakage rather than real signal strength.'

const OOS_SEGMENT_DESCRIPTION_RU: ReactNode =
    'OOS (out-of-sample) — часть истории после train-границы, которую модель не видела при обучении.\n\nЧто показывает:\nпереносится ли качество на новые дни.\n\nКак читать:\nименно `OOS` считается главным честным срезом. Если [[train-segment|Train]] высокий, а `OOS` слабый, система выглядит лучше на знакомой истории, чем в режиме реальной эксплуатации.'

const OOS_SEGMENT_DESCRIPTION_EN: ReactNode =
    'OOS (out-of-sample) is the post-split part of history that the model did not see during training.\n\nWhat it shows:\nwhether quality transfers to new days.\n\nHow to read it:\n`OOS` is the main honest evaluation slice. If [[train-segment|Train]] stays high while `OOS` is weak, the system looks better on familiar history than it does in live-like conditions.'

const SPLIT_BOUNDARIES_DESCRIPTION_RU: ReactNode =
    'Split-границы — каноническое разделение истории на Train и OOS по baseline-exit дню.\n\nЕсли день закрывается не позже границы, он относится к Train. Если закрытие уходит позже границы, день попадает в OOS.\n\nГраница считается по exit-day-key, а не по моменту входа, чтобы день не оставался в Train только потому, что вход был раньше, хотя его результат закрывается уже по другую сторону split.'

const SPLIT_BOUNDARIES_DESCRIPTION_EN: ReactNode =
    'Split boundaries are the canonical Train/OOS cut by baseline-exit day.\n\nIf a day closes no later than the boundary, it belongs to Train. If the close lands after the boundary, the day belongs to OOS.\n\nThe cut is based on exit day key rather than entry time so that a day does not stay in Train when its realized outcome closes on the OOS side of the split.'

const CURRENT_PREDICTION_MODEL_STACK_DESCRIPTION_RU: ReactNode =
    'Модели текущего прогноза — это не один классификатор, а последовательность слоёв, которые собирают итоговый ответ по шагам.\n\n1) [[current-prediction-daily-layer|Daily]] (Move + Dir) — базовый дневной слой. Он сначала оценивает, будет ли значимое движение, а затем задаёт базовый класс UP / FLAT / DOWN.\n\n2) [[landing-micro-model|Micro]] — уточняющий слой внутри FLAT-сценариев. Он пытается понять, есть ли внутри боковика слабый уклон вверх или вниз.\n\n3) [[sl-model|SL-модель]] — отдельный risk-слой, который оценивает шанс, что [[tp-sl|stop-loss]] сработает раньше [[tp-sl|take-profit]], и помечает рискованные дни.\n\n4) Total — не отдельная обученная модель, а итоговая сборка Day + Micro + SL, которую дальше читает слой [[policy|торговых правил]].\n\nКак читать:\nесли фактор ссылается на модель, сначала нужно понять, к какому слою он относится: к базовому направлению дня, к уточнению боковика или к risk-слою.'

const CURRENT_PREDICTION_MODEL_STACK_DESCRIPTION_EN: ReactNode =
    'The current prediction model stack is not a single classifier. It is a layered pipeline that builds the final answer step by step.\n\n1) [[current-prediction-daily-layer|Daily]] (Move + Dir) is the base daily layer. It first estimates whether a meaningful move is likely, then sets the base UP / FLAT / DOWN class.\n\n2) [[landing-micro-model|Micro]] is the refinement layer inside FLAT scenarios. It tries to recover a weak directional tilt when the daily layer sees sideways action.\n\n3) [[sl-model|SL model]] is the risk layer that estimates whether [[tp-sl|stop-loss]] may hit before [[tp-sl|take-profit]] and marks elevated-risk days.\n\n4) Total is not a separate trained model. It is the final Day + Micro + SL aggregation that the [[policy|policy]] layer reads next.\n\nHow to read it:\nwhen a factor references a model, the key question is which layer it belongs to: the base day direction, the FLAT refinement layer, or the risk layer.'

const CURRENT_PREDICTION_DAILY_LAYER_DESCRIPTION_RU: ReactNode =
    'Daily — базовый дневной слой current prediction.\n\nСначала он оценивает, ожидается ли достаточно заметное движение, а затем выбирает базовый класс дня: UP, FLAT или DOWN.\n\nЭтот слой задаёт стартовый сценарий до любых уточнений от [[landing-micro-model|Micro]] и до риск-коррекции от [[sl-model|SL-модели]].'

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

function createLocalizedReportTooltipRule(id: string, descriptionKey: string, term: string): InlineGlossaryRuleDraft {
    return {
        id,
        pattern: /$^/,
        description: () => resolveLocalizedReportTooltipDescription(descriptionKey, id, term),
        autolink: false
    }
}

const TERM_TOOLTIP_REGISTRY_DRAFT: InlineGlossaryRuleDraft[] = [
    createLocalizedReportTooltipRule('landing-solana', 'main.tooltipRules.solana', 'Solana'),
    createLocalizedReportTooltipRule('landing-sol-usdt', 'main.tooltipRules.solUsdt', 'SOL/USDT'),
    createLocalizedReportTooltipRule('landing-ml-project', 'main.tooltipRules.mlProject', 'ML-проект'),
    createLocalizedReportTooltipRule('landing-ml-model', 'main.tooltipRules.mlModel', 'ML model'),
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
    createLocalizedReportTooltipRule('landing-btc', 'main.tooltipRules.btc', 'BTC'),
    createLocalizedReportTooltipRule(
        'landing-macro-indicators',
        'main.tooltipRules.macroIndicators',
        'Macro indicators'
    ),
    createLocalizedReportTooltipRule('landing-features', 'main.tooltipRules.features', 'Features'),
    createLocalizedReportTooltipRule('landing-signal', 'main.tooltipRules.signal', 'Signal'),
    createLocalizedReportTooltipRule('landing-forecast', 'main.tooltipRules.forecast', 'Forecast'),
    createLocalizedReportTooltipRule(
        'landing-current-prediction',
        'main.tooltipRules.currentPrediction',
        'Current prediction'
    ),
    createLocalizedReportTooltipRule(
        'landing-prediction-history',
        'main.tooltipRules.predictionHistory',
        'Prediction history'
    ),
    createLocalizedReportTooltipRule(
        'landing-backtest-summary',
        'main.tooltipRules.backtestSummary',
        'Backtest summary'
    ),
    createLocalizedReportTooltipRule('landing-diagnostics', 'main.tooltipRules.diagnostics', 'Diagnostics'),
    createLocalizedReportTooltipRule('landing-analysis', 'main.tooltipRules.analysis', 'Analysis'),
    createLocalizedReportTooltipRule('landing-explain', 'main.tooltipRules.explain', 'Explain'),
    createLocalizedReportTooltipRule('landing-truthfulness', 'main.tooltipRules.truthfulness', 'Truthfulness contour'),
    createLocalizedReportTooltipRule('landing-time-horizon', 'main.tooltipRules.timeHorizon', '24h horizon'),
    createLocalizedReportTooltipRule('landing-time-horizon-why', 'main.tooltipRules.timeHorizonWhy', 'Почему?'),
    createLocalizedReportTooltipRule('landing-day-up', 'main.tooltipRules.dayUp', 'Рост'),
    createLocalizedReportTooltipRule('landing-day-down', 'main.tooltipRules.dayDown', 'Падение'),
    createLocalizedReportTooltipRule('landing-day-flat', 'main.tooltipRules.dayFlat', 'Боковик'),
    createLocalizedReportTooltipRule('landing-early-preview', 'main.tooltipRules.earlyPreview', 'Early preview'),
    createLocalizedReportTooltipRule(
        'landing-path-labeling',
        'main.tooltipRules.pathBasedLabeling',
        'Path-based labeling'
    ),
    createLocalizedReportTooltipRule('landing-micro-model', 'main.tooltipRules.microModel', 'Micro model'),
    createLocalizedReportTooltipRule('landing-multi-layer', 'main.tooltipRules.multiLayer', 'Multi-layer'),
    createLocalizedReportTooltipRule('landing-sl-risk', 'main.tooltipRules.slRisk', 'SL risk'),
    createLocalizedReportTooltipRule('landing-guardrail', 'main.tooltipRules.guardrail', 'Guardrail'),
    createLocalizedReportTooltipRule('landing-specificity', 'main.tooltipRules.specificity', 'Specificity'),
    createLocalizedReportTooltipRule('landing-blame-split', 'main.tooltipRules.blameSplit', 'Blame split'),
    createLocalizedReportTooltipRule('landing-hotspots', 'main.tooltipRules.hotspots', 'Hotspots'),
    createLocalizedReportTooltipRule('landing-pfi', 'main.tooltipRules.pfi', 'PFI'),
    createLocalizedReportTooltipRule(
        'landing-confusion-matrix',
        'main.tooltipRules.confusionMatrix',
        'Confusion matrix'
    ),
    createLocalizedReportTooltipRule('landing-model-metrics', 'main.tooltipRules.modelMetrics', 'Model metrics'),
    createLocalizedReportTooltipRule(
        'landing-policy-branch-mega',
        'main.tooltipRules.policyBranchMega',
        'Policy Branch Mega'
    ),
    createLocalizedReportTooltipRule('landing-no-trade', 'main.tooltipRules.noTrade', 'NoTrade'),
    createLocalizedReportTooltipRule('landing-attribution', 'main.tooltipRules.attribution', 'Attribution'),
    createLocalizedReportTooltipRule(
        'landing-feature-importance',
        'main.tooltipRules.featureImportance',
        'Feature importance'
    ),
    createLocalizedReportTooltipRule(
        'landing-aggregation',
        'main.tooltipRules.predictionAggregation',
        'Prediction aggregation'
    ),
    createLocalizedReportTooltipRule('landing-all-history', 'main.tooltipRules.allHistory', 'ALL HISTORY'),
    createLocalizedReportTooltipRule(
        'landing-baseline-backtest',
        'main.tooltipRules.baselineBacktest',
        'Baseline backtest'
    ),
    createLocalizedReportTooltipRule(
        'landing-experimental-backtest',
        'main.tooltipRules.experimentalBacktest',
        'Experimental backtest'
    ),
    createLocalizedReportTooltipRule(
        'landing-model-confidence',
        'main.tooltipRules.modelConfidence',
        'Model confidence'
    ),
    createLocalizedReportTooltipRule(
        'landing-liquidation-buffer',
        'main.tooltipRules.liquidationBuffer',
        'Liquidation buffer'
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

function reportTermTooltipRegistryIssues(): void {
    if (didReportTermTooltipRegistryIssues || TERM_TOOLTIP_REGISTRY_ISSUES.length === 0) {
        return
    }

    didReportTermTooltipRegistryIssues = true
    TERM_TOOLTIP_REGISTRY_ISSUES.forEach(issue => {
        console.error(new Error(formatTermTooltipRegistryIssue(issue)))
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
    if (typeof rule.description === 'function') {
        return rule.description()
    }

    if (typeof rule.description !== 'string') {
        return rule.description
    }

    if (recursionDepth >= maxRecursionDepth) {
        return renderPlainTextBlocks(stripExplicitTermMarkup(rule.description))
    }

    const selfExclusions = [matchedValue]
    if (rule.title) {
        selfExclusions.push(rule.title)
    }

    return renderTermTooltipRichText(rule.description, {
        excludeTerms: selfExclusions,
        excludeRuleIds: [...excludedRuleIds, rule.id],
        excludeRuleTitles: rule.title ? [rule.title] : [],
        recursionDepth: recursionDepth + 1,
        maxRecursionDepth
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
        return [text]
    }

    const nodes: ReactNode[] = []
    let cursor = 0

    matches.forEach((match, index) => {
        if (match.start > cursor) {
            nodes.push(text.slice(cursor, match.start))
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
        nodes.push(text.slice(cursor))
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
                nodes.push(segment.label)
                return
            }

            const normalizedLabel = normalizeComparableTerm(segment.label)
            const normalizedRuleTitle = normalizeComparableTerm(rule.title ?? '')
            if (
                (normalizedLabel && (excludedTerms.has(normalizedLabel) || excludedRuleTitles.has(normalizedLabel))) ||
                (normalizedRuleTitle && excludedRuleTitles.has(normalizedRuleTitle))
            ) {
                nodes.push(segment.label)
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
    console.error(error)
}

function renderPlainTextBlocks(text: string): ReactNode {
    const normalizedText = normalizeOrderedListParagraphs(normalizeBrokenExplicitTermMarkup(text))
    const paragraphs = splitNonEmptyParagraphs(normalizedText)

    if (paragraphs.length === 0) {
        return text
    }

    const shouldRenderStructuredBlocks = paragraphs.length > 1 || paragraphs.some(paragraph => paragraph.includes('\n'))

    if (!shouldRenderStructuredBlocks) {
        return paragraphs[0].trim()
    }

    return (
        <>
            {paragraphs.map((paragraph, paragraphIndex) => {
                return renderStructuredParagraph(paragraph, `plain-paragraph-${paragraphIndex}`, line => line)
            })}
        </>
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
                        paragraphs[0].trim(),
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
        if (import.meta.env.DEV) {
            console.error(error)
        }

        return renderPlainTextBlocks(text)
    }
}

reportMatcherFixtureValidationError()
