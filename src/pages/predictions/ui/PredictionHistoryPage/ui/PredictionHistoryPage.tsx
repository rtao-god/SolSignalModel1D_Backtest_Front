import { useEffect, useMemo, useState } from 'react'
import { skipToken } from '@reduxjs/toolkit/query'
import { useSelector } from 'react-redux'
import classNames from '@/shared/lib/helpers/classNames'
import { BucketFilterToggle, Icon, ReportTableCard, Text } from '@/shared/ui'
import { useGetCurrentPredictionByDateQuery } from '@/shared/api/api'
import { selectArrivalDate, selectDepartureDate } from '@/entities/date'
import cls from './PredictionHistoryPage.module.scss'
import DatePicker from '@/features/datePicker/ui/DatePicker/DatePicker'
import { resolveAppError } from '@/shared/lib/errors/resolveAppError'
import { ReportDocumentView } from '@/shared/ui/ReportDocumentView/ui/ReportDocumentView'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import { useCurrentPredictionIndexQuery } from '@/shared/api/tanstackQueries/currentPrediction'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import PageSuspense from '@/shared/ui/loaders/PageSuspense/ui/PageSuspense'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import type { CurrentPredictionSet } from '@/shared/api/endpoints/reportEndpoints'
import SectionPager from '@/shared/ui/SectionPager/ui/SectionPager'
import { useSectionPager } from '@/shared/ui/SectionPager/model/useSectionPager'
import { resolveTrainingLabel } from '@/shared/utils/reportTraining'
import { renderTermTooltipTitle } from '@/shared/ui/TermTooltip'
import { resolveReportColumnTooltip } from '@/shared/utils/reportTooltips'
import type { ReportDocumentDto, ReportSectionDto } from '@/shared/types/report.types'
import type { TableRow } from '@/shared/ui/SortableTable'
import { tryParseNumberFromString } from '@/shared/ui/SortableTable'
import type { PredictionHistoryPageProps } from './types'
const PAGE_SIZE = 10
const IN_PAGE_SCROLL_STEP = Math.max(1, Math.floor(PAGE_SIZE / 2))
const HISTORY_SET: CurrentPredictionSet = 'backfilled'
type PredictionHistoryIndex = NonNullable<ReturnType<typeof useCurrentPredictionIndexQuery>['data']>
interface PredictionHistoryPageInnerProps {
    className?: string
    index: PredictionHistoryIndex
}

interface PolicyTradeRow {
    policyName: string
    branch: string
    bucket: string
    side: 'LONG' | 'SHORT'
    entryPrice: number
    exitPrice: number
    exitReason: string
    tpPrice: number
    tpPct: number
    slPrice: number
    slPct: number
    liqPrice: number | null
    bucketCapitalUsd: number
    stakeUsd: number
    stakePct: number
}

const POLICY_TABLE_TITLE_RE = /^=*\s*Политики плеча/i
const ALL_BUCKETS_VALUE = 'all'

function isTableSection(section: ReportSectionDto): section is { title: string; columns: string[]; rows: string[][] } {
    const candidate = section as { columns?: unknown; rows?: unknown }
    return Array.isArray(candidate.columns) && Array.isArray(candidate.rows)
}

function normalizeLabel(value: string): string {
    return value.toLowerCase().replace(/\s+/g, ' ').trim()
}

function findColumnIndexOrThrow(columns: string[], matcher: (normalized: string) => boolean, label: string): number {
    const idx = columns.findIndex(col => matcher(normalizeLabel(col)))
    if (idx < 0) {
        throw new Error(`[ui] Required column is missing in policy table. column=${label}.`)
    }
    return idx
}

function parseNumberOrThrow(raw: unknown, label: string): number {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
        return raw
    }

    if (typeof raw === 'string') {
        const parsed = tryParseNumberFromString(raw)
        if (parsed !== null && Number.isFinite(parsed)) {
            return parsed
        }
    }

    throw new Error(`[ui] Missing or invalid numeric value. field=${label}, value=${String(raw)}.`)
}

