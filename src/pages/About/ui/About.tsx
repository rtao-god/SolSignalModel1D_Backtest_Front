import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { useQueryClient } from '@tanstack/react-query'
import classNames from '@/shared/lib/helpers/classNames'
import { useAppDispatch } from '@/shared/lib/hooks/redux'
import { Icon, Link, Text } from '@/shared/ui'
import { renderTermTooltipRichText } from '@/shared/ui/TermTooltip'
import { buildRouteSubTabLabelI18nKey } from '@/app/providers/router/config/i18nKeys'
import { warmupRouteNavigation } from '@/app/providers/router/config/utils/warmupRouteNavigation'
import type { AppRoute } from '@/app/providers/router/config/types'
import cls from './About.module.scss'
import { ABOUT_ATLAS_ROOT_NODES, ABOUT_NAVIGATION_ENTRIES } from './aboutNavigationCatalog'
import type { AboutAtlasNode, AboutBlockLink, AboutNavEntry, AboutPageProps } from './types'

function toRouteToken(routeId: AppRoute): string {
    return routeId.toLowerCase()
}

function buildRouteDescriptionKey(routeId: AppRoute): string {
    return `routes.${toRouteToken(routeId)}.description`
}

function buildBlockTitleKey(routeId: AppRoute, blockId: string): string {
    return `routes.${toRouteToken(routeId)}.blocks.${blockId}.title`
}

function buildBlockDescriptionKey(routeId: AppRoute, blockId: string): string {
    return `routes.${toRouteToken(routeId)}.blocks.${blockId}.description`
}

