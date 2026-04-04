import { useEffect, useMemo, useState } from 'react'
import cls from './BacktestExperimentsLab.module.scss'
import { Btn, Text } from '@/shared/ui'
import { SectionDataState } from '@/shared/ui/errors/SectionDataState'
import {
    useActivateExperimentBundleMutation,
    useCreateExperimentBundleMutation,
    useGetExperimentRegistryQuery,
    useGetExperimentSandboxProofQuery,
    useRunExperimentSandboxMutation,
    useUpdateExperimentBundleStatusMutation
} from '@/shared/api/api'
import type {
    BacktestPolicyGroupDto,
    BucketLayerProfileDto,
    ExperimentActivationSlot,
    ExperimentBundleDto,
    ExperimentRegistrySnapshotDto,
    ExperimentSandboxComparisonRowDto,
    ExperimentSandboxProofDto,
    ExperimentSandboxRunDto,
    ExperimentSandboxRunResponseDto,
    ExperimentSandboxTopRowDeltaDto,
    ExperimentSandboxVerdictStatus,
    ExperimentVariantStatus,
    ModelLayerProfileDto,
    PolicyLayerProfileDto,
    PolicyPerformanceMetricsDto
} from '@/shared/types/backtestExperiments.types'

type ProofStopLossMode = 'with-sl' | 'no-sl' | 'all'
type ProofBranchMode = 'base-only' | 'all'

const BASE_BRANCH_KEY = 'base'
const ANTI_DIRECTION_BRANCH_KEY = 'anti-d'
const WITH_STOP_LOSS_MODE_KEY = 'with-sl'
const WITHOUT_STOP_LOSS_MODE_KEY = 'no-sl'

