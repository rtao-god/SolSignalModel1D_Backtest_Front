import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import classNames from '@/shared/lib/helpers/classNames'
import {
    ReportActualStatusCard,
    ReportTableTermsBlock,
    ReportViewControls,
    TermTooltip,
    Text,
    buildMegaBucketControlGroup,
    buildMegaMetricControlGroup,
    buildMegaTotalBucketViewControlGroup,
    buildMegaSlModeControlGroup,
    buildMegaTpSlControlGroup,
    buildMegaZonalControlGroup
} from '@/shared/ui'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import type { TableSectionDto } from '@/shared/types/report.types'
import { ReportTableCard } from '@/shared/ui/ReportTableCard'
import {
    enrichTermTooltipDescription,
    renderTermTooltipRichText,
    renderTermTooltipTitle
} from '@/shared/ui/TermTooltip'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import PageError from '@/shared/ui/errors/PageError/ui/PageError'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import { usePolicyBranchMegaReportWithFreshnessQuery } from '@/shared/api/tanstackQueries/policyBranchMega'
import {
    buildPolicyBranchMegaTermReferencesForColumns,
    getPolicyBranchMegaTermOrThrow,
    orderPolicyBranchMegaSectionsOrThrow,
    resolvePolicyBranchMegaTermLocale,
    type PolicyBranchMegaTermLocale,
    type PolicyBranchMegaTermReference
} from '@/shared/utils/policyBranchMegaTerms'
import {
    buildPolicyBranchMegaTableSectionAnchor,
    buildPolicyBranchMegaTermsSectionAnchor,
    buildPolicyBranchMegaTabsFromSections,
    normalizePolicyBranchMegaTitle,
    resolvePolicyBranchMegaBucketFromTitle,
    resolvePolicyBranchMegaBucketFromQuery,
    resolvePolicyBranchMegaBucketLabel,
    resolvePolicyBranchMegaMetricFromQuery,
    resolvePolicyBranchMegaModeFromTitle,
    resolvePolicyBranchMegaSlModeFromQuery,
    resolvePolicyBranchMegaTotalBucketViewFromQuery,
    resolvePolicyBranchMegaTpSlModeFromQuery,
    resolvePolicyBranchMegaZonalModeFromQuery,
    type PolicyBranchMegaBucketMode,
    type PolicyBranchMegaTotalBucketView,
    type PolicyBranchMegaMetricMode,
    type PolicyBranchMegaSlMode,
    type PolicyBranchMegaTpSlMode,
    type PolicyBranchMegaZonalMode
} from '@/shared/utils/policyBranchMegaTabs'
import {
    DEFAULT_REPORT_BUCKET_MODE,
    DEFAULT_REPORT_TOTAL_BUCKET_VIEW,
    DEFAULT_REPORT_METRIC_MODE,
    DEFAULT_REPORT_SL_MODE,
    DEFAULT_REPORT_TP_SL_MODE,
    DEFAULT_REPORT_ZONAL_MODE
} from '@/shared/utils/reportViewCapabilities'
import { resolveReportSourceEndpointOrThrow } from '@/shared/utils/reportSourceEndpoint'
import { buildSelfTooltipExclusions } from '@/shared/ui/ReportTableTermsBlock/ui/ReportTableTermsBlock'
import cls from './PolicyBranchMegaPage.module.scss'
import type { PolicyBranchMegaPageProps } from './types'
import PolicyBranchMegaChartExplorer from './PolicyBranchMegaChartExplorer'
import { buildPolicyBranchMegaChartModelOrThrow } from '../model/policyBranchMegaChartModel'

function buildTableSections(sections: unknown[]): TableSectionDto[] {
    return (sections ?? []).filter(
        (section): section is TableSectionDto =>
            Array.isArray((section as TableSectionDto).columns) && (section as TableSectionDto).columns!.length > 0
    )
}

// Жестко валидируем счетчики сделок, чтобы не скрывать битые числовые поля отчета.
function parseNonNegativeIntOrThrow(raw: string, label: string): number {
    const value = Number(raw)
    if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) {
        throw new Error(`[policy-branch-mega] ${label} must be a non-negative integer. value=${raw}`)
    }

    return value
}

function parseFiniteNumberOrNull(raw: string | undefined): number | null {
    if (raw == null) return null
    const normalized = raw.trim().replace(/\s+/g, '').replace(',', '.')
    if (!normalized) return null
    if (normalized === '—') return null

    const value = Number(normalized)
    if (!Number.isFinite(value)) return null
    return value
}

