import { useEffect, useMemo, useState } from 'react'
import cls from './BacktestPageContent.module.scss'
import { Text } from '@/shared/ui'
import type { BacktestConfigDto, BacktestProfileDto, BacktestSummaryDto } from '@/shared/types/backtest.types'
import { usePreviewBacktestMutation } from '@/shared/api/api'
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

export function BacktestPageContent({ baselineSummary, profiles }: BacktestPageContentProps) {
    const [previewBacktest, { isLoading: isPreviewLoading }] = usePreviewBacktestMutation()
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)
    const [draftConfig, setDraftConfig] = useState<BacktestConfigDto | null>(null)
    const [selectedPolicies, setSelectedPolicies] = useState<Record<string, boolean>>({})
    const [previewSummary, setPreviewSummary] = useState<BacktestSummaryDto | null>(null)
    const [previewError, setPreviewError] = useState<string | null>(null)
    const [profileAId, setProfileAId] = useState<string | null>(null)
    const [profileBId, setProfileBId] = useState<string | null>(null)
    const [summaryA, setSummaryA] = useState<BacktestSummaryDto | null>(null)
    const [summaryB, setSummaryB] = useState<BacktestSummaryDto | null>(null)
    const [isCompareLoading, setIsCompareLoading] = useState(false)
    const [compareError, setCompareError] = useState<string | null>(null)
    const currentProfile: BacktestProfileDto | null = useMemo(() => {
        if (!profiles || profiles.length === 0) return null

        if (selectedProfileId) {
            const byId = profiles.find(p => p.id === selectedProfileId)
            if (byId) return byId
        }

        const baseline = profiles.find(p => p.id === 'baseline')
        if (baseline) return baseline

        return profiles[0]
    }, [profiles, selectedProfileId])
    const enabledPolicyNames = useMemo(
        () =>
            Object.entries(selectedPolicies)
                .filter(([, enabled]) => enabled)
                .map(([name]) => name),
        [selectedPolicies]
    )
    useEffect(() => {
        if (!profiles || profiles.length === 0) return

        const baseline = profiles.find(p => p.id === 'baseline')
        const defaultProfile = baseline ?? profiles[0]

        if (!selectedProfileId || !profiles.some(p => p.id === selectedProfileId)) {
            setSelectedProfileId(defaultProfile.id)
        }

        if (!profileAId || !profiles.some(p => p.id === profileAId)) {
            setProfileAId(defaultProfile.id)
        }

        if (!profileBId || !profiles.some(p => p.id === profileBId)) {
            const alt = profiles.find(p => p.id !== defaultProfile.id) ?? defaultProfile
            setProfileBId(alt.id)
        }
    }, [profiles, selectedProfileId, profileAId, profileBId])
    useEffect(() => {
        if (!currentProfile || !currentProfile.config) {
            setDraftConfig(null)
            setSelectedPolicies({})
            setPreviewSummary(null)
            setPreviewError(null)
            return
        }

        const cfgClone = cloneBacktestConfig(currentProfile.config)
        setDraftConfig(cfgClone)

        const initialSelected: Record<string, boolean> = {}
        for (const p of cfgClone.policies) {
            initialSelected[p.name] = true
        }
        setSelectedPolicies(initialSelected)

        setPreviewSummary(null)
        setPreviewError(null)
    }, [currentProfile])
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
    const handleStopPctChange = (valueStr: string) => {
        if (!draftConfig) return
        const normalized = valueStr.replace(',', '.')
        const value = Number(normalized)
        if (Number.isNaN(value) || value < 0) {
            return
        }

        setDraftConfig({
            ...draftConfig,
            dailyStopPct: value / 100
        })
    }
    const handleTpPctChange = (valueStr: string) => {
        if (!draftConfig) return
        const normalized = valueStr.replace(',', '.')
        const value = Number(normalized)
        if (Number.isNaN(value) || value < 0) {
            return
        }

        setDraftConfig({
            ...draftConfig,
            dailyTpPct: value / 100
        })
    }
    const handlePolicyEnabledChange = (name: string, checked: boolean) => {
        setSelectedPolicies(prev => ({
            ...prev,
            [name]: checked
        }))
    }
    const handlePolicyLeverageChange = (name: string, valueStr: string) => {
        if (!draftConfig) return

        const normalized = valueStr.replace(',', '.')
        const value = normalized === '' ? null : Number(normalized)
        if (value !== null && Number.isNaN(value)) {
            return
        }

        setDraftConfig({
            ...draftConfig,
            policies: draftConfig.policies.map(p => (p.name === name ? { ...p, leverage: value } : p))
        })
    }
    const handleRunPreview = async () => {
        if (!draftConfig) return

        setPreviewError(null)
        setPreviewSummary(null)

        const body = {
            config: draftConfig,
            selectedPolicies: enabledPolicyNames.length > 0 ? enabledPolicyNames : undefined
        }

        try {
            const result = await previewBacktest(body).unwrap()
            setPreviewSummary(result)
        } catch (err: any) {
            const message = err?.data?.message ?? err?.error ?? 'Не удалось выполнить бэктест (previewBacktest).'
            setPreviewError(String(message))
        }
    }
    const handleRunCompare = async () => {
        if (!profiles || profiles.length === 0) return

        if (!profileAId || !profileBId) {
            setCompareError('Нужно выбрать два профиля для сравнения.')
            return
        }

        const a = profiles.find(p => p.id === profileAId)
        const b = profiles.find(p => p.id === profileBId)

        if (!a || !a.config || !b || !b.config) {
            setCompareError('Оба профиля должны иметь ненулевой config.')
            return
        }

        setCompareError(null)
        setIsCompareLoading(true)

        try {
            const [resA, resB] = await Promise.all([
                previewBacktest({
                    config: a.config,
                    selectedPolicies: undefined
                }).unwrap(),
                previewBacktest({
                    config: b.config,
                    selectedPolicies: undefined
                }).unwrap()
            ])

            setSummaryA(resA)
            setSummaryB(resB)
        } catch (err: any) {
            const message =
                err?.data?.message ?? err?.error ?? 'Не удалось выполнить сравнение профилей (previewBacktest).'
            setCompareError(String(message))
            setSummaryA(null)
            setSummaryB(null)
        } finally {
            setIsCompareLoading(false)
        }
    }

    return (
        <div className={cls.content}>
            <BacktestPageHeader
                profiles={profiles}
                currentProfile={currentProfile}
                onProfileChange={setSelectedProfileId}
            />

            <SectionErrorBoundary
                name='BacktestBaselineMetrics'
                fallback={({ error, reset }) => (
                    <ErrorBlock
                        code='CLIENT'
                        title='Ошибка в блоке baseline-метрик'
                        description='Не удалось отрисовать сравнительные метрики baseline/preview. Остальная часть страницы продолжает работать.'
                        details={error.message}
                        onRetry={reset}
                        compact
                    />
                )}>
                <BacktestBaselineMetrics baselineSummary={baselineSummary} previewSummary={previewSummary} />
            </SectionErrorBoundary>

            <div className={cls.columns}>
                <BacktestBaselineColumn baselineSummary={baselineSummary} />
                <BacktestWhatIfColumn
                    currentProfile={currentProfile}
                    draftConfig={draftConfig}
                    selectedPolicies={selectedPolicies}
                    isPreviewLoading={isPreviewLoading}
                    previewError={previewError}
                    previewSummary={previewSummary}
                    onStopPctChange={handleStopPctChange}
                    onTpPctChange={handleTpPctChange}
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
