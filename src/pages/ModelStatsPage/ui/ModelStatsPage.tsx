import { useModelStatsReportWithFreshnessQuery } from '@/shared/api/tanstackQueries/modelStats'
import type { ModelStatsPageProps } from './modelStatsTypes'
import { ModelStatsPageInner } from './ModelStatsPageInner'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

export default function ModelStatsPage({ className }: ModelStatsPageProps) {
    const { t } = useTranslation('reports')
    const [searchParams] = useSearchParams()
    const { data, isLoading, isError, error, refetch } = useModelStatsReportWithFreshnessQuery({
        segment: searchParams.get('segment'),
        view: searchParams.get('view')
    })
    const report = data?.report ?? null
    const freshness = data?.freshness ?? null

    return (
        <ModelStatsPageInner
            className={className}
            data={report}
            freshness={freshness}
            isLoading={isLoading}
            error={isError ? error : null}
            onRetry={refetch}
        />
    )
}
