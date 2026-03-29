import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import classNames from '@/shared/lib/helpers/classNames'
import {
    ReportTableCard,
    ReportViewControls,
    Text,
    type ReportViewControlGroup
} from '@/shared/ui'
import { SectionDataState } from '@/shared/ui/errors/SectionDataState'
import type { TableRow } from '@/shared/ui/SortableTable'
import {
    type CurrentPredictionOosPresetEntry,
    type CurrentPredictionOosPresetAnalysisMode,
    useCurrentPredictionOosPresetAnalysisQuery
} from '@/shared/api/tanstackQueries/currentPrediction'
import cls from './CurrentPredictionOosPresetsPage.module.scss'
import type { CurrentPredictionOosPresetsPageProps } from './types'

function formatInteger(value: number, locale: string): string {
    return value.toLocaleString(locale)
}

function formatPercent(value: number, locale: string): string {
    return `${(value * 100).toLocaleString(locale, {
        minimumFractionDigits: 1,
        maximumFractionDigits: 1
    })}%`
}

function buildPresetName(entry: CurrentPredictionOosPresetEntry): string {
    return `${entry.requestedTradeSharePercent}% сделок`
}

function buildPresetRange(entry: CurrentPredictionOosPresetEntry): string {
    return `${entry.startPredictionDateUtc} .. ${entry.endPredictionDateUtc}`
}

function buildPresetTableRows(rows: CurrentPredictionOosPresetEntry[], locale: string): TableRow[] {
    return rows.map(entry => [
        buildPresetName(entry),
        `${formatInteger(entry.selectedTradeCount, locale)} сделок`,
        formatPercent(entry.selectedTradeShare, locale),
        `${formatInteger(entry.targetTradeCount, locale)} сделок`,
        `${formatInteger(entry.selectedDays, locale)} дней`,
        formatPercent(entry.selectedDayShare, locale),
        formatInteger(entry.daysWithTrades, locale),
        formatInteger(entry.daysWithoutTrades, locale),
        buildPresetRange(entry)
    ])
}

