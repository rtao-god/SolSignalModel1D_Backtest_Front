import { describe, expect, test } from 'vitest'
import { resolvePolicySetupCellStateForMegaRow } from './policyBranchMegaPolicySetupLink'

describe('resolvePolicySetupCellStateForMegaRow', () => {
    test('returns setup detail path from published row evaluation', () => {
        const result = resolvePolicySetupCellStateForMegaRow({
            row: ['const_2x', 'BASE', 'WITH SL'],
            columns: ['Policy', 'Branch', 'SL Mode'],
            evaluationMapReady: true,
            rowEvaluationMap: {
                'const_2x\u001eBASE\u001eWITH SL': {
                    profileId: 'profile-1',
                    policySetupId: 'setup-123',
                    status: 'good',
                    reasons: [],
                    thresholds: null,
                    metrics: {
                        marginMode: 'isolated',
                        totalPnlPct: null,
                        maxDdPct: null,
                        maxDdNoLiqPct: null,
                        effectiveMaxDdPct: null,
                        hadLiquidation: false,
                        realLiquidationCount: 0,
                        accountRuinCount: 0,
                        balanceDead: false,
                        tradesCount: 0,
                        calmar: null,
                        sortino: null
                    }
                }
            }
        })

        expect(result.detailPath).toBe('/analysis/policy-setups/setup-123')
    })

    test('keeps row as plain text when setup id is not published', () => {
        const result = resolvePolicySetupCellStateForMegaRow({
            row: ['const_2x', 'BASE', 'WITH SL'],
            columns: ['Policy', 'Branch', 'SL Mode'],
            evaluationMapReady: true,
            rowEvaluationMap: {
                'const_2x\u001eBASE\u001eWITH SL': {
                    profileId: 'profile-1',
                    policySetupId: null,
                    status: 'good',
                    reasons: [],
                    thresholds: null,
                    metrics: {
                        marginMode: 'isolated',
                        totalPnlPct: null,
                        maxDdPct: null,
                        maxDdNoLiqPct: null,
                        effectiveMaxDdPct: null,
                        hadLiquidation: false,
                        realLiquidationCount: 0,
                        accountRuinCount: 0,
                        balanceDead: false,
                        tradesCount: 0,
                        calmar: null,
                        sortino: null
                    }
                }
            }
        })

        expect(result.detailPath).toBeNull()
    })
})
