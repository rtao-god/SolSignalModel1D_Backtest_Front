import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import classNames from '@/shared/lib/helpers/classNames'
import { useAppDispatch } from '@/shared/lib/hooks/redux'
import { Link, Text } from '@/shared/ui'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'
import { warmupRouteNavigation } from '@/app/providers/router/config/utils/warmupRouteNavigation'
import { GUIDE_MODELS_TABS } from '@/shared/utils/guideTabs'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { LocalizedContentBoundary } from '@/shared/ui/errors/LocalizedContentBoundary/ui/LocalizedContentBoundary'
import {
    readAvailableGuideTermGroups,
    readGuideStringList,
    readGuideTableRows
} from '@/pages/guidePages/ui/shared/guideI18n'
import { buildGuideGlossary, renderGuideRichText } from '@/pages/guidePages/ui/shared/guideRichText'
import cls from './GuideModelsPage.module.scss'
import type { GuideModelsPageProps } from './types'

interface ReadingCardConfig {
    id: 'daily' | 'micro' | 'sl'
    headerKeys?: readonly string[]
}

const READING_CARD_CONFIG: readonly ReadingCardConfig[] = [
    {
        id: 'daily',
        headerKeys: ['focus', 'reading'] as const
    },
    {
        id: 'micro'
    },
    {
        id: 'sl',
        headerKeys: ['signal', 'meaning'] as const
    }
]

const RELATED_ROUTES = [
    {
        id: 'splits',
        route: AppRoute.GUIDE_SPLITS
    },
    {
        id: 'truthfulness',
        route: AppRoute.GUIDE_TRUTHFULNESS
    },
    {
        id: 'tests',
        route: AppRoute.GUIDE_TESTS
    },
    {
        id: 'stats',
        route: AppRoute.MODELS_STATS
    }
] as const

const CONTRACT_CARD_IDS = ['daily', 'micro', 'sl', 'total', 'pipeline'] as const

