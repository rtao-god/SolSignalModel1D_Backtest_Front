import '@testing-library/jest-dom'
import { render, screen } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import { describe, expect, test } from 'vitest'
import type { ModeMoneyBlocksData } from '../model/modeMoney'
import { ModeMoneyBlocks } from './ModeMoneyBlocks'

const MONEY_BLOCK_DATA: ModeMoneyBlocksData = {
    policyName: 'const_2x_cross',
    policyBranch: 'BASE',
    bucket: 'daily',
    sliceLabel: 'OOS',
    executionLabel: 'const_2x_cross / BASE',
    scoreValue: 1.23,
    evaluationStatus: 'good',
    metricDescriptors: [
        { metricKey: 'TradesCount', displayLabel: 'TradesCount', valueKind: 'count', unit: 'count' },
        { metricKey: 'TotalPnlPct', displayLabel: 'TotalPnl%', valueKind: 'percent', unit: 'percent' },
        { metricKey: 'TotalPnlUsd', displayLabel: 'TotalPnlUsd', valueKind: 'usd', unit: 'usd' },
        { metricKey: 'MaxDdPct', displayLabel: 'MaxDD%', valueKind: 'percent', unit: 'percent' },
        { metricKey: 'Sharpe', displayLabel: 'Sharpe', valueKind: 'decimal', unit: 'decimal' },
        { metricKey: 'WinRate', displayLabel: 'WinRate%', valueKind: 'percent', unit: 'percent' },
        { metricKey: 'StartCapitalUsd', displayLabel: 'StartCapitalUsd', valueKind: 'usd', unit: 'usd' },
        { metricKey: 'EquityNowUsd', displayLabel: 'EquityNowUsd', valueKind: 'usd', unit: 'usd' },
        { metricKey: 'WithdrawnTotalUsd', displayLabel: 'WithdrawnTotalUsd', valueKind: 'usd', unit: 'usd' },
        { metricKey: 'FundingNetUsd', displayLabel: 'FundingNetUsd', valueKind: 'usd', unit: 'usd' },
        { metricKey: 'FundingPaidUsd', displayLabel: 'FundingPaidUsd', valueKind: 'usd', unit: 'usd' },
        { metricKey: 'FundingReceivedUsd', displayLabel: 'FundingReceivedUsd', valueKind: 'usd', unit: 'usd' },
        { metricKey: 'FundingEventCount', displayLabel: 'FundingEventCount', valueKind: 'count', unit: 'count' },
        { metricKey: 'TradesWithFundingCount', displayLabel: 'TradesWithFundingCount', valueKind: 'count', unit: 'count' },
        { metricKey: 'HadLiquidation', displayLabel: 'HadLiquidation', valueKind: 'boolean', unit: 'boolean' },
        { metricKey: 'RealLiquidationCount', displayLabel: 'RealLiquidationCount', valueKind: 'count', unit: 'count' },
        { metricKey: 'FundingLiquidationCount', displayLabel: 'FundingLiquidationCount', valueKind: 'count', unit: 'count' },
        { metricKey: 'FundingBucketDeathCount', displayLabel: 'FundingBucketDeathCount', valueKind: 'count', unit: 'count' },
        { metricKey: 'MixedBucketDeathCount', displayLabel: 'MixedBucketDeathCount', valueKind: 'count', unit: 'count' },
        { metricKey: 'AccountRuinCount', displayLabel: 'AccountRuinCount', valueKind: 'count', unit: 'count' },
        { metricKey: 'BalanceDead', displayLabel: 'BalanceDead', valueKind: 'boolean', unit: 'boolean' }
    ],
    metrics: {
        tradesCount: 4,
        totalPnlPct: 7.5,
        totalPnlUsd: 1500,
        maxDdPct: 2.1,
        maxDdNoLiqPct: 2.1,
        mean: 0.01,
        std: 0.02,
        downStd: 0.01,
        sharpe: 1.5,
        sortino: 1.7,
        cagr: 0.1,
        calmar: 0.8,
        winRate: 0.55,
        startCapitalUsd: 20000,
        equityNowUsd: 21500,
        withdrawnTotalUsd: 0,
        fundingNetUsd: 0,
        fundingPaidUsd: 0,
        fundingReceivedUsd: 0,
        fundingEventCount: 0,
        tradesWithFundingCount: 0,
        fundingLiquidationCount: 0,
        fundingBucketDeathCount: 0,
        mixedBucketDeathCount: 0,
        hadLiquidation: false,
        realLiquidationCount: 0,
        accountRuinCount: 0,
        balanceDead: false
    }
}

describe('ModeMoneyBlocks', () => {
    test('renders money metric names from backend descriptors', () => {
        render(<ModeMoneyBlocks data={MONEY_BLOCK_DATA} domIdPrefix='test-mode-money' showTermsBlock={false} />)

        expect(screen.getAllByText('TotalPnl%').length).toBeGreaterThan(0)
        expect(screen.getAllByText('TotalPnlUsd').length).toBeGreaterThan(0)
    })
})
