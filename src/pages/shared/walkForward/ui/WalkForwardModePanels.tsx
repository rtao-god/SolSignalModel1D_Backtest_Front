import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { PageDataState } from '@/shared/ui/errors/PageDataState'
import { ReportTableCard } from '@/shared/ui/ReportTableCard'
import { Text } from '@/shared/ui'
import { renderTermTooltipRichText } from '@/shared/ui/TermTooltip'
import type { TableRow } from '@/shared/ui/SortableTable'
import classNames from '@/shared/lib/helpers/classNames'
import {
    getDefaultModeReportSlice,
    getModeReportSlices,
    tryGetModeReportSliceDescriptor,
    type ModeSurfaceKey,
    type ModeRegistryDto,
    type ModeRegistrySliceDescriptor,
    type WalkForwardModeId,
    type WalkForwardReportSliceId
} from '@/entities/mode'
import type { PfiQueryFamily } from '@/shared/api/tanstackQueries/pfi'
import { useModeRegistryQuery } from '@/shared/api/tanstackQueries/modeRegistry'
import {
    useDirectionalWalkForwardCurrentQuery,
    useDirectionalWalkForwardMoneyQuery,
    useDirectionalWalkForwardAggregationQuery,
    useDirectionalWalkForwardFoldsQuery,
    useDirectionalWalkForwardHistoryQuery,
    useDirectionalWalkForwardModelStatsQuery,
    useDirectionalWalkForwardPfiPerModelQuery,
    useDirectionalWalkForwardPfiSlModelQuery,
    useDirectionalWalkForwardValidationQuery,
    useTbmNativeAggregationQuery,
    useTbmNativeFoldsQuery,
    useTbmNativeHistoryQuery,
    useTbmNativeMoneyQuery,
    useTbmNativeModelStatsQuery,
    useTbmNativePfiQuery,
    useTbmNativeValidationQuery,
    type BestPolicyContractDto,
    type BestPolicyPerMarginModeDto,
    type WalkForwardSlice
} from '@/shared/api/tanstackQueries/walkForwardModes'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import cls from './WalkForwardModePanels.module.scss'

interface BaseProps {
    className?: string
    mode: WalkForwardModeId
}

interface PfiProps extends BaseProps {
    family?: PfiQueryFamily
}

const FALLBACK_WALK_FORWARD_REPORT_SLICE: WalkForwardReportSliceId = 'overall'

function formatNumber(value: number): string {
    return Number.isFinite(value) ? value.toLocaleString('en-US') : '—'
}

function formatPercent(value: number): string {
    return Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : '—'
}

function formatProbability(value: number): string {
    return Number.isFinite(value) ? value.toFixed(4) : '—'
}

function requireMoneyNumber(value: number | null | undefined, fieldName: string): number {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        throw new Error(`[walk-forward-money] required finite money metric is missing or invalid. field=${fieldName}, actual=${String(value)}.`)
    }

    return value
}

function formatRequiredMoneyNumber(value: number | null | undefined, fieldName: string): string {
    return requireMoneyNumber(value, fieldName).toLocaleString('en-US')
}

function formatRequiredMetricPercent(value: number | null | undefined, fieldName: string): string {
    return `${requireMoneyNumber(value, fieldName).toFixed(2)}%`
}

function formatRequiredMetricNumber(value: number | null | undefined, fieldName: string, digits = 2): string {
    return requireMoneyNumber(value, fieldName).toFixed(digits)
}

function formatRequiredMoneyUsd(value: number | null | undefined, fieldName: string): string {
    return requireMoneyNumber(value, fieldName).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 })
}

function formatRequiredBoolean(value: boolean | null | undefined, fieldName: string): string {
    if (typeof value !== 'boolean') {
        throw new Error(`[walk-forward-money] required boolean money metric is missing or invalid. field=${fieldName}, actual=${String(value)}.`)
    }

    return value ? 'Yes' : 'No'
}

function requireMoneyString(value: string | null | undefined, fieldName: string): string {
    if (!value?.trim()) {
        throw new Error(`[walk-forward-money] required money field is missing or invalid. field=${fieldName}, actual=${String(value)}.`)
    }

    return value
}

function formatEnumLabel(value: string | null | undefined): string {
    if (!value) {
        return '—'
    }

    return value
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
}

function resolveBestPolicyContract(perMarginMode: BestPolicyPerMarginModeDto | null | undefined): BestPolicyContractDto | null {
    const cross = perMarginMode?.cross ?? null
    const isolated = perMarginMode?.isolated ?? null

    if (!cross) {
        return isolated
    }

    if (!isolated) {
        return cross
    }

    return cross.score.value >= isolated.score.value ? cross : isolated
}

function resolveMoneySliceByReportSlice<TSlice extends { slice: WalkForwardReportSliceId }>(
    slices: TSlice[] | null | undefined,
    reportSlice: WalkForwardReportSliceId
): TSlice | null {
    if (!slices || slices.length === 0) {
        return null
    }

    return slices.find(slice => slice.slice === reportSlice) ?? null
}

function formatReportSliceLabel(
    modeRegistry: ModeRegistryDto | null,
    mode: WalkForwardModeId,
    reportSlice: string
): string {
    if (!modeRegistry) {
        return reportSlice
    }

    const descriptor = tryGetModeReportSliceDescriptor(modeRegistry, mode, reportSlice)
    return descriptor?.displayLabel ?? reportSlice
}

function MetricCard({ label, value }: { label: ReactNode; value: ReactNode }) {
    return (
        <div className={cls.metricCard}>
            <div className={cls.metricLabel}>{label}</div>
            <div className={cls.metricValue}>{value}</div>
        </div>
    )
}

function WalkForwardRenderSectionBoundary({
    name,
    resetKeys,
    children
}: {
    name: string
    resetKeys: unknown[]
    children: ReactNode
}) {
    return (
        <SectionErrorBoundary
            name={name}
            resetKeys={resetKeys}
            fallback={({ error, reset }) => (
                <ErrorBlock
                    className={cls.sectionFallback}
                    compact
                    code='WF'
                    title='One report block is unavailable'
                    description='Only this block failed. Mode and slice controls remain available.'
                    details={error.message}
                    onRetry={reset}
                />
            )}>
            {children}
        </SectionErrorBoundary>
    )
}

function resolveRequestedWalkForwardReportSlice(reportSlice: WalkForwardReportSliceId | null): WalkForwardReportSliceId {
    return reportSlice ?? FALLBACK_WALK_FORWARD_REPORT_SLICE
}

