import cls from './Checkbox.module.scss'
import classNames from '@/shared/lib/helpers/classNames'
import CheckboxProps from './types'
import { ChangeEventHandler } from 'react'

export default function Checkbox({ label, value, className, onChange }: CheckboxProps) {
    const onChangeLocal: ChangeEventHandler<HTMLInputElement> = event => {
        onChange?.(event.target.checked)
    }

    return (
        <label className={cls.root}>
            <input type='checkbox' className={cls.input} checked={value} onChange={onChangeLocal} />
            <div className={cls.view}></div>
            <div className={cls.label}>{label}</div>
        </label>
    )
}
