import type { TableSectionDto } from '@/shared/types/report.types'
import { normalizePolicyBranchMegaTitle } from '@/shared/utils/policyBranchMegaTabs'
import { POLICY_BRANCH_MEGA_TOTAL_RETURN_METRIC_KEYS } from '@/shared/utils/policyBranchMegaProfitColumns'

export type PolicyBranchMegaChartMetricKind = 'percent' | 'money' | 'count' | 'number' | 'flag'
export type PolicyBranchMegaChartRiskState = 'safe' | 'negative' | 'liquidation' | 'ruin'

export interface PolicyBranchMegaChartMetricDescriptor {
    key: string
    title: string
    sourceColumn: string
    part: number
    kind: PolicyBranchMegaChartMetricKind
    availableValueCount: number
    missingValueCount: number
}

export interface PolicyBranchMegaChartPartDescriptor {
    part: number
    title: string
    columns: string[]
    metrics: PolicyBranchMegaChartMetricDescriptor[]
}

export interface PolicyBranchMegaChartRow {
    id: string
    policy: string
    branch: string
    slMode: string | null
    label: string
    shortLabel: string
    searchText: string
    values: Record<string, string>
    numericValues: Record<string, number>
    riskState: PolicyBranchMegaChartRiskState
}

export interface PolicyBranchMegaChartModel {
    parts: PolicyBranchMegaChartPartDescriptor[]
    rows: PolicyBranchMegaChartRow[]
    metrics: PolicyBranchMegaChartMetricDescriptor[]
    branchOptions: string[]
    slModeOptions: string[]
}

interface PolicyBranchMegaChartRowBuilder {
    id: string
    policy: string
    branch: string
    slMode: string | null
    values: Record<string, string>
    numericValues: Record<string, number>
}

interface CompositeMetricDescriptorDraft {
    key: string
    title: string
}

interface CompositeMetricDraft {
    sourceColumn: string
    metrics: readonly CompositeMetricDescriptorDraft[]
    tokenSeparator?: '/' | '|'
    singleValueExpansion?: 'repeat-to-all'
}

const PART_TAG_REGEX = /\[PART\s+(\d+)\/(\d+)\]/i
const ROW_KEY_SEPARATOR = '\u001e'

const DEFAULT_PREFERRED_METRICS_BY_PART = new Map<number, readonly string[]>([
    [1, ['TotalPnl%', 'Wealth%', 'OnExch%', 'MaxDD%', 'Trade%']],
    [2, ['HadLiq', 'BalMin%', 'AccRuin', 'ReqGain%']],
    [3, ['AvgDay%', 'Long $', 'Short $', 'EODExit%']]
])

