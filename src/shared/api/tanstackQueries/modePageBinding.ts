import { useMemo } from 'react'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'
import { getModePageBindingDescriptor, type ModeId, type ModePageKey, type ModeRegistryPageBindingDescriptor } from '@/entities/mode'
import { useModeRegistryQuery } from './modeRegistry'

interface UseModePageBindingStateResult<TMode extends ModeId> {
    binding: ModeRegistryPageBindingDescriptor<TMode> | null
    error: Error | null
    isPending: boolean
    refetch: () => void
}

export function useModePageBindingState<TMode extends ModeId>(
    pageKey: ModePageKey,
    modeId: TMode,
    owner: string
): UseModePageBindingStateResult<TMode> {
    const modeRegistryQuery = useModeRegistryQuery()

    const bindingState = useMemo(() => {
        if (!modeRegistryQuery.data) {
            return {
                binding: null as ModeRegistryPageBindingDescriptor<TMode> | null,
                error: null as Error | null
            }
        }

        try {
            return {
                binding: getModePageBindingDescriptor(modeRegistryQuery.data, pageKey, modeId),
                error: null as Error | null
            }
        } catch (error) {
            return {
                binding: null as ModeRegistryPageBindingDescriptor<TMode> | null,
                error: normalizeErrorLike(error, 'Failed to resolve mode page binding.', {
                    source: 'mode-page-binding-state',
                    domain: 'ui_section',
                    owner,
                    expected: 'A mode-scoped page should resolve one owner binding from /api/modes before loading its published artifacts.',
                    requiredAction: `Inspect /api/modes binding for pageKey='${pageKey}' and modeId='${modeId}'.`
                })
            }
        }
    }, [modeId, modeRegistryQuery.data, owner, pageKey])

    return {
        binding: bindingState.binding,
        error: bindingState.error ?? modeRegistryQuery.error ?? null,
        isPending: modeRegistryQuery.isPending,
        refetch: () => {
            void modeRegistryQuery.refetch()
        }
    }
}
