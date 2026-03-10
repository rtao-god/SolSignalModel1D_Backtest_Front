import { AppRoute } from '@/app/providers/router/config/types'
import { DEVELOPER_BACKEND_STRUCTURE_TABS } from '@/shared/utils/developerTabs'
import type {
    DeveloperPageContentConfig,
    DeveloperSectionGroupConfig,
    DeveloperSectionTableConfig,
    DeveloperSentenceConfig,
    DeveloperTreeNodeConfig
} from './types'

function sentences(...ids: string[]): DeveloperSentenceConfig[] {
    return ids.map(id => ({
        id,
        whyId: `why-${id}`
    }))
}

function plainSentences(...ids: string[]): DeveloperSentenceConfig[] {
    return ids.map(id => ({
        id
    }))
}

function treeNode(
    id: string,
    label: string,
    sentenceIds: string[],
    children?: readonly DeveloperTreeNodeConfig[]
): DeveloperTreeNodeConfig {
    return {
        id,
        label,
        sentences: sentences(...sentenceIds),
        ...(children ? { children } : {})
    }
}

function group(id: string, sentenceIds: string[], withWhy = false): DeveloperSectionGroupConfig {
    return {
        id,
        sentences: withWhy ? sentences(...sentenceIds) : plainSentences(...sentenceIds)
    }
}

function table(
    id: string,
    columnIds: string[],
    rowIds: string[],
    detailRowIds?: string[],
    defaultDetailId?: string
): DeveloperSectionTableConfig {
    return {
        id,
        columnIds,
        rowIds,
        ...(detailRowIds ? { detailRowIds } : {}),
        ...(defaultDetailId ? { defaultDetailId } : {})
    }
}

const SECTION_SENTENCES = {
    reading: plainSentences('coverage', 'nodeKinds', 'readingOrder'),
    rootSolution: [] as DeveloperSentenceConfig[],
    foundation: plainSentences('foundationBoundary', 'contractProjects', 'timeAndCore', 'commonPitfall'),
    modelPipeline: plainSentences(
        'pipelineBoundary',
        'causalVsOmniscient',
        'trainInferFlow',
        'whereToStart'
    ),
    runtimeDelivery: plainSentences('runtimeBoundary', 'linkedSource', 'reportsApiSplit', 'whereToDebug'),
    guards: plainSentences('guardBoundary', 'testsVsAnalyzers', 'archRules', 'failureStrategy'),
    rootSource: plainSentences('rootSourceFolders', 'excludedEmpty', 'excludedGenerated', 'inactiveSnapshot')
} as const

const SOLUTION_FILE_SENTENCES = ['what', 'whenOpen', 'pitfalls']
const PROJECT_SENTENCES = ['what', 'separation', 'whenOpen', 'dependencies', 'pitfalls']
const PROJECT_WITH_FILES_SENTENCES = ['what', 'separation', 'whenOpen', 'dependencies', 'keyFiles', 'pitfalls']
const FOLDER_SENTENCES = ['what', 'whenOpen', 'pitfalls']
const FILE_SENTENCES = ['what', 'whenOpen', 'pitfalls']
const EXCLUDED_SENTENCES = ['what', 'excluded', 'pitfalls']
const ROOT_SOLUTION_GROUPS = [
    group('solutionFiles', ['mainSolution', 'apiSolution']),
    group('foundationZone', ['foundationProjects', 'foundationUsage']),
    group('modelPipelineZone', ['pipelineProjects', 'pipelineUsage']),
    group('runtimeZone', ['runtimeProjects', 'runtimeUsage']),
    group('qualityZone', ['qualityProjects', 'qualityUsage']),
    group('entryShell', ['consoleProject', 'consoleVsOrchestration']),
    group('rootFiles', ['rootFilesSummary', 'rootFilesUsage']),
    group('dependencyRules', ['dependencyLadder', 'dependencyUsage'])
] as const
const ROOT_SOLUTION_PROJECT_DETAIL_IDS = [
    'rootConsoleProject',
    'coreTime',
    'core',
    'coreConfig',
    'coreReportContracts',
    'coreTruthContracts',
    'coreCausal',
    'coreCausalReadModel',
    'coreInfer',
    'coreTrain',
    'coreTrainDomain',
    'coreOmniscient',
    'infra',
    'appOrchestrationProject',
    'appOrchestrationInterop',
    'reports',
    'reportsRunner',
    'api',
    'tests',
    'sanityChecks',
    'archTests',
    'analyzers',
    'analyzersTests',
    'cachePathAnalyzers',
    'cachePathAnalyzersTests'
] as const
const ROOT_SOLUTION_TABLES = [
    table(
        'solutionProjects',
        ['project', 'zone', 'role', 'whenOpen'],
        [...ROOT_SOLUTION_PROJECT_DETAIL_IDS],
        [...ROOT_SOLUTION_PROJECT_DETAIL_IDS],
        'rootConsoleProject'
    )
] as const