const COMPOSITE_METRICS = new Map<string, CompositeMetricDraft>([
    [
        'MaxDD_Active% / Days',
        {
            sourceColumn: 'MaxDD_Active% / Days',
            metrics: [
                { key: 'MaxDD_Active% / Days::pct', title: 'MaxDD active %' },
                { key: 'MaxDD_Active% / Days::days', title: 'MaxDD active Days' }
            ]
        }
    ],
    [
        'Lev avg / min / max',
        {
            sourceColumn: 'Lev avg / min / max',
            singleValueExpansion: 'repeat-to-all',
            metrics: [
                { key: 'Lev avg / min / max::avg', title: 'Lev avg' },
                { key: 'Lev avg / min / max::min', title: 'Lev min' },
                { key: 'Lev avg / min / max::max', title: 'Lev max' }
            ]
        }
    ],
    [
        'Lev p50 / p90',
        {
            sourceColumn: 'Lev p50 / p90',
            metrics: [
                { key: 'Lev p50 / p90::p50', title: 'Lev p50' },
                { key: 'Lev p50 / p90::p90', title: 'Lev p90' }
            ]
        }
    ],
    [
        'Cap avg / min / max',
        {
            sourceColumn: 'Cap avg / min / max',
            metrics: [
                { key: 'Cap avg / min / max::avg', title: 'Cap avg' },
                { key: 'Cap avg / min / max::min', title: 'Cap min' },
                { key: 'Cap avg / min / max::max', title: 'Cap max' }
            ]
        }
    ],
    [
        'Cap p50 / p90',
        {
            sourceColumn: 'Cap p50 / p90',
            metrics: [
                { key: 'Cap p50 / p90::p50', title: 'Cap p50' },
                { key: 'Cap p50 / p90::p90', title: 'Cap p90' }
            ]
        }
    ],
    [
        'Exposure% (avg / p50 / p90 / p99 / max)',
        {
            sourceColumn: 'Exposure% (avg / p50 / p90 / p99 / max)',
            metrics: [
                { key: 'Exposure% (avg / p50 / p90 / p99 / max)::avg', title: 'Exposure avg%' },
                { key: 'Exposure% (avg / p50 / p90 / p99 / max)::p50', title: 'Exposure p50%' },
                { key: 'Exposure% (avg / p50 / p90 / p99 / max)::p90', title: 'Exposure p90%' },
                { key: 'Exposure% (avg / p50 / p90 / p99 / max)::p99', title: 'Exposure p99%' },
                { key: 'Exposure% (avg / p50 / p90 / p99 / max)::max', title: 'Exposure max%' }
            ]
        }
    ],
    [
        'HighExposureTr% (>=20 / 50)',
        {
            sourceColumn: 'HighExposureTr% (>=20 / 50)',
            metrics: [
                { key: 'HighExposureTr% (>=20 / 50)::gte20', title: 'HighExposureTr >=20%' },
                { key: 'HighExposureTr% (>=20 / 50)::gte50', title: 'HighExposureTr >=50%' }
            ]
        }
    ],
    [
        'DailyTP%',
        {
            sourceColumn: 'DailyTP%',
            metrics: [
                { key: 'DailyTP%::avg', title: 'DailyTP avg%' },
                { key: 'DailyTP%::min', title: 'DailyTP min%' },
                { key: 'DailyTP%::max', title: 'DailyTP max%' }
            ]
        }
    ],
    [
        'DailySL%',
        {
            sourceColumn: 'DailySL%',
            metrics: [
                { key: 'DailySL%::avg', title: 'DailySL avg%' },
                { key: 'DailySL%::min', title: 'DailySL min%' },
                { key: 'DailySL%::max', title: 'DailySL max%' }
            ]
        }
    ],
    [
        'Miss',
        {
            sourceColumn: 'Miss',
            tokenSeparator: '|',
            metrics: [
                { key: 'Miss::weekday', title: 'Miss weekdays' },
                { key: 'Miss::weekend', title: 'Miss weekends' }
            ]
        }
    ]
])

function parseFiniteNumberOrNull(raw: string | undefined): number | null {
    if (raw == null) {
        return null
    }

    const normalized = raw.trim().replace(/\s+/g, '').replace(',', '.')
    if (!normalized || normalized === '—' || normalized === 'нетданных' || normalized === 'nodata') {
        return null
    }

    const value = Number(normalized)
    if (!Number.isFinite(value)) {
        return null
    }

    return value
}

function parseBooleanLikeNumberOrNull(raw: string | undefined): number | null {
    const normalized = raw?.trim().toLowerCase()
    if (!normalized) {
        return null
    }

    if (normalized === 'true' || normalized === 'yes') {
        return 1
    }

    if (normalized === 'false' || normalized === 'no') {
        return 0
    }

    return null
}

function parseMetricNumberOrNull(raw: string | undefined): number | null {
    const numericValue = parseFiniteNumberOrNull(raw)
    if (numericValue !== null) {
        return numericValue
    }

    return parseBooleanLikeNumberOrNull(raw)
}

function parseCompositeMetricValues(raw: string, definition: CompositeMetricDraft): number[] | null {
    const normalized = raw.trim()
    if (!normalized || normalized === '—' || normalized === 'нет данных' || normalized === 'no data') {
        return null
    }

    const tokenSeparator = definition.tokenSeparator ?? '/'
    const tokens = normalized
        .split(tokenSeparator)
        .map(token => token.trim())
        .filter(token => token.length > 0)

    if (tokens.length === 1 && definition.singleValueExpansion === 'repeat-to-all') {
        // Для shorthand вида "1" chart-модель принимает только явно разрешённые колонки,
        // где одно значение доменно означает совпадение всех агрегатов.
        const value = parseMetricNumberOrNull(tokens[0])
        if (value === null) {
            throw new Error(
                `[policy-branch-mega] composite metric token is not numeric. column=${definition.sourceColumn}, raw=${raw}, token=${tokens[0]}.`
            )
        }

        return definition.metrics.map(() => value)
    }

    if (tokens.length !== definition.metrics.length) {
        throw new Error(
            `[policy-branch-mega] composite metric token count mismatch. column=${definition.sourceColumn}, raw=${raw}, expected=${definition.metrics.length}, actual=${tokens.length}.`
        )
    }

    const parsed = tokens.map(token => {
        const value = parseMetricNumberOrNull(token)
        if (value === null) {
            throw new Error(
                `[policy-branch-mega] composite metric token is not numeric. column=${definition.sourceColumn}, raw=${raw}, token=${token}.`
            )
        }

        return value
    })

    return parsed
}

