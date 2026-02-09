import { Suspense, useEffect, useState } from 'react'
import SuspenseProps from './types'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './Suspense.module.scss'
import { Loader } from '@/shared/ui'

export default function AppSuspense({ className, children, fallback = <Loader /> }: SuspenseProps) {


    return (
        <div className={classNames(cls.Suspense, {}, [className ?? ''])}>

            <Suspense fallback={fallback}>{children}</Suspense>
        </div>
    )
}