function parseOptionalNumber(raw: unknown): number | null {
    if (typeof raw === 'number' && Number.isFinite(raw)) {
        return raw
    }

    if (typeof raw !== 'string') {
        return null
    }

    const normalized = raw.trim().toLowerCase()
    if (
        normalized.length === 0 ||
        normalized === '-' ||
        normalized === 'n/a' ||
        normalized === 'na' ||
        normalized.startsWith('нет')
    ) {
        return null
    }

    const parsed = tryParseNumberFromString(raw)
    if (parsed === null || !Number.isFinite(parsed)) {
        return null
    }

    return parsed
}

function parseBooleanTextOrThrow(raw: unknown, label: string): boolean {
    if (typeof raw !== 'string') {
        throw new Error(`[ui] Missing or invalid boolean-like text. field=${label}.`)
    }

    const normalized = raw.trim().toLowerCase()
    if (normalized === 'true' || normalized === 'yes') {
        return true
    }
    if (normalized === 'false' || normalized === 'no') {
        return false
    }

    throw new Error(`[ui] Unsupported boolean-like text. field=${label}, value=${raw}.`)
}

function formatPrice(value: number): string {
    if (!Number.isFinite(value)) {
        throw new Error(`[ui] Invalid price value for formatting: ${value}.`)
    }
    return value.toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4
    })
}

function formatMoney(value: number): string {
    if (!Number.isFinite(value)) {
        throw new Error(`[ui] Invalid money value for formatting: ${value}.`)
    }
    return value.toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })
}

function formatPercent(value: number): string {
    if (!Number.isFinite(value)) {
        throw new Error(`[ui] Invalid percent value for formatting: ${value}.`)
    }
    return value.toLocaleString('ru-RU', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    })
}

function resolvePolicyTableSectionOrThrow(report: ReportDocumentDto): { title: string; columns: string[]; rows: string[][] } {
    const table = report.sections.find(
        section =>
            isTableSection(section) &&
            POLICY_TABLE_TITLE_RE.test(section.title) &&
            section.columns.some(col => normalizeLabel(col) === 'политика') &&
            section.columns.some(col => normalizeLabel(col) === 'цена входа')
    )

    if (!table || !isTableSection(table)) {
        throw new Error('[ui] Policy table section is missing in report.')
    }

    return table
}

