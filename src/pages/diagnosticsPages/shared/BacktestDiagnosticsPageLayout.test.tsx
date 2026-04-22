import '@testing-library/jest-dom'
import { render, screen } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import i18nForTests from '@/shared/configs/i18n/i18nForTests'
import type { ReportDocumentDto, TableSectionDto } from '@/shared/types/report.types'
import { BACKTEST_DIAGNOSTICS_FULL_CONTROL_AXES } from '@/shared/utils/backtestDiagnosticsPageAxes'
import BacktestDiagnosticsPageLayout from './BacktestDiagnosticsPageLayout'

const FIXED_SPLIT_INITIAL_STATE = {
    mode: {
        activeMode: 'directional_fixed_split' as const
    }
}

function createDiagnosticsColumnDescriptor(displayLabel: string, columnKey: string, termKey: string) {
    return {
        displayLabel,
        columnKey,
        termKey
    }
}

describe('BacktestDiagnosticsPageLayout', () => {
    test('renders diagnostics terms with enriched domain tooltip text', async () => {
        await i18nForTests.changeLanguage('ru')

        const report: ReportDocumentDto = {
            schemaVersion: 1,
            id: 'diag-report',
            kind: 'backtest_diagnostics',
            title: 'Diagnostics report',
            generatedAtUtc: '2026-03-11T10:00:00.000Z',
            sections: []
        }

        const sections: TableSectionDto[] = [
            {
                title: 'Policy diagnostics',
                columns: ['Policy', 'SL Mode', 'AccountRuinCount', 'Specificity', 'Bucket'],
                columnKeys: ['policy', 'sl_mode', 'account_ruin_count', 'specificity', 'bucket'],
                columnDescriptors: [
                    createDiagnosticsColumnDescriptor('Policy', 'policy', 'Policy'),
                    createDiagnosticsColumnDescriptor('SL Mode', 'sl_mode', 'SL Mode'),
                    createDiagnosticsColumnDescriptor('AccountRuinCount', 'account_ruin_count', 'AccountRuinCount'),
                    createDiagnosticsColumnDescriptor('Specificity', 'specificity', 'Specificity'),
                    createDiagnosticsColumnDescriptor('Bucket', 'bucket', 'Bucket')
                ],
                rows: [['UltraSafe', 'WITH SL', '0', '91.2', 'PolicyBlocked_GoodModel']],
                metadata: { kind: 'unknown' }
            }
        ]

        render(
            <BacktestDiagnosticsPageLayout
                report={report}
                sections={sections}
                pageTitle='Diagnostics'
                pageSubtitle='Diagnostics subtitle'
                emptyMessage='No diagnostics'
                errorTitle='Diagnostics error'
            />,
            {
                initialState: FIXED_SPLIT_INITIAL_STATE
            }
        )

        const termsBlock = screen.getByText('Термины diagnostics').closest('[data-tooltip-boundary="true"]')

        expect(termsBlock).not.toBeNull()
        expect(termsBlock).toHaveTextContent('Policy — имя набора торговых правил')
        expect(termsBlock).toHaveTextContent('две конфигурации с разными Policy нельзя сравнивать только по названию')
        expect(termsBlock).toHaveTextContent('SL Mode — переключатель механики выхода из сделки.')
        expect(termsBlock).toHaveTextContent('AccountRuinCount — метрика руины рабочего капитала бакета.')
        expect(termsBlock).toHaveTextContent('Specificity — доля хороших base-trade дней')
        expect(termsBlock).toHaveTextContent('Bucket — независимый контур симуляции')
        expect(termsBlock).toHaveTextContent('Policy задаёт правила входа и риска, Branch задаёт сценарий направления')
        expect(screen.queryByText(/\[\[/)).not.toBeInTheDocument()
    })

    test('renders diagnostics controls from page axis contract', async () => {
        await i18nForTests.changeLanguage('ru')

        const report: ReportDocumentDto = {
            schemaVersion: 1,
            id: 'diag-report-controls',
            kind: 'backtest_diagnostics',
            title: 'Diagnostics report',
            generatedAtUtc: '2026-03-11T10:00:00.000Z',
            sections: []
        }

        const sections: TableSectionDto[] = [
            {
                title: 'Top 20 trades by NetReturnPct (best, ALL SL, all buckets together)',
                columns: ['Policy', 'PnL'],
                columnKeys: ['policy', 'pnl'],
                columnDescriptors: [
                    createDiagnosticsColumnDescriptor('Policy', 'policy', 'Policy'),
                    createDiagnosticsColumnDescriptor('PnL', 'pnl', 'PnL')
                ],
                rows: [['UltraSafe', '12.4']],
                metadata: { kind: 'unknown' }
            }
        ]

        render(
            <BacktestDiagnosticsPageLayout
                report={report}
                sections={sections}
                availableAxes={BACKTEST_DIAGNOSTICS_FULL_CONTROL_AXES}
                pageTitle='Ratings'
                pageSubtitle='Ratings subtitle'
                emptyMessage='No diagnostics'
                errorTitle='Diagnostics error'
            />,
            {
                initialState: FIXED_SPLIT_INITIAL_STATE
            }
        )

        expect(screen.getByText('Dynamic-risk режим')).toBeInTheDocument()
        expect(screen.getByText('SL-режим')).toBeInTheDocument()
        expect(screen.getByText('Бакет сделок')).toBeInTheDocument()
        expect(screen.getByText('Зональный риск')).toBeInTheDocument()
        expect(screen.getByText('Лучшие сделки по доходности, %')).toBeInTheDocument()
    })

    test('keeps page shell visible when report request failed before report payload was mapped', async () => {
        await i18nForTests.changeLanguage('ru')

        render(
            <BacktestDiagnosticsPageLayout
                report={null}
                sections={[]}
                pageTitle='Guardrail'
                pageSubtitle='Guardrail subtitle'
                emptyMessage='No diagnostics'
                errorTitle='Diagnostics error'
                error={new Error('Unsupported zonal mode')}
            />,
            {
                initialState: FIXED_SPLIT_INITIAL_STATE
            }
        )

        expect(screen.getByText('Guardrail')).toBeVisible()
        expect(screen.getByText('Guardrail subtitle')).toBeVisible()
        expect(screen.getByText('Diagnostics error')).toBeVisible()
        expect(screen.getByText(/Unsupported zonal mode/)).toBeVisible()
        expect(screen.queryByText('No diagnostics')).not.toBeInTheDocument()
    })
})
