import { useMemo, useState } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './CurrentMLModelPredictionPage.module.scss'
import CurrentMLModelPredictionProps from './types'
import { ReportDocumentView } from '@/shared/ui/ReportDocumentView/ui/ReportDocumentView'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import { SectionErrorBoundary } from '@/shared/ui/errors/SectionErrorBoundary/ui/SectionErrorBoundary'
import { useCurrentPredictionReportQuery } from '@/shared/api/tanstackQueries/currentPrediction'
import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import { Text } from '@/shared/ui'
import type { CurrentPredictionSet, CurrentPredictionTrainingScope } from '@/shared/api/endpoints/reportEndpoints'
import { resolveTrainingLabel } from '@/shared/utils/reportTraining'

/*
	CurrentMLModelPredictionPage — текущий прогноз модели.

	Зачем:
		- Показывает актуальный отчёт прогноза модели.
		- Защищает рендер отчёта через SectionErrorBoundary.

	Источники данных и сайд-эффекты:
		- useCurrentPredictionReportQuery() (TanStack Query).

	Контракты:
		- ReportDocumentView получает валидный report.
*/

export default function CurrentMLModelPredictionPage({ className }: CurrentMLModelPredictionProps) {
    // Для текущего прогноза берём live-отчёт (as-of срез).
    const reportSet: CurrentPredictionSet = 'live'
    // Режим обучения: по умолчанию берём full-history (основной режим для прод-прогноза).
    const [trainingScope, setTrainingScope] = useState<CurrentPredictionTrainingScope>('full')

    const { data, isError, error, refetch } = useCurrentPredictionReportQuery(reportSet, trainingScope)

    const rootClassName = classNames(cls.CurrentPredictionPage, {}, [className ?? ''])
    const trainingLabel = resolveTrainingLabel(data)

    // Конфигурация табов режимов обучения (порядок соответствует UX-логике).
    const scopeOptions = useMemo(
        () => [
            {
                value: 'full' as const,
                label: 'Полная история',
                hint: 'Train + OOS (основной боевой режим)'
            },
            {
                value: 'train' as const,
                label: 'Train-only',
                hint: 'Только train-дни (baseline-exit <= split)'
            },
            {
                value: 'oos' as const,
                label: 'OOS-only',
                hint: 'Только OOS-дни (baseline-exit > split)'
            },
            {
                value: 'recent' as const,
                label: 'Хвост истории',
                hint: 'Последнее окно дней (на бэкенде настраивается)'
            }
        ],
        []
    )

    const currentScopeMeta = scopeOptions.find(opt => opt.value === trainingScope) ?? scopeOptions[0]

    return (
        <PageDataBoundary
            isError={isError}
            error={error}
            hasData={Boolean(data)}
            onRetry={refetch}
            errorTitle='Не удалось загрузить текущий прогноз'>
            {data && (
                <div className={rootClassName}>
                    <div className={cls.scopePanel}>
                        <Text type='p' className={cls.scopeLabel}>
                            Режим обучения:
                        </Text>
                        <div className={cls.scopeToggleGroup} role='tablist' aria-label='Режим обучения модели'>
                            {scopeOptions.map(option => (
                                <button
                                    key={option.value}
                                    type='button'
                                    className={classNames(cls.scopeToggleBtn, {
                                        [cls.scopeToggleBtnActive]: trainingScope === option.value
                                    })}
                                    onClick={() => setTrainingScope(option.value)}
                                    role='tab'
                                    aria-selected={trainingScope === option.value}
                                >
                                    {option.label}
                                </button>
                            ))}
                        </div>
                        <Text type='p' className={cls.scopeHint}>
                            {currentScopeMeta.hint}
                        </Text>
                    </div>

                    <div className={cls.metaPanel}>
                        <Text type='p' className={cls.metaLine}>
                            Текущий отчёт: {reportSet}
                        </Text>
                        <Text type='p' className={cls.metaLine}>
                            Выбранный режим: {currentScopeMeta.label}
                        </Text>
                        <Text type='p' className={cls.metaLine}>
                            Модель обучения:{' '}
                            {trainingLabel ?? 'нет данных (проверь секцию обучения в отчёте)'}
                        </Text>
                    </div>

                    <SectionErrorBoundary
                        name='CurrentPredictionReport'
                        fallback={({ error: sectionError, reset }) => (
                            <ErrorBlock
                                code='CLIENT'
                                title='Ошибка при отображении отчёта'
                                description='При отрисовке текущего прогноза произошла ошибка на клиенте. Остальная часть приложения продолжает работать.'
                                details={sectionError.message}
                                onRetry={reset}
                            />
                        )}>
                        <ReportDocumentView report={data} />
                    </SectionErrorBoundary>
                </div>
            )}
        </PageDataBoundary>
    )
}
