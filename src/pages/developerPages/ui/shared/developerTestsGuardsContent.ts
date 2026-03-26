import { AppRoute } from '@/app/providers/router/config/types'
import { DEVELOPER_TESTS_GUARDS_TABS } from '@/shared/utils/developerTabs'
import type { DeveloperPageContentConfig } from './types'

export const DEVELOPER_TESTS_GUARDS_PAGE_CONFIG: DeveloperPageContentConfig = {
    routeId: AppRoute.DEVELOPER_TESTS_GUARDS,
    pageKey: 'testsGuardsPage',
    tabs: DEVELOPER_TESTS_GUARDS_TABS,
    sections: [
        {
            id: 'developer-guards-tests',
            anchor: 'developer-guards-tests',
            sentences: [
                { id: 'coverageShape', whyId: 'why-guards-coverage-shape' },
                { id: 'leakageDepth', whyId: 'why-guards-leakage-depth' }
            ],
            tree: [
                {
                    id: 'guardsTestsSuites',
                    label: 'SolSignalModel1D_Backtest.Tests',
                    sentences: [{ id: 'role', whyId: 'why-guards-tests-suites-role' }]
                },
                {
                    id: 'guardsTestsLeakage',
                    label: 'Leakage / SelfCheck / CurrentPrediction / Backtest',
                    sentences: [{ id: 'role', whyId: 'why-guards-tests-leakage-role' }]
                }
            ]
        },
        {
            id: 'developer-guards-arch',
            anchor: 'developer-guards-arch',
            sentences: [
                { id: 'archTests', whyId: 'why-guards-archtests' },
                { id: 'layerBarriers', whyId: 'why-guards-layer-barriers' }
            ],
            tree: [
                {
                    id: 'guardsArchProject',
                    label: 'SolSignalModel1D_Backtest.ArchTests',
                    sentences: [{ id: 'role', whyId: 'why-guards-arch-project-role' }]
                },
                {
                    id: 'guardsArchTestsInMainSuite',
                    label: 'SolSignalModel1D_Backtest.Tests/Arch / Architecture',
                    sentences: [{ id: 'role', whyId: 'why-guards-arch-main-suite-role' }]
                }
            ]
        },
        {
            id: 'developer-guards-analyzers',
            anchor: 'developer-guards-analyzers',
            sentences: [
                { id: 'causalAnalyzers', whyId: 'why-guards-causal-analyzers' },
                { id: 'cachePathAnalyzers', whyId: 'why-guards-cachepath-analyzers' }
            ],
            tree: [
                {
                    id: 'guardsAnalyzersProject',
                    label: 'SolSignalModel1D_Backtest.Analyzers',
                    sentences: [{ id: 'role', whyId: 'why-guards-analyzers-project-role' }]
                },
                {
                    id: 'guardsAnalyzersTests',
                    label: 'SolSignalModel1D_Backtest.Analyzers.Tests / CachePath.Analyzers.Tests',
                    sentences: [{ id: 'role', whyId: 'why-guards-analyzers-tests-role' }]
                }
            ]
        },
        {
            id: 'developer-guards-selfcheck',
            anchor: 'developer-guards-selfcheck',
            sentences: [
                { id: 'selfCheckRunner', whyId: 'why-guards-selfcheck-runner' },
                { id: 'shuffleSanity', whyId: 'why-guards-shuffle-sanity' }
            ],
            tree: [
                {
                    id: 'guardsSanityChecksProject',
                    label: 'SolSignalModel1D_Backtest.SanityChecks',
                    sentences: [{ id: 'role', whyId: 'why-guards-sanity-project-role' }]
                },
                {
                    id: 'guardsProgramHook',
                    label: 'Program.cs -> SelfCheckRunner.RunAsync',
                    sentences: [{ id: 'role', whyId: 'why-guards-program-hook-role' }]
                }
            ]
        }
    ]
}
