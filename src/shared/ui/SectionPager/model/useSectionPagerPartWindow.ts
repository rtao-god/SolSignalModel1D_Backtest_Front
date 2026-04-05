import { useEffect, useMemo, useRef, useState } from 'react'
import { useSectionPager, type SectionConfig } from './useSectionPager'
import { resolveAdjacentPartWindow } from '@/shared/lib/reportPartWindow/resolveAdjacentPartWindow'

interface UseSectionPagerPartWindowOptions {
    sections: SectionConfig[]
    activeAnchor: string | null
    activePart: number
    availableParts: readonly number[]
    resolvePartFromAnchor: (anchor: string) => number | null
    resetKey?: string
    syncHash?: boolean
    trackScroll?: boolean
    step?: number
    offsetTop?: number
    canonicalAnchor?: string | null
    resolveNeighborParts?: (availableParts: readonly number[], activePart: number) => number[]
}

interface UseSectionPagerPartWindowResult {
    windowCenterPart: number
    requestedParts: number[]
    currentIndex: number
    canPrev: boolean
    canNext: boolean
    handlePrev: () => void
    handleNext: () => void
}

/**
 * Общий owner-хук scroll-driven окна частей для длинных paged report screen-ов.
 * Он держит один инвариант: если part доступен в catalog, у него должен быть
 * pending/render slot в DOM до того, как пользователь доскроллит до следующей части.
 */
export function useSectionPagerPartWindow({
    sections,
    activeAnchor,
    activePart,
    availableParts,
    resolvePartFromAnchor,
    resetKey,
    syncHash = false,
    trackScroll = true,
    step,
    offsetTop,
    canonicalAnchor,
    resolveNeighborParts = resolveAdjacentPartWindow
}: UseSectionPagerPartWindowOptions): UseSectionPagerPartWindowResult {
    const [windowCenterPart, setWindowCenterPart] = useState(activePart)
    const pagerSyncReadyRef = useRef(false)

    useEffect(() => {
        pagerSyncReadyRef.current = false
        setWindowCenterPart(activePart)
    }, [activePart, resetKey])

    const activePagerIndex = useMemo(() => {
        if (sections.length === 0 || !activeAnchor) {
            return 0
        }

        const matchedIndex = sections.findIndex(section => section.anchor === activeAnchor)
        return matchedIndex >= 0 ? matchedIndex : 0
    }, [activeAnchor, sections])

    const { currentIndex, canPrev, canNext, handlePrev, handleNext } = useSectionPager({
        sections,
        syncHash,
        trackScroll,
        step,
        offsetTop,
        canonicalAnchor
    })

    useEffect(() => {
        if (sections.length === 0) {
            return
        }

        const currentAnchor = sections[currentIndex]?.anchor
        if (!currentAnchor) {
            return
        }

        const currentPart = resolvePartFromAnchor(currentAnchor)
        if (currentPart == null) {
            return
        }

        if (!pagerSyncReadyRef.current) {
            if (currentIndex === activePagerIndex) {
                pagerSyncReadyRef.current = true
                setWindowCenterPart(currentPart)
            }

            return
        }

        setWindowCenterPart(currentPart)
    }, [activePagerIndex, currentIndex, resolvePartFromAnchor, sections])

    const requestedParts = useMemo(
        () => resolveNeighborParts(availableParts, windowCenterPart),
        [availableParts, resolveNeighborParts, windowCenterPart]
    )

    return {
        windowCenterPart,
        requestedParts,
        currentIndex,
        canPrev,
        canNext,
        handlePrev,
        handleNext
    }
}
