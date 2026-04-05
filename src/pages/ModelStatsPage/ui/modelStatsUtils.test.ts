import { filterModelStatsTableSectionsByFamily } from './modelStatsUtils'
import type { TableSection } from './modelStatsTypes'

function createOverviewSection(): TableSection {
    return {
        sectionKey: 'models_overview',
        title: 'Models overview',
        columns: ['Family', 'Scope', 'Model'],
        columnKeys: ['family', 'score_scope', 'model_display_name'],
        rows: [
            ['daily_model', 'oos', 'Move'],
            ['sl_model', 'oos', 'SL hit risk']
        ]
    }
}

function createTableSection(sectionKey: string, title: string): TableSection {
    return {
        sectionKey,
        title,
        columns: ['Metric', 'Value'],
        columnKeys: ['metric_name', 'metric_value'],
        rows: [['coverage', '55%']]
    }
}

describe('filterModelStatsTableSectionsByFamily', () => {
    test('keeps overview rows and daily quality tables for daily_model', () => {
        const sections: TableSection[] = [
            createOverviewSection(),
            createTableSection('out_of_sample_daily_label_summary_business', '[Out-of-sample] Daily label summary (business)'),
            createTableSection(
                'out_of_sample_trend_direction_confusion_simple',
                '[Out-of-sample] Trend-direction confusion (simple)'
            ),
            createTableSection('out_of_sample_sl_model_metrics_runtime', '[Out-of-sample] SL-model metrics (runtime)')
        ]

        const filtered = filterModelStatsTableSectionsByFamily(sections, 'daily_model')

        expect(filtered).toHaveLength(3)
        expect(filtered[0].sectionKey).toBe('models_overview')
        expect(filtered[0].rows).toEqual([['daily_model', 'oos', 'Move']])
        expect(filtered.map(section => section.sectionKey)).toEqual([
            'models_overview',
            'out_of_sample_daily_label_summary_business',
            'out_of_sample_trend_direction_confusion_simple'
        ])
    })

    test('keeps overview rows and sl quality tables for sl_model', () => {
        const sections: TableSection[] = [
            createOverviewSection(),
            createTableSection('out_of_sample_daily_label_summary_business', '[Out-of-sample] Daily label summary (business)'),
            createTableSection('out_of_sample_sl_model_confusion_runtime', '[Out-of-sample] SL-model confusion (runtime, path-based)'),
            createTableSection('out_of_sample_sl_threshold_sweep_simple', '[Out-of-sample] SL threshold sweep (simple)')
        ]

        const filtered = filterModelStatsTableSectionsByFamily(sections, 'sl_model')

        expect(filtered).toHaveLength(3)
        expect(filtered[0].sectionKey).toBe('models_overview')
        expect(filtered[0].rows).toEqual([['sl_model', 'oos', 'SL hit risk']])
        expect(filtered.map(section => section.sectionKey)).toEqual([
            'models_overview',
            'out_of_sample_sl_model_confusion_runtime',
            'out_of_sample_sl_threshold_sweep_simple'
        ])
    })

    test('throws when requested family matches no section', () => {
        const sections: TableSection[] = [
            createTableSection('out_of_sample_daily_label_summary_business', '[Out-of-sample] Daily label summary (business)')
        ]

        expect(() => filterModelStatsTableSectionsByFamily(sections, 'sl_model')).toThrow(
            "[model-stats] family filter 'sl_model' matched no table sections."
        )
    })
})
