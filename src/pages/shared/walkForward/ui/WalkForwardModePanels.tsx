import { useMemo, useState, type ReactNode } from 'react'
import { PageDataState } from '@/shared/ui/errors/PageDataState'
import { ReportTableCard } from '@/shared/ui/ReportTableCard'
import { Text } from '@/shared/ui'
import type { TableRow } from '@/shared/ui/SortableTable'
import classNames from '@/shared/lib/helpers/classNames'
import type { PfiQueryFamily } from '@/shared/api/tanstackQueries/pfi'
import {
    useDirectionalWalkForwardCurrentQuery,
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
    useTbmNativeModelStatsQuery,
    useTbmNativePfiQuery,
    useTbmNativeValidationQuery,
    type WalkForwardFreshness,
    type WalkForwardModeId,
    type WalkForwardSlice
} from '@/shared/api/tanstackQueries/walkForwardModes'
import cls from './WalkForwardModePanels.module.scss'

interface BaseProps {
    className?: string
    mode: WalkForwardModeId
}

interface PfiProps extends BaseProps {
    family?: PfiQueryFamily
}

function formatNumber(value: number): string {
    return Number.isFinite(value) ? value.toLocaleString('en-US') : '—'
}

function formatPercent(value: number): string {
    return Number.isFinite(value) ? `${(value * 100).toFixed(2)}%` : '—'
}

function formatProbability(value: number): string {
    return Number.isFinite(value) ? value.toFixed(4) : '—'
}

function formatEnumLabel(value: string | null | undefined): string {
    if (!value) {
        return '—'
    }

    return value
        .replace(/_/g, ' ')
        .replace(/([a-z])([A-Z])/g, '$1 $2')
}

function MetricCard({ label, value }: { label: string; value: ReactNode }) {
    return (
        <div className={cls.metricCard}>
            <div className={cls.metricLabel}>{label}</div>
            <div className={cls.metricValue}>{value}</div>
        </div>
    )
}

function FreshnessControls({
    freshness,
    onFreshnessChange
}: {
    freshness: WalkForwardFreshness
    onFreshnessChange: (value: WalkForwardFreshness) => void
}) {
    return (
        <label className={cls.control}>
            <span className={cls.controlLabel}>Freshness</span>
            <select
                className={cls.controlInput}
                value={freshness}
                onChange={event => onFreshnessChange(event.target.value as WalkForwardFreshness)}>
                <option value='overall'>Overall</option>
                <option value='fresh_only'>Fresh only</option>
                <option value='stale_only'>Stale only</option>
            </select>
        </label>
    )
}

