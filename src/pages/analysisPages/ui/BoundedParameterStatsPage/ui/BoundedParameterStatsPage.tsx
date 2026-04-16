import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import classNames from '@/shared/lib/helpers/classNames'
import {
    buildPublishedReportVariantCompatibleOptions,
    resolvePublishedReportVariantSelection,
    usePublishedReportVariantCatalogQuery
} from '@/shared/api/tanstackQueries/reportVariants'
import {
    type BacktestBoundedParameterStatsQueryArgs,
    useBacktestBoundedParameterStatsReportQuery
} from '@/shared/api/tanstackQueries/backtestBoundedParameterStats'
import { useModePageBindingState } from '@/shared/api/tanstackQueries/modePageBinding'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'
import { PageDataState } from '@/shared/ui/errors/PageDataState'
import { ReportDocumentView, ReportViewControls, Text, type ReportViewControlGroup } from '@/shared/ui'
import cls from './BoundedParameterStatsPage.module.scss'
import type { BoundedParameterStatsPageProps } from './types'

const BOUNDED_PARAMETER_AXIS_ORDER = ['owner', 'parameter'] as const

// Страница сама не знает owner-каталог параметров: выбор строится только из published variant catalog.
function buildBoundedParameterStatsQueryArgs(
    selection: Record<string, string> | null
): BacktestBoundedParameterStatsQueryArgs | undefined {
    if (!selection) {
        return undefined
    }

    return {
        owner: selection.owner,
        parameter: selection.parameter
    }
}

