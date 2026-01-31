import type { ReportDocumentDto } from '@/shared/types/report.types'
import { mapReportResponse } from '../utils/mapReportResponse'
import { API_ROUTES } from '../routes'
import { createSuspenseReportHook } from './utils/createSuspenseReportHook'

/*
	usePfiPerModelReportQuery — пользовательский хук.

	Зачем:
		- Инкапсулирует логику usePfiPerModelReportQuery.
*/

// Ключ кеша для PFI по моделям.
const PFI_PER_MODEL_QUERY_KEY = ['ml', 'pfi', 'per-model'] as const
const { path } = API_ROUTES.ml.pfiPerModel

/*
	Suspense-хук для PFI по моделям.

	- GET /ml/pfi/per-model.
	- Возвращает ReportDocumentDto.
	- Работает только через Suspense.
*/
export const usePfiPerModelReportQuery = createSuspenseReportHook<ReportDocumentDto>({
    queryKey: PFI_PER_MODEL_QUERY_KEY,
    path,
    mapResponse: mapReportResponse
})

