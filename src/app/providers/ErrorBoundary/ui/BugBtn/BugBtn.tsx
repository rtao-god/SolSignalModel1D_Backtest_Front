import { Btn } from '@/shared/ui'
import { useEffect, useState } from 'react'

// На будущее. Пока что LEGACY
export default function BugBtn() {
    const [error, setError] = useState(false)

    const onThrow = () => {
        setError(true)
    }

    useEffect(() => {
        if (error) throw new Error()
    }, [error])

    return <Btn onClick={onThrow}>error</Btn>
}