function parsePolicyTradeRowsOrThrow(report: ReportDocumentDto): PolicyTradeRow[] {
    const table = resolvePolicyTableSectionOrThrow(report)

    const policyIdx = findColumnIndexOrThrow(table.columns, col => col === 'политика', 'Политика')
    const branchIdx = findColumnIndexOrThrow(table.columns, col => col === 'ветка', 'Ветка')
    const hasDirectionIdx = findColumnIndexOrThrow(table.columns, col => col === 'есть направление', 'Есть направление')
    const skippedIdx = findColumnIndexOrThrow(table.columns, col => col === 'пропущено', 'Пропущено')
    const directionIdx = findColumnIndexOrThrow(table.columns, col => col === 'направление', 'Направление')
    const leverageIdx = findColumnIndexOrThrow(table.columns, col => col === 'плечо', 'Плечо')
    const entryIdx = findColumnIndexOrThrow(table.columns, col => col === 'цена входа', 'Цена входа')
    const slPctIdx = findColumnIndexOrThrow(table.columns, col => col === 'sl, %', 'SL, %')
    const tpPctIdx = findColumnIndexOrThrow(table.columns, col => col === 'tp, %', 'TP, %')
    const slPriceIdx = findColumnIndexOrThrow(table.columns, col => col === 'цена sl', 'Цена SL')
    const tpPriceIdx = findColumnIndexOrThrow(table.columns, col => col === 'цена tp', 'Цена TP')
    const positionUsdIdx = findColumnIndexOrThrow(table.columns, col => col === 'размер позиции, $', 'Размер позиции, $')
    const liqPriceIdx = findColumnIndexOrThrow(table.columns, col => col === 'цена ликвидации', 'Цена ликвидации')
    const exitPriceIdx = findColumnIndexOrThrow(table.columns, col => col === 'цена выхода', 'Цена выхода')
    const exitReasonIdx = findColumnIndexOrThrow(table.columns, col => col === 'причина выхода', 'Причина выхода')
    const bucketCapitalUsdIdx = findColumnIndexOrThrow(table.columns, col => col === 'капитал бакета, $', 'Капитал бакета, $')
    const stakeUsdIdx = findColumnIndexOrThrow(table.columns, col => col === 'ставка, $', 'Ставка, $')
    const stakePctIdx = findColumnIndexOrThrow(table.columns, col => col === 'ставка, %', 'Ставка, %')

    const tradeRows: PolicyTradeRow[] = []

    for (const row of table.rows) {
        if (!Array.isArray(row)) {
            throw new Error('[ui] Invalid policy table row.')
        }

        const hasDirection = parseBooleanTextOrThrow(row[hasDirectionIdx], 'Есть направление')
        const skipped = parseBooleanTextOrThrow(row[skippedIdx], 'Пропущено')

        if (!hasDirection || skipped) {
            continue
        }

        const directionRaw = String(row[directionIdx] ?? '').trim().toUpperCase()
        if (directionRaw !== 'LONG' && directionRaw !== 'SHORT') {
            throw new Error(`[ui] Unsupported direction value: ${directionRaw}.`)
        }

        const policyName = String(row[policyIdx] ?? '')
        const branch = String(row[branchIdx] ?? '')
        const leverage = parseNumberOrThrow(row[leverageIdx], 'Плечо')
        const entryPrice = parseNumberOrThrow(row[entryIdx], 'Цена входа')
        const slPrice = parseNumberOrThrow(row[slPriceIdx], 'Цена SL')
        const tpPrice = parseNumberOrThrow(row[tpPriceIdx], 'Цена TP')
        const liqPrice = parseOptionalNumber(row[liqPriceIdx])
        const positionUsd = parseNumberOrThrow(row[positionUsdIdx], 'Размер позиции, $')

        if (!policyName || !branch) {
            throw new Error('[ui] Policy or branch value is empty in policy table row.')
        }
        if (!(leverage > 0)) {
            throw new Error(`[ui] Leverage must be > 0. value=${leverage}.`)
        }
        if (!(entryPrice > 0 && slPrice > 0 && tpPrice > 0)) {
            throw new Error('[ui] Trade prices must be positive.')
        }
        if (!(positionUsd > 0) || !Number.isFinite(positionUsd)) {
            throw new Error(`[ui] Position usd is invalid. value=${positionUsd}.`)
        }

        const slPctFromEntry = parseNumberOrThrow(row[slPctIdx], 'SL, %')
        const tpPctFromEntry = parseNumberOrThrow(row[tpPctIdx], 'TP, %')
        const bucketCapitalUsd = parseNumberOrThrow(row[bucketCapitalUsdIdx], 'Капитал бакета, $')
        const stakeUsd = parseNumberOrThrow(row[stakeUsdIdx], 'Ставка, $')
        const stakePct = parseNumberOrThrow(row[stakePctIdx], 'Ставка, %')
        const exitPrice = parseNumberOrThrow(row[exitPriceIdx], 'Цена выхода')
        const exitReason = String(row[exitReasonIdx] ?? '').trim()

        if (!(bucketCapitalUsd > 0) || !Number.isFinite(bucketCapitalUsd)) {
            throw new Error(`[ui] Bucket capital is invalid. value=${bucketCapitalUsd}.`)
        }
        if (!(stakeUsd > 0) || !Number.isFinite(stakeUsd)) {
            throw new Error(`[ui] Stake usd is invalid. value=${stakeUsd}.`)
        }
        if (!(stakePct >= 0) || !Number.isFinite(stakePct)) {
            throw new Error(`[ui] Stake pct is invalid. value=${stakePct}.`)
        }
        if (!(exitPrice > 0) || !Number.isFinite(exitPrice)) {
            throw new Error(`[ui] Exit price is invalid. value=${exitPrice}.`)
        }
        if (exitReason.length === 0) {
            throw new Error('[ui] Exit reason is empty.')
        }

        tradeRows.push({
            policyName,
            branch,
            bucket: 'daily',
            side: directionRaw,
            entryPrice,
            exitPrice,
            exitReason,
            tpPrice,
            tpPct: tpPctFromEntry,
            slPrice,
            slPct: slPctFromEntry,
            liqPrice,
            bucketCapitalUsd,
            stakeUsd,
            stakePct
        })
    }

    return tradeRows
}

