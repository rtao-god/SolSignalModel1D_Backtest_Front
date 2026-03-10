import { useEffect, useMemo, useRef, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { TermTooltip, Text } from '@/shared/ui'
import { useTranslation } from 'react-i18next'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { LocalizedContentBoundary } from '@/shared/ui/errors/LocalizedContentBoundary/ui/LocalizedContentBoundary'
import { buildRouteSubTabLabelI18nKey } from '@/app/providers/router/config/i18nKeys'
import { readAvailableDeveloperTermGroups, readDeveloperSentenceOrThrow } from './developerI18n'
import { buildDeveloperGlossaryOrThrow, renderDeveloperRichText } from './developerRichText'
import cls from './DeveloperContentPage.module.scss'
import type {
    DeveloperPageContentConfig,
    DeveloperSectionGroupConfig,
    DeveloperSectionTableConfig,
    DeveloperSentenceConfig,
    DeveloperTreeNodeConfig
} from './types'

interface DeveloperContentPageProps {
    className?: string
    config: DeveloperPageContentConfig
}

type DeveloperGlossary = ReturnType<typeof buildDeveloperGlossaryOrThrow>
type DeveloperNodeLookupEntry = {
    node: DeveloperTreeNodeConfig
    sectionId: string
}

const DETAIL_SENTENCE_LABEL_KEYS: Record<string, string> = {
    what: 'labels.detailWhat',
    separation: 'labels.detailSeparation',
    whenOpen: 'labels.detailWhenOpen',
    dependencies: 'labels.detailDependencies',
    keyFiles: 'labels.detailKeyFiles',
    pitfalls: 'labels.detailPitfalls',
    excluded: 'labels.detailExcluded'
}

function appendDeveloperNodesOrThrow(
    sectionId: string,
    nodes: readonly DeveloperTreeNodeConfig[],
    lookup: Map<string, DeveloperNodeLookupEntry>
) {
    nodes.forEach(node => {
        if (lookup.has(node.id)) {
            throw new Error(`Duplicate developer node id '${node.id}'.`)
        }

        lookup.set(node.id, {
            node,
            sectionId
        })

        if (node.children && node.children.length > 0) {
            appendDeveloperNodesOrThrow(sectionId, node.children, lookup)
        }
    })
}

function buildDeveloperNodeLookupOrThrow(
    config: DeveloperPageContentConfig
): ReadonlyMap<string, DeveloperNodeLookupEntry> {
    const lookup = new Map<string, DeveloperNodeLookupEntry>()

    config.sections.forEach(section => {
        if (section.tree && section.tree.length > 0) {
            appendDeveloperNodesOrThrow(section.id, section.tree, lookup)
        }
    })

    return lookup
}

function readDeveloperTableCellOrThrow(
    i18n: ReturnType<typeof useTranslation>['i18n'],
    tableBaseKey: string,
    rowId: string,
    columnId: string
) {
    return readDeveloperSentenceOrThrow(i18n, `${tableBaseKey}.rows.${rowId}.cells.${columnId}.text`)
}

function readDeveloperDetailNodeOrThrow(
    rowId: string,
    nodeLookup: ReadonlyMap<string, DeveloperNodeLookupEntry>
) {
    const entry = nodeLookup.get(rowId)

    if (!entry) {
        throw new Error(`Missing developer detail node for table row '${rowId}'.`)
    }

    if (!entry.node.sentences || entry.node.sentences.length === 0) {
        throw new Error(`Developer detail node '${rowId}' does not contain sentences.`)
    }

    return entry
}

function renderWhyTooltip(
    sentence: DeveloperSentenceConfig,
    whyTextKey: string | null,
    glossary: DeveloperGlossary,
    label: string,
    i18n: ReturnType<typeof useTranslation>['i18n']
) {
    if (!sentence.whyId || !whyTextKey) {
        return null
    }

    return (
        <TermTooltip
            term={label}
            tooltipTitle={label}
            description={() =>
                renderDeveloperRichText(readDeveloperSentenceOrThrow(i18n, whyTextKey), {
                    glossary
                })
            }
            type='span'
            className={cls.inlineWhy}
        />
    )
}

function SentenceBlock({
    sentence,
    sentenceKey,
    whyTextKey,
    glossary,
    whyLabel,
    i18n
}: {
    sentence: DeveloperSentenceConfig
    sentenceKey: string
    whyTextKey: string | null
    glossary: DeveloperGlossary
    whyLabel: string
    i18n: ReturnType<typeof useTranslation>['i18n']
}) {
    const text = readDeveloperSentenceOrThrow(i18n, sentenceKey)

    return (
        <Text className={cls.sentenceBlock}>
            {renderDeveloperRichText(text, { glossary })}{' '}
            {renderWhyTooltip(sentence, whyTextKey, glossary, whyLabel, i18n)}
        </Text>
    )
}

function DeveloperSectionTable({
    pageKey,
    sectionId,
    table,
    glossary,
    nodeLookup,
    i18n,
    t
}: {
    pageKey: string
    sectionId: string
    table: DeveloperSectionTableConfig
    glossary: DeveloperGlossary
    nodeLookup: ReadonlyMap<string, DeveloperNodeLookupEntry>
    i18n: ReturnType<typeof useTranslation>['i18n']
    t: ReturnType<typeof useTranslation>['t']
}) {
    const tableBaseKey = `${pageKey}.sections.${sectionId}.tables.${table.id}`
    const detailRowIds = table.detailRowIds ?? []
    const detailRowIdSet = useMemo(() => new Set(detailRowIds), [detailRowIds])
    const detailPanelRef = useRef<HTMLElement | null>(null)
    const hasInteractedRef = useRef(false)
    const [selectedDetailId, setSelectedDetailId] = useState<string | null>(
        table.defaultDetailId ?? detailRowIds[0] ?? null
    )
    const detailPanelId = `${table.id}-detail-panel`
    const activeDetailId =
        detailRowIds.length > 0 ? (selectedDetailId ?? table.defaultDetailId ?? detailRowIds[0]) : null
    const activeDetail = activeDetailId ? readDeveloperDetailNodeOrThrow(activeDetailId, nodeLookup) : null
    const activeDetailProject =
        activeDetailId ? readDeveloperTableCellOrThrow(i18n, tableBaseKey, activeDetailId, 'project') : null
    const activeDetailZone =
        activeDetailId ? readDeveloperTableCellOrThrow(i18n, tableBaseKey, activeDetailId, 'zone') : null
    const activeDetailRole =
        activeDetailId ? readDeveloperTableCellOrThrow(i18n, tableBaseKey, activeDetailId, 'role') : null
    const activeDetailWhenOpen =
        activeDetailId ? readDeveloperTableCellOrThrow(i18n, tableBaseKey, activeDetailId, 'whenOpen') : null
    const activeDetailRoleNode = activeDetailRole ? renderDeveloperRichText(activeDetailRole, { glossary }) : null
    const activeDetailWhenOpenNode =
        activeDetailWhenOpen ? renderDeveloperRichText(activeDetailWhenOpen, { glossary }) : null

    useEffect(() => {
        if (!activeDetailId || !hasInteractedRef.current) {
            return
        }

        const detailPanelNode = detailPanelRef.current

        if (!detailPanelNode) {
            return
        }

        // После выбора проекта переносим фокус к подробной карточке,
        // иначе смена содержимого внизу таблицы легко теряется визуально.
        detailPanelNode.focus()
        if (typeof detailPanelNode.scrollIntoView === 'function') {
            detailPanelNode.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            })
        }
    }, [activeDetailId])

    const handleSelectDetail = (rowId: string) => {
        hasInteractedRef.current = true
        setSelectedDetailId(rowId)
    }

    return (
        <div className={cls.tableBlock}>
            <Text type='h4' className={cls.tableTitle}>
                {readDeveloperSentenceOrThrow(i18n, `${tableBaseKey}.title`)}
            </Text>

            <div className={cls.tableScroll}>
                <table className={cls.developerTable}>
                    <thead>
                        <tr>
                            {table.columnIds.map(columnId => (
                                <th key={`${table.id}-${columnId}`}>
                                    {readDeveloperSentenceOrThrow(
                                        i18n,
                                        `${tableBaseKey}.columns.${columnId}.text`
                                    )}
                                </th>
                            ))}
                        </tr>
                    </thead>

                    <tbody>
                        {table.rowIds.map(rowId => {
                            const isSelected = activeDetailId === rowId

                            return (
                                <tr
                                    key={`${table.id}-${rowId}`}
                                    className={isSelected ? cls.tableRowSelected : undefined}>
                                    {table.columnIds.map(columnId => {
                                        const cellText = readDeveloperTableCellOrThrow(
                                            i18n,
                                            tableBaseKey,
                                            rowId,
                                            columnId
                                        )
                                        const isDetailButton = columnId === 'project' && detailRowIdSet.has(rowId)

                                        return (
                                            <td key={`${rowId}-${columnId}`}>
                                                {isDetailButton ?
                                                    <button
                                                        type='button'
                                                        className={classNames(cls.tableProjectButton, {
                                                            [cls.tableProjectButtonActive]: isSelected
                                                        })}
                                                        aria-controls={detailPanelId}
                                                        aria-pressed={isSelected}
                                                        onClick={() => handleSelectDetail(rowId)}>
                                                        <code className={cls.tableCodeCell}>{cellText}</code>
                                                    </button>
                                                : columnId === 'project' ?
                                                    <code className={cls.tableCodeCell}>{cellText}</code>
                                                :   renderDeveloperRichText(cellText, { glossary })}
                                            </td>
                                        )
                                    })}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {activeDetail && activeDetailProject && activeDetailZone && activeDetailRole && activeDetailWhenOpen && (
                <section
                    ref={detailPanelRef}
                    id={detailPanelId}
                    className={cls.detailPanel}
                    aria-label={t('labels.selectedProjectDetails', { ns: 'developer' })}
                    tabIndex={-1}>
                    <div className={cls.detailHeader}>
                        <Text type='h4' className={cls.detailTitle}>
                            {t('labels.selectedProjectDetails', { ns: 'developer' })}{' '}
                            <code className={cls.detailTitleCode}>{activeDetailProject}</code>
                        </Text>
                    </div>

                    <div className={cls.detailMetaGrid}>
                        <div className={cls.detailMetaCard}>
                            <span className={cls.detailMetaLabel}>
                                {t('labels.projectZone', { ns: 'developer' })}
                            </span>
                            <Text className={cls.detailMetaText}>{activeDetailZone}</Text>
                        </div>

                        <div className={cls.detailMetaCard}>
                            <span className={cls.detailMetaLabel}>
                                {t('labels.projectRole', { ns: 'developer' })}
                            </span>
                            <Text className={cls.detailMetaText}>{activeDetailRoleNode}</Text>
                        </div>

                        <div className={cls.detailMetaCard}>
                            <span className={cls.detailMetaLabel}>
                                {t('labels.projectWhenOpen', { ns: 'developer' })}
                            </span>
                            <Text className={cls.detailMetaText}>{activeDetailWhenOpenNode}</Text>
                        </div>
                    </div>

                    <ul className={cls.detailList}>
                        {activeDetail.node.sentences?.map(sentence => {
                            const sentenceKey = `${pageKey}.sections.${activeDetail.sectionId}.treeNodes.${activeDetailId}.sentences.${sentence.id}.text`
                            const labelKey = DETAIL_SENTENCE_LABEL_KEYS[sentence.id]
                            const sentenceText = readDeveloperSentenceOrThrow(i18n, sentenceKey)

                            return (
                                <li key={`${activeDetailId}-${sentence.id}`} className={cls.detailListItem}>
                                    <Text className={cls.detailListText}>
                                        {labelKey && (
                                            <span className={cls.detailListLabel}>
                                                {t(labelKey, { ns: 'developer' })}{' '}
                                            </span>
                                        )}
                                        {renderDeveloperRichText(sentenceText, { glossary })}
                                    </Text>
                                </li>
                            )
                        })}
                    </ul>

                    {activeDetail.node.children && activeDetail.node.children.length > 0 && (
                        <div className={cls.detailChildrenBlock}>
                            <Text type='h5' className={cls.detailChildrenTitle}>
                                {t('labels.projectChildren', { ns: 'developer' })}
                            </Text>

                            <div className={cls.detailChildrenList}>
                                {activeDetail.node.children.map(child => (
                                    <code
                                        key={`${activeDetailId}-${child.id}`}
                                        className={cls.detailChildTag}>
                                        {child.label}
                                    </code>
                                ))}
                            </div>
                        </div>
                    )}
                </section>
            )}
        </div>
    )
}

function DeveloperSectionGroups({
    pageKey,
    sectionId,
    groups,
    glossary,
    whyLabel,
    i18n
}: {
    pageKey: string
    sectionId: string
    groups: readonly DeveloperSectionGroupConfig[]
    glossary: DeveloperGlossary
    whyLabel: string
    i18n: ReturnType<typeof useTranslation>['i18n']
}) {
    return (
        <div className={cls.groupGrid}>
            {groups.map((group, index) => {
                const groupBaseKey = `${pageKey}.sections.${sectionId}.groups.${group.id}`

                return (
                    <section key={`${sectionId}-${group.id}`} className={cls.groupCard}>
                        <div className={cls.groupHeader}>
                            <span className={cls.groupBadge}>{index + 1}</span>
                            <Text type='h4' className={cls.groupTitle}>
                                {readDeveloperSentenceOrThrow(i18n, `${groupBaseKey}.title`)}
                            </Text>
                        </div>

                        <div className={cls.sentenceGroup}>
                            {group.sentences.map(sentence => (
                                <SentenceBlock
                                    key={`${group.id}-${sentence.id}`}
                                    sentence={sentence}
                                    sentenceKey={`${groupBaseKey}.sentences.${sentence.id}.text`}
                                    whyTextKey={`${groupBaseKey}.whys.${sentence.whyId}.text`}
                                    glossary={glossary}
                                    whyLabel={whyLabel}
                                    i18n={i18n}
                                />
                            ))}
                        </div>
                    </section>
                )
            })}
        </div>
    )
}

function DeveloperTree({
    pageKey,
    sectionId,
    nodes,
    glossary,
    whyLabel,
    i18n
}: {
    pageKey: string
    sectionId: string
    nodes: readonly DeveloperTreeNodeConfig[]
    glossary: DeveloperGlossary
    whyLabel: string
    i18n: ReturnType<typeof useTranslation>['i18n']
}) {
    return (
        <div className={cls.treeRoot}>
            {nodes.map(node => {
                const nodeBaseKey = `${pageKey}.sections.${sectionId}.treeNodes.${node.id}`

                return (
                    <div key={`${sectionId}-${node.id}`} className={cls.treeNode}>
                        <div className={cls.treeCard}>
                            <code className={cls.treeLabel}>{node.label}</code>
                            {node.sentences && node.sentences.length > 0 && (
                                <div className={cls.sentenceGroup}>
                                    {node.sentences.map(sentence => (
                                        <SentenceBlock
                                            key={`${node.id}-${sentence.id}`}
                                            sentence={sentence}
                                            sentenceKey={`${nodeBaseKey}.sentences.${sentence.id}.text`}
                                            whyTextKey={`${nodeBaseKey}.whys.${sentence.whyId}.text`}
                                            glossary={glossary}
                                            whyLabel={whyLabel}
                                            i18n={i18n}
                                        />
                                    ))}
                                </div>
                            )}

                            {node.children && node.children.length > 0 && (
                                <div className={cls.treeChildren}>
                                    <DeveloperTree
                                        pageKey={pageKey}
                                        sectionId={sectionId}
                                        nodes={node.children}
                                        glossary={glossary}
                                        whyLabel={whyLabel}
                                        i18n={i18n}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}

export default function DeveloperContentPage({ className, config }: DeveloperContentPageProps) {
    const { t, i18n } = useTranslation(['developer', 'nav'])
    const sections = useMemo(
        () =>
            config.tabs.map(tab => ({
                ...tab,
                label: t(buildRouteSubTabLabelI18nKey(config.routeId, tab.id), { defaultValue: tab.label })
            })),
        [config.routeId, config.tabs, t]
    )
    const glossaryKeys = config.sections.map(section => `${config.pageKey}.sections.${section.id}.terms`)
    const buildGlossary = () => buildDeveloperGlossaryOrThrow(readAvailableDeveloperTermGroups(i18n, glossaryKeys))
    const nodeLookup = useMemo(() => buildDeveloperNodeLookupOrThrow(config), [config])
    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections,
        syncHash: true
    })

    return (
        <div className={classNames(cls.DeveloperContentPage, {}, [className ?? ''])} data-tooltip-boundary>
            <header className={cls.headerRow}>
                <Text type='h2'>{t(`${config.pageKey}.header.title`, { ns: 'developer' })}</Text>
                <Text className={cls.subtitle}>{t(`${config.pageKey}.header.subtitle`, { ns: 'developer' })}</Text>
            </header>

            <div className={cls.sectionsGrid}>
                {config.sections.map(section => (
                    <section key={section.id} id={section.anchor} className={cls.sectionCard}>
                        <Text type='h3' className={cls.sectionTitle}>
                            {t(`${config.pageKey}.sections.${section.id}.title`, { ns: 'developer' })}
                        </Text>

                        <LocalizedContentBoundary name={`Developer:${config.pageKey}:${section.id}`}>
                            {() => {
                                const glossary = buildGlossary()
                                const whyLabel = t('labels.why', { ns: 'developer' })

                                return (
                                    <>
                                        {section.sentences.length > 0 && (
                                            <div className={cls.sentenceGroup}>
                                                {section.sentences.map(sentence => (
                                                    <SentenceBlock
                                                        key={`${section.id}-${sentence.id}`}
                                                        sentence={sentence}
                                                        sentenceKey={`${config.pageKey}.sections.${section.id}.sentences.${sentence.id}.text`}
                                                        whyTextKey={
                                                            sentence.whyId ?
                                                                `${config.pageKey}.sections.${section.id}.whys.${sentence.whyId}.text`
                                                            :   null
                                                        }
                                                        glossary={glossary}
                                                        whyLabel={whyLabel}
                                                        i18n={i18n}
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        {section.tables && section.tables.length > 0 && (
                                            <div className={cls.tableGroup}>
                                                {section.tables.map(table => (
                                                    <DeveloperSectionTable
                                                        key={`${section.id}-${table.id}`}
                                                        pageKey={config.pageKey}
                                                        sectionId={section.id}
                                                        table={table}
                                                        glossary={glossary}
                                                        nodeLookup={nodeLookup}
                                                        i18n={i18n}
                                                        t={t}
                                                    />
                                                ))}
                                            </div>
                                        )}

                                        {section.groups && section.groups.length > 0 && (
                                            <DeveloperSectionGroups
                                                pageKey={config.pageKey}
                                                sectionId={section.id}
                                                groups={section.groups}
                                                glossary={glossary}
                                                whyLabel={whyLabel}
                                                i18n={i18n}
                                            />
                                        )}

                                        {section.tree && section.tree.length > 0 && (
                                            <DeveloperTree
                                                pageKey={config.pageKey}
                                                sectionId={section.id}
                                                nodes={section.tree}
                                                glossary={glossary}
                                                whyLabel={whyLabel}
                                                i18n={i18n}
                                            />
                                        )}
                                    </>
                                )
                            }}
                        </LocalizedContentBoundary>
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
