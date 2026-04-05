import { useTranslation } from 'react-i18next'
import { Text } from '@/shared/ui'
import { ErrorBlock } from '@/shared/ui/errors/ErrorBlock/ui/ErrorBlock'
import type {
    CurrentPredictionBackfilledTrainingScopeStatsDto,
    CurrentPredictionTrainingScope
} from '@/shared/api/endpoints/reportEndpoints'
import { useCurrentPredictionBackfilledTrainingScopeStatsQuery } from '@/shared/api/tanstackQueries/currentPrediction'
import { PredictionSliceTimeline } from './PredictionSliceTimeline'
import cls from './PredictionSliceTimeline.module.scss'

interface PredictionSliceTimelinePanelProps {
    primaryStats: CurrentPredictionBackfilledTrainingScopeStatsDto | null | undefined
    activeScope: CurrentPredictionTrainingScope
    isPrimaryLoading: boolean
    className?: string
}

// Timeline должен жить отдельно от тяжёлого отчёта страницы:
// если основной payload упал, шкала всё ещё пытается получить лёгкую split-статистику своим owner-запросом.
export function PredictionSliceTimelinePanel({
    primaryStats,
    activeScope,
    isPrimaryLoading,
    className
}: PredictionSliceTimelinePanelProps) {
    const { t } = useTranslation('reports')
    const shouldLoadFallbackStats = !primaryStats && !isPrimaryLoading
    const {
        data: fallbackStats,
        isLoading: isFallbackLoading,
        error: fallbackError
    } = useCurrentPredictionBackfilledTrainingScopeStatsQuery({
        enabled: shouldLoadFallbackStats
    })

    const resolvedStats = primaryStats ?? fallbackStats ?? null

    if (resolvedStats) {
        return <PredictionSliceTimeline stats={resolvedStats} activeScope={activeScope} className={className} />
    }

    if (isPrimaryLoading || isFallbackLoading) {
        return (
            <section className={cls.loadingCard}>
                <Text type='p' className={cls.loadingText}>
                    {t('predictionSliceTimeline.loading')}
                </Text>
            </section>
        )
    }

    return (
        <ErrorBlock
            code='DATA'
            title={t('predictionSliceTimeline.missing.title')}
            description={t('predictionSliceTimeline.missing.description')}
            details={
                fallbackError instanceof Error ?
                    fallbackError.message
                :   '[prediction-slice-timeline] backfilled training scope stats are unavailable for the timeline panel.'
            }
            compact
        />
    )
}
