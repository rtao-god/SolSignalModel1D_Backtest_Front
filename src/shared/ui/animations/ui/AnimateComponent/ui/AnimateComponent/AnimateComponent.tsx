import { useEffect, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import AnimateComponentProps from './types'

export default function AnimateComponent({
    Component = 'div',
    children,
    initialOpacity = 0,
    animateOpacity = 1,
    exitOpacity = 0,
    duration = 0.5,
    ...rest
}: AnimateComponentProps) {
    const hasMountedRef = useRef(false)

    useEffect(() => {
        hasMountedRef.current = true
    }, [])

    return (
        <AnimatePresence>
            <motion.div
                initial={!hasMountedRef.current ? { opacity: initialOpacity } : false}
                animate={{ opacity: animateOpacity }}
                exit={{ opacity: exitOpacity }}
                transition={{ duration }}>
                <Component {...rest}>{children}</Component>
            </motion.div>
        </AnimatePresence>
    )
}
