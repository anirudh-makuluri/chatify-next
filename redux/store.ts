import { Action, configureStore, ThunkAction } from '@reduxjs/toolkit'
import { useDispatch, TypedUseSelectorHook, useSelector } from 'react-redux'

import { chatReducer } from './chatSlice';
import { socketReducer } from './socketSlice';

export type AppThunk<ReturnType = void> = ThunkAction<
  ReturnType,
  RootState,
  unknown,
  Action<string>
>;

export const store = configureStore({
	reducer: { chat: chatReducer, socket: socketReducer },
	middleware: (getDefaultMiddleware) => 
		getDefaultMiddleware({ serializableCheck: false })
})

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;


export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector