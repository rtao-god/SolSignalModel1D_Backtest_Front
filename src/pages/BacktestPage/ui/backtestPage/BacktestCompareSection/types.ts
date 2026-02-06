import { BacktestProfileDto, BacktestSummaryDto } from '@/shared/types/backtest.types'
export default interface BacktestCompareSectionProps {
    profiles: BacktestProfileDto[] | undefined
    profileAId: string | null
    profileBId: string | null
    summaryA: BacktestSummaryDto | null
    summaryB: BacktestSummaryDto | null
    compareError: string | null
    isCompareLoading: boolean
    onProfileAChange: (id: string | null) => void
    onProfileBChange: (id: string | null) => void
    onRunCompare: () => void
}

