import { useEffect, useMemo, useState } from 'react'
import cls from './BacktestPageContent.module.scss'
import { Text } from '@/shared/ui'
import type {
    BacktestCompareResponseDto,
    BacktestConfigDto,
    BacktestProfileDto,
    BacktestPreviewBundleDto,
    BacktestSummaryDto,
    BacktestTpSlMode
} from '@/shared/types/backtest.types'
import { useCompareBacktestProfilesMutation, usePreviewBacktestFullMutation } from '@/shared/api/api'
import { BACKTEST_FULL_TABS } from '@/shared/utils/backtestTabs'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { cloneBacktestConfig } from '@/shared/utils/backtestConfig'
import { BacktestBaselineMetrics } from '../BacktestBaselineMetrics/BacktestBaselineMetrics'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import { BacktestPageHeader } from '../BacktestPageHeader/BacktestPageHeader'
import { BacktestBaselineColumn } from '../BacktestBaselineColumn/BacktestBaselineColumn'
import { BacktestWhatIfColumn } from '../BacktestWhatIfColumn/BacktestWhatIfColumn'
import { BacktestCompareBlock } from '../BacktestCompareBlock/BacktestCompareBlock'

interface BacktestPageContentProps {
    baselineSummary: BacktestSummaryDto
    profiles: BacktestProfileDto[]
}

function parseInputNumber(valueStr: string): number | null {
    const normalized = valueStr.replace(',', '.').trim()
    if (normalized.length === 0) return null

    const value = Number(normalized)
    return Number.isFinite(value) ? value : null
}

function clamp(value: number, min: number, max: number): number {
    if (value < min) return min
    if (value > max) return max
    return value
}

