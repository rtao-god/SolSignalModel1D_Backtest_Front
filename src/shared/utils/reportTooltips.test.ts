import { validateCommonTooltipDescription } from '@/shared/terms/common/tooltipQuality'
import { resolveCommonReportColumnTooltipOrNull } from '@/shared/terms/common'
import { DIAGNOSTICS_SHARED_TERM_KEYS } from '@/shared/terms/reports/diagnostics'
import {
    BACKTEST_SUMMARY_COLUMN_KEYS,
    BACKTEST_EXECUTION_PIPELINE_COLUMN_KEYS,
    BACKTEST_EXECUTION_PIPELINE_KEY_KEYS,
    BACKTEST_SUMMARY_KEY_KEYS,
    CURRENT_PREDICTION_OWNER_COLUMN_KEYS,
    CURRENT_PREDICTION_OWNER_KEY_KEYS,
    DIAGNOSTICS_EXACT_KEYS,
    MODEL_STATS_COLUMN_KEYS,
    PFI_COLUMN_KEYS,
    resolveReportColumnTooltip,
    resolveReportKeyTooltip
} from './reportTooltips'

describe('report tooltips shared-term guard', () => {
    test('keeps diagnostics shared terms on canonical shared descriptions in RU and EN', () => {
        ;(['ru', 'en'] as const).forEach(locale => {
            DIAGNOSTICS_SHARED_TERM_KEYS.forEach(title => {
                expect(resolveReportColumnTooltip('backtest_diagnostics', undefined, title, locale)).toBe(
                    resolveCommonReportColumnTooltipOrNull(title, locale)
                )
            })
        })
    })

    test('keeps backtest summary Policy and Branch on canonical shared descriptions in RU and EN', () => {
        ;(['ru', 'en'] as const).forEach(locale => {
            ;(['Policy', 'Branch'] as const).forEach(title => {
                expect(resolveReportColumnTooltip('backtest_summary', undefined, title, locale)).toBe(
                    resolveCommonReportColumnTooltipOrNull(title, locale)
                )
            })
        })
    })

    test('keeps execution pipeline Policy on canonical shared description in RU and EN', () => {
        ;(['ru', 'en'] as const).forEach(locale => {
            expect(resolveReportColumnTooltip('backtest_execution_pipeline', undefined, 'Policy', locale)).toBe(
                resolveCommonReportColumnTooltipOrNull('Policy', locale)
            )
        })
    })

    test('keeps current prediction Policy and Branch on canonical shared descriptions in RU and EN', () => {
        ;(['ru', 'en'] as const).forEach(locale => {
            ;(['Policy', 'Branch'] as const).forEach(title => {
                expect(resolveReportColumnTooltip('current_prediction_history', undefined, title, locale)).toBe(
                    resolveCommonReportColumnTooltipOrNull(title, locale)
                )
            })
        })
    })

    test('localizes explain-layer fallback inside unknown current prediction columns', () => {
        const ru = resolveReportColumnTooltip('current_prediction_history', undefined, 'UnknownColumn', 'ru')

        expect(ru).toContain('таблицы [[landing-explain|слоя пояснений]]')
        expect(ru).not.toContain('explain-таблицы')
    })

    test('never returns generic diagnostics placeholder text', () => {
        const ru = resolveReportColumnTooltip('backtest_diagnostics', undefined, 'UndefinedReason', 'ru')
        const en = resolveReportColumnTooltip('backtest_diagnostics', undefined, 'UndefinedReason', 'en')

        expect(ru).not.toContain('Точное определение зависит от таблицы; см. описание секции выше.')
        expect(en).not.toContain('Exact definition depends on table context; see section description.')
    })

    test('builds grouped diagnostics tooltips instead of generic fallback', () => {
        const anomalyRu = resolveReportColumnTooltip('backtest_diagnostics', undefined, 'data_anomaly_gap_count', 'ru')
        const specificityRu = resolveReportColumnTooltip('backtest_diagnostics', undefined, 'Specificity', 'ru')
        const attributionRu = resolveReportColumnTooltip('backtest_diagnostics', undefined, 'Bucket', 'ru')
        const rollingYearRu = resolveReportColumnTooltip(
            'backtest_diagnostics',
            'Specificity Rolling Guardrail (BY YEAR)',
            'Year',
            'ru'
        )
        const specificityDaysRu = resolveReportColumnTooltip(
            'backtest_diagnostics',
            'Policy Specificity Split (ALL HISTORY, WITH SL)',
            'SpecificDays',
            'ru'
        )
        const globalModeRu = resolveReportColumnTooltip(
            'backtest_diagnostics',
            'Specificity Global Thresholds',
            'Mode',
            'ru'
        )
        const minMoveDeltaRu = resolveReportColumnTooltip(
            'backtest_diagnostics',
            'Specificity Rolling Guardrail (BY YEAR)',
            'MinMoveP90_vs_global_delta%',
            'ru'
        )
        const anomalyEn = resolveReportColumnTooltip('backtest_diagnostics', undefined, 'data_anomaly_gap_count', 'en')
        const guardrailEn = resolveReportColumnTooltip('backtest_diagnostics', undefined, 'Specificity', 'en')

        expect(anomalyRu).toContain('data_anomaly_gap_count')
        expect(anomalyRu).toContain('разрывы между соседними отметками времени')
        expect(specificityRu).toContain('Specificity — доля хороших base-trade дней')
        expect(attributionRu).toContain('Bucket — независимый контур симуляции')
        expect(rollingYearRu).toContain('календарный год')
        expect(specificityDaysRu).toContain('сколько дней попало в класс specific')
        expect(globalModeRu).toContain('вариант глобального порога')
        expect(minMoveDeltaRu).toContain('казуального')
        expect(minMoveDeltaRu).toContain('текущий режим специфичности')
        expect(anomalyEn).toContain('data_anomaly_gap_count')
        expect(anomalyEn).toContain('discontinuities were found between neighboring timestamps')
        expect(guardrailEn).toContain('share of good base-trade days')
    })

    test('keeps diagnostics exact owner-tooltips full and structured in RU and EN', () => {
        ;(['ru', 'en'] as const).forEach(locale => {
            DIAGNOSTICS_EXACT_KEYS.forEach(key => {
                const description = resolveReportColumnTooltip('backtest_diagnostics', undefined, key, locale)
                const issues = validateCommonTooltipDescription(description)

                expect(issues, `[${locale}] diagnostics tooltip "${key}" has quality issues`).toEqual([])
            })
        })
    })

    test('keeps diagnostics hotspots and decision-day tooltips full and section-aware in RU and EN', () => {
        const hotspotsAndDecisionTerms = [
            {
                sectionTitle: 'Policy Opposite Hotspots',
                key: 'Type'
            },
            {
                sectionTitle: 'Policy Opposite Hotspots',
                key: 'MarketReturn%'
            },
            {
                sectionTitle: 'Policy Opposite Hotspots',
                key: 'IsSpecificityDay'
            },
            {
                sectionTitle: 'Policy Opposite Hotspots',
                key: 'Opp%'
            },
            {
                sectionTitle: 'Policy Opposite Hotspots',
                key: 'OppHarmSum%'
            },
            {
                sectionTitle: 'Policy NoTrade Hotspots',
                key: 'NoTradeOppAvg%'
            },
            {
                sectionTitle: 'Policy Low-Coverage Hotspots',
                key: 'Trade%'
            },
            {
                sectionTitle: 'Top Decision Days (Opposite Harm, TOP 20)',
                key: 'MarketReturn%'
            },
            {
                sectionTitle: 'Top Decision Days (Opposite Harm, TOP 20)',
                key: 'IsSpecificityDay'
            }
        ] as const

        ;(['ru', 'en'] as const).forEach(locale => {
            hotspotsAndDecisionTerms.forEach(({ sectionTitle, key }) => {
                const description = resolveReportColumnTooltip('backtest_diagnostics', sectionTitle, key, locale)
                const issues = validateCommonTooltipDescription(description)

                expect(
                    issues,
                    `[${locale}] diagnostics tooltip "${sectionTitle}:${key}" has quality issues`
                ).toEqual([])
            })
        })
    })

    test('keeps diagnostics day-type tooltips full and structured in RU and EN', () => {
        ;(['ru', 'en'] as const).forEach(locale => {
            ;(['UpOpp%', 'FlatPnL%', 'DownOppDirDays'] as const).forEach(key => {
                const description = resolveReportColumnTooltip('backtest_diagnostics', undefined, key, locale)
                const issues = validateCommonTooltipDescription(description)

                expect(issues, `[${locale}] diagnostics day-type tooltip "${key}" has quality issues`).toEqual([])
            })
        })
    })

    test('keeps report owner-tooltips full and structured across shared report maps', () => {
        const reportColumnSuites = [
            {
                reportKind: 'backtest_summary',
                keys: BACKTEST_SUMMARY_COLUMN_KEYS
            },
            {
                reportKind: 'backtest_execution_pipeline',
                keys: BACKTEST_EXECUTION_PIPELINE_COLUMN_KEYS
            },
            {
                reportKind: 'current_prediction_history',
                keys: CURRENT_PREDICTION_OWNER_COLUMN_KEYS
            },
            {
                reportKind: 'pfi_per_model',
                keys: PFI_COLUMN_KEYS
            },
            {
                reportKind: 'backtest_model_stats',
                keys: MODEL_STATS_COLUMN_KEYS
            }
        ] as const

        const issues: string[] = []

        ;(['ru', 'en'] as const).forEach(locale => {
            reportColumnSuites.forEach(suite => {
                suite.keys.forEach(key => {
                    const description = resolveReportColumnTooltip(suite.reportKind, undefined, key, locale)
                    const descriptionIssues = validateCommonTooltipDescription(description)

                    issues.push(
                        ...descriptionIssues.map(
                            issue =>
                                `[${locale}] report column tooltip "${suite.reportKind}:${key}" has quality issue: ${issue.message}`
                        )
                    )
                })
            })

            BACKTEST_SUMMARY_KEY_KEYS.forEach(key => {
                const description = resolveReportKeyTooltip('backtest_summary', undefined, key, locale)
                const descriptionIssues = validateCommonTooltipDescription(description)

                issues.push(
                    ...descriptionIssues.map(
                        issue =>
                            `[${locale}] report key tooltip "backtest_summary:${key}" has quality issue: ${issue.message}`
                    )
                )
            })

            BACKTEST_EXECUTION_PIPELINE_KEY_KEYS.forEach(key => {
                const description = resolveReportKeyTooltip('backtest_execution_pipeline', undefined, key, locale)
                const descriptionIssues = validateCommonTooltipDescription(description)

                issues.push(
                    ...descriptionIssues.map(
                        issue =>
                            `[${locale}] report key tooltip "backtest_execution_pipeline:${key}" has quality issue: ${issue.message}`
                    )
                )
            })

            CURRENT_PREDICTION_OWNER_KEY_KEYS.forEach(key => {
                const description = resolveReportKeyTooltip('current_prediction_history', undefined, key, locale)
                const descriptionIssues = validateCommonTooltipDescription(description)

                issues.push(
                    ...descriptionIssues.map(
                        issue =>
                            `[${locale}] report key tooltip "current_prediction_history:${key}" has quality issue: ${issue.message}`
                    )
                )
            })
        })

        expect(issues).toEqual([])
    })

    test('resolves model-stats Day type tooltip in both exact casings', () => {
        ;(['ru', 'en'] as const).forEach(locale => {
            expect(resolveReportColumnTooltip('backtest_model_stats', undefined, 'Day type', locale)).toContain(
                locale === 'ru' ? 'фактический класс дня' : 'factual day or row class'
            )
            expect(resolveReportColumnTooltip('backtest_model_stats', undefined, 'day type', locale)).toContain(
                locale === 'ru' ? 'фактический класс дня' : 'factual day or row class'
            )
        })
    })

    test('resolves live backend model-stats column aliases in RU and EN', () => {
        ;(['ru', 'en'] as const).forEach(locale => {
            expect(resolveReportColumnTooltip('backtest_model_stats', undefined, 'Accuracy, %', locale)).toContain(
                locale === 'ru' ? 'доля правильных прогнозов' : 'share of correct predictions'
            )
            expect(resolveReportColumnTooltip('backtest_model_stats', undefined, 'Threshold', locale)).toContain(
                locale === 'ru' ? 'значение threshold' : 'cut-off used by the SL model'
            )
            expect(
                resolveReportColumnTooltip('backtest_model_stats', undefined, 'Stop-loss day recall, %', locale)
            ).toContain(locale === 'ru' ? 'доля SL-дней' : 'share of stop-loss days')
            expect(
                resolveReportColumnTooltip('backtest_model_stats', undefined, 'High-risk prediction rate, %', locale)
            ).toContain(locale === 'ru' ? 'доля случаев' : 'share of cases')
        })
    })
})
