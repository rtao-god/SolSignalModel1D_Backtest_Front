import { FormEvent } from 'react'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './Form.module.scss'
import FormProps from './types'

export default function Form({ onSubmit, className, children }: FormProps) {
    const handleSubmit = (e: FormEvent) => {
        e.preventDefault()
        const formData = new FormData(e.target as HTMLFormElement)
        const data = Object.fromEntries(formData.entries())
        onSubmit(data)
    }

    return (
        <form onSubmit={handleSubmit} className={classNames(cls.Form, {}, [className ?? ''])}>
            {children}
        </form>
    )
}

