/*
	routes — реестр API-роутов.

	Зачем:
		- Хранит путь и метод для каждого API-эндпоинта без query-параметров и динамических id.
*/

/*
	Централизованный реестр API-роутов.

	- Для путей с id (профиль, policy-ratios и т.п.) id подставляется в эндпоинтах.
*/

export const API_ROUTES = {
    user: {
        // Чтение текущего пользователя (GET /users-detail/).
        detailGet: {
            path: '/users-detail/',
            method: 'GET' as const
        },
        // Обновление профиля пользователя (PUT /users-detail/).
        detailPut: {
            path: '/users-detail/',
            method: 'PUT' as const
        }
    },

    currentPrediction: {
        // Последний отчёт по текущему прогнозу.
        latestReport: {
            path: '/current-prediction',
            method: 'GET' as const
        },
        // Индекс дат для истории прогнозов.
        datesIndex: {
            path: '/current-prediction/dates',
            method: 'GET' as const
        },
        // Отчёт по конкретной дате (?dateUtc=YYYY-MM-DD).
        byDateReport: {
            path: '/current-prediction/by-date',
            method: 'GET' as const
        }
    },

    backtest: {
        // Базовый конфиг бэктеста (legacy).
        configGet: {
            path: '/backtest/config',
            method: 'GET' as const
        },

        // Сводка бэктеста (ReportDocument).
        baselineSummaryGet: {
            path: '/backtest/summary',
            method: 'GET' as const
        },

        // Лёгкий baseline-снимок (BacktestBaselineSnapshotDto).
        baselineSnapshotGet: {
            path: '/backtest/baseline',
            method: 'GET' as const
        },

        // Диагностика бэктеста (ReportDocument, all history).
        diagnosticsGet: {
            path: '/backtest/diagnostics',
            method: 'GET' as const
        },
        // Policy Branch Mega (ReportDocument, all history).
        policyBranchMegaGet: {
            path: '/backtest/policy-branch-mega',
            method: 'GET' as const
        },
        // Bucket-статистика уверенности (ReportDocument).
        confidenceRiskGet: {
            path: '/backtest/confidence-risk',
            method: 'GET' as const
        },

        // Список профилей бэктеста (GET /backtest/profiles).
        profilesListGet: {
            path: '/backtest/profiles',
            method: 'GET' as const
        },
        // Создание профиля бэктеста (POST /backtest/profiles).
        profilesCreatePost: {
            path: '/backtest/profiles',
            method: 'POST' as const
        },
        // Получение профиля по id (GET /backtest/profiles/{id}).
        profileGetById: {
            path: '/backtest/profiles',
            method: 'GET' as const
        },
        // Частичное обновление профиля (PATCH /backtest/profiles/{id}).
        profileUpdatePatch: {
            path: '/backtest/profiles',
            method: 'PATCH' as const
        },

        // One-shot preview по произвольному конфигу.
        previewPost: {
            path: '/backtest/preview',
            method: 'POST' as const
        },

        // Policy-ratios по профилю (GET /backtest/policy-ratios/{profileId}).
        policyRatiosGetByProfile: {
            path: '/backtest/policy-ratios',
            method: 'GET' as const
        },

        // Агрегация вероятностей (GET /backtest/aggregation/probs).
        aggregationProbs: {
            path: '/backtest/aggregation/probs',
            method: 'GET' as const
        },

        // Агрегация метрик (GET /backtest/aggregation/metrics).
        aggregationMetrics: {
            path: '/backtest/aggregation/metrics',
            method: 'GET' as const
        }
    },

    ml: {
        // PFI по моделям (ReportDocument).
        pfiPerModel: {
            path: '/ml/pfi/per-model',
            method: 'GET' as const
        },

        // Статистика моделей (ReportDocument, kind = "ml_model_stats").
        modelStatsPerModel: {
            path: '/ml/stats/per-model',
            method: 'GET' as const
        }
    }
} as const


