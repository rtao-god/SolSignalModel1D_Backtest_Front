/*
	authRegister — константы.

	Зачем:
		- Содержит статические значения для UI и логики.
*/
const ERROR_MESSAGES = {
    BIRTHDAY_REQUIRED: 'Укажите дату рождения.',
    BIRTHDAY_COMPLETE: 'Введите полностью свою дату рождения.',
    IDENTIFIER_REQUIRED: 'Введите номер телефона или электронную почту.',
    IDENTIFIER_INVALID: 'Такого телефона или почты не существует.',
    PASSWORD_REQUIRED: 'Введите пароль.',
    PASSWORD_SHORT: 'Пароль должен быть длиннее 4 символов.',
    PASSWORD_MISMATCH: 'Пароли не совпадают.',
    TERMS_REQUIRED: 'Необходимо принять условия.'
}

export const {
    BIRTHDAY_REQUIRED,
    BIRTHDAY_COMPLETE,
    IDENTIFIER_REQUIRED,
    IDENTIFIER_INVALID,
    PASSWORD_REQUIRED,
    PASSWORD_SHORT,
    PASSWORD_MISMATCH,
    TERMS_REQUIRED
} = ERROR_MESSAGES