function useWalkForwardReportSlice(mode: WalkForwardModeId) {
    const modeCatalogQuery = useModeRegistryQuery()
    const modeRegistry = modeCatalogQuery.data ?? null
    const availableSlices = useMemo<readonly ModeRegistrySliceDescriptor<WalkForwardModeId, WalkForwardReportSliceId>[]>(
        () =>
            modeRegistry ?
                getModeReportSlices(modeRegistry, mode) as readonly ModeRegistrySliceDescriptor<WalkForwardModeId, WalkForwardReportSliceId>[]
            :   [],
        [mode, modeRegistry]
    )
    const [reportSlice, setReportSlice] = useState<WalkForwardReportSliceId | null>(null)

    useEffect(() => {
        if (!modeRegistry || availableSlices.length === 0) {
            return
        }

        const defaultSlice = getDefaultModeReportSlice(modeRegistry, mode) as WalkForwardReportSliceId
        setReportSlice(current =>
            current && availableSlices.some(slice => slice.key === current) ? current : defaultSlice
        )
    }, [availableSlices, mode, modeRegistry])

    return {
        modeCatalogQuery,
        modeRegistry,
        availableSlices,
        reportSlice,
        setReportSlice
    } as const
}

function ReportSliceControls({
    slices,
    reportSlice,
    onReportSliceChange
}: {
    slices: readonly ModeRegistrySliceDescriptor<WalkForwardModeId, WalkForwardReportSliceId>[]
    reportSlice: WalkForwardReportSliceId | null
    onReportSliceChange: (value: WalkForwardReportSliceId) => void
}) {
    if (!reportSlice || slices.length === 0) {
        return null
    }

    return (
        <label className={cls.control}>
            <span className={cls.controlLabel}>Slice</span>
            <select
                className={cls.controlInput}
                value={reportSlice}
                onChange={event => onReportSliceChange(event.target.value as WalkForwardReportSliceId)}>
                {slices.map(slice => (
                    <option key={slice.key} value={slice.key}>
                        {slice.displayLabel}
                    </option>
                ))}
            </select>
        </label>
    )
}

export function WalkForwardModeHistoryPanel({ className, mode }: BaseProps) {
    const [slice, setSlice] = useState<WalkForwardSlice>('all')
    const {
        modeCatalogQuery,
        availableSlices,
        reportSlice,
        setReportSlice
    } = useWalkForwardReportSlice(mode)
    const requestedReportSlice = resolveRequestedWalkForwardReportSlice(reportSlice)
    const [selectedFoldId, setSelectedFoldId] = useState<string>('')
    const [fromDate, setFromDate] = useState<string>('')
    const [toDate, setToDate] = useState<string>('')

    const tbmHistoryQuery = useTbmNativeHistoryQuery({
        slice,
        reportSlice: requestedReportSlice,
        selectedFoldId: slice === 'selected_fold' ? selectedFoldId : null,
        fromDate,
        toDate
    }, { enabled: mode === 'tbm_native' && reportSlice !== null })
    const directionalHistoryQuery = useDirectionalWalkForwardHistoryQuery({
        slice,
        reportSlice: requestedReportSlice,
        selectedFoldId: slice === 'selected_fold' ? selectedFoldId : null,
        fromDate,
        toDate
    }, { enabled: mode === 'directional_walkforward' && reportSlice !== null })
    const tbmFoldsQuery = useTbmNativeFoldsQuery({ enabled: mode === 'tbm_native' })
    const directionalFoldsQuery = useDirectionalWalkForwardFoldsQuery({ enabled: mode === 'directional_walkforward' })

    const historyQuery = mode === 'tbm_native' ? tbmHistoryQuery : directionalHistoryQuery
    const foldsQuery = mode === 'tbm_native' ? tbmFoldsQuery : directionalFoldsQuery
    const tbmSummary = mode === 'tbm_native' ? tbmHistoryQuery.data?.summary ?? null : null
    const directionalSummary = mode === 'directional_walkforward' ? directionalHistoryQuery.data?.summary ?? null : null

    const historyTable = useMemo(() => {
        if (mode === 'tbm_native') {
            const data = tbmHistoryQuery.data
            if (!data) {
                return null
            }

            return {
                columns: ['Day', 'Fold', 'Predicted', 'Actual', 'Match', 'P(+1)', 'P(0)', 'P(-1)', 'Freshness', 'Serving', 'Source fold', 'Age', 'Cutoff'],
                rows: data.items.map(item => [
                    item.dayKey,
                    item.foldMetadata.foldId,
                    item.predictedClass,
                    item.actualClass,
                    item.matchFlag ? 'Yes' : 'No',
                    formatProbability(item.probabilityPositive),
                    formatProbability(item.probabilityNeutral),
                    formatProbability(item.probabilityNegative),
                    item.modelFreshness,
                    item.servingDecision,
                    item.sourceModelFoldId ?? '—',
                    item.modelAgeDays,
                    item.dataCutoffUtc
                ] satisfies TableRow)
            }
        }

        const data = directionalHistoryQuery.data
        if (!data) {
            return null
        }

        return {
            columns: ['Day', 'Fold', 'Predicted', 'Actual', 'Resolved actual', 'Technical verdict', 'Business verdict', 'Timing verdict', 'Day model', 'Micro model', 'SL risk', 'P(up)', 'P(flat)', 'P(down)', 'Freshness', 'Serving', 'Age', 'Cutoff'],
            rows: data.items.map(item => [
                item.dayKey,
                item.foldMetadata.foldId,
                item.directionalClass,
                item.actualDirectionalClass,
                formatEnumLabel(item.verdict.resolvedActualClass),
                formatEnumLabel(item.verdict.technicalVerdict),
                formatEnumLabel(item.verdict.businessVerdict),
                formatEnumLabel(item.verdict.timingVerdict),
                item.dayPredictionClass,
                item.microPredictionClass,
                item.slRiskClass,
                formatProbability(item.dayProbabilities.probabilityUp),
                formatProbability(item.dayProbabilities.probabilityFlat),
                formatProbability(item.dayProbabilities.probabilityDown),
                item.modelFreshness,
                item.servingDecision,
                item.modelAgeDays,
                item.dataCutoffUtc
            ] satisfies TableRow)
        }
    }, [historyQuery.data, mode])

    const foldOptions = foldsQuery.data?.items ?? []

    return (
        <div className={classNames(cls.page, {}, [className ?? ''])}>
            <PageDataState
                shell={
                    <div className={cls.header}>
                        <Text type='h2'>{mode === 'tbm_native' ? 'TBM Native history' : 'Directional Walk-Forward history'}</Text>
                        <Text className={cls.subtitle}>
                            Completed evaluation days only. The page reads the published walk-forward archive for the selected mode.
                        </Text>
                        <div className={cls.controls}>
                            <label className={cls.control}>
                                <span className={cls.controlLabel}>Slice</span>
                                <select className={cls.controlInput} value={slice} onChange={event => setSlice(event.target.value as WalkForwardSlice)}>
                                    <option value='all'>All</option>
                                    <option value='recent_240d'>Recent 240d</option>
                                    <option value='selected_fold'>Selected fold</option>
                                </select>
                            </label>
                            <ReportSliceControls slices={availableSlices} reportSlice={reportSlice} onReportSliceChange={setReportSlice} />
                            {slice === 'selected_fold' && (
                                <label className={cls.control}>
                                    <span className={cls.controlLabel}>Fold</span>
                                    <select className={cls.controlInput} value={selectedFoldId} onChange={event => setSelectedFoldId(event.target.value)}>
                                        <option value=''>Select fold</option>
                                        {foldOptions.map(fold => (
                                            <option key={fold.metadata.foldId} value={fold.metadata.foldId}>
                                                {fold.metadata.foldId}
                                            </option>
                                        ))}
                                    </select>
                                </label>
                            )}
                            <label className={cls.control}>
                                <span className={cls.controlLabel}>From</span>
                                <input className={cls.controlInput} type='date' value={fromDate} onChange={event => setFromDate(event.target.value)} />
                            </label>
                            <label className={cls.control}>
                                <span className={cls.controlLabel}>To</span>
                                <input className={cls.controlInput} type='date' value={toDate} onChange={event => setToDate(event.target.value)} />
                            </label>
                        </div>
                        {(tbmSummary || directionalSummary) && (
                            <div className={cls.metricsGrid}>
                                <MetricCard label='Completed days' value={formatNumber((tbmSummary ?? directionalSummary)?.completedDayCount ?? 0)} />
                                {mode === 'tbm_native' ?
                                    <>
                                        <MetricCard label='Hit rate' value={formatPercent(tbmSummary?.hitRate ?? 0)} />
                                        <MetricCard label='Fresh days' value={formatNumber(tbmSummary?.freshDayCount ?? 0)} />
                                        <MetricCard label='Stale days' value={formatNumber(tbmSummary?.staleDayCount ?? 0)} />
                                        <MetricCard label='No-model days' value={formatNumber(tbmSummary?.noModelDayCount ?? 0)} />
                                        <MetricCard label='Pre-start gap' value={formatNumber(tbmSummary?.preStartGapDays ?? 0)} />
                                    </>
                                :   <>
                                        <MetricCard label='Technical hit rate' value={formatPercent(directionalSummary?.technicalHitRate ?? 0)} />
                                        <MetricCard label='Business hit rate' value={formatPercent(directionalSummary?.businessHitRate ?? 0)} />
                                        <MetricCard label='Late correct' value={formatNumber(directionalSummary?.lateCorrectCount ?? 0)} />
                                        <MetricCard label='Late pending' value={formatNumber(directionalSummary?.latePendingCount ?? 0)} />
                                        <MetricCard label='Fresh days' value={formatNumber(directionalSummary?.freshDayCount ?? 0)} />
                                        <MetricCard label='Pre-start gap' value={formatNumber(directionalSummary?.preStartGapDays ?? 0)} />
                                    </>}
                            </div>
                        )}
                    </div>
                }
                isLoading={modeCatalogQuery.isLoading || historyQuery.isLoading || foldsQuery.isLoading}
                isError={Boolean(modeCatalogQuery.error || historyQuery.error || foldsQuery.error)}
                error={modeCatalogQuery.error ?? historyQuery.error ?? foldsQuery.error ?? null}
                hasData={Boolean(historyTable)}
                onRetry={() => {
                    void modeCatalogQuery.refetch()
                    void historyQuery.refetch()
                    void foldsQuery.refetch()
                }}
                title='History unavailable'
                loadingText='Loading history'>
                {historyTable && <ReportTableCard title='Completed evaluation days' domId={`wf-history-${mode}`} columns={historyTable.columns} rows={historyTable.rows} />}
            </PageDataState>
        </div>
    )
}

