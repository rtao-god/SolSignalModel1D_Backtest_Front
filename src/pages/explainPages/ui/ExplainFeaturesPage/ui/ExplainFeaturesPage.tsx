import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import classNames from '@/shared/lib/helpers/classNames'
import { Link, Text } from '@/shared/ui'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { GUIDE_FEATURES_TABS } from '@/shared/utils/guideTabs'
import { usePfiPerModelReportNavQuery } from '@/shared/api/tanstackQueries/pfi'
import type { ReportSectionDto, TableSectionDto } from '@/shared/types/report.types'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'
import { warmupRouteNavigation } from '@/app/providers/router/config/utils/warmupRouteNavigation'
import { useQueryClient } from '@tanstack/react-query'
import { useAppDispatch } from '@/shared/lib/hooks/redux'
import { LocalizedContentBoundary } from '@/shared/ui/errors/LocalizedContentBoundary/ui/LocalizedContentBoundary'
import {
    readGuideStringListOrThrow,
    readGuideTableRowsOrThrow,
    readGuideTermItemsOrThrow,
    type GuideLocalizedTermItem
} from '@/pages/guidePages/ui/shared/guideI18n'
import { buildGuideGlossaryOrThrow, renderGuideRichText } from '@/pages/guidePages/ui/shared/guideRichText'
import cls from './ExplainFeaturesPage.module.scss'
import type { ExplainFeaturesPageProps } from './types'

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
    t: TFunction<'guide'>
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

function buildFeatureGlossaryItems(
    items: GuideLocalizedTermItem[],
    stats: Map<string, PfiStat>,
    hasReport: boolean,
    t: TFunction<'guide'>
): GuideLocalizedTermItem[] {
    return items.map(item => ({
        ...item,
        description: `${item.description}\n\n${buildPfiNote(item.term, stats, hasReport, t)}`
    }))
}

interface GuideFeaturesSectionConfig {
    id: 'overview' | 'returns' | 'indicators' | 'momentum' | 'regime'
    anchor: string
    headerKeys?: readonly string[]
}

const GUIDE_FEATURE_SECTIONS: readonly GuideFeaturesSectionConfig[] = [
    {
        id: 'overview',
        anchor: 'explain-features-overview',
        headerKeys: ['metric', 'meaning', 'reading'] as const
    },
    {
        id: 'returns',
        anchor: 'explain-features-returns'
    },
    {
        id: 'indicators',
        anchor: 'explain-features-indicators'
    },
    {
        id: 'momentum',
        anchor: 'explain-features-momentum'
    },
    {
        id: 'regime',
        anchor: 'explain-features-regime'
    }
]

export default function ExplainFeaturesPage({
    className,
    translationNamespace = 'guide'
}: ExplainFeaturesPageProps) {
    const { t, i18n } = useTranslation(translationNamespace)
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
            GUIDE_FEATURES_TABS.map(tab => ({
                ...tab,
                label: t(`tabs.${tab.id}`, { defaultValue: tab.label })
            })),
        [t]
    )
    const buildPageGlossary = () =>
        buildGuideGlossaryOrThrow([
            readGuideTermItemsOrThrow(i18n, 'featuresPage.sections.overview.terms'),
            buildFeatureGlossaryItems(
                readGuideTermItemsOrThrow(i18n, 'featuresPage.sections.returns.terms'),
                pfiStats,
                hasPfiReport,
                t
            ),
            buildFeatureGlossaryItems(
                readGuideTermItemsOrThrow(i18n, 'featuresPage.sections.indicators.terms'),
                pfiStats,
                hasPfiReport,
                t
            ),
            buildFeatureGlossaryItems(
                readGuideTermItemsOrThrow(i18n, 'featuresPage.sections.momentum.terms'),
                pfiStats,
                hasPfiReport,
                t
            ),
            buildFeatureGlossaryItems(
                readGuideTermItemsOrThrow(i18n, 'featuresPage.sections.regime.terms'),
                pfiStats,
                hasPfiReport,
                t
            )
        ])
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
                {GUIDE_FEATURE_SECTIONS.map(section => (
                    <section key={section.id} id={section.anchor} className={cls.sectionCard}>
                        <Text type='h3' className={cls.sectionTitle}>
                            {t(`featuresPage.sections.${section.id}.title`)}
                        </Text>

                        <LocalizedContentBoundary name={`GuideFeatures:${section.id}:paragraphs`}>
                            {() => {
                                const glossary = buildPageGlossary()
                                const paragraphs = readGuideStringListOrThrow(
                                    i18n,
                                    `featuresPage.sections.${section.id}.paragraphs`
                                )

                                return (
                                    <div className={cls.copyBlock}>
                                        {paragraphs.map((paragraph, paragraphIndex) => (
                                            <Text key={`${section.id}-paragraph-${paragraphIndex}`} className={cls.sectionText}>
                                                {renderGuideRichText(paragraph, { glossary })}
                                            </Text>
                                        ))}
                                    </div>
                                )
                            }}
                        </LocalizedContentBoundary>

                        {section.headerKeys && (
                            <LocalizedContentBoundary name={`GuideFeatures:${section.id}:table`}>
                                {() => {
                                    const headerKeys = section.headerKeys
                                    if (!headerKeys) {
                                        return null
                                    }

                                    const glossary = buildPageGlossary()
                                    const rows = readGuideTableRowsOrThrow(i18n, `featuresPage.sections.${section.id}.table.rows`)

                                    return (
                                        <div className={cls.tableWrap}>
                                            <table className={cls.infoTable}>
                                                <thead>
                                                    <tr>
                                                        {headerKeys.map(headerKey => (
                                                            <th key={`${section.id}-header-${headerKey}`}>
                                                                {t(`featuresPage.sections.${section.id}.table.headers.${headerKey}`)}
                                                            </th>
                                                        ))}
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {rows.map((row, rowIndex) => (
                                                        <tr key={`${section.id}-row-${rowIndex}`}>
                                                            {row.map((cell, cellIndex) => (
                                                                <td key={`${section.id}-row-${rowIndex}-cell-${cellIndex}`}>
                                                                    {renderGuideRichText(cell, { glossary })}
                                                                </td>
                                                            ))}
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    )
                                }}
                            </LocalizedContentBoundary>
                        )}

                        <div className={cls.calloutGrid}>
                            <article className={cls.callout}>
                                <Text type='h4' className={cls.calloutTitle}>
                                    {t('labels.why')}
                                </Text>
                                <LocalizedContentBoundary name={`GuideFeatures:${section.id}:why`}>
                                    {() => {
                                        const glossary = buildPageGlossary()

                                        return (
                                            <Text className={cls.calloutText}>
                                                {renderGuideRichText(t(`featuresPage.sections.${section.id}.why`), { glossary })}
                                            </Text>
                                        )
                                    }}
                                </LocalizedContentBoundary>
                            </article>

                            <article className={cls.callout}>
                                <Text type='h4' className={cls.calloutTitle}>
                                    {t('labels.example')}
                                </Text>
                                <LocalizedContentBoundary name={`GuideFeatures:${section.id}:example`}>
                                    {() => {
                                        const glossary = buildPageGlossary()

                                        return (
                                            <Text className={cls.calloutText}>
                                                {renderGuideRichText(t(`featuresPage.sections.${section.id}.example`), { glossary })}
                                            </Text>
                                        )
                                    }}
                                </LocalizedContentBoundary>
                            </article>
                        </div>
                    </section>
                ))}
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



