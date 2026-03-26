declare module '*.scss' {
    const classes: Record<string, string>
    export default classes
}

declare module '*.svg' {
    const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>
    export default ReactComponent
}

declare module '*.png'
declare module '*.jpg'
declare module '*.jpeg'

type DeepPartial<T> = {
    [P in keyof T]?: DeepPartial<T[P]>
}

declare const __IS_DEV__: boolean
