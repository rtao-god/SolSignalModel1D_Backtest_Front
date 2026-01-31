/*
	group.type — типы.

	Зачем:
		- Описывает DTO и доменные типы.
*/
export type TGroups = 'Пользователи' | 'Администраторы'

export interface Group {
    id: number
    name: TGroups
    number_of_people: number
}