function resolveMetricKind(key: string): PolicyBranchMegaChartMetricKind {
    const normalized = key.trim()

    if (normalized.includes('$')) {
        return 'money'
    }

    if (normalized.includes('%')) {
        return 'percent'
    }

    if (
        normalized.endsWith('Days') ||
        normalized.endsWith('Tr') ||
        normalized.endsWith(' n') ||
        normalized === 'Tr' ||
        normalized === 'CapAp' ||
        normalized === 'CapSk' ||
        normalized === 'RecovSignals' ||
        normalized === 'HorizonDays' ||
        normalized === 'RealLiq#'
    ) {
        return 'count'
    }

    if (
        normalized === 'HadLiq' ||
        normalized === 'AccRuin' ||
        normalized === 'RealLiq' ||
        normalized === 'Recovered' ||
        normalized === 'BalDead'
    ) {
        return 'flag'
    }

    return 'number'
}

function resolvePartNumberFromTitle(title: string | undefined): number {
    const normalized = normalizePolicyBranchMegaTitle(title)
    if (!normalized) {
        throw new Error('[policy-branch-mega] chart model cannot resolve part number from empty title.')
    }

    const match = normalized.match(PART_TAG_REGEX)
    if (!match?.[1]) {
        throw new Error(`[policy-branch-mega] chart model cannot find [PART x/y] tag in title=${normalized}.`)
    }

    const part = Number(match[1])
    if (!Number.isInteger(part) || part < 1) {
        throw new Error(`[policy-branch-mega] chart model resolved invalid part number from title=${normalized}.`)
    }

    return part
}

function buildRowId(policy: string, branch: string, slMode: string | null): string {
    if (!slMode) {
        return `${policy}${ROW_KEY_SEPARATOR}${branch}`
    }

    return `${policy}${ROW_KEY_SEPARATOR}${branch}${ROW_KEY_SEPARATOR}${slMode}`
}

function ensureRequiredRowField(value: string | undefined, fieldName: 'Policy' | 'Branch'): string {
    const normalized = value?.trim()
    if (!normalized) {
        throw new Error(`[policy-branch-mega] chart model row is missing required field=${fieldName}.`)
    }

    return normalized
}

function buildMetricDraftsForColumn(column: string): CompositeMetricDescriptorDraft[] {
    const composite = COMPOSITE_METRICS.get(column)
    if (composite) {
        return [...composite.metrics]
    }

    return [{ key: column, title: column }]
}

function sortRows(left: PolicyBranchMegaChartRow, right: PolicyBranchMegaChartRow): number {
    const policyCompare = left.policy.localeCompare(right.policy)
    if (policyCompare !== 0) {
        return policyCompare
    }

    const branchCompare = left.branch.localeCompare(right.branch)
    if (branchCompare !== 0) {
        return branchCompare
    }

    return (left.slMode ?? '').localeCompare(right.slMode ?? '')
}

function resolveRiskState(row: Pick<PolicyBranchMegaChartRow, 'numericValues'>): PolicyBranchMegaChartRiskState {
    const accRuin = row.numericValues.AccRuin ?? 0
    if (accRuin > 0) {
        return 'ruin'
    }

    const hadLiq = row.numericValues.HadLiq ?? 0
    if (hadLiq > 0) {
        return 'liquidation'
    }

    for (const metricKey of POLICY_BRANCH_MEGA_TOTAL_RETURN_METRIC_KEYS) {
        const totalReturn = row.numericValues[metricKey]
        if (typeof totalReturn === 'number') {
            return totalReturn < 0 ? 'negative' : 'safe'
        }
    }

    return 'safe'
}

function buildMetricCounts(
    rows: readonly PolicyBranchMegaChartRow[],
    metricKeys: readonly string[]
): Map<string, { available: number; missing: number }> {
    const counts = new Map<string, { available: number; missing: number }>()

    metricKeys.forEach(metricKey => {
        let available = 0

        rows.forEach(row => {
            if (typeof row.numericValues[metricKey] === 'number') {
                available += 1
            }
        })

        counts.set(metricKey, {
            available,
            missing: rows.length - available
        })
    })

    return counts
}

