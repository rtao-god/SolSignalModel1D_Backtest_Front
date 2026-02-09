import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import { useModelStatsReportQuery } from '@/shared/api/tanstackQueries/modelStats'
import type { ModelStatsPageProps } from './modelStatsTypes'
import { ModelStatsPageInner } from './ModelStatsPageInner'

export default function ModelStatsPage({ className }: ModelStatsPageProps) {
    const { data, isError, error, refetch } = useModelStatsReportQuery()

    return (
        <PageDataBoundary
            isError={isError}
            error={error}
            hasData={Boolean(data)}
            onRetry={refetch}
            errorTitle='Не удалось загрузить статистику моделей'>
            {data && <ModelStatsPageInner className={className} data={data} />}
        </PageDataBoundary>
    )
}
