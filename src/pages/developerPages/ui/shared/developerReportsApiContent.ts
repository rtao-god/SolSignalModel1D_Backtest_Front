import { AppRoute } from '@/app/providers/router/config/types'
import { DEVELOPER_REPORTS_API_TABS } from '@/shared/utils/developerTabs'
import type { DeveloperPageContentConfig } from './types'

export const DEVELOPER_REPORTS_API_PAGE_CONFIG: DeveloperPageContentConfig = {
    routeId: AppRoute.DEVELOPER_REPORTS_API,
    pageKey: 'reportsApiPage',
    tabs: DEVELOPER_REPORTS_API_TABS,
    sections: [
        {
            id: 'developer-delivery-reports',
            anchor: 'developer-delivery-reports',
            sentences: [
                { id: 'reportBuilders', whyId: 'why-delivery-report-builders' },
                { id: 'documentContract', whyId: 'why-delivery-document-contract' }
            ],
            tree: [
                {
                    id: 'deliveryCurrentPredictionBuilder',
                    label: 'CurrentPredictionReportBuilder',
                    sentences: [{ id: 'role', whyId: 'why-delivery-current-builder-role' }]
                },
                {
                    id: 'deliveryBacktestSummaryBuilder',
                    label: 'BacktestSummaryReportBuilder',
                    sentences: [{ id: 'role', whyId: 'why-delivery-summary-builder-role' }]
                },
                {
                    id: 'deliveryBacktestReportsOrchestrator',
                    label: 'BacktestReportsOrchestrator',
                    sentences: [{ id: 'role', whyId: 'why-delivery-orchestrator-role' }]
                }
            ]
        },
        {
            id: 'developer-delivery-storage',
            anchor: 'developer-delivery-storage',
            sentences: [
                { id: 'reportStorage', whyId: 'why-delivery-report-storage' },
                { id: 'realForecastJournalStorage', whyId: 'why-delivery-rfj-storage' }
            ],
            tree: [
                {
                    id: 'deliveryReportStorage',
                    label: 'SolSignalModel1D_Backtest.Reports/ReportStorage.cs',
                    sentences: [{ id: 'role', whyId: 'why-delivery-report-storage-role' }]
                },
                {
                    id: 'deliveryRealForecastJournalStorage',
                    label: 'SolSignalModel1D_Backtest.Api/RealForecastJournal/RealForecastJournalStorage.cs',
                    sentences: [{ id: 'role', whyId: 'why-delivery-rfj-storage-role' }]
                }
            ]
        },
        {
            id: 'developer-delivery-api',
            anchor: 'developer-delivery-api',
            sentences: [
                { id: 'apiEndpoints', whyId: 'why-delivery-api-endpoints' },
                { id: 'workerFlow', whyId: 'why-delivery-worker-flow' }
            ],
            tree: [
                {
                    id: 'deliveryApiCurrentPrediction',
                    label: 'CurrentPredictionEndpoints',
                    sentences: [{ id: 'role', whyId: 'why-delivery-api-current-role' }]
                },
                {
                    id: 'deliveryApiBacktest',
                    label: 'BacktestEndpoints / AggregationEndpoints / PfiEndpoints',
                    sentences: [{ id: 'role', whyId: 'why-delivery-api-backtest-role' }]
                },
                {
                    id: 'deliveryApiRealForecastJournal',
                    label: 'RealForecastJournalEndpoints / Service / Worker',
                    sentences: [{ id: 'role', whyId: 'why-delivery-api-rfj-role' }]
                }
            ]
        },
        {
            id: 'developer-delivery-frontend',
            anchor: 'developer-delivery-frontend',
            sentences: [
                { id: 'frontendConsumes', whyId: 'why-delivery-frontend-consumes' },
                { id: 'noUiRecalc', whyId: 'why-delivery-no-ui-recalc' }
            ]
        }
    ]
}
