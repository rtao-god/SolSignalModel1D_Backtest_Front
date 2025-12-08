// Централизованный реестр API-роутов.
// Здесь храним только path + метод, без query-параметров и динамических id.
// Для путей с id (профиль, policy-ratios и т.п.) id подставляется в самих эндпоинтах.

export const API_ROUTES = {
    user: {
        // /users-detail/:
        // - GET  → чтение текущего пользователя;
        // - PUT  → обновление профиля.
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
        // Последний отчёт по текущему прогнозу
        latestReport: {
            path: '/current-prediction',
            method: 'GET' as const
        },
        // Индекс дат (для истории прогнозов)
        datesIndex: {
            path: '/current-prediction/dates',
            method: 'GET' as const
        },
        // Отчёт по конкретной дате ?dateUtc=YYYY-MM-DD
        byDateReport: {
            path: '/current-prediction/by-date',
            method: 'GET' as const
        }
    },

    backtest: {
        // Базовый конфиг бэктеста (legacy)
        configGet: {
            path: '/backtest/config',
            method: 'GET' as const
        },

        // Сводка бэктеста (ReportDocument)
        baselineSummaryGet: {
            path: '/backtest/summary',
            method: 'GET' as const
        },

        // Лёгкий baseline-снимок (BacktestBaselineSnapshotDto)
        baselineSnapshotGet: {
            path: '/backtest/baseline',
            method: 'GET' as const
        },

        // Профили бэктеста:
        // - GET  /backtest/profiles
        // - POST /backtest/profiles
        profilesListGet: {
            path: '/backtest/profiles',
            method: 'GET' as const
        },
        profilesCreatePost: {
            path: '/backtest/profiles',
            method: 'POST' as const
        },
        // /backtest/profiles/{id}:
        // - GET   → один профиль;
        // - PATCH → частичное обновление.
        profileGetById: {
            path: '/backtest/profiles',
            method: 'GET' as const
        },
        profileUpdatePatch: {
            path: '/backtest/profiles',
            method: 'PATCH' as const
        },

        // One-shot preview по произвольному конфигу
        previewPost: {
            path: '/backtest/preview',
            method: 'POST' as const
        },

        // Policy-ratios по профилю: /backtest/policy-ratios/{profileId}
        policyRatiosGetByProfile: {
            path: '/backtest/policy-ratios',
            method: 'GET' as const
        }
    },

    ml: {
        // PFI по моделям (ReportDocument)
        pfiPerModel: {
            path: '/ml/pfi/per-model',
            method: 'GET' as const
        },

        // Статистика моделей (ReportDocument, kind = "ml_model_stats")
        modelStatsPerModel: {
            path: '/ml/stats/per-model',
            method: 'GET' as const
        }
    }
} as const
