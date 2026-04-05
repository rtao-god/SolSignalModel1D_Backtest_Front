import { useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import classNames from '@/shared/lib/helpers/classNames'
import {
    buildPublishedReportVariantCompatibleOptions,
    PUBLISHED_REPORT_VARIANT_FAMILIES,
    resolvePublishedReportVariantSelection,
    usePublishedReportVariantCatalogQuery
} from '@/shared/api/tanstackQueries/reportVariants'
import {
    type BacktestBoundedParameterStatsQueryArgs,
    useBacktestBoundedParameterStatsReportQuery
} from '@/shared/api/tanstackQueries/backtestBoundedParameterStats'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'
import { SectionDataState } from '@/shared/ui/errors/SectionDataState'
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

export default function BoundedParameterStatsPage({ className }: BoundedParameterStatsPageProps) {
    const { t } = useTranslation('reports')
    const [searchParams, setSearchParams] = useSearchParams()
    const variantCatalogQuery = usePublishedReportVariantCatalogQuery(
        PUBLISHED_REPORT_VARIANT_FAMILIES.backtestBoundedParameterStats
    )

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
        enabled: Boolean(effectiveSelection) && !variantCatalogQuery.isError && !selectionState.error
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

    const pageError = selectionState.error ?? variantCatalogQuery.error ?? reportQuery.error ?? null
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
            <section className={cls.hero}>
                <Text type='h1'>
                    {t('boundedParameterStats.page.title', { defaultValue: 'Статистика ограничивающих параметров' })}
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

            <section className={cls.report}>
                <SectionDataState
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
