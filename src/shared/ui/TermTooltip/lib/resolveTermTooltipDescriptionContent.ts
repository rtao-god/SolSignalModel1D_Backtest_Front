import { ReactNode } from 'react'

interface ResolveTermTooltipDescriptionContentOptions {
    resolveString?: (description: string) => ReactNode
}

/**
 * Нормализует source tooltip-description к единому runtime-контракту.
 *
 * Описание термина в проекте может приходить как готовый ReactNode или как lazy factory.
 * Все runtime-owner места tooltip-слоя должны разворачивать этот контракт одинаково,
 * иначе function-based description снова начнёт обходить общий rich-text pipeline.
 */
export function resolveTermTooltipDescriptionContent(
    description: ReactNode | (() => ReactNode),
    options?: ResolveTermTooltipDescriptionContentOptions
): ReactNode {
    const resolvedDescription = typeof description === 'function' ? description() : description

    if (typeof resolvedDescription !== 'string') {
        return resolvedDescription
    }

    return options?.resolveString ? options.resolveString(resolvedDescription) : resolvedDescription
}
