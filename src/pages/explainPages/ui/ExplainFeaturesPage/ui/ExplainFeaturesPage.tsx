import { type ReactNode, useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import classNames from '@/shared/lib/helpers/classNames'
import { Link, TermTooltip, Text } from '@/shared/ui'
import { enrichTermTooltipDescription } from '@/shared/ui/TermTooltip'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { EXPLAIN_FEATURES_TABS } from '@/shared/utils/explainTabs'
import { usePfiPerModelReportNavQuery } from '@/shared/api/tanstackQueries/pfi'
import type { ReportSectionDto, TableSectionDto } from '@/shared/types/report.types'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'
import { warmupRouteNavigation } from '@/app/providers/router/config/utils/warmupRouteNavigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAppDispatch } from '@/shared/lib/hooks/redux'
import { LocalizedContentBoundary } from '@/shared/ui/errors/LocalizedContentBoundary/ui/LocalizedContentBoundary'
import {
    readExplainTableRowsOrThrow,
    readExplainTermItemsOrThrow,
    type ExplainLocalizedTermItem
} from '@/pages/explainPages/ui/shared/explainI18n'
import cls from './ExplainFeaturesPage.module.scss'
import type { ExplainFeaturesPageProps } from './types'

interface TermItem {
    term: string
    description: ReactNode
}

interface PfiStat {
    count: number
    sumImportance: number
    countImportance: number
    sumCorr: number
    countCorr: number
    sumDeltaMean: number
    countDeltaMean: number
}

function normalizeColumnName(value: string): string {
    return value.toLowerCase().replace(/\s+/g, '')
}

function findColumnIndex(columns: string[], keywords: string[]): number {
    const normalized = columns.map(normalizeColumnName)

    for (const keyword of keywords) {
        const key = normalizeColumnName(keyword)
        const idx = normalized.findIndex(col => col.includes(key))
        if (idx >= 0) return idx
    }

    return -1
}

function parseNumber(value?: string): number | null {
    if (!value) return null
    const cleaned = value.replace('%', '').replace(',', '.').replace('−', '-').trim()

    const parsed = Number(cleaned)
    return Number.isFinite(parsed) ? parsed : null
}

function isTableSection(section: ReportSectionDto): section is TableSectionDto {
    return Array.isArray((section as TableSectionDto).columns) && Array.isArray((section as TableSectionDto).rows)
}

function formatMaybe(value: number | null, digits: number): string {
    if (value === null || !Number.isFinite(value)) return 'n/a'
    return value.toFixed(digits)
}

function buildPfiStats(sections: ReportSectionDto[] | undefined): Map<string, PfiStat> {
    const stats = new Map<string, PfiStat>()
    if (!sections) return stats

    sections.forEach(section => {
        if (!isTableSection(section)) return

        const columns = section.columns ?? []
        const rows = section.rows ?? []

        const nameIdx = findColumnIndex(columns, ['фича', 'feature', 'featurename'])
        if (nameIdx < 0) return

        const importanceIdx = findColumnIndex(columns, ['важность', 'importance', 'Δauc', 'deltaauc'])
        const corrIdx = findColumnIndex(columns, ['corr(score)', 'corrscore', 'corr'])
        const deltaMeanIdx = findColumnIndex(columns, ['Δmean', 'meanpos', 'meanneg'])

        rows.forEach(row => {
            const name = row[nameIdx]?.trim()
            if (!name) return

            const entry = stats.get(name) ?? {
                count: 0,
                sumImportance: 0,
                countImportance: 0,
                sumCorr: 0,
                countCorr: 0,
                sumDeltaMean: 0,
                countDeltaMean: 0
            }

            entry.count += 1

            const importance = importanceIdx >= 0 ? parseNumber(row[importanceIdx]) : null
            if (importance !== null) {
                entry.sumImportance += importance
                entry.countImportance += 1
            }

            const corr = corrIdx >= 0 ? parseNumber(row[corrIdx]) : null
            if (corr !== null) {
                entry.sumCorr += corr
                entry.countCorr += 1
            }

            const deltaMean = deltaMeanIdx >= 0 ? parseNumber(row[deltaMeanIdx]) : null
            if (deltaMean !== null) {
                entry.sumDeltaMean += deltaMean
                entry.countDeltaMean += 1
            }

            stats.set(name, entry)
        })
    })

    return stats
}

function buildPfiNote(
    featureName: string,
    stats: Map<string, PfiStat>,
    hasReport: boolean,
    t: TFunction<'explain'>
): string {
    if (!hasReport) {
        return t('featuresPage.pfiNotes.reportNotLoaded')
    }

    const item = stats.get(featureName)
    if (!item) {
        return t('featuresPage.pfiNotes.featureMissing')
    }

    const avgImportance = item.countImportance > 0 ? item.sumImportance / item.countImportance : null
    const avgCorr = item.countCorr > 0 ? item.sumCorr / item.countCorr : null
    const avgDeltaMean = item.countDeltaMean > 0 ? item.sumDeltaMean / item.countDeltaMean : null

    return t('featuresPage.pfiNotes.summary', {
        count: item.count,
        importance: formatMaybe(avgImportance, 2),
        corr: formatMaybe(avgCorr, 3),
        deltaMean: formatMaybe(avgDeltaMean, 4)
    })
}

function buildFeatureDescription(
    baseText: string,
    featureName: string,
    stats: Map<string, PfiStat>,
    hasReport: boolean,
    t: TFunction<'explain'>
) {
    const pfiLine = buildPfiNote(featureName, stats, hasReport, t)

    return (
        <div className={cls.tooltipBody}>
            <Text className={cls.tooltipParagraph}>{baseText}</Text>
            <Text className={cls.tooltipMeta}>{pfiLine}</Text>
        </div>
    )
}

function buildFeatureTermItems(
    baseItems: ExplainLocalizedTermItem[],
    stats: Map<string, PfiStat>,
    hasReport: boolean,
    t: TFunction<'explain'>
): TermItem[] {
    return baseItems.map(item => ({
        term: item.term,
        description: buildFeatureDescription(item.description, item.term, stats, hasReport, t)
    }))
}

function TermGrid({ items }: { items: TermItem[] }) {
    return (
        <div className={cls.termGrid}>
            {items.map(item => (
                <TermTooltip
                    key={item.term}
                    term={item.term}
                    description={enrichTermTooltipDescription(item.description, { term: item.term })}
                    type='span'
                    className={cls.termItem}
                />
            ))}
        </div>
    )
}

export default function ExplainFeaturesPage({ className }: ExplainFeaturesPageProps) {
    const { t, i18n } = useTranslation('explain')
    const queryClient = useQueryClient()
    const dispatch = useAppDispatch()
    const { data: pfiReport } = usePfiPerModelReportNavQuery({ enabled: true })
    const handlePfiWarmup = useCallback(() => {
        warmupRouteNavigation(AppRoute.PFI_PER_MODEL, queryClient, dispatch)
    }, [dispatch, queryClient])

    const pfiStats = useMemo(() => buildPfiStats(pfiReport?.sections), [pfiReport])
    const hasPfiReport = Boolean(pfiReport)

    const sections = useMemo(
        () =>
            EXPLAIN_FEATURES_TABS.map(tab => ({
                ...tab,
                label: t(`tabs.${tab.id}`, { defaultValue: tab.label })
            })),
        [t]
    )
    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections,
        syncHash: true
    })

    return (
        <div className={classNames(cls.ExplainFeaturesPage, {}, [className ?? ''])} data-tooltip-boundary>
            <header className={cls.headerRow}>
                <div>
                    <Text type='h2'>{t('featuresPage.header.title')}</Text>
                    <Text className={cls.subtitle}>{t('featuresPage.header.subtitle')}</Text>
                    <div className={cls.linkRow}>
                        <Text className={cls.linkLabel}>{t('featuresPage.header.linkLabel')}</Text>
                        <Link
                            to={ROUTE_PATH[AppRoute.PFI_PER_MODEL]}
                            className={cls.inlineLink}
                            onMouseEnter={handlePfiWarmup}
                            onFocus={handlePfiWarmup}>
                            {ROUTE_PATH[AppRoute.PFI_PER_MODEL]}
                        </Link>
                    </div>
                </div>
            </header>

            <div className={cls.sectionsGrid}>
                <section id='explain-features-overview' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('featuresPage.sections.overview.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('featuresPage.sections.overview.text')}</Text>
                    <LocalizedContentBoundary name='ExplainFeatures:overview:table'>
                        {() => {
                            const overviewRows = readExplainTableRowsOrThrow(i18n, 'featuresPage.sections.overview.table.rows')

                            return (
                                <div className={cls.tableWrap}>
                                    <table className={cls.infoTable}>
                                        <thead>
                                            <tr>
                                                <th>{t('featuresPage.sections.overview.table.headers.metric')}</th>
                                                <th>{t('featuresPage.sections.overview.table.headers.meaning')}</th>
                                                <th>{t('featuresPage.sections.overview.table.headers.reading')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {overviewRows.map((row, rowIndex) => (
                                                <tr key={`overview-row-${rowIndex}`}>
                                                    {row.map((cell, cellIndex) => (
                                                        <td key={`overview-row-${rowIndex}-cell-${cellIndex}`}>{cell}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )
                        }}
                    </LocalizedContentBoundary>
                    <LocalizedContentBoundary name='ExplainFeatures:overview:terms'>
                        {() => <TermGrid items={readExplainTermItemsOrThrow(i18n, 'featuresPage.sections.overview.terms')} />}
                    </LocalizedContentBoundary>
                </section>

                <section id='explain-features-returns' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('featuresPage.sections.returns.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('featuresPage.sections.returns.text')}</Text>
                    <LocalizedContentBoundary name='ExplainFeatures:returns:terms'>
                        {() => {
                            const returnFeatureDefs = readExplainTermItemsOrThrow(i18n, 'featuresPage.sections.returns.terms')
                            const returnFeatures = buildFeatureTermItems(returnFeatureDefs, pfiStats, hasPfiReport, t)

                            return <TermGrid items={returnFeatures} />
                        }}
                    </LocalizedContentBoundary>
                </section>

                <section id='explain-features-indicators' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('featuresPage.sections.indicators.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('featuresPage.sections.indicators.text')}</Text>
                    <LocalizedContentBoundary name='ExplainFeatures:indicators:terms'>
                        {() => {
                            const indicatorFeatureDefs = readExplainTermItemsOrThrow(i18n, 'featuresPage.sections.indicators.terms')
                            const indicatorFeatures = buildFeatureTermItems(indicatorFeatureDefs, pfiStats, hasPfiReport, t)

                            return <TermGrid items={indicatorFeatures} />
                        }}
                    </LocalizedContentBoundary>
                </section>

                <section id='explain-features-momentum' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('featuresPage.sections.momentum.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('featuresPage.sections.momentum.text')}</Text>
                    <LocalizedContentBoundary name='ExplainFeatures:momentum:terms'>
                        {() => {
                            const momentumFeatureDefs = readExplainTermItemsOrThrow(i18n, 'featuresPage.sections.momentum.terms')
                            const momentumFeatures = buildFeatureTermItems(momentumFeatureDefs, pfiStats, hasPfiReport, t)

                            return <TermGrid items={momentumFeatures} />
                        }}
                    </LocalizedContentBoundary>
                </section>

                <section id='explain-features-regime' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('featuresPage.sections.regime.title')}
                    </Text>
                    <Text className={cls.sectionText}>{t('featuresPage.sections.regime.text')}</Text>
                    <LocalizedContentBoundary name='ExplainFeatures:regime:terms'>
                        {() => {
                            const regimeFeatureDefs = readExplainTermItemsOrThrow(i18n, 'featuresPage.sections.regime.terms')
                            const regimeFeatures = buildFeatureTermItems(regimeFeatureDefs, pfiStats, hasPfiReport, t)

                            return <TermGrid items={regimeFeatures} />
                        }}
                    </LocalizedContentBoundary>
                </section>
            </div>

            <SectionPager
                sections={sections}
                currentIndex={currentIndex}
                canPrev={canPrev}
                canNext={canNext}
                onPrev={handlePrev}
                onNext={handleNext}
            />
        </div>
    )
}



