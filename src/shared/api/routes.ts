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
        liveReport: {
            path: '/current-prediction',
            method: 'GET' as const
        },
        livePayload: {
            path: '/current-prediction/payload',
            method: 'GET' as const
        },
        datesIndex: {
            path: '/current-prediction/dates',
            method: 'GET' as const
        },
        historyCatalog: {
            path: '/current-prediction/history/catalog',
            method: 'GET' as const
        },
        historyPage: {
            path: '/current-prediction/history/page',
            method: 'GET' as const
        },
        oosPresetAnalysis: {
            path: '/current-prediction/oos-presets/analysis',
            method: 'GET' as const
        },
        historyItems: {
            path: '/current-prediction/history/items',
            method: 'GET' as const
        },
        byDateReport: {
            path: '/current-prediction/by-date',
            method: 'GET' as const
        }
    },

    realForecastJournal: {
        dayList: {
            path: '/real-forecast-journal',
            method: 'GET' as const
        },
        byDate: {
            path: '/real-forecast-journal/by-date',
            method: 'GET' as const
        },
        liveStatus: {
            path: '/real-forecast-journal/live-status',
            method: 'GET' as const
        },
        opsStatus: {
            path: '/real-forecast-journal/ops-status',
            method: 'GET' as const
        }
    },

    reportVariants: {
        catalogGet: {
            path: '/report-variants',
            method: 'GET' as const
        },
        selectionGet: {
            path: '/report-variants',
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
        policyBranchMegaPayloadGet: {
            path: '/backtest/policy-branch-mega/payload',
            method: 'GET' as const
        },
        policyBranchMegaEvaluationGet: {
            path: '/backtest/policy-branch-mega/evaluation',
            method: 'GET' as const
        },
        policyBranchMegaValidationGet: {
            path: '/backtest/policy-branch-mega/validation',
            method: 'GET' as const
        },
        confidenceRiskGet: {
            path: '/backtest/confidence-risk',
            method: 'GET' as const
        },
        btcWeaknessStatsGet: {
            path: '/backtest/btc-weakness-stats',
            method: 'GET' as const
        },
        microOverlayStatsGet: {
            path: '/backtest/micro-overlay-stats',
            method: 'GET' as const
        },
        slOverlayStatsGet: {
            path: '/backtest/sl-overlay-stats',
            method: 'GET' as const
        },
        slStrongDayStatsGet: {
            path: '/backtest/sl-strong-day-stats',
            method: 'GET' as const
        },
        sharpMoveStatsGet: {
            path: '/backtest/sharp-move-stats',
            method: 'GET' as const
        },
        boundedParameterStatsGet: {
            path: '/backtest/bounded-parameter-stats',
            method: 'GET' as const
        },
        executionPipelineGet: {
            path: '/backtest/execution-pipeline',
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
        experimentRegistryGet: {
            path: '/experiments/registry',
            method: 'GET' as const
        },
        experimentBundlesPost: {
            path: '/experiments/bundles',
            method: 'POST' as const
        },
        experimentBundleStatusPost: {
            path: '/experiments/bundles',
            method: 'POST' as const
        },
        experimentActivationPost: {
            path: '/experiments/activations',
            method: 'POST' as const
        },
        experimentSandboxRunPost: {
            path: '/experiments/sandbox-runs',
            method: 'POST' as const
        },
        experimentSandboxProofGet: {
            path: '/experiments/sandbox-runs',
            method: 'GET' as const
        },
        previewPost: {
            path: '/backtest/preview',
            method: 'POST' as const
        },
        previewFullPost: {
            path: '/backtest/preview/full',
            method: 'POST' as const
        },
        comparePost: {
            path: '/backtest/compare',
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
        },
        policySetupsCatalogGet: {
            path: '/backtest/policy-setups',
            method: 'GET' as const
        },
        policySetupStatusGet: {
            path: '/backtest/policy-setups/status',
            method: 'GET' as const
        },
        policySetupRebuildPost: {
            path: '/backtest/policy-setups/rebuild',
            method: 'POST' as const
        },
        policySetupLedgerGet: {
            path: '/backtest/policy-setups',
            method: 'GET' as const
        },
        policySetupCandlesGet: {
            path: '/backtest/policy-setups',
            method: 'GET' as const
        }
    },

    statistics: {
        btcWeaknessLiveGet: {
            path: '/statistics/btc-weakness/live',
            method: 'GET' as const
        },
        microOverlayLiveGet: {
            path: '/statistics/micro-overlay/live',
            method: 'GET' as const
        },
        slOverlayLiveGet: {
            path: '/statistics/sl-overlay/live',
            method: 'GET' as const
        },
        slStrongDayLiveGet: {
            path: '/statistics/sl-strong-day/live',
            method: 'GET' as const
        }
    },

    ml: {
        pfiPerModel: {
            path: '/ml/pfi/per-model',
            method: 'GET' as const
        },
        pfiPerModelFeatureDetail: {
            path: '/ml/pfi/per-model/features',
            method: 'GET' as const
        },
        pfiSlModel: {
            path: '/ml/pfi/sl-model',
            method: 'GET' as const
        },
        modelStatsPerModel: {
            path: '/ml/stats/per-model',
            method: 'GET' as const
        }
    }
} as const
