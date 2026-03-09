import classNames from '@/shared/lib/helpers/classNames'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'
import { Link, Text } from '@/shared/ui'
import { useTranslation } from 'react-i18next'
import { buildDocsGlossaryOrThrow, renderDocsRichText } from './shared/docsRichText'
import { readDocsStringListOrThrow, readDocsTermItemsOrThrow } from './shared/docsI18n'
import { LocalizedContentBoundary } from '@/shared/ui/errors/LocalizedContentBoundary/ui/LocalizedContentBoundary'
import cls from './DocsPage.module.scss'
import type { DocsPageProps } from './types'

const DOCS_HOME_CARDS = [
    {
        id: 'models',
        route: AppRoute.DOCS_MODELS
    },
    {
        id: 'tests',
        route: AppRoute.DOCS_TESTS
    },
    {
        id: 'truthfulness',
        route: AppRoute.DOCS_TRUTHFULNESS
    }
] as const

export default function DocsPage({ className }: DocsPageProps) {
    const { t, i18n } = useTranslation('docs')

    return (
        <div className={classNames(cls.DocsPageRoot, {}, [className ?? ''])} data-tooltip-boundary>
            <header className={cls.hero}>
                <Text type='h1' className={cls.heroTitle}>
                    {t('page.title')}
                </Text>
                <LocalizedContentBoundary name='DocsHome:heroSubtitle'>
                    {() => {
                        const glossaryTerms = readDocsTermItemsOrThrow(i18n, 'page.glossary.terms')
                        const glossary = buildDocsGlossaryOrThrow([glossaryTerms])

                        return <Text className={cls.heroSubtitle}>{renderDocsRichText(t('page.subtitle'), { glossary })}</Text>
                    }}
                </LocalizedContentBoundary>
            </header>

            <section className={cls.sections}>
                <Text type='h2' className={cls.sectionsTitle}>
                    {t('page.sectionsTitle')}
                </Text>

                <LocalizedContentBoundary name='DocsHome:introParagraphs'>
                    {() => {
                        const glossaryTerms = readDocsTermItemsOrThrow(i18n, 'page.glossary.terms')
                        const glossary = buildDocsGlossaryOrThrow([glossaryTerms])
                        const introParagraphs = readDocsStringListOrThrow(i18n, 'page.intro')

                        return (
                            <div className={cls.copyBlock}>
                                {introParagraphs.map((paragraph, index) => (
                                    <Text key={`docs-intro-${index}`} className={cls.introText}>
                                        {renderDocsRichText(paragraph, { glossary })}
                                    </Text>
                                ))}
                            </div>
                        )
                    }}
                </LocalizedContentBoundary>

                <div className={cls.cards}>
                    {DOCS_HOME_CARDS.map(card => (
                        <Link key={card.id} to={ROUTE_PATH[card.route]} className={cls.cardLink}>
                            <article className={cls.card}>
                                <div className={cls.cardHeader}>
                                    <Text type='h3' className={cls.cardTitle}>
                                        {t(`page.cards.${card.id}.title`)}
                                    </Text>
                                    <span className={cls.cardArrow} aria-hidden='true'>
                                        →
                                    </span>
                                </div>
                                <LocalizedContentBoundary name={`DocsHome:card:${card.id}`}>
                                    {() => {
                                        const glossaryTerms = readDocsTermItemsOrThrow(i18n, 'page.glossary.terms')
                                        const glossary = buildDocsGlossaryOrThrow([glossaryTerms])

                                        return (
                                            <Text className={cls.cardText}>
                                                {renderDocsRichText(t(`page.cards.${card.id}.description`), { glossary })}
                                            </Text>
                                        )
                                    }}
                                </LocalizedContentBoundary>
                                <Text className={cls.cardHint}>{t(`page.cards.${card.id}.hint`)}</Text>
                            </article>
                        </Link>
                    ))}
                </div>
            </section>
        </div>
    )
}