export function WalkForwardModeHistoryPanel({ className, mode }: BaseProps) {
    const [slice, setSlice] = useState<WalkForwardSlice>('all')
    const [freshness, setFreshness] = useState<WalkForwardFreshness>('overall')
    const [selectedFoldId, setSelectedFoldId] = useState<string>('')
    const [fromDate, setFromDate] = useState<string>('')
    const [toDate, setToDate] = useState<string>('')

    const tbmHistoryQuery = useTbmNativeHistoryQuery({
        slice,
        freshness,
        selectedFoldId: slice === 'selected_fold' ? selectedFoldId : null,
        fromDate,
        toDate
    }, { enabled: mode === 'tbm_native' })
    const directionalHistoryQuery = useDirectionalWalkForwardHistoryQuery({
        slice,
        freshness,
        selectedFoldId: slice === 'selected_fold' ? selectedFoldId : null,
        fromDate,
        toDate
    }, { enabled: mode === 'directional_walkforward' })
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
                            <FreshnessControls freshness={freshness} onFreshnessChange={setFreshness} />
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
                isLoading={historyQuery.isLoading || foldsQuery.isLoading}
                isError={Boolean(historyQuery.error || foldsQuery.error)}
                error={historyQuery.error ?? foldsQuery.error ?? null}
                hasData={Boolean(historyTable)}
                onRetry={() => {
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
    const [freshness, setFreshness] = useState<WalkForwardFreshness>('overall')
    const [viewMode, setViewMode] = useState<'technical' | 'business'>('technical')
    const tbmStatsQuery = useTbmNativeModelStatsQuery(freshness, { enabled: mode === 'tbm_native' })
    const directionalStatsQuery = useDirectionalWalkForwardModelStatsQuery(freshness, { enabled: mode === 'directional_walkforward' })
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
                        <Text className={cls.subtitle}>Published stats cards for the selected mode and freshness slice.</Text>
                        <div className={cls.controls}>
                            <FreshnessControls freshness={freshness} onFreshnessChange={setFreshness} />
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
                isLoading={statsQuery.isLoading || validationQuery.isLoading}
                isError={Boolean(statsQuery.error || validationQuery.error)}
                error={statsQuery.error ?? validationQuery.error ?? null}
                hasData={Boolean(statsQuery.data)}
                onRetry={() => {
                    void statsQuery.refetch()
                    void validationQuery.refetch()
                }}
                title='Model stats unavailable'
                loadingText='Loading model stats'>
                <div className={cls.stack}>
                    {mode === 'tbm_native' ?
                        tbmStatsQuery.data?.cards.map(card => (
                            <div key={card.freshness} className={cls.stack}>
                                <ReportTableCard title={`Class summary · ${card.freshness}`} domId={`tbm-class-${card.freshness}`} columns={['Class', 'Samples', 'Hits', 'Hit rate', 'Misses']} rows={card.classSummary.map(row => [row.class, row.sampleCount, row.hitCount, formatPercent(row.hitRate), row.missCount])} />
                                <ReportTableCard title={`Confusion matrix · ${card.freshness}`} domId={`tbm-confusion-${card.freshness}`} columns={['Actual', 'Predicted Negative', 'Predicted Neutral', 'Predicted Positive']} rows={card.confusionMatrix.map(row => [row.actualClass, row.countNegative, row.countNeutral, row.countPositive])} />
                                <ReportTableCard title={`Calibration · ${card.freshness}`} domId={`tbm-calibration-${card.freshness}`} columns={['Bin', 'Predicted mean', 'Realized frequency', 'Samples']} rows={card.calibration.map(row => [row.bin, formatProbability(row.predictedProbabilityMean), formatProbability(row.realizedFrequency), row.sampleCount])} />
                            </div>
                        ))
                    :   directionalStatsQuery.data?.cards.map(card => (
                            <div key={card.freshness} className={cls.stack}>
                                {viewMode === 'technical' ?
                                    <>
                                        <ReportTableCard title={`Per-model metrics · ${card.freshness}`} domId={`dwf-metrics-${card.freshness}`} columns={['Model', 'Slice', 'Samples', 'Accuracy', 'Micro F1', 'Log loss']} rows={card.technical.perModelMetrics.map(row => [row.modelName, row.slice, row.sampleCount, formatProbability(row.accuracy), formatProbability(row.microF1), formatProbability(row.logLoss)])} />
                                        <ReportTableCard title={`Directional confusion · ${card.freshness}`} domId={`dwf-confusion-${card.freshness}`} columns={['Actual', 'Predicted Down', 'Predicted Flat', 'Predicted Up']} rows={card.technical.directionalConfusionMatrix.map(row => [row.actualClass, row.countDown, row.countFlat, row.countUp])} />
                                        <ReportTableCard title={`SL metrics · ${card.freshness}`} domId={`dwf-sl-${card.freshness}`} columns={['Slice', 'Samples', 'Accuracy', 'Log loss', 'AUC']} rows={card.technical.slMetrics.map(row => [row.slice, row.sampleCount, formatProbability(row.accuracy), formatProbability(row.logLoss), formatProbability(row.auc)])} />
                                    </>
                                :   <>
                                        <ReportTableCard title={`Technical verdicts · ${card.freshness}`} domId={`dwf-tech-verdicts-${card.freshness}`} columns={['Verdict', 'Count', 'Rate']} rows={card.business.technicalVerdicts.map(row => [formatEnumLabel(row.verdictName), row.count, formatPercent(row.rate)])} />
                                        <ReportTableCard title={`Business verdicts · ${card.freshness}`} domId={`dwf-business-verdicts-${card.freshness}`} columns={['Verdict', 'Count', 'Rate']} rows={card.business.businessVerdicts.map(row => [formatEnumLabel(row.verdictName), row.count, formatPercent(row.rate)])} />
                                        <ReportTableCard title={`Timing verdicts · ${card.freshness}`} domId={`dwf-timing-verdicts-${card.freshness}`} columns={['Timing', 'Count', 'Rate']} rows={card.business.timingVerdicts.map(row => [formatEnumLabel(row.timingVerdict), row.count, formatPercent(row.rate)])} />
                                    </>}
                            </div>
                        ))}
                </div>
            </PageDataState>
        </div>
    )
}

export function WalkForwardModeAggregationPanel({ className, mode }: BaseProps) {
    const [freshness, setFreshness] = useState<WalkForwardFreshness>('overall')
    const tbmAggregationQuery = useTbmNativeAggregationQuery(freshness, { enabled: mode === 'tbm_native' })
    const directionalAggregationQuery = useDirectionalWalkForwardAggregationQuery(freshness, { enabled: mode === 'directional_walkforward' })
    const aggregationQuery = mode === 'tbm_native' ? tbmAggregationQuery : directionalAggregationQuery

    return (
        <div className={classNames(cls.page, {}, [className ?? ''])}>
            <PageDataState
                shell={
                    <div className={cls.header}>
                        <Text type='h2'>{mode === 'tbm_native' ? 'TBM Native aggregation' : 'Directional Walk-Forward aggregation'}</Text>
                        <Text className={cls.subtitle}>Published aggregation slices for the selected mode.</Text>
                        <div className={cls.controls}>
                            <FreshnessControls freshness={freshness} onFreshnessChange={setFreshness} />
                        </div>
                    </div>
                }
                isLoading={aggregationQuery.isLoading}
                isError={aggregationQuery.isError}
                error={aggregationQuery.error ?? null}
                hasData={Boolean(aggregationQuery.data)}
                onRetry={() => void aggregationQuery.refetch()}
                title='Aggregation unavailable'
                loadingText='Loading aggregation'>
                <div className={cls.stack}>
                    {mode === 'tbm_native' ?
                        tbmAggregationQuery.data?.sections.map(section => (
                            <div key={section.sectionName} className={cls.stack}>
                                <ReportTableCard title={`Probability aggregation · ${section.sectionName}`} domId={`tbm-agg-prob-${section.sectionName}`} columns={['Slice', 'Avg P(+1)', 'Avg P(0)', 'Avg P(-1)']} rows={section.probabilityEntries.map(row => [row.slice, formatProbability(row.avgProbabilityPositive), formatProbability(row.avgProbabilityNeutral), formatProbability(row.avgProbabilityNegative)])} />
                                <ReportTableCard title={`Prediction vs actual confusion · ${section.sectionName}`} domId={`tbm-agg-confusion-${section.sectionName}`} columns={['Actual', 'Predicted Negative', 'Predicted Neutral', 'Predicted Positive']} rows={section.predictionVsActualConfusion.map(row => [row.actualClass, row.countNegative, row.countNeutral, row.countPositive])} />
                                <ReportTableCard title={`Calibration summary · ${section.sectionName}`} domId={`tbm-agg-calibration-${section.sectionName}`} columns={['Bin', 'Predicted mean', 'Realized frequency', 'Samples']} rows={section.calibrationSummary.map(row => [row.bin, formatProbability(row.predictedProbabilityMean), formatProbability(row.realizedFrequency), row.sampleCount])} />
                                <ReportTableCard title={`Strategy buckets · ${section.sectionName}`} domId={`tbm-agg-bucket-${section.sectionName}`} columns={['Bucket', 'Samples', 'Avg return', 'Hit rate']} rows={section.outcomeBuckets.map(row => [row.bucketName, row.sampleCount, formatProbability(row.avgReturn), formatPercent(row.hitRate)])} />
                            </div>
                        ))
                    :   directionalAggregationQuery.data?.sections.map(section => (
                            <div key={section.sectionName} className={cls.stack}>
                                <ReportTableCard title={`Layer probabilities · ${section.sectionName}`} domId={`dwf-agg-prob-${section.sectionName}`} columns={['Layer', 'Avg P(up)', 'Avg P(flat)', 'Avg P(down)']} rows={section.layerProbabilities.map(row => [row.layer, formatProbability(row.avgProbabilityUp), formatProbability(row.avgProbabilityFlat), formatProbability(row.avgProbabilityDown)])} />
                                <ReportTableCard title={`Layer metrics · ${section.sectionName}`} domId={`dwf-agg-metrics-${section.sectionName}`} columns={['Layer', 'Accuracy', 'Micro F1', 'Log loss']} rows={section.layerMetrics.map(row => [row.layer, formatProbability(row.accuracy), formatProbability(row.microF1), formatProbability(row.logLoss)])} />
                                <ReportTableCard title={`Business metrics · ${section.sectionName}`} domId={`dwf-agg-business-${section.sectionName}`} columns={['Samples', 'Technical hit rate', 'Business hit rate', 'Late correct', 'Late pending']} rows={[[section.businessMetrics.sampleCount, formatPercent(section.businessMetrics.technicalHitRate), formatPercent(section.businessMetrics.businessHitRate), section.businessMetrics.lateCorrectCount, section.businessMetrics.latePendingCount]]} />
                                <ReportTableCard title={`Timing buckets · ${section.sectionName}`} domId={`dwf-agg-timing-${section.sectionName}`} columns={['Timing verdict', 'Samples', 'Share']} rows={section.timingBuckets.map(row => [formatEnumLabel(row.timingVerdict), row.sampleCount, formatPercent(row.share)])} />
                                {section.latestDaysBreakdown.length > 0 && <ReportTableCard title={`Latest days breakdown · ${section.sectionName}`} domId={`dwf-agg-latest-${section.sectionName}`} columns={['Bucket', 'Samples', 'Avg return', 'Technical hit rate', 'Business hit rate']} rows={section.latestDaysBreakdown.map(row => [row.bucketName, row.sampleCount, formatProbability(row.avgReturn), formatPercent(row.technicalHitRate), formatPercent(row.businessHitRate)])} />}
                            </div>
                        ))}
                </div>
            </PageDataState>
        </div>
    )
}

export function WalkForwardModePfiPanel({ className, mode, family = 'daily' }: PfiProps) {
    const [freshness, setFreshness] = useState<WalkForwardFreshness>('overall')
    const tbmPfiQuery = useTbmNativePfiQuery(freshness, { enabled: mode === 'tbm_native' })
    const directionalPerModelQuery = useDirectionalWalkForwardPfiPerModelQuery(freshness, { enabled: mode === 'directional_walkforward' && family !== 'sl' })
    const directionalSlQuery = useDirectionalWalkForwardPfiSlModelQuery(freshness, { enabled: mode === 'directional_walkforward' && family === 'sl' })

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
                        <Text className={cls.subtitle}>Permutation feature importance for the selected mode and freshness slice.</Text>
                        <div className={cls.controls}>
                            <FreshnessControls freshness={freshness} onFreshnessChange={setFreshness} />
                        </div>
                    </div>
                }
                isLoading={query.isLoading}
                isError={query.isError}
                error={query.error ?? null}
                hasData={Boolean(query.data)}
                onRetry={() => void query.refetch()}
                title='PFI unavailable'
                loadingText='Loading PFI'>
                <div className={cls.stack}>
                    {mode === 'tbm_native' &&
                        tbmPfiQuery.data?.sections.map(section => (
                            <ReportTableCard key={section.freshness} title={`PFI · ${section.freshness}`} domId={`tbm-pfi-${section.freshness}`} columns={['Feature', 'Mean delta', 'Std delta', 'Samples']} rows={section.entries.map(row => [row.featureName, formatProbability(row.meanImportanceDelta), formatProbability(row.stdImportanceDelta), row.affectedSampleCount])} />
                        ))}
                    {mode === 'directional_walkforward' &&
                        family !== 'sl' &&
                        directionalPerModelQuery.data?.models.map(model => (
                            <div key={model.modelName} className={cls.stack}>
                                {model.slices.map(section => (
                                    <ReportTableCard key={`${model.modelName}-${section.freshness}`} title={`${model.modelName} · ${section.freshness}`} domId={`dwf-pfi-${model.modelName}-${section.freshness}`} columns={['Feature', 'Mean delta', 'Std delta', 'Samples']} rows={section.entries.map(row => [row.featureName, formatProbability(row.meanImportanceDelta), formatProbability(row.stdImportanceDelta), row.affectedSampleCount])} />
                                ))}
                            </div>
                        ))}
                    {mode === 'directional_walkforward' &&
                        family === 'sl' &&
                        directionalSlQuery.data?.slices.map(section => (
                            <ReportTableCard key={section.freshness} title={`SL PFI · ${section.freshness}`} domId={`dwf-sl-pfi-${section.freshness}`} columns={['Feature', 'Mean delta', 'Std delta', 'Samples']} rows={section.entries.map(row => [row.featureName, formatProbability(row.meanImportanceDelta), formatProbability(row.stdImportanceDelta), row.affectedSampleCount])} />
                        ))}
                </div>
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
                        This page remains specific to the Directional Fixed-Split live snapshot. Use History, Model Statistics, Aggregation and PFI for TBM Native.
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
