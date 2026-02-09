import { ReactNode } from "react"
export default interface FormFieldProps {
    children: ReactNode
    label: string
    name: string
    error?: string
}

