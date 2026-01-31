import { InputHTMLAttributes } from 'react'
export interface CustomInputProps {
    width?: string
    height?: string
    borderColor?: string
    error?: string
    bgcolor?: string
    padding?: string
    fz?: string
    border?: string
    bt?: string
    br?: string
    bb?: string
    bl?: string
    btr?: string
    bbr?: string
    btl?: string
    bbl?: string
    borderRadius?: string
}

export type InputProps = CustomInputProps & Omit<InputHTMLAttributes<HTMLInputElement>, 'style'>


