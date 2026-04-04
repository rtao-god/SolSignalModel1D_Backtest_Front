import { describe, expect, test } from 'vitest'
import {
    buildPolicyDisplayLabel,
    pruneDuplicatePolicyMarginColumn,
    pruneDuplicatePolicyMarginColumnsInReport
} from './reportPolicyMarginMode'

describe('reportPolicyMarginMode', () => {
    test('removes duplicate margin column when policy name already contains the same mode', () => {
        const section = {
            title: 'Decision Level',
            sectionKey: 'decision_level',
            columns: ['Policy', 'Margin', 'TradeDays'],
            columnKeys: ['policy_name', 'margin_mode', 'trade_days'],
            rows: [
                ['risk_aware Cross', 'Cross', '11'],
                ['risk_aware Isolated', 'Isolated', '8']
            ]
        }

        const normalized = pruneDuplicatePolicyMarginColumn(section)

        expect(normalized.columns).toEqual(['Policy', 'TradeDays'])
        expect(normalized.columnKeys).toEqual(['policy_name', 'trade_days'])
        expect(normalized.rows).toEqual([
            ['risk_aware Cross', '11'],
            ['risk_aware Isolated', '8']
        ])
    })

    test('keeps margin column when policy name does not reveal margin mode', () => {
        const section = {
            title: 'Decision Level',
            sectionKey: 'decision_level',
            columns: ['Policy', 'Margin', 'TradeDays'],
            columnKeys: ['policy_name', 'margin_mode', 'trade_days'],
            rows: [['risk_aware', 'Cross', '11']]
        }

        const normalized = pruneDuplicatePolicyMarginColumn(section)

        expect(normalized).toEqual(section)
    })

    test('normalizes full report sections and leaves non-table sections untouched', () => {
        const report = {
            schemaVersion: 1,
            id: 'backtest-summary-test',
            kind: 'backtest_summary',
            title: 'Backtest summary',
            generatedAtUtc: '2026-03-30T12:00:00.000Z',
            sections: [
                {
                    title: 'Summary',
                    sectionKey: 'summary',
                    items: [{ key: 'SignalDays', value: '42' }]
                },
                {
                    title: 'Policies',
                    sectionKey: 'policies',
                    columns: ['Name', 'MarginMode'],
                    columnKeys: ['policy_name', 'margin_mode'],
                    rows: [['risk_aware Cross', 'Cross']]
                }
            ]
        }

        const normalized = pruneDuplicatePolicyMarginColumnsInReport(report)
        const policySection = normalized.sections[1] as { columns: string[]; rows: string[][] }

        expect(policySection.columns).toEqual(['Name'])
        expect(policySection.rows).toEqual([['risk_aware Cross']])
        expect(normalized.sections[0]).toEqual(report.sections[0])
    })

    test('builds policy label without duplicate margin mode when policy name already contains it', () => {
        const label = buildPolicyDisplayLabel({
            policyName: 'risk_aware Cross',
            branch: 'BASE',
            marginMode: 'Cross'
        })

        expect(label).toBe('risk_aware Cross · BASE')
    })

    test('keeps margin mode in policy label when policy name does not reveal it', () => {
        const label = buildPolicyDisplayLabel({
            policyName: 'risk_aware',
            branch: 'BASE',
            marginMode: 'Cross'
        })

        expect(label).toBe('risk_aware · BASE · Cross')
    })
})