export const DEVELOPER_BACKEND_STRUCTURE_PAGE_CONFIG: DeveloperPageContentConfig = {
    routeId: AppRoute.DEVELOPER_BACKEND_STRUCTURE,
    pageKey: 'backendStructurePage',
    tabs: DEVELOPER_BACKEND_STRUCTURE_TABS,
    sections: [
        {
            id: 'developer-structure-reading-map',
            anchor: 'developer-structure-reading-map',
            sentences: SECTION_SENTENCES.reading
        },
        {
            id: 'developer-structure-root-solution',
            anchor: 'developer-structure-root-solution',
            sentences: SECTION_SENTENCES.rootSolution,
            groups: ROOT_SOLUTION_GROUPS,
            tables: ROOT_SOLUTION_TABLES,
            tree: [
                treeNode('mainSolution', 'SolSignalModel1D_Backtest.sln', SOLUTION_FILE_SENTENCES),
                treeNode('apiSolution', 'SolSignalModel1D_Backtest.Api.sln', SOLUTION_FILE_SENTENCES),
                treeNode('rootConsoleProject', 'SolSignalModel1D_Backtest', PROJECT_WITH_FILES_SENTENCES, [
                    treeNode('rootProgramCs', 'Program.cs', FILE_SENTENCES),
                    treeNode('rootHostMainCs', 'HostMain.cs', FILE_SENTENCES),
                    treeNode('rootPredictionCs', 'Prediction.cs', FILE_SENTENCES),
                    treeNode('rootDailyRowsCs', 'DailyRows.cs', FILE_SENTENCES),
                    treeNode('rootPoliciesCs', 'Policies.cs', FILE_SENTENCES),
                    treeNode('rootDelayedACs', 'DelayedA.cs', FILE_SENTENCES),
                    treeNode('rootSlModelCs', 'SlModel.cs', FILE_SENTENCES)
                ])
            ]
        },
        {
            id: 'developer-structure-core-foundation',
            anchor: 'developer-structure-core-foundation',
            sentences: SECTION_SENTENCES.foundation,
            tree: [
                treeNode('core', 'SolSignalModel1D_Backtest.Core', PROJECT_SENTENCES, [
                    treeNode('coreContractsOptional', 'Contracts/Optional', FOLDER_SENTENCES),
                    treeNode('coreDataCandlesGaps', 'Data/Candles/Gaps', FOLDER_SENTENCES),
                    treeNode('coreDataCandlesTimeframe', 'Data/Candles/Timeframe', FOLDER_SENTENCES),
                    treeNode('coreDiagnostics', 'Diagnostics', FOLDER_SENTENCES)
                ]),
                treeNode('coreTime', 'SolSignalModel1D_Backtest.Core.Time', PROJECT_SENTENCES, [
                    treeNode('coreTimeAdapters', 'Adapters', FOLDER_SENTENCES),
                    treeNode('coreTimeCausal', 'Causal', FOLDER_SENTENCES),
                    treeNode('coreTimeTime', 'Time', FOLDER_SENTENCES)
                ]),
                treeNode('coreConfig', 'SolSignalModel1D_Backtest.Core.Config', PROJECT_SENTENCES, [
                    treeNode('coreConfigDayCoverage', 'DayCoverage', FOLDER_SENTENCES)
                ]),
                treeNode('coreReportContracts', 'SolSignalModel1D_Backtest.Core.Report.Contracts', PROJECT_SENTENCES, [
                    treeNode('coreReportContractsBacktest', 'Backtest', FOLDER_SENTENCES),
                    treeNode('coreReportContractsCurrentPrediction', 'CurrentPrediction', FOLDER_SENTENCES),
                    treeNode('coreReportContractsModel', 'Model', FOLDER_SENTENCES)
                ]),
                treeNode('coreTruthContracts', 'SolSignalModel1D_Backtest.Core.Truth.Contracts', PROJECT_SENTENCES, [
                    treeNode('coreTruthContractsAnalytics', 'Analytics', FOLDER_SENTENCES),
                    treeNode('coreTruthContractsData', 'Data', FOLDER_SENTENCES),
                    treeNode('coreTruthContractsLabeling', 'Labeling', FOLDER_SENTENCES)
                ])
            ]
        },
        {
            id: 'developer-structure-model-pipeline',
            anchor: 'developer-structure-model-pipeline',
            sentences: SECTION_SENTENCES.modelPipeline,
            tree: [
                treeNode('coreCausal', 'SolSignalModel1D_Backtest.Core.Causal', PROJECT_SENTENCES, [
                    treeNode('coreCausalAnalytics', 'Analytics', FOLDER_SENTENCES),
                    treeNode('coreCausalCausal', 'Causal', FOLDER_SENTENCES),
                    treeNode('coreCausalData', 'Data', FOLDER_SENTENCES),
                    treeNode('coreCausalDomain', 'Domain', FOLDER_SENTENCES),
                    treeNode('coreCausalInfra', 'Infra', FOLDER_SENTENCES),
                    treeNode('coreCausalLegacy', 'Legacy', FOLDER_SENTENCES),
                    treeNode('coreCausalMl', 'ML', FOLDER_SENTENCES),
                    treeNode('coreCausalTime', 'Time', FOLDER_SENTENCES),
                    treeNode('coreCausalTrading', 'Trading', FOLDER_SENTENCES),
                    treeNode('coreCausalUtils', 'Utils', FOLDER_SENTENCES)
                ]),
                treeNode('coreCausalReadModel', 'SolSignalModel1D_Backtest.Core.Causal.ReadModel', PROJECT_SENTENCES, [
                    treeNode('coreReadModelData', 'Data', FOLDER_SENTENCES),
                    treeNode('coreReadModelInfra', 'Infra', FOLDER_SENTENCES)
                ]),
                treeNode('coreInfer', 'SolSignalModel1D_Backtest.Core.Infer', PROJECT_SENTENCES, [
                    treeNode('coreInferCurrentPrediction', 'CurrentPrediction', FOLDER_SENTENCES),
                    treeNode('coreInferDaily', 'Daily', FOLDER_SENTENCES),
                    treeNode('coreInferMl', 'ML', FOLDER_SENTENCES)
                ]),
                treeNode('coreTrain', 'SolSignalModel1D_Backtest.Core.Train', PROJECT_SENTENCES, [
                    treeNode('coreTrainBacktest', 'Backtest', FOLDER_SENTENCES),
                    treeNode('coreTrainData', 'Data', FOLDER_SENTENCES),
                    treeNode('coreTrainMl', 'ML', FOLDER_SENTENCES),
                    treeNode('coreTrainTrading', 'Trading', FOLDER_SENTENCES)
                ]),
                treeNode('coreTrainDomain', 'SolSignalModel1D_Backtest.Core.Train.Domain', PROJECT_SENTENCES, [
                    treeNode('coreTrainDomainCurrentPrediction', 'CurrentPrediction', FOLDER_SENTENCES),
                    treeNode('coreTrainDomainData', 'Data', FOLDER_SENTENCES),
                    treeNode('coreTrainDomainTime', 'Time', FOLDER_SENTENCES)
                ]),
                treeNode('coreOmniscient', 'SolSignalModel1D_Backtest.Core.Omniscient', PROJECT_SENTENCES, [
                    treeNode('coreOmniscientAnalytics', 'Analytics', FOLDER_SENTENCES),
                    treeNode('coreOmniscientBacktest', 'Backtest', FOLDER_SENTENCES),
                    treeNode('coreOmniscientCausal', 'Causal', FOLDER_SENTENCES),
                    treeNode('coreOmniscientData', 'Data', FOLDER_SENTENCES),
                    treeNode('coreOmniscientMl', 'ML', FOLDER_SENTENCES),
                    treeNode('coreOmniscientOmniscient', 'Omniscient', FOLDER_SENTENCES),
                    treeNode('coreOmniscientTime', 'Time', FOLDER_SENTENCES),
                    treeNode('coreOmniscientTrading', 'Trading', FOLDER_SENTENCES),
                    treeNode('coreOmniscientUtils', 'Utils', FOLDER_SENTENCES)
                ])
            ]
        },
        {
            id: 'developer-structure-runtime-delivery',
            anchor: 'developer-structure-runtime-delivery',
            sentences: SECTION_SENTENCES.runtimeDelivery,
            tree: [
                treeNode('infra', 'SolSignalModel1D_Backtest.Infra', PROJECT_SENTENCES, [
                    treeNode('infraData', 'Data', FOLDER_SENTENCES)
                ]),
                treeNode('appOrchestrationProject', 'SolSignalModel1D_Backtest.AppOrchestration', PROJECT_WITH_FILES_SENTENCES),
                treeNode('appOrchestrationInterop', 'SolSignalModel1D_Backtest.AppOrchestration.Interop', PROJECT_SENTENCES, [
                    treeNode('appInteropInterop', 'Interop', FOLDER_SENTENCES),
                    treeNode('appInteropOmniscient', 'Omniscient', FOLDER_SENTENCES)
                ]),
                treeNode('reports', 'SolSignalModel1D_Backtest.Reports', PROJECT_WITH_FILES_SENTENCES, [
                    treeNode('reportsBacktest', 'Backtest', FOLDER_SENTENCES),
                    treeNode('reportsCurrentPrediction', 'CurrentPrediction', FOLDER_SENTENCES),
                    treeNode('reportsModel', 'Model', FOLDER_SENTENCES),
                    treeNode('reportsReporting', 'Reporting', FOLDER_SENTENCES)
                ]),
                treeNode('reportsRunner', 'SolSignalModel1D_Backtest.Reports.Runner', PROJECT_WITH_FILES_SENTENCES),
                treeNode('api', 'SolSignalModel1D_Backtest.Api', PROJECT_WITH_FILES_SENTENCES, [
                    treeNode('apiControllers', 'Controllers', FOLDER_SENTENCES),
                    treeNode('apiCurrentPrediction', 'CurrentPrediction', FOLDER_SENTENCES),
                    treeNode('apiCurrentPredictionHistory', 'CurrentPredictionHistory', FOLDER_SENTENCES),
                    treeNode('apiDto', 'Dto', FOLDER_SENTENCES),
                    treeNode('apiEndpoints', 'Endpoints', FOLDER_SENTENCES),
                    treeNode('apiRealForecastJournal', 'RealForecastJournal', FOLDER_SENTENCES),
                    treeNode('apiServices', 'Services', FOLDER_SENTENCES),
                    treeNode('apiWwwroot', 'wwwroot', FOLDER_SENTENCES)
                ])
            ]
        },
        {
            id: 'developer-structure-guards-quality',
            anchor: 'developer-structure-guards-quality',
            sentences: SECTION_SENTENCES.guards,
            tree: [
                treeNode('tests', 'SolSignalModel1D_Backtest.Tests', PROJECT_SENTENCES, [
                    treeNode('testsAnalytics', 'Analytics', FOLDER_SENTENCES),
                    treeNode('testsApi', 'Api', FOLDER_SENTENCES),
                    treeNode('testsArch', 'Arch', FOLDER_SENTENCES),
                    treeNode('testsArchitecture', 'Architecture', FOLDER_SENTENCES),
                    treeNode('testsBacktest', 'Backtest', FOLDER_SENTENCES),
                    treeNode('testsBootstrap', 'Bootstrap', FOLDER_SENTENCES),
                    treeNode('testsCandles', 'Candles', FOLDER_SENTENCES),
                    treeNode('testsCausal', 'Causal', FOLDER_SENTENCES),
                    treeNode('testsCurrentPrediction', 'CurrentPrediction', FOLDER_SENTENCES),
                    treeNode('testsData', 'Data', FOLDER_SENTENCES),
                    treeNode('testsDiagnostics', 'Diagnostics', FOLDER_SENTENCES),
                    treeNode('testsE2e', 'E2E', FOLDER_SENTENCES),
                    treeNode('testsInfra', 'Infra', FOLDER_SENTENCES),
                    treeNode('testsInit', 'Init', FOLDER_SENTENCES),
                    treeNode('testsLeakage', 'Leakage', FOLDER_SENTENCES),
                    treeNode('testsMl', 'ML', FOLDER_SENTENCES),
                    treeNode('testsReports', 'Reports', FOLDER_SENTENCES),
                    treeNode('testsSelfCheck', 'SelfCheck', FOLDER_SENTENCES),
                    treeNode('testsTestUtils', 'TestUtils', FOLDER_SENTENCES),
                    treeNode('testsTime', 'Time', FOLDER_SENTENCES)
                ]),
                treeNode('sanityChecks', 'SolSignalModel1D_Backtest.SanityChecks', PROJECT_SENTENCES, [
                    treeNode('sanityNyWindowing', 'NyWindowing', FOLDER_SENTENCES),
                    treeNode('sanitySanityChecks', 'SanityChecks', FOLDER_SENTENCES)
                ]),
                treeNode('archTests', 'SolSignalModel1D_Backtest.ArchTests', PROJECT_WITH_FILES_SENTENCES),
                treeNode('analyzers', 'SolSignalModel1D_Backtest.Analyzers', PROJECT_WITH_FILES_SENTENCES),
                treeNode('analyzersTests', 'SolSignalModel1D_Backtest.Analyzers.Tests', PROJECT_WITH_FILES_SENTENCES),
                treeNode('cachePathAnalyzers', 'SolSignalModel1D_Backtest.CachePath.Analyzers', PROJECT_WITH_FILES_SENTENCES),
                treeNode('cachePathAnalyzersTests', 'SolSignalModel1D_Backtest.CachePath.Analyzers.Tests', PROJECT_WITH_FILES_SENTENCES)
            ]
        },
        {
            id: 'developer-structure-root-source',
            anchor: 'developer-structure-root-source',
            sentences: SECTION_SENTENCES.rootSource,
            tree: [
                treeNode('rootAppOrchestration', 'AppOrchestration', PROJECT_SENTENCES, [
                    treeNode('rootAppApi', 'Api', FOLDER_SENTENCES),
                    treeNode('rootAppBacktest', 'Backtest', FOLDER_SENTENCES),
                    treeNode('rootAppBootstrap', 'Bootstrap', FOLDER_SENTENCES),
                    treeNode('rootAppDiagnostics', 'Diagnostics', FOLDER_SENTENCES),
                    treeNode('rootAppMetrics', 'Metrics', FOLDER_SENTENCES),
                    treeNode('rootAppStrategy', 'Strategy', FOLDER_SENTENCES)
                ]),
                treeNode('rootDiagnostics', 'Diagnostics', PROJECT_SENTENCES, [
                    treeNode('rootDiagnosticsPnl', 'PnL', FOLDER_SENTENCES)
                ]),
                treeNode('rootCurrentPredictionExcluded', 'CurrentPrediction (empty root folder)', EXCLUDED_SENTENCES),
                treeNode('rootUtilsExcluded', 'Utils (empty root folder)', EXCLUDED_SENTENCES),
                treeNode('coreCausalTrustedExcluded', 'SolSignalModel1D_Backtest.Core.Causal.Trusted (inactive snapshot folder)', EXCLUDED_SENTENCES)
            ]
        }
    ]
}
