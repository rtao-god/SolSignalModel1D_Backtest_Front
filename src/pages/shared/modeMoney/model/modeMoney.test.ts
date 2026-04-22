import { describe, expect, test } from 'vitest'
import type { ModeRegistryDto } from '@/entities/mode'
import type {
    PolicyBranchMegaModeMoneySummaryRowDto,
    PolicyPerformanceMetricDescriptorDto
} from '@/shared/api/tanstackQueries/policyBranchMega'
import type { BestPolicyPerMarginModeDto } from '@/shared/api/tanstackQueries/walkForwardModes'
import {
    buildModeMoneyDataFromMegaSummaryRow,
    resolveBestPolicyContract,
    resolveModeMoneySlice,
    resolveModeMoneySliceLabel,
    selectModeMoneySummaryRow
} from './modeMoney'

const MODE_REGISTRY_FIXTURE: ModeRegistryDto = {
    schemaVersion: 'test',
    modes: [
        {
            id: 'directional_fixed_split',
            displayName: 'Directional Fixed-Split',
            isDefault: true,
            defaultSliceKey: 'oos',
            slices: [
                {
                    modeId: 'directional_fixed_split',
                    key: 'train',
                    displayLabel: 'Train',
                    isDiagnostic: false,
                    comparability: 'comparable',
                    description: 'Train slice'
                },
                {
                    modeId: 'directional_fixed_split',
                    key: 'full',
                    displayLabel: 'Full',
                    isDiagnostic: false,
                    comparability: 'comparable',
                    description: 'Full slice'
                },
                {
                    modeId: 'directional_fixed_split',
                    key: 'oos',
                    displayLabel: 'OOS',
                    isDiagnostic: false,
                    comparability: 'comparable',
                    description: 'OOS slice'
                }
            ],
            surfaces: []
        },
        {
            id: 'tbm_native',
            displayName: 'TBM Native',
            isDefault: false,
            defaultSliceKey: 'overall',
            slices: [
                {
                    modeId: 'tbm_native',
                    key: 'overall',
                    displayLabel: 'Overall',
                    isDiagnostic: false,
                    comparability: 'comparable',
                    description: 'Overall slice'
                }
            ],
            surfaces: []
        }
    ],
    pages: []
}

const MONEY_METRIC_DESCRIPTORS: PolicyPerformanceMetricDescriptorDto[] = [
    { metricKey: 'TradesCount', displayLabel: 'TradesCount', valueKind: 'count', unit: 'count' },
    { metricKey: 'TotalPnlPct', displayLabel: 'TotalPnl%', valueKind: 'percent', unit: 'percent' },
    { metricKey: 'TotalPnlUsd', displayLabel: 'TotalPnlUsd', valueKind: 'usd', unit: 'usd' },
    { metricKey: 'MaxDdPct', displayLabel: 'MaxDD%', valueKind: 'percent', unit: 'percent' },
    { metricKey: 'Sharpe', displayLabel: 'Sharpe', valueKind: 'decimal', unit: 'decimal' },
    { metricKey: 'WinRate', displayLabel: 'WinRate%', valueKind: 'percent', unit: 'percent' },
    { metricKey: 'StartCapitalUsd', displayLabel: 'StartCapitalUsd', valueKind: 'usd', unit: 'usd' },
    { metricKey: 'EquityNowUsd', displayLabel: 'EquityNowUsd', valueKind: 'usd', unit: 'usd' },
    { metricKey: 'FundingNetUsd', displayLabel: 'FundingNetUsd', valueKind: 'usd', unit: 'usd' }
]

