import { DEFAULT_FETCH_TIMEOUT_MS } from '@/shared/api/tanstackQueries/utils/fetchWithTimeout'

/**
 * Единый owner-реестр клиентских request/query policy.
 * Важные timeout/stale/gc интервалы читаются отсюда, а не дублируются локально.
 */
export const QUERY_POLICY_REGISTRY = {
    currentPrediction: {
        livePayload: {
            staleTimeMs: 5 * 60 * 1000,
            gcTimeMs: 5 * 60 * 1000
        },
        index: {
            staleTimeMs: 24 * 60 * 60 * 1000,
            gcTimeMs: 24 * 60 * 60 * 1000
        },
        historyPage: {
            staleTimeMs: 10 * 60 * 1000,
            gcTimeMs: 10 * 60 * 1000
        },
        oosPresetAnalysis: {
            staleTimeMs: 10 * 60 * 1000,
            gcTimeMs: 10 * 60 * 1000
        }
    },
    policySetupHistory: {
        status: {
            timeoutMs: DEFAULT_FETCH_TIMEOUT_MS,
            staleTimeMs: 0,
            gcTimeMs: 5 * 60 * 1000,
            refetchWhileBuildingIntervalMs: 3000
        },
        rebuild: {
            timeoutMs: DEFAULT_FETCH_TIMEOUT_MS
        },
        catalog: {
            timeoutMs: DEFAULT_FETCH_TIMEOUT_MS,
            staleTimeMs: 5 * 60 * 1000,
            gcTimeMs: 15 * 60 * 1000
        },
        ledger: {
            timeoutMs: 120_000,
            staleTimeMs: 2 * 60 * 1000,
            gcTimeMs: 10 * 60 * 1000
        },
        candles: {
            timeoutMs: 60_000,
            staleTimeMs: 2 * 60 * 1000,
            gcTimeMs: 10 * 60 * 1000
        }
    },
    reportVariants: {
        catalog: {
            timeoutMs: DEFAULT_FETCH_TIMEOUT_MS,
            staleTimeMs: 2 * 60 * 1000,
            gcTimeMs: 15 * 60 * 1000
        },
        selection: {
            timeoutMs: DEFAULT_FETCH_TIMEOUT_MS,
            staleTimeMs: 2 * 60 * 1000,
            gcTimeMs: 15 * 60 * 1000
        }
    },
    modeRegistry: {
        timeoutMs: DEFAULT_FETCH_TIMEOUT_MS,
        staleTimeMs: 5 * 60 * 1000,
        gcTimeMs: 15 * 60 * 1000
    },
    policyBranchMega: {
        requestTimeoutMs: DEFAULT_FETCH_TIMEOUT_MS,
        staleTimeMs: 2 * 60 * 1000,
        gcTimeMs: 15 * 60 * 1000,
        validation: {
            staleTimeMs: 0,
            gcTimeMs: 15 * 60 * 1000,
            pendingRefetchIntervalMs: 2000
        }
    },
    pfi: {
        staleTimeMs: 2 * 60 * 1000,
        gcTimeMs: 15 * 60 * 1000
    },
    realForecastJournal: {
        indexRefetchIntervalMs: 15_000,
        dayRefetchIntervalMs: 15_000,
        opsStatusRefetchIntervalMs: 15_000,
        liveStatusRefetchIntervalMs: 30 * 60 * 1000
    },
    suspenseReports: {
        staleTimeMs: 2 * 60 * 1000,
        gcTimeMs: 15 * 60 * 1000
    }
} as const
