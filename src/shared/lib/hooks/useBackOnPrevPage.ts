import { useNavigate } from 'react-router'

/*
	useBackOnPrevPage — пользовательский хук.

	Зачем:
		- Инкапсулирует логику useBackOnPrevPage.
*/

export const useBackOnPrevPage = () => {
    const navigate = useNavigate()

    const backOnPrevPage = () => {
        navigate(-1)
    }

    return { backOnPrevPage }
}

