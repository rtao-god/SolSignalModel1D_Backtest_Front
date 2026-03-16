import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Btn, Text, TermTooltip } from '@/shared/ui'
import { renderTermTooltipRichText } from '@/shared/ui/TermTooltip'
import { resolveMatchingTermTooltipRuleIds } from '@/shared/ui/TermTooltip/ui/renderTermTooltipRichText'
import { resolveReportTooltipSelfAliases } from '@/shared/utils/reportTooltips'
import { buildReportTermsFromSections } from '@/shared/utils/reportTerms'
import { logError } from '@/shared/lib/logging/logError'
import cls from './ReportTableTermsBlock.module.scss'

type ReportTableTermTextResolver = () => string
type PreparedReportTableTermItem = {
    key: string
    title: string
    description?: string
    tooltip?: string
    resolveDescription?: ReportTableTermTextResolver
    resolveTooltip?: ReportTableTermTextResolver
    selfAliases?: string[]
}
type ProvidedReportTableTermItem = PreparedReportTableTermItem

interface ReportTableTermsBlockProps {
    reportKind?: string
    sectionTitle?: string
    columns?: string[]
    terms?: ProvidedReportTableTermItem[]
    enhanceDomainTerms?: boolean
    showTermTitleTooltip?: boolean
    displayMode?: 'inline' | 'tooltipOnly'
    title?: string
    subtitle?: string
    className?: string
    collapsible?: boolean
    collapseStorageKey?: string
}

const TERMS_BLOCK_COLLAPSE_STORAGE_PREFIX = 'report-terms-block:collapsed:'

function normalizeNonEmptyAliases(values: string[]): string[] {
    return Array.from(new Set(values.map(value => value.trim()).filter(value => value.length > 0)))
}

export function buildSelfTooltipExclusions(termKey: string, termTitle: string, selfAliases: string[] = []) {
    const allAliases = normalizeNonEmptyAliases([termTitle, termKey, ...selfAliases])
    const excludeRuleIds = Array.from(new Set(allAliases.flatMap(alias => resolveMatchingTermTooltipRuleIds(alias))))

    return {
        excludeTerms: allAliases,
        excludeRuleIds,
        excludeRuleTitles: allAliases
    }
}

function normalizeStorageKeyPart(value: string | undefined): string {
    return (value ?? '').trim().replace(/\s+/g, ' ')
}

export function buildReportTableTermsCollapseStorageKey(params: {
    reportKind?: string
    sectionTitle?: string
    title?: string
    termKeys: string[]
}): string | null {
    const normalizedTermKeys = normalizeNonEmptyAliases(params.termKeys)
    const parts = [
        normalizeStorageKeyPart(params.reportKind),
        normalizeStorageKeyPart(params.sectionTitle),
        normalizeStorageKeyPart(params.title),
        normalizeStorageKeyPart(normalizedTermKeys.join('|'))
    ].filter(value => value.length > 0)

    if (parts.length === 0) {
        return null
    }

    return `${TERMS_BLOCK_COLLAPSE_STORAGE_PREFIX}${parts.join('::')}`
}

function ensureNonEmptyValue(value: string | undefined, label: string): string {
    if (!value || value.trim().length === 0) {
        throw new Error(`[report-terms] ${label} is empty.`)
    }

    return value.trim()
}

function resolveLazyText(
    value: string | undefined,
    resolver: ReportTableTermTextResolver | undefined,
    label: string
): string {
    if (typeof value === 'string' && value.trim().length > 0) {
        return value.trim()
    }

    if (!resolver) {
        throw new Error(`[report-terms] ${label} is missing.`)
    }

    const resolved = resolver()
    if (!resolved || resolved.trim().length === 0) {
        throw new Error(`[report-terms] ${label} resolved to empty value.`)
    }

    return resolved.trim()
}

function buildTermsFromColumns(
    reportKind: string,
    sectionTitle: string,
    columns: string[],
    locale: string
): PreparedReportTableTermItem[] {
    return buildReportTermsFromSections({
        sections: [{ title: sectionTitle, columns }],
        reportKind,
        contextTag: 'report-table-terms-block',
        locale
    })
}

function buildProvidedTerms(terms: ProvidedReportTableTermItem[]): PreparedReportTableTermItem[] {
    if (!terms || terms.length === 0) {
        throw new Error('[report-terms] provided terms are empty.')
    }

    return terms.map((term, index) => ({
        key: ensureNonEmptyValue(term.key, `terms[${index}].key`),
        title: ensureNonEmptyValue(term.title, `terms[${index}].title`),
        description:
            typeof term.description === 'string' && term.description.trim().length > 0 ?
                term.description.trim()
            :   undefined,
        tooltip: typeof term.tooltip === 'string' && term.tooltip.trim().length > 0 ? term.tooltip.trim() : undefined,
        resolveDescription: term.resolveDescription,
        resolveTooltip: term.resolveTooltip,
        selfAliases: normalizeNonEmptyAliases(term.selfAliases ?? [])
    }))
}

function safeLoadCollapsedState(key: string): boolean | null {
    if (typeof window === 'undefined') {
        return null
    }

    try {
        const raw = window.localStorage.getItem(key)
        if (raw === '1') {
            return true
        }
        if (raw === '0') {
            return false
        }

        return null
    } catch (error) {
        const normalizedError =
            error instanceof Error ? error : new Error(String(error ?? 'Unknown report terms collapse load error.'))
        logError(normalizedError, undefined, {
            source: 'report-table-terms-collapse-load',
            domain: 'app_runtime',
            severity: 'warning',
            extra: { key }
        })
        return null
    }
}

