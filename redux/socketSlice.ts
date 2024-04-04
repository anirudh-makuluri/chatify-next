import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from '@reduxjs/toolkit'
import io, { Socket } from 'socket.io-client';
import { AppThunk } from "./store";
import { ChatMessage, TAuthUser, TUser } from "@/lib/types";
import { globals } from "@/globals";

interface SocketState {
	socket: Socket | null
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
				const backendUrl = globals.BACKEND_URL;
				const socket = io(backendUrl, {
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
		joinSocketRoom: (state, action: PayloadAction<string>) => {
			if (state.socket) {
				state.socket?.emit('join_room', action.payload);
			}
		}
	}
})

export const { initSocket, joinSocketRoom } = socketSlice.actions;
export const socketReducer = socketSlice.reducer

export const initAndJoinSocketRooms = (rooms: string[], user: TUser): AppThunk => dispatch => {
	dispatch(initSocket(user));
	rooms.forEach(roomId => {
		dispatch(joinSocketRoom(roomId));
	});
}

export const sendMessageToServer = (message: ChatMessage): AppThunk => (dispatch, getState) => {
	const { socket } = getState().socket;
	if (socket) {
		socket.emit('chat_event_client_to_server', message);
	}
};