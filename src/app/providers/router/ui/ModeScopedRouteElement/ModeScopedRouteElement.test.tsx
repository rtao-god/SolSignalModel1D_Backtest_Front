import '@testing-library/jest-dom'
import { render, screen } from '@/shared/lib/tests/ComponentRender/ComponentRender'
import { ModeScopedRouteElement } from './ModeScopedRouteElement'

const { useModeRegistryQuery } = vi.hoisted(() => ({
    useModeRegistryQuery: vi.fn()
}))

vi.mock('@/shared/api/tanstackQueries/modeRegistry', () => ({
    useModeRegistryQuery
}))

vi.mock('@/pages/shared/walkForward/ui/WalkForwardModePanels', () => ({
    WalkForwardModeSurfaceStack: ({
        mode,
        surfaceKeys
    }: {
        mode: string
        surfaceKeys: readonly string[]
    }) => <div>{`walk-forward:${mode}:${surfaceKeys.join(',')}`}</div>
}))

function createModeRegistry() {
    return {
        schemaVersion: 'mode-registry-v3-2026-04-17',
        modes: [
            {
                id: 'tbm_native',
                displayName: 'TBM Native',
                isDefault: true,
                defaultSliceKey: 'overall',
                slices: [
                    {
                        modeId: 'tbm_native',
                        key: 'overall',
                        displayLabel: 'Overall',
                        isDiagnostic: false,
                        comparability: 'Comparable',
                        description: 'All completed TBM samples.'
                    }
                ],
                surfaces: [
                    {
                        modeId: 'tbm_native',
                        key: 'money',
                        displayName: 'Money',
                        queryNamespace: ['walk-forward', 'tbm-native', 'money']
                    }
                ]
            },
            {
                id: 'directional_fixed_split',
                displayName: 'Directional Fixed Split',
                isDefault: false,
                defaultSliceKey: 'oos',
                slices: [
                    {
                        modeId: 'directional_fixed_split',
                        key: 'oos',
                        displayLabel: 'OOS',
                        isDiagnostic: false,
                        comparability: 'Comparable',
                        description: 'Fixed OOS.'
                    }
                ],
                surfaces: []
            }
        ],
        pages: [
            {
                key: 'current_prediction',
                displayName: 'Current prediction',
                bindings: [
                    {
                        pageKey: 'current_prediction',
                        modeId: 'directional_fixed_split',
                        bindingKind: 'fixed_split_page',
                        queryNamespace: ['current-prediction'],
                        publishedReportFamilyKey: null,
                        surfaceKeys: []
                    },
                    {
                        pageKey: 'current_prediction',
                        modeId: 'tbm_native',
                        bindingKind: 'walk_forward_surface_stack',
                        queryNamespace: ['walk-forward', 'tbm-native', 'current_prediction'],
                        publishedReportFamilyKey: null,
                        surfaceKeys: ['money']
                    }
                ]
            },
            {
                key: 'confidence_risk',
                displayName: 'Confidence risk',
                bindings: [
                    {
                        pageKey: 'confidence_risk',
                        modeId: 'directional_fixed_split',
                        bindingKind: 'fixed_split_page',
                        queryNamespace: ['backtest', 'confidence-risk'],
                        publishedReportFamilyKey: 'backtest_confidence_risk',
                        surfaceKeys: []
                    }
                ]
            }
        ]
    }
}

describe('ModeScopedRouteElement', () => {
    beforeEach(() => {
        vi.clearAllMocks()
        useModeRegistryQuery.mockReturnValue({
            data: createModeRegistry(),
            isLoading: false,
            isPending: false,
            error: null,
            refetch: vi.fn()
        })
    })

    test('renders fixed-split route element for fixed-split binding', () => {
        render(
            <ModeScopedRouteElement
                routeLabel='Current prediction'
                pageKey='current_prediction'
                fixedSplitElement={<div>fixed current prediction</div>}
            />,
            {
                initialState: {
                    mode: {
                        activeMode: 'directional_fixed_split'
                    }
                }
            }
        )

        expect(screen.getByText('fixed current prediction')).toBeInTheDocument()
    })

    test('renders walk-forward surface stack for walk-forward binding', () => {
        render(
            <ModeScopedRouteElement
                routeLabel='Current prediction'
                pageKey='current_prediction'
                fixedSplitElement={<div>fixed current prediction</div>}
            />
        )

        expect(screen.getByText('walk-forward:tbm_native:money')).toBeInTheDocument()
        expect(screen.queryByText('fixed current prediction')).not.toBeInTheDocument()
    })

    test('shows unsupported-mode notice instead of fixed controls', () => {
        render(
            <ModeScopedRouteElement
                routeLabel='Confidence risk'
                pageKey='confidence_risk'
                fixedSplitElement={<div>fixed confidence page</div>}
            />
        )

        expect(screen.getByText('Маршрут недоступен для выбранного режима')).toBeInTheDocument()
        expect(screen.getByText('Overall')).toBeInTheDocument()
        expect(screen.queryByText('fixed confidence page')).not.toBeInTheDocument()
    })
})
