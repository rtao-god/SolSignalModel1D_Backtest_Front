import type {
    PfiFeatureDetailTableDto,
    PfiFeatureHistoryChartDto,
    PfiFeatureValueOutcomeProfileDto
} from '@/shared/types/pfi.types'

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

// Контракт value-outcome профиля в detail-отчёте PFI.
export interface PfiFeatureValueOutcomeProfileProps {
    profile: PfiFeatureValueOutcomeProfileDto
    className?: string
}
