import PageDataBoundary from '@/shared/ui/errors/PageDataBoundary/ui/PageDataBoundary'
import { useModelStatsReportQuery } from '@/shared/api/tanstackQueries/modelStats'
import type { ModelStatsPageProps } from './modelStatsTypes'
import { ModelStatsPageInner } from './ModelStatsPageInner'

/*
	ModelStatsPage — входной контейнер страницы статистики моделей: запрашивает ReportDocument через useModelStatsReportQuery,
	оборачивает UI в PageDataBoundary и передаёт валидный data в ModelStatsPageInner.

	Зачем:
		- Изолирует загрузку/ошибки/ретраи от UI отчёта.
		- Гарантирует, что внутренняя часть страницы работает только с валидным report.

	Источники данных и сайд-эффекты:
		- Данные: useModelStatsReportQuery() (tanstack query).
		- Ретрай: refetch передаётся в PageDataBoundary.

	Контракты:
		- ModelStatsPageInner получает data только при успешной загрузке.

	Public API:
		- default export: ModelStatsPage
*/
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
