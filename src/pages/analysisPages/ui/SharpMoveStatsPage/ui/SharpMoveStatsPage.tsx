import { useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import classNames from '@/shared/lib/helpers/classNames'
import {
    buildPublishedReportVariantCompatibleOptions,
    resolvePublishedReportVariantSelection,
    usePublishedReportVariantCatalogQuery,
    PUBLISHED_REPORT_VARIANT_FAMILIES,
    type PublishedReportVariantCatalogDto
} from '@/shared/api/tanstackQueries/reportVariants'
import {
    useBacktestSharpMoveStatsReportQuery,
    type BacktestSharpMoveStatsQueryArgs
} from '@/shared/api/tanstackQueries/backtestSharpMoveStats'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'
import { SectionDataState } from '@/shared/ui/errors/SectionDataState'
import {
    ReportDocumentView,
    ReportViewControls,
    Text,
    resolveCurrentPredictionTrainingScopeMeta,
    type ReportViewControlGroup
} from '@/shared/ui'
import { renderTermTooltipRichText } from '@/shared/ui/TermTooltip'
import type { CurrentPredictionTrainingScope } from '@/shared/api/endpoints/reportEndpoints'
import cls from './SharpMoveStatsPage.module.scss'
import type { SharpMoveStatsPageProps } from './types'

const SHARP_MOVE_AXIS_ORDER = ['scope', 'signal', 'outcome', 'threshold', 'horizon'] as const

function buildSharpMoveStatsQueryArgs(
    selection: Record<string, string> | null
): BacktestSharpMoveStatsQueryArgs | undefined {
    if (!selection) {
        return undefined
    }

    return {
        scope: selection.scope,
        signal: selection.signal,
        outcome: selection.outcome,
        threshold: selection.threshold,
        horizon: selection.horizon
    }
}

function resolveSignalLabel(value: string, translate: (key: string, options?: Record<string, unknown>) => string): string {
    return value === 'fall' ?
            translate('sharpMoveStats.controls.signal.options.fall.label', { defaultValue: 'Падение' })
        :   translate('sharpMoveStats.controls.signal.options.rise.label', { defaultValue: 'Рост' })
}

function resolveSignalHint(value: string, translate: (key: string, options?: Record<string, unknown>) => string): string {
    return value === 'fall' ?
            translate('sharpMoveStats.controls.signal.options.fall.hint', {
                defaultValue: 'Сигнал срабатывает после резкого падения цены монеты.'
            })
        :   translate('sharpMoveStats.controls.signal.options.rise.hint', {
                defaultValue: 'Сигнал срабатывает после резкого роста цены монеты.'
            })
}

function resolveOutcomeLabel(
    value: string,
    translate: (key: string, options?: Record<string, unknown>) => string
): string {
    return value === 'reversal' ?
            translate('sharpMoveStats.controls.outcome.options.reversal.label', { defaultValue: 'Разворот' })
        :   translate('sharpMoveStats.controls.outcome.options.continuation.label', {
                defaultValue: 'Продолжение'
            })
}

function resolveOutcomeHint(
    value: string,
    translate: (key: string, options?: Record<string, unknown>) => string
): string {
    return value === 'reversal' ?
            translate('sharpMoveStats.controls.outcome.options.reversal.hint', {
                defaultValue: 'Показывает, как часто импульс быстро разворачивался в обратную сторону.'
            })
        :   translate('sharpMoveStats.controls.outcome.options.continuation.hint', {
                defaultValue: 'Показывает, как часто импульс продолжался в ту же сторону.'
            })
}

function resolveAxisOptions(
    catalog: PublishedReportVariantCatalogDto,
    resolvedSelection: Record<string, string>,
    axisKey: (typeof SHARP_MOVE_AXIS_ORDER)[number],
    translate: (key: string, options?: Record<string, unknown>) => string
) {
    return buildPublishedReportVariantCompatibleOptions(catalog, resolvedSelection, axisKey).map(option => {
        if (axisKey === 'scope') {
            const scopeMeta = resolveCurrentPredictionTrainingScopeMeta(option.value as CurrentPredictionTrainingScope)
            return {
                value: option.value,
                label: scopeMeta.label,
                tooltip: scopeMeta.hint
            }
        }

        if (axisKey === 'signal') {
            return {
                value: option.value,
                label: resolveSignalLabel(option.value, translate),
                tooltip: resolveSignalHint(option.value, translate)
            }
        }

        if (axisKey === 'outcome') {
            return {
                value: option.value,
                label: resolveOutcomeLabel(option.value, translate),
                tooltip: resolveOutcomeHint(option.value, translate)
            }
        }

        if (axisKey === 'threshold') {
            return {
                value: option.value,
                label: `${option.value}%`
            }
        }

        return {
            value: option.value,
            label: `${option.value}d`
        }
    })
}

export default function SharpMoveStatsPage({ className }: SharpMoveStatsPageProps) {
    const { t } = useTranslation('reports')
    const [searchParams, setSearchParams] = useSearchParams()
    const variantCatalogQuery = usePublishedReportVariantCatalogQuery(PUBLISHED_REPORT_VARIANT_FAMILIES.backtestSharpMoveStats)

    const selectionState = useMemo(() => {
        if (!variantCatalogQuery.data) {
            return {
                value: null,
                error: null as Error | null
            }
        }

        try {
            return {
                value: resolvePublishedReportVariantSelection(variantCatalogQuery.data, {
                    scope: searchParams.get('scope'),
                    signal: searchParams.get('signal'),
                    outcome: searchParams.get('outcome'),
                    threshold: searchParams.get('threshold'),
                    horizon: searchParams.get('horizon')
                }),
                error: null as Error | null
            }
        } catch (err) {
            return {
                value: null,
                error: normalizeErrorLike(err, 'Failed to resolve sharp-move selection.', {
                    source: 'sharp-move-selection',
                    domain: 'ui_section',
                    owner: 'sharp-move-stats-page',
                    expected: 'Sharp move stats page should resolve a valid published variant selection from URL params.',
                    requiredAction: 'Inspect sharp-move query params and published variant catalog.'
                })
            }
        }
    }, [searchParams, variantCatalogQuery.data])

    const effectiveSelection = selectionState.value?.selection ?? null
    const queryArgs = useMemo(() => buildSharpMoveStatsQueryArgs(effectiveSelection), [effectiveSelection])
    const reportQuery = useBacktestSharpMoveStatsReportQuery(queryArgs, {
        enabled: Boolean(effectiveSelection) && !variantCatalogQuery.isError && !selectionState.error
    })

    const updateAxis = (
        axisKey: (typeof SHARP_MOVE_AXIS_ORDER)[number],
        nextValue: string
    ) => {
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set(axisKey, nextValue)

        const changedIndex = SHARP_MOVE_AXIS_ORDER.indexOf(axisKey)
        SHARP_MOVE_AXIS_ORDER.slice(changedIndex + 1).forEach(key => nextParams.delete(key))
        setSearchParams(nextParams, { replace: true })
    }

    const controlGroups = useMemo<ReportViewControlGroup[]>(() => {
        if (!variantCatalogQuery.data || !effectiveSelection) {
            return []
        }

        return [
            {
                key: 'scope',
                label: t('sharpMoveStats.controls.scope.label', { defaultValue: 'Срез данных' }),
                infoTooltip: t('sharpMoveStats.controls.scope.tooltip', {
                    defaultValue:
                        'Full показывает всю историю, Train оставляет только обучающую часть, OOS показывает новые для модели дни, Recent сжимает OOS до свежего хвоста.'
                }),
                value: effectiveSelection.scope,
                options: resolveAxisOptions(variantCatalogQuery.data, effectiveSelection, 'scope', t),
                onChange: next => updateAxis('scope', next)
            },
            {
                key: 'signal',
                label: t('sharpMoveStats.controls.signal.label', { defaultValue: 'Сигнал' }),
                infoTooltip: t('sharpMoveStats.controls.signal.tooltip', {
                    defaultValue: 'Отдельные режимы для резкого роста и резкого падения цены монеты.'
                }),
                value: effectiveSelection.signal,
                options: resolveAxisOptions(variantCatalogQuery.data, effectiveSelection, 'signal', t),
                onChange: next => updateAxis('signal', next)
            },
            {
                key: 'outcome',
                label: t('sharpMoveStats.controls.outcome.label', { defaultValue: 'Исход' }),
                infoTooltip: t('sharpMoveStats.controls.outcome.tooltip', {
                    defaultValue: 'Продолжение и разворот считаются как отдельные закономерности.'
                }),
                value: effectiveSelection.outcome,
                options: resolveAxisOptions(variantCatalogQuery.data, effectiveSelection, 'outcome', t),
                onChange: next => updateAxis('outcome', next)
            },
            {
                key: 'threshold',
                label: t('sharpMoveStats.controls.threshold.label', { defaultValue: 'Порог' }),
                infoTooltip: t('sharpMoveStats.controls.threshold.tooltip', {
                    defaultValue: 'Минимальный размер исходного импульса и целевого добора после сигнала.'
                }),
                value: effectiveSelection.threshold,
                options: resolveAxisOptions(variantCatalogQuery.data, effectiveSelection, 'threshold', t),
                onChange: next => updateAxis('threshold', next)
            },
            {
                key: 'horizon',
                label: t('sharpMoveStats.controls.horizon.label', { defaultValue: 'Горизонт' }),
                infoTooltip: t('sharpMoveStats.controls.horizon.tooltip', {
                    defaultValue: 'Сколько дней после сигнала даётся сценарию на продолжение или разворот.'
                }),
                value: effectiveSelection.horizon,
                options: resolveAxisOptions(variantCatalogQuery.data, effectiveSelection, 'horizon', t),
                onChange: next => updateAxis('horizon', next)
            }
        ]
    }, [effectiveSelection, searchParams, setSearchParams, t, variantCatalogQuery.data])

    const pageError = selectionState.error ?? variantCatalogQuery.error ?? reportQuery.error ?? null
    const freshness = useMemo(
        () => ({
            statusMode: 'debug' as const,
            statusTitle: t('sharpMoveStats.page.status.title', {
                defaultValue: 'DEBUG: freshness not verified'
            }),
            statusMessage: t('sharpMoveStats.page.status.message', {
                defaultValue:
                    'Status endpoint для backtest_sharp_move_stats не настроен: показываются metadata отчёта без freshness-проверки.'
            })
        }),
        [t]
    )

    return (
        <div className={classNames(cls.root, {}, [className ?? ''])} data-tooltip-boundary>
            <section className={cls.hero}>
                <Text type='h1'>
                    {t('sharpMoveStats.page.title', { defaultValue: 'Статистика резких движений' })}
                </Text>
                <Text>
                    {renderTermTooltipRichText(
                        t('sharpMoveStats.page.subtitle', {
                            defaultValue:
                                'Страница проверяет, что чаще происходит после резкого импульса цены монеты: продолжение тренда или быстрый разворот. Сетка сразу считает рост и падение, пороги от 5% до 20% и горизонты от 1 до 30 дней.'
                        })
                    )}
                </Text>
            </section>

            <section className={cls.controls}>
                <ReportViewControls groups={controlGroups} />
            </section>

            <section className={cls.report}>
                <SectionDataState
                    hasData={Boolean(reportQuery.data)}
                    isLoading={variantCatalogQuery.isLoading || reportQuery.isLoading}
                    isError={Boolean(pageError)}
                    error={pageError}
                    loadingText={t('sharpMoveStats.page.loading', {
                        defaultValue: 'Загружаю статистику резких движений'
                    })}
                    title={t('sharpMoveStats.page.errorTitle', {
                        defaultValue: 'Не удалось загрузить статистику резких движений'
                    })}
                    description={t('sharpMoveStats.page.errorMessage', {
                        defaultValue: 'Проверь published variant catalog и выбранные параметры сценария.'
                    })}
                    onRetry={() => {
                        void variantCatalogQuery.refetch()
                        void reportQuery.refetch()
                    }}>
                    {reportQuery.data && (
                        <ReportDocumentView
                            report={reportQuery.data}
                            freshness={freshness}
                            showTableTermsBlock={false}
                        />
                    )}
                </SectionDataState>
            </section>
        </div>
    )
}
