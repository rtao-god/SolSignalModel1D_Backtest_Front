import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Btn, Text, TermTooltip } from '@/shared/ui'
import { renderTermTooltipRichText } from '@/shared/ui/TermTooltip'
import { resolveReportTooltipSelfAliases } from '@/shared/utils/reportTooltips'
import { buildReportTermsFromSections } from '@/shared/utils/reportTerms'
import { logError } from '@/shared/lib/logging/logError'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'
import { usePageLocalIssueReporter } from '@/shared/ui/errors/PageLocalIssues'
import {
    buildReportTableTermsCollapseStorageKey,
    buildSelfTooltipExclusions
} from '../model/reportTableTermsBlock'
import cls from './ReportTableTermsBlock.module.scss'

type ReportTableTermTextResolver = () => string
type PreparedReportTableTermItem = {
    key: string
    title: string
    description: string
    tooltip: string
    selfAliases?: string[]
}
type ProvidedReportTableTermItem = Omit<PreparedReportTableTermItem, 'description' | 'tooltip'> & {
    description?: string
    tooltip?: string
    resolveDescription?: ReportTableTermTextResolver
    resolveTooltip?: ReportTableTermTextResolver
}

interface ReportTermsIssueContext {
    reportKind?: string
    sectionTitle?: string
    blockTitle: string
    locale: string
}

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

function normalizeNonEmptyAliases(values: string[]): string[] {
    return Array.from(new Set(values.map(value => value.trim()).filter(value => value.length > 0)))
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
        description: resolveLazyText(
            typeof term.description === 'string' && term.description.trim().length > 0 ?
                term.description.trim()
            :   undefined,
            term.resolveDescription,
            `terms.${term.key}.description`
        ),
        tooltip: resolveLazyText(
            typeof term.tooltip === 'string' && term.tooltip.trim().length > 0 ? term.tooltip.trim() : undefined,
            term.resolveTooltip,
            `terms.${term.key}.tooltip`
        ),
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
        const normalizedError = normalizeErrorLike(error, 'Unknown report terms collapse load error.', {
            source: 'report-table-terms-collapse-load',
            domain: 'app_runtime',
            extra: { key }
        })
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
        const normalizedError = normalizeErrorLike(error, 'Unknown report terms collapse save error.', {
            source: 'report-table-terms-collapse-save',
            domain: 'app_runtime',
            extra: { key }
        })
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

function extractTermsErrorColumn(errorMessage: string): string | null {
    const match = errorMessage.match(/column=([^.|]+)/i)
    return match?.[1]?.trim() ?? null
}

function extractTermsErrorProblem(errorMessage: string): string {
    if (errorMessage.includes('tooltip is missing')) {
        return 'Для этой колонки не найден tooltip.'
    }

    if (errorMessage.includes('description is missing')) {
        return 'Для этой колонки не найдено описание.'
    }

    if (errorMessage.includes('resolved to empty value')) {
        return 'Поставщик текста вернул пустое значение.'
    }

    if (errorMessage.includes('is missing')) {
        return 'Один из обязательных текстов блока отсутствует.'
    }

    return errorMessage
}

function buildReportTermsIssueDescription(error: Error, context: ReportTermsIssueContext): string {
    const details: string[] = []
    const errorMessage = error.message.trim()
    const brokenColumn = extractTermsErrorColumn(errorMessage)
    const problem = extractTermsErrorProblem(errorMessage)

    details.push(problem)

    if (brokenColumn) {
        details.push(`Колонка: ${brokenColumn}.`)
    }

    if (context.sectionTitle && context.sectionTitle.trim().length > 0) {
        details.push(`Секция: ${context.sectionTitle.trim()}.`)
    } else if (context.blockTitle.trim().length > 0) {
        details.push(`Блок: ${context.blockTitle.trim()}.`)
    }

    if (context.reportKind && context.reportKind.trim().length > 0) {
        details.push(`Отчёт: ${context.reportKind.trim()}.`)
    }

    details.push(`Локаль: ${context.locale}.`)

    return details.join(' ')
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
    const preparedTermsState = useMemo<{
        resolvedTerms: PreparedReportTableTermItem[]
        error: Error | null
    }>(
        () => {
            try {
                return {
                    resolvedTerms:
                        terms ?
                            buildProvidedTerms(terms)
                        :   buildTermsFromColumns(
                                ensureNonEmptyValue(reportKind, 'reportKind'),
                                ensureNonEmptyValue(sectionTitle, 'sectionTitle'),
                                columns ?? [],
                                resolvedLocale
                            ),
                    error: null
                }
            } catch (error) {
                return {
                    resolvedTerms: [],
                    error: normalizeErrorLike(error, 'Unknown report terms block error.', {
                        source: 'report-table-terms-block',
                        domain: 'ui_section',
                        owner: 'report-table-terms-block',
                        expected: 'Terms block should resolve tooltip and description for every requested column.',
                        requiredAction: 'Add the missing shared term tooltip or pass explicit terms for the local block.',
                        extra: {
                            reportKind,
                            sectionTitle,
                            columns: columns ?? null,
                            title
                        }
                    })
                }
            }
        },
        [columns, reportKind, resolvedLocale, sectionTitle, terms, title]
    )
    const { resolvedTerms, error: termsBlockError } = preparedTermsState
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
    const gridClassName = resolvedTerms.length === 1 ? `${cls.grid} ${cls.gridSingleColumn}` : cls.grid
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

    useEffect(() => {
        if (!termsBlockError) {
            return
        }

        logError(termsBlockError, undefined, {
            source: 'report-table-terms-block',
            domain: 'ui_section',
            severity: 'warning',
            extra: {
                reportKind,
                sectionTitle,
                columns: columns ?? null,
                title
            }
        })
    }, [columns, reportKind, sectionTitle, termsBlockError, title])
    usePageLocalIssueReporter(
        termsBlockError ?
            {
                id: `report-table-terms-block:${reportKind ?? 'custom'}:${sectionTitle ?? title}`,
                title: 'Ошибка блока терминов таблицы',
                description: buildReportTermsIssueDescription(termsBlockError, {
                    reportKind,
                    sectionTitle,
                    blockTitle: title,
                    locale: resolvedLocale
                })
            }
        :   null
    )

    if (termsBlockError) {
        return null
    }

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

            {!isCollapsed && <div className={gridClassName}>
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
                                        return enhanceDomainTerms ?
                                                renderTermTooltipRichText(
                                                    term.tooltip,
                                                    buildSelfTooltipExclusions(term.key, term.title, selfAliases)
                                                )
                                            :   term.tooltip
                                    }}
                                    type='span'
                                />
                            :   <Text type='span'>{term.title}</Text>}

                            {displayMode === 'inline' && (
                                <Text className={cls.description}>
                                    {enhanceDomainTerms ?
                                        renderTermTooltipRichText(
                                            term.description,
                                            buildSelfTooltipExclusions(term.key, term.title, selfAliases)
                                        )
                                    :   term.description}
                                </Text>
                            )}
                        </div>
                    )
                })}
            </div>}
        </div>
    )
}