function PredictionHistoryPageInner({ className, index }: PredictionHistoryPageInnerProps) {
    const departure = useSelector(selectDepartureDate)
    const arrival = useSelector(selectArrivalDate)

    const fromDate = departure?.value ?? null
    const toDate = arrival?.value ?? null

    const [pageIndex, setPageIndex] = useState(0)
    const [cardsAnimating, setCardsAnimating] = useState(false)

    const allDatesDesc = useMemo(() => {
        if (!index || index.length === 0) {
            return [] as string[]
        }

        const dateSet = new Set<string>()

        for (const item of index) {
            const dateKey = item.predictionDateUtc.substring(0, 10)
            dateSet.add(dateKey)
        }

        const dates = Array.from(dateSet)
        dates.sort((a, b) => (a < b ? 1 : a > b ? -1 : 0))

        return dates
    }, [index])

    const filteredDates = useMemo(() => {
        if (!allDatesDesc.length) {
            return [] as string[]
        }

        return allDatesDesc.filter(date => {
            if (fromDate && date < fromDate) {
                return false
            }
            if (toDate && date > toDate) {
                return false
            }
            return true
        })
    }, [allDatesDesc, fromDate, toDate])

    useEffect(() => {
        if (!filteredDates.length) {
            setPageIndex(0)
            return
        }

        const maxIndex = Math.max(0, Math.ceil(filteredDates.length / PAGE_SIZE) - 1)
        setPageIndex(prev => Math.min(prev, maxIndex))
    }, [filteredDates])

    const totalPages = filteredDates.length > 0 ? Math.ceil(filteredDates.length / PAGE_SIZE) : 0
    const clampedPageIndex = totalPages > 0 ? Math.min(pageIndex, totalPages - 1) : 0
    const pageStart = clampedPageIndex * PAGE_SIZE
    const visibleDates = useMemo(() => filteredDates.slice(pageStart, pageStart + PAGE_SIZE), [filteredDates, pageStart])

    useEffect(() => {
        setCardsAnimating(false)
        const raf = requestAnimationFrame(() => setCardsAnimating(true))
        const t = window.setTimeout(() => setCardsAnimating(false), 260)

        return () => {
            cancelAnimationFrame(raf)
            window.clearTimeout(t)
        }
    }, [clampedPageIndex])

    const canPrev = clampedPageIndex > 0
    const canNext = totalPages > 0 && clampedPageIndex < totalPages - 1
    const visibleFrom = filteredDates.length > 0 ? pageStart + 1 : 0
    const visibleTo = filteredDates.length > 0 ? Math.min(pageStart + PAGE_SIZE, filteredDates.length) : 0

    const rootClassName = classNames(cls.HistoryPage, {}, [className ?? ''])

    if (!allDatesDesc.length) {
        return (
            <div className={rootClassName}>
                <Text type='h2'>История прогнозов пуста</Text>
                <Text type='p'>
                    Бэкенд вернул пустой список дат по current_prediction ({HISTORY_SET}). Проверь конфигурацию
                    генерации отчётов или период хранения.
                </Text>
            </div>
        )
    }

    const totalCount = allDatesDesc.length
    const filteredCount = filteredDates.length
    const historyTag = `current_prediction_${HISTORY_SET}`
    const latestDateUtc = allDatesDesc.length > 0 ? allDatesDesc[0] : null
    const latestReportQuery = useGetCurrentPredictionByDateQuery(
        latestDateUtc ? { set: HISTORY_SET, dateUtc: `${latestDateUtc}T00:00:00Z` } : skipToken
    )
    const trainingLabel = resolveTrainingLabel(latestReportQuery.data)

    const cardSections = useMemo(
        () =>
            visibleDates.map(date => ({
                id: date,
                anchor: `pred-${date}`
            })),
        [visibleDates]
    )

    const {
        currentIndex: cardIndex,
        canPrev: canCardPrev,
        canNext: canCardNext,
        handlePrev: handleCardPrev,
        handleNext: handleCardNext
    } = useSectionPager({
        sections: cardSections,
        syncHash: false,
        trackScroll: true,
        step: IN_PAGE_SCROLL_STEP
    })

    const handlePagePrev = () => setPageIndex(prev => Math.max(prev - 1, 0))
    const handlePageNext = () => setPageIndex(prev => Math.min(prev + 1, totalPages - 1))

    return (
        <div className={rootClassName}>
            <header className={cls.header}>
                <div className={cls.headerMain}>
                    <Text type='h1'>История прогнозов</Text>
                    <span className={cls.headerTag}>{historyTag}</span>
                </div>

                <div className={cls.headerMeta}>
                    <span>Всего дней с прогнозами: {totalCount}</span>
                    <span>Сейчас в выборке (по фильтру): {filteredCount}</span>
                    <span>
                        Модель обучения:{' '}
                        {trainingLabel ?? 'нет данных (проверь секцию обучения в отчёте)'}
                    </span>
                </div>
            </header>

            <section className={cls.filters}>
                <div className={cls.filtersRow}>
                    <DatePicker className={cls.datePicker} />
                    <div className={cls.filtersInfo}>
                        <Text type='p'>
                            Диапазон задаётся через выбор начальной и конечной даты. Если диапазон не выбран, будут
                            показаны последние доступные дни.
                        </Text>
                        {fromDate && toDate && (
                            <Text type='p' className={cls.filtersRangeSummary}>
                                Текущий фильтр: {fromDate} — {toDate} (UTC)
                            </Text>
                        )}
                    </div>
                </div>
            </section>

            <section className={cls.content}>
                {filteredCount === 0 && <Text type='p'>В выбранном диапазоне нет прогнозов. Попробуйте изменить даты.</Text>}

                {filteredCount > 0 && (
                    <>
                        <div className={cls.pagination}>
                            <button
                                type='button'
                                className={cls.paginationButton}
                                onClick={handlePagePrev}
                                disabled={!canPrev}
                                aria-label='Показать предыдущие прогнозы'
                            >
                                <Icon name='arrow' flipped />
                            </button>

                            <div className={cls.paginationInfo}>
                                <Text type='p'>
                                    Показано {visibleFrom}–{visibleTo} из {filteredCount}
                                </Text>
                                <Text type='p' className={cls.paginationHint}>
                                    Страница {totalPages === 0 ? 0 : clampedPageIndex + 1} из {totalPages}
                                </Text>
                            </div>

                            <button
                                type='button'
                                className={cls.paginationButton}
                                onClick={handlePageNext}
                                disabled={!canNext}
                                aria-label='Показать следующие прогнозы'
                            >
                                <Icon name='arrow' />
                            </button>
                        </div>

                        <div className={classNames(cls.cards, { [cls.cardsAnimating]: cardsAnimating }, [])}>
                            {visibleDates.map(date => (
                                <PredictionHistoryReportCard key={date} dateUtc={date} domId={`pred-${date}`} />
                            ))}
                        </div>

                        <SectionPager
                            variant='dpad'
                            sections={cardSections}
                            currentIndex={cardIndex}
                            canPrev={canCardPrev}
                            canNext={canCardNext}
                            onPrev={handleCardPrev}
                            onNext={handleCardNext}
                            tightRight
                            canGroupPrev={canPrev}
                            canGroupNext={canNext}
                            onGroupPrev={handlePagePrev}
                            onGroupNext={handlePageNext}
                            groupStatus={
                                totalPages > 0
                                    ? { current: clampedPageIndex + 1, total: totalPages }
                                    : { current: 0, total: 0 }
                            }
                        />
                    </>
                )}
            </section>
        </div>
    )
}
interface PredictionHistoryReportCardProps {
    dateUtc: string
    domId: string
}