export function WalkForwardModeModelStatsPanel({ className, mode }: BaseProps) {
    const {
        modeCatalogQuery,
        modeRegistry,
        availableSlices,
        reportSlice,
        setReportSlice
    } = useWalkForwardReportSlice(mode)
    const requestedReportSlice = resolveRequestedWalkForwardReportSlice(reportSlice)
    const [viewMode, setViewMode] = useState<'technical' | 'business'>('technical')
    const tbmStatsQuery = useTbmNativeModelStatsQuery(requestedReportSlice, { enabled: mode === 'tbm_native' && reportSlice !== null })
    const directionalStatsQuery = useDirectionalWalkForwardModelStatsQuery(requestedReportSlice, { enabled: mode === 'directional_walkforward' && reportSlice !== null })
    const tbmValidationQuery = useTbmNativeValidationQuery({ enabled: mode === 'tbm_native' })
    const directionalValidationQuery = useDirectionalWalkForwardValidationQuery({ enabled: mode === 'directional_walkforward' })
    const statsQuery = mode === 'tbm_native' ? tbmStatsQuery : directionalStatsQuery
    const validationQuery = mode === 'tbm_native' ? tbmValidationQuery : directionalValidationQuery

    return (
        <div className={classNames(cls.page, {}, [className ?? ''])}>
            <PageDataState
                shell={
                    <div className={cls.header}>
                        <Text type='h2'>{mode === 'tbm_native' ? 'TBM Native model stats' : 'Directional Walk-Forward model stats'}</Text>
                        <Text className={cls.subtitle}>Published stats cards for the selected mode and report slice.</Text>
                        <div className={cls.controls}>
                            <ReportSliceControls slices={availableSlices} reportSlice={reportSlice} onReportSliceChange={setReportSlice} />
                            {mode === 'directional_walkforward' && (
                                <label className={cls.control}>
                                    <span className={cls.controlLabel}>View</span>
                                    <select
                                        className={cls.controlInput}
                                        value={viewMode}
                                        onChange={event => setViewMode(event.target.value as 'technical' | 'business')}>
                                        <option value='technical'>Technical</option>
                                        <option value='business'>Business</option>
                                    </select>
                                </label>
                            )}
                        </div>
                        {validationQuery.data && (
                            <div className={cls.metricsGrid}>
                                <MetricCard label='Completed folds' value={formatNumber(validationQuery.data.completedFoldCount)} />
                                <MetricCard label='Completed days' value={formatNumber(validationQuery.data.completedDayCount)} />
                                <MetricCard label='DSR' value={validationQuery.data.dsr.toFixed(4)} />
                                <MetricCard label='PBO status' value={validationQuery.data.pboStatus} />
                            </div>
                        )}
                    </div>
                }
                isLoading={modeCatalogQuery.isLoading || statsQuery.isLoading || validationQuery.isLoading}
                isError={Boolean(modeCatalogQuery.error || statsQuery.error || validationQuery.error)}
                error={modeCatalogQuery.error ?? statsQuery.error ?? validationQuery.error ?? null}
                hasData={Boolean(statsQuery.data)}
                onRetry={() => {
                    void modeCatalogQuery.refetch()
                    void statsQuery.refetch()
                    void validationQuery.refetch()
                }}
                title='Model stats unavailable'
                loadingText='Loading model stats'>
                <div className={cls.stack}>
                    {mode === 'tbm_native' ?
                        tbmStatsQuery.data?.cards.map(card => (
                            <WalkForwardRenderSectionBoundary key={card.slice} name={`walk-forward.model-stats.${mode}.${card.slice}`} resetKeys={[mode, viewMode, card.slice, reportSlice]}>
                                <div className={cls.stack}>
                                    <ReportTableCard title={`Class summary · ${formatReportSliceLabel(modeRegistry, mode, card.slice)}`} domId={`tbm-class-${card.slice}`} columns={['Class', 'Samples', 'Hits', 'Hit rate', 'Misses']} rows={card.classSummary.map(row => [row.class, row.sampleCount, row.hitCount, formatPercent(row.hitRate), row.missCount])} />
                                    <ReportTableCard title={`Confusion matrix · ${formatReportSliceLabel(modeRegistry, mode, card.slice)}`} domId={`tbm-confusion-${card.slice}`} columns={['Actual', 'Predicted Negative', 'Predicted Neutral', 'Predicted Positive']} rows={card.confusionMatrix.map(row => [row.actualClass, row.countNegative, row.countNeutral, row.countPositive])} />
                                    <ReportTableCard title={`Calibration · ${formatReportSliceLabel(modeRegistry, mode, card.slice)}`} domId={`tbm-calibration-${card.slice}`} columns={['Bin', 'Predicted mean', 'Realized frequency', 'Samples']} rows={card.calibration.map(row => [row.bin, formatProbability(row.predictedProbabilityMean), formatProbability(row.realizedFrequency), row.sampleCount])} />
                                </div>
                            </WalkForwardRenderSectionBoundary>
                        ))
                    :   directionalStatsQuery.data?.cards.map(card => (
                            <WalkForwardRenderSectionBoundary key={card.slice} name={`walk-forward.model-stats.${mode}.${card.slice}.${viewMode}`} resetKeys={[mode, viewMode, card.slice, reportSlice]}>
                                <div className={cls.stack}>
                                    {viewMode === 'technical' ?
                                        <>
                                            <ReportTableCard title={`Per-model metrics · ${formatReportSliceLabel(modeRegistry, mode, card.slice)}`} domId={`dwf-metrics-${card.slice}`} columns={['Model', 'Slice', 'Samples', 'Accuracy', 'Micro F1', 'Log loss']} rows={card.technical.perModelMetrics.map(row => [row.modelName, formatReportSliceLabel(modeRegistry, mode, row.slice), row.sampleCount, formatProbability(row.accuracy), formatProbability(row.microF1), formatProbability(row.logLoss)])} />
                                            <ReportTableCard title={`Directional confusion · ${formatReportSliceLabel(modeRegistry, mode, card.slice)}`} domId={`dwf-confusion-${card.slice}`} columns={['Actual', 'Predicted Down', 'Predicted Flat', 'Predicted Up']} rows={card.technical.directionalConfusionMatrix.map(row => [row.actualClass, row.countDown, row.countFlat, row.countUp])} />
                                            <ReportTableCard title={`SL metrics · ${formatReportSliceLabel(modeRegistry, mode, card.slice)}`} domId={`dwf-sl-${card.slice}`} columns={['Slice', 'Samples', 'Accuracy', 'Log loss', 'AUC']} rows={card.technical.slMetrics.map(row => [formatReportSliceLabel(modeRegistry, mode, row.slice), row.sampleCount, formatProbability(row.accuracy), formatProbability(row.logLoss), formatProbability(row.auc)])} />
                                        </>
                                    :   <>
                                            <ReportTableCard title={`Technical verdicts · ${formatReportSliceLabel(modeRegistry, mode, card.slice)}`} domId={`dwf-tech-verdicts-${card.slice}`} columns={['Verdict', 'Count', 'Rate']} rows={card.business.technicalVerdicts.map(row => [formatEnumLabel(row.verdictName), row.count, formatPercent(row.rate)])} />
                                            <ReportTableCard title={`Business verdicts · ${formatReportSliceLabel(modeRegistry, mode, card.slice)}`} domId={`dwf-business-verdicts-${card.slice}`} columns={['Verdict', 'Count', 'Rate']} rows={card.business.businessVerdicts.map(row => [formatEnumLabel(row.verdictName), row.count, formatPercent(row.rate)])} />
                                            <ReportTableCard title={`Timing verdicts · ${formatReportSliceLabel(modeRegistry, mode, card.slice)}`} domId={`dwf-timing-verdicts-${card.slice}`} columns={['Timing', 'Count', 'Rate']} rows={card.business.timingVerdicts.map(row => [formatEnumLabel(row.timingVerdict), row.count, formatPercent(row.rate)])} />
                                        </>}
                                </div>
                            </WalkForwardRenderSectionBoundary>
                        ))}
                </div>
            </PageDataState>
        </div>
    )
}

