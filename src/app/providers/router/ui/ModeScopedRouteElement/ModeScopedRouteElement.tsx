import { useMemo, type ReactElement } from 'react'
import { useSelector } from 'react-redux'
import { normalizeErrorLike } from '@/shared/lib/errors/normalizeError'
import { PageDataState } from '@/shared/ui/errors/PageDataState'
import { Text } from '@/shared/ui'
import {
    getModePageDescriptor,
    getModeRegistryMode,
    getModeReportSlices,
    isWalkForwardModeId,
    selectActiveMode,
    tryGetModePageBindingDescriptor,
    type ModePageKey
} from '@/entities/mode'
import { useModeRegistryQuery } from '@/shared/api/tanstackQueries/modeRegistry'
import { WalkForwardModeSurfaceStack } from '@/pages/shared/walkForward/ui/WalkForwardModePanels'
import cls from './ModeScopedRouteElement.module.scss'

interface ModeScopedRouteElementProps {
    routeLabel: string
    pageKey: ModePageKey
    fixedSplitElement: ReactElement
}

function buildRegistryResolutionError(pageKey: ModePageKey, routeLabel: string, error: unknown): Error {
    return normalizeErrorLike(error, 'Failed to resolve route mode binding.', {
        source: 'mode-scoped-route-element',
        domain: 'route_runtime',
        owner: 'route-mode-scope',
        expected: 'A mode-scoped route should resolve one owner binding from /api/modes for the active mode.',
        requiredAction: `Inspect /api/modes page binding for pageKey='${pageKey}' and route='${routeLabel}'.`
    })
}

export function ModeScopedRouteElement({ routeLabel, pageKey, fixedSplitElement }: ModeScopedRouteElementProps) {
    const activeMode = useSelector(selectActiveMode)
    const modeRegistryQuery = useModeRegistryQuery()

    const resolutionState = useMemo(() => {
        if (!modeRegistryQuery.data) {
            return {
                binding: null,
                page: null,
                mode: null,
                slices: [] as readonly { key: string; displayLabel: string }[],
                error: null as Error | null
            }
        }

        try {
            const page = getModePageDescriptor(modeRegistryQuery.data, pageKey)
            const mode = getModeRegistryMode(modeRegistryQuery.data, activeMode)
            const binding = tryGetModePageBindingDescriptor(modeRegistryQuery.data, pageKey, activeMode)

            return {
                binding,
                page,
                mode,
                slices: getModeReportSlices(modeRegistryQuery.data, activeMode).map(slice => ({
                    key: slice.key,
                    displayLabel: slice.displayLabel
                })),
                error: null as Error | null
            }
        } catch (error) {
            return {
                binding: null,
                page: null,
                mode: null,
                slices: [] as readonly { key: string; displayLabel: string }[],
                error: buildRegistryResolutionError(pageKey, routeLabel, error)
            }
        }
    }, [activeMode, modeRegistryQuery.data, pageKey, routeLabel])

    if (resolutionState.binding?.bindingKind === 'fixed_split_page') {
        return fixedSplitElement
    }

    if (resolutionState.binding?.bindingKind === 'walk_forward_surface_stack') {
        if (!isWalkForwardModeId(activeMode)) {
            throw new Error(
                `[mode-scoped-route-element] walk-forward binding resolved for non-walk-forward mode. pageKey=${pageKey}; modeId=${activeMode}; requiredAction=align route mode resolution with /api/modes.`
            )
        }

        return (
            <WalkForwardModeSurfaceStack
                mode={activeMode}
                surfaceKeys={resolutionState.binding.surfaceKeys}
            />
        )
    }

    const error = resolutionState.error ?? modeRegistryQuery.error ?? null
    const supportedModes = resolutionState.page?.bindings.map(binding => binding.modeId) ?? []

    return (
        <div className={cls.root}>
            <PageDataState
                shell={
                    <section className={cls.hero}>
                        <Text type='h1'>{routeLabel}</Text>
                        <Text className={cls.subtitle}>
                            Страница теперь читает owner route binding из `/api/modes`. Если выбранный режим не поддерживает этот маршрут, фронт не должен молча рендерить чужие fixed-split контролы или локальные заглушки.
                        </Text>
                    </section>
                }
                isLoading={modeRegistryQuery.isLoading}
                isError={Boolean(error)}
                error={error}
                hasData={Boolean(resolutionState.page && resolutionState.mode)}
                onRetry={() => void modeRegistryQuery.refetch()}
                title='Маршрут недоступен для выбранного режима'
                description='Каталог режимов должен сообщить, есть ли у маршрута owner binding для текущего режима.'
                loadingText='Загрузка owner-контракта режимов'
                logContext={{ source: 'mode-scoped-route-element' }}>
                {resolutionState.page && resolutionState.mode && (
                    <section className={cls.hero}>
                        <Text type='h2'>{resolutionState.mode.displayName}</Text>
                        <Text className={cls.subtitle}>
                            Поддерживаемые режимы для этого маршрута: {supportedModes.join(', ') || 'нет опубликованных binding-ов'}.
                        </Text>
                        <Text className={cls.subtitle}>
                            Доступные срезы выбранного режима:
                        </Text>
                        <ul className={cls.pillRow}>
                            {resolutionState.slices.map(slice => (
                                <li key={slice.key} className={cls.pill}>
                                    {slice.displayLabel}
                                </li>
                            ))}
                        </ul>
                    </section>
                )}
            </PageDataState>
        </div>
    )
}