function isLegacyPolicyTableSection(title: string): boolean {
    return /^=*\s*Политики плеча/i.test(title.trim())
}

interface PredictionPolicyTradesTableProps {
    report: ReportDocumentDto
    dateUtc: string
}

const POLICY_TRADES_SECTION_TITLE = 'Политики плеча (BASE vs ANTI-D)'

function PredictionPolicyTradesTable({ report, dateUtc }: PredictionPolicyTradesTableProps) {
    const tradeRows = useMemo(() => parsePolicyTradeRowsOrThrow(report), [report])

    const availableBuckets = useMemo(() => {
        const uniqueBuckets = Array.from(new Set(tradeRows.map(row => row.bucket)))
        uniqueBuckets.sort((a, b) => a.localeCompare(b))
        return uniqueBuckets
    }, [tradeRows])

    const [bucketFilter, setBucketFilter] = useState<string>(ALL_BUCKETS_VALUE)

    useEffect(() => {
        if (bucketFilter !== ALL_BUCKETS_VALUE && !availableBuckets.includes(bucketFilter)) {
            setBucketFilter(ALL_BUCKETS_VALUE)
        }
    }, [availableBuckets, bucketFilter])

    if (tradeRows.length === 0) {
        return (
            <div className={cls.tradeTableBlock}>
                <Text type='p'>По выбранному дню не было открытых сделок по политикам.</Text>
            </div>
        )
    }

    const options = [
        { value: ALL_BUCKETS_VALUE, label: 'Все бакеты' },
        ...availableBuckets.map(bucket => ({
            value: bucket,
            label: bucket
        }))
    ]

    const filteredRows =
        bucketFilter === ALL_BUCKETS_VALUE ? tradeRows : tradeRows.filter(row => row.bucket === bucketFilter)

    const columns = [
        'Политика',
        'Ветка',
        'Сторона',
        'Вход, $',
        'Выход, $',
        'Причина выхода',
        'TP, $',
        'TP, %',
        'SL, $',
        'SL, %',
        'Цена ликвидации, $',
        'Капитал бакета, $',
        'Ставка, $',
        'Ставка, %'
    ]

    const tableRows: TableRow[] = filteredRows.map(row => [
        row.policyName,
        row.branch,
        row.side,
        formatPrice(row.entryPrice),
        formatPrice(row.exitPrice),
        row.exitReason,
        formatPrice(row.tpPrice),
        formatPercent(row.tpPct),
        formatPrice(row.slPrice),
        formatPercent(row.slPct),
        row.liqPrice !== null ? formatPrice(row.liqPrice) : 'нет (плечо<=1x / не рассчитана)',
        formatMoney(row.bucketCapitalUsd),
        formatMoney(row.stakeUsd),
        formatPercent(row.stakePct)
    ])

    return (
        <div className={cls.tradeTableBlock}>
            <div className={cls.tradeTableToolbar}>
                <Text type='p' className={cls.tradeTableHint}>
                    Таблица собрана по backend-полям отчёта за {dateUtc}. Данные выхода/ставки берутся напрямую из
                    бэкенда без клиентских fallback-расчётов.
                </Text>

                <BucketFilterToggle
                    value={bucketFilter}
                    options={options}
                    onChange={setBucketFilter}
                    className={cls.bucketToggle}
                    ariaLabel='Фильтр торговой таблицы по бакету'
                />
            </div>

            <ReportTableCard
                title='Сделки по политикам'
                description='История торговых параметров по каждому прогнозу и ветке с фильтрацией по бакету.'
                columns={columns}
                rows={tableRows}
                domId={`pred-trades-${dateUtc}`}
                renderColumnTitle={title =>
                    renderTermTooltipTitle(title, resolveReportColumnTooltip(report.kind, POLICY_TRADES_SECTION_TITLE, title))
                }
            />
        </div>
    )
}

