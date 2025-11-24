import { useEffect, useMemo, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './BacktestPage.module.scss'
import { Text } from '@/shared/ui'
import type {
    BacktestConfigDto,
    BacktestPolicyConfigDto,
    BacktestSummaryDto,
    BacktestProfileDto
} from '@/shared/types/backtest.types'
import type { KeyValueSectionDto, ReportSectionDto, TableSectionDto } from '@/shared/types/report.types'
import {
    useGetBacktestBaselineSummaryQuery,
    useGetBacktestProfilesQuery,
    usePreviewBacktestMutation
} from '@/shared/api/api'
import BacktestPageProps from './types'

/**
 * Страница бэктеста:
 * - baseline summary (консольный бэктест);
 * - профили бэктеста (BacktestProfileDto) и форма what-if по конфигу профиля;
 * - сравнение любых двух профилей через preview (A/B).
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

    // Профили для слотов A и B (могут отличаться от currentProfile).
    const profileA: BacktestProfileDto | null = useMemo(() => {
        if (!profiles || profiles.length === 0) return null
        if (profileAId) {
            const found = profiles.find(p => p.id === profileAId)
            if (found) return found
        }
        return null
    }, [profiles, profileAId])

    const profileB: BacktestProfileDto | null = useMemo(() => {
        if (!profiles || profiles.length === 0) return null
        if (profileBId) {
            const found = profiles.find(p => p.id === profileBId)
            if (found) return found
        }
        return null
    }, [profiles, profileBId])

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

    const isLoadingAll =
        isBaselineLoading ||
        isProfilesLoading ||
        !baselineSummary ||
        !currentProfile ||
        !currentProfile.config ||
        !draftConfig

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
    const baselineBestPnl = getMetricValue(baselineSummary!, 'BestTotalPnlPct')
    const previewBestPnl = getMetricValue(previewSummary, 'BestTotalPnlPct')
    const deltaPnl = baselineBestPnl !== null && previewBestPnl !== null ? previewBestPnl - baselineBestPnl : null

    // Метрики для сравнения профилей A/B (используем те же ключи, что и в BacktestSummaryReport).
    const profileABestPnl = getMetricValue(summaryA, 'BestTotalPnlPct')
    const profileBBestPnl = getMetricValue(summaryB, 'BestTotalPnlPct')

    // Пример risk-метрики: худший max drawdown по метрике WorstMaxDdPct (если она есть в отчёте).
    const profileADrawdown = getMetricValue(summaryA, 'WorstMaxDdPct')
    const profileBDrawdown = getMetricValue(summaryB, 'WorstMaxDdPct')

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
            <section className={cls.metricsRow}>
                <Text type='h2'>Итог по лучшей политике (BestTotalPnlPct)</Text>
                <div className={cls.metricsValues}>
                    <Text type='p'>Baseline: {baselineBestPnl !== null ? `${baselineBestPnl.toFixed(2)} %` : '—'}</Text>
                    <Text type='p'>Preview: {previewBestPnl !== null ? `${previewBestPnl.toFixed(2)} %` : '—'}</Text>
                    <Text type='p'>
                        Δ: {deltaPnl !== null ? `${deltaPnl >= 0 ? '+' : ''}${deltaPnl.toFixed(2)} %` : '—'}
                    </Text>
                </div>
            </section>

            {/* Левая/правая колонка: baseline summary и форма what-if. */}
            <div className={cls.columns}>
                {/* Левая колонка: baseline (консольный бэктест). */}
                <div className={cls.column}>
                    <Text type='h2'>Baseline (консольный бэктест)</Text>
                    <BacktestSummaryView summary={baselineSummary!} title='Baseline summary' />
                </div>

                {/* Правая колонка: редактор конфига + preview формы. */}
                <div className={cls.column}>
                    <Text type='h2'>What-if конфигурация профиля</Text>

                    {/* Редактор конфига выбранного профиля */}
                    <section className={cls.configEditor}>
                        <Text type='p'>
                            Основа: конфиг выбранного профиля
                            {currentProfile ? ` (${currentProfile.name})` : ''}.
                        </Text>

                        <div className={cls.configRow}>
                            <label className={cls.label}>
                                Daily SL (%):
                                <input
                                    type='number'
                                    className={cls.input}
                                    value={draftConfig ? (draftConfig.dailyStopPct * 100).toFixed(2) : ''}
                                    onChange={e => handleStopPctChange(e.target.value)}
                                />
                            </label>

                            <label className={cls.label}>
                                Daily TP (%):
                                <input
                                    type='number'
                                    className={cls.input}
                                    value={draftConfig ? (draftConfig.dailyTpPct * 100).toFixed(2) : ''}
                                    onChange={e => handleTpPctChange(e.target.value)}
                                />
                            </label>
                        </div>

                        <div className={cls.policiesBlock}>
                            <Text type='h3'>Политики плеча</Text>
                            <table className={cls.table}>
                                <thead>
                                    <tr>
                                        <th>Вкл</th>
                                        <th>Имя</th>
                                        <th>Тип</th>
                                        <th>Плечо</th>
                                        <th>Маржа</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {draftConfig!.policies.map((p: BacktestPolicyConfigDto) => {
                                        const enabled = selectedPolicies[p.name] ?? true
                                        const isConst = p.policyType === 'const'
                                        return (
                                            <tr key={p.name}>
                                                <td>
                                                    <input
                                                        type='checkbox'
                                                        checked={enabled}
                                                        onChange={e =>
                                                            handlePolicyEnabledChange(p.name, e.target.checked)
                                                        }
                                                    />
                                                </td>
                                                <td>{p.name}</td>
                                                <td>{p.policyType}</td>
                                                <td>
                                                    <input
                                                        type='number'
                                                        className={cls.input}
                                                        value={p.leverage != null ? String(p.leverage) : ''}
                                                        onChange={e =>
                                                            handlePolicyLeverageChange(p.name, e.target.value)
                                                        }
                                                        disabled={!isConst}
                                                    />
                                                </td>
                                                <td>{p.marginMode}</td>
                                            </tr>
                                        )
                                    })}
                                </tbody>
                            </table>
                        </div>

                        <button
                            type='button'
                            className={cls.runButton}
                            onClick={handleRunPreview}
                            disabled={isPreviewLoading}>
                            {isPreviewLoading ? 'Запускаю тест...' : 'Запустить тест'}
                        </button>

                        {previewError && (
                            <Text type='p' className={cls.errorText}>
                                {previewError}
                            </Text>
                        )}
                    </section>

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
            <section className={cls.compareSection}>
                <Text type='h2'>Сравнение профилей A / B</Text>

                {/* Выбор профилей для слотов A и B */}
                {profiles && profiles.length > 0 && (
                    <div className={cls.compareSelectors}>
                        <div className={cls.selector}>
                            <Text type='p'>Профиль A:</Text>
                            <select
                                value={profileAId ?? ''}
                                onChange={e => setProfileAId(e.target.value)}
                                className={cls.select}>
                                {profiles.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name || p.id}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className={cls.selector}>
                            <Text type='p'>Профиль B:</Text>
                            <select
                                value={profileBId ?? ''}
                                onChange={e => setProfileBId(e.target.value)}
                                className={cls.select}>
                                {profiles.map(p => (
                                    <option key={p.id} value={p.id}>
                                        {p.name || p.id}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                )}

                {/* Компактный comparator по основным метрикам */}
                <div className={cls.compareMetrics}>
                    <Text type='h3'>Основные метрики (preview A/B)</Text>
                    <div className={cls.metricsValues}>
                        <Text type='p'>
                            BestTotalPnlPct:&nbsp;A =
                            {profileABestPnl !== null ? ` ${profileABestPnl.toFixed(2)} %` : ' —'}, B =
                            {profileBBestPnl !== null ? ` ${profileBBestPnl.toFixed(2)} %` : ' —'}
                        </Text>
                        <Text type='p'>
                            WorstMaxDdPct:&nbsp;A =
                            {profileADrawdown !== null ? ` ${profileADrawdown.toFixed(2)} %` : ' —'}, B =
                            {profileBDrawdown !== null ? ` ${profileBDrawdown.toFixed(2)} %` : ' —'}
                        </Text>
                    </div>
                </div>

                <button type='button' className={cls.runButton} onClick={handleRunCompare} disabled={isCompareLoading}>
                    {isCompareLoading ? 'Сравниваю профили...' : 'Запустить сравнение A/B'}
                </button>

                {compareError && (
                    <Text type='p' className={cls.errorText}>
                        {compareError}
                    </Text>
                )}

                <div className={cls.columns}>
                    <div className={cls.column}>
                        <Text type='h3'>Профиль A{profileA ? ` (${profileA.name || profileA.id})` : ''}</Text>
                        {summaryA ?
                            <BacktestSummaryView summary={summaryA} title='Результат профиля A' />
                        :   <Text type='p'>Ещё нет результата preview для профиля A.</Text>}
                    </div>

                    <div className={cls.column}>
                        <Text type='h3'>Профиль B{profileB ? ` (${profileB.name || profileB.id})` : ''}</Text>
                        {summaryB ?
                            <BacktestSummaryView summary={summaryB} title='Результат профиля B' />
                        :   <Text type='p'>Ещё нет результата preview для профиля B.</Text>}
                    </div>
                </div>
            </section>
        </div>
    )
}

/**
 * Универсальный рендер сводки бэктеста (ReportDocumentDto).
 * Использует тот же подход, что и страница current-prediction.
 */
interface BacktestSummaryViewProps {
    summary: BacktestSummaryDto
    title: string
}

function BacktestSummaryView({ summary, title }: BacktestSummaryViewProps) {
    const generatedUtc = summary.generatedAtUtc ? new Date(summary.generatedAtUtc) : null
    const generatedUtcStr = generatedUtc ? generatedUtc.toISOString().replace('T', ' ').replace('Z', ' UTC') : '—'
    const generatedLocalStr = generatedUtc ? generatedUtc.toLocaleString() : '—'

    const hasSections = Array.isArray(summary.sections) && summary.sections.length > 0

    return (
        <div className={cls.summaryCard}>
            <header className={cls.summaryHeader}>
                <Text type='h3'>{title}</Text>
                <Text type='p'>ID отчёта: {summary.id}</Text>
                <Text type='p'>Тип: {summary.kind}</Text>
                <Text type='p'>Сгенерировано (UTC): {generatedUtcStr}</Text>
                <Text type='p'>Сгенерировано (локальное время): {generatedLocalStr}</Text>
            </header>

            <div className={cls.sections}>
                {hasSections ?
                    summary.sections.map((section, index) => <SectionRenderer key={index} section={section} />)
                :   <Text type='p'>Нет секций отчёта для отображения.</Text>}
            </div>
        </div>
    )
}

interface SectionRendererProps {
    section: ReportSectionDto
}

/**
 * Универсальный рендер секций:
 * - если есть items → KeyValue;
 * - если есть columns/rows → таблица;
 * - иначе дамп JSON.
 */
function SectionRenderer({ section }: SectionRendererProps) {
    const kv = section as KeyValueSectionDto
    const tbl = section as TableSectionDto

    // KeyValue секция
    if (Array.isArray(kv.items)) {
        return
        ;<section className={cls.section}>
            <Text type='h3'>{kv.title}</Text>
            <dl className={cls.kvList}>
                {kv.items!.map(item => (
                    <div key={item.key} className={cls.kvRow}>
                        <dt>{item.key}</dt>
                        <dd>{item.value}</dd>
                    </div>
                ))}
            </dl>
        </section>
    }

    // Табличная секция
    if (Array.isArray(tbl.columns) && Array.isArray(tbl.rows)) {
        return (
            <section className={cls.section}>
                <Text type='h3'>{tbl.title}</Text>
                <table className={cls.table}>
                    <thead>
                        <tr>
                            {tbl.columns!.map(col => (
                                <th key={col}>{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {tbl.rows!.map((row, rowIdx) => (
                            <tr key={rowIdx}>
                                {row.map((cell, cellIdx) => (
                                    <td key={cellIdx}>{cell}</td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </section>
        )
    }

    // Фолбэк для неожиданных секций
    return (
        <section className={cls.section}>
            <Text type='h3'>{section.title}</Text>
            <pre className={cls.rawJson}>{JSON.stringify(section, null, 2)}</pre>
        </section>
    )
}

/**
 * Вытаскивает числовое значение метрики из KeyValue-секций по ключу.
 * Например, BestTotalPnlPct, WorstMaxDdPct и т.п.
 */
function getMetricValue(summary: BacktestSummaryDto | null, key: string): number | null {
    if (!summary) return null
    if (!Array.isArray(summary.sections)) return null

    for (const section of summary.sections) {
        const kv = section as KeyValueSectionDto
        if (!Array.isArray(kv.items)) continue

        const item = kv.items.find(it => it.key === key)
        if (!item) continue

        const normalized = String(item.value).replace('%', '').replace(',', '.')
        const value = Number(normalized)
        if (Number.isNaN(value)) continue

        return value
    }

    return null
}

/**
 * Клонирует BacktestConfigDto, чтобы не мутировать исходный config профиля.
 */
function cloneBacktestConfig(config: BacktestConfigDto): BacktestConfigDto {
    return {
        dailyStopPct: config.dailyStopPct,
        dailyTpPct: config.dailyTpPct,
        policies: config.policies.map(p => ({ ...p }))
    }
}
