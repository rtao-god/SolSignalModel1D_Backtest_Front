import type { PfiFeatureDetailTableDto, PfiFeatureHistoryChartDto } from '@/shared/types/pfi.types'

// Контракт карточки таблицы detail-отчёта PFI.
export interface PfiFeatureDetailTableCardProps {
    table: PfiFeatureDetailTableDto
    reportKind: string
    storageKey: string
    subtitle?: string | null
    className?: string
}

// Контракт набора исторических графиков в detail-отчёте.
export interface PfiFeatureHistoryChartsProps {
    charts: PfiFeatureHistoryChartDto[]
    className?: string
}
