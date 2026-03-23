import type { ReportDocumentDto } from '@/shared/types/report.types'
import type { CurrentPredictionBackfilledTrainingScopeStats } from '@/shared/api/tanstackQueries/currentPrediction'
import {
    buildMegaTotalBucketViewControlGroup,
    buildCurrentPredictionHistoryTrainingScopeDescription,
    buildCurrentPredictionLiveTrainingScopeDescription,
    buildModelStatsSegmentControlGroup,
    buildModelStatsViewControlGroup
} from './buildReportViewControlGroups'

const MOCK_SPLIT_STATS: CurrentPredictionBackfilledTrainingScopeStats = {
    fullStartDateUtc: '2021-10-11',
    fullEndDateUtc: '2026-03-18',
    fullDays: 1327,
    trainStartDateUtc: '2021-10-11',
    trainEndDateUtc: '2025-11-18',
    trainDays: 1246,
    oosStartDateUtc: '2025-11-19',
    oosEndDateUtc: '2026-03-18',
    oosDays: 81,
    recentStartDateUtc: '2025-11-19',
    recentEndDateUtc: '2026-03-18',
    recentDays: 81,
    recentTailRowsLimit: 240,
    recentMatchesOos: true,
    totalDays: 1327,
    trainShare: 1246 / 1327,
    oosShare: 81 / 1327,
    lastTrainDateUtc: '2025-11-18',
    firstOosDateUtc: '2025-11-19'
}

function createTrainingFactsReport(itemValues: Record<string, string>): ReportDocumentDto {
    return {
        schemaVersion: 1,
        id: 'current-prediction-report',
        kind: 'current_prediction',
        title: 'Current prediction',
        generatedAtUtc: '2026-03-20T00:00:00Z',
        sections: [
            {
                title: 'Training facts',
                items: Object.entries(itemValues).map(([itemKey, value]) => ({
                    itemKey,
                    key: itemKey,
                    value
                }))
            }
        ]
    }
}

function normalizeSpaces(value: string): string {
    return value.replace(/\u00A0/g, ' ')
}

describe('buildReportViewControlGroups training scope descriptions', () => {
    test('builds exact history-scope description from current split facts', () => {
        const description = normalizeSpaces(buildCurrentPredictionHistoryTrainingScopeDescription(MOCK_SPLIT_STATS))

        expect(description).toContain('На этой странице режим меняет две вещи: на каких днях модель обучалась и какие дни потом попадают в историю.')
        expect(description).toContain('модель один раз подстраивает [[landing-model-weights|веса модели]]')
        expect(description).toContain('не получает готовый итог этого дня в лоб')
        expect(description).toContain(
            '[[landing-all-history|Full]] — это режим, где модель берёт всю завершённую историю страницы: 2021 — 2026 (1 620 календарных дней; в расчёт без выходных попадает 1 158 [[landing-time-horizon|торговых дней]]. [[why-weekends|Почему?]]).'
        )
        expect(description).toContain('итог [[landing-time-horizon|торгового дня]]')
        expect(description).toContain('старый прогноз за 2024 год может стать другим')
        expect(description).toContain(
            '[[landing-oos|OOS]] — это новые дни: 2025 — 2026 (120 календарных дней; в расчёт без выходных попадает 86 [[landing-time-horizon|торговых дней]]. [[why-weekends|Почему?]]). Перед ними идёт более ранний [[train-segment|Train]]: 2021 — 2025 (1 500 календарных дней; в расчёт без выходных попадает 1 072 [[landing-time-horizon|торговых дня]]. [[why-weekends|Почему?]]).'
        )
        expect(description).toContain('отступает назад на 120 календарных дней')
        expect(description).toContain('Лимит режима — последние 240 записей [[landing-oos|OOS]].')
        expect(description).toContain('[[landing-recent-tail-history|Recent]] и [[landing-oos|OOS]] совпадают')
        expect(description).toContain('Train diagnostics metrics')
        expect(description).toContain('Worst mistakes (in-sample)')
        expect(description).toContain('Confident mistakes (in-sample)')
        expect(description).toContain('Borderline days (lowest margin)')
        expect(description).toContain('[[leakage|утечки]]')
        expect(description).not.toContain('2021-10-11 — 2026-03-18')
    })

    test('builds exact live-scope description from structured full and oos facts', () => {
        const fullReport = createTrainingFactsReport({
            fit_window_start_day_key_utc: '2021-10-11',
            fit_window_end_day_key_utc: '2026-03-19',
            snapshot_max_labeled_day_key_utc: '2026-03-19',
            score_window_start_day_key_utc: '2026-03-20',
            score_window_end_day_key_utc: '2026-03-20'
        })
        const oosReport = createTrainingFactsReport({
            train_window_start_day_key_utc: '2021-10-11',
            train_window_end_day_key_utc: '2025-11-19',
            score_window_start_day_key_utc: '2026-03-20',
            score_window_end_day_key_utc: '2026-03-20'
        })

        const description = normalizeSpaces(
            buildCurrentPredictionLiveTrainingScopeDescription({
                splitStats: MOCK_SPLIT_STATS,
                fullReport,
                oosReport
            })
        )

        expect(description).toContain('На live-странице режим меняет не набор карточек, а историю обучения текущей модели.')
        expect(description).toContain(
            '[[landing-all-history|Full]] на live-странице — это текущий прогноз модели, которая обучена на всей завершённой истории: 2021 — 2026 (1 621 календарный день; в расчёт без выходных попадает 1 159 [[landing-time-horizon|торговых дней]]. [[why-weekends|Почему?]]).'
        )
        expect(description).toContain('Во время live-расчёта факт текущего дня ещё неизвестен')
        expect(description).toContain('в модель попадают только данные текущего дня на момент расчёта')
        expect(description).toContain(
            '[[landing-oos|OOS]] на live-странице — это текущий прогноз модели, которая сначала обучилась только на [[train-segment|Train]]: 2021 — 2025 (1 501 календарный день; в расчёт без выходных попадает 1 073 [[landing-time-horizon|торговых дня]]. [[why-weekends|Почему?]]), а потом без дообучения считает текущий день за 2026 (1 [[landing-time-horizon|торговый день]]).'
        )
        expect(description).toContain('Разница между ними не в факте текущего дня')
        expect(description).toContain('120 календарных дней')
        expect(description).not.toContain('2021-10-11')
        expect(description).not.toContain('2026-03-20')
    })

    test('keeps report control tooltips free from backend and server-side jargon', () => {
        const megaTooltip = buildMegaTotalBucketViewControlGroup({
            value: 'aggregate',
            onChange: () => undefined
        }).infoTooltip
        const segmentTooltip = buildModelStatsSegmentControlGroup({
            value: 'OOS',
            onChange: () => undefined
        }).infoTooltip
        const viewTooltip = buildModelStatsViewControlGroup({
            value: 'business',
            onChange: () => undefined
        }).infoTooltip

        expect(megaTooltip).not.toContain('backend')
        expect(megaTooltip).not.toContain('synthetic')
        expect(segmentTooltip).not.toContain('server-side')
        expect(segmentTooltip).not.toContain('backend')
        expect(viewTooltip).not.toContain('backend')
        expect(viewTooltip).not.toContain('business, либо technical набор секций')
    })
})