function safeSaveCollapsedState(key: string, isCollapsed: boolean) {
    if (typeof window === 'undefined') {
        return
    }

    try {
        window.localStorage.setItem(key, isCollapsed ? '1' : '0')
    } catch (error) {
        const normalizedError =
            error instanceof Error ? error : new Error(String(error ?? 'Unknown report terms collapse save error.'))
        logError(normalizedError, undefined, {
            source: 'report-table-terms-collapse-save',
            domain: 'app_runtime',
            severity: 'warning',
            extra: { key }
        })
    }
}

function resolveCollapseToggleLabel(language: string, isCollapsed: boolean): string {
    if (language.startsWith('ru')) {
        return isCollapsed ? 'Показать блок' : 'Скрыть блок'
    }

    return isCollapsed ? 'Show block' : 'Hide block'
}

export default function ReportTableTermsBlock({
    reportKind,
    sectionTitle,
    columns,
    terms,
    enhanceDomainTerms = false,
    showTermTitleTooltip = true,
    displayMode = 'inline',
    title = 'Термины таблицы',
    subtitle = 'Подробные определения всех колонок, которые используются в таблице ниже.',
    className,
    collapsible = true,
    collapseStorageKey
}: ReportTableTermsBlockProps) {
    const { i18n } = useTranslation()
    const resolvedLocale = i18n.resolvedLanguage ?? i18n.language ?? 'en'
    const resolvedLanguage = resolvedLocale.trim().toLowerCase()
    const resolvedTerms = useMemo<PreparedReportTableTermItem[]>(
        () =>
        terms ?
            buildProvidedTerms(terms)
        :   buildTermsFromColumns(
                ensureNonEmptyValue(reportKind, 'reportKind'),
                ensureNonEmptyValue(sectionTitle, 'sectionTitle'),
                columns ?? [],
                resolvedLocale
            ),
        [columns, reportKind, resolvedLocale, sectionTitle, terms]
    )
    const effectiveCollapseStorageKey = useMemo(
        () =>
            collapseStorageKey ??
            buildReportTableTermsCollapseStorageKey({
                reportKind,
                sectionTitle,
                title,
                termKeys: resolvedTerms.map(term => term.key)
            }),
        [collapseStorageKey, reportKind, resolvedTerms, sectionTitle, title]
    )
    const canCollapse = collapsible && resolvedTerms.length > 0
    const [isCollapsed, setIsCollapsed] = useState(() =>
        canCollapse && effectiveCollapseStorageKey ? (safeLoadCollapsedState(effectiveCollapseStorageKey) ?? false) : false
    )

    useEffect(() => {
        if (!canCollapse || !effectiveCollapseStorageKey) {
            setIsCollapsed(false)
            return
        }

        setIsCollapsed(safeLoadCollapsedState(effectiveCollapseStorageKey) ?? false)
    }, [canCollapse, effectiveCollapseStorageKey])

    useEffect(() => {
        if (!canCollapse || !effectiveCollapseStorageKey) {
            return
        }

        safeSaveCollapsedState(effectiveCollapseStorageKey, isCollapsed)
    }, [canCollapse, effectiveCollapseStorageKey, isCollapsed])

    return (
        <div className={`${cls.root}${className ? ` ${className}` : ''}`} data-tooltip-boundary>
            <div className={cls.header}>
                <div className={cls.headerTop}>
                    <Text type='h3' className={cls.title}>
                        {title}
                    </Text>
                    {canCollapse && (
                        <Btn
                            className={cls.toggleButton}
                            variant='ghost'
                            colorScheme='neutral'
                            size='sm'
                            aria-expanded={!isCollapsed}
                            onClick={() => setIsCollapsed(current => !current)}>
                            {resolveCollapseToggleLabel(resolvedLanguage, isCollapsed)}
                        </Btn>
                    )}
                </div>
                <Text className={cls.subtitle}>{subtitle}</Text>
            </div>

            {!isCollapsed && <div className={cls.grid}>
                {resolvedTerms.map(term => {
                    const itemClassName = displayMode === 'tooltipOnly' ? `${cls.item} ${cls.itemCompact}` : cls.item
                    const shouldRenderTitleTooltip = displayMode === 'tooltipOnly' && showTermTitleTooltip
                    const selfAliases = normalizeNonEmptyAliases([
                        ...resolveReportTooltipSelfAliases(reportKind, term.key),
                        ...(term.selfAliases ?? [])
                    ])

                    return (
                        <div
                            key={`${sectionTitle ?? title ?? reportKind ?? 'report-terms'}:${term.key}`}
                            className={itemClassName}>
                            {shouldRenderTitleTooltip ?
                                <TermTooltip
                                    term={term.title}
                                    description={() => {
                                        const tooltip = resolveLazyText(
                                            term.tooltip,
                                            term.resolveTooltip,
                                            `terms.${term.key}.tooltip`
                                        )

                                        return enhanceDomainTerms ?
                                                renderTermTooltipRichText(
                                                    tooltip,
                                                    buildSelfTooltipExclusions(term.key, term.title, selfAliases)
                                                )
                                            :   tooltip
                                    }}
                                    type='span'
                                />
                            :   <Text type='span'>{term.title}</Text>}

                            {displayMode === 'inline' && (
                                <Text className={cls.description}>
                                    {(() => {
                                        const description = resolveLazyText(
                                            term.description,
                                            term.resolveDescription,
                                            `terms.${term.key}.description`
                                        )

                                        return enhanceDomainTerms ?
                                                renderTermTooltipRichText(
                                                    description,
                                                    buildSelfTooltipExclusions(term.key, term.title, selfAliases)
                                                )
                                            :   description
                                    })()}
                                </Text>
                            )}
                        </div>
                    )
                })}
            </div>}
        </div>
    )
}
