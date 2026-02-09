export type TMethod = 'GET' | 'POST' | 'DELETE' | 'PUT' | 'OPTIONS' | 'HEAD' | 'TRACE' | 'PATCH' | 'CONNECT'

export interface Data {
    detail: string
}
export interface CustomError extends Error {
    data?: Data
}

export type TStatus = 'idle' | 'loading' | 'succeseeded'

