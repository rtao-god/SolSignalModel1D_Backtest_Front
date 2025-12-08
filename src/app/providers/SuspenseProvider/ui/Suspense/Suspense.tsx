import { Suspense, useEffect, useState } from 'react'
import SuspenseProps from './types'
import classNames from '@/shared/lib/helpers/classNames'
import cls from './Suspense.module.scss'
import { Loader } from '@/shared/ui'

export default function AppSuspense({ className, children, fallback = <Loader /> }: SuspenseProps) {
    // Checking the loader operation
  /*     const [isLoading, setIsLoading] = useState(true);
  
      useEffect(() => {
          const timer = setTimeout(() => {
              setIsLoading(false);
          }, 100000);
  
          return () => clearTimeout(timer);
      }, []); */
  
    return (
        <div className={classNames(cls.Suspense, {}, [className ?? ''])}>
            {/* {isLoading && <Loader />} */}
            <Suspense fallback={fallback}>{children}</Suspense>
        </div>
    )
}
