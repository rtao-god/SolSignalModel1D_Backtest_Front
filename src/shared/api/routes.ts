

export const API_ROUTES = {
    user: {
        detailGet: {
            path: '/users-detail/',
            method: 'GET' as const
        },
        detailPut: {
            path: '/users-detail/',
            method: 'PUT' as const
        }
    },

    currentPrediction: {
        latestReport: {
            path: '/current-prediction',
            method: 'GET' as const
        },
        datesIndex: {
            path: '/current-prediction/dates',
            method: 'GET' as const
        },
        byDateReport: {
            path: '/current-prediction/by-date',
            method: 'GET' as const
        }
    },

    backtest: {
        configGet: {
            path: '/backtest/config',
            method: 'GET' as const
        },
        baselineSummaryGet: {
            path: '/backtest/summary',
            method: 'GET' as const
        },
        baselineSnapshotGet: {
            path: '/backtest/baseline',
            method: 'GET' as const
        },
        diagnosticsGet: {
            path: '/backtest/diagnostics',
            method: 'GET' as const
        },
        policyBranchMegaGet: {
            path: '/backtest/policy-branch-mega',
            method: 'GET' as const
        },
        policyBranchMegaStatusGet: {
            path: '/backtest/policy-branch-mega/status',
            method: 'GET' as const
        },
        confidenceRiskGet: {
            path: '/backtest/confidence-risk',
            method: 'GET' as const
        },
        profilesListGet: {
            path: '/backtest/profiles',
            method: 'GET' as const
        },
        profilesCreatePost: {
            path: '/backtest/profiles',
            method: 'POST' as const
        },
        profileGetById: {
            path: '/backtest/profiles',
            method: 'GET' as const
        },
        profileUpdatePatch: {
            path: '/backtest/profiles',
            method: 'PATCH' as const
        },
        previewPost: {
            path: '/backtest/preview',
            method: 'POST' as const
        },
        policyRatiosGetByProfile: {
            path: '/backtest/policy-ratios',
            method: 'GET' as const
        },
        aggregationProbs: {
            path: '/backtest/aggregation/probs',
            method: 'GET' as const
        },
        aggregationMetrics: {
            path: '/backtest/aggregation/metrics',
            method: 'GET' as const
        }
    },

    ml: {
        pfiPerModel: {
            path: '/ml/pfi/per-model',
            method: 'GET' as const
        },
        modelStatsPerModel: {
            path: '/ml/stats/per-model',
            method: 'GET' as const
        }
    }
} as const

