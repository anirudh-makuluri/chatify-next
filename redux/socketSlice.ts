import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from '@reduxjs/toolkit'
import io from 'socket.io-client';
import { AppThunk } from "./store";
import { ChatMessage, TAuthUser, TUser } from "@/lib/types";

//FIXME
interface SocketState {
	socket: any
}

const initialState: SocketState = {
	socket: null
}

const socketSlice = createSlice({
	name: 'socket',
	initialState,
	reducers: {
		initSocket: (state, action : PayloadAction<TUser>) => {
			if (state.socket == null) {

				console.log("initing socket");
				const socket = io('http://localhost:5000', {
					transports: ['websocket'],
					// upgrade: false,
					// autoConnect: false,
					query: {
						...action.payload
					},
					closeOnBeforeunload: false
				})

				socket.auth = {
					uid: action.payload.uid,
					name: action.payload.name
				}
				
				return { ...state, socket };
			}
			return state;
		},
		joinRooms: (state, action: PayloadAction<string[]>) => {
			if (state.socket) {
				action.payload.forEach(roomId => {
					state.socket.emit('join_room', roomId);
				})
			}
		}
	}
})

export const { initSocket, joinRooms } = socketSlice.actions;
export const socketReducer = socketSlice.reducer

export const initAndJoinRooms = (rooms: string[], user: TUser): AppThunk => dispatch => {
	dispatch(initSocket(user));
	dispatch(joinRooms(rooms));
}

export const sendMessageToServer = (message: ChatMessage): AppThunk => (dispatch, getState) => {
	const { socket } = getState().socket;
	if (socket) {
		socket.emit('send_message', message);
	}
};

export const socketRequest = (type : string, data : Object = {}): AppThunk => (dispatch, getState) => {
	const { socket } = getState().socket;

	return new Promise((resolve, reject) => {
		socket.emit(type, data, (data : { error: string } | { success: string, error: null }) => {
			if (data.error) {
				reject(data.error);
			} else {
				resolve(data);
			}
		});
	});
}