import { useMemo } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import { ReportActualStatusCard, Text } from '@/shared/ui'
import { ReportTableCard } from '@/shared/ui/ReportTableCard'
import type { KeyValueSectionDto, ReportSectionDto, TableSectionDto } from '@/shared/types/report.types'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import PageError from '@/shared/ui/errors/PageError/ui/PageError'
import { useBacktestExecutionPipelineReportQuery } from '@/shared/api/tanstackQueries/backtestExecutionPipeline'
import { resolveReportSourceEndpointOrThrow } from '@/shared/utils/reportSourceEndpoint'
import cls from './ExecutionPipelinePage.module.scss'
import type { ExecutionPipelinePageProps } from './types'

const SECTION_DESCRIPTIONS: Record<string, string> = {
    'Model Level':
        'Распределение сигналов модели по всей истории: LONG/SHORT/NO-DIRECTION и их доли. Это верхний слой, до решений политики.',
    'Decision Level':
        'Слой принятия решения политикой: сколько дней реально торговали, какой охват, среднее плечо и средний размер ставки.',
    'Execution Level':
        'Исполнение сделок: источники входов, фактические причины выхода и факты достижимости/срабатывания ликвидации.',
    'Accounting Level':
        'Бухгалтерская сверка: позиционный PnL, комиссии, итоговый net и инварианты соответствия wealth-дельте.',
    'Aggregation Level':
        'Итоговая агрегация метрик на уровне политики: TotalPnl, Drawdown, WinRate, ликвидации и выведенный профит.'
}

interface ParsedPipelineSections {
    keyValueSections: KeyValueSectionDto[]
    tableSections: TableSectionDto[]
}

function normalizeTitle(title: string | undefined): string {
    if (!title) return ''
    return title.replace(/^=+\s*/, '').replace(/\s*=+$/, '').trim()
}

function toDomSlug(value: string): string {
    return value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
}

function isKeyValueSection(section: ReportSectionDto): section is KeyValueSectionDto {
    return Array.isArray((section as KeyValueSectionDto).items)
}

function isTableSection(section: ReportSectionDto): section is TableSectionDto {
    const typed = section as TableSectionDto
    return Array.isArray(typed.columns) && Array.isArray(typed.rows)
}

function parseSectionsOrThrow(sections: ReportSectionDto[]): ParsedPipelineSections {
    if (!Array.isArray(sections)) {
        throw new Error('[execution-pipeline] report.sections must be an array.')
    }

    const keyValueSections: KeyValueSectionDto[] = []
    const tableSections: TableSectionDto[] = []

    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex++) {
        const section = sections[sectionIndex]
        if (!section || typeof section !== 'object') {
            throw new Error(`[execution-pipeline] section is invalid. index=${sectionIndex}.`)
        }

        if (isKeyValueSection(section)) {
            const items = section.items ?? []
            for (let itemIndex = 0; itemIndex < items.length; itemIndex++) {
                const item = items[itemIndex]
                if (!item || !item.key || item.value == null) {
                    throw new Error(
                        `[execution-pipeline] key-value item is invalid. section=${sectionIndex}, item=${itemIndex}.`
                    )
                }
            }

            keyValueSections.push(section)
            continue
        }

        if (isTableSection(section)) {
            const columns = section.columns ?? []
            const rows = section.rows ?? []

            if (columns.length === 0) {
                throw new Error(`[execution-pipeline] table columns are empty. section=${sectionIndex}.`)
            }

            for (let rowIndex = 0; rowIndex < rows.length; rowIndex++) {
                const row = rows[rowIndex] ?? []
                if (!Array.isArray(row)) {
                    throw new Error(
                        `[execution-pipeline] table row is not an array. section=${sectionIndex}, row=${rowIndex}.`
                    )
                }
            }

            tableSections.push(section)
            continue
        }

        throw new Error(`[execution-pipeline] unsupported section format. section=${sectionIndex}.`)
    }

    if (tableSections.length === 0) {
        throw new Error('[execution-pipeline] report does not contain table sections.')
    }

    return { keyValueSections, tableSections }
}

function resolveSectionDescription(title: string): string | undefined {
    return SECTION_DESCRIPTIONS[title]
}

