import { Group } from './group.type'

/*
	user.types — типы пользователя.

	Зачем:
		- Описывает структуру UserData, используемую в API и shared-слое.
*/

export interface UserData {
    id: number
    password: string
    last_login: Date | null
    is_required: boolean
    is_staff: boolean
    identifier: string
    email: string | null
    first_name: string | null
    last_name: string | null
    surname: string | null
    birthday: string | null
    image: string
    address: string | null
    created_at: Date | null
    updated_at: Date | null
    verification_code: number
    reset_code: number
    email_verification_code: number
    group: Group | null
    clinic: number | null
    interest: number | null
}
