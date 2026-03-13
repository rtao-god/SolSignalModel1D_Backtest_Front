import { useBacktestBaselineSummaryReportQuery } from '@/shared/api/tanstackQueries/backtestBaseline'
import { useGetBacktestProfilesQuery } from '@/shared/api/api'
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
        isLoading: isProfilesLoading,
        isError: isProfilesError,
        error: profilesError,
        refetch: refetchProfiles
    } = useGetBacktestProfilesQuery()

    const handleRetry = () => {
        void refetchBaseline()
        void refetchProfiles()
    }

    return (
        <div className={cls.root}>
            <BacktestPageContent
                baselineSummary={baselineSummary ?? null}
                baselineLoadError={isBaselineError ? String(baselineError) : null}
                profiles={Array.isArray(profiles) ? profiles : []}
                isProfilesLoading={isProfilesLoading}
                profilesLoadError={isProfilesError ? String(profilesError) : null}
                onRetryShell={handleRetry}
            />
        </div>
    )
}
