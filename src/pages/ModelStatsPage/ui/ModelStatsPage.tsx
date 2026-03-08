import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import { useModelStatsReportQuery } from '@/shared/api/tanstackQueries/modelStats'
import type { ModelStatsPageProps } from './modelStatsTypes'
import { ModelStatsPageInner } from './ModelStatsPageInner'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'

export default function ModelStatsPage({ className }: ModelStatsPageProps) {
    const { t } = useTranslation('reports')
    const [searchParams] = useSearchParams()
    const { data, isError, error, refetch } = useModelStatsReportQuery({
        segment: searchParams.get('segment'),
        view: searchParams.get('view')
    })

    return (
        <PageDataBoundary
            isError={isError}
            error={error}
            hasData={Boolean(data)}
            onRetry={refetch}
            errorTitle={t('modelStats.page.errorTitle')}>
            {data && <ModelStatsPageInner className={className} data={data} />}
        </PageDataBoundary>
    )
}
