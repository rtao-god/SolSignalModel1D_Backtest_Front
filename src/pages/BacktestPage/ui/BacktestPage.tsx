import { useEffect, useMemo, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './BacktestPage.module.scss'
import { Text } from '@/shared/ui'
import type { BacktestConfigDto, BacktestProfileDto, BacktestSummaryDto } from '@/shared/types/backtest.types'
import {
    useGetBacktestBaselineSummaryQuery,
    useGetBacktestProfilesQuery,
    usePreviewBacktestMutation
} from '@/shared/api/api'
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

/**
 * Страница бэктеста:
 * - baseline summary (консольный бэктест);
 * - профили бэктеста (BacktestProfileDto) и форма what-if по конфигу профиля;
 * - сравнение любых двух профилей через preview (A/B).
 * Плюс:
 * - секции с якорями (baseline / whatif / compare) для локальной навигации;
 * - стрелочная пагинация (SectionPager), завязанная на те же секции.
 */
export default function BacktestPage({ className }: BacktestPageProps) {
    // baseline summary (как и раньше)
    const {
        data: baselineSummary,
        isLoading: isBaselineLoading,
        isError: isBaselineError
    } = useGetBacktestBaselineSummaryQuery()

    // список профилей (минимум baseline)
    const { data: profiles, isLoading: isProfilesLoading, isError: isProfilesError } = useGetBacktestProfilesQuery()

    const [previewBacktest, { isLoading: isPreviewLoading }] = usePreviewBacktestMutation()

    // текущий выбранный профиль для формы what-if
    const [selectedProfileId, setSelectedProfileId] = useState<string | null>(null)

    // Черновик конфига, который редактируется на форме.
    const [draftConfig, setDraftConfig] = useState<BacktestConfigDto | null>(null)

    // Флаги “политика включена” по имени.
    const [selectedPolicies, setSelectedPolicies] = useState<Record<string, boolean>>({})

    // Результат последнего preview из формы.
    const [previewSummary, setPreviewSummary] = useState<BacktestSummaryDto | null>(null)

    // Текст ошибки по preview (форма what-if).
    const [previewError, setPreviewError] = useState<string | null>(null)

    // Профили для сравнения A/B.
    const [profileAId, setProfileAId] = useState<string | null>(null)
    const [profileBId, setProfileBId] = useState<string | null>(null)

    // Результаты preview для профилей A и B.
    const [summaryA, setSummaryA] = useState<BacktestSummaryDto | null>(null)
    const [summaryB, setSummaryB] = useState<BacktestSummaryDto | null>(null)

    // Состояние сравнения профилей A/B.
    const [isCompareLoading, setIsCompareLoading] = useState(false)
    const [compareError, setCompareError] = useState<string | null>(null)

    // Текущий профиль для формы по selectedProfileId + fallback на baseline/первый в списке.
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

    // Список включённых политик по имени (для формы what-if).
    const enabledPolicyNames = useMemo(
        () =>
            Object.entries(selectedPolicies)
                .filter(([, enabled]) => enabled)
                .map(([name]) => name),
        [selectedPolicies]
    )

    // Инициализация selectedProfileId и профилей A/B, когда приходят профили.
    useEffect(() => {
        if (!profiles || profiles.length === 0) return

        const baseline = profiles.find(p => p.id === 'baseline')
        const defaultProfile = baseline ?? profiles[0]

        // Профиль для формы.
        if (!selectedProfileId || !profiles.some(p => p.id === selectedProfileId)) {
            setSelectedProfileId(defaultProfile.id)
        }

        // Профиль A для сравнения.
        if (!profileAId || !profiles.some(p => p.id === profileAId)) {
            setProfileAId(defaultProfile.id)
        }

        // Профиль B для сравнения — по возможности другой, чем A.
        if (!profileBId || !profiles.some(p => p.id === profileBId)) {
            const alt = profiles.find(p => p.id !== defaultProfile.id) ?? defaultProfile
            setProfileBId(alt.id)
        }
    }, [profiles, selectedProfileId, profileAId, profileBId])

    // Инициализация draftConfig / selectedPolicies при смене текущего профиля формы.
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

        // При смене профиля сбрасываем preview формы.
        setPreviewSummary(null)
        setPreviewError(null)
    }, [currentProfile])

    // Глобовый флаг загрузки для страницы:
    // - нужен и для отображения "Загружаю...",
    // - и для того, чтобы не запускать якорный скролл, пока разметка секций не готова.
    const isLoadingAll =
        isBaselineLoading ||
        isProfilesLoading ||
        !baselineSummary ||
        !currentProfile ||
        !currentProfile.config ||
        !draftConfig

    // Секции для useSectionPager:
    // - пока страница в загрузке → пустой массив (никакого скролла по hash);
    // - когда всё готово → реальный BACKTEST_FULL_TABS.
    const pagerSections = isLoadingAll ? [] : BACKTEST_FULL_TABS

    // Локальная навигация по секциям (baseline / whatif / compare) через общий useSectionPager.
    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections: pagerSections,
        syncHash: true
    })

    if (isBaselineError || isProfilesError) {
        return (
            <div className={classNames(cls.BacktestPage, {}, [className ?? ''])}>
                <Text type='h2'>Не удалось загрузить данные бэктеста или профили</Text>
            </div>
        )
    }

    if (isLoadingAll) {
        return (
            <div className={classNames(cls.BacktestPage, {}, [className ?? ''])}>
                <Text type='h2'>Загружаю baseline-сводку и профили бэктеста...</Text>
            </div>
        )
    }

    // К этому моменту baselineSummary, currentProfile и draftConfig уже должны быть.

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
            policies: draftConfig.policies.map(p =>
                p.name === name ?
                    {
                        ...p,
                        leverage: value
                    }
                :   p
            )
        })
    }

    // preview для формы what-if (один профиль, editable config).
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

    // preview для сравнения двух профилей A/B (используем config профилей без ручного редактирования).
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
                <Text type='p'>
                    Профили (BacktestProfile) vs one-shot preview по конфигу профиля + сравнение профилей A/B
                </Text>

                {/* Простой селектор профиля для формы what-if. */}
                {profiles && profiles.length > 0 && (
                    <div>
                        <Text type='p'>Профиль бэктеста (форма what-if):</Text>
                        <select value={currentProfile?.id ?? ''} onChange={e => setSelectedProfileId(e.target.value)}>
                            {profiles.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.name || p.id}
                                </option>
                            ))}
                        </select>
                        {currentProfile?.description && <Text type='p'>{currentProfile.description}</Text>}
                    </div>
                )}
            </header>

            {/* Быстрая метрика сравнения по лучшей политике baseline vs preview формы. */}
            <BacktestBaselineMetrics baselineSummary={baselineSummary!} previewSummary={previewSummary} />

            {/* Левая/правая колонка: baseline summary и форма what-if. */}
            <div className={cls.columns}>
                {/* Левая колонка: baseline (консольный бэктест). */}
                <div className={cls.column}>
                    <Text type='h2'>Baseline (консольный бэктест)</Text>
                    <BacktestSummaryView summary={baselineSummary!} title='Baseline summary' />

                    {/* Метрики политик baseline-профиля: график/таблица. */}
                    <BacktestPolicyRatiosSection profileId='baseline' />
                </div>

                {/* Правая колонка: редактор конфига + preview формы. */}
                <div className={cls.column}>
                    <Text type='h2'>What-if конфигурация профиля</Text>

                    <BacktestConfigEditor
                        currentProfile={currentProfile}
                        draftConfig={draftConfig!}
                        selectedPolicies={selectedPolicies}
                        isPreviewLoading={isPreviewLoading}
                        previewError={previewError}
                        onStopPctChange={handleStopPctChange}
                        onTpPctChange={handleTpPctChange}
                        onPolicyEnabledChange={handlePolicyEnabledChange}
                        onPolicyLeverageChange={handlePolicyLeverageChange}
                        onRunPreview={handleRunPreview}
                    />

                    {/* Результат preview формы. */}
                    <section className={cls.previewSection}>
                        <Text type='h2'>Результат preview</Text>
                        {previewSummary ?
                            <BacktestSummaryView summary={previewSummary} title='Preview summary' />
                        :   <Text type='p'>Пока нет результатов превью.</Text>}
                    </section>
                </div>
            </div>

            {/* Секция сравнения двух профилей A/B по результатам preview. */}
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

            {/* Стрелочная пагинация по секциям baseline / whatif / compare. */}
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
