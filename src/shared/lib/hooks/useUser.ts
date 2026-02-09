import { useEffect, useState } from 'react'
import { User } from '@/entities/User'
import { useGetUserQuery } from '@/shared/api'

export function useUser() {
    const { data: user, isLoading, error } = useGetUserQuery()

    const [currentUser, setCurrentUser] = useState<User | null>(null)

    useEffect(() => {
        if (user) {
            setCurrentUser(user)
        } else {
            const storedUser = localStorage.getItem('user')
            if (storedUser) {
                setCurrentUser(JSON.parse(storedUser) as User)
            }
        }
    }, [user])

    return { currentUser, isLoading, error }
}

