import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation, useSearchParams } from 'react-router-dom'
import { useQueries } from '@tanstack/react-query'
import { ROUTE_PATH } from '@/app/providers/router/config/consts'
import { AppRoute } from '@/app/providers/router/config/types'
import classNames from '@/shared/lib/helpers/classNames'
import {
    Link,
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
import { scrollToAnchor } from '@/shared/ui/SectionPager/lib/scrollToAnchor'
import type { ReportDocumentDto, TableSectionDto } from '@/shared/types/report.types'
import type { PolicyRowEvaluationMapDto } from '@/shared/types/policyEvaluation.types'
import { ReportTableCard } from '@/shared/ui/ReportTableCard'
import {
    enrichTermTooltipDescription,
    renderTermTooltipRichText,
    renderTermTooltipTitle
} from '@/shared/ui/TermTooltip'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import {
    DEFAULT_POLICY_BRANCH_MEGA_BUCKET_MODE,
    DEFAULT_POLICY_BRANCH_MEGA_METRIC_MODE,
    DEFAULT_POLICY_BRANCH_MEGA_SL_MODE,
    DEFAULT_POLICY_BRANCH_MEGA_TOTAL_BUCKET_VIEW,
    DEFAULT_POLICY_BRANCH_MEGA_TP_SL_MODE,
    DEFAULT_POLICY_BRANCH_MEGA_ZONAL_MODE,
    buildPolicyBranchMegaQueryKey,
    buildPolicyBranchMegaEvaluationQueryKey,
    fetchPolicyBranchMegaEvaluationMap,
    fetchPolicyBranchMegaReport,
    POLICY_BRANCH_MEGA_GC_TIME_MS,
    POLICY_BRANCH_MEGA_STALE_TIME_MS,
    resolvePolicyBranchMegaNeighborParts,
    usePolicyBranchMegaEvaluationQuery,
    usePolicyBranchMegaReportNavQuery,
    usePolicyBranchMegaValidationQuery
} from '@/shared/api/tanstackQueries/policyBranchMega'
import {
    buildPolicyBranchMegaTermReferencesForColumns,
    getPolicyBranchMegaTerm,
    orderPolicyBranchMegaSections,
    resolvePolicyBranchMegaTermLocale,
    type PolicyBranchMegaTermLocale,
    type PolicyBranchMegaTermReference
} from '@/shared/utils/policyBranchMegaTerms'
import {
    buildPolicyBranchMegaSectionEntriesFromAvailableParts,
    buildPolicyBranchMegaTabsFromAvailableParts,
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
    resolvePolicyBranchMegaAnchorTarget,
    type PolicyBranchMegaAnchorSectionKind,
    type PolicyBranchMegaBucketMode,
    type PolicyBranchMegaTotalBucketView,
    type PolicyBranchMegaMetricMode,
    type PolicyBranchMegaSlMode,
    type PolicyBranchMegaTpSlMode,
    type PolicyBranchMegaZonalMode
} from '@/shared/utils/policyBranchMegaTabs'
import { resolveReportSourceEndpoint } from '@/shared/utils/reportSourceEndpoint'
import { buildSelfTooltipExclusions } from '@/shared/ui/ReportTableTermsBlock/model/reportTableTermsBlock'
import { buildBacktestDiagnosticsSearchFromSearchParams } from '@/shared/utils/backtestDiagnosticsQuery'
import {
    normalizePolicyBranchMegaProfitColumns,
    resolvePolicyBranchMegaPrimaryProfitColumn
} from '@/shared/utils/policyBranchMegaProfitColumns'
import cls from './PolicyBranchMegaPage.module.scss'
import type { PolicyBranchMegaPageProps } from './types'
import PolicyBranchMegaChartExplorer from './PolicyBranchMegaChartExplorer'
import { buildPolicyBranchMegaChartModel } from '../model/policyBranchMegaChartModel'
import {
    resolveMegaRenderedRowKey,
    resolvePolicySetupCellStateForMegaRow,
    resolvePolicySetupLinkAlertSummaryForMegaRows
} from '../model/policyBranchMegaPolicySetupLink'
import { SectionDataState } from '@/shared/ui/errors/SectionDataState'

function buildTableSections(sections: unknown[]): TableSectionDto[] {
    return (sections ?? []).filter(
        (section): section is TableSectionDto =>
            Array.isArray((section as TableSectionDto).columns) && (section as TableSectionDto).columns!.length > 0
    )
}

// Счетчики сделок участвуют в merged-view логике и должны оставаться целыми неотрицательными значениями.
function parseNonNegativeInt(raw: string, label: string): number {
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

// В diagnostics route передаются только risk-query параметры, поэтому metric/bucketview
// исключаются, а bucket секции подставляется явно.
function buildBacktestDiagnosticsLink(
    searchParams: URLSearchParams,
    bucketOverride: PolicyBranchMegaBucketMode | null
): string {
    const nextParams = new URLSearchParams(searchParams)
    if (bucketOverride) {
        nextParams.set('bucket', bucketOverride)
    }

    return `${ROUTE_PATH[AppRoute.BACKTEST_DIAGNOSTICS]}${buildBacktestDiagnosticsSearchFromSearchParams(nextParams)}`
}

function resolvePolicyBranchMegaAvailableParts(report: ReportDocumentDto | null): number[] {
    if (!report) {
        return []
    }

    return Array.from(
        new Set(
            report.sections.flatMap(section => {
                const metadata = (section as TableSectionDto).metadata
                if (!metadata || metadata.kind !== 'policy-branch-mega' || typeof metadata.part !== 'number') {
                    return []
                }

                return [metadata.part]
            })
        )
    ).filter(part => Number.isInteger(part) && part > 0)
        .sort((left, right) => left - right)
}

const MEGA_SL_MODE_COLUMN_NAME = 'SL Mode'
const MEGA_ROW_KEY_SEPARATOR = '\u001e'
const MEGA_PART_TAG_REGEX = /\[PART\s+(\d+)\/(\d+)\]/i
const MEGA_MODE_TAG_REGEX = /\bWITH SL\b|\bNO SL\b/gi
const MEGA_OVERVIEW_DOM_ID = 'policy-branch-mega-overview'
const BUCKET_SPECIFIC_COLUMN_VISIBILITY = new Map<string, Set<PolicyBranchMegaBucketMode>>([
    ['DailyTP%', new Set<PolicyBranchMegaBucketMode>(['daily', 'total'])],
    ['DailySL%', new Set<PolicyBranchMegaBucketMode>(['daily', 'total'])],
    ['DynTP / SL Days', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['DynTP / SL Tr', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['DynTP / SL PnL%', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['DynGate OK', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['DynGate <Conf', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['DynGate <Samples', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['DynGate <WinRate', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['StatTP / SL Days', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['StatTP / SL Tr', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['StatTP / SL PnL%', new Set<PolicyBranchMegaBucketMode>(['daily', 'intraday', 'total'])],
    ['DelayedTP%', new Set<PolicyBranchMegaBucketMode>(['delayed', 'total'])],
    ['DelayedSL%', new Set<PolicyBranchMegaBucketMode>(['delayed', 'total'])]
])
// Порядок частей в UI задаётся этим owner-слоем, а не входной последовательностью секций.
// Part 1/2/3 приводятся к каноническому user-facing порядку до chart/terms/table/export.
const MEGA_CANONICAL_COLUMNS_BY_PART = new Map<number, readonly string[]>([
    [
        1,
        [
            'Policy',
            'Branch',
            'TotalPnl%',
            'Wealth%',
            'OnExch%',
            'TotalPnl$',
            'BucketNow$',
            'Tr',
            'WinRate%',
            'MeanRet%',
            'MaxDD%',
            'MaxDD_NoLiq%',
            'MaxDD_Active% / Days',
            'MaxDD_Ratio%',
            'Sharpe',
            'Sortino',
            'Calmar',
            'CAGR%',
            'StdRet%',
            'DownStd%',
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
            'DynTP / SL Days',
            'DynTP / SL Tr',
            'DynTP / SL PnL%',
            'DynGate OK',
            'DynGate <Conf',
            'DynGate <Samples',
            'DynGate <WinRate',
            'StatTP / SL Days',
            'StatTP / SL Tr',
            'StatTP / SL PnL%',
            'DailyTP%',
            'DailySL%',
            'DelayedTP%',
            'DelayedSL%',
            'AvgStake%',
            'AvgStake$',
            'Lev avg / min / max',
            'Lev p50 / p90',
            'Cap avg / min / max',
            'Cap p50 / p90',
            'CapAp',
            'CapSk',
            'Exposure% (avg / p50 / p90 / p99 / max)',
            'HighExposureTr% (>=20 / 50)',
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
            'RealLiq#',
            'RealLiqLoss$',
            'RealLiqLoss%',
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

function filterMegaSectionColumnsByBucket(
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

function filterMegaSectionsColumnsByBucket(
    sections: TableSectionDto[],
    bucket: PolicyBranchMegaBucketMode
): TableSectionDto[] {
    if (!sections || sections.length === 0) {
        throw new Error('[policy-branch-mega] cannot filter sections columns by bucket: source list is empty.')
    }

    return sections.map(section => filterMegaSectionColumnsByBucket(section, bucket))
}

function resolveMegaSlModeLabelForSection(section: TableSectionDto): string {
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

function resolveMegaPartNumberFromTitle(title: string | undefined): number {
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

function resolveMegaPartNumberFromSection(section: TableSectionDto): number {
    const metadataPart =
        section.metadata?.kind === 'policy-branch-mega' && Number.isInteger(section.metadata.part) ?
            section.metadata.part
        :   null
    if (typeof metadataPart === 'number' && metadataPart > 0) {
        return metadataPart
    }

    return resolveMegaPartNumberFromTitle(section.title)
}

function reorderMegaSectionColumns(section: TableSectionDto): TableSectionDto {
    const columns = section.columns ?? []
    if (columns.length === 0) {
        throw new Error('[policy-branch-mega] cannot reorder mega section columns: columns are empty.')
    }

    const part = resolveMegaPartNumberFromSection(section)
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
        nextSection.columnKeys = orderedColumns.map(column =>
            String(section.columnKeys![columnIndexByName.get(column)!] ?? column)
        )
    }

    return nextSection
}

function reorderMegaSectionsColumns(sections: TableSectionDto[]): TableSectionDto[] {
    if (!sections || sections.length === 0) {
        throw new Error('[policy-branch-mega] cannot reorder mega section columns: source list is empty.')
    }

    return sections.map(section => reorderMegaSectionColumns(section))
}

function resolveMergedMegaTitleForPart(partSections: TableSectionDto[], slMode: PolicyBranchMegaSlMode): string {
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

function resolveExpectedSlModeLabel(mode: PolicyBranchMegaSlMode): 'WITH SL' | 'NO SL' {
    if (mode === 'with-sl') return 'WITH SL'
    if (mode === 'no-sl') return 'NO SL'
    throw new Error(`[policy-branch-mega] strict sl mode label cannot be resolved for mode=${mode}.`)
}

function ensurePartSectionsMatchSelectedSlMode(
    partSections: TableSectionDto[],
    slMode: PolicyBranchMegaSlMode
): TableSectionDto[] {
    if (slMode === 'all') {
        return partSections
    }

    const expectedLabel = resolveExpectedSlModeLabel(slMode)
    const matchedSections: TableSectionDto[] = []
    const mismatchedTitles: string[] = []

    for (const section of partSections) {
        const actualLabel = resolveMegaSlModeLabelForSection(section)
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

function mergePolicyBranchMegaSectionsForPart(
    partSections: TableSectionDto[],
    slMode: PolicyBranchMegaSlMode
): TableSectionDto {
    if (!partSections || partSections.length === 0) {
        throw new Error('[policy-branch-mega] cannot merge part sections: source list is empty.')
    }

    const scopedSections = ensurePartSectionsMatchSelectedSlMode(partSections, slMode)
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

        const modeLabel = includeSlModeColumn ? resolveMegaSlModeLabelForSection(section) : null
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
        title: resolveMergedMegaTitleForPart(scopedSections, slMode),
        columns: mergedColumns,
        rows: mergedRows
    }
}

function mergePolicyBranchMegaSectionsByPart(
    sections: TableSectionDto[],
    slMode: PolicyBranchMegaSlMode
): TableSectionDto[] {
    if (!sections || sections.length === 0) {
        throw new Error('[policy-branch-mega] cannot merge sections by part: source list is empty.')
    }

    const byPart = new Map<number, TableSectionDto[]>()
    for (const section of sections) {
        const part = resolveMegaPartNumberFromTitle(section.title)
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

        return mergePolicyBranchMegaSectionsForPart(partSections, slMode)
    })
}

function resolveMegaBucketModeFromSection(section: TableSectionDto): PolicyBranchMegaBucketMode {
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

function mergePolicyBranchMegaSectionsByBucketAndPart(
    sections: TableSectionDto[],
    slMode: PolicyBranchMegaSlMode
): TableSectionDto[] {
    if (!sections || sections.length === 0) {
        throw new Error('[policy-branch-mega] cannot merge sections by bucket and part: source list is empty.')
    }

    const byBucketAndPart = new Map<
        string,
        { bucket: PolicyBranchMegaBucketMode; part: number; sections: TableSectionDto[] }
    >()

    for (const section of sections) {
        const bucket = resolveMegaBucketModeFromSection(section)
        if (bucket === 'total') {
            throw new Error('[policy-branch-mega] separate all-buckets merge received total bucket section.')
        }

        const part = resolveMegaPartNumberFromTitle(section.title)
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

    return orderedGroups.map(group => mergePolicyBranchMegaSectionsForPart(group.sections, slMode))
}

function buildPolicyBranchMegaSectionTerms(section: TableSectionDto) {
    const columns = section.columns ?? []
    if (columns.length === 0) {
        throw new Error('[policy-branch-mega] cannot build section terms: columns list is empty.')
    }

    return buildPolicyBranchMegaTermReferencesForColumns(columns)
}

function renderPolicyBranchMegaTermTooltip(termKey: string, termTitle: string, locale: PolicyBranchMegaTermLocale) {
    const term = getPolicyBranchMegaTerm(termKey, { locale })

    return renderTermTooltipRichText(term.description, {
        ...buildSelfTooltipExclusions(termKey, term.title)
    })
}

// Нормализуем плейсхолдеры только для no-data метрик; формат SL-колонок приходит из backend DTO.
function applyNoDataMarkersToMegaSections(sections: TableSectionDto[], noDataLabel: string): TableSectionDto[] {
    if (!sections || sections.length === 0) return sections

    const nextSections = sections.map(section => {
        const columns = section.columns ?? []
        const rows = section.rows ?? []

        const policyIdx = columns.indexOf('Policy')
        const branchIdx = columns.indexOf('Branch')
        const totalTradesIdx = columns.indexOf('Tr')
        const primaryProfitColumn = resolvePolicyBranchMegaPrimaryProfitColumn(columns)
        const resultPctIdx = primaryProfitColumn ? columns.indexOf(primaryProfitColumn) : -1
        const dynTradesIdx = columns.indexOf('DynTP / SL Tr')
        const dynPnlIdx = columns.indexOf('DynTP / SL PnL%')
        const statTradesIdx = columns.indexOf('StatTP / SL Tr')
        const statPnlIdx = columns.indexOf('StatTP / SL PnL%')

        if (policyIdx < 0 || branchIdx < 0 || totalTradesIdx < 0 || resultPctIdx < 0) {
            return section
        }

        const nextRows = rows.map((row, rowIndex) => {
            const requiredIdx = Math.max(policyIdx, branchIdx, totalTradesIdx, resultPctIdx)
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

            const totalTrades = parseNonNegativeInt(nextRow[totalTradesIdx] ?? '', 'total.trades')
            if (totalTrades === 0) {
                const resultPctValue = parseFiniteNumberOrNull(nextRow[resultPctIdx])
                if (resultPctValue === null || Math.abs(resultPctValue) <= 1e-12) {
                    nextRow[resultPctIdx] = noDataLabel
                } else {
                    throw new Error(
                        `[policy-branch-mega] primary profit result must be zero/empty when trades are absent. section=${section.title ?? 'n/a'}, row=${rowIndex}, policy=${policy}, branch=${branch}, column=${primaryProfitColumn}, value=${nextRow[resultPctIdx]}.`
                    )
                }
            }

            if (dynTradesIdx >= 0 && dynPnlIdx >= 0) {
                const dynTrades = parseNonNegativeInt(nextRow[dynTradesIdx] ?? '', 'dynamic.trades')
                if (dynTrades === 0) {
                    const dynPnlValue = parseFiniteNumberOrNull(nextRow[dynPnlIdx])
                    if (dynPnlValue === null || Math.abs(dynPnlValue) <= 1e-12) {
                        nextRow[dynPnlIdx] = noDataLabel
                    } else {
                        throw new Error(
                            `[policy-branch-mega] dynamic pnl must be zero/empty when dynamic trades are absent. section=${section.title ?? 'n/a'}, row=${rowIndex}, policy=${policy}, branch=${branch}, value=${nextRow[dynPnlIdx]}.`
                        )
                    }
                }
            }

            if (statTradesIdx >= 0 && statPnlIdx >= 0) {
                const statTrades = parseNonNegativeInt(nextRow[statTradesIdx] ?? '', 'static.trades')
                if (statTrades === 0) {
                    const statPnlValue = parseFiniteNumberOrNull(nextRow[statPnlIdx])
                    if (statPnlValue === null || Math.abs(statPnlValue) <= 1e-12) {
                        nextRow[statPnlIdx] = noDataLabel
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

    return nextSections
}

interface PolicyBranchMegaPreparedSectionEntry {
    key: string
    part: number
    bucket: PolicyBranchMegaBucketMode | null
    section: TableSectionDto
}

interface PolicyBranchMegaRenderedSectionEntry {
    key: string
    part: number
    bucket: PolicyBranchMegaBucketMode | null
    section: TableSectionDto | null
    isLoading: boolean
    error: Error | null
}

interface PolicyBranchMegaSectionTermsState {
    key: string
    terms: PolicyBranchMegaTermReference[]
    error: Error | null
}

function buildPolicyBranchMegaSectionTermsStateMap(
    entries: readonly PolicyBranchMegaRenderedSectionEntry[]
): Map<string, PolicyBranchMegaSectionTermsState> {
    const states = new Map<string, PolicyBranchMegaSectionTermsState>()
    const shownTermKeys = new Set<string>()

    entries.forEach(entry => {
        if (!entry.section) {
            states.set(entry.key, {
                key: entry.key,
                terms: [],
                error: null
            })
            return
        }

        try {
            const sectionTerms = buildPolicyBranchMegaSectionTerms(entry.section)
            const uniqueTerms = sectionTerms.filter(term => {
                if (shownTermKeys.has(term.key)) {
                    return false
                }

                shownTermKeys.add(term.key)
                return true
            })

            // Блок терминов на следующей таблице должен объяснять только новые метрики,
            // а не заново повторять то, что уже было раскрыто выше по странице.
            states.set(entry.key, {
                key: entry.key,
                terms: uniqueTerms,
                error: null
            })
        } catch (err) {
            const safeError =
                err instanceof Error ? err : new Error('Failed to build policy branch mega section terms.')
            states.set(entry.key, {
                key: entry.key,
                terms: [],
                error: safeError
            })
        }
    })

    return states
}

function buildPolicyBranchMegaPreparedSectionKey(part: number, bucket: PolicyBranchMegaBucketMode | null): string {
    return `${bucket ?? 'all'}:${part}`
}

function buildPreparedPolicyBranchMegaSectionEntries(
    sectionsSource: unknown[],
    bucket: PolicyBranchMegaBucketMode,
    slMode: PolicyBranchMegaSlMode,
    isSeparateAllBucketsSelection: boolean,
    noDataLabel: string
): PolicyBranchMegaPreparedSectionEntry[] {
    const tableSections = buildTableSections(sectionsSource)
    const orderedSections = orderPolicyBranchMegaSections(tableSections)
    const profitNormalizedSections = normalizePolicyBranchMegaProfitColumns(orderedSections)
    const noDataAwareSections = applyNoDataMarkersToMegaSections(profitNormalizedSections, noDataLabel)
    const mergedSections =
        isSeparateAllBucketsSelection ?
            mergePolicyBranchMegaSectionsByBucketAndPart(noDataAwareSections, slMode)
        :   mergePolicyBranchMegaSectionsByPart(noDataAwareSections, slMode)
    const reorderedSections = reorderMegaSectionsColumns(mergedSections)
    const visibleSections = filterMegaSectionsColumnsByBucket(reorderedSections, bucket)

    return visibleSections.map(section => {
        const part = resolveMegaPartNumberFromSection(section)
        const entryBucket = isSeparateAllBucketsSelection ? resolveMegaBucketModeFromSection(section) : null

        return {
            key: buildPolicyBranchMegaPreparedSectionKey(part, entryBucket),
            part,
            bucket: entryBucket,
            section
        }
    })
}

export default function PolicyBranchMegaPage({ className }: PolicyBranchMegaPageProps) {
    const { t, i18n } = useTranslation('reports')
    const location = useLocation()
    const [searchParams, setSearchParams] = useSearchParams()
    const [displayMode, setDisplayMode] = useState<'table' | 'chart'>('table')
    const [dismissedValidationKey, setDismissedValidationKey] = useState<string | null>(null)

    const bucketState = useMemo(() => {
        try {
            const bucket = resolvePolicyBranchMegaBucketFromQuery(
                searchParams.get('bucket'),
                DEFAULT_POLICY_BRANCH_MEGA_BUCKET_MODE
            )
            return { value: bucket, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse policy branch mega bucket query.')
            return { value: DEFAULT_POLICY_BRANCH_MEGA_BUCKET_MODE, error: safeError }
        }
    }, [searchParams])

    const bucketViewState = useMemo(() => {
        try {
            const bucketView = resolvePolicyBranchMegaTotalBucketViewFromQuery(
                searchParams.get('bucketview'),
                DEFAULT_POLICY_BRANCH_MEGA_TOTAL_BUCKET_VIEW
            )
            return { value: bucketView, error: null as Error | null }
        } catch (err) {
            const safeError =
                err instanceof Error ? err : new Error('Failed to parse policy branch mega bucketview query.')
            return { value: DEFAULT_POLICY_BRANCH_MEGA_TOTAL_BUCKET_VIEW, error: safeError }
        }
    }, [searchParams])

    const metricState = useMemo(() => {
        try {
            const metric = resolvePolicyBranchMegaMetricFromQuery(
                searchParams.get('metric'),
                DEFAULT_POLICY_BRANCH_MEGA_METRIC_MODE
            )
            return { value: metric, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse policy branch mega metric query.')
            return { value: DEFAULT_POLICY_BRANCH_MEGA_METRIC_MODE, error: safeError }
        }
    }, [searchParams])

    const tpSlState = useMemo(() => {
        try {
            const mode = resolvePolicyBranchMegaTpSlModeFromQuery(
                searchParams.get('tpsl'),
                DEFAULT_POLICY_BRANCH_MEGA_TP_SL_MODE
            )
            return { value: mode, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse policy branch mega tpsl query.')
            return { value: DEFAULT_POLICY_BRANCH_MEGA_TP_SL_MODE, error: safeError }
        }
    }, [searchParams])

    const slModeState = useMemo(() => {
        try {
            const mode = resolvePolicyBranchMegaSlModeFromQuery(
                searchParams.get('slmode'),
                DEFAULT_POLICY_BRANCH_MEGA_SL_MODE
            )
            return { value: mode, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse policy branch mega slmode query.')
            return { value: DEFAULT_POLICY_BRANCH_MEGA_SL_MODE, error: safeError }
        }
    }, [searchParams])

    const zonalState = useMemo(() => {
        try {
            const mode = resolvePolicyBranchMegaZonalModeFromQuery(
                searchParams.get('zonal'),
                DEFAULT_POLICY_BRANCH_MEGA_ZONAL_MODE
            )
            return { value: mode, error: null as Error | null }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to parse policy branch mega zonal query.')
            return { value: DEFAULT_POLICY_BRANCH_MEGA_ZONAL_MODE, error: safeError }
        }
    }, [searchParams])

    const policyBranchMegaBaseArgs = useMemo(
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
    const requestedAnchorTarget = useMemo(() => resolvePolicyBranchMegaAnchorTarget(location.hash), [location.hash])
    const activePartRequest = requestedAnchorTarget?.part ?? 1
    const activePolicyBranchMegaArgs = useMemo(
        () => ({
            ...policyBranchMegaBaseArgs,
            part: activePartRequest
        }),
        [activePartRequest, policyBranchMegaBaseArgs]
    )
    const { data: primaryReport, isLoading, isError, error, refetch } = usePolicyBranchMegaReportNavQuery(
        { enabled: true },
        activePolicyBranchMegaArgs
    )
    const { data: primaryEvaluation } =
        usePolicyBranchMegaEvaluationQuery(activePolicyBranchMegaArgs, {
            enabled: Boolean(primaryReport)
        })
    const primaryEvaluationRows = primaryEvaluation?.rows ?? null
    const termsLocale = useMemo(() => resolvePolicyBranchMegaTermLocale(i18n.language), [i18n.language])

    const effectiveSelection = useMemo(
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

    const isSeparateAllBucketsSelection =
        effectiveSelection.bucket === 'total' && effectiveSelection.bucketView === 'separate'
    const isChartSupported = !isSeparateAllBucketsSelection
    const effectiveDisplayMode = isChartSupported ? displayMode : 'table'
    const normalizedAvailableParts = useMemo(
        () => resolvePolicyBranchMegaAvailableParts(primaryReport ?? null),
        [primaryReport]
    )
    const activePart = useMemo(() => {
        if (normalizedAvailableParts.length === 0) {
            return activePartRequest
        }

        if (typeof activePartRequest === 'number' && normalizedAvailableParts.includes(activePartRequest)) {
            return activePartRequest
        }

        return normalizedAvailableParts[0]
    }, [activePartRequest, normalizedAvailableParts])
    const resolvedQuery = useMemo(
        () =>
            primaryReport ? {
                bucket: effectiveSelection.bucket,
                bucketView: effectiveSelection.bucketView,
                metric: effectiveSelection.metric,
                tpSlMode: effectiveSelection.tpSlMode,
                slMode: effectiveSelection.slMode,
                zonalMode: effectiveSelection.zonalMode,
                part: activePart
            } : null,
        [
            activePart,
            effectiveSelection.bucket,
            effectiveSelection.bucketView,
            effectiveSelection.metric,
            effectiveSelection.slMode,
            effectiveSelection.tpSlMode,
            effectiveSelection.zonalMode,
            primaryReport
        ]
    )
    const effectiveQueryArgsBase = useMemo(
        () => ({
            bucket: effectiveSelection.bucket,
            bucketView: effectiveSelection.bucketView,
            metric: effectiveSelection.metric,
            tpSlMode: effectiveSelection.tpSlMode,
            slMode: effectiveSelection.slMode,
            zonalMode: effectiveSelection.zonalMode
        }),
        [
            effectiveSelection.bucket,
            effectiveSelection.bucketView,
            effectiveSelection.metric,
            effectiveSelection.slMode,
            effectiveSelection.tpSlMode,
            effectiveSelection.zonalMode
        ]
    )
    const effectiveSelectionKey = useMemo(
        () =>
            [
                effectiveSelection.bucket,
                effectiveSelection.bucketView,
                effectiveSelection.metric,
                effectiveSelection.tpSlMode,
                effectiveSelection.slMode,
                effectiveSelection.zonalMode
            ].join('|'),
        [
            effectiveSelection.bucket,
            effectiveSelection.bucketView,
            effectiveSelection.metric,
            effectiveSelection.slMode,
            effectiveSelection.tpSlMode,
            effectiveSelection.zonalMode
        ]
    )

    // Окно подгрузки table-view держим вокруг реально видимой части.
    // Первый показ привязан к route-anchor, а последующие смещения происходят только по scroll.
    const [tableWindowCenterPart, setTableWindowCenterPart] = useState(activePart)
    const tablePagerSyncReadyRef = useRef(false)

    useEffect(() => {
        tablePagerSyncReadyRef.current = false
        setTableWindowCenterPart(activePart)
    }, [activePart, effectiveSelectionKey])

    const validationQueryArgs = useMemo(
        () => ({
            ...effectiveQueryArgsBase,
            // Фоновая сверка проверяет только реально открытую часть, а не всю комбинацию целиком.
            part: effectiveDisplayMode === 'table' ? tableWindowCenterPart : activePart
        }),
        [activePart, effectiveQueryArgsBase, effectiveDisplayMode, tableWindowCenterPart]
    )
    const [isValidationQueryDeferredReady, setIsValidationQueryDeferredReady] = useState(false)
    useEffect(() => {
        setIsValidationQueryDeferredReady(false)

        if (!primaryReport || !primaryEvaluationRows) {
            return
        }

        // Сначала показываем опубликованный срез, а background-check запускаем уже после первого paint.
        const timeoutId = window.setTimeout(() => {
            setIsValidationQueryDeferredReady(true)
        }, 0)

        return () => window.clearTimeout(timeoutId)
    }, [primaryEvaluationRows, primaryReport])
    const { data: validationStatus, error: validationError } = usePolicyBranchMegaValidationQuery(validationQueryArgs, {
        enabled: Boolean(primaryReport && primaryEvaluationRows && isValidationQueryDeferredReady)
    })
    const validationAlertState = useMemo(() => {
        if (validationError) {
            return {
                key: [
                    'validation-error',
                    validationError.name,
                    validationError.message
                ].join('|'),
                title: t('policyBranchMega.page.validation.errorTitle', {
                    defaultValue: 'Фоновая проверка среза недоступна'
                }),
                description: t('policyBranchMega.page.validation.errorMessage', {
                    defaultValue: 'Проверка будет повторена автоматически, когда backend ответит.'
                }),
                detail: validationError.message
            }
        }

        if (!validationStatus) {
            return null
        }

        if (validationStatus.state !== 'mismatch' && validationStatus.state !== 'error') {
            return null
        }

        const alertKey = [
            validationStatus.state,
            validationStatus.selectionKey,
            validationStatus.policyBranchMegaId ?? '',
            validationStatus.diagnosticsId ?? '',
            validationStatus.message
        ].join('|')

        return {
            key: alertKey,
            title:
                validationStatus.state === 'mismatch' ?
                    t('policyBranchMega.page.validation.mismatchTitle')
                :   t('policyBranchMega.page.validation.errorTitle'),
            description:
                validationStatus.state === 'mismatch' ?
                    t('policyBranchMega.page.validation.mismatchMessage')
                :   t('policyBranchMega.page.validation.errorMessage'),
            detail: validationStatus.state === 'error' ? validationStatus.message : null
        }
    }, [t, validationError, validationStatus])
    const isValidationAlertDismissed =
        validationAlertState !== null && dismissedValidationKey === validationAlertState.key
    const activeBucketForSection = useMemo(() => {
        if (!isSeparateAllBucketsSelection) {
            return null
        }

        const requestedBucket = requestedAnchorTarget?.bucket
        if (requestedBucket === 'daily' || requestedBucket === 'intraday' || requestedBucket === 'delayed') {
            return requestedBucket
        }

        return 'daily'
    }, [isSeparateAllBucketsSelection, requestedAnchorTarget])
    const activeSectionKind: PolicyBranchMegaAnchorSectionKind = requestedAnchorTarget?.sectionKind ?? 'terms'
    const activeAnchor = useMemo(
        () =>
            activeSectionKind === 'table' ?
                buildPolicyBranchMegaTableSectionAnchor(activePart, activeBucketForSection)
            :   buildPolicyBranchMegaTermsSectionAnchor(activePart, activeBucketForSection),
        [activeBucketForSection, activePart, activeSectionKind]
    )

    const requestedPartNumbers = useMemo(() => {
        if (normalizedAvailableParts.length === 0) {
            return [effectiveDisplayMode === 'table' ? tableWindowCenterPart : activePart]
        }

        if (effectiveDisplayMode === 'chart') {
            return normalizedAvailableParts
        }

        // Table view держит окно вокруг реально видимой части.
        // Пока часть 2 читается, часть 3 догружается фоном и уже ждёт следующий scroll.
        return resolvePolicyBranchMegaNeighborParts(normalizedAvailableParts, tableWindowCenterPart)
    }, [activePart, effectiveDisplayMode, normalizedAvailableParts, tableWindowCenterPart])
    const extraPartNumbers = useMemo(
        () => requestedPartNumbers.filter(part => part !== activePart),
        [activePart, requestedPartNumbers]
    )
    const extraPartQueries = useQueries({
        queries: extraPartNumbers.map(part => {
            const nextArgs = {
                ...effectiveQueryArgsBase,
                part
            }

            return {
                queryKey: buildPolicyBranchMegaQueryKey(nextArgs),
                queryFn: () => fetchPolicyBranchMegaReport(nextArgs),
                enabled: normalizedAvailableParts.includes(part),
                retry: false,
                staleTime: POLICY_BRANCH_MEGA_STALE_TIME_MS,
                gcTime: POLICY_BRANCH_MEGA_GC_TIME_MS,
                refetchOnWindowFocus: false
            }
        })
    }) as Array<{
        data: ReportDocumentDto | undefined
        isLoading: boolean
        isFetching: boolean
        error: Error | null
    }>

    // Для ссылок на policy setup нужны published row-evaluation данные по каждой видимой части.
    // Если грузить только активную часть, то часть 2/3/4 остаётся без link-path даже при готовом отчёте.
    const extraPartEvaluationQueries = useQueries({
        queries: extraPartNumbers.map(part => {
            const nextArgs = {
                ...effectiveQueryArgsBase,
                part
            }

            return {
                queryKey: buildPolicyBranchMegaEvaluationQueryKey(nextArgs),
                queryFn: () => fetchPolicyBranchMegaEvaluationMap(nextArgs),
                enabled: normalizedAvailableParts.includes(part),
                retry: false,
                staleTime: POLICY_BRANCH_MEGA_STALE_TIME_MS,
                gcTime: POLICY_BRANCH_MEGA_GC_TIME_MS,
                refetchOnWindowFocus: false
            }
        })
    }) as Array<{
        data: PolicyRowEvaluationMapDto | undefined
        isLoading: boolean
        isFetching: boolean
        error: Error | null
    }>

    const loadedPartReportsState = useMemo(() => {
        const reports: Array<{ part: number; report: typeof primaryReport }> = []
        const partStates = new Map<number, { isLoading: boolean; error: Error | null }>()

        partStates.set(activePart, { isLoading: isLoading && !primaryReport, error: null })

        if (primaryReport) {
            reports.push({ part: activePart, report: primaryReport })
            partStates.set(activePart, { isLoading: false, error: null })
        }

        extraPartNumbers.forEach((part, index) => {
            const query = extraPartQueries[index]
            if (query?.data) {
                reports.push({ part, report: query.data })
            }
            partStates.set(part, {
                isLoading: Boolean(query && (query.isLoading || query.isFetching)),
                error: query?.error instanceof Error ? query.error : null
            })
        })

        return {
            reports: reports.sort((a, b) => a.part - b.part),
            partStates,
            chartLoadError:
                effectiveDisplayMode === 'chart' ?
                    (extraPartQueries.find(query => query.error instanceof Error)?.error ?? null)
                :   null,
            chartIsLoading:
                effectiveDisplayMode === 'chart' &&
                (isLoading || extraPartQueries.some(query => query.isLoading || query.isFetching))
        }
    }, [activePart, effectiveDisplayMode, extraPartNumbers, extraPartQueries, isLoading, primaryReport])

    const rowEvaluationMapsByPart = useMemo(() => {
        const maps = new Map<number, PolicyRowEvaluationMapDto['rows']>()
        if (primaryEvaluationRows) {
            maps.set(activePart, primaryEvaluationRows)
        }

        extraPartNumbers.forEach((part, index) => {
            const query = extraPartEvaluationQueries[index]
            if (query?.data?.rows) {
                maps.set(part, query.data.rows)
            }
        })

        return maps
    }, [activePart, extraPartEvaluationQueries, extraPartNumbers, primaryEvaluationRows])
    const rowEvaluationStatesByPart = useMemo(() => {
        const states = new Map<number, { ready: boolean; error: Error | null }>()
        states.set(activePart, {
            ready: Boolean(primaryEvaluationRows),
            error:
                primaryReport && !isLoading && !primaryEvaluationRows ?
                    new Error('[policy-branch-mega] published evaluation map is missing for the active part.')
                :   null
        })

        extraPartNumbers.forEach((part, index) => {
            const query = extraPartEvaluationQueries[index]
            states.set(part, {
                ready: Boolean(query?.data?.rows),
                error:
                    query?.error instanceof Error ? query.error
                    : query && !query.isLoading && !query.isFetching && !query.data ?
                        new Error(
                            `[policy-branch-mega] published evaluation map is missing for part=${part}.`
                        )
                    :   null
            })
        })

        return states
    }, [activePart, extraPartEvaluationQueries, extraPartNumbers, isLoading, primaryEvaluationRows, primaryReport])

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
    const noDataLabel = t('policyBranchMega.page.noDataPlaceholder')
    const preparedSectionsByPartCacheRef = useRef(new Map<string, PolicyBranchMegaPreparedSectionEntry[]>())

    useEffect(() => {
        preparedSectionsByPartCacheRef.current.clear()
    }, [effectiveSelectionKey, isSeparateAllBucketsSelection, noDataLabel])

    const visibleSectionEntriesState = useMemo(() => {
        if (!primaryReport) {
            return {
                entries: [] as PolicyBranchMegaPreparedSectionEntry[],
                error: null as Error | null
            }
        }

        try {
            const entries: PolicyBranchMegaPreparedSectionEntry[] = []

            loadedPartReportsState.reports.forEach(item => {
                const currentReport = item.report
                if (!currentReport) {
                    return
                }

                const cacheKey = `${currentReport.id}|${currentReport.generatedAtUtc}|${item.part}`
                let cachedEntries = preparedSectionsByPartCacheRef.current.get(cacheKey)
                if (!cachedEntries) {
                    cachedEntries = buildPreparedPolicyBranchMegaSectionEntries(
                        currentReport.sections ?? [],
                        effectiveSelection.bucket,
                        effectiveSelection.slMode,
                        isSeparateAllBucketsSelection,
                        noDataLabel
                    )
                    preparedSectionsByPartCacheRef.current.set(cacheKey, cachedEntries)
                }

                entries.push(...cachedEntries)
            })

            entries.sort((left, right) => {
                if (isSeparateAllBucketsSelection) {
                    const leftBucketOrder = resolveMegaBucketOrder(left.bucket ?? 'total')
                    const rightBucketOrder = resolveMegaBucketOrder(right.bucket ?? 'total')
                    if (leftBucketOrder !== rightBucketOrder) {
                        return leftBucketOrder - rightBucketOrder
                    }
                }

                return left.part - right.part
            })

            return {
                entries,
                error: null as Error | null
            }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to prepare policy branch mega sections.')
            return {
                entries: [] as PolicyBranchMegaPreparedSectionEntry[],
                error: safeError
            }
        }
    }, [
        effectiveSelection.bucket,
        effectiveSelection.slMode,
        isSeparateAllBucketsSelection,
        loadedPartReportsState.reports,
        noDataLabel,
        primaryReport
    ])

    const visibleSectionsState = useMemo(
        () => ({
            sections: visibleSectionEntriesState.entries.map(entry => entry.section),
            error: visibleSectionEntriesState.error
        }),
        [visibleSectionEntriesState.entries, visibleSectionEntriesState.error]
    )

    const requestedSectionEntries = useMemo(() => {
        if (effectiveDisplayMode !== 'table') {
            return []
        }

        if (normalizedAvailableParts.length > 0) {
            return buildPolicyBranchMegaSectionEntriesFromAvailableParts(
                requestedPartNumbers,
                effectiveSelection.bucket,
                effectiveSelection.bucketView
            )
        }

        return visibleSectionEntriesState.entries.map(entry => ({
            part: entry.part,
            bucket: entry.bucket
        }))
    }, [
        effectiveDisplayMode,
        effectiveSelection.bucket,
        effectiveSelection.bucketView,
        normalizedAvailableParts.length,
        requestedPartNumbers,
        visibleSectionEntriesState.entries
    ])

    const tableRenderedSectionsState = useMemo(() => {
        if (effectiveDisplayMode !== 'table') {
            return {
                entries: [] as PolicyBranchMegaRenderedSectionEntry[],
                error: null as Error | null
            }
        }

        try {
            const loadedEntriesByKey = new Map(
                visibleSectionEntriesState.entries.map(
                    entry => [entry.key, entry] satisfies [string, PolicyBranchMegaPreparedSectionEntry]
                )
            )

            const entries = requestedSectionEntries.map(entry => {
                const key = buildPolicyBranchMegaPreparedSectionKey(entry.part, entry.bucket)
                const loadedEntry = loadedEntriesByKey.get(key)
                const partState = loadedPartReportsState.partStates.get(entry.part)

                if (loadedEntry) {
                    return {
                        key,
                        part: entry.part,
                        bucket: entry.bucket,
                        section: loadedEntry.section,
                        isLoading: false,
                        error: null
                    } satisfies PolicyBranchMegaRenderedSectionEntry
                }

                if (partState && !partState.isLoading && !partState.error) {
                    throw new Error(
                        `[policy-branch-mega] prepared section is missing for part=${entry.part}, bucket=${entry.bucket ?? 'all'}.`
                    )
                }

                return {
                    key,
                    part: entry.part,
                    bucket: entry.bucket,
                    section: null,
                    isLoading: Boolean(partState?.isLoading),
                    error: partState?.error ?? null
                } satisfies PolicyBranchMegaRenderedSectionEntry
            })

            return {
                entries,
                error: null as Error | null
            }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to build rendered mega sections.')
            return {
                entries: [] as PolicyBranchMegaRenderedSectionEntry[],
                error: safeError
            }
        }
    }, [
        effectiveDisplayMode,
        loadedPartReportsState.partStates,
        requestedSectionEntries,
        visibleSectionEntriesState.entries
    ])

    const chartModelState = useMemo(() => {
        if (!isChartSupported) {
            return { model: null, error: null as Error | null }
        }

        if (loadedPartReportsState.chartLoadError) {
            return { model: null, error: loadedPartReportsState.chartLoadError }
        }

        if (visibleSectionsState.error) {
            return { model: null, error: visibleSectionsState.error }
        }

        if (visibleSectionsState.sections.length === 0) {
            return { model: null, error: null as Error | null }
        }

        try {
            return {
                model: buildPolicyBranchMegaChartModel(visibleSectionsState.sections),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to build policy branch mega chart model.')

            return {
                model: null,
                error: safeError
            }
        }
    }, [
        isChartSupported,
        loadedPartReportsState.chartLoadError,
        visibleSectionsState.error,
        visibleSectionsState.sections
    ])

    const sectionTermsStateByKey = useMemo(() => {
        return buildPolicyBranchMegaSectionTermsStateMap(tableRenderedSectionsState.entries)
    }, [tableRenderedSectionsState.entries])

    const pageTabs = useMemo(() => {
        if (effectiveDisplayMode !== 'table') {
            return []
        }

        if (normalizedAvailableParts.length > 0) {
            return buildPolicyBranchMegaTabsFromAvailableParts(
                normalizedAvailableParts,
                effectiveSelection.bucket,
                effectiveSelection.bucketView
            )
        }

        return buildPolicyBranchMegaTabsFromSections(
            tableRenderedSectionsState.entries.flatMap(entry => (entry.section ? [entry.section] : []))
        )
    }, [
        effectiveDisplayMode,
        effectiveSelection.bucket,
        effectiveSelection.bucketView,
        normalizedAvailableParts,
        tableRenderedSectionsState.entries
    ])

    const activePagerIndex = useMemo(() => {
        if (effectiveDisplayMode !== 'table' || pageTabs.length === 0) {
            return 0
        }

        const matchedIndex = pageTabs.findIndex(tab => tab.anchor === activeAnchor)
        return matchedIndex >= 0 ? matchedIndex : 0
    }, [activeAnchor, effectiveDisplayMode, pageTabs])

    useEffect(() => {
        if (effectiveDisplayMode !== 'table') {
            return
        }

        if (!activeAnchor) {
            return
        }

        // Без этой синхронизации deep-link открывает не ту часть,
        // а window подгрузки остаётся привязанным к верхнему экрану.
        scrollToAnchor(activeAnchor, {
            behavior: 'auto',
            withTransitionPulse: false
        })
    }, [activeAnchor, effectiveDisplayMode])

    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections: pageTabs,
        syncHash: false,
        // Для mega-таблицы scroll должен только смещать окно подгрузки.
        // Hash и route остаются статичными, чтобы пользователь не прыгал назад к первой части.
        trackScroll: true
    })

    useEffect(() => {
        if (effectiveDisplayMode !== 'table' || pageTabs.length === 0) {
            return
        }

        const currentAnchor = pageTabs[currentIndex]?.anchor
        if (!currentAnchor) {
            return
        }

        const currentPart = resolvePolicyBranchMegaAnchorTarget(currentAnchor)?.part ?? null
        if (currentPart == null) {
            return
        }

        if (!tablePagerSyncReadyRef.current) {
            if (currentIndex === activePagerIndex) {
                tablePagerSyncReadyRef.current = true
                setTableWindowCenterPart(currentPart)
            }

            return
        }

        setTableWindowCenterPart(currentPart)
    }, [activePagerIndex, currentIndex, effectiveDisplayMode, pageTabs])

    const generatedAtState = useMemo(() => {
        if (!primaryReport) return { value: null as Date | null, error: null as Error | null }

        if (!primaryReport.generatedAtUtc) {
            return {
                value: null,
                error: new Error('[policy-branch-mega] generatedAtUtc is missing.')
            }
        }

        const parsed = new Date(primaryReport.generatedAtUtc)
        if (Number.isNaN(parsed.getTime())) {
            return {
                value: null,
                error: new Error(`[policy-branch-mega] generatedAtUtc is invalid: ${primaryReport.generatedAtUtc}`)
            }
        }

        return { value: parsed, error: null }
    }, [primaryReport])
    const hasLoadedReportSections = useMemo(
        () => loadedPartReportsState.reports.some(item => (item.report?.sections ?? []).length > 0),
        [loadedPartReportsState.reports]
    )

    const rootClassName = classNames(cls.root, {}, [className ?? ''])

    const renderedColumnTitles = useMemo(() => {
        const cachedTitles = new Map<string, ReturnType<typeof renderTermTooltipTitle>>()

        tableRenderedSectionsState.entries.forEach(entry => {
            ;(entry.section?.columns ?? []).forEach(column => {
                if (!cachedTitles.has(column)) {
                    cachedTitles.set(
                        column,
                        renderTermTooltipTitle(column, () =>
                            renderPolicyBranchMegaTermTooltip(column, column, termsLocale)
                        )
                    )
                }
            })
        })

        return cachedTitles
    }, [tableRenderedSectionsState.entries, termsLocale])

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

    const renderTableSectionEntry = useCallback(
        (entry: PolicyBranchMegaRenderedSectionEntry) => {
            const section = entry.section
            const termsState = sectionTermsStateByKey.get(entry.key) ?? {
                key: entry.key,
                terms: [] as PolicyBranchMegaTermReference[],
                error: null as Error | null
            }
            const sectionBucket =
                entry.bucket ?? (section ? resolveMegaBucketModeFromSection(section) : null)
            const sectionBucketLabel = sectionBucket ? resolvePolicyBranchMegaBucketLabel(sectionBucket) : null
            const termsDomId = buildPolicyBranchMegaTermsSectionAnchor(entry.part, entry.bucket)
            const tableDomId = buildPolicyBranchMegaTableSectionAnchor(entry.part, entry.bucket)
            const termsTitle =
                isSeparateAllBucketsSelection && sectionBucketLabel ?
                    `Термины · ${sectionBucketLabel} · часть ${entry.part}`
                :   t('policyBranchMega.page.terms.title', { part: entry.part })
            const termsSubtitle =
                isSeparateAllBucketsSelection && sectionBucketLabel ?
                    `${sectionBucketLabel} · ${t('policyBranchMega.page.terms.subtitle', { part: entry.part })}`
                :   t('policyBranchMega.page.terms.subtitle', { part: entry.part })
            const pendingTableTitle =
                isSeparateAllBucketsSelection && sectionBucketLabel ?
                    `${sectionBucketLabel} · ${t('policyBranchMega.page.table.titleFallback', { part: entry.part })}`
                :   t('policyBranchMega.page.table.titleFallback', { part: entry.part })
            const diagnosticsLink = buildBacktestDiagnosticsLink(
                searchParams,
                isSeparateAllBucketsSelection ? sectionBucket : null
            )
            const rowEvaluationMap = rowEvaluationMapsByPart.get(entry.part)
            const rowEvaluationState = rowEvaluationStatesByPart.get(entry.part)
            const diagnosticsTitle =
                isSeparateAllBucketsSelection && sectionBucketLabel ?
                    `${t('policyBranchMega.page.part2Diagnostics.title')} · ${sectionBucketLabel}`
                :   t('policyBranchMega.page.part2Diagnostics.title')

            return (
                <SectionErrorBoundary key={entry.key} name={`PolicyBranchMega:${entry.key}`}>
                    <div className={cls.sectionBlock}>
                        <div id={termsDomId}>
                            {!section ?
                                <SectionDataState
                                    isLoading={entry.isLoading && !entry.error}
                                    isError={Boolean(entry.error)}
                                    error={entry.error}
                                    hasData={false}
                                    onRetry={entry.error ? refetch : undefined}
                                    title={termsTitle}
                                    description={t('policyBranchMega.page.errors.sections.message')}
                                    loadingText={t('errors:ui.pageDataBoundary.loading', {
                                        defaultValue: 'Loading data'
                                    })}
                                    logContext={{
                                        source: 'policy-branch-mega-pending-terms',
                                        extra: {
                                            part: entry.part,
                                            bucket: sectionBucket ?? 'all'
                                        }
                                    }}>
                                    {null}
                                </SectionDataState>
                            : termsState.error ?
                                <SectionDataState
                                    isError
                                    error={termsState.error}
                                    hasData={false}
                                    onRetry={refetch}
                                    title={t('policyBranchMega.page.errors.terms.title')}
                                    description={t('policyBranchMega.page.errors.terms.message')}
                                    logContext={{
                                        source: 'policy-branch-mega-terms',
                                        extra: {
                                            part: entry.part,
                                            bucket: sectionBucket ?? 'all'
                                        }
                                    }}>
                                    {null}
                                </SectionDataState>
                            : termsState.terms.length > 0 ?
                                <ReportTableTermsBlock
                                    terms={termsState.terms.map(term => ({
                                        key: term.key,
                                        title: term.title,
                                        resolveDescription: () => {
                                            const resolved = getPolicyBranchMegaTerm(term.key, {
                                                locale: termsLocale
                                            })

                                            return resolved.description
                                        }
                                    }))}
                                    enhanceDomainTerms
                                    showTermTitleTooltip={false}
                                    title={termsTitle}
                                    subtitle={termsSubtitle}
                                    className={cls.termsBlock}
                                />
                            :   null}
                        </div>

                        <div id={tableDomId}>
                            {!section ?
                                <SectionDataState
                                    isLoading={entry.isLoading && !entry.error}
                                    isError={Boolean(entry.error)}
                                    error={entry.error}
                                    hasData={false}
                                    onRetry={entry.error ? refetch : undefined}
                                    title={pendingTableTitle}
                                    description={t('policyBranchMega.page.errors.sections.message')}
                                    loadingText={t('errors:ui.pageDataBoundary.loading', {
                                        defaultValue: 'Loading data'
                                    })}
                                    logContext={{
                                        source: 'policy-branch-mega-pending-table',
                                        extra: {
                                            part: entry.part,
                                            bucket: sectionBucket ?? 'all'
                                        }
                                    }}>
                                    {null}
                                </SectionDataState>
                            :   (() => {
                                    const rowEvaluationAlertSummary = resolvePolicySetupLinkAlertSummaryForMegaRows({
                                        rows: section.rows ?? [],
                                        columns: section.columns ?? [],
                                        rowEvaluationMap,
                                        evaluationMapReady: rowEvaluationState?.ready ?? false,
                                        rowEvaluationError: rowEvaluationState?.error ?? null
                                    })

                                    const table = (
                                        <ReportTableCard
                                            title={
                                                normalizePolicyBranchMegaTitle(section.title) ||
                                                t('policyBranchMega.page.table.titleFallback', {
                                                    part: entry.part
                                                })
                                            }
                                            description={resolveMergedMegaDescriptionForPart(
                                                entry.part,
                                                effectiveSelection.slMode,
                                                (key, options) => t(key, options)
                                            )}
                                            columns={section.columns ?? []}
                                            rows={section.rows ?? []}
                                            domId={`${tableDomId}-table`}
                                            renderColumnTitle={renderColumnTitle}
                                            rowEvaluationMap={rowEvaluationMap}
                                            getRowKey={row => resolveMegaRenderedRowKey(row, section.columns ?? [])}
                                            renderCellOverride={(value, rowIndex, _colIdx, columnTitle) => {
                                                if (columnTitle !== 'Policy' || typeof value !== 'string') {
                                                    return null
                                                }

                                                const cellState = resolvePolicySetupCellStateForMegaRow({
                                                    row: section.rows?.[rowIndex],
                                                    columns: section.columns ?? [],
                                                    rowEvaluationMap,
                                                    evaluationMapReady: rowEvaluationState?.ready ?? false
                                                })

                                                if (cellState.detailPath) {
                                                    // Переход идёт по setupId из backend row-evaluation,
                                                    // а не по фронтовому восстановлению identity из витринных колонок.
                                                    return (
                                                        <Link to={cellState.detailPath} className={cls.policySetupLink}>
                                                            {value}
                                                        </Link>
                                                    )
                                                }

                                                return <span>{value}</span>
                                            }}
                                            virtualizeRows
                                            tableMaxHeight='min(72vh, 960px)'
                                        />
                                    )

                                    return (
                                        <>
                                            {rowEvaluationAlertSummary && (
                                                <section className={cls.validationAlert} role='alert' aria-live='polite'>
                                                    <div className={cls.validationAlertHeader}>
                                                        <Text type='h4' className={cls.validationAlertTitle}>
                                                            {rowEvaluationAlertSummary.error ?
                                                                'Ссылки на графики политики недоступны'
                                                            :   `Ссылки на графики политики не опубликованы для ${rowEvaluationAlertSummary.missingLinkCount} строк`}
                                                        </Text>
                                                    </div>
                                                    <Text className={cls.validationAlertText}>
                                                        {rowEvaluationAlertSummary.error ?
                                                            `Ожидалось: опубликованная карта оценок строк для ${rowEvaluationAlertSummary.expectedLinkCount} строк текущей части. Получено: ${rowEvaluationAlertSummary.error.message}.`
                                                        :   `Ожидалось: переходы на график setup для всех ${rowEvaluationAlertSummary.expectedLinkCount} строк текущей части. Получено: ${rowEvaluationAlertSummary.resolvedLinkCount} ссылок и ${rowEvaluationAlertSummary.missingLinkCount} строк без setupId.`}
                                                    </Text>
                                                    {!rowEvaluationAlertSummary.error && rowEvaluationAlertSummary.sampleLabels.length > 0 && (
                                                        <Text className={cls.validationAlertDetail}>
                                                            {`Примеры: ${rowEvaluationAlertSummary.sampleLabels.join(' · ')}.`}
                                                        </Text>
                                                    )}
                                                    {rowEvaluationAlertSummary.error && (
                                                        <Text className={cls.validationAlertDetail}>
                                                            {`Причина: ${rowEvaluationAlertSummary.error.message}`}
                                                        </Text>
                                                    )}
                                                </section>
                                            )}
                                            {table}
                                        </>
                                    )
                                })()}
                        </div>

                        {section && entry.part === 2 && (
                            <section className={cls.diagnosticsLinkBlock}>
                                <div className={cls.diagnosticsLinkHeader}>
                                    <Text type='h4' className={cls.diagnosticsLinkTitle}>
                                        {diagnosticsTitle}
                                    </Text>
                                    <Text className={cls.diagnosticsLinkDescription}>
                                        {t('policyBranchMega.page.part2Diagnostics.description')}
                                    </Text>
                                </div>

                                <ul className={cls.diagnosticsLinkList}>
                                    <li>
                                        {renderTermTooltipRichText(
                                            t('policyBranchMega.page.part2Diagnostics.items.item1')
                                        )}
                                    </li>
                                    <li>
                                        {renderTermTooltipRichText(
                                            t('policyBranchMega.page.part2Diagnostics.items.item2')
                                        )}
                                    </li>
                                    <li>
                                        {renderTermTooltipRichText(
                                            t('policyBranchMega.page.part2Diagnostics.items.item3')
                                        )}
                                    </li>
                                    <li>
                                        {renderTermTooltipRichText(
                                            t('policyBranchMega.page.part2Diagnostics.items.item4')
                                        )}
                                    </li>
                                </ul>

                                <Link to={diagnosticsLink} className={cls.diagnosticsLinkAction}>
                                    {t('policyBranchMega.page.part2Diagnostics.link')}
                                </Link>
                            </section>
                        )}
                    </div>
                </SectionErrorBoundary>
            )
        },
        [
            effectiveSelection.slMode,
            isSeparateAllBucketsSelection,
            refetch,
            renderColumnTitle,
            rowEvaluationMapsByPart,
            rowEvaluationStatesByPart,
            searchParams,
            sectionTermsStateByKey,
            t,
            termsLocale
        ]
    )

    const handleBucketChange = useCallback(
        (next: PolicyBranchMegaBucketMode) => {
            if (next === effectiveSelection.bucket) return
            const nextParams = new URLSearchParams(searchParams)
            nextParams.set('bucket', next)
            if (next === 'total') {
                nextParams.set('bucketview', DEFAULT_POLICY_BRANCH_MEGA_TOTAL_BUCKET_VIEW)
            } else {
                nextParams.delete('bucketview')
            }
            setSearchParams(nextParams, { replace: true })
        },
        [effectiveSelection.bucket, searchParams, setSearchParams]
    )

    const handleBucketViewChange = useCallback(
        (next: PolicyBranchMegaTotalBucketView) => {
            if (next === effectiveSelection.bucketView) return
            const nextParams = new URLSearchParams(searchParams)
            nextParams.set('bucketview', next)
            setSearchParams(nextParams, { replace: true })
        },
        [effectiveSelection.bucketView, searchParams, setSearchParams]
    )

    const handleMetricChange = useCallback(
        (next: PolicyBranchMegaMetricMode) => {
            if (next === effectiveSelection.metric) return
            const nextParams = new URLSearchParams(searchParams)
            nextParams.set('metric', next)
            setSearchParams(nextParams, { replace: true })
        },
        [effectiveSelection.metric, searchParams, setSearchParams]
    )

    const handleTpSlModeChange = useCallback(
        (next: PolicyBranchMegaTpSlMode) => {
            if (next === effectiveSelection.tpSlMode) return
            const nextParams = new URLSearchParams(searchParams)
            nextParams.set('tpsl', next)
            setSearchParams(nextParams, { replace: true })
        },
        [effectiveSelection.tpSlMode, searchParams, setSearchParams]
    )

    const handleSlModeChange = useCallback(
        (next: PolicyBranchMegaSlMode) => {
            if (next === effectiveSelection.slMode) return
            const nextParams = new URLSearchParams(searchParams)
            nextParams.set('slmode', next)
            setSearchParams(nextParams, { replace: true })
        },
        [effectiveSelection.slMode, searchParams, setSearchParams]
    )

    const handleZonalModeChange = useCallback(
        (next: PolicyBranchMegaZonalMode) => {
            if (next === effectiveSelection.zonalMode) return
            const nextParams = new URLSearchParams(searchParams)
            nextParams.set('zonal', next)
            setSearchParams(nextParams, { replace: true })
        },
        [effectiveSelection.zonalMode, searchParams, setSearchParams]
    )

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
        return [
            displayGroup,
            {
                ...bucketGroup,
                options: bucketGroup.options
            },
            ...(effectiveSelection.bucket === 'total' ?
                [
                    {
                        ...totalBucketViewGroup,
                        options: totalBucketViewGroup.options
                    }
                ]
            :   []),
            metricGroup,
            tpSlGroup,
            slModeGroup,
            zonalGroup
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
    ])

    const sourceEndpointState = useMemo(() => {
        try {
            return {
                value: resolveReportSourceEndpoint(),
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

    const controlsErrorState = useMemo(() => {
        if (bucketState.error && !resolvedQuery) {
            return {
                title: t('policyBranchMega.page.errors.bucketViewQuery.title'),
                description: t('policyBranchMega.page.errors.bucketViewQuery.message'),
                error: bucketState.error
            }
        }

        if (bucketViewState.error && !resolvedQuery) {
            return {
                title: t('policyBranchMega.page.errors.bucketQuery.title'),
                description: t('policyBranchMega.page.errors.bucketQuery.message'),
                error: bucketViewState.error
            }
        }

        if (metricState.error && !resolvedQuery) {
            return {
                title: t('policyBranchMega.page.errors.metricQuery.title'),
                description: t('policyBranchMega.page.errors.metricQuery.message'),
                error: metricState.error
            }
        }

        if (tpSlState.error && !resolvedQuery) {
            return {
                title: t('policyBranchMega.page.errors.tpSlQuery.title'),
                description: t('policyBranchMega.page.errors.tpSlQuery.message'),
                error: tpSlState.error
            }
        }

        if (slModeState.error && !resolvedQuery) {
            return {
                title: t('policyBranchMega.page.errors.slModeQuery.title'),
                description: t('policyBranchMega.page.errors.slModeQuery.message'),
                error: slModeState.error
            }
        }

        if (zonalState.error && !resolvedQuery) {
            return {
                title: t('policyBranchMega.page.errors.zonalQuery.title'),
                description: t('policyBranchMega.page.errors.zonalQuery.message'),
                error: zonalState.error
            }
        }

        return null
    }, [
        bucketState.error,
        bucketViewState.error,
        metricState.error,
        resolvedQuery,
        slModeState.error,
        t,
        tpSlState.error,
        zonalState.error
    ])

    const reportAreaErrorState = useMemo(() => {
        if (!primaryReport) {
            return null
        }

        if (generatedAtState.error) {
            return {
                title: t('policyBranchMega.page.errors.invalidGeneratedAt.title'),
                description: t('policyBranchMega.page.errors.invalidGeneratedAt.message'),
                error: generatedAtState.error
            }
        }

        if (sourceEndpointState.error) {
            return {
                title: t('policyBranchMega.page.errors.invalidSource.title'),
                description: t('policyBranchMega.page.errors.invalidSource.message'),
                error: sourceEndpointState.error
            }
        }

        if (visibleSectionEntriesState.error) {
            return {
                title: t('policyBranchMega.page.errors.sections.title'),
                description: t('policyBranchMega.page.errors.sections.message'),
                error: visibleSectionEntriesState.error
            }
        }

        if (tableRenderedSectionsState.error) {
            return {
                title: t('policyBranchMega.page.errors.sections.title'),
                description: t('policyBranchMega.page.errors.sections.message'),
                error: tableRenderedSectionsState.error
            }
        }

        return null
    }, [
        generatedAtState.error,
        primaryReport,
        sourceEndpointState.error,
        tableRenderedSectionsState.error,
        t,
        visibleSectionEntriesState.error
    ])

    const renderHeader = () => (
        <header className={cls.hero}>
            <div>
                <Text type='h1' className={cls.heroTitle}>
                    {t('policyBranchMega.page.title')}
                </Text>
                <Text className={cls.heroSubtitle}>{t('policyBranchMega.page.subtitle')}</Text>

                <ReportViewControls groups={controlGroups} />
            </div>

            {primaryReport && sourceEndpointState.value && generatedAtState.value && (
                <ReportActualStatusCard
                    statusMode='actual'
                    statusTitle={t('policyBranchMega.page.status.publishedTitle')}
                    statusMessage={t('policyBranchMega.page.status.publishedMessage')}
                    dataSource={sourceEndpointState.value}
                    reportTitle={primaryReport.title}
                    reportId={primaryReport.id}
                    reportKind={primaryReport.kind}
                    generatedAtUtc={primaryReport.generatedAtUtc}
                />
            )}
        </header>
    )

    return (
        <div className={rootClassName}>
            {renderHeader()}

            {validationAlertState && !isValidationAlertDismissed && (
                <section className={cls.validationAlert} role='alert' aria-live='polite'>
                    <div className={cls.validationAlertHeader}>
                        <Text type='h4' className={cls.validationAlertTitle}>
                            {validationAlertState.title}
                        </Text>
                        <button
                            type='button'
                            className={cls.validationAlertDismiss}
                            onClick={() => setDismissedValidationKey(validationAlertState.key)}>
                            {t('policyBranchMega.page.validation.dismiss')}
                        </button>
                    </div>
                    <Text className={cls.validationAlertText}>{validationAlertState.description}</Text>
                    {validationAlertState.detail && (
                        <Text className={cls.validationAlertDetail}>{validationAlertState.detail}</Text>
                    )}
                </section>
            )}

            {controlsErrorState && (
                <SectionDataState
                    isError
                    error={controlsErrorState.error}
                    hasData={false}
                    onRetry={refetch}
                    title={controlsErrorState.title}
                    description={controlsErrorState.description}
                    logContext={{ source: 'policy-branch-mega-controls' }}>
                    {null}
                </SectionDataState>
            )}

            <section className={cls.overviewBlock} id={MEGA_OVERVIEW_DOM_ID}>
                <Text type='h3' className={cls.overviewTitle}>
                    {t('policyBranchMega.page.overview.whatIsReport.title')}
                </Text>
                <ul className={cls.overviewList}>
                    <li>{renderTermTooltipRichText(t('policyBranchMega.page.overview.whatIsReport.items.item1'))}</li>
                    <li>{renderTermTooltipRichText(t('policyBranchMega.page.overview.whatIsReport.items.item2'))}</li>
                    <li>{renderTermTooltipRichText(t('policyBranchMega.page.overview.whatIsReport.items.item3'))}</li>
                </ul>

                <Text type='h4' className={cls.overviewSubTitle}>
                    {t('policyBranchMega.page.overview.comparison.title')}
                </Text>
                <ul className={cls.overviewList}>
                    <li>{renderTermTooltipRichText(t('policyBranchMega.page.overview.comparison.items.policy'))}</li>
                    <li>{renderTermTooltipRichText(t('policyBranchMega.page.overview.comparison.items.branch'))}</li>
                    <li>{renderTermTooltipRichText(t('policyBranchMega.page.overview.comparison.items.slMode'))}</li>
                    <li>{renderTermTooltipRichText(t('policyBranchMega.page.overview.comparison.items.tpSlMode'))}</li>
                    <li>{renderTermTooltipRichText(t('policyBranchMega.page.overview.comparison.items.zonal'))}</li>
                    <li>
                        {renderTermTooltipRichText(t('policyBranchMega.page.overview.comparison.items.metricView'))}
                    </li>
                    <li>{renderTermTooltipRichText(t('policyBranchMega.page.overview.comparison.items.bucket'))}</li>
                </ul>

                <Text type='h4' className={cls.overviewSubTitle}>
                    {t('policyBranchMega.page.overview.reading.title')}
                </Text>
                <ul className={cls.overviewList}>
                    <li>{renderTermTooltipRichText(t('policyBranchMega.page.overview.reading.items.item1'))}</li>
                    <li>{renderTermTooltipRichText(t('policyBranchMega.page.overview.reading.items.item2'))}</li>
                    <li>{renderTermTooltipRichText(t('policyBranchMega.page.overview.reading.items.item3'))}</li>
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
                    <li>{renderTermTooltipRichText(t('policyBranchMega.page.overview.simulation.items.item1'))}</li>
                    <li>{renderTermTooltipRichText(t('policyBranchMega.page.overview.simulation.items.item2'))}</li>
                    <li>{renderTermTooltipRichText(t('policyBranchMega.page.overview.simulation.items.item3'))}</li>
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

            <SectionDataState
                isLoading={isLoading}
                isError={Boolean(isError || reportAreaErrorState)}
                error={error ?? reportAreaErrorState?.error}
                hasData={Boolean(primaryReport && !reportAreaErrorState)}
                onRetry={refetch}
                title={reportAreaErrorState?.title ?? t('policyBranchMega.page.errorTitle')}
                description={reportAreaErrorState?.description}
                loadingText={t('errors:ui.pageDataBoundary.loading', { defaultValue: 'Loading data' })}
                logContext={{ source: 'policy-branch-mega-report' }}>
                {primaryReport && !reportAreaErrorState && (
                    <>
                        {!hasLoadedReportSections ?
                            <Text>{t('policyBranchMega.page.empty')}</Text>
                        : effectiveDisplayMode === 'table' && pageTabs.length === 0 && tableRenderedSectionsState.entries.length === 0 ?
                            <Text>{t('policyBranchMega.page.emptyColumns')}</Text>
                        : effectiveDisplayMode === 'chart' ?
                            <SectionDataState
                                isLoading={loadedPartReportsState.chartIsLoading}
                                isError={Boolean(chartModelState.error)}
                                error={chartModelState.error}
                                hasData={Boolean(chartModelState.model)}
                                onRetry={refetch}
                                title={t('policyBranchMega.page.errors.chartModel.title')}
                                description={t('policyBranchMega.page.errors.chartModel.message')}
                                logContext={{ source: 'policy-branch-mega-chart' }}>
                                {chartModelState.model && (
                                    <PolicyBranchMegaChartExplorer
                                        model={chartModelState.model}
                                        termsLocale={termsLocale}
                                        translate={(key, options) => t(key, options)}
                                    />
                                )}
                            </SectionDataState>
                        :   <>
                                <div className={cls.sectionsGrid}>
                                    {tableRenderedSectionsState.entries.map(renderTableSectionEntry)}
                                </div>
                            </>
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
                    </>
                )}
            </SectionDataState>
        </div>
    )
}