export function WalkForwardModeAggregationPanel({ className, mode }: BaseProps) {
    const {
        modeCatalogQuery,
        modeRegistry,
        availableSlices,
        reportSlice,
        setReportSlice
    } = useWalkForwardReportSlice(mode)
    const requestedReportSlice = resolveRequestedWalkForwardReportSlice(reportSlice)
    const tbmAggregationQuery = useTbmNativeAggregationQuery(requestedReportSlice, { enabled: mode === 'tbm_native' && reportSlice !== null })
    const directionalAggregationQuery = useDirectionalWalkForwardAggregationQuery(requestedReportSlice, { enabled: mode === 'directional_walkforward' && reportSlice !== null })
    const aggregationQuery = mode === 'tbm_native' ? tbmAggregationQuery : directionalAggregationQuery

    return (
        <div className={classNames(cls.page, {}, [className ?? ''])}>
            <PageDataState
                shell={
                    <div className={cls.header}>
                        <Text type='h2'>{mode === 'tbm_native' ? 'TBM Native aggregation' : 'Directional Walk-Forward aggregation'}</Text>
                        <Text className={cls.subtitle}>Published aggregation slices for the selected mode.</Text>
                        <div className={cls.controls}>
                            <ReportSliceControls slices={availableSlices} reportSlice={reportSlice} onReportSliceChange={setReportSlice} />
                        </div>
                    </div>
                }
                isLoading={modeCatalogQuery.isLoading || aggregationQuery.isLoading}
                isError={Boolean(modeCatalogQuery.error || aggregationQuery.error)}
                error={modeCatalogQuery.error ?? aggregationQuery.error ?? null}
                hasData={Boolean(aggregationQuery.data)}
                onRetry={() => {
                    void modeCatalogQuery.refetch()
                    void aggregationQuery.refetch()
                }}
                title='Aggregation unavailable'
                loadingText='Loading aggregation'>
                <div className={cls.stack}>
                    {mode === 'tbm_native' ?
                        tbmAggregationQuery.data?.sections.map(section => (
                            <WalkForwardRenderSectionBoundary key={section.sectionName} name={`walk-forward.aggregation.${mode}.${section.sectionName}`} resetKeys={[mode, reportSlice, section.sectionName]}>
                                <div className={cls.stack}>
                                    <ReportTableCard title={`Probability aggregation · ${section.sectionName}`} domId={`tbm-agg-prob-${section.sectionName}`} columns={['Slice', 'Avg P(+1)', 'Avg P(0)', 'Avg P(-1)']} rows={section.probabilityEntries.map(row => [formatReportSliceLabel(modeRegistry, mode, row.slice), formatProbability(row.avgProbabilityPositive), formatProbability(row.avgProbabilityNeutral), formatProbability(row.avgProbabilityNegative)])} />
                                    <ReportTableCard title={`Prediction vs actual confusion · ${section.sectionName}`} domId={`tbm-agg-confusion-${section.sectionName}`} columns={['Actual', 'Predicted Negative', 'Predicted Neutral', 'Predicted Positive']} rows={section.predictionVsActualConfusion.map(row => [row.actualClass, row.countNegative, row.countNeutral, row.countPositive])} />
                                    <ReportTableCard title={`Calibration summary · ${section.sectionName}`} domId={`tbm-agg-calibration-${section.sectionName}`} columns={['Bin', 'Predicted mean', 'Realized frequency', 'Samples']} rows={section.calibrationSummary.map(row => [row.bin, formatProbability(row.predictedProbabilityMean), formatProbability(row.realizedFrequency), row.sampleCount])} />
                                    <ReportTableCard title={`Strategy buckets · ${section.sectionName}`} domId={`tbm-agg-bucket-${section.sectionName}`} columns={['Bucket', 'Samples', 'Avg return', 'Hit rate']} rows={section.outcomeBuckets.map(row => [row.bucketName, row.sampleCount, formatProbability(row.avgReturn), formatPercent(row.hitRate)])} />
                                </div>
                            </WalkForwardRenderSectionBoundary>
                        ))
                    :   directionalAggregationQuery.data?.sections.map(section => (
                            <WalkForwardRenderSectionBoundary key={section.sectionName} name={`walk-forward.aggregation.${mode}.${section.sectionName}`} resetKeys={[mode, reportSlice, section.sectionName]}>
                                <div className={cls.stack}>
                                    <ReportTableCard title={`Layer probabilities · ${section.sectionName}`} domId={`dwf-agg-prob-${section.sectionName}`} columns={['Layer', 'Avg P(up)', 'Avg P(flat)', 'Avg P(down)']} rows={section.layerProbabilities.map(row => [row.layer, formatProbability(row.avgProbabilityUp), formatProbability(row.avgProbabilityFlat), formatProbability(row.avgProbabilityDown)])} />
                                    <ReportTableCard title={`Layer metrics · ${section.sectionName}`} domId={`dwf-agg-metrics-${section.sectionName}`} columns={['Layer', 'Accuracy', 'Micro F1', 'Log loss']} rows={section.layerMetrics.map(row => [row.layer, formatProbability(row.accuracy), formatProbability(row.microF1), formatProbability(row.logLoss)])} />
                                    <ReportTableCard title={`Business metrics · ${section.sectionName}`} domId={`dwf-agg-business-${section.sectionName}`} columns={['Samples', 'Technical hit rate', 'Business hit rate', 'Late correct', 'Late pending']} rows={[[section.businessMetrics.sampleCount, formatPercent(section.businessMetrics.technicalHitRate), formatPercent(section.businessMetrics.businessHitRate), section.businessMetrics.lateCorrectCount, section.businessMetrics.latePendingCount]]} />
                                    <ReportTableCard title={`Timing buckets · ${section.sectionName}`} domId={`dwf-agg-timing-${section.sectionName}`} columns={['Timing verdict', 'Samples', 'Share']} rows={section.timingBuckets.map(row => [formatEnumLabel(row.timingVerdict), row.sampleCount, formatPercent(row.share)])} />
                                    {section.latestDaysBreakdown.length > 0 && <ReportTableCard title={`Latest days breakdown · ${section.sectionName}`} domId={`dwf-agg-latest-${section.sectionName}`} columns={['Bucket', 'Samples', 'Avg return', 'Technical hit rate', 'Business hit rate']} rows={section.latestDaysBreakdown.map(row => [row.bucketName, row.sampleCount, formatProbability(row.avgReturn), formatPercent(row.technicalHitRate), formatPercent(row.businessHitRate)])} />}
                                </div>
                            </WalkForwardRenderSectionBoundary>
                        ))}
                </div>
            </PageDataState>
        </div>
    )
}