function FixedSplitBoundedParameterStatsPage({ className }: BoundedParameterStatsPageProps) {
    const { t } = useTranslation('reports')
    const [searchParams, setSearchParams] = useSearchParams()
    const bindingState = useModePageBindingState(
        'bounded_parameter_stats',
        'directional_fixed_split',
        'bounded-parameter-stats-page'
    )
    const variantFamilyKey = bindingState.binding?.publishedReportFamilyKey ?? null
    const variantFamilyError = useMemo(
        () =>
            bindingState.binding && !variantFamilyKey ?
                normalizeErrorLike(null, 'Bounded parameter route binding is missing published report family.', {
                    source: 'bounded-parameter-stats-binding',
                    domain: 'ui_section',
                    owner: 'bounded-parameter-stats-page',
                    expected: 'The fixed-split bounded-parameter route binding should publish its report family key in /api/modes.',
                    requiredAction: 'Inspect /api/modes page binding for bounded_parameter_stats.'
                })
            :   null,
        [bindingState.binding, variantFamilyKey]
    )
    const variantCatalogQuery = usePublishedReportVariantCatalogQuery(variantFamilyKey ?? '__missing_mode_family__', {
        enabled: Boolean(variantFamilyKey) && !bindingState.error && !variantFamilyError
    })

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
                    owner: searchParams.get('owner'),
                    parameter: searchParams.get('parameter')
                }),
                error: null as Error | null
            }
        } catch (error) {
            return {
                value: null,
                error: normalizeErrorLike(error, 'Failed to resolve bounded parameter stats selection.', {
                    source: 'bounded-parameter-stats-selection',
                    domain: 'ui_section',
                    owner: 'bounded-parameter-stats-page',
                    expected: 'Bounded parameter stats page should resolve a valid published owner/parameter selection from URL params.',
                    requiredAction: 'Inspect owner/parameter query params and published variant catalog.'
                })
            }
        }
    }, [searchParams, variantCatalogQuery.data])

    const effectiveSelection = selectionState.value?.selection ?? null
    const queryArgs = useMemo(() => buildBoundedParameterStatsQueryArgs(effectiveSelection), [effectiveSelection])
    const reportQuery = useBacktestBoundedParameterStatsReportQuery(queryArgs, {
        enabled:
            Boolean(effectiveSelection) &&
            !variantCatalogQuery.isError &&
            !selectionState.error &&
            !bindingState.error &&
            !variantFamilyError
    })

    const updateAxis = useCallback((axisKey: (typeof BOUNDED_PARAMETER_AXIS_ORDER)[number], nextValue: string) => {
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set(axisKey, nextValue)

        const changedIndex = BOUNDED_PARAMETER_AXIS_ORDER.indexOf(axisKey)
        BOUNDED_PARAMETER_AXIS_ORDER.slice(changedIndex + 1).forEach(key => nextParams.delete(key))
        setSearchParams(nextParams, { replace: true })
    }, [searchParams, setSearchParams])

    const controlGroups = useMemo<ReportViewControlGroup[]>(() => {
        if (!variantCatalogQuery.data || !effectiveSelection) {
            return []
        }

        return [
            {
                key: 'owner',
                label: t('boundedParameterStats.controls.owner.label', { defaultValue: 'Группа ограничителей' }),
                infoTooltip: t('boundedParameterStats.controls.owner.tooltip', {
                    defaultValue: 'Один owner объединяет только свои ограничители и свою формулу. Эта страница не смешивает их между собой.'
                }),
                value: effectiveSelection.owner,
                options: buildPublishedReportVariantCompatibleOptions(
                    variantCatalogQuery.data,
                    effectiveSelection,
                    'owner'
                ).map(option => ({
                    value: option.value,
                    label: option.label
                })),
                onChange: next => updateAxis('owner', next)
            },
            {
                key: 'parameter',
                label: t('boundedParameterStats.controls.parameter.label', { defaultValue: 'Ограничивающий параметр' }),
                infoTooltip: t('boundedParameterStats.controls.parameter.tooltip', {
                    defaultValue: 'Для выбранного параметра страница показывает всю сетку значений, качество моделей и фактическое число срабатываний ограничения.'
                }),
                value: effectiveSelection.parameter,
                options: buildPublishedReportVariantCompatibleOptions(
                    variantCatalogQuery.data,
                    effectiveSelection,
                    'parameter'
                ).map(option => ({
                    value: option.value,
                    label: option.label
                })),
                onChange: next => updateAxis('parameter', next)
            }
        ]
    }, [effectiveSelection, t, updateAxis, variantCatalogQuery.data])

    const pageError =
        bindingState.error ??
        variantFamilyError ??
        selectionState.error ??
        variantCatalogQuery.error ??
        reportQuery.error ??
        null
    const freshness = useMemo(
        () => ({
            statusMode: 'debug' as const,
            statusTitle: t('boundedParameterStats.page.status.title', {
                defaultValue: 'DEBUG: freshness not verified'
            }),
            statusMessage: t('boundedParameterStats.page.status.message', {
                defaultValue:
                    'Status endpoint для backtest_bounded_parameter_stats не настроен: показываются metadata отчёта без freshness-проверки.'
            })
        }),
        [t]
    )

    return (
        <div className={classNames(cls.root, {}, [className ?? ''])} data-tooltip-boundary>
            <PageDataState
                shell={
                    <>
                        <section className={cls.hero}>
                            <Text type='h1'>
                                {t('boundedParameterStats.page.title', {
                                    defaultValue: 'Статистика ограничивающих параметров'
                                })}
                            </Text>
                            <Text>
                                {t('boundedParameterStats.page.subtitle', {
                                    defaultValue:
                                        'Страница сравнивает сетку значений для одного ограничивающего параметра и показывает, как меняется качество моделей, частота срабатывания ограничения и итоговое поведение формулы.'
                                })}
                            </Text>
                        </section>

                        <section className={cls.controls}>
                            <ReportViewControls groups={controlGroups} />
                        </section>
                    </>
                }
                hasData={Boolean(reportQuery.data)}
                isLoading={variantCatalogQuery.isLoading || reportQuery.isLoading}
                isError={Boolean(pageError)}
                error={pageError}
                loadingText={t('boundedParameterStats.page.loading', {
                    defaultValue: 'Загружаю статистику ограничивающих параметров'
                })}
                title={t('boundedParameterStats.page.errorTitle', {
                    defaultValue: 'Не удалось загрузить статистику ограничивающих параметров'
                })}
                description={t('boundedParameterStats.page.errorMessage', {
                    defaultValue: 'Проверь published variant catalog и выбранные owner/parameter значения.'
                })}
                onRetry={() => {
                    bindingState.refetch()
                    void variantCatalogQuery.refetch()
                    void reportQuery.refetch()
                }}>
                <section className={cls.report}>
                    {reportQuery.data && (
                        <ReportDocumentView
                            report={reportQuery.data}
                            freshness={freshness}
                            showTableTermsBlock={false}
                        />
                    )}
                </section>
            </PageDataState>
        </div>
    )
}

export default function BoundedParameterStatsPage(props: BoundedParameterStatsPageProps) {
    return <FixedSplitBoundedParameterStatsPage {...props} />
}