// /about работает как вложенный atlas: верхний уровень — реальные вкладки сайта,
// дальше идут их разделы, затем конкретные страницы и только потом стабильные блоки страницы.
export default function About({ className }: AboutPageProps) {
    const { t } = useTranslation(['about', 'nav'])
    const queryClient = useQueryClient()
    const dispatch = useAppDispatch()
    const [expandedNodeIds, setExpandedNodeIds] = useState<string[]>([])

    const routeEntryByRoute = useMemo(
        () => new Map<AppRoute, AboutNavEntry>(ABOUT_NAVIGATION_ENTRIES.map(entry => [entry.routeId, entry])),
        []
    )

    const handleRouteWarmup = useCallback(
        (routeId: AppRoute) => {
            warmupRouteNavigation(routeId, queryClient, dispatch)
        },
        [dispatch, queryClient]
    )

    const toggleNode = useCallback((nodeId: string) => {
        setExpandedNodeIds(prev =>
            prev.includes(nodeId) ? prev.filter(candidate => candidate !== nodeId) : [...prev, nodeId]
        )
    }, [])

    const rootClassName = classNames(cls.AboutPage, {}, [className ?? ''])

    return (
        <div className={rootClassName}>
            <section className={cls.hero}>
                <div className={cls.heroContent}>
                    <span className={cls.heroEyebrow}>{renderTermTooltipRichText(t('hero.eyebrow'))}</span>
                    <Text type='h1' className={cls.heroTitle}>
                        {t('hero.title')}
                    </Text>
                    <Text className={cls.heroSubtitle}>{renderTermTooltipRichText(t('hero.subtitle'))}</Text>
                </div>
            </section>

            <div className={cls.rootNodes}>{ABOUT_ATLAS_ROOT_NODES.map(node => renderAtlasNode(node, 0))}</div>
        </div>
    )

    function renderAtlasNode(node: AboutAtlasNode, depth: number): ReactNode {
        const isRouteNode = node.kind === 'route'
        const routeEntry = isRouteNode ? routeEntryByRoute.get(node.routeId) : undefined
        if (isRouteNode && !routeEntry) {
            throw new Error(`[about] Route node is missing in route atlas. routeId=${node.routeId}.`)
        }

        const title =
            isRouteNode ?
                t(routeEntry!.labelKey, { defaultValue: routeEntry!.label })
            :   t(node.titleKey, { defaultValue: node.defaultTitle })
        const description = isRouteNode ? t(buildRouteDescriptionKey(node.routeId)) : t(node.descriptionKey)
        const linkedRouteId = isRouteNode ? node.routeId : node.linkRouteId
        const linkedRouteEntry = linkedRouteId ? routeEntryByRoute.get(linkedRouteId) : undefined
        const childNodes = isRouteNode ? (node.childNodes ?? []) : node.childNodes
        const blockLinks = isRouteNode && childNodes.length === 0 && routeEntry ? routeEntry.blocks : []
        const hasNestedContent = childNodes.length > 0 || blockLinks.length > 0
        const isExpanded = expandedNodeIds.includes(node.id)
        const detailRegionId = `about-node-${node.id}`
        return (
            <article
                key={node.id}
                className={classNames(
                    cls.nodeCard,
                    {
                        [cls.rootNodeCard]: depth === 0,
                        [cls.sectionNodeCard]: depth === 1,
                        [cls.pageNodeCard]: depth >= 2
                    },
                    []
                )}>
                <div className={cls.nodeBody}>
                    {linkedRouteEntry ?
                        <Link
                            to={linkedRouteEntry.path}
                            className={cls.nodeLink}
                            onMouseEnter={() => handleRouteWarmup(linkedRouteEntry.routeId)}
                            onFocus={() => handleRouteWarmup(linkedRouteEntry.routeId)}>
                            {title}
                        </Link>
                    :   <Text type={depth === 0 ? 'h2' : 'h3'} className={cls.nodeTitle}>
                            {title}
                        </Text>
                    }

                    <Text className={cls.nodeDescription}>{renderTermTooltipRichText(description)}</Text>
                </div>

                {hasNestedContent && (
                    <button
                        type='button'
                        className={cls.toggleButton}
                        aria-expanded={isExpanded}
                        aria-controls={detailRegionId}
                        aria-label={
                            isExpanded ?
                                t('detail.toggleAria.collapse', { title })
                            :   t('detail.toggleAria.expand', { title })
                        }
                        onClick={() => toggleNode(node.id)}>
                        <span className={cls.toggleText}>
                            {isExpanded ? t('detail.toggleLabel.collapse') : t('detail.toggleLabel.expand')}
                        </span>
                        <span className={cls.toggleIcon}>
                            <Icon name='arrow' flipped={isExpanded} />
                        </span>
                    </button>
                )}

                {hasNestedContent && (
                    <div
                        id={detailRegionId}
                        role='region'
                        aria-label={t('detail.regionAria', { title })}
                        className={classNames(cls.nodeDetails, { [cls.nodeDetailsExpanded]: isExpanded }, [])}>
                        {childNodes.length > 0 ?
                            <div className={cls.childNodes}>
                                {childNodes.map(childNode => renderAtlasNode(childNode, depth + 1))}
                            </div>
                        :   <div className={cls.blockList}>
                                {blockLinks.map(block => (
                                    <AboutBlockCard
                                        key={`${node.id}-${block.id}`}
                                        block={block}
                                        routeEntryByRoute={routeEntryByRoute}
                                        onWarmup={handleRouteWarmup}
                                    />
                                ))}
                            </div>
                        }
                    </div>
                )}
            </article>
        )
    }
}

function AboutBlockCard({
    block,
    routeEntryByRoute,
    onWarmup
}: {
    block: AboutBlockLink
    routeEntryByRoute: Map<AppRoute, AboutNavEntry>
    onWarmup: (routeId: AppRoute) => void
}) {
    const { t } = useTranslation(['about', 'nav'])
    const routeEntry = routeEntryByRoute.get(block.routeId)
    if (!routeEntry) {
        throw new Error(`[about] Block route is missing in atlas. routeId=${block.routeId}.`)
    }

    const title =
        block.titleTabId ?
            t(buildRouteSubTabLabelI18nKey(block.routeId, block.titleTabId), {
                defaultValue: block.titleDefaultLabel
            })
        :   t(buildBlockTitleKey(block.routeId, block.id))
    const description = t(buildBlockDescriptionKey(block.routeId, block.id))
    const href = block.anchor ? `${routeEntry.path}#${block.anchor}` : routeEntry.path

    return (
        <Link
            to={href}
            className={cls.blockLink}
            onMouseEnter={() => onWarmup(block.routeId)}
            onFocus={() => onWarmup(block.routeId)}>
            <article className={cls.blockCard}>
                <Text type='h4' className={cls.blockTitle}>
                    {title}
                </Text>
                <Text className={cls.blockDescription}>{renderTermTooltipRichText(description)}</Text>
            </article>
        </Link>
    )
}
