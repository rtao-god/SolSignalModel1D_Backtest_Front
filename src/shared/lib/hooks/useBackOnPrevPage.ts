import { useNavigate } from 'react-router'

/*
	useBackOnPrevPage — тонкая обёртка над navigate(-1) для единообразного возврата "назад" из UI.

	Контракты:
		- Используется как готовый action в кнопках/ссылках, чтобы не размазывать navigate(-1) по страницам.
*/
export const useBackOnPrevPage = () => {
    const navigate = useNavigate()

    const backOnPrevPage = () => {
        navigate(-1)
    }

    return { backOnPrevPage }
}

