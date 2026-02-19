import { BacktestProfileDto, BacktestSummaryDto } from '@/shared/types/backtest.types'
import { PolicyRatiosReportDto } from '@/shared/types/policyRatios.types'
export default interface BacktestCompareSectionProps {
    profiles: BacktestProfileDto[] | undefined
    profileAId: string | null
    profileBId: string | null
    summaryA: BacktestSummaryDto | null
    summaryB: BacktestSummaryDto | null
    policyRatiosA: PolicyRatiosReportDto | null
    policyRatiosB: PolicyRatiosReportDto | null
    deltaBestTotalPnlPct: number | null
    deltaWorstMaxDdPct: number | null
    deltaTotalTrades: number | null
    compareError: string | null
    isCompareLoading: boolean
    onProfileAChange: (id: string | null) => void
    onProfileBChange: (id: string | null) => void
    onRunCompare: () => void
}

