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
import type { TableSectionDto } from '@/shared/types/report.types'
import { usePolicyBranchMegaModeMoneySummaryQuery } from '@/shared/api/tanstackQueries/policyBranchMega'
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
    type WalkForwardSlice
} from '@/shared/api/tanstackQueries/walkForwardModes'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import { ModeMoneyBlocks, ModeMoneySummaryPanel } from '@/pages/shared/modeMoney'
import {
    buildModeMoneyDataFromWalkForwardBestPolicy,
    resolveBestPolicyContract,
    resolveModeMoneyMetricLabel,
    resolveMoneySliceByReportSlice
} from '@/pages/shared/modeMoney'
import cls from './WalkForwardModePanels.module.scss'

interface BaseProps {
    className?: string
    mode: WalkForwardModeId
}

interface PfiProps extends BaseProps {
    family?: PfiQueryFamily
}

type RequiredPolicyBranchMegaTableSection = TableSectionDto & {
    columns: string[]
    rows: string[][]
}

function formatNumber(value: number): string {
    if (!Number.isFinite(value)) {
        throw new Error(`[walk-forward-mode-panels] numeric value is not finite. formatter=formatNumber; value=${value}; requiredAction=fix the published owner metric instead of rendering a fallback.`)
    }

    return value.toLocaleString('en-US')
}

function formatPercent(value: number): string {
    if (!Number.isFinite(value)) {
        throw new Error(`[walk-forward-mode-panels] numeric value is not finite. formatter=formatPercent; value=${value}; requiredAction=fix the published owner metric instead of rendering a fallback.`)
    }

    return `${(value * 100).toFixed(2)}%`
}

function formatProbability(value: number): string {
    if (!Number.isFinite(value)) {
        throw new Error(`[walk-forward-mode-panels] numeric value is not finite. formatter=formatProbability; value=${value}; requiredAction=fix the published owner metric instead of rendering a fallback.`)
    }

    return value.toFixed(4)
}

function formatUsd(value: number): string {
    if (!Number.isFinite(value)) {
        throw new Error(`[walk-forward-mode-panels] numeric value is not finite. formatter=formatUsd; value=${value}; requiredAction=fix the published owner metric instead of rendering a fallback.`)
    }

    return value.toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        maximumFractionDigits: 2
    })
}

function formatEnumLabel(value: string | null | undefined): string {
    if (!value) {
        throw new Error('[walk-forward-mode-panels] enum label value is missing. owner=walk-forward published validation/history contracts; expected=canonical non-empty enum token; actual=empty value; requiredAction=regenerate the published owner artifacts or fix the backend producer.')
    }

    return value
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
}

function formatRequiredReference(value: string | null | undefined, fieldName: string): string {
    if (!value) {
        throw new Error(`[walk-forward-mode-panels] required reference is missing. owner=walk-forward published read-model contracts; field=${fieldName}; expected=non-empty value; actual=empty; requiredAction=fix the backend producer and regenerate the published artifacts.`)
    }

    return value
}

function formatTimingConfirmedByDayKey(value: string | null | undefined, timingVerdict: string): string {
    if (timingVerdict === 'LateCorrect') {
        return formatRequiredReference(value, 'verdict.timingConfirmedByDayKeyUtc')
    }

    if (value) {
        throw new Error(`[walk-forward-mode-panels] timing confirmation day is present for a non-late-correct verdict. owner=directional verdict contract; timingVerdict=${timingVerdict}; timingConfirmedByDayKeyUtc=${value}; expected=null unless timingVerdict=LateCorrect; requiredAction=fix DirectionalVerdict owner output and republish artifacts.`)
    }

    return 'Not applicable'
}

function formatPolicyEvaluationStatus(value: string | null | undefined, policyName: string): string {
    if (!value) {
        throw new Error(`[walk-forward-mode-panels] policy evaluation status is missing. owner=walk-forward policy ratios; policy=${policyName}; expected=PolicyEvaluationDto.status; actual=empty; requiredAction=regenerate money artifacts from the owner policy evaluator.`)
    }

    return value
}

