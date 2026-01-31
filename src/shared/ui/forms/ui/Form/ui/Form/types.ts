import { ReactNode } from "react"
export default interface FormProps {
    onSubmit: (data: any) => void
    children: ReactNode
    className?: string
}


