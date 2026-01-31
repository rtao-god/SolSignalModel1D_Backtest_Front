import { useEffect, useState } from 'react'
import { User } from '@/entities/User'
import { useGetUserQuery } from '@/shared/api'

/*
	useUser — пользовательский хук.

	Зачем:
		- Инкапсулирует логику useUser.
*/

export function useUser() {
    const { data: user, isLoading, error } = useGetUserQuery()

    const [currentUser, setCurrentUser] = useState<User | null>(null)

    useEffect(() => {
        if (user) {
            setCurrentUser(user)
        } else {
            // Здесь можно добавить логику для получения данных из localStorage.
            const storedUser = localStorage.getItem('user')
            if (storedUser) {
                setCurrentUser(JSON.parse(storedUser) as User)
            }
        }
    }, [user])

    return { currentUser, isLoading, error }
}