export default function ExecutionPipelinePage({ className }: ExecutionPipelinePageProps) {
    const { data, isError, error, refetch } = useBacktestExecutionPipelineReportQuery()

    const generatedAtState = useMemo(() => {
        if (!data) return { value: null as Date | null, error: null as Error | null }
        if (!data.generatedAtUtc) {
            return { value: null, error: new Error('[execution-pipeline] generatedAtUtc is missing.') }
        }

        const parsed = new Date(data.generatedAtUtc)
        if (Number.isNaN(parsed.getTime())) {
            return {
                value: null,
                error: new Error(`[execution-pipeline] generatedAtUtc is invalid: ${data.generatedAtUtc}`)
            }
        }

        return { value: parsed, error: null }
    }, [data])

    const sourceEndpointState = useMemo(() => {
        try {
            return {
                value: resolveReportSourceEndpointOrThrow(),
                error: null as Error | null
            }
        } catch (err) {
            const safeError = err instanceof Error ? err : new Error('Failed to resolve report source endpoint.')
            return {
                value: null as string | null,
                error: safeError
            }
        }
    }, [])

    const parsedSectionsState = useMemo(() => {
        if (!data) {
            return { value: null as ParsedPipelineSections | null, error: null as Error | null }
        }

        try {
            return {
                value: parseSectionsOrThrow(data.sections),
                error: null as Error | null
            }
        } catch (err) {
            const safeError =
                err instanceof Error ? err : new Error('Failed to parse execution pipeline report sections.')
            return {
                value: null as ParsedPipelineSections | null,
                error: safeError
            }
        }
    }, [data])

    const rootClassName = classNames(cls.root, {}, [className ?? ''])

    let content: JSX.Element | null = null
    if (data) {
        if (generatedAtState.error || !generatedAtState.value) {
            const safeError =
                generatedAtState.error ??
                new Error('[execution-pipeline] generatedAtUtc is missing after validation.')

            content = (
                <PageError
                    title='Execution pipeline report has invalid generatedAtUtc'
                    message='generatedAtUtc отсутствует или невалиден. Проверь сериализацию отчёта.'
                    error={safeError}
                    onRetry={refetch}
                />
            )
        } else if (sourceEndpointState.error || !sourceEndpointState.value) {
            const safeError =
                sourceEndpointState.error ??
                new Error('[execution-pipeline] report source endpoint is missing after validation.')

            content = (
                <PageError
                    title='Execution pipeline report source is invalid'
                    message='API source endpoint is missing or invalid. Проверь VITE_API_BASE_URL / VITE_DEV_API_PROXY_TARGET.'
                    error={safeError}
                    onRetry={refetch}
                />
            )
        } else if (parsedSectionsState.error || !parsedSectionsState.value) {
            const safeError =
                parsedSectionsState.error ??
                new Error('[execution-pipeline] sections are missing after validation.')

            content = (
                <PageError
                    title='Execution pipeline report sections are invalid'
                    message='Секции отчёта не распознаны или повреждены. Проверь структуру report.sections.'
                    error={safeError}
                    onRetry={refetch}
                />
            )
        } else {
            content = (
                <div className={rootClassName}>
                    <header className={cls.hero}>
                        <div>
                            <Text type='h1' className={cls.heroTitle}>
                                Execution Pipeline
                            </Text>
                            <Text className={cls.heroSubtitle}>
                                Сквозной отчёт по уровням: модель, решение, исполнение, бухгалтерия и финальная
                                агрегация в mega-метрики.
                            </Text>
                        </div>

                        <ReportActualStatusCard
                            statusMode='debug'
                            statusTitle='DEBUG: freshness not verified'
                            statusMessage='Status endpoint для backtest_execution_pipeline не настроен: показываются metadata отчёта без freshness-проверки.'
                            dataSource={sourceEndpointState.value}
                            reportTitle={data.title}
                            reportId={data.id}
                            reportKind={data.kind}
                            generatedAtUtc={data.generatedAtUtc}
                        />
                    </header>

                    {parsedSectionsState.value.keyValueSections.length > 0 && (
                        <section className={cls.keyValueSection}>
                            {parsedSectionsState.value.keyValueSections.map((section, sectionIndex) => {
                                const sectionTitle = normalizeTitle(section.title) || `Pipeline Config ${sectionIndex + 1}`
                                return (
                                    <article key={`${sectionTitle}-${sectionIndex}`} className={cls.keyValueCard}>
                                        <Text type='h3' className={cls.keyValueTitle}>
                                            {sectionTitle}
                                        </Text>
                                        <dl className={cls.keyValueGrid}>
                                            {(section.items ?? []).map(item => (
                                                <div key={item.key} className={cls.keyValueRow}>
                                                    <dt className={cls.keyValueKey}>{item.key}</dt>
                                                    <dd className={cls.keyValueValue}>{item.value}</dd>
                                                </div>
                                            ))}
                                        </dl>
                                    </article>
                                )
                            })}
                        </section>
                    )}

                    <section className={cls.tablesSection}>
                        {parsedSectionsState.value.tableSections.map((section, sectionIndex) => {
                            const title = normalizeTitle(section.title) || `Execution Pipeline ${sectionIndex + 1}`
                            const domIdBase = toDomSlug(title) || `execution-pipeline-${sectionIndex + 1}`
                            return (
                                <ReportTableCard
                                    key={`${title}-${sectionIndex}`}
                                    title={title}
                                    description={resolveSectionDescription(title)}
                                    columns={section.columns ?? []}
                                    rows={section.rows ?? []}
                                    domId={`execution-pipeline-${sectionIndex + 1}-${domIdBase}`}
                                />
                            )
                        })}
                    </section>
                </div>
            )
        }
    }

    return (
        <PageDataBoundary
            isError={isError}
            error={error}
            hasData={Boolean(data)}
            onRetry={refetch}
            errorTitle='Не удалось загрузить execution pipeline'>
            {content}
        </PageDataBoundary>
    )
}

