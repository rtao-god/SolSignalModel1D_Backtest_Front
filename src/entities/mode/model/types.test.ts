import {
    getModePageBindingDescriptor,
    getModeReportSliceDescriptor,
    tryGetModeReportSliceDescriptor,
    type ModeRegistryDto
} from './types'

const registry: ModeRegistryDto = {
    schemaVersion: 'mode-registry-v2-2026-04-16',
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
                    description: 'Main slice'
                },
                {
                    modeId: 'tbm_native',
                    key: 'fresh_only',
                    displayLabel: 'Fresh only',
                    isDiagnostic: false,
                    comparability: 'Comparable',
                    description: 'Fresh-only slice'
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
        }
    ],
    pages: [
        {
            key: 'current_prediction',
            displayName: 'Current prediction',
            bindings: [
                {
                    pageKey: 'current_prediction',
                    modeId: 'tbm_native',
                    bindingKind: 'walk_forward_surface_stack',
                    queryNamespace: ['walk-forward', 'tbm-native', 'current_prediction'],
                    publishedReportFamilyKey: null,
                    surfaceKeys: ['money']
                }
            ]
        }
    ]
}

describe('mode registry slice descriptors', () => {
    test('returns the owner descriptor for canonical slice ids', () => {
        expect(getModeReportSliceDescriptor(registry, 'tbm_native', 'overall').displayLabel).toBe('Overall')
    })

    test('returns null for non-canonical payload slice tokens instead of throwing', () => {
        expect(tryGetModeReportSliceDescriptor(registry, 'tbm_native', 'Overall')).toBeNull()
    })

    test('returns the owner page binding for route-level mode resolution', () => {
        expect(getModePageBindingDescriptor(registry, 'current_prediction', 'tbm_native').surfaceKeys).toEqual(['money'])
    })
})
