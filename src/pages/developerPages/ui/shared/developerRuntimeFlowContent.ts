import { AppRoute } from '@/app/providers/router/config/types'
import { DEVELOPER_RUNTIME_FLOW_TABS } from '@/shared/utils/developerTabs'
import type { DeveloperPageContentConfig } from './types'

export const DEVELOPER_RUNTIME_FLOW_PAGE_CONFIG: DeveloperPageContentConfig = {
    routeId: AppRoute.DEVELOPER_RUNTIME_FLOW,
    pageKey: 'runtimeFlowPage',
    tabs: DEVELOPER_RUNTIME_FLOW_TABS,
    sections: [
        {
            id: 'developer-runtime-entrypoints',
            anchor: 'developer-runtime-entrypoints',
            sentences: [
                { id: 'consoleProgram', whyId: 'why-runtime-console-program' },
                { id: 'apiProgram', whyId: 'why-runtime-api-program' }
            ],
            tree: [
                {
                    id: 'runtimeEntryConsole',
                    label: 'Program.cs / HostMain.cs / Prediction.cs',
                    sentences: [{ id: 'role', whyId: 'why-runtime-entry-console-role' }]
                },
                {
                    id: 'runtimeEntryApi',
                    label: 'SolSignalModel1D_Backtest.Api/Program.cs',
                    sentences: [{ id: 'role', whyId: 'why-runtime-entry-api-role' }]
                },
                {
                    id: 'runtimeEntryReportsRunner',
                    label: 'SolSignalModel1D_Backtest.Reports.Runner/Program.cs',
                    sentences: [{ id: 'role', whyId: 'why-runtime-entry-reports-role' }]
                }
            ]
        },
        {
            id: 'developer-runtime-bootstrap',
            anchor: 'developer-runtime-bootstrap',
            sentences: [
                { id: 'bootstrapCandles', whyId: 'why-runtime-bootstrap-candles' },
                { id: 'bootstrapDailyRows', whyId: 'why-runtime-bootstrap-dailyrows' }
            ],
            tree: [
                {
                    id: 'runtimeBootstrapLoadCandles',
                    label: 'AppOrchestration/Bootstrap/Program.LoadCandlesAndTimeframes.cs',
                    sentences: [{ id: 'role', whyId: 'why-runtime-bootstrap-loadcandles-role' }]
                },
                {
                    id: 'runtimeBootstrapIndicators',
                    label: 'AppOrchestration/Bootstrap/Program.IndicatorsAndDailyRows.cs',
                    sentences: [{ id: 'role', whyId: 'why-runtime-bootstrap-indicators-role' }]
                },
                {
                    id: 'runtimeBootstrapInfra',
                    label: 'SolSignalModel1D_Backtest.Infra/Data',
                    sentences: [{ id: 'role', whyId: 'why-runtime-bootstrap-infra-role' }]
                }
            ]
        },
        {
            id: 'developer-runtime-prediction',
            anchor: 'developer-runtime-prediction',
            sentences: [
                { id: 'predictionPipeline', whyId: 'why-runtime-prediction-pipeline' },
                { id: 'causalBoundary', whyId: 'why-runtime-prediction-boundary' }
            ],
            tree: [
                {
                    id: 'runtimePredictionInfer',
                    label: 'SolSignalModel1D_Backtest.Core.Infer',
                    sentences: [{ id: 'role', whyId: 'why-runtime-prediction-infer-role' }]
                },
                {
                    id: 'runtimePredictionTrain',
                    label: 'SolSignalModel1D_Backtest.Core.Train / Core.Train.Domain',
                    sentences: [{ id: 'role', whyId: 'why-runtime-prediction-train-role' }]
                },
                {
                    id: 'runtimePredictionInterop',
                    label: 'SolSignalModel1D_Backtest.AppOrchestration.Interop',
                    sentences: [{ id: 'role', whyId: 'why-runtime-prediction-interop-role' }]
                }
            ]
        },
        {
            id: 'developer-runtime-backtest',
            anchor: 'developer-runtime-backtest',
            sentences: [
                { id: 'backtestFlow', whyId: 'why-runtime-backtest-flow' },
                { id: 'currentPredictionHistory', whyId: 'why-runtime-backtest-history' }
            ],
            tree: [
                {
                    id: 'runtimeBacktestOrchestration',
                    label: 'AppOrchestration/Backtest/Program.BacktestOrchestration.cs',
                    sentences: [{ id: 'role', whyId: 'why-runtime-backtest-orchestration-role' }]
                },
                {
                    id: 'runtimeBacktestReports',
                    label: 'SolSignalModel1D_Backtest.Reports/Backtest/Reports/BacktestReportsOrchestrator.cs',
                    sentences: [{ id: 'role', whyId: 'why-runtime-backtest-reports-role' }]
                },
                {
                    id: 'runtimeBacktestCurrentPrediction',
                    label: 'CurrentPredictionHistoryReportGenerator / CurrentPredictionReportBuilder',
                    sentences: [{ id: 'role', whyId: 'why-runtime-backtest-current-role' }]
                }
            ]
        }
    ]
}