const MEGA_SL_MODE_COLUMN_NAME = 'SL Mode'
const MEGA_ROW_KEY_SEPARATOR = '\u001e'
const MEGA_PART_TAG_REGEX = /\[PART\s+(\d+)\/(\d+)\]/i
const MEGA_MODE_TAG_REGEX = /\bWITH SL\b|\bNO SL\b/gi
const MEGA_OVERVIEW_DOM_ID = 'policy-branch-mega-overview'
const BUCKET_SPECIFIC_COLUMN_VISIBILITY = new Map<string, Set<PolicyBranchMegaBucketMode>>([
    ['DailyTP%', new Set<PolicyBranchMegaBucketMode>(['daily', 'total'])],
    ['DailySL%', new Set<PolicyBranchMegaBucketMode>(['daily', 'total'])],
    ['DynTP/SL Days', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['DynTP/SL Tr', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['DynTP/SL PnL%', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['StatTP/SL Days', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['StatTP/SL Tr', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['StatTP/SL PnL%', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['DelayedTP%', new Set<PolicyBranchMegaBucketMode>(['delayed', 'total'])],
    ['DelayedSL%', new Set<PolicyBranchMegaBucketMode>(['delayed', 'total'])]
])
// Сохранённые mega-отчёты могут прийти в старом порядке, поэтому part 1/2/3
// приводятся к каноническому user-facing порядку до chart/terms/table/export.
const MEGA_CANONICAL_COLUMNS_BY_PART = new Map<number, readonly string[]>([
    [
        1,
        [
            'Policy',
            'Branch',
            'TotalPnl%',
            'TotalPnl$',
            'BucketNow$',
            'Wealth%',
            'Tr',
            'WinRate%',
            'MeanRet%',
            'MaxDD%',
            'MaxDD_NoLiq%',
            'MaxDD_Active%',
            'Sharpe',
            'Sortino',
            'Calmar',
            'CAGR%',
            'StdRet%',
            'DownStd%',
            'MaxDD_Ratio%',
            'Trade%',
            'NoTrade%',
            'RiskDay%',
            'AntiD%',
            'AntiD|Risk%',
            'Days',
            'StartDay',
            'EndDay',
            'StopReason',
            'Miss',
            'DynTP/SL Days',
            'DynTP/SL Tr',
            'DynTP/SL PnL%',
            'StatTP/SL Days',
            'StatTP/SL Tr',
            'StatTP/SL PnL%',
            'DailyTP%',
            'DailySL%',
            'DelayedTP%',
            'DelayedSL%',
            'AvgStake%',
            'AvgStake$',
            'Lev avg/min/max',
            'Lev p50/p90',
            'Cap avg/min/max',
            'Cap p50/p90',
            'CapAp',
            'CapSk',
            'Exposure% (avg/p50/p90/p99/max)',
            'HighExposureTr% (>=20/50)',
            'Long%',
            'Short%'
        ]
    ],
    [
        2,
        [
            'Policy',
            'Branch',
            'HadLiq',
            'RealLiq',
            'AccRuin',
            'BalDead',
            'BalMin%',
            'Recovered',
            'RecovDays',
            'RecovSignals',
            'ReqGain%',
            'Time<35%',
            'OnExch$',
            'Withdrawn$',
            'StartCap$',
            'EODExit_n',
            'EODExit%',
            'EODExit$',
            'EODExit_AvgRet%',
            'LiqBeforeSL_n',
            'LiqBeforeSL_BadSL_n',
            'LiqBeforeSL_Same1m_n',
            'LiqBeforeSL$',
            'DD70_Min%',
            'DD70_Recov',
            'DD70_RecovDays',
            'DD70_n'
        ]
    ],
    [
        3,
        [
            'Policy',
            'Branch',
            'HorizonDays',
            'AvgDay%',
            'AvgWeek%',
            'AvgMonth%',
            'AvgYear%',
            'Long n',
            'Short n',
            'Long $',
            'Short $',
            'AvgLong%',
            'AvgShort%',
            'inv_liq_mismatch',
            'minutes_anomaly'
        ]
    ]
])

function isMegaColumnVisibleForBucket(column: string, bucket: PolicyBranchMegaBucketMode): boolean {
    const allowedBuckets = BUCKET_SPECIFIC_COLUMN_VISIBILITY.get(column)
    if (!allowedBuckets) {
        return true
    }

    return allowedBuckets.has(bucket)
}

function filterMegaSectionColumnsByBucketOrThrow(
    section: TableSectionDto,
    bucket: PolicyBranchMegaBucketMode
): TableSectionDto {
    const columns = section.columns ?? []
    if (columns.length === 0) {
        throw new Error('[policy-branch-mega] cannot filter section columns by bucket: columns are empty.')
    }

    const visibleIndexes: number[] = []
    const visibleColumns: string[] = []

    columns.forEach((column, columnIndex) => {
        if (isMegaColumnVisibleForBucket(column, bucket)) {
            visibleIndexes.push(columnIndex)
            visibleColumns.push(column)
        }
    })

    if (visibleColumns.length === 0) {
        throw new Error(
            `[policy-branch-mega] section has no visible columns after bucket filter. section=${section.title ?? 'n/a'}, bucket=${bucket}.`
        )
    }

    const rows = section.rows ?? []
    const nextRows = rows.map((row, rowIndex) => {
        if (!Array.isArray(row) || row.length < columns.length) {
            throw new Error(
                `[policy-branch-mega] malformed row while filtering bucket columns. section=${section.title ?? 'n/a'}, row=${rowIndex}.`
            )
        }

        return visibleIndexes.map(index => String(row[index] ?? ''))
    })

    return {
        ...section,
        columns: visibleColumns,
        rows: nextRows
    }
}

function filterMegaSectionsColumnsByBucketOrThrow(
    sections: TableSectionDto[],
    bucket: PolicyBranchMegaBucketMode
): TableSectionDto[] {
    if (!sections || sections.length === 0) {
        throw new Error('[policy-branch-mega] cannot filter sections columns by bucket: source list is empty.')
    }

    return sections.map(section => filterMegaSectionColumnsByBucketOrThrow(section, bucket))
}

function resolveMegaSlModeLabelForSectionOrThrow(section: TableSectionDto): string {
    const metadata = section.metadata
    if (metadata?.kind === 'policy-branch-mega') {
        if (!metadata.mode) {
            throw new Error(
                `[policy-branch-mega] section metadata.mode is missing while building "${MEGA_SL_MODE_COLUMN_NAME}" column. title=${section.title ?? 'n/a'}.`
            )
        }

        if (metadata.mode === 'with-sl') return 'WITH SL'
        if (metadata.mode === 'no-sl') return 'NO SL'

        throw new Error(
            `[policy-branch-mega] unsupported metadata.mode value while building "${MEGA_SL_MODE_COLUMN_NAME}" column. title=${section.title ?? 'n/a'}, mode=${String(metadata.mode)}.`
        )
    }

    const modeFromTitle = resolvePolicyBranchMegaModeFromTitle(section.title)
    if (modeFromTitle === 'with-sl') return 'WITH SL'
    if (modeFromTitle === 'no-sl') return 'NO SL'

    throw new Error(
        `[policy-branch-mega] cannot resolve section mode for "${MEGA_SL_MODE_COLUMN_NAME}" column. title=${section.title ?? 'n/a'}.`
    )
}

function buildMegaRowKey(policy: string, branch: string, slModeLabel: string | null): string {
    if (slModeLabel === null) {
        return `${policy}${MEGA_ROW_KEY_SEPARATOR}${branch}`
    }

    return `${policy}${MEGA_ROW_KEY_SEPARATOR}${branch}${MEGA_ROW_KEY_SEPARATOR}${slModeLabel}`
}

function resolveMegaPartNumberFromTitleOrThrow(title: string | undefined): number {
    const normalized = normalizePolicyBranchMegaTitle(title)
    if (!normalized) {
        throw new Error('[policy-branch-mega] section title is empty while resolving part number.')
    }

    const match = normalized.match(MEGA_PART_TAG_REGEX)
    if (!match?.[1] || !match[2]) {
        throw new Error(`[policy-branch-mega] [PART x/y] tag is missing in section title: ${normalized}.`)
    }

    const part = Number(match[1])
    const total = Number(match[2])
    if (!Number.isInteger(part) || !Number.isInteger(total) || part < 1 || total < 1 || part > total) {
        throw new Error(`[policy-branch-mega] invalid part tag values: ${normalized}.`)
    }

    return part
}

function resolveMegaPartNumberFromSectionOrThrow(section: TableSectionDto): number {
    const metadataPart =
        section.metadata?.kind === 'policy-branch-mega' && Number.isInteger(section.metadata.part) ?
            section.metadata.part
        :   null
    if (typeof metadataPart === 'number' && metadataPart > 0) {
        return metadataPart
    }

    return resolveMegaPartNumberFromTitleOrThrow(section.title)
}

function reorderMegaSectionColumnsOrThrow(section: TableSectionDto): TableSectionDto {
    const columns = section.columns ?? []
    if (columns.length === 0) {
        throw new Error('[policy-branch-mega] cannot reorder mega section columns: columns are empty.')
    }

    const part = resolveMegaPartNumberFromSectionOrThrow(section)
    if (part === 4) {
        return section
    }

    const canonicalColumns = MEGA_CANONICAL_COLUMNS_BY_PART.get(part)
    if (!canonicalColumns) {
        throw new Error(
            `[policy-branch-mega] unsupported section part while reordering columns. part=${part}, title=${section.title ?? 'n/a'}.`
        )
    }

    const seenColumns = new Set<string>()
    columns.forEach(column => {
        if (seenColumns.has(column)) {
            throw new Error(
                `[policy-branch-mega] duplicate column detected while reordering section. part=${part}, title=${section.title ?? 'n/a'}, column=${column}.`
            )
        }

        seenColumns.add(column)
    })

    const orderedColumns = [
        'Policy',
        'Branch',
        ...(columns.includes(MEGA_SL_MODE_COLUMN_NAME) ? [MEGA_SL_MODE_COLUMN_NAME] : []),
        ...canonicalColumns.filter(column => column !== 'Policy' && column !== 'Branch' && columns.includes(column))
    ]

    const unexpectedColumns = columns.filter(column => !orderedColumns.includes(column))
    if (unexpectedColumns.length > 0) {
        throw new Error(
            `[policy-branch-mega] unexpected columns found while reordering section. part=${part}, title=${section.title ?? 'n/a'}, columns=${unexpectedColumns.join(', ')}.`
        )
    }

    const columnIndexByName = new Map(columns.map((column, index) => [column, index]))
    const rows = section.rows ?? []
    const nextRows = rows.map((row, rowIndex) => {
        if (!Array.isArray(row) || row.length < columns.length) {
            throw new Error(
                `[policy-branch-mega] malformed row while reordering section columns. part=${part}, title=${section.title ?? 'n/a'}, row=${rowIndex}.`
            )
        }

        return orderedColumns.map(column => String(row[columnIndexByName.get(column)!] ?? ''))
    })

    const nextSection: TableSectionDto = {
        ...section,
        columns: orderedColumns,
        rows: nextRows
    }

    if (Array.isArray(section.columnKeys) && section.columnKeys.length >= columns.length) {
        nextSection.columnKeys = orderedColumns.map(column => String(section.columnKeys![columnIndexByName.get(column)!] ?? column))
    }

    return nextSection
}

function reorderMegaSectionsColumnsOrThrow(sections: TableSectionDto[]): TableSectionDto[] {
    if (!sections || sections.length === 0) {
        throw new Error('[policy-branch-mega] cannot reorder mega section columns: source list is empty.')
    }

    return sections.map(section => reorderMegaSectionColumnsOrThrow(section))
}

function resolveMergedMegaTitleForPartOrThrow(partSections: TableSectionDto[], slMode: PolicyBranchMegaSlMode): string {
    const title = normalizePolicyBranchMegaTitle(partSections[0]?.title)
    if (!title) {
        throw new Error('[policy-branch-mega] merged part title is empty.')
    }

    if (slMode !== 'all') {
        return title
    }

    return title
        .replace(MEGA_MODE_TAG_REGEX, 'WITH SL + NO SL')
        .replace(/\s{2,}/g, ' ')
        .trim()
}

function resolveExpectedSlModeLabelOrThrow(mode: PolicyBranchMegaSlMode): 'WITH SL' | 'NO SL' {
    if (mode === 'with-sl') return 'WITH SL'
    if (mode === 'no-sl') return 'NO SL'
    throw new Error(`[policy-branch-mega] strict sl mode label cannot be resolved for mode=${mode}.`)
}

function ensurePartSectionsMatchSelectedSlModeOrThrow(
    partSections: TableSectionDto[],
    slMode: PolicyBranchMegaSlMode
): TableSectionDto[] {
    if (slMode === 'all') {
        return partSections
    }

    const expectedLabel = resolveExpectedSlModeLabelOrThrow(slMode)
    const matchedSections: TableSectionDto[] = []
    const mismatchedTitles: string[] = []

    for (const section of partSections) {
        const actualLabel = resolveMegaSlModeLabelForSectionOrThrow(section)
        if (actualLabel === expectedLabel) {
            matchedSections.push(section)
            continue
        }

        mismatchedTitles.push(normalizePolicyBranchMegaTitle(section.title) || 'n/a')
    }

    if (matchedSections.length === 0) {
        throw new Error(
            `[policy-branch-mega] no part sections match selected slmode=${slMode}. expectedLabel=${expectedLabel}.`
        )
    }

    if (mismatchedTitles.length > 0) {
        const sample = mismatchedTitles.slice(0, 4).join(' | ')
        throw new Error(
            `[policy-branch-mega] mixed slmode payload detected inside merged part. selected=${slMode}, expectedLabel=${expectedLabel}, mismatchedTitles=${sample}.`
        )
    }

    return matchedSections
}

function resolveMergedMegaDescriptionForPart(
    part: number,
    slMode: PolicyBranchMegaSlMode,
    translate: (key: string, options?: Record<string, unknown>) => string
): string {
    const modePrefix =
        slMode === 'with-sl' ? translate('policyBranchMega.page.table.modePrefix.withSl')
        : slMode === 'no-sl' ? translate('policyBranchMega.page.table.modePrefix.noSl')
        : translate('policyBranchMega.page.table.modePrefix.all')

    if (part === 1) {
        return `${modePrefix}${translate('policyBranchMega.page.table.part1Description')}`
    }

    if (part === 2) {
        return `${modePrefix}${translate('policyBranchMega.page.table.part2Description')}`
    }

    if (part === 3) {
        return `${modePrefix}${translate('policyBranchMega.page.table.part3Description')}`
    }

    if (part === 4) {
        return `${modePrefix}${translate('policyBranchMega.page.table.part4Description')}`
    }

    if (slMode === 'all') return `${modePrefix}${translate('policyBranchMega.page.table.mergedAllDescription')}`
    return `${modePrefix}${translate('policyBranchMega.page.table.mergedSelectedDescription')}`
}

function mergePolicyBranchMegaSectionsForPartOrThrow(
    partSections: TableSectionDto[],
    slMode: PolicyBranchMegaSlMode
): TableSectionDto {
    if (!partSections || partSections.length === 0) {
        throw new Error('[policy-branch-mega] cannot merge part sections: source list is empty.')
    }

    const scopedSections = ensurePartSectionsMatchSelectedSlModeOrThrow(partSections, slMode)
    const includeSlModeColumn = slMode === 'all'
    const mergedColumns: string[] = []
    const mergedColumnSet = new Set<string>()
    const mergedRowsByKey = new Map<string, Map<string, unknown>>()
    const rowOrder: string[] = []

    for (const [sectionIndex, section] of scopedSections.entries()) {
        const columns = section.columns ?? []
        const rows = section.rows ?? []
        if (columns.length === 0) {
            throw new Error(
                `[policy-branch-mega] section columns are empty while merging part. section=${section.title ?? 'n/a'}, index=${sectionIndex}.`
            )
        }

        const policyIdx = columns.indexOf('Policy')
        const branchIdx = columns.indexOf('Branch')
        if (policyIdx < 0 || branchIdx < 0) {
            throw new Error(
                `[policy-branch-mega] Policy/Branch columns are required for part merge. section=${section.title ?? 'n/a'}, index=${sectionIndex}.`
            )
        }

        const modeLabel = includeSlModeColumn ? resolveMegaSlModeLabelForSectionOrThrow(section) : null
        const sectionColumns = [...columns]
        if (includeSlModeColumn && !sectionColumns.includes(MEGA_SL_MODE_COLUMN_NAME)) {
            sectionColumns.splice(branchIdx + 1, 0, MEGA_SL_MODE_COLUMN_NAME)
        }

        for (const column of sectionColumns) {
            if (!mergedColumnSet.has(column)) {
                mergedColumnSet.add(column)
                mergedColumns.push(column)
            }
        }

        for (const [rowIndex, row] of rows.entries()) {
            if (!Array.isArray(row) || row.length < columns.length) {
                throw new Error(
                    `[policy-branch-mega] malformed row while merging part sections. section=${section.title ?? 'n/a'}, row=${rowIndex}.`
                )
            }

            const policy = String(row[policyIdx] ?? '')
            const branch = String(row[branchIdx] ?? '')
            if (!policy || !branch) {
                throw new Error(
                    `[policy-branch-mega] empty Policy/Branch while merging part sections. section=${section.title ?? 'n/a'}, row=${rowIndex}.`
                )
            }

            const rowKey = buildMegaRowKey(policy, branch, modeLabel)
            let mergedRow = mergedRowsByKey.get(rowKey)
            if (!mergedRow) {
                mergedRow = new Map<string, unknown>()
                mergedRowsByKey.set(rowKey, mergedRow)
                rowOrder.push(rowKey)
            }

            const sectionValueByColumn = new Map<string, unknown>()
            columns.forEach((column, columnIndex) => {
                sectionValueByColumn.set(column, row[columnIndex])
            })

            if (includeSlModeColumn) {
                sectionValueByColumn.set(MEGA_SL_MODE_COLUMN_NAME, modeLabel)
            }

            for (const column of sectionColumns) {
                if (!sectionValueByColumn.has(column)) {
                    throw new Error(
                        `[policy-branch-mega] section column value is missing during part merge. section=${section.title ?? 'n/a'}, row=${rowIndex}, column=${column}.`
                    )
                }

                const nextValue = sectionValueByColumn.get(column)
                const hasPrevValue = mergedRow.has(column)
                const prevValue = mergedRow.get(column)
                if (hasPrevValue && String(prevValue ?? '') !== String(nextValue ?? '')) {
                    throw new Error(
                        `[policy-branch-mega] conflicting merged part value detected. rowKey=${rowKey}, column=${column}, prev=${String(prevValue ?? '')}, next=${String(nextValue ?? '')}.`
                    )
                }

                mergedRow.set(column, nextValue)
            }
        }
    }

    const mergedRows = rowOrder.map((rowKey, rowIndex) => {
        const rowValues = mergedRowsByKey.get(rowKey)
        if (!rowValues) {
            throw new Error(`[policy-branch-mega] merged part row not found by key. rowKey=${rowKey}, row=${rowIndex}.`)
        }

        return mergedColumns.map(column => {
            if (!rowValues.has(column)) {
                throw new Error(
                    `[policy-branch-mega] merged part row is missing required column. rowKey=${rowKey}, column=${column}, row=${rowIndex}.`
                )
            }

            return String(rowValues.get(column) ?? '')
        })
    })

    return {
        ...scopedSections[0],
        title: resolveMergedMegaTitleForPartOrThrow(scopedSections, slMode),
        columns: mergedColumns,
        rows: mergedRows
    }
}

function mergePolicyBranchMegaSectionsByPartOrThrow(
    sections: TableSectionDto[],
    slMode: PolicyBranchMegaSlMode
): TableSectionDto[] {
    if (!sections || sections.length === 0) {
        throw new Error('[policy-branch-mega] cannot merge sections by part: source list is empty.')
    }

    const byPart = new Map<number, TableSectionDto[]>()
    for (const section of sections) {
        const part = resolveMegaPartNumberFromTitleOrThrow(section.title)
        const list = byPart.get(part) ?? []
        list.push(section)
        byPart.set(part, list)
    }

    const orderedParts = Array.from(byPart.keys()).sort((a, b) => a - b)
    if (orderedParts.length === 0) {
        throw new Error('[policy-branch-mega] no parts found after grouping sections.')
    }

    return orderedParts.map(part => {
        const partSections = byPart.get(part)
        if (!partSections || partSections.length === 0) {
            throw new Error(`[policy-branch-mega] grouped part sections are empty. part=${part}.`)
        }

        return mergePolicyBranchMegaSectionsForPartOrThrow(partSections, slMode)
    })
}

function resolveMegaBucketModeFromSectionOrThrow(section: TableSectionDto): PolicyBranchMegaBucketMode {
    const metadataBucket = section.metadata?.kind === 'policy-branch-mega' ? (section.metadata.bucket ?? null) : null
    if (metadataBucket === 'daily' || metadataBucket === 'intraday' || metadataBucket === 'delayed') {
        return metadataBucket
    }
    if (metadataBucket === 'total-aggregate') {
        return 'total'
    }

    const bucketFromTitle = resolvePolicyBranchMegaBucketFromTitle(section.title)
    if (bucketFromTitle) {
        return bucketFromTitle
    }

    throw new Error(`[policy-branch-mega] cannot resolve section bucket. title=${section.title ?? 'n/a'}.`)
}

function resolveMegaBucketOrder(bucket: PolicyBranchMegaBucketMode): number {
    if (bucket === 'daily') return 0
    if (bucket === 'intraday') return 1
    if (bucket === 'delayed') return 2
    return 3
}

function mergePolicyBranchMegaSectionsByBucketAndPartOrThrow(
    sections: TableSectionDto[],
    slMode: PolicyBranchMegaSlMode
): TableSectionDto[] {
    if (!sections || sections.length === 0) {
        throw new Error('[policy-branch-mega] cannot merge sections by bucket and part: source list is empty.')
    }

    const byBucketAndPart = new Map<string, { bucket: PolicyBranchMegaBucketMode; part: number; sections: TableSectionDto[] }>()

    for (const section of sections) {
        const bucket = resolveMegaBucketModeFromSectionOrThrow(section)
        if (bucket === 'total') {
            throw new Error('[policy-branch-mega] separate all-buckets merge received total bucket section.')
        }

        const part = resolveMegaPartNumberFromTitleOrThrow(section.title)
        const key = `${bucket}:${part}`
        const entry = byBucketAndPart.get(key) ?? { bucket, part, sections: [] as TableSectionDto[] }
        entry.sections.push(section)
        byBucketAndPart.set(key, entry)
    }

    const orderedGroups = Array.from(byBucketAndPart.values()).sort((a, b) => {
        const bucketOrder = resolveMegaBucketOrder(a.bucket) - resolveMegaBucketOrder(b.bucket)
        if (bucketOrder !== 0) {
            return bucketOrder
        }

        return a.part - b.part
    })

    return orderedGroups.map(group => mergePolicyBranchMegaSectionsForPartOrThrow(group.sections, slMode))
}

function buildPolicyBranchMegaSectionTermsOrThrow(section: TableSectionDto) {
    const columns = section.columns ?? []
    if (columns.length === 0) {
        throw new Error('[policy-branch-mega] cannot build section terms: columns list is empty.')
    }

    return buildPolicyBranchMegaTermReferencesForColumns(columns)
}

function renderPolicyBranchMegaTermTooltip(termKey: string, termTitle: string, locale: PolicyBranchMegaTermLocale) {
    const term = getPolicyBranchMegaTermOrThrow(termKey, {
        tooltipMode: 'description',
        locale
    })

    return renderTermTooltipRichText(term.tooltip, {
        ...buildSelfTooltipExclusions(termKey, term.title)
    })
}

// Нормализуем плейсхолдеры только для no-data метрик; формат SL-колонок приходит из backend DTO.
function applyNoDataMarkersToMegaSectionsOrThrow(sections: TableSectionDto[], noDataLabel: string): TableSectionDto[] {
    if (!sections || sections.length === 0) return sections

    const replacements: Array<{
        section: string
        rowIndex: number
        policy: string
        branch: string
        column: string
    }> = []

    const nextSections = sections.map(section => {
        const columns = section.columns ?? []
        const rows = section.rows ?? []

        const policyIdx = columns.indexOf('Policy')
        const branchIdx = columns.indexOf('Branch')
        const totalTradesIdx = columns.indexOf('Tr')
        const totalPnlIdx = columns.indexOf('TotalPnl%')
        const dynTradesIdx = columns.indexOf('DynTP/SL Tr')
        const dynPnlIdx = columns.indexOf('DynTP/SL PnL%')
        const statTradesIdx = columns.indexOf('StatTP/SL Tr')
        const statPnlIdx = columns.indexOf('StatTP/SL PnL%')

        if (policyIdx < 0 || branchIdx < 0 || totalTradesIdx < 0 || totalPnlIdx < 0) {
            return section
        }

        const nextRows = rows.map((row, rowIndex) => {
            const requiredIdx = Math.max(policyIdx, branchIdx, totalTradesIdx, totalPnlIdx)
            if (!row || row.length <= requiredIdx) {
                throw new Error(
                    `[policy-branch-mega] malformed row for no-data transform. section=${section.title ?? 'n/a'}, row=${rowIndex}.`
                )
            }

            const policy = row[policyIdx] ?? ''
            const branch = row[branchIdx] ?? ''
            if (!policy || !branch) {
                throw new Error(
                    `[policy-branch-mega] empty Policy/Branch in no-data transform. section=${section.title ?? 'n/a'}, row=${rowIndex}.`
                )
            }

            const nextRow = [...row]

            const totalTrades = parseNonNegativeIntOrThrow(nextRow[totalTradesIdx] ?? '', 'total.trades')
            if (totalTrades === 0) {
                const totalPnlValue = parseFiniteNumberOrNull(nextRow[totalPnlIdx])
                if (totalPnlValue === null || Math.abs(totalPnlValue) <= 1e-12) {
                    nextRow[totalPnlIdx] = noDataLabel
                    replacements.push({
                        section: section.title ?? 'n/a',
                        rowIndex,
                        policy,
                        branch,
                        column: 'TotalPnl%'
                    })
                } else {
                    throw new Error(
                        `[policy-branch-mega] total pnl must be zero/empty when trades are absent. section=${section.title ?? 'n/a'}, row=${rowIndex}, policy=${policy}, branch=${branch}, value=${nextRow[totalPnlIdx]}.`
                    )
                }
            }

            if (dynTradesIdx >= 0 && dynPnlIdx >= 0) {
                const dynTrades = parseNonNegativeIntOrThrow(nextRow[dynTradesIdx] ?? '', 'dynamic.trades')
                if (dynTrades === 0) {
                    const dynPnlValue = parseFiniteNumberOrNull(nextRow[dynPnlIdx])
                    if (dynPnlValue === null || Math.abs(dynPnlValue) <= 1e-12) {
                        nextRow[dynPnlIdx] = noDataLabel
                        replacements.push({
                            section: section.title ?? 'n/a',
                            rowIndex,
                            policy,
                            branch,
                            column: 'DynTP/SL PnL%'
                        })
                    } else {
                        throw new Error(
                            `[policy-branch-mega] dynamic pnl must be zero/empty when dynamic trades are absent. section=${section.title ?? 'n/a'}, row=${rowIndex}, policy=${policy}, branch=${branch}, value=${nextRow[dynPnlIdx]}.`
                        )
                    }
                }
            }

            if (statTradesIdx >= 0 && statPnlIdx >= 0) {
                const statTrades = parseNonNegativeIntOrThrow(nextRow[statTradesIdx] ?? '', 'static.trades')
                if (statTrades === 0) {
                    const statPnlValue = parseFiniteNumberOrNull(nextRow[statPnlIdx])
                    if (statPnlValue === null || Math.abs(statPnlValue) <= 1e-12) {
                        nextRow[statPnlIdx] = noDataLabel
                        replacements.push({
                            section: section.title ?? 'n/a',
                            rowIndex,
                            policy,
                            branch,
                            column: 'StatTP/SL PnL%'
                        })
                    } else {
                        throw new Error(
                            `[policy-branch-mega] static pnl must be zero/empty when static trades are absent. section=${section.title ?? 'n/a'}, row=${rowIndex}, policy=${policy}, branch=${branch}, value=${nextRow[statPnlIdx]}.`
                        )
                    }
                }
            }

            return nextRow
        })

        return {
            ...section,
            rows: nextRows
        }
    })

    if (replacements.length > 0) {
        console.error('[policy-branch-mega] no-data placeholders were normalized.', {
            replacementsCount: replacements.length,
            sample: replacements.slice(0, 12)
        })
    }

    return nextSections
}

export default function PolicyBranchMegaPage({ className }: PolicyBranchMegaPageProps) {
    const { t, i18n } = useTranslation('reports')
    const [searchParams, setSearchParams] = useSearchParams()
    const [displayMode, setDisplayMode] = useState<'table' | 'chart'>('table')

    const bucketState = useMemo(() => {
        try {
            const bucket = resolvePolicyBranchMegaBucketFromQuery(
                searchParams.get('bucket'),
                DEFAULT_REPORT_BUCKET_MODE
            )
            return { value: bucket, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse policy branch mega bucket query.')
            return { value: DEFAULT_REPORT_BUCKET_MODE, error: safeError }
        }
    }, [searchParams])

    const bucketViewState = useMemo(() => {
        try {
            const bucketView = resolvePolicyBranchMegaTotalBucketViewFromQuery(
                searchParams.get('bucketview'),
                DEFAULT_REPORT_TOTAL_BUCKET_VIEW
            )
            return { value: bucketView, error: null as Error | null }
        } catch (err) {
            const safeError =
                err instanceof Error ? err : new Error('Failed to parse policy branch mega bucketview query.')
            return { value: DEFAULT_REPORT_TOTAL_BUCKET_VIEW, error: safeError }
        }
    }, [searchParams])

    const metricState = useMemo(() => {
        try {
            const metric = resolvePolicyBranchMegaMetricFromQuery(
                searchParams.get('metric'),
                DEFAULT_REPORT_METRIC_MODE
            )
            return { value: metric, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse policy branch mega metric query.')
            return { value: DEFAULT_REPORT_METRIC_MODE, error: safeError }
        }
    }, [searchParams])

    const tpSlState = useMemo(() => {
        try {
            const mode = resolvePolicyBranchMegaTpSlModeFromQuery(searchParams.get('tpsl'), DEFAULT_REPORT_TP_SL_MODE)
            return { value: mode, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse policy branch mega tpsl query.')
            return { value: DEFAULT_REPORT_TP_SL_MODE, error: safeError }
        }
    }, [searchParams])

    const slModeState = useMemo(() => {
        try {
            const mode = resolvePolicyBranchMegaSlModeFromQuery(searchParams.get('slmode'), DEFAULT_REPORT_SL_MODE)
            return { value: mode, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse policy branch mega slmode query.')
            return { value: DEFAULT_REPORT_SL_MODE, error: safeError }
        }
    }, [searchParams])

    const zonalState = useMemo(() => {
        try {
            const mode = resolvePolicyBranchMegaZonalModeFromQuery(searchParams.get('zonal'), DEFAULT_REPORT_ZONAL_MODE)
            return { value: mode, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse policy branch mega zonal query.')
            return { value: DEFAULT_REPORT_ZONAL_MODE, error: safeError }
        }
    }, [searchParams])

    const policyBranchMegaArgs = useMemo(
        () => ({
            bucket: bucketState.value,
            bucketView: bucketViewState.value,
            metric: metricState.value,
            tpSlMode: tpSlState.value,
            slMode: slModeState.value,
            zonalMode: zonalState.value
        }),
        [
            bucketState.value,
            bucketViewState.value,
            metricState.value,
            slModeState.value,
            tpSlState.value,
            zonalState.value
        ]
    )
    const { data, isError, error, refetch } = usePolicyBranchMegaReportWithFreshnessQuery(policyBranchMegaArgs)
    const report = data?.report ?? null
    const freshness = data?.freshness ?? null
    const reportCapabilities = data?.capabilities ?? null
    const resolvedQuery = data?.resolvedQuery ?? null
    const termsLocale = useMemo(() => resolvePolicyBranchMegaTermLocale(i18n.language), [i18n.language])

    const tableSections = useMemo(() => buildTableSections(report?.sections ?? []), [report])

    const resolvedSections = useMemo(() => {
        if (!report) return { sections: [] as TableSectionDto[], error: null as Error | null }

        try {
            return {
                sections: orderPolicyBranchMegaSectionsOrThrow(tableSections),
                error: null
            }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse policy branch mega sections.')
            return {
                sections: [] as TableSectionDto[],
                error: safeError
            }
        }
    }, [report, tableSections])

    const effectiveSelection = useMemo(
        () => ({
            bucket: resolvedQuery?.bucket ?? bucketState.value,
            bucketView: resolvedQuery?.bucketView ?? bucketViewState.value,
            metric: resolvedQuery?.metric ?? metricState.value,
            tpSlMode: resolvedQuery?.tpSlMode ?? tpSlState.value,
            slMode: resolvedQuery?.slMode ?? slModeState.value,
            zonalMode: resolvedQuery?.zonalMode ?? zonalState.value
        }),
        [
            bucketState.value,
            bucketViewState.value,
            metricState.value,
            resolvedQuery,
            slModeState.value,
            tpSlState.value,
            zonalState.value
        ]
    )

    const isSeparateAllBucketsSelection =
        effectiveSelection.bucket === 'total' && effectiveSelection.bucketView === 'separate'
    const isChartSupported = !isSeparateAllBucketsSelection
    const effectiveDisplayMode = isChartSupported ? displayMode : 'table'

    useEffect(() => {
        if (!resolvedQuery) {
            return
        }

        const nextParams = new URLSearchParams(searchParams)
        let changed = false

        const syncParam = (
            key: 'bucket' | 'metric' | 'tpsl' | 'slmode' | 'zonal',
            currentValue: string,
            currentError: Error | null,
            resolvedValue: string
        ) => {
            if (!currentError && currentValue === resolvedValue) {
                return
            }

            nextParams.set(key, resolvedValue)
            changed = true
        }

        const syncOptionalParam = (
            key: 'bucketview',
            currentValue: string,
            currentError: Error | null,
            resolvedValue: string,
            isEnabled: boolean
        ) => {
            if (!isEnabled) {
                if (nextParams.has(key)) {
                    nextParams.delete(key)
                    changed = true
                }

                return
            }

            if (!currentError && currentValue === resolvedValue) {
                return
            }

            nextParams.set(key, resolvedValue)
            changed = true
        }

        syncParam('bucket', bucketState.value, bucketState.error, resolvedQuery.bucket)
        syncOptionalParam(
            'bucketview',
            bucketViewState.value,
            bucketViewState.error,
            resolvedQuery.bucketView,
            resolvedQuery.bucket === 'total'
        )
        syncParam('metric', metricState.value, metricState.error, resolvedQuery.metric)
        syncParam('tpsl', tpSlState.value, tpSlState.error, resolvedQuery.tpSlMode)
        syncParam('slmode', slModeState.value, slModeState.error, resolvedQuery.slMode)
        syncParam('zonal', zonalState.value, zonalState.error, resolvedQuery.zonalMode)

        if (changed) {
            setSearchParams(nextParams, { replace: true })
        }
    }, [
        bucketState.error,
        bucketState.value,
        bucketViewState.error,
        bucketViewState.value,
        metricState.error,
        metricState.value,
        resolvedQuery,
        searchParams,
        setSearchParams,
        slModeState.error,
        slModeState.value,
        tpSlState.error,
        tpSlState.value,
        zonalState.error,
        zonalState.value
    ])

    useEffect(() => {
        if (!isChartSupported && displayMode === 'chart') {
            setDisplayMode('table')
        }
    }, [displayMode, isChartSupported])

    const mergedSectionsState = useMemo(() => {
        if (!report) return { sections: [] as TableSectionDto[], error: null as Error | null }
        if (resolvedSections.error) {
            return { sections: [] as TableSectionDto[], error: resolvedSections.error }
        }

        try {
            const noDataAwareSections = applyNoDataMarkersToMegaSectionsOrThrow(
                resolvedSections.sections,
                t('policyBranchMega.page.noDataPlaceholder')
            )
            const mergedSections =
                isSeparateAllBucketsSelection ?
                    mergePolicyBranchMegaSectionsByBucketAndPartOrThrow(
                        noDataAwareSections,
                        effectiveSelection.slMode
                    )
                :   mergePolicyBranchMegaSectionsByPartOrThrow(noDataAwareSections, effectiveSelection.slMode)
            const reorderedSections = reorderMegaSectionsColumnsOrThrow(mergedSections)

            return {
                sections: reorderedSections,
                error: null
            }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to prepare policy branch mega sections.')
            return { sections: [] as TableSectionDto[], error: safeError }
        }
    }, [effectiveSelection.slMode, isSeparateAllBucketsSelection, report, resolvedSections, t])

    const visibleSectionsState = useMemo(() => {
        if (mergedSectionsState.error) {
            return { sections: [] as TableSectionDto[], error: mergedSectionsState.error }
        }
        if (mergedSectionsState.sections.length === 0) {
            return { sections: [] as TableSectionDto[], error: null as Error | null }
        }

        try {
            return {
                sections: filterMegaSectionsColumnsByBucketOrThrow(
                    mergedSectionsState.sections,
                    effectiveSelection.bucket
                ),
                error: null as Error | null
            }
        } catch (err) {
            const safeError =
                err instanceof Error ? err : new Error('Failed to filter policy branch mega visible columns by bucket.')

            return {
                sections: [] as TableSectionDto[],
                error: safeError
            }
        }
    }, [effectiveSelection.bucket, mergedSectionsState.error, mergedSectionsState.sections])

    const chartModelState = useMemo(() => {
        if (!isChartSupported) {
            return { model: null, error: null as Error | null }
        }

        if (visibleSectionsState.error) {
            return { model: null, error: visibleSectionsState.error }
        }

        if (visibleSectionsState.sections.length === 0) {
            return { model: null, error: null as Error | null }
        }

        try {
            return {
                model: buildPolicyBranchMegaChartModelOrThrow(visibleSectionsState.sections),
                error: null as Error | null
            }
        } catch (err) {
            const safeError =
                err instanceof Error ? err : new Error('Failed to build policy branch mega chart model.')

            return {
                model: null,
                error: safeError
            }
        }
    }, [isChartSupported, visibleSectionsState.error, visibleSectionsState.sections])

    const sectionTermsState = useMemo(() => {
        if (effectiveDisplayMode === 'chart' || visibleSectionsState.sections.length === 0) {
            return {
                termsByIndex: [] as PolicyBranchMegaTermReference[][],
                error: null as Error | null
            }
        }

        try {
            return {
                termsByIndex: visibleSectionsState.sections.map(section =>
                    buildPolicyBranchMegaSectionTermsOrThrow(section)
                ),
                error: null as Error | null
            }
        } catch (err) {
            const safeError =
                err instanceof Error ? err : new Error('Failed to build policy branch mega section terms.')
            return {
                termsByIndex: [] as PolicyBranchMegaTermReference[][],
                error: safeError
            }
        }
    }, [effectiveDisplayMode, visibleSectionsState.sections])

    const pageTabs = useMemo(
        () => buildPolicyBranchMegaTabsFromSections(visibleSectionsState.sections),
        [visibleSectionsState.sections]
    )

    // Нужен для hash-навигации из sidebar: поддерживаем и таблицы, и блоки объяснения терминов.
    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections: pageTabs,
        syncHash: true
    })

    const generatedAtState = useMemo(() => {
        if (!report) return { value: null as Date | null, error: null as Error | null }

        if (!report.generatedAtUtc) {
            return {
                value: null,
                error: new Error('[policy-branch-mega] generatedAtUtc is missing.')
            }
        }

        const parsed = new Date(report.generatedAtUtc)
        if (Number.isNaN(parsed.getTime())) {
            return {
                value: null,
                error: new Error(`[policy-branch-mega] generatedAtUtc is invalid: ${report.generatedAtUtc}`)
            }
        }

        return { value: parsed, error: null }
    }, [report])

    const rootClassName = classNames(cls.root, {}, [className ?? ''])

    const renderedColumnTitles = useMemo(() => {
        const uniqueColumns = new Set<string>()

        visibleSectionsState.sections.forEach(section => {
            ;(section.columns ?? []).forEach(column => {
                uniqueColumns.add(column)
            })
        })

        const cachedTitles = new Map<string, ReturnType<typeof renderTermTooltipTitle>>()
        uniqueColumns.forEach(column => {
            cachedTitles.set(
                column,
                renderTermTooltipTitle(column, () => renderPolicyBranchMegaTermTooltip(column, column, termsLocale))
            )
        })

        return cachedTitles
    }, [visibleSectionsState.sections, termsLocale])

    const renderColumnTitle = useCallback(
        (title: string) => {
            const cachedTitle = renderedColumnTitles.get(title)
            if (cachedTitle) {
                return cachedTitle
            }

            return renderTermTooltipTitle(title, () => renderPolicyBranchMegaTermTooltip(title, title, termsLocale))
        },
        [renderedColumnTitles, termsLocale]
    )

    const handleBucketChange = useCallback((next: PolicyBranchMegaBucketMode) => {
        if (next === effectiveSelection.bucket) return
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('bucket', next)
        if (next === 'total') {
            nextParams.set('bucketview', DEFAULT_REPORT_TOTAL_BUCKET_VIEW)
        } else {
            nextParams.delete('bucketview')
        }
        setSearchParams(nextParams, { replace: true })
    }, [effectiveSelection.bucket, searchParams, setSearchParams])

    const handleBucketViewChange = useCallback((next: PolicyBranchMegaTotalBucketView) => {
        if (next === effectiveSelection.bucketView) return
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('bucketview', next)
        setSearchParams(nextParams, { replace: true })
    }, [effectiveSelection.bucketView, searchParams, setSearchParams])

    const handleMetricChange = useCallback((next: PolicyBranchMegaMetricMode) => {
        if (next === effectiveSelection.metric) return
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('metric', next)
        setSearchParams(nextParams, { replace: true })
    }, [effectiveSelection.metric, searchParams, setSearchParams])

    const handleTpSlModeChange = useCallback((next: PolicyBranchMegaTpSlMode) => {
        if (next === effectiveSelection.tpSlMode) return
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('tpsl', next)
        setSearchParams(nextParams, { replace: true })
    }, [effectiveSelection.tpSlMode, searchParams, setSearchParams])

    const handleSlModeChange = useCallback((next: PolicyBranchMegaSlMode) => {
        if (next === effectiveSelection.slMode) return
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('slmode', next)
        setSearchParams(nextParams, { replace: true })
    }, [effectiveSelection.slMode, searchParams, setSearchParams])

    const handleZonalModeChange = useCallback((next: PolicyBranchMegaZonalMode) => {
        if (next === effectiveSelection.zonalMode) return
        const nextParams = new URLSearchParams(searchParams)
        nextParams.set('zonal', next)
        setSearchParams(nextParams, { replace: true })
    }, [effectiveSelection.zonalMode, searchParams, setSearchParams])

    const controlGroups = useMemo(() => {
        const displayGroup = {
            key: 'mega-display',
            label: t('policyBranchMega.page.controls.displayModeLabel'),
            ariaLabel: t('policyBranchMega.page.controls.displayModeAriaLabel'),
            infoTooltip: t('policyBranchMega.page.controls.displayModeTooltip'),
            value: effectiveDisplayMode,
            options:
                isChartSupported ?
                    [
                        {
                            value: 'chart' as const,
                            label: t('policyBranchMega.page.viewMode.chart')
                        },
                        {
                            value: 'table' as const,
                            label: t('policyBranchMega.page.viewMode.table')
                        }
                    ]
                :   [
                        {
                            value: 'table' as const,
                            label: t('policyBranchMega.page.viewMode.table')
                        }
                    ],
            onChange: (next: 'table' | 'chart') => setDisplayMode(next)
        }
        const bucketGroup = buildMegaBucketControlGroup({
            value: effectiveSelection.bucket,
            onChange: handleBucketChange
        })
        const totalBucketViewGroup = buildMegaTotalBucketViewControlGroup({
            value: effectiveSelection.bucketView,
            onChange: handleBucketViewChange
        })
        const metricGroup = buildMegaMetricControlGroup({
            value: effectiveSelection.metric,
            onChange: handleMetricChange
        })
        const tpSlGroup = buildMegaTpSlControlGroup({
            value: effectiveSelection.tpSlMode,
            onChange: handleTpSlModeChange
        })
        const slModeGroup = buildMegaSlModeControlGroup({
            value: effectiveSelection.slMode,
            onChange: handleSlModeChange
        })
        const zonalGroup = buildMegaZonalControlGroup({
            value: effectiveSelection.zonalMode,
            onChange: handleZonalModeChange
        })

        const allowedSlModes =
            reportCapabilities && reportCapabilities.availableSlModes.length > 0 ?
                [
                    ...(reportCapabilities.availableSlModes.includes('with-sl') &&
                    reportCapabilities.availableSlModes.includes('no-sl') ?
                        (['all'] as PolicyBranchMegaSlMode[])
                    :   []),
                    ...reportCapabilities.availableSlModes
                ]
            :   null
        const bucketOptions =
            reportCapabilities && reportCapabilities.availableBuckets.length > 0 ?
                bucketGroup.options.filter(option => reportCapabilities.availableBuckets.includes(option.value))
            :   bucketGroup.options
        const totalBucketViewOptions =
            reportCapabilities && reportCapabilities.availableTotalBucketViews.length > 0 ?
                totalBucketViewGroup.options.filter(option =>
                    reportCapabilities.availableTotalBucketViews.includes(option.value)
                )
            :   totalBucketViewGroup.options

        return [
            displayGroup,
            {
                ...bucketGroup,
                options: bucketOptions
            },
            ...(effectiveSelection.bucket === 'total' ?
                [
                    {
                        ...totalBucketViewGroup,
                        options: totalBucketViewOptions
                    }
                ]
            :   []),
            reportCapabilities && reportCapabilities.availableMetrics.length > 0 ?
                {
                    ...metricGroup,
                    options: metricGroup.options.filter(option =>
                        reportCapabilities.availableMetrics.includes(option.value)
                    )
                }
            :   metricGroup,
            reportCapabilities && reportCapabilities.availableTpSlModes.length > 0 ?
                {
                    ...tpSlGroup,
                    options: tpSlGroup.options.filter(option =>
                        reportCapabilities.availableTpSlModes.includes(option.value)
                    )
                }
            :   tpSlGroup,
            allowedSlModes ?
                {
                    ...slModeGroup,
                    options: slModeGroup.options.filter(option => allowedSlModes.includes(option.value))
                }
            :   slModeGroup,
            reportCapabilities && reportCapabilities.availableZonalModes.length > 0 ?
                {
                    ...zonalGroup,
                    options: zonalGroup.options.filter(option =>
                        reportCapabilities.availableZonalModes.includes(option.value)
                    )
                }
            :   zonalGroup
        ]
    }, [
        effectiveDisplayMode,
        effectiveSelection.bucket,
        effectiveSelection.bucketView,
        effectiveSelection.metric,
        effectiveSelection.slMode,
        effectiveSelection.tpSlMode,
        effectiveSelection.zonalMode,
        handleBucketChange,
        handleBucketViewChange,
        handleMetricChange,
        handleSlModeChange,
        handleTpSlModeChange,
        handleZonalModeChange,
        isChartSupported,
        t,
        reportCapabilities
    ])

    const sourceEndpointState = useMemo(() => {
        try {
            return {
                value: resolveReportSourceEndpointOrThrow(),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to resolve report source endpoint.')
            return {
                value: null as string | null,
                error: safeError
            }
        }
    }, [])

    const renderHeader = (_generatedUtc: Date) => (
        <header className={cls.hero}>
            <div>
                <Text type='h1' className={cls.heroTitle}>
                    {t('policyBranchMega.page.title')}
                </Text>
                <Text className={cls.heroSubtitle}>{t('policyBranchMega.page.subtitle')}</Text>

                <ReportViewControls groups={controlGroups} />
            </div>

            <ReportActualStatusCard
                statusMode={freshness?.sourceMode === 'actual' ? 'actual' : 'debug'}
                statusTitle={
                    freshness?.sourceMode === 'actual' ?
                        t('policyBranchMega.page.status.actualTitle')
                    :   t('policyBranchMega.page.status.debugTitle')
                }
                statusMessage={freshness?.message}
                statusLagMinutes={freshness?.lagSeconds && freshness.lagSeconds > 0 ? freshness.lagSeconds / 60 : null}
                dataSource={sourceEndpointState.value!}
                reportTitle={report!.title}
                reportId={report!.id}
                reportKind={report!.kind}
                generatedAtUtc={report!.generatedAtUtc}
                statusLines={[
                    ...(freshness?.policyBranchMegaId ?
                        [
                            {
                                label: t('policyBranchMega.page.statusLines.policyBranchMegaId'),
                                value: freshness.policyBranchMegaId
                            }
                        ]
                    :   []),
                    ...(freshness?.diagnosticsId ?
                        [
                            {
                                label: t('policyBranchMega.page.statusLines.diagnosticsId'),
                                value: freshness.diagnosticsId
                            }
                        ]
                    :   []),
                    ...(freshness?.policyBranchMegaGeneratedAtUtc ?
                        [
                            {
                                label: t('policyBranchMega.page.statusLines.policyBranchMegaGeneratedAt'),
                                value: freshness.policyBranchMegaGeneratedAtUtc
                            }
                        ]
                    :   []),
                    ...(freshness?.diagnosticsGeneratedAtUtc ?
                        [
                            {
                                label: t('policyBranchMega.page.statusLines.diagnosticsGeneratedAt'),
                                value: freshness.diagnosticsGeneratedAtUtc
                            }
                        ]
                    :   [])
                ]}
            />
        </header>
    )

    let content: JSX.Element | null = null

    if (report) {
        if (generatedAtState.error || !generatedAtState.value) {
            const error =
                generatedAtState.error ?? new Error('[policy-branch-mega] generatedAtUtc is missing after validation.')

            content = (
                <PageError
                    title={t('policyBranchMega.page.errors.invalidGeneratedAt.title')}
                    message={t('policyBranchMega.page.errors.invalidGeneratedAt.message')}
                    error={error}
                    onRetry={refetch}
                />
            )
        } else if (sourceEndpointState.error || !sourceEndpointState.value) {
            const error =
                sourceEndpointState.error ??
                new Error('[policy-branch-mega] report source endpoint is missing after validation.')

            content = (
                <PageError
                    title={t('policyBranchMega.page.errors.invalidSource.title')}
                    message={t('policyBranchMega.page.errors.invalidSource.message')}
                    error={error}
                    onRetry={refetch}
                />
            )
        } else if (bucketState.error && !resolvedQuery) {
            content = (
                <PageError
                    title={t('policyBranchMega.page.errors.bucketViewQuery.title')}
                    message={t('policyBranchMega.page.errors.bucketViewQuery.message')}
                    error={bucketState.error}
                    onRetry={refetch}
                />
            )
        } else if (bucketViewState.error && !resolvedQuery) {
            content = (
                <PageError
                    title={t('policyBranchMega.page.errors.bucketQuery.title')}
                    message={t('policyBranchMega.page.errors.bucketQuery.message')}
                    error={bucketViewState.error}
                    onRetry={refetch}
                />
            )
        } else if (metricState.error && !resolvedQuery) {
            content = (
                <PageError
                    title={t('policyBranchMega.page.errors.metricQuery.title')}
                    message={t('policyBranchMega.page.errors.metricQuery.message')}
                    error={metricState.error}
                    onRetry={refetch}
                />
            )
        } else if (tpSlState.error && !resolvedQuery) {
            content = (
                <PageError
                    title={t('policyBranchMega.page.errors.tpSlQuery.title')}
                    message={t('policyBranchMega.page.errors.tpSlQuery.message')}
                    error={tpSlState.error}
                    onRetry={refetch}
                />
            )
        } else if (slModeState.error && !resolvedQuery) {
            content = (
                <PageError
                    title={t('policyBranchMega.page.errors.slModeQuery.title')}
                    message={t('policyBranchMega.page.errors.slModeQuery.message')}
                    error={slModeState.error}
                    onRetry={refetch}
                />
            )
        } else if (zonalState.error && !resolvedQuery) {
            content = (
                <PageError
                    title={t('policyBranchMega.page.errors.zonalQuery.title')}
                    message={t('policyBranchMega.page.errors.zonalQuery.message')}
                    error={zonalState.error}
                    onRetry={refetch}
                />
            )
        } else if (resolvedSections.error) {
            content = (
                <PageError
                    title={t('policyBranchMega.page.errors.structure.title')}
                    message={t('policyBranchMega.page.errors.structure.message')}
                    error={resolvedSections.error}
                    onRetry={refetch}
                />
            )
        } else if (mergedSectionsState.error) {
            content = (
                <PageError
                    title={t('policyBranchMega.page.errors.sections.title')}
                    message={t('policyBranchMega.page.errors.sections.message')}
                    error={mergedSectionsState.error}
                    onRetry={refetch}
                />
            )
        } else if (effectiveDisplayMode === 'table' && sectionTermsState.error) {
            content = (
                <PageError
                    title={t('policyBranchMega.page.errors.terms.title')}
                    message={t('policyBranchMega.page.errors.terms.message')}
                    error={sectionTermsState.error}
                    onRetry={refetch}
                />
            )
        } else if (visibleSectionsState.error) {
            content = (
                <PageError
                    title={t('policyBranchMega.page.errors.columnsVisibility.title')}
                    message={t('policyBranchMega.page.errors.columnsVisibility.message')}
                    error={visibleSectionsState.error}
                    onRetry={refetch}
                />
            )
        } else if (effectiveDisplayMode === 'chart' && chartModelState.error) {
            content = (
                <PageError
                    title={t('policyBranchMega.page.errors.chartModel.title')}
                    message={t('policyBranchMega.page.errors.chartModel.message')}
                    error={chartModelState.error}
                    onRetry={refetch}
                />
            )
        } else if (resolvedSections.sections.length === 0) {
            content = <Text>{t('policyBranchMega.page.empty')}</Text>
        } else if (mergedSectionsState.sections.length === 0) {
            content = <Text>{t('policyBranchMega.page.emptyFiltered')}</Text>
        } else if (visibleSectionsState.sections.length === 0) {
            content = <Text>{t('policyBranchMega.page.emptyColumns')}</Text>
        } else {
            const generatedUtc = generatedAtState.value

            content = (
                <div className={rootClassName}>
                    {renderHeader(generatedUtc)}

                    <section className={cls.overviewBlock} id={MEGA_OVERVIEW_DOM_ID}>
                        <Text type='h3' className={cls.overviewTitle}>
                            {t('policyBranchMega.page.overview.whatIsReport.title')}
                        </Text>
                        <ul className={cls.overviewList}>
                            <li>{t('policyBranchMega.page.overview.whatIsReport.items.item1')}</li>
                            <li>{t('policyBranchMega.page.overview.whatIsReport.items.item2')}</li>
                            <li>{t('policyBranchMega.page.overview.whatIsReport.items.item3')}</li>
                        </ul>

                        <Text type='h4' className={cls.overviewSubTitle}>
                            {t('policyBranchMega.page.overview.comparison.title')}
                        </Text>
                        <ul className={cls.overviewList}>
                            <li>
                                {renderTermTooltipRichText(t('policyBranchMega.page.overview.comparison.items.policy'))}
                            </li>
                            <li>
                                {renderTermTooltipRichText(t('policyBranchMega.page.overview.comparison.items.branch'))}
                            </li>
                            <li>
                                {renderTermTooltipRichText(t('policyBranchMega.page.overview.comparison.items.slMode'))}
                                <br />
                                {renderTermTooltipRichText(
                                    t('policyBranchMega.page.overview.comparison.items.tpSlMode')
                                )}
                                <br />
                                {renderTermTooltipRichText(t('policyBranchMega.page.overview.comparison.items.zonal'))}
                                <br />
                                {renderTermTooltipRichText(
                                    t('policyBranchMega.page.overview.comparison.items.metricView')
                                )}
                                <br />
                                {renderTermTooltipRichText(t('policyBranchMega.page.overview.comparison.items.bucket'))}
                            </li>
                        </ul>

                        <Text type='h4' className={cls.overviewSubTitle}>
                            {t('policyBranchMega.page.overview.reading.title')}
                        </Text>
                        <ul className={cls.overviewList}>
                            <li>
                                {renderTermTooltipRichText(t('policyBranchMega.page.overview.reading.items.item1'))}
                            </li>
                            <li>
                                {renderTermTooltipRichText(t('policyBranchMega.page.overview.reading.items.item2'))}
                            </li>
                            <li>
                                {renderTermTooltipRichText(t('policyBranchMega.page.overview.reading.items.item3'))}
                            </li>
                        </ul>

                        <Text type='h4' className={cls.overviewSubTitle}>
                            {t('policyBranchMega.page.overview.basics.title')}
                        </Text>
                        <ul className={cls.overviewList}>
                            <li>{renderTermTooltipRichText(t('policyBranchMega.page.overview.basics.items.item1'))}</li>
                            <li>{renderTermTooltipRichText(t('policyBranchMega.page.overview.basics.items.item2'))}</li>
                            <li>{renderTermTooltipRichText(t('policyBranchMega.page.overview.basics.items.item3'))}</li>
                            <li>{renderTermTooltipRichText(t('policyBranchMega.page.overview.basics.items.item4'))}</li>
                            <li>{renderTermTooltipRichText(t('policyBranchMega.page.overview.basics.items.item5'))}</li>
                            <li>{renderTermTooltipRichText(t('policyBranchMega.page.overview.basics.items.item6'))}</li>
                        </ul>

                        <Text type='h4' className={cls.overviewSubTitle}>
                            {t('policyBranchMega.page.overview.simulation.title')}
                        </Text>
                        <ul className={cls.overviewList}>
                            <li>{t('policyBranchMega.page.overview.simulation.items.item1')}</li>
                            <li>
                                {renderTermTooltipRichText(t('policyBranchMega.page.overview.simulation.items.item2'))}
                            </li>
                            <li>{t('policyBranchMega.page.overview.simulation.items.item3')}</li>
                            <li>
                                {t('policyBranchMega.page.overview.simulation.items.item4Prefix')}{' '}
                                <TermTooltip
                                    term='EndOfDay'
                                    description={() =>
                                        enrichTermTooltipDescription(
                                            t('policyBranchMega.page.overview.simulation.endOfDayTooltip'),
                                            { term: 'EndOfDay' }
                                        )
                                    }
                                    type='span'
                                />
                                .
                            </li>
                        </ul>
                    </section>

                    {effectiveDisplayMode === 'chart' ?
                        chartModelState.model && (
                            <PolicyBranchMegaChartExplorer
                                model={chartModelState.model}
                                termsLocale={termsLocale}
                                translate={(key, options) => t(key, options)}
                            />
                        )
                    :   <div className={cls.sectionsGrid}>
                            {visibleSectionsState.sections.map((section, index) => {
                                const part = resolveMegaPartNumberFromTitleOrThrow(section.title)
                                const bucket = resolveMegaBucketModeFromSectionOrThrow(section)
                                const bucketLabel = resolvePolicyBranchMegaBucketLabel(bucket)
                                const tableDomId = buildPolicyBranchMegaTableSectionAnchor(
                                    part,
                                    isSeparateAllBucketsSelection ? bucket : null
                                )
                                const termsDomId = buildPolicyBranchMegaTermsSectionAnchor(
                                    part,
                                    isSeparateAllBucketsSelection ? bucket : null
                                )
                                const sectionTerms = sectionTermsState.termsByIndex[index]
                                if (!sectionTerms || sectionTerms.length === 0) {
                                    throw new Error(
                                        `[policy-branch-mega] section terms are missing after build. part=${part}, index=${index}.`
                                    )
                                }

                                return (
                                    <SectionErrorBoundary
                                        key={`${section.title}-${index}`}
                                        name={`PolicyBranchMega:${section.title ?? index}`}>
                                        <div className={cls.sectionBlock}>
                                            <div id={termsDomId}>
                                                <ReportTableTermsBlock
                                                    terms={sectionTerms.map(term => ({
                                                        key: term.key,
                                                        title: term.title,
                                                        resolveDescription: () => {
                                                            const resolved = getPolicyBranchMegaTermOrThrow(term.key, {
                                                                tooltipMode: 'description',
                                                                locale: termsLocale
                                                            })

                                                            return resolved.description
                                                        }
                                                    }))}
                                                    enhanceDomainTerms
                                                    showTermTitleTooltip={false}
                                                    title={
                                                        isSeparateAllBucketsSelection ?
                                                            `Термины · ${bucketLabel} · часть ${part}`
                                                        :   t('policyBranchMega.page.terms.title', { part })
                                                    }
                                                    subtitle={
                                                        isSeparateAllBucketsSelection ?
                                                            `${bucketLabel} · ${t('policyBranchMega.page.terms.subtitle', { part })}`
                                                        :   t('policyBranchMega.page.terms.subtitle', { part })
                                                    }
                                                    className={cls.termsBlock}
                                                />
                                            </div>

                                            <div id={tableDomId}>
                                                <ReportTableCard
                                                    title={
                                                        normalizePolicyBranchMegaTitle(section.title) ||
                                                        t('policyBranchMega.page.table.titleFallback', { part })
                                                    }
                                                    description={resolveMergedMegaDescriptionForPart(
                                                        part,
                                                        effectiveSelection.slMode,
                                                        (key, options) => t(key, options)
                                                    )}
                                                    columns={section.columns ?? []}
                                                    rows={section.rows ?? []}
                                                    domId={`${tableDomId}-table`}
                                                    renderColumnTitle={renderColumnTitle}
                                                />
                                            </div>
                                        </div>
                                    </SectionErrorBoundary>
                                )
                            })}
                        </div>
                    }

                    {effectiveDisplayMode === 'table' && pageTabs.length > 1 && (
                        <SectionPager
                            sections={pageTabs}
                            currentIndex={currentIndex}
                            canPrev={canPrev}
                            canNext={canNext}
                            onPrev={handlePrev}
                            onNext={handleNext}
                        />
                    )}
                </div>
            )
        }
    }

    return (
        <PageDataBoundary
            isError={isError}
            error={error}
            hasData={Boolean(report)}
            onRetry={refetch}
            errorTitle={t('policyBranchMega.page.errorTitle')}>
            {content}
        </PageDataBoundary>
    )
}
