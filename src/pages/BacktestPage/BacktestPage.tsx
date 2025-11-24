import { useEffect, useMemo, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './BacktestPage.module.scss'
import { Text } from '@/shared/ui'
import type { BacktestConfigDto, BacktestPolicyConfigDto, BacktestSummaryDto } from '@/shared/types/backtest.types'
import type { KeyValueSectionDto, ReportSectionDto, TableSectionDto } from '@/shared/types/report.types'
import {
    useGetBacktestBaselineSummaryQuery,
    useGetBacktestConfigQuery,
    usePreviewBacktestMutation
} from '@/shared/api/api'
import BacktestPageProps from './types'

/**
 * Страница бэктеста:
 * - слева baseline (конфиг + summary из консольного бэктеста);
 * - справа what-if preview по отредактированному конфигу.
 *
 * Базовая идея:
 * - не дублировать логику конфига: baseline-конфиг тянем с бэка;
 * - baseline-summary и preview-summary имеют одинаковый формат (ReportDocumentDto),
 *   поэтому рендерим их одним и тем же компонентом BacktestSummaryView;
 * - метрики типа BestTotalPnlPct считаем из KeyValue-секций через getMetricValue.
 */
export default function BacktestPage({ className }: BacktestPageProps) {
    const { data: baselineConfig, isLoading: isConfigLoading, isError: isConfigError } = useGetBacktestConfigQuery()

    const {
        data: baselineSummary,
        isLoading: isBaselineLoading,
        isError: isBaselineError
    } = useGetBacktestBaselineSummaryQuery()

    const [previewBacktest, { isLoading: isPreviewLoading }] = usePreviewBacktestMutation()

    // Черновик конфига, который редактируется на форме.
    const [draftConfig, setDraftConfig] = useState<BacktestConfigDto | null>(null)

    // Флаги “политика включена” по имени.
    const [selectedPolicies, setSelectedPolicies] = useState<Record<string, boolean>>({})

    // Результат последнего preview.
    const [previewSummary, setPreviewSummary] = useState<BacktestSummaryDto | null>(null)

    // Текст ошибки по preview.
    const [previewError, setPreviewError] = useState<string | null>(null)

    // Массив включённых политик (по имени), вычисляется из selectedPolicies.
    const enabledPolicyNames = useMemo(
        () =>
            Object.entries(selectedPolicies)
                .filter(([, enabled]) => enabled)
                .map(([name]) => name),
        [selectedPolicies]
    )

    // Инициализация черновика при первом успешном получении baseline-конфига.
    // Делаем это в useEffect, чтобы не затирать ручные изменения.
    useEffect(() => {
        if (!baselineConfig) return
        if (draftConfig) return

        setDraftConfig(baselineConfig)

        const initialSelected: Record<string, boolean> = {}
        for (const p of baselineConfig.policies) {
            initialSelected[p.name] = true
        }
        setSelectedPolicies(initialSelected)
    }, [baselineConfig, draftConfig])

    const isLoadingAll = isConfigLoading || isBaselineLoading || !draftConfig || !baselineSummary

    if (isConfigError || isBaselineError) {
        return (
            <div className={classNames(cls.BacktestPage, {}, [className ?? ''])}>
                <Text type='h2'>Не удалось загрузить данные бэктеста</Text>
            </div>
        )
    }

    if (isLoadingAll) {
        return (
            <div className={classNames(cls.BacktestPage, {}, [className ?? ''])}>
                <Text type='h2'>Загружаю baseline-конфиг и сводку бэктеста...</Text>
            </div>
        )
    }

    // К этому моменту draftConfig и baselineSummary уже должны быть.
    const baselineBestPnl = getMetricValue(baselineSummary!, 'BestTotalPnlPct')
    const previewBestPnl = getMetricValue(previewSummary, 'BestTotalPnlPct')
    const deltaPnl = baselineBestPnl !== null && previewBestPnl !== null ? previewBestPnl - baselineBestPnl : null

    const handleStopPctChange = (valueStr: string) => {
        if (!draftConfig) return
        const normalized = valueStr.replace(',', '.')
        const value = Number(normalized)
        if (Number.isNaN(value) || value < 0) {
            return
        }

        setDraftConfig({
            ...draftConfig,
            // в UI редактируется процент, а в конфиге — доля
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
            // Бэк сейчас может возвращать, например, 500/501 — обрабатываем это как обычную ошибку.
            const message = err?.data?.message ?? err?.error ?? 'Не удалось выполнить бэктест (previewBacktest).'
            setPreviewError(String(message))
        }
    }

    return (
        <div className={classNames(cls.BacktestPage, {}, [className ?? ''])}>
            <header className={cls.header}>
                <Text type='h1'>Бэктест SOL/USDT</Text>
                <Text type='p'>Baseline vs one-shot preview по BacktestConfig</Text>
            </header>

            {/* Быстрая метрика сравнения по лучшей политике */}
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

            <div className={cls.columns}>
                {/* Левая колонка: baseline */}
                <div className={cls.column}>
                    <Text type='h2'>Baseline (консольный бэктест)</Text>
                    <BacktestSummaryView summary={baselineSummary!} title='Baseline summary' />
                </div>

                {/* Правая колонка: редактор конфига + preview */}
                <div className={cls.column}>
                    <Text type='h2'>What-if конфигурация</Text>

                    {/* Редактор конфига */}
                    <section className={cls.configEditor}>
                        <Text type='p'>Основа: baseline-конфиг с возможностью правок.</Text>

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

                    {/* Результат preview */}
                    <section className={cls.previewSection}>
                        <Text type='h2'>Результат preview</Text>
                        {previewSummary ?
                            <BacktestSummaryView summary={previewSummary} title='Preview summary' />
                        :   <Text type='p'>Пока нет результатов превью.</Text>}
                    </section>
                </div>
            </div>
        </div>
    )
}

/**
 * Универсальный рендер сводки бэктеста (ReportDocumentDto).
 * Использует тот же подход, что и страница current-prediction / BacktestSummaryReport.
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
 *
 * Это та же логика, что и в BacktestSummaryReportPage, только с другими уровнями заголовков.
 * Дублирование потом можно вынести в shared-компонент.
 */
function SectionRenderer({ section }: SectionRendererProps) {
    const kv = section as KeyValueSectionDto
    const tbl = section as TableSectionDto

    // KeyValue секция
    if (Array.isArray(kv.items)) {
        return (
            <section className={cls.section}>
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
        )
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
