import { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import classNames from '@/shared/lib/helpers/classNames'
import { Text } from '@/shared/ui'
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

const PAGE_SIZE = 10

interface PredictionHistoryPageProps {
    className?: string
}

/**
 * Внутренний контент страницы истории прогнозов.
 * Индекс дат тянется через Suspense-хук useCurrentPredictionIndexQuery.
 */
function PredictionHistoryPageContent({ className }: PredictionHistoryPageProps) {
    const { data: index } = useCurrentPredictionIndexQuery(365)

    const departure = useSelector(selectDepartureDate)
    const arrival = useSelector(selectArrivalDate)

    const fromDate = departure?.value ?? null
    const toDate = arrival?.value ?? null

    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)

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
        dates.sort((a, b) =>
            a < b ? 1
            : a > b ? -1
            : 0
        )

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
            setVisibleCount(PAGE_SIZE)
            return
        }

        setVisibleCount(prev => {
            if (prev <= PAGE_SIZE) {
                return PAGE_SIZE
            }
            return Math.min(prev, filteredDates.length)
        })
    }, [filteredDates])

    const visibleDates = useMemo(() => filteredDates.slice(0, visibleCount), [filteredDates, visibleCount])

    const canLoadMore = visibleDates.length < filteredDates.length
    const remainingCount = filteredDates.length - visibleDates.length

    const rootClassName = classNames(cls.HistoryPage, {}, [className ?? ''])

    // Семантический кейс "нет данных": бэкенд вернул пустой индекс.
    if (!allDatesDesc.length) {
        return (
            <div className={rootClassName}>
                <Text type='h2'>История прогнозов пуста</Text>
                <Text type='p'>
                    Бэкенд вернул пустой список дат по current_prediction. Проверь конфигурацию генерации отчётов или
                    период хранения.
                </Text>
            </div>
        )
    }

    const totalCount = allDatesDesc.length
    const filteredCount = filteredDates.length

    return (
        <div className={rootClassName}>
            <header className={cls.header}>
                <div className={cls.headerMain}>
                    <Text type='h1'>История прогнозов</Text>
                    <span className={cls.headerTag}>current_prediction</span>
                </div>

                <div className={cls.headerMeta}>
                    <span>Всего дней с прогнозами: {totalCount}</span>
                    <span>Сейчас в выборке (по фильтру): {filteredCount}</span>
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
                {filteredCount === 0 && (
                    <Text type='p'>В выбранном диапазоне нет прогнозов. Попробуйте изменить даты.</Text>
                )}

                {filteredCount > 0 && (
                    <>
                        <div className={cls.cards}>
                            {visibleDates.map(date => (
                                <PredictionHistoryReportCard key={date} dateUtc={date} />
                            ))}
                        </div>

                        {canLoadMore && (
                            <div className={cls.loadMore}>
                                <button
                                    type='button'
                                    className={cls.loadMoreButton}
                                    onClick={() =>
                                        setVisibleCount(prev => Math.min(prev + PAGE_SIZE, filteredDates.length))
                                    }>
                                    Показать ещё {remainingCount >= PAGE_SIZE ? PAGE_SIZE : remainingCount} дней
                                </button>
                            </div>
                        )}
                    </>
                )}
            </section>
        </div>
    )
}

interface PredictionHistoryReportCardProps {
    dateUtc: string
}

/**
 * Карточка отчёта за конкретный день:
 * - делает отдельный запрос для каждой видимой даты;
 * - ErrorBlock для сетевых ошибок;
 * - SectionErrorBoundary для ошибок отрисовки ReportDocumentView.
 */
function PredictionHistoryReportCard({ dateUtc }: PredictionHistoryReportCardProps) {
    const { data, isLoading, isError, error } = useGetCurrentPredictionByDateQuery({ dateUtc })

    if (isLoading) {
        return (
            <div className={cls.reportCard}>
                <Text type='p'>Загружаю отчёт за {dateUtc}…</Text>
            </div>
        )
    }

    if (isError || !data) {
        const resolved = isError ? resolveAppError(error) : undefined

        return (
            <div className={cls.reportCard}>
                <ErrorBlock
                    code={resolved?.code ?? 'UNKNOWN'}
                    title={resolved?.title ?? 'Не удалось загрузить отчёт'}
                    description={
                        resolved?.description ?? `Проверьте endpoint /current-prediction/by-date для даты ${dateUtc}.`
                    }
                    details={resolved?.rawMessage}
                    compact
                />
            </div>
        )
    }

    return (
        <div className={cls.reportCard}>
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
                )}>
                <ReportDocumentView report={data} />
            </SectionErrorBoundary>
        </div>
    )
}

/**
 * Внешний экспорт страницы: обёртка в PageSuspense.
 */
export default function PredictionHistoryPage(props: PredictionHistoryPageProps) {
    return (
        <PageSuspense title='Загружаю историю прогнозов…'>
            <PredictionHistoryPageContent {...props} />
        </PageSuspense>
    )
}