export function BacktestPageContent({ baselineSummary, profiles }: BacktestPageContentProps) {
    const [runPreviewFull, { isLoading: isPreviewLoading }] = usePreviewBacktestFullMutation()
    const [runBaselineModePreview] = usePreviewBacktestFullMutation()
    const [runCompare, { isLoading: isCompareLoading }] = useCompareBacktestProfilesMutation()

    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
    const [tpSlMode, setTpSlMode] = useState<BacktestTpSlMode>('all')
    const [draftConfig, setDraftConfig] = useState<BacktestConfigDto | null>(null)
    const [selectedPolicies, setSelectedPolicies] = useState<Record<string, boolean>>({})

    const [previewBundle, setPreviewBundle] = useState<BacktestPreviewBundleDto | null>(null)
    const [previewError, setPreviewError] = useState<string | null>(null)
    const [baselineModeBundle, setBaselineModeBundle] = useState<BacktestPreviewBundleDto | null>(null)
    const [baselineModeError, setBaselineModeError] = useState<string | null>(null)

    const [profileAId, setProfileAId] = useState<string | null>(null)
    const [profileBId, setProfileBId] = useState<string | null>(null)
    const [compareResult, setCompareResult] = useState<BacktestCompareResponseDto | null>(null)
    const [compareError, setCompareError] = useState<string | null>(null)

    const baselineProfile: BacktestProfileDto | null = useMemo(
        () => profiles.find(profile => profile.id === 'baseline') ?? null,
        [profiles]
    )

    const currentProfile: BacktestProfileDto | null = useMemo(() => {
        if (profiles.length === 0) return null

        if (selectedProfileId) {
            const byId = profiles.find(profile => profile.id === selectedProfileId)
            if (byId) return byId
        }

        const baselineProfile = profiles.find(profile => profile.id === 'baseline')
        return baselineProfile ?? profiles[0]
    }, [profiles, selectedProfileId])

    const enabledPolicyNames = useMemo(
        () =>
            Object.entries(selectedPolicies)
                .filter(([, enabled]) => enabled)
                .map(([name]) => name),
        [selectedPolicies]
    )

    useEffect(() => {
        if (profiles.length === 0) return

        const baselineProfile = profiles.find(profile => profile.id === 'baseline')
        const defaultProfile = baselineProfile ?? profiles[0]

        if (!selectedProfileId || !profiles.some(profile => profile.id === selectedProfileId)) {
            setSelectedProfileId(defaultProfile.id)
        }

        if (!profileAId || !profiles.some(profile => profile.id === profileAId)) {
            setProfileAId(defaultProfile.id)
        }

        if (!profileBId || !profiles.some(profile => profile.id === profileBId)) {
            const alternative = profiles.find(profile => profile.id !== defaultProfile.id) ?? defaultProfile
            setProfileBId(alternative.id)
        }
    }, [profiles, selectedProfileId, profileAId, profileBId])

    useEffect(() => {
        if (!currentProfile?.config) {
            setDraftConfig(null)
            setSelectedPolicies({})
            setPreviewBundle(null)
            setPreviewError(null)
            return
        }

        const configClone = cloneBacktestConfig(currentProfile.config)
        setDraftConfig(configClone)

        const initialSelected: Record<string, boolean> = {}
        for (const policy of configClone.policies) {
            initialSelected[policy.name] = true
        }
        setSelectedPolicies(initialSelected)

        setPreviewBundle(null)
        setPreviewError(null)
    }, [currentProfile])

    useEffect(() => {
        setCompareResult(null)
        setCompareError(null)
    }, [profileAId, profileBId])

    useEffect(() => {
        setPreviewBundle(null)
        setPreviewError(null)
        setCompareResult(null)
        setCompareError(null)
    }, [tpSlMode])

    useEffect(() => {
        if (tpSlMode === 'all') {
            setBaselineModeBundle(null)
            setBaselineModeError(null)
            return
        }

        if (!baselineProfile?.config) {
            setBaselineModeBundle(null)
            setBaselineModeError('Профиль baseline отсутствует или не содержит config для выбранного TP/SL режима.')
            return
        }

        let cancelled = false
        setBaselineModeBundle(null)
        setBaselineModeError(null)

        const runBaselinePreviewByMode = async () => {
            try {
                const result = await runBaselineModePreview({
                    config: cloneBacktestConfig(baselineProfile.config as BacktestConfigDto),
                    tpSlMode
                }).unwrap()

                if (!cancelled) {
                    setBaselineModeBundle(result)
                }
            } catch (error: any) {
                if (cancelled) return
                const message =
                    error?.data?.message ?? error?.error ?? 'Не удалось выполнить preview/full для baseline в выбранном TP/SL режиме.'
                setBaselineModeError(String(message))
            }
        }

        void runBaselinePreviewByMode()

        return () => {
            cancelled = true
        }
    }, [tpSlMode, baselineProfile, runBaselineModePreview])

    const pagerSections = BACKTEST_FULL_TABS
    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections: pagerSections,
        syncHash: true
    })

    if (!currentProfile || !currentProfile.config || !draftConfig) {
        return (
            <div className={cls.content}>
                <Text type='h2'>Инициализирую профиль бэктеста…</Text>
            </div>
        )
    }

    const updateDraftConfigOrThrow = (updater: (prev: BacktestConfigDto) => BacktestConfigDto) => {
        setDraftConfig(prev => {
            if (!prev) {
                throw new Error('Draft config is not initialized.')
            }
            return updater(prev)
        })
    }

    const patchConfidenceRiskNumberFieldOrThrow = (field: string, value: number) => {
        updateDraftConfigOrThrow(prev => {
            if (!prev.confidenceRisk) {
                throw new Error(`Cannot patch confidenceRisk.${field}: confidenceRisk is null.`)
            }

            return {
                ...prev,
                confidenceRisk: {
                    ...prev.confidenceRisk,
                    [field]: value
                }
            }
        })
    }

    const handleStopPctChange = (valueStr: string) => {
        const value = parseInputNumber(valueStr)
        if (value === null || value <= 0) return

        updateDraftConfigOrThrow(prev => ({
            ...prev,
            dailyStopPct: value / 100
        }))
    }

    const handleTpPctChange = (valueStr: string) => {
        const value = parseInputNumber(valueStr)
        if (value === null || value <= 0) return

        updateDraftConfigOrThrow(prev => ({
            ...prev,
            dailyTpPct: value / 100
        }))
    }

    const handleConfidenceRiskPctChange = (field: string, valueStr: string) => {
        const value = parseInputNumber(valueStr)
        if (value === null || value < 0) return
        patchConfidenceRiskNumberFieldOrThrow(field, value / 100)
    }

    const handleConfidenceRiskRawChange = (field: string, valueStr: string) => {
        const value = parseInputNumber(valueStr)
        if (value === null || value < 0) return
        patchConfidenceRiskNumberFieldOrThrow(field, value)
    }

    const handleConfidenceRiskIntChange = (field: string, valueStr: string) => {
        const value = parseInputNumber(valueStr)
        if (value === null || value <= 0) return
        patchConfidenceRiskNumberFieldOrThrow(field, Math.floor(value))
    }

    const handleShiftDynamicTpSl = (mode: 'tighter' | 'wider') => {
        const factor = mode === 'tighter' ? 0.95 : 1.05

        updateDraftConfigOrThrow(prev => {
            if (!prev.confidenceRisk) {
                throw new Error('Cannot shift dynamic TP/SL: confidenceRisk is null.')
            }

            const confidenceRisk = prev.confidenceRisk
            const tpMin = clamp(confidenceRisk.tpMultiplierMin * factor, 0.01, 10)
            const tpMax = clamp(confidenceRisk.tpMultiplierMax * factor, tpMin, 10)
            const slMin = clamp(confidenceRisk.slMultiplierMin * factor, 0.01, 10)
            const slMax = clamp(confidenceRisk.slMultiplierMax * factor, slMin, 10)

            return {
                ...prev,
                confidenceRisk: {
                    ...confidenceRisk,
                    tpMultiplierMin: tpMin,
                    tpMultiplierMax: tpMax,
                    slMultiplierMin: slMin,
                    slMultiplierMax: slMax
                }
            }
        })
    }

    const handlePolicyEnabledChange = (name: string, checked: boolean) => {
        setSelectedPolicies(prev => ({
            ...prev,
            [name]: checked
        }))
    }

    const handlePolicyLeverageChange = (name: string, valueStr: string) => {
        const value = parseInputNumber(valueStr)
        const normalized = valueStr.replace(',', '.').trim()
        if (normalized.length > 0 && value === null) return

        updateDraftConfigOrThrow(prev => ({
            ...prev,
            policies: prev.policies.map(policy =>
                policy.name === name ?
                    {
                        ...policy,
                        leverage: normalized.length === 0 ? null : value
                    }
                :   policy
            )
        }))
    }

    const handleRunPreview = async () => {
        setPreviewError(null)
        setPreviewBundle(null)

        try {
            const result = await runPreviewFull({
                config: draftConfig,
                tpSlMode,
                selectedPolicies: enabledPolicyNames.length > 0 ? enabledPolicyNames : undefined
            }).unwrap()

            setPreviewBundle(result)
        } catch (error: any) {
            const message = error?.data?.message ?? error?.error ?? 'Не удалось выполнить preview/full.'
            setPreviewError(String(message))
        }
    }

    const handleRunCompare = async () => {
        if (!profileAId || !profileBId) {
            setCompareError('Нужно выбрать оба профиля для A/B сравнения.')
            return
        }

        setCompareError(null)
        setCompareResult(null)

        try {
            const result = await runCompare({
                leftProfileId: profileAId,
                rightProfileId: profileBId,
                tpSlMode
            }).unwrap()

            setCompareResult(result)
        } catch (error: any) {
            const message = error?.data?.message ?? error?.error ?? 'Не удалось выполнить backend compare.'
            setCompareError(String(message))
        }
    }

    const previewSummary = previewBundle?.summary ?? null
    const previewPolicyRatios = previewBundle?.policyRatios ?? null

    const summaryA = compareResult?.left.preview.summary ?? null
    const summaryB = compareResult?.right.preview.summary ?? null
    const policyRatiosA = compareResult?.left.preview.policyRatios ?? null
    const policyRatiosB = compareResult?.right.preview.policyRatios ?? null
    const deltaBestTotalPnlPct = compareResult?.delta.bestTotalPnlPctDelta ?? null
    const deltaWorstMaxDdPct = compareResult?.delta.worstMaxDdPctDelta ?? null
    const deltaTotalTrades = compareResult?.delta.totalTradesDelta ?? null

    const isModeScopedBaseline = tpSlMode !== 'all'
    const baselineSummaryForView = isModeScopedBaseline ? baselineModeBundle?.summary ?? null : baselineSummary
    const baselineSummaryLoading = isModeScopedBaseline && baselineModeBundle === null && baselineModeError === null
    const baselineSummaryError = isModeScopedBaseline ? baselineModeError : null
    const baselinePolicyRatiosReport = isModeScopedBaseline ? baselineModeBundle?.policyRatios ?? null : undefined
    const baselinePolicyRatiosLoading = isModeScopedBaseline && baselineModeBundle === null && baselineModeError === null
    const baselinePolicyRatiosError = isModeScopedBaseline ? baselineModeError : null
    const baselineSectionTitle =
        tpSlMode === 'all' ? 'Baseline (сохранённый backtest run)' : `Baseline (${tpSlMode.toUpperCase()} mode, one-shot preview)`
    const baselineSummaryTitle = tpSlMode === 'all' ? 'Baseline summary' : `Baseline summary (${tpSlMode})`

    return (
        <div className={cls.content}>
            <BacktestPageHeader
                profiles={profiles}
                currentProfile={currentProfile}
                onProfileChange={setSelectedProfileId}
                tpSlMode={tpSlMode}
                onTpSlModeChange={setTpSlMode}
            />

            <SectionErrorBoundary
                name='BacktestBaselineMetrics'
                fallback={({ error, reset }) => (
                    <ErrorBlock
                        code='CLIENT'
                        title='Ошибка в блоке baseline-метрик'
                        description='Не удалось отрисовать сравнительные метрики baseline/preview.'
                        details={error.message}
                        onRetry={reset}
                        compact
                    />
                )}>
                <BacktestBaselineMetrics baselineSummary={baselineSummaryForView} previewSummary={previewSummary} />
            </SectionErrorBoundary>

            <div className={cls.columns}>
                <BacktestBaselineColumn
                    baselineSummary={baselineSummaryForView}
                    sectionTitle={baselineSectionTitle}
                    summaryTitle={baselineSummaryTitle}
                    summaryLoading={baselineSummaryLoading}
                    summaryError={baselineSummaryError}
                    policyRatiosReport={baselinePolicyRatiosReport}
                    policyRatiosLoading={baselinePolicyRatiosLoading}
                    policyRatiosError={baselinePolicyRatiosError}
                />
                <BacktestWhatIfColumn
                    currentProfile={currentProfile}
                    draftConfig={draftConfig}
                    selectedPolicies={selectedPolicies}
                    isPreviewLoading={isPreviewLoading}
                    previewError={previewError}
                    previewSummary={previewSummary}
                    previewPolicyRatios={previewPolicyRatios}
                    onStopPctChange={handleStopPctChange}
                    onTpPctChange={handleTpPctChange}
                    onConfidenceRiskPctChange={handleConfidenceRiskPctChange}
                    onConfidenceRiskRawChange={handleConfidenceRiskRawChange}
                    onConfidenceRiskIntChange={handleConfidenceRiskIntChange}
                    onShiftDynamicTpSl={handleShiftDynamicTpSl}
                    onPolicyEnabledChange={handlePolicyEnabledChange}
                    onPolicyLeverageChange={handlePolicyLeverageChange}
                    onRunPreview={handleRunPreview}
                />
            </div>

            <BacktestCompareBlock
                profiles={profiles}
                profileAId={profileAId}
                profileBId={profileBId}
                summaryA={summaryA}
                summaryB={summaryB}
                policyRatiosA={policyRatiosA}
                policyRatiosB={policyRatiosB}
                deltaBestTotalPnlPct={deltaBestTotalPnlPct}
                deltaWorstMaxDdPct={deltaWorstMaxDdPct}
                deltaTotalTrades={deltaTotalTrades}
                compareError={compareError}
                isCompareLoading={isCompareLoading}
                onProfileAChange={setProfileAId}
                onProfileBChange={setProfileBId}
                onRunCompare={handleRunCompare}
            />

            <SectionPager
                sections={pagerSections}
                currentIndex={currentIndex}
                canPrev={canPrev}
                canNext={canNext}
                onPrev={handlePrev}
                onNext={handleNext}
            />
        </div>
    )
}