export default function GuideModelsPage({ className }: GuideModelsPageProps) {
    const { t, i18n } = useTranslation(['guide', 'nav'])
    const queryClient = useQueryClient()
    const dispatch = useAppDispatch()

    const handleRouteWarmup = useCallback(
        (routeId: AppRoute) => {
            warmupRouteNavigation(routeId, queryClient, dispatch)
        },
        [dispatch, queryClient]
    )

    const sections = useMemo(
        () =>
            GUIDE_MODELS_TABS.map(tab => ({
                ...tab,
                label: t(`tab.guide_models.${tab.id}`, { ns: 'nav', defaultValue: tab.label })
            })),
        [t]
    )
    const buildPageGlossary = () =>
        buildGuideGlossary(
            readAvailableGuideTermGroups(i18n, [
                'modelsPage.sections.meaning.terms',
                'modelsPage.sections.daily.terms',
                'modelsPage.sections.micro.terms',
                'modelsPage.sections.sl.terms',
                'modelsPage.sections.logic.terms'
            ])
        )
    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections,
        syncHash: true
    })

    return (
        <div className={classNames(cls.GuideModelsPage, {}, [className ?? ''])} data-tooltip-boundary>
            <header className={cls.headerRow}>
                <div>
                    <Text type='h2'>{t('modelsPage.header.title', { ns: 'guide' })}</Text>
                    <Text className={cls.subtitle}>{t('modelsPage.header.subtitle', { ns: 'guide' })}</Text>
                    <div className={cls.linkRow}>
                        <Text className={cls.linkLabel}>{t('modelsPage.header.linkLabel', { ns: 'guide' })}</Text>
                        <Link
                            to={ROUTE_PATH[AppRoute.MODELS_STATS]}
                            className={cls.linkButton}
                            onMouseEnter={() => handleRouteWarmup(AppRoute.MODELS_STATS)}
                            onFocus={() => handleRouteWarmup(AppRoute.MODELS_STATS)}>
                            {t('modelsPage.header.linkButton', { ns: 'guide' })}
                        </Link>
                    </div>
                </div>
            </header>

            <div className={cls.sectionsGrid}>
                <section id='guide-models-meaning' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('modelsPage.sections.meaning.title', { ns: 'guide' })}
                    </Text>
                    <Text className={cls.sectionLead}>{t('modelsPage.sections.meaning.intro', { ns: 'guide' })}</Text>
                    <LocalizedContentBoundary name='GuideModels:meaning:paragraphs'>
                        {() => {
                            const glossary = buildPageGlossary()
                            const paragraphs = readGuideStringList(i18n, 'modelsPage.sections.meaning.paragraphs')

                            return (
                                <div className={cls.copyBlock}>
                                    {paragraphs.map((paragraph, paragraphIndex) => (
                                        <Text
                                            key={`guide-models-meaning-${paragraphIndex}`}
                                            className={cls.sectionText}>
                                            {renderGuideRichText(paragraph, { glossary })}
                                        </Text>
                                    ))}
                                </div>
                            )
                        }}
                    </LocalizedContentBoundary>
                    <LocalizedContentBoundary name='GuideModels:meaning:table'>
                        {() => {
                            const glossary = buildPageGlossary()
                            const overviewRows = readGuideTableRows(i18n, 'modelsPage.sections.meaning.table.rows')

                            return (
                                <div className={cls.tableWrap}>
                                    <table className={cls.infoTable}>
                                        <thead>
                                            <tr>
                                                <th>
                                                    {t('modelsPage.sections.meaning.table.headers.model', {
                                                        ns: 'guide'
                                                    })}
                                                </th>
                                                <th>
                                                    {t('modelsPage.sections.meaning.table.headers.role', {
                                                        ns: 'guide'
                                                    })}
                                                </th>
                                                <th>
                                                    {t('modelsPage.sections.meaning.table.headers.output', {
                                                        ns: 'guide'
                                                    })}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {overviewRows.map((row, rowIndex) => (
                                                <tr key={`guide-models-overview-row-${rowIndex}`}>
                                                    {row.map((cell, cellIndex) => (
                                                        <td
                                                            key={`guide-models-overview-row-${rowIndex}-cell-${cellIndex}`}>
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
                </section>

                <section id='guide-models-reading' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('modelsPage.sections.reading.title', { ns: 'guide' })}
                    </Text>
                    <Text className={cls.sectionLead}>{t('modelsPage.sections.reading.intro', { ns: 'guide' })}</Text>
                    <div className={cls.readingGrid}>
                        {READING_CARD_CONFIG.map(card => (
                            <article key={card.id} className={cls.subCard}>
                                <Text type='h4' className={cls.subCardTitle}>
                                    {t(`modelsPage.sections.${card.id}.title`, { ns: 'guide' })}
                                </Text>
                                <LocalizedContentBoundary name={`GuideModels:reading:${card.id}:paragraphs`}>
                                    {() => {
                                        const glossary = buildPageGlossary()
                                        const paragraphs = readGuideStringList(
                                            i18n,
                                            `modelsPage.sections.${card.id}.paragraphs`
                                        )

                                        return (
                                            <div className={cls.copyBlock}>
                                                {paragraphs.map((paragraph, paragraphIndex) => (
                                                    <Text
                                                        key={`${card.id}-paragraph-${paragraphIndex}`}
                                                        className={cls.subCardText}>
                                                        {renderGuideRichText(paragraph, { glossary })}
                                                    </Text>
                                                ))}
                                            </div>
                                        )
                                    }}
                                </LocalizedContentBoundary>

                                {card.headerKeys && (
                                    <LocalizedContentBoundary name={`GuideModels:reading:${card.id}:table`}>
                                        {() => {
                                            const headerKeys = card.headerKeys
                                            if (!headerKeys) {
                                                return null
                                            }

                                            const glossary = buildPageGlossary()
                                            const rows = readGuideTableRows(
                                                i18n,
                                                `modelsPage.sections.${card.id}.table.rows`
                                            )

                                            return (
                                                <div className={cls.tableWrap}>
                                                    <table className={cls.infoTable}>
                                                        <thead>
                                                            <tr>
                                                                {headerKeys.map(headerKey => (
                                                                    <th key={`${card.id}-header-${headerKey}`}>
                                                                        {t(
                                                                            `modelsPage.sections.${card.id}.table.headers.${headerKey}`,
                                                                            {
                                                                                ns: 'guide'
                                                                            }
                                                                        )}
                                                                    </th>
                                                                ))}
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {rows.map((row, rowIndex) => (
                                                                <tr key={`${card.id}-row-${rowIndex}`}>
                                                                    {row.map((cell, cellIndex) => (
                                                                        <td
                                                                            key={`${card.id}-row-${rowIndex}-cell-${cellIndex}`}>
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
                            </article>
                        ))}
                    </div>
                </section>

                <section id='guide-models-logic' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('modelsPage.sections.logic.title', { ns: 'guide' })}
                    </Text>
                    <Text className={cls.sectionLead}>{t('modelsPage.sections.logic.intro', { ns: 'guide' })}</Text>
                    <LocalizedContentBoundary name='GuideModels:logic:paragraphs'>
                        {() => {
                            const glossary = buildPageGlossary()
                            const paragraphs = readGuideStringList(i18n, 'modelsPage.sections.logic.paragraphs')

                            return (
                                <div className={cls.copyBlock}>
                                    {paragraphs.map((paragraph, paragraphIndex) => (
                                        <Text key={`guide-models-logic-${paragraphIndex}`} className={cls.sectionText}>
                                            {renderGuideRichText(paragraph, { glossary })}
                                        </Text>
                                    ))}
                                </div>
                            )
                        }}
                    </LocalizedContentBoundary>
                </section>

                <section id='guide-models-contract' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('modelsPage.sections.contract.title', { ns: 'guide' })}
                    </Text>
                    <Text className={cls.sectionLead}>{t('modelsPage.sections.contract.intro', { ns: 'guide' })}</Text>
                    <div className={cls.contractGrid}>
                        {CONTRACT_CARD_IDS.map(cardId => (
                            <LocalizedContentBoundary key={cardId} name={`GuideModels:contract:${cardId}`}>
                                {() => {
                                    const glossary = buildPageGlossary()
                                    const paragraphs = readGuideStringList(
                                        i18n,
                                        `modelsPage.sections.contract.cards.${cardId}.paragraphs`
                                    )

                                    return (
                                        <article className={cls.contractCard}>
                                            <Text type='h4' className={cls.contractTitle}>
                                                {t(`modelsPage.sections.contract.cards.${cardId}.title`, {
                                                    ns: 'guide'
                                                })}
                                            </Text>
                                            <div className={cls.copyBlock}>
                                                {paragraphs.map((paragraph, paragraphIndex) => (
                                                    <Text
                                                        key={`${cardId}-technical-${paragraphIndex}`}
                                                        className={cls.contractText}>
                                                        {renderGuideRichText(paragraph, { glossary })}
                                                    </Text>
                                                ))}
                                            </div>
                                        </article>
                                    )
                                }}
                            </LocalizedContentBoundary>
                        ))}
                    </div>
                </section>

                <section id='guide-models-checks' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('modelsPage.sections.checks.title', { ns: 'guide' })}
                    </Text>
                    <Text className={cls.sectionLead}>{t('modelsPage.sections.checks.intro', { ns: 'guide' })}</Text>
                    <div className={cls.checksGrid}>
                        {CONTRACT_CARD_IDS.map(cardId => (
                            <LocalizedContentBoundary key={cardId} name={`GuideModels:checks:${cardId}`}>
                                {() => {
                                    const glossary = buildPageGlossary()
                                    const whyText = t(`modelsPage.sections.checks.cards.${cardId}.why`, { ns: 'guide' })
                                    const exampleText = t(`modelsPage.sections.checks.cards.${cardId}.example`, {
                                        ns: 'guide'
                                    })

                                    return (
                                        <article className={cls.checkCard}>
                                            <Text type='h4' className={cls.checkTitle}>
                                                {t(`modelsPage.sections.checks.cards.${cardId}.title`, { ns: 'guide' })}
                                            </Text>
                                            <span className={cls.checkLabel}>
                                                {t('modelsPage.checks.why', { ns: 'guide' })}
                                            </span>
                                            <Text className={cls.checkText}>
                                                {renderGuideRichText(whyText, { glossary })}
                                            </Text>
                                            {exampleText.trim().length > 0 && (
                                                <>
                                                    <span className={cls.checkLabel}>
                                                        {t('modelsPage.checks.example', { ns: 'guide' })}
                                                    </span>
                                                    <Text className={cls.checkText}>
                                                        {renderGuideRichText(exampleText, { glossary })}
                                                    </Text>
                                                </>
                                            )}
                                        </article>
                                    )
                                }}
                            </LocalizedContentBoundary>
                        ))}
                    </div>
                </section>

                <section id='guide-models-related' className={cls.sectionCard}>
                    <Text type='h3' className={cls.sectionTitle}>
                        {t('modelsPage.sections.related.title', { ns: 'guide' })}
                    </Text>
                    <div className={cls.relatedGrid}>
                        {RELATED_ROUTES.map(item => (
                            <Link
                                key={item.id}
                                to={ROUTE_PATH[item.route]}
                                className={cls.relatedLink}
                                onMouseEnter={() => handleRouteWarmup(item.route)}
                                onFocus={() => handleRouteWarmup(item.route)}>
                                <article className={cls.relatedCard}>
                                    <Text type='h4' className={cls.relatedTitle}>
                                        {t(`modelsPage.related.${item.id}.title`, { ns: 'guide' })}
                                    </Text>
                                    <Text className={cls.relatedText}>
                                        {t(`modelsPage.related.${item.id}.description`, { ns: 'guide' })}
                                    </Text>
                                </article>
                            </Link>
                        ))}
                    </div>
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
