import { ComponentType, lazy, type LazyExoticComponent } from 'react'

export function lazyPage<T extends ComponentType<any>>(
    importer: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
    return lazy(importer)
}
