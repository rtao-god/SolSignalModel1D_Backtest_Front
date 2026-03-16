import {
    ACCOUNT_RUIN_DESCRIPTION,
    BRANCH_DESCRIPTION,
    POLICY_DESCRIPTION,
    RECOVERED_DESCRIPTION,
    RECOV_DAYS_DESCRIPTION,
    REQ_GAIN_DESCRIPTION,
    SL_MODE_TERM_DESCRIPTION,
    START_CAP_DESCRIPTION,
    ON_EXCHANGE_PCT_DESCRIPTION,
    TOTAL_PNL_DESCRIPTION,
    WEALTH_PCT_DESCRIPTION
} from '@/shared/terms/common'

export interface PolicyBranchMegaSharedTermDraft {
    key: string
    title: string
    description: string
}

export const POLICY_BRANCH_MEGA_COMMON_TERM_DRAFTS: Record<string, PolicyBranchMegaSharedTermDraft> = {
    Policy: {
        key: 'Policy',
        title: 'Policy',
        description: POLICY_DESCRIPTION
    },
    Branch: {
        key: 'Branch',
        title: 'Branch',
        description: BRANCH_DESCRIPTION
    },
    'SL Mode': {
        key: 'SL Mode',
        title: 'SL Mode',
        description: SL_MODE_TERM_DESCRIPTION
    },
    'TotalPnl%': {
        key: 'TotalPnl%',
        title: 'TotalPnl%',
        description: TOTAL_PNL_DESCRIPTION
    },
    'Wealth%': {
        key: 'Wealth%',
        title: 'Wealth%',
        description: WEALTH_PCT_DESCRIPTION
    },
    'OnExch%': {
        key: 'OnExch%',
        title: 'OnExch%',
        description: ON_EXCHANGE_PCT_DESCRIPTION
    },
    StartCap$: {
        key: 'StartCap$',
        title: 'StartCap$',
        description: START_CAP_DESCRIPTION
    },
    AccRuin: {
        key: 'AccRuin',
        title: 'AccRuin',
        description: ACCOUNT_RUIN_DESCRIPTION
    },
    Recovered: {
        key: 'Recovered',
        title: 'Recovered',
        description: RECOVERED_DESCRIPTION
    },
    RecovDays: {
        key: 'RecovDays',
        title: 'RecovDays',
        description: RECOV_DAYS_DESCRIPTION
    },
    'ReqGain%': {
        key: 'ReqGain%',
        title: 'ReqGain%',
        description: REQ_GAIN_DESCRIPTION
    }
}