export function WalkForwardModePfiPanel({ className, mode, family = 'daily' }: PfiProps) {
    const {
        modeCatalogQuery,
        modeRegistry,
        availableSlices,
        reportSlice,
        setReportSlice
    } = useWalkForwardReportSlice(mode)
    const requestedReportSlice = resolveRequestedWalkForwardReportSlice(reportSlice)
    const tbmPfiQuery = useTbmNativePfiQuery(requestedReportSlice, { enabled: mode === 'tbm_native' && reportSlice !== null })
    const directionalPerModelQuery = useDirectionalWalkForwardPfiPerModelQuery(requestedReportSlice, { enabled: mode === 'directional_walkforward' && family !== 'sl' && reportSlice !== null })
    const directionalSlQuery = useDirectionalWalkForwardPfiSlModelQuery(requestedReportSlice, { enabled: mode === 'directional_walkforward' && family === 'sl' && reportSlice !== null })

    const query =
        mode === 'tbm_native' ? tbmPfiQuery
        : family === 'sl' ? directionalSlQuery
        : directionalPerModelQuery

    return (
        <div className={classNames(cls.page, {}, [className ?? ''])}>
            <PageDataState
                shell={
                    <div className={cls.header}>
                        <Text type='h2'>
                            {mode === 'tbm_native' ? 'TBM Native PFI' : family === 'sl' ? 'Directional Walk-Forward SL PFI' : 'Directional Walk-Forward PFI'}
                        </Text>
                        <Text className={cls.subtitle}>Permutation feature importance for the selected mode and report slice.</Text>
                        <div className={cls.controls}>
                            <ReportSliceControls slices={availableSlices} reportSlice={reportSlice} onReportSliceChange={setReportSlice} />
                        </div>
                    </div>
                }
                isLoading={modeCatalogQuery.isLoading || query.isLoading}
                isError={Boolean(modeCatalogQuery.error || query.error)}
                error={modeCatalogQuery.error ?? query.error ?? null}
                hasData={Boolean(query.data)}
                onRetry={() => {
                    void modeCatalogQuery.refetch()
                    void query.refetch()
                }}
                title='PFI unavailable'
                loadingText='Loading PFI'>
                <div className={cls.stack}>
                    {mode === 'tbm_native' &&
                        modeRegistry &&
                        tbmPfiQuery.data?.sections.map(section => (
                            <WalkForwardRenderSectionBoundary key={section.slice} name={`walk-forward.pfi.${mode}.${section.slice}`} resetKeys={[mode, family, reportSlice, section.slice]}>
                                <ReportTableCard title={`PFI · ${formatReportSliceLabel(modeRegistry, mode, section.slice)}`} domId={`tbm-pfi-${section.slice}`} columns={['Feature', 'Mean delta', 'Std delta', 'Samples']} rows={section.entries.map(row => [row.featureName, formatProbability(row.meanImportanceDelta), formatProbability(row.stdImportanceDelta), row.affectedSampleCount])} />
                            </WalkForwardRenderSectionBoundary>
                        ))}
                    {mode === 'directional_walkforward' &&
                        modeRegistry &&
                        family !== 'sl' &&
                        directionalPerModelQuery.data?.models.map(model => (
                            <div key={model.modelName} className={cls.stack}>
                                {model.slices.map(section => (
                                    <WalkForwardRenderSectionBoundary key={`${model.modelName}-${section.slice}`} name={`walk-forward.pfi.${mode}.${model.modelName}.${section.slice}`} resetKeys={[mode, family, reportSlice, model.modelName, section.slice]}>
                                        <ReportTableCard title={`${model.modelName} · ${formatReportSliceLabel(modeRegistry, mode, section.slice)}`} domId={`dwf-pfi-${model.modelName}-${section.slice}`} columns={['Feature', 'Mean delta', 'Std delta', 'Samples']} rows={section.entries.map(row => [row.featureName, formatProbability(row.meanImportanceDelta), formatProbability(row.stdImportanceDelta), row.affectedSampleCount])} />
                                    </WalkForwardRenderSectionBoundary>
                                ))}
                            </div>
                        ))}
                    {mode === 'directional_walkforward' &&
                        modeRegistry &&
                        family === 'sl' &&
                        directionalSlQuery.data?.slices.map(section => (
                            <WalkForwardRenderSectionBoundary key={section.slice} name={`walk-forward.pfi.${mode}.sl.${section.slice}`} resetKeys={[mode, family, reportSlice, section.slice]}>
                                <ReportTableCard title={`SL PFI · ${formatReportSliceLabel(modeRegistry, mode, section.slice)}`} domId={`dwf-sl-pfi-${section.slice}`} columns={['Feature', 'Mean delta', 'Std delta', 'Samples']} rows={section.entries.map(row => [row.featureName, formatProbability(row.meanImportanceDelta), formatProbability(row.stdImportanceDelta), row.affectedSampleCount])} />
                            </WalkForwardRenderSectionBoundary>
                        ))}
                </div>
            </PageDataState>
        </div>
    )
}

