import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { validateCommonTooltipDescription } from '../../../terms/common/tooltipQuality'
import {
    resolveMatchingTermTooltipRuleIds,
    resolveRegisteredTermTooltipRuleIds,
    resolveRegisteredTermTooltipRuleIdsByExactLabel
} from './renderTermTooltipRichText'

const PROJECT_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../../')
const REPORT_OWNER_TOOLTIP_KEYS = [
    'solana',
    'solUsdt',
    'mlProject',
    'mlModel',
    'btc',
    'macroIndicators',
    'features',
    'signal',
    'forecast',
    'currentPrediction',
    'predictionHistory',
    'backtestSummary',
    'diagnostics',
    'analysis',
    'explain',
    'truthfulness',
    'timeHorizon',
    'timeHorizonWhy',
    'nyseSession',
    'dayUp',
    'dayDown',
    'dayFlat',
    'pathBasedLabeling',
    'earlyPreview',
    'microModel',
    'multiLayer',
    'slRisk',
    'guardrail',
    'specificity',
    'blameSplit',
    'hotspots',
    'pfi',
    'confusionMatrix',
    'modelMetrics',
    'policyBranchMega',
    'noTrade',
    'attribution',
    'featureImportance',
    'predictionAggregation',
    'allHistory',
    'baselineBacktest',
    'experimentalBacktest',
    'modelConfidence',
    'liquidationBuffer'
] as const
const DOCS_OWNER_TERM_IDS = [
    'causal-term',
    'landing-omniscient',
    'landing-interop',
    'landing-report-document',
    'landing-leakage-guards'
] as const

function readProjectFile(relativePath: string): string {
    return readFileSync(resolve(PROJECT_ROOT, relativePath), 'utf8')
}

function readProjectJson<T>(relativePath: string): T {
    return JSON.parse(readProjectFile(relativePath)) as T
}

