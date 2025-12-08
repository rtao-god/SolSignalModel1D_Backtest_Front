import { ReactNode } from "react"

export default interface PageSuspenseProps {
    title: string
    subtitle?: string
    children: ReactNode
}