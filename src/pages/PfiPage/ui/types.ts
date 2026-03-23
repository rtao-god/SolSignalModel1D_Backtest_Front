import type { PfiQueryFamily } from '@/shared/api/tanstackQueries/pfi'
import type { PfiReportSectionDto } from '@/shared/types/pfi.types'

export interface PfiTableCardProps {
    section: PfiReportSectionDto
    domId: string
    reportKind: 'pfi_per_model' | 'pfi_sl_model'
}

export interface PfiPageProps {
    className?: string
    family?: PfiQueryFamily
}