function formatReportSliceLabel(
    modeRegistry: ModeRegistryDto | null,
    mode: WalkForwardModeId,
    reportSlice: string
): string {
    if (!modeRegistry) {
        throw new Error(`[walk-forward-mode-panels] mode registry is missing while rendering report slice label. owner=mode registry; mode=${mode}; reportSlice=${reportSlice}; expected=loaded ModeRegistryDto; requiredAction=fix the mode registry query before rendering slice-dependent reports.`)
    }

    const descriptor = tryGetModeReportSliceDescriptor(modeRegistry, mode, reportSlice)
    if (!descriptor) {
        throw new Error(`[walk-forward-mode-panels] report slice descriptor is missing. owner=mode registry; mode=${mode}; reportSlice=${reportSlice}; expected=descriptor with display label; requiredAction=publish this slice in the owner mode registry.`)
    }

    return descriptor.displayLabel
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
    const [selectedFoldId, setSelectedFoldId] = useState<string>('')
    const [fromDate, setFromDate] = useState<string>('')
    const [toDate, setToDate] = useState<string>('')

    const tbmHistoryQuery = useTbmNativeHistoryQuery({
        slice,
        reportSlice,
        selectedFoldId: slice === 'selected_fold' ? selectedFoldId : null,
        fromDate,
        toDate
    }, { enabled: mode === 'tbm_native' && reportSlice !== null })
    const directionalHistoryQuery = useDirectionalWalkForwardHistoryQuery({
        slice,
        reportSlice,
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
                    formatRequiredReference(item.sourceModelFoldId, 'tbm.history.sourceModelFoldId'),
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
                                {tbmSummary ?
                                    <>
                                        <MetricCard label='Completed days' value={formatNumber(tbmSummary.completedDayCount)} />
                                        <MetricCard label='Hit rate' value={formatPercent(tbmSummary.hitRate)} />
                                        <MetricCard label='Fresh days' value={formatNumber(tbmSummary.freshDayCount)} />
                                        <MetricCard label='Stale days' value={formatNumber(tbmSummary.staleDayCount)} />
                                        <MetricCard label='No-model days' value={formatNumber(tbmSummary.noModelDayCount)} />
                                        <MetricCard label='Pre-start gap' value={formatNumber(tbmSummary.preStartGapDays)} />
                                    </>
                                : directionalSummary ?
                                    <>
                                        <MetricCard label='Completed days' value={formatNumber(directionalSummary.completedDayCount)} />
                                        <MetricCard label='Technical hit rate' value={formatPercent(directionalSummary.technicalHitRate)} />
                                        <MetricCard label='Business hit rate' value={formatPercent(directionalSummary.businessHitRate)} />
                                        <MetricCard label='Late correct' value={formatNumber(directionalSummary.lateCorrectCount)} />
                                        <MetricCard label='Late pending' value={formatNumber(directionalSummary.latePendingCount)} />
                                        <MetricCard label='Fresh days' value={formatNumber(directionalSummary.freshDayCount)} />
                                        <MetricCard label='Pre-start gap' value={formatNumber(directionalSummary.preStartGapDays)} />
                                    </>
                                :   null}
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
    const [viewMode, setViewMode] = useState<'technical' | 'business'>('technical')
    const tbmStatsQuery = useTbmNativeModelStatsQuery(reportSlice, { enabled: mode === 'tbm_native' && reportSlice !== null })
    const directionalStatsQuery = useDirectionalWalkForwardModelStatsQuery(reportSlice, { enabled: mode === 'directional_walkforward' && reportSlice !== null })
    const tbmValidationQuery = useTbmNativeValidationQuery(reportSlice, { enabled: mode === 'tbm_native' && reportSlice !== null })
    const directionalValidationQuery = useDirectionalWalkForwardValidationQuery(reportSlice, { enabled: mode === 'directional_walkforward' && reportSlice !== null })
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
                                <MetricCard label='DSR' value={formatProbability(validationQuery.data.dsr)} />
                                <MetricCard label='CPCV folds' value={formatNumber(validationQuery.data.cpcv.foldCount)} />
                                <MetricCard label='CPCV mean score' value={formatProbability(validationQuery.data.cpcv.meanScore)} />
                                <MetricCard label='PBO' value={formatPercent(validationQuery.data.pbo.pbo)} />
                                <MetricCard label='PBO splits' value={formatNumber(validationQuery.data.pbo.splitCount)} />
                            </div>
                        )}

                        <ModeMoneySummaryPanel
                            mode={mode}
                            reportSlice={reportSlice}
                        />
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
    const tbmAggregationQuery = useTbmNativeAggregationQuery(reportSlice, { enabled: mode === 'tbm_native' && reportSlice !== null })
    const directionalAggregationQuery = useDirectionalWalkForwardAggregationQuery(reportSlice, { enabled: mode === 'directional_walkforward' && reportSlice !== null })
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

                        <ModeMoneySummaryPanel
                            mode={mode}
                            reportSlice={reportSlice}
                        />
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
    const tbmPfiQuery = useTbmNativePfiQuery(reportSlice, { enabled: mode === 'tbm_native' && reportSlice !== null })
    const directionalPerModelQuery = useDirectionalWalkForwardPfiPerModelQuery(reportSlice, { enabled: mode === 'directional_walkforward' && family !== 'sl' && reportSlice !== null })
    const directionalSlQuery = useDirectionalWalkForwardPfiSlModelQuery(reportSlice, { enabled: mode === 'directional_walkforward' && family === 'sl' && reportSlice !== null })

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

                        <ModeMoneySummaryPanel
                            mode={mode}
                            reportSlice={reportSlice}
                        />
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
    const tbmMoneyQuery = useTbmNativeMoneyQuery(reportSlice, { enabled: mode === 'tbm_native' && reportSlice !== null })
    const directionalMoneyQuery = useDirectionalWalkForwardMoneyQuery(reportSlice, { enabled: mode === 'directional_walkforward' && reportSlice !== null })
    const moneyQuery = mode === 'tbm_native' ? tbmMoneyQuery : directionalMoneyQuery
    const moneyDescriptorsQuery = usePolicyBranchMegaModeMoneySummaryQuery({ enabled: reportSlice !== null })
    const moneyMetricDescriptors = moneyDescriptorsQuery.data?.moneyMetricDescriptors ?? null
    const moneyMetricLabel = (metricKey: string) => resolveModeMoneyMetricLabel(moneyMetricDescriptors, metricKey)
    const moneySlice = reportSlice ? resolveMoneySliceByReportSlice(moneyQuery.data?.slices ?? null, reportSlice) : null
    const bestPolicy = resolveBestPolicyContract(moneySlice?.bestPolicy.perMarginMode)
    const moneyBlocksData = useMemo(
        () =>
            bestPolicy && moneyMetricDescriptors ?
                buildModeMoneyDataFromWalkForwardBestPolicy(
                    bestPolicy,
                    formatReportSliceLabel(modeRegistry, mode, bestPolicy.slice.scopeKey),
                    moneyMetricDescriptors
                )
            :   null,
        [bestPolicy, mode, modeRegistry, moneyMetricDescriptors]
    )

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
                    </div>
                }
                isLoading={modeCatalogQuery.isLoading || moneyQuery.isLoading || moneyDescriptorsQuery.isLoading}
                isError={Boolean(modeCatalogQuery.error || moneyQuery.error || moneyDescriptorsQuery.error)}
                error={modeCatalogQuery.error ?? moneyQuery.error ?? moneyDescriptorsQuery.error ?? null}
                hasData={Boolean(moneySlice && moneyMetricDescriptors)}
                onRetry={() => {
                    void modeCatalogQuery.refetch()
                    void moneyQuery.refetch()
                    void moneyDescriptorsQuery.refetch()
                }}
                title='Money report unavailable'
                loadingText='Loading money report'>
                {moneySlice && moneyMetricDescriptors && (
                    <div className={cls.stack}>
                        {moneyBlocksData ?
                            <ModeMoneyBlocks
                                data={moneyBlocksData}
                                domIdPrefix={`wf-money-${mode}`}
                            />
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
                            columns={[
                                '[[policy|Policy]]',
                                'Evaluation',
                                `[[trade-count|${moneyMetricLabel('TradesCount')}]]`,
                                `[[total-pnl|${moneyMetricLabel('TotalPnlPct')}]]`,
                                `[[total-pnl|${moneyMetricLabel('TotalPnlUsd')}]]`,
                                `[[drawdown|${moneyMetricLabel('MaxDdPct')}]]`,
                                `[[sharpe-ratio|${moneyMetricLabel('Sharpe')}]]`,
                                `[[win-rate|${moneyMetricLabel('WinRate')}]]`
                            ]}
                            rows={moneySlice.policyRatios.policies.map(policy => [
                                policy.policyName,
                                formatPolicyEvaluationStatus(policy.evaluation?.status, policy.policyName),
                                formatNumber(policy.performanceMetrics.tradesCount ?? Number.NaN),
                                formatPercent(policy.performanceMetrics.totalPnlPct ?? Number.NaN),
                                formatUsd(policy.performanceMetrics.totalPnlUsd ?? Number.NaN),
                                formatPercent(policy.performanceMetrics.maxDdPct ?? Number.NaN),
                                formatNumber(policy.performanceMetrics.sharpe ?? Number.NaN),
                                formatPercent(policy.performanceMetrics.winRate ?? Number.NaN)
                            ])}
                        />
                    </div>
                )}
            </PageDataState>
        </div>
    )
}