function fmtPct(value?: number | null) {
    return value == null || Number.isNaN(value) ? 'нет данных' : `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
}

function fmtUsd(value?: number | null) {
    return value == null || Number.isNaN(value) ? 'нет данных' : `${value >= 0 ? '+' : ''}${value.toFixed(2)}$`
}

function fmtInt(value?: number | null) {
    return value == null || Number.isNaN(value) ? 'нет данных' : `${value >= 0 ? '+' : ''}${value}`
}

function fmtBool(value?: boolean | null) {
    return value == null ? 'нет данных' : value ? 'да' : 'нет'
}

function fmtDate(value?: string | null) {
    if (!value) return 'нет данных'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return value
    return date.toLocaleString('ru-RU', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    })
}

function verdictLabel(status?: ExperimentSandboxVerdictStatus | null) {
    switch (status) {
        case 'Pass': return 'Проходит'
        case 'Fail': return 'Провален'
        case 'Borderline': return 'Погранично'
        default: return 'Нет вердикта'
    }
}

function verdictTone(status?: ExperimentSandboxVerdictStatus | null) {
    switch (status) {
        case 'Pass': return 'pass'
        case 'Fail': return 'fail'
        case 'Borderline': return 'borderline'
        default: return 'neutral'
    }
}

function statusLabel(status: ExperimentVariantStatus) {
    return status === 'Approved' ? 'Одобрен' : status === 'Archived' ? 'Архив' : 'Черновик'
}

function activationSlotLabel(slot: ExperimentActivationSlot) {
    return slot === 'OfflineCurrent' ? 'Проверки и отчёты' : 'Реальная торговля'
}

function resolveDisplayName<T extends { id: string; name: string }>(items: T[], id?: string | null) {
    return !id ? 'нет данных' : items.find(item => item.id === id)?.name ?? id
}

function resolvePolicyGroups(registry: ExperimentRegistrySnapshotDto | undefined, layer: PolicyLayerProfileDto | null) {
    if (!registry || !layer) return [] as BacktestPolicyGroupDto[]
    const keys = new Set(layer.policyGroupKeys)
    return registry.policyCatalog.groups.filter(group => keys.has(group.groupKey))
}

function resolveScenarioBlockKeys(
    registry: ExperimentRegistrySnapshotDto | undefined,
    stopLossMode: ProofStopLossMode,
    branchMode: ProofBranchMode
) {
    if (!registry) return [] as string[]
    const allowed = new Set(registry.selectionPolicy.allowedScenarioBlockKeys)
    return registry.scenarioCatalog.blocks
        .filter(block => allowed.has(block.blockKey))
        .filter(block => branchMode === 'all' || block.branchKey === BASE_BRANCH_KEY)
        .filter(block => stopLossMode === 'all'
            || block.stopLossModeKey === (stopLossMode === 'with-sl' ? WITH_STOP_LOSS_MODE_KEY : WITHOUT_STOP_LOSS_MODE_KEY))
        .map(block => block.blockKey)
}

function sameArray(left: string[], right: string[]) {
    return left.length === right.length && left.every((value, index) => value === right[index])
}

function resolveScenarioLabel(registry: ExperimentRegistrySnapshotDto | undefined, key: string) {
    return registry?.scenarioCatalog.blocks.find(block => block.blockKey === key)?.name ?? key
}

function metricsSummary(metrics: PolicyPerformanceMetricsDto) {
    return `${fmtPct(metrics.totalPnlPct)} · ${fmtUsd(metrics.totalPnlUsd)} · DD ${fmtPct(metrics.maxDdPct)} · Ликв ${fmtInt(metrics.realLiquidationCount)}`
}

function topDeltaLabel(delta: ExperimentSandboxTopRowDeltaDto | undefined | null, registry: ExperimentRegistrySnapshotDto | undefined) {
    if (!delta) return 'Нет данных.'
    return `${delta.policy} · ${resolveScenarioLabel(registry, delta.scenarioBlockKey)}`
}

function rowSort(rows: ExperimentSandboxComparisonRowDto[], registry: ExperimentRegistrySnapshotDto | undefined) {
    const policyOrder = new Map<string, number>()
    let index = 0
    for (const group of registry?.policyCatalog.groups ?? []) {
        for (const policy of group.policies) {
            policyOrder.set(policy.name, index++)
        }
    }
    const scenarioOrder = new Map((registry?.scenarioCatalog.blocks ?? []).map((block, i) => [block.blockKey, i]))
    return [...rows].sort((left, right) => {
        const policyDelta = (policyOrder.get(left.policyName) ?? 9999) - (policyOrder.get(right.policyName) ?? 9999)
        if (policyDelta !== 0) return policyDelta
        return (scenarioOrder.get(left.scenarioBlockKey) ?? 9999) - (scenarioOrder.get(right.scenarioBlockKey) ?? 9999)
    })
}

export function BacktestExperimentsLab() {
    const { data: registry, isLoading, error, refetch } = useGetExperimentRegistryQuery()
    const [createBundle, { isLoading: isCreateBundleLoading }] = useCreateExperimentBundleMutation()
    const [updateBundleStatus, { isLoading: isUpdateStatusLoading }] = useUpdateExperimentBundleStatusMutation()
    const [activateBundle, { isLoading: isActivationLoading }] = useActivateExperimentBundleMutation()
    const [runSandbox, { isLoading: isSandboxLoading }] = useRunExperimentSandboxMutation()

    const [selectedModelLayerId, setSelectedModelLayerId] = useState('')
    const [selectedPolicyLayerId, setSelectedPolicyLayerId] = useState('')
    const [selectedBucketLayerId, setSelectedBucketLayerId] = useState('')
    const [newBundleName, setNewBundleName] = useState('')
    const [selectedBundleId, setSelectedBundleId] = useState('')
    const [selectedOfflineBundleId, setSelectedOfflineBundleId] = useState('')
    const [selectedLiveBundleId, setSelectedLiveBundleId] = useState('')
    const [selectedRunId, setSelectedRunId] = useState('')
    const [proofSlMode, setProofSlMode] = useState<ProofStopLossMode>('with-sl')
    const [proofBranchMode, setProofBranchMode] = useState<ProofBranchMode>('base-only')
    const [actionMessage, setActionMessage] = useState<string | null>(null)
    const [actionError, setActionError] = useState<string | null>(null)
    const [sandboxResult, setSandboxResult] = useState<ExperimentSandboxRunResponseDto | null>(null)

    const modelLayers = registry?.modelLayers ?? []
    const policyLayers = registry?.policyLayers ?? []
    const bucketLayers = registry?.bucketLayers ?? []
    const bundles = registry?.bundles ?? []
    const activations = registry?.activations ?? []
    const sandboxRuns = registry?.sandboxRuns ?? []
    const approvedBundles = bundles.filter(bundle => bundle.status === 'Approved')

    const activationBySlot = useMemo(() => {
        const map = new Map<ExperimentActivationSlot, string>()
        for (const activation of activations) map.set(activation.slot, activation.bundleId)
        return map
    }, [activations])

    useEffect(() => {
        if (!registry) return
        if (!selectedModelLayerId && modelLayers[0]) setSelectedModelLayerId(modelLayers[0].id)
        if (!selectedPolicyLayerId && policyLayers[0]) setSelectedPolicyLayerId(policyLayers[0].id)
        if (!selectedBucketLayerId && bucketLayers[0]) setSelectedBucketLayerId(bucketLayers[0].id)
        if (!selectedBundleId && bundles[0]) setSelectedBundleId(bundles[0].id)
        if (!selectedOfflineBundleId && activationBySlot.get('OfflineCurrent')) setSelectedOfflineBundleId(activationBySlot.get('OfflineCurrent') ?? '')
        if (!selectedLiveBundleId && activationBySlot.get('LiveCurrent')) setSelectedLiveBundleId(activationBySlot.get('LiveCurrent') ?? '')
        if (!selectedRunId && sandboxRuns[0]) setSelectedRunId(sandboxRuns[0].id)
    }, [registry, modelLayers, policyLayers, bucketLayers, bundles, sandboxRuns, activationBySlot, selectedModelLayerId, selectedPolicyLayerId, selectedBucketLayerId, selectedBundleId, selectedOfflineBundleId, selectedLiveBundleId, selectedRunId])

    const selectedModel = modelLayers.find(layer => layer.id === selectedModelLayerId) ?? null
    const selectedPolicy = policyLayers.find(layer => layer.id === selectedPolicyLayerId) ?? null
    const selectedBucket = bucketLayers.find(layer => layer.id === selectedBucketLayerId) ?? null
    const selectedPolicyGroups = useMemo(() => resolvePolicyGroups(registry, selectedPolicy), [registry, selectedPolicy])
    const selectedBundle = bundles.find(bundle => bundle.id === selectedBundleId) ?? null
    const selectedRun = sandboxRuns.find(run => run.id === selectedRunId) ?? (sandboxResult?.run.id === selectedRunId ? sandboxResult.run : null)
    const scenarioBlockKeys = useMemo(() => resolveScenarioBlockKeys(registry, proofSlMode, proofBranchMode), [registry, proofSlMode, proofBranchMode])
    const useInlineProof = Boolean(registry && sandboxResult?.run.id === selectedRunId && sameArray(scenarioBlockKeys, registry.selectionPolicy.defaultScenarioBlockKeys))

    const { data: loadedProof, isLoading: isProofLoading, error: proofError, refetch: refetchProof } =
        useGetExperimentSandboxProofQuery({ runId: selectedRunId || '', scenarioBlockKeys }, { skip: !selectedRunId || useInlineProof })

    const activeProof: ExperimentSandboxProofDto | null = useInlineProof ? (sandboxResult?.proof ?? null) : (loadedProof ?? null)
    const rows = useMemo(() => rowSort(activeProof?.rows ?? [], registry), [activeProof?.rows, registry])

    if (isLoading) {
        return <section className={cls.labCard}><h2 className={cls.sectionTitle}>Система вариантов</h2><Text>Загрузка сохранённых вариантов и последних прогонов.</Text></section>
    }

    if (error || !registry) {
        return <SectionDataState title='Система вариантов' isLoading={false} isError error={error ?? new Error('Реестр вариантов пуст.')} hasData={false} onRetry={() => void refetch()}><div /></SectionDataState>
    }

    const onCreateBundle = async () => {
        if (!selectedModel || !selectedPolicy || !selectedBucket) return
        setActionError(null); setActionMessage(null)
        try {
            const created = await createBundle({
                name: newBundleName.trim() || `${selectedModel.name} / ${selectedPolicy.name} / ${selectedBucket.name}`,
                modelLayerId: selectedModel.id,
                policyLayerId: selectedPolicy.id,
                bucketLayerId: selectedBucket.id
            }).unwrap()
            setSelectedBundleId(created.id)
            setActionMessage(`Создан новый набор: ${created.name}`)
        } catch (err: any) {
            setActionError(err?.data?.message ?? err?.error ?? 'Не удалось создать новый набор.')
        }
    }

    const onUpdateStatus = async (status: ExperimentVariantStatus) => {
        if (!selectedBundle) return
        setActionError(null); setActionMessage(null)
        try {
            const updated = await updateBundleStatus({ bundleId: selectedBundle.id, patch: { status } }).unwrap()
            setActionMessage(`Статус набора обновлён: ${updated.name} -> ${statusLabel(updated.status)}`)
        } catch (err: any) {
            setActionError(err?.data?.message ?? err?.error ?? 'Не удалось обновить статус набора.')
        }
    }

    const onActivate = async (slot: ExperimentActivationSlot, bundleId: string) => {
        if (!bundleId) return
        setActionError(null); setActionMessage(null)
        try {
            const updated = await activateBundle({ slot, body: { bundleId } }).unwrap()
            setActionMessage(`Активный набор для режима "${activationSlotLabel(updated.slot)}" обновлён.`)
        } catch (err: any) {
            setActionError(err?.data?.message ?? err?.error ?? 'Не удалось переключить активный набор.')
        }
    }

    const onRunSandbox = async () => {
        if (!selectedModel || !selectedPolicy || !selectedBucket) return
        setActionError(null); setActionMessage(null); setSandboxResult(null)
        try {
            const result = await runSandbox({
                modelLayerId: selectedModel.id,
                policyLayerId: selectedPolicy.id,
                bucketLayerId: selectedBucket.id,
                tpSlMode: 'all'
            }).unwrap()
            setSandboxResult(result)
            setSelectedRunId(result.run.id)
            setActionMessage('Проверочный прогон завершён. Базовый verdict по BASE и WITH SL готов.')
        } catch (err: any) {
            setActionError(err?.data?.message ?? err?.error ?? 'Не удалось запустить проверочный прогон.')
        }
    }

    return (
        <section className={cls.labCard}>
            <div className={cls.header}>
                <div>
                    <h2 className={cls.sectionTitle}>Система вариантов</h2>
                    <Text>Экран использует глобальный каталог политик, глобальные сценарные блоки и каноничную матрицу результатов. Метрики не пересчитываются локально.</Text>
                    <p className={cls.metaLine}>Схема реестра: {registry.schemaVersion}</p>
                </div>
                <Btn variant='ghost' onClick={() => void refetch()}>Обновить</Btn>
            </div>

            <div className={cls.sectionGrid}>
                <div className={cls.sectionCard}>
                    <h3 className={cls.sectionTitle}>Активные наборы</h3>
                    {(['OfflineCurrent', 'LiveCurrent'] as ExperimentActivationSlot[]).map(slot => (
                        <div key={slot} className={cls.activationRow}>
                            <div className={cls.activationTitle}>{activationSlotLabel(slot)}</div>
                            <div className={cls.activationCurrent}>Сейчас: {activationBySlot.get(slot) ?? 'нет активного набора'}</div>
                            <div className={cls.activationControls}>
                                <select className={cls.select} value={slot === 'OfflineCurrent' ? selectedOfflineBundleId : selectedLiveBundleId} onChange={event => slot === 'OfflineCurrent' ? setSelectedOfflineBundleId(event.target.value) : setSelectedLiveBundleId(event.target.value)}>
                                    {approvedBundles.map(bundle => <option key={bundle.id} value={bundle.id}>{bundle.name}</option>)}
                                </select>
                                <Btn variant='ghost' disabled={isActivationLoading} onClick={() => void onActivate(slot, slot === 'OfflineCurrent' ? selectedOfflineBundleId : selectedLiveBundleId)}>Включить</Btn>
                            </div>
                        </div>
                    ))}
                </div>

                <div className={cls.sectionCard}>
                    <h3 className={cls.sectionTitle}>Проверочный прогон</h3>
                    <div className={cls.formGrid}>
                        <label className={cls.field}><span className={cls.fieldLabel}>Модель</span><select className={cls.select} value={selectedModelLayerId} onChange={event => setSelectedModelLayerId(event.target.value)}>{modelLayers.map((layer: ModelLayerProfileDto) => <option key={layer.id} value={layer.id}>{layer.name}</option>)}</select></label>
                        <label className={cls.field}><span className={cls.fieldLabel}>Правила торговли</span><select className={cls.select} value={selectedPolicyLayerId} onChange={event => setSelectedPolicyLayerId(event.target.value)}>{policyLayers.map((layer: PolicyLayerProfileDto) => <option key={layer.id} value={layer.id}>{layer.name}</option>)}</select></label>
                        <label className={cls.field}><span className={cls.fieldLabel}>Бакеты</span><select className={cls.select} value={selectedBucketLayerId} onChange={event => setSelectedBucketLayerId(event.target.value)}>{bucketLayers.map((layer: BucketLayerProfileDto) => <option key={layer.id} value={layer.id}>{layer.name}</option>)}</select></label>
                    </div>
                    <div className={cls.actionsRow}><Btn variant='ghost' disabled={isSandboxLoading || !selectedModel || !selectedPolicy || !selectedBucket} onClick={() => void onRunSandbox()}>Запустить прогон</Btn></div>
                    <div className={cls.policyGroups}>
                        {selectedPolicyGroups.map(group => <div key={group.groupKey} className={cls.policyGroupCard}><div className={cls.policyGroupTitle}><span>{group.name}</span><span className={cls.policyGroupCount}>{group.policies.length} политик</span></div><div className={cls.policyNames}>{group.policies.map(policy => policy.name).join(', ')}</div></div>)}
                    </div>
                </div>

                <div className={cls.sectionCard}>
                    <h3 className={cls.sectionTitle}>Создать и утвердить набор</h3>
                    <label className={cls.field}><span className={cls.fieldLabel}>Имя набора</span><input className={cls.textInput} value={newBundleName} onChange={event => setNewBundleName(event.target.value)} placeholder='Имя для нового набора' /></label>
                    <div className={cls.actionsRow}><Btn variant='ghost' disabled={isCreateBundleLoading || !selectedModel || !selectedPolicy || !selectedBucket} onClick={() => void onCreateBundle()}>Создать</Btn></div>
                    <label className={cls.field}><span className={cls.fieldLabel}>Текущий набор</span><select className={cls.select} value={selectedBundleId} onChange={event => setSelectedBundleId(event.target.value)}>{bundles.map((bundle: ExperimentBundleDto) => <option key={bundle.id} value={bundle.id}>{bundle.name}</option>)}</select></label>
                    <div className={cls.actionsRow}>
                        <Btn variant='ghost' disabled={isUpdateStatusLoading || !selectedBundle} onClick={() => void onUpdateStatus('Draft')}>В черновик</Btn>
                        <Btn variant='ghost' disabled={isUpdateStatusLoading || !selectedBundle} onClick={() => void onUpdateStatus('Approved')}>Одобрить</Btn>
                        <Btn variant='ghost' disabled={isUpdateStatusLoading || !selectedBundle} onClick={() => void onUpdateStatus('Archived')}>В архив</Btn>
                    </div>
                    {selectedBundle && <div className={cls.bundleDetails}><div>Статус: {statusLabel(selectedBundle.status)}</div><div>Модель: {resolveDisplayName(modelLayers, selectedBundle.modelLayerId)}</div><div>Правила торговли: {resolveDisplayName(policyLayers, selectedBundle.policyLayerId)}</div><div>Бакеты: {resolveDisplayName(bucketLayers, selectedBundle.bucketLayerId)}</div><div>Код: {selectedBundle.codeRevision}</div></div>}
                </div>

                <div className={cls.sectionCard}>
                    <h3 className={cls.sectionTitle}>Последние прогоны</h3>
                    <div className={cls.runsList}>
                        {sandboxRuns.slice(0, 8).map((run: ExperimentSandboxRunDto) => <button key={run.id} type='button' className={`${cls.runItem} ${selectedRunId === run.id ? cls.runItemActive : ''}`} onClick={() => setSelectedRunId(run.id)}><div className={cls.runHeadline}><span>{bundles.find(bundle => bundle.id === run.bundleId)?.name ?? `${resolveDisplayName(modelLayers, run.modelLayerId)} / ${resolveDisplayName(policyLayers, run.policyLayerId)}`}</span><span>{fmtDate(run.createdAtUtc)}</span></div><div className={cls.runMetrics}><span>Вердикт: {verdictLabel(run.verdictStatus)}</span><span>Сравнено политик: {run.comparedRowCount ?? 'нет данных'}</span><span>Медиана по прибыли: {fmtPct(run.medianTotalPnlPctDelta)}</span></div></button>)}
                        {sandboxRuns.length === 0 && <p className={cls.emptyState}>Пока нет сохранённых прогонов.</p>}
                    </div>
                </div>
            </div>

            {actionMessage && <div className={cls.successMessage}>{actionMessage}</div>}
            {actionError && <div className={cls.errorMessage}>{actionError}</div>}

            {selectedRun && (
                <div className={cls.resultCard}>
                    <div className={cls.proofHeader}>
                        <div><h3 className={cls.sectionTitle}>Доказательство по прогону</h3><p className={cls.sectionText}>По умолчанию экран показывает BASE и WITH SL. Остальные режимы выбираются только через owner-сценарные блоки.</p></div>
                        <div className={`${cls.verdictBadge} ${cls[`verdict_${verdictTone(activeProof?.verdict.status ?? selectedRun.verdictStatus)}`]}`}>{verdictLabel(activeProof?.verdict.status ?? selectedRun.verdictStatus)}</div>
                    </div>

                    <div className={cls.sectionCard}>
                        <div className={cls.filterBlock}>
                            <div className={cls.filterGroup}><div className={cls.fieldLabel}>Режим стоп лосса</div><div className={cls.segmentedRow}>{(['with-sl', 'no-sl', 'all'] as ProofStopLossMode[]).map(mode => <button key={mode} type='button' className={`${cls.segmentButton} ${proofSlMode === mode ? cls.segmentButtonActive : ''}`} onClick={() => setProofSlMode(mode)}>{mode === 'with-sl' ? 'Со стоп лоссом' : mode === 'no-sl' ? 'Без стоп лосса' : 'Оба режима'}</button>)}</div></div>
                            <div className={cls.filterGroup}><div className={cls.fieldLabel}>Ветка</div><div className={cls.segmentedRow}><button type='button' className={`${cls.segmentButton} ${proofBranchMode === 'base-only' ? cls.segmentButtonActive : ''}`} onClick={() => setProofBranchMode('base-only')}>Только BASE</button><button type='button' className={`${cls.segmentButton} ${proofBranchMode === 'all' ? cls.segmentButtonActive : ''}`} onClick={() => setProofBranchMode('all')}>Добавить ANTI-D</button></div></div>
                        </div>
                        <div className={cls.selectionSummary}><div>Сценарные блоки: {scenarioBlockKeys.map(key => resolveScenarioLabel(registry, key)).join(', ')}</div><div>Прогон: {fmtDate(selectedRun.createdAtUtc)}</div></div>
                    </div>

                    {isProofLoading && <p className={cls.emptyState}>Загрузка доказательства прогона.</p>}
                    {proofError && <SectionDataState title='Доказательство прогона' isLoading={false} isError error={proofError as Error} hasData={false} onRetry={() => void refetchProof()}><div /></SectionDataState>}

                    {activeProof && <>
                        <div className={cls.metricsGrid}>
                            <div className={cls.metricCard}><div className={cls.metricLabel}>Итог</div><div className={cls.metricValue}>{verdictLabel(activeProof.verdict.status)}</div><div className={cls.metricMeta}>{activeProof.verdict.summary}</div></div>
                            <div className={cls.metricCard}><div className={cls.metricLabel}>Сравнено политик</div><div className={cls.metricValue}>{activeProof.verdict.comparedRowCount}</div><div className={cls.metricMeta}>Только в новом: {activeProof.verdict.candidateOnlyRowCount}</div><div className={cls.metricMeta}>Только в baseline: {activeProof.verdict.baselineOnlyRowCount}</div></div>
                            <div className={cls.metricCard}><div className={cls.metricLabel}>Медианная разница</div><div className={cls.metricValue}>{fmtPct(activeProof.verdict.medianTotalPnlPctDelta)}</div><div className={cls.metricMeta}>По деньгам: {fmtUsd(activeProof.verdict.medianTotalPnlUsdDelta)}</div><div className={cls.metricMeta}>Просадка: {fmtPct(activeProof.verdict.medianMaxDdPctDelta)}</div></div>
                            <div className={cls.metricCard}><div className={cls.metricLabel}>Ликвидации</div><div className={cls.metricValue}>{fmtInt(activeProof.verdict.improvedRealLiquidationCountRowCount)}</div><div className={cls.metricMeta}>Улучшено: {fmtInt(activeProof.verdict.improvedHadLiquidationRowCount)}</div><div className={cls.metricMeta}>Ухудшено: {fmtInt(activeProof.verdict.worsenedHadLiquidationRowCount)}</div></div>
                            <div className={cls.metricCard}><div className={cls.metricLabel}>Смерть счёта</div><div className={cls.metricValue}>{fmtInt(activeProof.verdict.improvedAccountRuinCountRowCount)}</div><div className={cls.metricMeta}>Ухудшено: {fmtInt(activeProof.verdict.worsenedAccountRuinCountRowCount)}</div><div className={cls.metricMeta}>Фандинг: {fmtUsd(activeProof.verdict.medianFundingNetUsdDelta)}</div></div>
                            <div className={cls.metricCard}><div className={cls.metricLabel}>Лучше и хуже</div><div className={cls.metricValue}>{activeProof.verdict.improvedTotalPnlPctRowCount} / {activeProof.verdict.worsenedTotalPnlPctRowCount}</div><div className={cls.metricMeta}>Лучше по прибыли / хуже по прибыли</div></div>
                        </div>

                        <div className={cls.sectionGrid}>
                            <div className={cls.sectionCard}><h3 className={cls.sectionTitle}>Лучшее улучшение</h3><div className={cls.metricValue}>{fmtPct(activeProof.verdict.bestImprovement?.totalPnlPctDelta)}</div><div className={cls.metricMeta}>{topDeltaLabel(activeProof.verdict.bestImprovement, registry)}</div><div className={cls.metricMeta}>По деньгам: {fmtUsd(activeProof.verdict.bestImprovement?.totalPnlUsdDelta)}</div></div>
                            <div className={cls.sectionCard}><h3 className={cls.sectionTitle}>Худшая регрессия</h3><div className={cls.metricValue}>{fmtPct(activeProof.verdict.worstRegression?.totalPnlPctDelta)}</div><div className={cls.metricMeta}>{topDeltaLabel(activeProof.verdict.worstRegression, registry)}</div><div className={cls.metricMeta}>По деньгам: {fmtUsd(activeProof.verdict.worstRegression?.totalPnlUsdDelta)}</div></div>
                        </div>

                        <div className={cls.sectionCard}>
                            <h3 className={cls.sectionTitle}>Сравнение по всем политикам</h3>
                            <div className={cls.tableWrap}>
                                <table className={cls.comparisonTable}>
                                    <thead><tr><th>Политика</th><th>Сценарий</th><th>Новый вариант</th><th>Baseline</th><th>Δ %</th><th>Δ $</th><th>Δ DD</th><th>Δ ликв</th><th>Δ руин</th><th>Δ фандинг</th><th>Статус</th></tr></thead>
                                    <tbody>
                                        {rows.map(row => <tr key={`${row.policyName}:${row.scenarioBlockKey}`}><td><div>{row.policyName}</div><div className={cls.metricMeta}>{row.policyGroupKey}</div><div className={cls.metricMeta}>{row.marginMode}</div></td><td><div>{resolveScenarioLabel(registry, row.scenarioBlockKey)}</div><div className={cls.metricMeta}>{row.branchKey === ANTI_DIRECTION_BRANCH_KEY ? 'ANTI-D' : 'BASE'}</div><div className={cls.metricMeta}>{row.stopLossModeKey === WITHOUT_STOP_LOSS_MODE_KEY ? 'NO SL' : 'WITH SL'}</div></td><td className={cls.metricMeta}>{metricsSummary(row.candidateMetrics)}</td><td className={cls.metricMeta}>{metricsSummary(row.baselineMetrics)}</td><td>{fmtPct(row.delta.totalPnlPctDelta)}</td><td>{fmtUsd(row.delta.totalPnlUsdDelta)}</td><td>{fmtPct(row.delta.maxDdPctDelta)}</td><td>{fmtInt(row.delta.realLiquidationCountDelta)}</td><td>{fmtInt(row.delta.accountRuinCountDelta)}</td><td>{fmtUsd(row.delta.fundingNetUsdDelta)}</td><td><div>{row.candidateEvaluation.status}</div><div className={cls.metricMeta}>baseline: {row.baselineEvaluation.status}</div><div className={cls.metricMeta}>had liq: {fmtBool(row.delta.candidateHadLiquidation)} / {fmtBool(row.delta.baselineHadLiquidation)}</div></td></tr>)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </>}
                </div>
            )}
        </section>
    )
}