function collectExplicitTermIds(text: string): string[] {
    const pattern = /\[\[([a-z0-9_-]+)\|/gi
    const ids = new Set<string>()
    let next = pattern.exec(text)

    while (next) {
        const termId = next[1]?.trim()
        if (termId) {
            ids.add(termId)
        }

        next = pattern.exec(text)
    }

    return [...ids]
}

function isSharedOwnerTermId(termId: string): boolean {
    return termId.startsWith('landing-') || termId === 'causal-term'
}

function collectOwnerTooltipQualityIssues(): string[] {
    const locales = ['ru', 'en'] as const
    const issues: string[] = []

    locales.forEach(locale => {
        const reports = readProjectJson<{
            main?: { tooltipRules?: Record<string, string> }
        }>(`public/locales/${locale}/reports.json`)
        const docs = readProjectJson<{
            page?: {
                glossary?: {
                    terms?: Array<{ id?: string; description?: string }>
                }
            }
        }>(`public/locales/${locale}/docs.json`)

        REPORT_OWNER_TOOLTIP_KEYS.forEach(key => {
            const description = reports.main?.tooltipRules?.[key]

            if (typeof description !== 'string') {
                issues.push(`[${locale}] reports.main.tooltipRules.${key}: missing owner description`)
                return
            }

            validateCommonTooltipDescription(description).forEach(issue => {
                issues.push(`[${locale}] reports.main.tooltipRules.${key}: ${issue.type}: ${issue.message}`)
            })
        })

        DOCS_OWNER_TERM_IDS.forEach(termId => {
            const description = docs.page?.glossary?.terms?.find(term => term.id === termId)?.description ?? null

            if (typeof description !== 'string') {
                issues.push(`[${locale}] docs.page.glossary.terms.${termId}: missing owner description`)
                return
            }

            validateCommonTooltipDescription(description).forEach(issue => {
                issues.push(`[${locale}] docs.page.glossary.terms.${termId}: ${issue.type}: ${issue.message}`)
            })
        })
    })

    return issues
}

describe('renderTermTooltipRichText registry coverage', () => {
    test('keeps trading day owner-term copy and does not rename factual 24h fields', () => {
        const ruReports = readProjectFile('public/locales/ru/reports.json')
        const enReports = readProjectFile('public/locales/en/reports.json')
        const reportPresentationLocalization = readProjectFile('src/shared/utils/reportPresentationLocalization.ts')

        expect(ruReports).toContain('[[landing-time-horizon|торговый день]]')
        expect(ruReports).toContain('[[landing-nyse-session|американской сессии]]')
        expect(ruReports).toContain('Выходные в это окно не входят. [[why-weekends|Почему?]]')
        expect(ruReports).not.toContain('Расчёт этого окна идёт по [[landing-time-horizon-why|Нью-Йорку]].')
        expect(ruReports).not.toContain(
            'поэтому все разделы сайта сравнивают один и тот же тип дня, а не разные куски суток.'
        )
        expect(ruReports).not.toContain('24h horizon')
        expect(ruReports).toContain('09:30 по New York')
        expect(ruReports).toContain('13:30 UTC')
        expect(ruReports).toContain('14:30 UTC')

        expect(enReports).toContain('[[landing-time-horizon|trading day]]')
        expect(enReports).toContain('[[landing-nyse-session|U.S. regular session]]')
        expect(enReports).toContain('Weekends are excluded from this window. [[why-weekends|Why?]]')
        expect(enReports).not.toContain('This window is calculated against [[landing-time-horizon-why|New York]].')
        expect(enReports).not.toContain('24h horizon')
        expect(enReports).toContain('09:30 New York time')
        expect(enReports).toContain('13:30 UTC')
        expect(enReports).toContain('14:30 UTC')

        expect(reportPresentationLocalization).toContain("'24h max price': 'Максимальная цена за 24 часа'")
        expect(reportPresentationLocalization).toContain("'24h min price': 'Минимальная цена за 24 часа'")
        expect(reportPresentationLocalization).toContain("'24h close price': 'Цена закрытия через 24 часа'")
    })

    test('registers every shared owner-term id used in locale content', () => {
        const localeFiles = [
            'public/locales/ru/reports.json',
            'public/locales/en/reports.json',
            'public/locales/ru/guide.json',
            'public/locales/en/guide.json',
            'public/locales/ru/docs.json',
            'public/locales/en/docs.json'
        ]

        const explicitOwnerTermIds = new Set(
            localeFiles.flatMap(relativePath =>
                collectExplicitTermIds(readProjectFile(relativePath)).filter(isSharedOwnerTermId)
            )
        )
        const registeredRuleIds = new Set(resolveRegisteredTermTooltipRuleIds())
        const missingRuleIds = [...explicitOwnerTermIds].filter(termId => !registeredRuleIds.has(termId))

        expect(missingRuleIds).toEqual([])
    })

    test('keeps localized landing/report owner descriptions in full-tooltip format', () => {
        expect(collectOwnerTooltipQualityIssues()).toEqual([])
    })

    test('prefers owner rules for composite product terms', () => {
        const scenarios = [
            { text: 'Trading day', expectedRuleId: 'landing-time-horizon' },
            { text: 'Торговый день', expectedRuleId: 'landing-time-horizon' },
            { text: 'New York trading day', expectedRuleId: 'landing-time-horizon' },
            { text: 'Торговый день по New York', expectedRuleId: 'landing-time-horizon' },
            { text: 'Американская сессия', expectedRuleId: 'landing-nyse-session' },
            { text: 'U.S. regular session', expectedRuleId: 'landing-nyse-session' },
            { text: 'NYSE regular session', expectedRuleId: 'landing-nyse-session' },
            { text: 'Current prediction', expectedRuleId: 'landing-current-prediction' },
            { text: 'Prediction history', expectedRuleId: 'landing-prediction-history' },
            { text: 'Backtest summary', expectedRuleId: 'landing-backtest-summary' },
            { text: 'Policy Branch Mega', expectedRuleId: 'landing-policy-branch-mega' },
            { text: 'Path-based labeling', expectedRuleId: 'landing-path-labeling' },
            { text: 'Blame split', expectedRuleId: 'landing-blame-split' },
            { text: 'Causal', expectedRuleId: 'causal-term' },
            { text: 'казуального', expectedRuleId: 'causal-term' },
            { text: 'Omniscient', expectedRuleId: 'landing-omniscient' },
            { text: 'Interop', expectedRuleId: 'landing-interop' },
            { text: 'ReportDocument', expectedRuleId: 'landing-report-document' },
            { text: 'Leakage guards', expectedRuleId: 'landing-leakage-guards' }
        ]

        scenarios.forEach(({ text, expectedRuleId }) => {
            expect(resolveMatchingTermTooltipRuleIds(text)).toContain(expectedRuleId)
        })
    })

    test('keeps causal aliases bound to one canonical shared rule id', () => {
        expect(resolveRegisteredTermTooltipRuleIds()).not.toContain('landing-causal')
        expect(resolveRegisteredTermTooltipRuleIdsByExactLabel('Causal')).toEqual(['causal-term'])
        expect(resolveRegisteredTermTooltipRuleIdsByExactLabel('казуал')).toEqual(['causal-term'])
        expect(resolveRegisteredTermTooltipRuleIdsByExactLabel('казуального')).toEqual(['causal-term'])
    })
})
