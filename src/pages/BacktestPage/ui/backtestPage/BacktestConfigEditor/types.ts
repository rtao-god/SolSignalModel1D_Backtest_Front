import { BacktestConfigDto, BacktestProfileDto } from '@/shared/types/backtest.types'
export default interface BacktestConfigEditorProps {
    currentProfile: BacktestProfileDto | null
    draftConfig: BacktestConfigDto
    selectedPolicies: Record<string, boolean>
    isPreviewLoading: boolean
    previewError: string | null
    onStopPctChange: (valueStr: string) => void
    onTpPctChange: (valueStr: string) => void
    onConfidenceRiskPctChange: (field: string, valueStr: string) => void
    onConfidenceRiskRawChange: (field: string, valueStr: string) => void
    onConfidenceRiskIntChange: (field: string, valueStr: string) => void
    onShiftDynamicTpSl: (mode: 'tighter' | 'wider') => void
    onPolicyEnabledChange: (name: string, checked: boolean) => void
    onPolicyLeverageChange: (name: string, valueStr: string) => void
    onRunPreview: () => void
}

