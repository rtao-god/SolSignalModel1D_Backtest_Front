import type { KeyValueSectionDto, ReportSectionDto, TableSectionDto } from '@/shared/types/report.types'
import type { useModelStatsReportQuery } from '@/shared/api/tanstackQueries/modelStats'
export interface ModelStatsPageProps {
    className?: string
}

export interface ModelStatsTableCardProps {
    section: TableSectionDto
    domId: string
}

export type ViewMode = 'business' | 'technical'

export interface ModelStatsModeToggleProps {
    mode: ViewMode
    onChange: (mode: ViewMode) => void
}

export type SegmentKey = 'OOS' | 'TRAIN' | 'FULL' | 'RECENT'

export interface SegmentInfo {
    key: SegmentKey
    prefix: string
}

export interface GlobalMeta {
    runKind: string
    hasOos: boolean
    trainRecordsCount: number
    oosRecordsCount: number
    totalRecordsCount: number
    recentDays: number
    recentRecordsCount: number
}

export interface ResolvedSegmentMeta {
    label: string
    description: string
}

export interface SegmentToggleProps {
    segments: SegmentInfo[]
    value: SegmentKey | null
    onChange: (segment: SegmentKey) => void
}

export type ModelStatsReport = NonNullable<ReturnType<typeof useModelStatsReportQuery>['data']>

export interface ModelStatsPageInnerProps {
    className?: string
    data: ModelStatsReport
}

export type ReportSection = ReportSectionDto
export type KeyValueSection = KeyValueSectionDto
export type TableSection = TableSectionDto