export function WalkForwardModeMoneyPanel({ className, mode }: BaseProps) {
    const {
        modeCatalogQuery,
        modeRegistry,
        availableSlices,
        reportSlice,
        setReportSlice
    } = useWalkForwardReportSlice(mode)
    const requestedReportSlice = resolveRequestedWalkForwardReportSlice(reportSlice)
    const tbmMoneyQuery = useTbmNativeMoneyQuery(requestedReportSlice, { enabled: mode === 'tbm_native' && reportSlice !== null })
    const directionalMoneyQuery = useDirectionalWalkForwardMoneyQuery(requestedReportSlice, { enabled: mode === 'directional_walkforward' && reportSlice !== null })
    const moneyQuery = mode === 'tbm_native' ? tbmMoneyQuery : directionalMoneyQuery
    const moneySlice = reportSlice ? resolveMoneySliceByReportSlice(moneyQuery.data?.slices ?? null, reportSlice) : null
    const bestPolicy = resolveBestPolicyContract(moneySlice?.bestPolicy.perMarginMode)

    return (
        <div className={classNames(cls.page, {}, [className ?? ''])}>
            <PageDataState
                shell={
                    <div className={cls.header}>
                        <Text type='h2'>{mode === 'tbm_native' ? 'TBM Native money' : 'Directional Walk-Forward money'}</Text>
                        <Text className={cls.subtitle}>
                            {renderTermTooltipRichText('Published [[policy|best policy]], comparison table and full capital metrics for the selected mode.')}
                        </Text>
                        <div className={cls.controls}>
                            <ReportSliceControls slices={availableSlices} reportSlice={reportSlice} onReportSliceChange={setReportSlice} />
                        </div>
                        {bestPolicy && (
                            <div className={cls.metricsGrid}>
                                <MetricCard label={renderTermTooltipRichText('Best [[policy|policy]]')} value={bestPolicy.policyName} />
                                <MetricCard label={renderTermTooltipRichText('[[branch|Branch]]')} value={bestPolicy.policyBranch} />
                                <MetricCard label={renderTermTooltipRichText('[[total-pnl|Total return]]')} value={formatRequiredMetricPercent(bestPolicy.metrics.totalPnlPct, 'bestPolicy.metrics.totalPnlPct')} />
                                <MetricCard label={renderTermTooltipRichText('[[total-pnl|Total PnL USD]]')} value={formatRequiredMoneyUsd(bestPolicy.metrics.totalPnlUsd, 'bestPolicy.metrics.totalPnlUsd')} />
                                <MetricCard label={renderTermTooltipRichText('[[drawdown|Max drawdown]]')} value={formatRequiredMetricPercent(bestPolicy.metrics.maxDdPct, 'bestPolicy.metrics.maxDdPct')} />
                                <MetricCard label={renderTermTooltipRichText('[[sharpe-ratio|Sharpe]]')} value={formatRequiredMetricNumber(bestPolicy.metrics.sharpe, 'bestPolicy.metrics.sharpe')} />
                                <MetricCard label={renderTermTooltipRichText('[[trade-count|Trades]]')} value={formatRequiredMoneyNumber(bestPolicy.metrics.tradesCount, 'bestPolicy.metrics.tradesCount')} />
                                <MetricCard label={renderTermTooltipRichText('[[start-cap|Start capital]]')} value={formatRequiredMoneyUsd(bestPolicy.metrics.startCapitalUsd, 'bestPolicy.metrics.startCapitalUsd')} />
                                <MetricCard label={renderTermTooltipRichText('[[current-balance|Equity now]]')} value={formatRequiredMoneyUsd(bestPolicy.metrics.equityNowUsd, 'bestPolicy.metrics.equityNowUsd')} />
                                <MetricCard label={renderTermTooltipRichText('[[funding|Funding net]]')} value={formatRequiredMoneyUsd(bestPolicy.metrics.fundingNetUsd, 'bestPolicy.metrics.fundingNetUsd')} />
                            </div>
                        )}
                    </div>
                }
                isLoading={modeCatalogQuery.isLoading || moneyQuery.isLoading}
                isError={Boolean(modeCatalogQuery.error || moneyQuery.error)}
                error={modeCatalogQuery.error ?? moneyQuery.error ?? null}
                hasData={Boolean(moneySlice)}
                onRetry={() => {
                    void modeCatalogQuery.refetch()
                    void moneyQuery.refetch()
                }}
                title='Money report unavailable'
                loadingText='Loading money report'>
                {moneySlice && (
                    <div className={cls.stack}>
                        {bestPolicy ?
                            <>
                                <ReportTableCard
                                    title='Best policy'
                                    domId={`wf-money-best-policy-${mode}`}
                                    columns={['[[policy|Policy]]', '[[branch|Branch]]', '[[bucket|Bucket]]', 'Slice', 'Score', 'Evaluation', '[[trade-count|Trades]]', '[[total-pnl|Total return]]', '[[total-pnl|Total PnL USD]]', '[[drawdown|MaxDD]]', '[[win-rate|Win rate]]']}
                                    rows={[[
                                        bestPolicy.policyName,
                                        bestPolicy.policyBranch,
                                        bestPolicy.bucket,
                                        formatReportSliceLabel(modeRegistry, mode, bestPolicy.slice.scopeKey),
                                        formatRequiredMetricNumber(bestPolicy.score.value, 'bestPolicy.score.value', 4),
                                        requireMoneyString(bestPolicy.evaluation.status, 'bestPolicy.evaluation.status'),
                                        formatRequiredMoneyNumber(bestPolicy.metrics.tradesCount, 'bestPolicy.metrics.tradesCount'),
                                        formatRequiredMetricPercent(bestPolicy.metrics.totalPnlPct, 'bestPolicy.metrics.totalPnlPct'),
                                        formatRequiredMoneyUsd(bestPolicy.metrics.totalPnlUsd, 'bestPolicy.metrics.totalPnlUsd'),
                                        formatRequiredMetricPercent(bestPolicy.metrics.maxDdPct, 'bestPolicy.metrics.maxDdPct'),
                                        formatRequiredMetricPercent(bestPolicy.metrics.winRate != null ? bestPolicy.metrics.winRate * 100 : null, 'bestPolicy.metrics.winRate')
                                    ]]}
                                />
                                <ReportTableCard
                                    title='Capital and funding'
                                    domId={`wf-money-capital-${mode}`}
                                    columns={['[[start-cap|Start capital]]', '[[current-balance|Equity now]]', '[[withdrawn-profit|Withdrawn]]', '[[funding|Funding net]]', '[[funding|Funding paid]]', '[[funding|Funding received]]', '[[funding|Funding events]]', '[[funding|Trades with funding]]']}
                                    rows={[[
                                        formatRequiredMoneyUsd(bestPolicy.metrics.startCapitalUsd, 'bestPolicy.metrics.startCapitalUsd'),
                                        formatRequiredMoneyUsd(bestPolicy.metrics.equityNowUsd, 'bestPolicy.metrics.equityNowUsd'),
                                        formatRequiredMoneyUsd(bestPolicy.metrics.withdrawnTotalUsd, 'bestPolicy.metrics.withdrawnTotalUsd'),
                                        formatRequiredMoneyUsd(bestPolicy.metrics.fundingNetUsd, 'bestPolicy.metrics.fundingNetUsd'),
                                        formatRequiredMoneyUsd(bestPolicy.metrics.fundingPaidUsd, 'bestPolicy.metrics.fundingPaidUsd'),
                                        formatRequiredMoneyUsd(bestPolicy.metrics.fundingReceivedUsd, 'bestPolicy.metrics.fundingReceivedUsd'),
                                        formatRequiredMoneyNumber(bestPolicy.metrics.fundingEventCount, 'bestPolicy.metrics.fundingEventCount'),
                                        formatRequiredMoneyNumber(bestPolicy.metrics.tradesWithFundingCount, 'bestPolicy.metrics.tradesWithFundingCount')
                                    ]]}
                                />
                                <ReportTableCard
                                    title='Liquidation and account health'
                                    domId={`wf-money-risk-${mode}`}
                                    columns={['[[liquidation|Had liquidation]]', '[[liquidation|Real liquidations]]', '[[liquidation|Funding liquidations]]', '[[funding|Funding]] [[bucket|bucket]] deaths', 'Mixed [[bucket|bucket]] deaths', '[[account-ruin|Account ruin count]]', '[[account-ruin|Balance dead]]']}
                                    rows={[[
                                        formatRequiredBoolean(bestPolicy.metrics.hadLiquidation, 'bestPolicy.metrics.hadLiquidation'),
                                        formatRequiredMoneyNumber(bestPolicy.metrics.realLiquidationCount, 'bestPolicy.metrics.realLiquidationCount'),
                                        formatRequiredMoneyNumber(bestPolicy.metrics.fundingLiquidationCount, 'bestPolicy.metrics.fundingLiquidationCount'),
                                        formatRequiredMoneyNumber(bestPolicy.metrics.fundingBucketDeathCount, 'bestPolicy.metrics.fundingBucketDeathCount'),
                                        formatRequiredMoneyNumber(bestPolicy.metrics.mixedBucketDeathCount, 'bestPolicy.metrics.mixedBucketDeathCount'),
                                        formatRequiredMoneyNumber(bestPolicy.metrics.accountRuinCount, 'bestPolicy.metrics.accountRuinCount'),
                                        formatRequiredBoolean(bestPolicy.metrics.balanceDead, 'bestPolicy.metrics.balanceDead')
                                    ]]}
                                />
                            </>
                        :   <div className={cls.noteCard}>
                                <Text type='h3'>No eligible best policy</Text>
                                <Text className={cls.subtitle}>
                                    {renderTermTooltipRichText('The selected slice has no eligible [[policy|policy]] after the [[trade-count|trade count]] and [[drawdown|drawdown]] [[filters|filters]]. The [[policy|policy]] ratios table still shows every simulated policy.')}
                                </Text>
                            </div>
                        }
                        <ReportTableCard
                            title='Policy ratios'
                            domId={`wf-money-ratios-${mode}`}
                            columns={['[[policy|Policy]]', 'Evaluation', '[[trade-count|Trades]]', '[[total-pnl|Total return]]', '[[total-pnl|Total PnL USD]]', '[[drawdown|MaxDD]]', '[[sharpe-ratio|Sharpe]]', '[[win-rate|Win rate]]']}
                            rows={moneySlice.policyRatios.policies.map(policy => [
                                policy.policyName,
                                requireMoneyString(policy.evaluation?.status, `${policy.policyName}.evaluation.status`),
                                formatRequiredMoneyNumber(policy.performanceMetrics.tradesCount, `${policy.policyName}.performanceMetrics.tradesCount`),
                                formatRequiredMetricPercent(policy.performanceMetrics.totalPnlPct, `${policy.policyName}.performanceMetrics.totalPnlPct`),
                                formatRequiredMoneyUsd(policy.performanceMetrics.totalPnlUsd, `${policy.policyName}.performanceMetrics.totalPnlUsd`),
                                formatRequiredMetricPercent(policy.performanceMetrics.maxDdPct, `${policy.policyName}.performanceMetrics.maxDdPct`),
                                formatRequiredMetricNumber(policy.performanceMetrics.sharpe, `${policy.policyName}.performanceMetrics.sharpe`),
                                formatRequiredMetricPercent(policy.performanceMetrics.winRate != null ? policy.performanceMetrics.winRate * 100 : null, `${policy.policyName}.performanceMetrics.winRate`)
                            ])}
                        />
                    </div>
                )}
            </PageDataState>
        </div>
    )
}

