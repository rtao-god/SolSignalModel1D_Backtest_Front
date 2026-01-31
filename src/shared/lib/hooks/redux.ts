import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux'
import type { RootState, AppDispatch } from '@/app/providers/StoreProvider/config/configureStore'

/*
	redux — хук.

	Зачем:
		- Инкапсулирует прикладную логику UI.
*/

export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

