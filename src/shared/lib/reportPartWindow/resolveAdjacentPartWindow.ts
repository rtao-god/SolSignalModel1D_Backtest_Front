/**
 * Каноничный owner окна соседних частей вокруг текущей видимой части.
 * Нужен paged report screen-ам, которые должны заранее держать соседний part
 * в pending/render window, а не узнавать о нём только после скролла.
 */
export function resolveAdjacentPartWindow(
    availableParts: readonly number[],
    activePart: number,
    radius = 1
): number[] {
    const orderedParts = Array.from(
        new Set(
            availableParts.filter(part => Number.isInteger(part) && part > 0)
        )
    ).sort((left, right) => left - right)

    if (orderedParts.length === 0) {
        return [activePart]
    }

    const safeRadius = Number.isFinite(radius) && radius > 0 ? Math.floor(radius) : 1
    const activeIndex = orderedParts.indexOf(activePart)
    if (activeIndex < 0) {
        const insertionIndex = orderedParts.findIndex(part => part > activePart)
        const resolvedIndex = insertionIndex >= 0 ? insertionIndex : orderedParts.length - 1
        return orderedParts.slice(
            Math.max(0, resolvedIndex - safeRadius),
            Math.min(orderedParts.length, resolvedIndex + safeRadius + 1)
        )
    }

    return orderedParts.slice(
        Math.max(0, activeIndex - safeRadius),
        Math.min(orderedParts.length, activeIndex + safeRadius + 1)
    )
}