export default function CurrentPredictionOosPresetsPage({ className }: CurrentPredictionOosPresetsPageProps) {
    const { t, i18n } = useTranslation('reports')
    const [mode, setMode] = useState<CurrentPredictionOosPresetAnalysisMode>('base')

    const baseQuery = useCurrentPredictionOosPresetAnalysisQuery('base')
    const extendedQuery = useCurrentPredictionOosPresetAnalysisQuery('extended', {
        enabled: mode === 'extended'
    })

    const activeAnalysis = mode === 'extended' ? extendedQuery.data ?? baseQuery.data ?? null : baseQuery.data ?? null
    const pageRows = useMemo(
        () =>
            mode === 'extended' ?
                [...(baseQuery.data?.rows ?? []), ...(extendedQuery.data?.rows ?? [])]
            :   baseQuery.data?.rows ?? [],
        [baseQuery.data?.rows, extendedQuery.data?.rows, mode]
    )
    const pageError = baseQuery.error ?? (mode === 'extended' ? extendedQuery.error : null)
    const controlGroups = useMemo<ReportViewControlGroup[]>(
        () => [
            {
                key: 'oos-preset-analysis-mode',
                label: t('currentPredictionOosPresets.controls.mode.label', {
                    defaultValue: 'Режим таблицы'
                }),
                ariaLabel: t('currentPredictionOosPresets.controls.mode.ariaLabel', {
                    defaultValue: 'Выберите режим таблицы сравнения хвостов'
                }),
                infoTooltip: t('currentPredictionOosPresets.controls.mode.tooltip', {
                    defaultValue:
                        'Обычный режим открывает только хвосты до 70% сделок. Расширенный режим отдельно догружает хвосты 75%..90% и не тратит трафик до явного переключения.'
                }),
                value: mode,
                options: [
                    {
                        value: 'base',
                        label: t('currentPredictionOosPresets.controls.mode.base', {
                            defaultValue: 'Обычный'
                        }),
                        tooltip: t('currentPredictionOosPresets.controls.mode.baseTooltip', {
                            defaultValue: 'Показывает хвосты от 10% до 70% сделок.'
                        })
                    },
                    {
                        value: 'extended',
                        label: t('currentPredictionOosPresets.controls.mode.extended', {
                            defaultValue: 'Расширенный'
                        }),
                        tooltip: t('currentPredictionOosPresets.controls.mode.extendedTooltip', {
                            defaultValue: 'Добавляет хвосты 75%..90% сделок и грузится только после переключения.'
                        })
                    }
                ],
                onChange: nextValue => setMode(nextValue as CurrentPredictionOosPresetAnalysisMode)
            }
        ],
        [mode, t]
    )
    const tableRows = useMemo(() => buildPresetTableRows(pageRows, i18n.language), [i18n.language, pageRows])

    return (
        <div className={classNames(cls.root, {}, [className ?? ''])} data-tooltip-boundary>
            <section className={cls.hero}>
                <Text type='h1' className={cls.heroTitle}>
                    {t('currentPredictionOosPresets.page.title', {
                        defaultValue: 'Сравнение хвостов проверки на новых днях'
                    })}
                </Text>
                <Text className={cls.heroSubtitle}>
                    {t('currentPredictionOosPresets.page.subtitle', {
                        defaultValue:
                            'Страница показывает, какой последний кусок проверочной истории попадает в анализ при доле от 10% до 70% сделок. Расширенный режим по запросу добавляет хвосты 75%..90%, чтобы не загружать лишние строки заранее.'
                    })}
                </Text>
            </section>

            <section className={cls.controls}>
                <ReportViewControls groups={controlGroups} />
                <Text className={cls.controlHint}>
                    {t('currentPredictionOosPresets.page.controlHint', {
                        defaultValue:
                            'Таблица берёт уже готовые хвосты из сохранённой проверки на новых днях и не пересчитывает историю заново при каждом переключении.'
                    })}
                </Text>
            </section>

            <SectionDataState
                hasData={Boolean(activeAnalysis)}
                isLoading={baseQuery.isLoading && !baseQuery.data}
                isError={Boolean(pageError)}
                error={pageError}
                loadingText={t('currentPredictionOosPresets.page.loading', {
                    defaultValue: 'Загружаю сравнение хвостов проверки'
                })}
                title={t('currentPredictionOosPresets.page.errorTitle', {
                    defaultValue: 'Не удалось загрузить сравнение хвостов проверки'
                })}
                description={t('currentPredictionOosPresets.page.errorDescription', {
                    defaultValue: 'Проверь опубликованный read-only отчёт по хвостам проверки.'
                })}
                onRetry={() => {
                    void baseQuery.refetch()
                    if (mode === 'extended') {
                        void extendedQuery.refetch()
                    }
                }}>
                {activeAnalysis && (
                    <>
                        <section className={cls.summaryGrid}>
                            <article className={cls.summaryCard}>
                                <span className={cls.summaryLabel}>
                                    {t('currentPredictionOosPresets.summary.totalTradesLabel', {
                                        defaultValue: 'Все сделки проверки'
                                    })}
                                </span>
                                <span className={cls.summaryValue}>
                                    {formatInteger(activeAnalysis.oosTotalTrades, i18n.language)}
                                </span>
                                <span className={cls.summaryHint}>
                                    {t('currentPredictionOosPresets.summary.totalTradesHint', {
                                        defaultValue:
                                            'От этого числа считаются все доли хвоста на странице.'
                                    })}
                                </span>
                            </article>

                            <article className={cls.summaryCard}>
                                <span className={cls.summaryLabel}>
                                    {t('currentPredictionOosPresets.summary.totalDaysLabel', {
                                        defaultValue: 'Дни проверки'
                                    })}
                                </span>
                                <span className={cls.summaryValue}>
                                    {formatInteger(activeAnalysis.oosTotalDays, i18n.language)}
                                </span>
                                <span className={cls.summaryHint}>
                                    {t('currentPredictionOosPresets.summary.totalDaysHint', {
                                        defaultValue: `Период ${activeAnalysis.oosStartDateUtc} .. ${activeAnalysis.oosEndDateUtc}.`
                                    })}
                                </span>
                            </article>

                            <article className={cls.summaryCard}>
                                <span className={cls.summaryLabel}>
                                    {t('currentPredictionOosPresets.summary.splitLabel', {
                                        defaultValue: 'Основной хвост train/OOS'
                                    })}
                                </span>
                                <span className={cls.summaryValue}>
                                    {formatInteger(activeAnalysis.splitHoldoutCalendarDays, i18n.language)}
                                </span>
                                <span className={cls.summaryHint}>
                                    {t('currentPredictionOosPresets.summary.splitHint', {
                                        defaultValue:
                                            'Это текущий календарный размер проверочной части до дополнительного сжатия по сделкам.'
                                    })}
                                </span>
                            </article>
                        </section>

                        <section className={cls.tableSection}>
                            {mode === 'extended' && extendedQuery.isLoading && !extendedQuery.data && (
                                <Text className={cls.loadingNote}>
                                    {t('currentPredictionOosPresets.page.extendedLoading', {
                                        defaultValue: 'Догружаю хвосты 75%..90% по отдельному запросу.'
                                    })}
                                </Text>
                            )}

                            <ReportTableCard
                                title={t('currentPredictionOosPresets.table.title', {
                                    defaultValue: 'Сравнение хвостов по доле сделок'
                                })}
                                description={t('currentPredictionOosPresets.table.description', {
                                    defaultValue:
                                        'Сделки показываются в штуках, а доли рядом помогают быстро понять, какой кусок всей проверки попал в выбранный хвост.'
                                })}
                                columns={[
                                    t('currentPredictionOosPresets.table.columns.preset', {
                                        defaultValue: 'Хвост'
                                    }),
                                    t('currentPredictionOosPresets.table.columns.selectedTrades', {
                                        defaultValue: 'Сделок в хвосте'
                                    }),
                                    t('currentPredictionOosPresets.table.columns.tradeShare', {
                                        defaultValue: 'Доля сделок'
                                    }),
                                    t('currentPredictionOosPresets.table.columns.targetTrades', {
                                        defaultValue: 'Цель по сделкам'
                                    }),
                                    t('currentPredictionOosPresets.table.columns.days', {
                                        defaultValue: 'Дней в хвосте'
                                    }),
                                    t('currentPredictionOosPresets.table.columns.dayShare', {
                                        defaultValue: 'Доля дней'
                                    }),
                                    t('currentPredictionOosPresets.table.columns.tradeDays', {
                                        defaultValue: 'Дней со сделками'
                                    }),
                                    t('currentPredictionOosPresets.table.columns.emptyDays', {
                                        defaultValue: 'Дней без сделок'
                                    }),
                                    t('currentPredictionOosPresets.table.columns.period', {
                                        defaultValue: 'Период'
                                    })
                                ]}
                                rows={tableRows}
                                domId='current-prediction-oos-presets-table'
                            />
                        </section>
                    </>
                )}
            </SectionDataState>
        </div>
    )
}