export function WalkForwardModePolicyBranchMegaPanel({ className, mode }: BaseProps) {
    const {
        modeCatalogQuery,
        availableSlices,
        reportSlice,
        setReportSlice
    } = useWalkForwardReportSlice(mode)
    const tbmMoneyQuery = useTbmNativeMoneyQuery(reportSlice, { enabled: mode === 'tbm_native' && reportSlice !== null })
    const directionalMoneyQuery = useDirectionalWalkForwardMoneyQuery(reportSlice, { enabled: mode === 'directional_walkforward' && reportSlice !== null })
    const moneyQuery = mode === 'tbm_native' ? tbmMoneyQuery : directionalMoneyQuery
    const moneySlice = reportSlice ? resolveMoneySliceByReportSlice(moneyQuery.data?.slices ?? null, reportSlice) : null
    const tableState = useMemo(() => {
        if (!moneySlice) {
            return { table: null, error: null as Error | null }
        }

        const table = moneySlice.policyBranchMegaTable
        if (!table || !Array.isArray(table.columns) || !Array.isArray(table.rows)) {
            return {
                table: null,
                error: new Error(
                    `[walk-forward-policy-branch-mega] published money slice has no Policy Branch Mega table. mode=${mode}; slice=${reportSlice}; requiredAction=rebuild walk-forward money artifacts with policyBranchMegaTable.`
                )
            }
        }

        if (table.columns.length === 0 || table.rows.length === 0) {
            return {
                table: null,
                error: new Error(
                    `[walk-forward-policy-branch-mega] Policy Branch Mega table is empty. mode=${mode}; slice=${reportSlice}; requiredAction=rebuild walk-forward money artifacts with non-empty policy rows and owner columns.`
                )
            }
        }

        return {
            table: table as RequiredPolicyBranchMegaTableSection,
            error: null as Error | null
        }
    }, [mode, moneySlice, reportSlice])

    return (
        <div className={classNames(cls.page, {}, [className ?? ''])}>
            <PageDataState
                shell={
                    <div className={cls.header}>
                        <Text type='h2'>{mode === 'tbm_native' ? 'TBM Native Policy Branch Mega' : 'Directional Walk-Forward Policy Branch Mega'}</Text>
                        <Text className={cls.subtitle}>
                            {renderTermTooltipRichText('Mode-specific [[policy|policy]] mega table built from the selected mode money artifacts. It does not mix rows from other modes.')}
                        </Text>
                        <div className={cls.controls}>
                            <ReportSliceControls slices={availableSlices} reportSlice={reportSlice} onReportSliceChange={setReportSlice} />
                        </div>
                    </div>
                }
                isLoading={modeCatalogQuery.isLoading || moneyQuery.isLoading}
                isError={Boolean(modeCatalogQuery.error || moneyQuery.error || tableState.error)}
                error={modeCatalogQuery.error ?? moneyQuery.error ?? tableState.error}
                hasData={Boolean(tableState.table)}
                onRetry={() => {
                    void modeCatalogQuery.refetch()
                    void moneyQuery.refetch()
                }}
                title='Policy Branch Mega unavailable'
                loadingText='Loading Policy Branch Mega'>
                {tableState.table && (
                    <ReportTableCard
                        title={tableState.table.title}
                        domId={`wf-policy-branch-mega-${mode}`}
                        columns={tableState.table.columns}
                        rows={tableState.table.rows}
                        rowEvaluations={tableState.table.rowEvaluations}
                        tableMaxHeight='min(72vh, 640px)'
                        virtualizeRows
                    />
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
                                <MetricCard label='Timing confirmed by' value={formatTimingConfirmedByDayKey(current.verdict.timingConfirmedByDayKeyUtc, current.verdict.timingVerdict)} />
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
                                formatRequiredReference(current.sourceModelFoldId, 'directional.current.sourceModelFoldId'),
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
        case 'policy_branch_mega':
            return <WalkForwardModePolicyBranchMegaPanel className={className} mode={mode} />
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
