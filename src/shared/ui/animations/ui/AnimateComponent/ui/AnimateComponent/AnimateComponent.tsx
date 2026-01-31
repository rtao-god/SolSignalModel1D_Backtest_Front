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
    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: initialOpacity }}
                animate={{ opacity: animateOpacity }}
                exit={{ opacity: exitOpacity }}
                transition={{ duration }}>
                <Component {...rest}>{children}</Component>
            </motion.div>
        </AnimatePresence>
    )
}

