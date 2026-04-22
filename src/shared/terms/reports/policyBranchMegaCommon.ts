import {
    ACCOUNT_RUIN_DESCRIPTION,
    BRANCH_DESCRIPTION,
    CALMAR_DESCRIPTION,
    POLICY_DESCRIPTION,
    RECOVERED_DESCRIPTION,
    RECOV_DAYS_DESCRIPTION,
    REQ_GAIN_DESCRIPTION,
    SHARPE_DESCRIPTION,
    SL_MODE_TERM_DESCRIPTION,
    START_CAP_DESCRIPTION,
    ON_EXCHANGE_PCT_DESCRIPTION,
    SORTINO_DESCRIPTION,
    TOTAL_PNL_DESCRIPTION
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
    'OnExch%': {
        key: 'OnExch%',
        title: 'OnExch%',
        description: ON_EXCHANGE_PCT_DESCRIPTION
    },
    Sharpe: {
        key: 'Sharpe',
        title: 'Sharpe',
        description: SHARPE_DESCRIPTION
    },
    Sortino: {
        key: 'Sortino',
        title: 'Sortino',
        description: SORTINO_DESCRIPTION
    },
    Calmar: {
        key: 'Calmar',
        title: 'Calmar',
        description: CALMAR_DESCRIPTION
    },
    StartCapitalUsd: {
        key: 'StartCapitalUsd',
        title: 'StartCapitalUsd',
        description: START_CAP_DESCRIPTION
    },
    AccountRuinCount: {
        key: 'AccountRuinCount',
        title: 'AccountRuinCount',
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