/**
 * Строит единый chart dataset из трёх секций mega-таблицы.
 * Модель объединяет строки по Policy/Branch/SL Mode и дополнительно
 * распаковывает составные колонки avg/min/max и p50/p90 в отдельные метрики.
 */
export function buildPolicyBranchMegaChartModel(sections: readonly TableSectionDto[]): PolicyBranchMegaChartModel {
    if (!sections || sections.length === 0) {
        throw new Error('[policy-branch-mega] chart model cannot be built from empty sections list.')
    }

    const partDrafts = new Map<
        number,
        { part: number; title: string; columns: string[]; metricDrafts: CompositeMetricDescriptorDraft[] }
    >()
    const rowBuilders = new Map<string, PolicyBranchMegaChartRowBuilder>()
    const allMetricDrafts: PolicyBranchMegaChartMetricDescriptor[] = []

    sections.forEach(section => {
        const columns = section.columns ?? []
        if (columns.length === 0) {
            throw new Error('[policy-branch-mega] chart model cannot use a section without columns.')
        }

        const part = resolvePartNumberFromTitle(section.title)
        const partDraft = partDrafts.get(part)

        if (!partDraft) {
            const metricDrafts = columns.flatMap(column => buildMetricDraftsForColumn(column))

            partDrafts.set(part, {
                part,
                title: normalizePolicyBranchMegaTitle(section.title),
                columns: [...columns],
                metricDrafts
            })

            metricDrafts.forEach(metric => {
                allMetricDrafts.push({
                    key: metric.key,
                    title: metric.title,
                    sourceColumn:
                        columns.find(column =>
                            buildMetricDraftsForColumn(column).some(draft => draft.key === metric.key)
                        ) ?? metric.title,
                    part,
                    kind: resolveMetricKind(metric.title),
                    availableValueCount: 0,
                    missingValueCount: 0
                })
            })
        }

        ;(section.rows ?? []).forEach((row, rowIndex) => {
            if (!Array.isArray(row) || row.length < columns.length) {
                throw new Error(
                    `[policy-branch-mega] chart model row is malformed. section=${section.title ?? 'n/a'}, row=${rowIndex}.`
                )
            }

            const valuesByColumn = new Map<string, string>()
            columns.forEach((column, columnIndex) => {
                valuesByColumn.set(column, String(row[columnIndex] ?? '').trim())
            })

            const policy = ensureRequiredRowField(valuesByColumn.get('Policy'), 'Policy')
            const branch = ensureRequiredRowField(valuesByColumn.get('Branch'), 'Branch')
            const slModeValue = valuesByColumn.get('SL Mode')?.trim() || null
            const rowId = buildRowId(policy, branch, slModeValue)

            const rowBuilder = rowBuilders.get(rowId) ?? {
                id: rowId,
                policy,
                branch,
                slMode: slModeValue,
                values: {},
                numericValues: {}
            }

            if (rowBuilder.policy !== policy || rowBuilder.branch !== branch || rowBuilder.slMode !== slModeValue) {
                throw new Error(
                    `[policy-branch-mega] chart model detected conflicting row identity. rowId=${rowId}, section=${section.title ?? 'n/a'}, row=${rowIndex}.`
                )
            }

            columns.forEach(column => {
                const rawValue = valuesByColumn.get(column) ?? ''
                const previousValue = rowBuilder.values[column]

                if (typeof previousValue === 'string' && previousValue.length > 0 && previousValue !== rawValue) {
                    throw new Error(
                        `[policy-branch-mega] chart model detected conflicting raw value. rowId=${rowId}, column=${column}, prev=${previousValue}, next=${rawValue}.`
                    )
                }

                rowBuilder.values[column] = rawValue

                const composite = COMPOSITE_METRICS.get(column)
                if (composite) {
                    const values = parseCompositeMetricValues(rawValue, composite)
                    if (values) {
                        composite.metrics.forEach((metric, metricIndex) => {
                            rowBuilder.numericValues[metric.key] = values[metricIndex]!
                        })
                    }
                    return
                }

                const scalarValue = parseMetricNumberOrNull(rawValue)
                if (scalarValue !== null) {
                    rowBuilder.numericValues[column] = scalarValue
                }
            })

            rowBuilders.set(rowId, rowBuilder)
        })
    })

    const rows = [...rowBuilders.values()]
        .map<PolicyBranchMegaChartRow>(rowBuilder => {
            const labelParts = [rowBuilder.policy, rowBuilder.branch, rowBuilder.slMode].filter(Boolean)

            return {
                id: rowBuilder.id,
                policy: rowBuilder.policy,
                branch: rowBuilder.branch,
                slMode: rowBuilder.slMode,
                label: labelParts.join(' · '),
                shortLabel: [rowBuilder.policy, rowBuilder.branch].join(' · '),
                searchText: labelParts.join(' ').toLowerCase(),
                values: rowBuilder.values,
                numericValues: rowBuilder.numericValues,
                riskState: resolveRiskState({ numericValues: rowBuilder.numericValues })
            }
        })
        .sort(sortRows)

    const metricKeys = allMetricDrafts.map(metric => metric.key)
    const metricCounts = buildMetricCounts(rows, metricKeys)

    const metrics = allMetricDrafts
        .map(metric => {
            const counts = metricCounts.get(metric.key)
            if (!counts) {
                throw new Error(`[policy-branch-mega] chart model missing metric counts for key=${metric.key}.`)
            }

            return {
                ...metric,
                availableValueCount: counts.available,
                missingValueCount: counts.missing
            }
        })
        .filter(metric => metric.availableValueCount > 0)

    const metricsByKey = new Map(metrics.map(metric => [metric.key, metric]))

    const parts = [...partDrafts.values()]
        .sort((left, right) => left.part - right.part)
        .map<PolicyBranchMegaChartPartDescriptor>(part => ({
            part: part.part,
            title: part.title,
            columns: part.columns,
            metrics: part.metricDrafts
                .map(metricDraft => metricsByKey.get(metricDraft.key))
                .filter((metric): metric is PolicyBranchMegaChartMetricDescriptor => Boolean(metric))
        }))

    if (parts.length === 0) {
        throw new Error('[policy-branch-mega] chart model has no parts after build.')
    }

    return {
        parts,
        rows,
        metrics,
        branchOptions: Array.from(new Set(rows.map(row => row.branch))).sort((left, right) =>
            left.localeCompare(right)
        ),
        slModeOptions: Array.from(
            new Set(
                rows
                    .map(row => row.slMode)
                    .filter((rowSlMode): rowSlMode is string => typeof rowSlMode === 'string' && rowSlMode.length > 0)
            )
        ).sort((left, right) => left.localeCompare(right))
    }
}

