import { useEffect, useMemo, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './BacktestPage.module.scss'
import { Text } from '@/shared/ui'
import type { BacktestConfigDto, BacktestProfileDto, BacktestSummaryDto } from '@/shared/types/backtest.types'
import { useGetBacktestProfilesQuery, usePreviewBacktestMutation } from '@/shared/api/api'
import { BACKTEST_FULL_TABS } from '@/shared/utils/backtestTabs'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { cloneBacktestConfig } from '@/shared/utils/backtestConfig'
import BacktestPageProps from './types'
import { BacktestBaselineMetrics } from './BacktestBaselineMetrics/BacktestBaselineMetrics'
import { BacktestSummaryView } from './BacktestSummaryView/BacktestSummaryView'
import { BacktestConfigEditor } from './BacktestConfigEditor/BacktestConfigEditor'
import { BacktestCompareSection } from './BacktestCompareSection/BacktestCompareSection'
import { BacktestPolicyRatiosSection } from './BacktestPolicyRatiosSection/BacktestPolicyRatiosSection'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import PageSuspense from '@/shared/ui/loaders/PageSuspense/ui/PageSuspense'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import { useBacktestBaselineSummaryReportQuery } from '@/shared/api/tanstackQueries/backtestBaseline'

interface BacktestPageContentProps extends BacktestPageProps {
    baselineSummary: BacktestSummaryDto
    profiles: BacktestProfileDto[]
}

/**
 * Внутренний контент страницы бэктеста.
 * На вход приходит уже успешно загруженный baselineSummary + список профилей.
 * HTTP-ошибки и глобальный loader обрабатываются на уровне BacktestPageWithBoundary.
 */
function BacktestPageContent({ className, baselineSummary, profiles }: BacktestPageContentProps) {
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

    // Инициализация выбранных профилей для what-if и compare.
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

    // Инициализация драфт-конфига и включённых политик при смене профиля.
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

    // Локальный guard на случай, если нет валидного profle/config (доменный кейс, не HTTP).
    if (!currentProfile || !currentProfile.config || !draftConfig) {
        return (
            <div className={classNames(cls.BacktestPage, {}, [className ?? ''])}>
                <Text type='h2'>Инициализирую профиль бэктеста…</Text>
            </div>
        )
    }

    const pagerSections = BACKTEST_FULL_TABS

    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections: pagerSections,
        syncHash: true
    })

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
        <div className={classNames(cls.BacktestPage, {}, [className ?? ''])}>
            <header className={cls.header}>
                <Text type='h1'>Бэктест SOL/USDT</Text>
                <Text>Профили (BacktestProfile) vs one-shot preview по конфигу профиля + сравнение профилей A/B</Text>

                {profiles && profiles.length > 0 && (
                    <div>
                        <Text>Профиль бэктеста (форма what-if):</Text>
                        <select value={currentProfile?.id ?? ''} onChange={e => setSelectedProfileId(e.target.value)}>
                            {profiles.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name || p.id}
                                </option>
                            ))}
                        </select>
                        {currentProfile?.description && <Text>{currentProfile.description}</Text>}
                    </div>
                )}
            </header>

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
                <SectionErrorBoundary
                    name='BacktestBaselineColumn'
                    fallback={({ error, reset }) => (
                        <ErrorBlock
                            code='CLIENT'
                            title='Ошибка в блоке baseline'
                            description='Блок baseline временно недоступен из-за ошибки на клиенте. What-if и сравнение профилей остаются доступными.'
                            details={error.message}
                            onRetry={reset}
                        />
                    )}>
                    <div className={cls.column}>
                        <Text type='h2'>Baseline (консольный бэктест)</Text>
                        <BacktestSummaryView summary={baselineSummary} title='Baseline summary' />
                        <BacktestPolicyRatiosSection profileId='baseline' />
                    </div>
                </SectionErrorBoundary>

                <SectionErrorBoundary
                    name='BacktestWhatIfColumn'
                    fallback={({ error, reset }) => (
                        <ErrorBlock
                            code='CLIENT'
                            title='Блок What-if временно недоступен'
                            description='При отрисовке блока What-if произошла ошибка на клиенте. Baseline и сравнение профилей продолжают работать.'
                            details={error.message}
                            onRetry={reset}
                        />
                    )}>
                    <div className={cls.column}>
                        <Text type='h2'>What-if конфигурация профиля</Text>

                        <BacktestConfigEditor
                            currentProfile={currentProfile}
                            draftConfig={draftConfig}
                            selectedPolicies={selectedPolicies}
                            isPreviewLoading={isPreviewLoading}
                            previewError={previewError}
                            onStopPctChange={handleStopPctChange}
                            onTpPctChange={handleTpPctChange}
                            onPolicyEnabledChange={handlePolicyEnabledChange}
                            onPolicyLeverageChange={handlePolicyLeverageChange}
                            onRunPreview={handleRunPreview}
                        />

                        <section className={cls.previewSection}>
                            <Text type='h2'>Результат preview</Text>
                            {previewSummary ?
                                <BacktestSummaryView summary={previewSummary} title='Preview summary' />
                            :   <Text>Пока нет результатов превью.</Text>}
                        </section>
                    </div>
                </SectionErrorBoundary>
            </div>

            <SectionErrorBoundary
                name='BacktestCompareSection'
                fallback={({ error, reset }) => (
                    <ErrorBlock
                        code='CLIENT'
                        title='Блок сравнения профилей временно недоступен'
                        description='При отрисовке блока сравнения A/B произошла ошибка на клиенте. Baseline и What-if продолжают работать.'
                        details={error.message}
                        onRetry={reset}
                    />
                )}>
                <BacktestCompareSection
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
            </SectionErrorBoundary>

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

/**
 * Обёртка страницы бэктеста:
 * - грузит baseline summary (TanStack) и профили (RTK);
 * - отдаёт их в PageDataBoundary для единого поведения loader/HTTP-ошибок;
 * - внутренняя логика страницы работает уже только с валидными данными.
 */
function BacktestPageWithBoundary(props: BacktestPageProps) {
    const {
        data: baselineSummary,
        isError: isBaselineError,
        error: baselineError,
        refetch: refetchBaseline
    } = useBacktestBaselineSummaryReportQuery()

    const {
        data: profiles,
        isError: isProfilesError,
        error: profilesError,
        refetch: refetchProfiles
    } = useGetBacktestProfilesQuery()

    const hasProfiles = Array.isArray(profiles) && profiles.length > 0
    const hasData = Boolean(baselineSummary && hasProfiles)

    const isError = Boolean(isBaselineError || isProfilesError)
    const mergedError = (isBaselineError ? baselineError : profilesError) ?? undefined

    const handleRetry = () => {
        void refetchBaseline()
        void refetchProfiles()
    }

    return (
        <PageDataBoundary
            isError={isError}
            error={mergedError}
            hasData={hasData}
            onRetry={handleRetry}
            errorTitle='Не удалось загрузить baseline-сводку и профили бэктеста'>
            {hasData && (
                <BacktestPageContent
                    {...props}
                    baselineSummary={baselineSummary as BacktestSummaryDto}
                    profiles={profiles as BacktestProfileDto[]}
                />
            )}
        </PageDataBoundary>
    )
}

/**
 * Внешний экспорт страницы:
 * - оборачивает контент в PageSuspense, чтобы Suspense-хуки по baseline работали корректно.
 */
export default function BacktestPage(props: BacktestPageProps) {
    return (
        <PageSuspense title='Загружаю baseline-сводку и профили бэктеста…'>
            <BacktestPageWithBoundary {...props} />
        </PageSuspense>
    )
}