function PredictionHistoryReportCard({ dateUtc, domId }: PredictionHistoryReportCardProps) {
    const requestDateUtc = `${dateUtc}T00:00:00Z`

    const { data, isLoading, isError, error } = useGetCurrentPredictionByDateQuery({
        dateUtc: requestDateUtc,
        set: HISTORY_SET
    })

    if (isLoading) {
        return (
            <div id={domId} className={cls.reportCard}>
                <Text type='p'>Загружаю отчёт за {dateUtc}…</Text>
            </div>
        )
    }

    if (isError || !data) {
        const resolved = isError ? resolveAppError(error) : undefined

        return (
            <div id={domId} className={cls.reportCard}>
                <ErrorBlock
                    code={resolved?.code ?? 'UNKNOWN'}
                    title={resolved?.title ?? 'Не удалось загрузить отчёт'}
                    description={
                        resolved?.description ??
                        `Проверьте endpoint /current-prediction/by-date для даты ${dateUtc} и set=${HISTORY_SET}.`
                    }
                    details={resolved?.rawMessage}
                    compact
                />
            </div>
        )
    }

    const filteredSections = data.sections.filter(section => !isLegacyPolicyTableSection(section.title))
    const reportForView =
        filteredSections.length === data.sections.length
            ? data
            : {
                  ...data,
                  sections: filteredSections
              }

    return (
        <div id={domId} className={cls.reportCard}>
            <SectionErrorBoundary
                name={`PredictionHistoryReport_${dateUtc}`}
                fallback={({ error: sectionError, reset }) => (
                    <ErrorBlock
                        code='CLIENT'
                        title={`Ошибка при отображении отчёта за ${dateUtc}`}
                        description='При отрисовке отчёта произошла ошибка на клиенте. Остальная часть страницы продолжает работать.'
                        details={sectionError.message}
                        onRetry={reset}
                        compact
                    />
                )}
            >
                <ReportDocumentView report={reportForView} />
            </SectionErrorBoundary>

            <SectionErrorBoundary
                name={`PredictionHistoryPolicyTrades_${dateUtc}`}
                fallback={({ error: sectionError, reset }) => (
                    <ErrorBlock
                        code='CLIENT'
                        title={`Ошибка при построении торговой таблицы за ${dateUtc}`}
                        description='Основной отчёт отрисован, но таблица сделок не построилась из-за несовместимых данных.'
                        details={sectionError.message}
                        onRetry={reset}
                        compact
                    />
                )}
            >
                <PredictionPolicyTradesTable report={data} dateUtc={dateUtc} />
            </SectionErrorBoundary>
        </div>
    )
}

function PredictionHistoryPageWithBoundary(props: PredictionHistoryPageProps) {
    const { data, isError, error, refetch } = useCurrentPredictionIndexQuery(HISTORY_SET, 365)

    const hasData = Array.isArray(data)

    return (
        <PageDataBoundary
            isError={isError}
            error={error}
            hasData={hasData}
            onRetry={refetch}
            errorTitle={`Не удалось загрузить индекс истории прогнозов (${HISTORY_SET})`}
        >
            {data && <PredictionHistoryPageInner {...props} index={data} />}
        </PageDataBoundary>
    )
}

export default function PredictionHistoryPage(props: PredictionHistoryPageProps) {
    return (
        <PageSuspense title='Загружаю историю прогнозов…'>
            <PredictionHistoryPageWithBoundary {...props} />
        </PageSuspense>
    )
}