export function WalkForwardModeCurrentPredictionPanel({ className, mode }: BaseProps) {
    const directionalCurrentQuery = useDirectionalWalkForwardCurrentQuery({ enabled: mode === 'directional_walkforward' })

    if (mode !== 'directional_walkforward') {
        return (
            <div className={classNames(cls.page, {}, [className ?? ''])}>
                <div className={cls.noteCard}>
                    <Text type='h2'>TBM Native</Text>
                    <Text className={cls.subtitle}>
                        TBM Native does not have a live current snapshot. This route shows the money surface for the latest published walk-forward artifacts instead.
                    </Text>
                </div>
            </div>
        )
    }

    const current = directionalCurrentQuery.data

    return (
        <div className={classNames(cls.page, {}, [className ?? ''])}>
            <PageDataState
                shell={
                    <div className={cls.header}>
                        <Text type='h2'>Directional Walk-Forward current snapshot</Text>
                        <Text className={cls.subtitle}>
                            Latest completed evaluation day from the published Directional Walk-Forward history archive.
                        </Text>
                        {current && (
                            <div className={cls.metricsGrid}>
                                <MetricCard label='Day' value={current.dayKey} />
                                <MetricCard label='Fold' value={current.foldMetadata.foldId} />
                                <MetricCard label='Technical verdict' value={formatEnumLabel(current.verdict.technicalVerdict)} />
                                <MetricCard label='Business verdict' value={formatEnumLabel(current.verdict.businessVerdict)} />
                                <MetricCard label='Timing verdict' value={formatEnumLabel(current.verdict.timingVerdict)} />
                                <MetricCard label='Timing confirmed by' value={current.verdict.timingConfirmedByDayKeyUtc ?? '—'} />
                            </div>
                        )}
                    </div>
                }
                isLoading={directionalCurrentQuery.isLoading}
                isError={directionalCurrentQuery.isError}
                error={directionalCurrentQuery.error ?? null}
                hasData={Boolean(current)}
                onRetry={() => void directionalCurrentQuery.refetch()}
                title='Current snapshot unavailable'
                loadingText='Loading current snapshot'>
                {current && (
                    <div className={cls.stack}>
                        <ReportTableCard
                            title='Directional verdict'
                            domId='dwf-current-verdict'
                            columns={['Predicted', 'Actual', 'Resolved actual', 'Day model', 'Micro model', 'SL risk', 'Freshness', 'Serving', 'Source fold', 'Age', 'Cutoff']}
                            rows={[[
                                current.directionalClass,
                                current.actualDirectionalClass,
                                formatEnumLabel(current.verdict.resolvedActualClass),
                                current.dayPredictionClass,
                                current.microPredictionClass,
                                current.slRiskClass,
                                current.modelFreshness,
                                current.servingDecision,
                                current.sourceModelFoldId ?? '—',
                                current.modelAgeDays,
                                current.dataCutoffUtc
                            ]]}
                        />
                        <ReportTableCard
                            title='Probabilities'
                            domId='dwf-current-probabilities'
                            columns={['Layer', 'P(up)', 'P(flat)', 'P(down)']}
                            rows={[
                                ['Day', formatProbability(current.dayProbabilities.probabilityUp), formatProbability(current.dayProbabilities.probabilityFlat), formatProbability(current.dayProbabilities.probabilityDown)],
                                ['Micro', formatProbability(current.microProbabilities.probabilityUp), formatProbability(current.microProbabilities.probabilityFlat), formatProbability(current.microProbabilities.probabilityDown)]
                            ]}
                        />
                    </div>
                )}
            </PageDataState>
        </div>
    )
}