export function resolvePolicyBranchMegaChartMetric(
    model: PolicyBranchMegaChartModel,
    key: string
): PolicyBranchMegaChartMetricDescriptor {
    const metric = model.metrics.find(item => item.key === key)
    if (!metric) {
        throw new Error(`[policy-branch-mega] chart metric is not available: ${key}.`)
    }

    return metric
}

export function resolvePolicyBranchMegaChartPart(
    model: PolicyBranchMegaChartModel,
    part: number
): PolicyBranchMegaChartPartDescriptor {
    const resolvedPart = model.parts.find(item => item.part === part)
    if (!resolvedPart) {
        throw new Error(`[policy-branch-mega] chart part is not available: ${part}.`)
    }

    return resolvedPart
}

export function resolvePreferredPolicyBranchMegaMetricKey(part: PolicyBranchMegaChartPartDescriptor): string {
    const preferredKeys = DEFAULT_PREFERRED_METRICS_BY_PART.get(part.part) ?? []

    for (const preferredKey of preferredKeys) {
        if (part.metrics.some(metric => metric.key === preferredKey)) {
            return preferredKey
        }
    }

    const fallbackMetric = part.metrics[0]
    if (!fallbackMetric) {
        throw new Error(`[policy-branch-mega] chart part=${part.part} has no metrics.`)
    }

    return fallbackMetric.key
}

export function formatPolicyBranchMegaChartMetricValue(
    metric: Pick<PolicyBranchMegaChartMetricDescriptor, 'kind'>,
    value: number,
    formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string
): string {
    if (metric.kind === 'percent') {
        return `${formatNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}%`
    }

    if (metric.kind === 'money') {
        return `${formatNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} $`
    }

    if (metric.kind === 'count' || metric.kind === 'flag') {
        return formatNumber(value, { maximumFractionDigits: 0 })
    }

    return formatNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 3 })
}
