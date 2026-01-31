import { useEffect, useMemo, useState } from 'react'
import { skipToken } from '@reduxjs/toolkit/query'
import { useSelector } from 'react-redux'
import classNames from '@/shared/lib/helpers/classNames'
import { Icon, Text } from '@/shared/ui'
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

/*
	PredictionHistoryPage — история прогнозов по датам.

	Зачем:
		- Показывает архив прогнозов с фильтрами по датам.
		- Дает карточки отчётов по каждому дню.

	Источники данных и сайд-эффекты:
		- useCurrentPredictionIndexQuery() (TanStack Query).
		- useGetCurrentPredictionByDateQuery() (RTK Query).

	Контракты:
		- index содержит predictionDateUtc в ISO-формате.
*/

// Количество дней, показываемых по умолчанию.
const PAGE_SIZE = 10
const IN_PAGE_SCROLL_STEP = Math.max(1, Math.floor(PAGE_SIZE / 2))
// Историю берём из backfilled-отчётов, чтобы видеть строгие дневные снапшоты.
const HISTORY_SET: CurrentPredictionSet = 'backfilled'

// Пропсы страницы истории прогнозов.
interface PredictionHistoryPageProps {
    className?: string
}

// Тип индекса дат для истории прогнозов.
type PredictionHistoryIndex = NonNullable<ReturnType<typeof useCurrentPredictionIndexQuery>['data']>

// Пропсы внутреннего компонента (уже с загруженным индексом).
interface PredictionHistoryPageInnerProps {
    className?: string
    index: PredictionHistoryIndex
}

/*
	Внутренний контент страницы истории прогнозов.

	- Работает только с валидным индексом дат.
	- Управляет фильтрацией и пагинацией карточек.
*/
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

    // Берём последний отчёт, чтобы показать единый диапазон обучения в шапке.
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

// Пропсы карточки отчёта за конкретную дату.
interface PredictionHistoryReportCardProps {
    dateUtc: string
    domId: string
}

/*
	Карточка отчёта за конкретный день.

	- Делает отдельный запрос для каждой видимой даты.
	- Защищает рендер ReportDocumentView через SectionErrorBoundary.
*/
function PredictionHistoryReportCard({ dateUtc, domId }: PredictionHistoryReportCardProps) {
    // Бэкенд требует dateUtc с Kind=UTC, поэтому передаём ISO с суффиксом Z.
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
                <ReportDocumentView report={data} />
            </SectionErrorBoundary>
        </div>
    )
}

/*
	Boundary-слой для запроса индекса.
*/
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
