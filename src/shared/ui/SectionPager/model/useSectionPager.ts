import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { scrollToAnchor } from '../lib/scrollToAnchor'

export interface SectionConfig {
    id: string
    anchor: string
}

interface UseSectionPagerOptions {

    sections: SectionConfig[]
    syncHash?: boolean


    trackScroll?: boolean


    step?: number


    offsetTop?: number
}

interface UseSectionPagerResult {

    currentIndex: number
    canPrev: boolean
    canNext: boolean
    handlePrev: () => void
    handleNext: () => void
}

function resolveAnchorOffsetForScroll(offsetTop?: number): number {
    if (typeof offsetTop === 'number') {
        return offsetTop
    }

    if (typeof document === 'undefined') return 0

    try {
        const root = document.documentElement
        const cssValue = getComputedStyle(root).getPropertyValue('--anchor-offset').trim()

        if (!cssValue) {
            return 0
        }

        const probe = document.createElement('div')
        probe.style.position = 'absolute'
        probe.style.visibility = 'hidden'
        probe.style.height = cssValue

        document.body.appendChild(probe)
        const computedHeight = getComputedStyle(probe).height
        document.body.removeChild(probe)

        const value = parseFloat(computedHeight || '')
        return Number.isFinite(value) ? value : 0
    } catch {
        return 0
    }
}

function resolveStep(step?: number): number {
    if (typeof step === 'undefined') {
        return 1
    }

    const isValid = Number.isFinite(step) && step > 0
    if (!isValid) {
        console.warn('[useSectionPager] Invalid step; fallback to 1', { step })
        return 1
    }

    return Math.max(1, Math.floor(step))
}

export function useSectionPager({
    sections,
    syncHash = true,
    trackScroll,
    step,
    offsetTop
}: UseSectionPagerOptions): UseSectionPagerResult {
    const location = useLocation()
    const navigate = useNavigate()

    const trackScrollEffective = typeof trackScroll === 'boolean' ? trackScroll : syncHash
    const stepEffective = resolveStep(step)
    const [currentIndex, setCurrentIndex] = useState(0)


    const programmaticTargetIndexRef = useRef<number | null>(null)
    const lastHandledHashRef = useRef<string | null>(null)
    const scrollSyncedHashRef = useRef<string | null>(null)
    const currentHashRef = useRef<string>('')

    useEffect(() => {
        currentHashRef.current = location.hash.replace('#', '')
    }, [location.hash])

    useEffect(() => {
        if (sections.length === 0) {
            if (currentIndex !== 0) {
                setCurrentIndex(0)
            }
            programmaticTargetIndexRef.current = null
            scrollSyncedHashRef.current = null
            currentHashRef.current = ''
            return
        }

        if (currentIndex >= sections.length) {
            setCurrentIndex(sections.length - 1)
        }
    }, [sections.length, currentIndex])


    useEffect(() => {
        if (!syncHash || sections.length === 0) return

        const hash = location.hash.replace('#', '')
        if (!hash) {
            lastHandledHashRef.current = null
            scrollSyncedHashRef.current = null
            return
        }

        const idx = sections.findIndex(s => s.anchor === hash)
        if (idx < 0) return

        if (scrollSyncedHashRef.current === hash) {
            scrollSyncedHashRef.current = null
            lastHandledHashRef.current = hash
            setCurrentIndex(prev => (prev === idx ? prev : idx))
            return
        }

        if (lastHandledHashRef.current === hash) {
            return
        }

        programmaticTargetIndexRef.current = idx
        lastHandledHashRef.current = hash

        scrollToAnchor(hash, {
            behavior: 'smooth',
            offsetTop,
            withTransitionPulse: true
        })
    }, [location.hash, sections, syncHash, offsetTop])


    useEffect(() => {
        if (!trackScrollEffective || sections.length === 0) {
            return
        }

        if (typeof document === 'undefined') {
            return
        }

        const scrollRoot = document.querySelector('.app') as HTMLElement | null
        if (!scrollRoot) {
            return
        }

        const anchorOffset = resolveAnchorOffsetForScroll(offsetTop)

        const handleScroll = () => {
            if (sections.length === 0) {
                return
            }

            const scrollTop = scrollRoot.scrollTop
            const containerRect = scrollRoot.getBoundingClientRect()
            const anchorLine = scrollTop + anchorOffset

            let bestIndex = 0
            let bestDistance = Number.POSITIVE_INFINITY

            for (let i = 0; i < sections.length; i += 1) {
                const section = sections[i]
                const el = section.anchor ? document.getElementById(section.anchor) : null
                if (!el) continue

                const rect = el.getBoundingClientRect()
                const elementTop = rect.top - containerRect.top + scrollTop
                const distance = Math.abs(elementTop - anchorLine)

                if (distance < bestDistance) {
                    bestDistance = distance
                    bestIndex = i
                }
            }

            if (bestDistance === Number.POSITIVE_INFINITY) {
                return
            }

            setCurrentIndex(prev => (prev === bestIndex ? prev : bestIndex))

            const bestAnchor = sections[bestIndex]?.anchor
            const isProgrammaticScroll = programmaticTargetIndexRef.current !== null
            if (!syncHash || !bestAnchor || isProgrammaticScroll) {
                return
            }

            if (currentHashRef.current === bestAnchor) {
                return
            }

            scrollSyncedHashRef.current = bestAnchor
            currentHashRef.current = bestAnchor
            navigate(
                {
                    pathname: location.pathname,
                    search: location.search,
                    hash: `#${bestAnchor}`
                },
                { replace: true, preventScrollReset: true }
            )
        }

        scrollRoot.addEventListener('scroll', handleScroll, { passive: true })
        handleScroll()

        return () => {
            scrollRoot.removeEventListener('scroll', handleScroll)
        }
    }, [sections, trackScrollEffective, offsetTop, syncHash, navigate, location.pathname, location.search])


    useEffect(() => {
        const target = programmaticTargetIndexRef.current
        if (target === null) return

        if (target === currentIndex) {
            programmaticTargetIndexRef.current = null
        }
    }, [currentIndex])


    const goToIndex = useCallback(
        (nextIndex: number) => {
            if (nextIndex < 0 || nextIndex >= sections.length) return

            const section = sections[nextIndex]
            if (!section?.anchor) return

            programmaticTargetIndexRef.current = nextIndex

            if (syncHash) {
                navigate(`#${section.anchor}`)
                scrollToAnchor(section.anchor, {
                    behavior: 'smooth',
                    offsetTop,
                    withTransitionPulse: true
                })
            } else {
                scrollToAnchor(section.anchor, {
                    behavior: 'smooth',
                    offsetTop,
                    withTransitionPulse: true
                })
            }
        },
        [sections, syncHash, offsetTop, navigate]
    )

    const handlePrev = useCallback(() => {
        goToIndex(currentIndex - stepEffective)
    }, [currentIndex, goToIndex, stepEffective])

    const handleNext = useCallback(() => {
        goToIndex(currentIndex + stepEffective)
    }, [currentIndex, goToIndex, stepEffective])

    const effectiveIndex = programmaticTargetIndexRef.current ?? currentIndex

    const canPrev = sections.length > 1 && effectiveIndex > 0
    const canNext = sections.length > 1 && effectiveIndex < sections.length - 1

    return {
        currentIndex: effectiveIndex,
        canPrev,
        canNext,
        handlePrev,
        handleNext
    }
}