const MODE_ROW_FIXTURE = {
    modeKey: 'directional_fixed_split',
    sliceKey: 'oos',
    moneySourceKind: 'policy_universe_best_policy',
    sourceStatus: 'available',
    statusMessage: 'published best policy',
    executionDescriptor: 'daily · with sl',
    comparabilityNote: 'Comparable slice',
    tradingStartDateUtc: '2026-01-01',
    tradingEndDateUtc: '2026-02-01',
    completedDayCount: 10,
    tradeCount: 12,
    predictionQualityMetrics: [
        {
            metricKey: 'business_accuracy_pct',
            metricLabel: 'Business accuracy',
            value: 55,
            unit: 'percent'
        }
    ],
    moneyMetrics: {
        tradesCount: 12,
        totalPnlPct: 7.1,
        totalPnlUsd: 1420,
        maxDdPct: 8.2,
        maxDdNoLiqPct: 8.2,
        mean: 0.01,
        std: 0.02,
        downStd: 0.01,
        sharpe: 1.33,
        sortino: 1.5,
        cagr: 0.12,
        calmar: 0.8,
        winRate: 0.55,
        startCapitalUsd: 20000,
        onExchPct: 7.1,
        equityNowUsd: 21420,
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
    },
    maxDrawdownPct: 8.2,
    diagnostic: null,
    sourceArtifactKind: 'fixed_split_money',
    sourceArtifactId: 'latest',
    sourceLocationHint: 'reports/fixed_split/latest.json',
    policyName: 'const_2x_cross',
    policyBranch: 'BASE'
} satisfies PolicyBranchMegaModeMoneySummaryRowDto

const BEST_POLICY_FIXTURE: BestPolicyPerMarginModeDto = {
    cross: {
        bucket: 'daily',
        slice: { scopeKey: 'overall' },
        marginMode: 'cross',
        policyName: 'policy_cross',
        policyBranch: 'BASE',
        shortDescription: 'Cross candidate',
        metrics: MODE_ROW_FIXTURE.moneyMetrics,
        evaluation: {
            status: 'good',
            reasons: []
        },
        score: {
            value: 1.2,
            formula: 'score',
            components: []
        }
    },
    isolated: {
        bucket: 'daily',
        slice: { scopeKey: 'overall' },
        marginMode: 'isolated',
        policyName: 'policy_isolated',
        policyBranch: 'ANTI-D',
        shortDescription: 'Isolated candidate',
        metrics: MODE_ROW_FIXTURE.moneyMetrics,
        evaluation: {
            status: 'good',
            reasons: []
        },
        score: {
            value: 1.1,
            formula: 'score',
            components: []
        }
    }
}

describe('modeMoney', () => {
    test('uses explicit slice when page already resolved one', () => {
        expect(resolveModeMoneySlice(MODE_REGISTRY_FIXTURE, 'directional_fixed_split', 'train')).toBe('train')
    })

    test('falls back to default slice from owner registry', () => {
        expect(resolveModeMoneySlice(MODE_REGISTRY_FIXTURE, 'directional_fixed_split', null)).toBe('oos')
    })

    test('selects row by exact mode and slice', () => {
        const row = selectModeMoneySummaryRow([MODE_ROW_FIXTURE], 'directional_fixed_split', 'oos')
        expect(row?.policyName).toBe('const_2x_cross')
    })

    test('returns null when the selected mode-slice pair is not published', () => {
        expect(selectModeMoneySummaryRow([MODE_ROW_FIXTURE], 'directional_fixed_split', 'train')).toBeNull()
    })

    test('resolves slice label from the owner registry', () => {
        expect(resolveModeMoneySliceLabel(MODE_REGISTRY_FIXTURE, 'directional_fixed_split', 'oos')).toBe('OOS')
    })

    test('maps mega summary row to shared money block data without fake score fields', () => {
        const data = buildModeMoneyDataFromMegaSummaryRow(MODE_ROW_FIXTURE, 'OOS', MONEY_METRIC_DESCRIPTORS)

        expect(data.policyName).toBe('const_2x_cross')
        expect(data.executionLabel).toBe('daily · with sl')
        expect(data.scoreValue).toBeNull()
        expect(data.evaluationStatus).toBeNull()
        expect(data.metricDescriptors).toBe(MONEY_METRIC_DESCRIPTORS)
    })

    test('keeps the higher-scoring best policy contract', () => {
        expect(resolveBestPolicyContract(BEST_POLICY_FIXTURE)?.policyName).toBe('policy_cross')
    })
})