function renderWalkForwardModeSurface(mode: WalkForwardModeId, surfaceKey: ModeSurfaceKey, className?: string) {
    switch (surfaceKey) {
        case 'current_snapshot':
            return <WalkForwardModeCurrentPredictionPanel className={className} mode={mode} />
        case 'money':
            return <WalkForwardModeMoneyPanel className={className} mode={mode} />
        case 'history':
            return <WalkForwardModeHistoryPanel className={className} mode={mode} />
        case 'model_stats':
            return <WalkForwardModeModelStatsPanel className={className} mode={mode} />
        case 'aggregation':
            return <WalkForwardModeAggregationPanel className={className} mode={mode} />
        case 'pfi_per_model':
            return <WalkForwardModePfiPanel className={className} mode={mode} family='daily' />
        case 'pfi_sl_model':
            return <WalkForwardModePfiPanel className={className} mode={mode} family='sl' />
        default:
            throw new Error(
                `[walk-forward-mode-panels] unsupported surface key. mode=${mode}; surfaceKey=${surfaceKey}; requiredAction=extend the owner walk-forward surface renderer intentionally.`
            )
    }
}

export function WalkForwardModeSurfaceStack({
    className,
    mode,
    surfaceKeys
}: {
    className?: string
    mode: WalkForwardModeId
    surfaceKeys: readonly ModeSurfaceKey[]
}) {
    if (surfaceKeys.length === 0) {
        throw new Error(
            `[walk-forward-mode-panels] surface stack is empty. mode=${mode}; requiredAction=publish at least one walk-forward surface for the route binding.`
        )
    }

    return (
        <div className={classNames(cls.page, {}, [className ?? ''])}>
            {surfaceKeys.map(surfaceKey => (
                <div key={`${mode}-${surfaceKey}`} className={cls.stack}>
                    {renderWalkForwardModeSurface(mode, surfaceKey)}
                </div>
            ))}
        </div>
    )
}
