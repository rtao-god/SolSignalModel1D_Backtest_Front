import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import { useBacktestBaselineSummaryReportQuery } from '@/shared/api/tanstackQueries/backtestBaseline'
import { useGetBacktestProfilesQuery } from '@/shared/api/api'
import type { BacktestSummaryDto, BacktestProfileDto } from '@/shared/types/backtest.types'
import { BacktestPageContent } from '../BacktestPageContent/BacktestPageContent'
import cls from './BacktestPageWithBoundary.module.scss'

export function BacktestPageWithBoundary() {
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
        <div className={cls.root}>
            <PageDataBoundary
                isError={isError}
                error={mergedError}
                hasData={hasData}
                onRetry={handleRetry}
                errorTitle='Не удалось загрузить baseline-сводку и профили бэктеста'>
                {hasData && (
                    <BacktestPageContent
                        baselineSummary={baselineSummary as BacktestSummaryDto}
                        profiles={profiles as BacktestProfileDto[]}
                    />
                )}
            </PageDataBoundary>
        </div>
    )
}
