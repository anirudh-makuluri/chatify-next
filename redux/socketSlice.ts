import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from '@reduxjs/toolkit'
import io, { Socket } from 'socket.io-client';
import { AppThunk } from "./store";
import { ChatMessage, TAuthUser, TUser, TScheduledMessage, TScheduleMessageRequest, TUpdateScheduledMessageRequest } from "@/lib/types";
import { globals } from "@/globals";
import { addScheduledMessage, setScheduledMessages, updateScheduledMessage as updateScheduledMessageState, removeScheduledMessage } from "./scheduledMessagesSlice";

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

// Scheduled Messages Actions
export const scheduleMessage = (scheduledMessage: TScheduleMessageRequest): AppThunk => (dispatch, getState) => {
	const { socket } = getState().socket;
	if (socket) {
		socket.emit('schedule_message', { scheduledMessage }, (response: any) => {
			console.log('Schedule message response:', response);
			if (response.success && response.scheduledMessage) {
				// Convert string dates to Date objects
				const convertedMessage = {
					...response.scheduledMessage,
					scheduledTime: new Date(response.scheduledMessage.scheduledTime),
					createdAt: new Date(response.scheduledMessage.createdAt),
					sentAt: response.scheduledMessage.sentAt ? new Date(response.scheduledMessage.sentAt) : undefined
				};
				dispatch(addScheduledMessage(convertedMessage));
			}
		});
	}
};

export const getScheduledMessages = (userUid: string, roomId?: string): AppThunk => (dispatch, getState) => {
	const { socket } = getState().socket;
	if (socket) {
		socket.emit('get_scheduled_messages', { userUid, roomId }, (response: any) => {
			console.log('Get scheduled messages response:', response);
			if (response.success && response.scheduledMessages) {
				// Convert string dates to Date objects
				const convertedMessages = response.scheduledMessages.map((msg: any) => ({
					...msg,
					scheduledTime: new Date(msg.scheduledTime),
					createdAt: new Date(msg.createdAt),
					sentAt: msg.sentAt ? new Date(msg.sentAt) : undefined
				}));
				dispatch(setScheduledMessages(convertedMessages));
			}
		});
	}
};

export const updateScheduledMessage = (scheduledMessageId: string, updates: TUpdateScheduledMessageRequest, userUid: string): AppThunk => (dispatch, getState) => {
	const { socket } = getState().socket;
	if (socket) {
		socket.emit('update_scheduled_message', { scheduledMessageId, updates, userUid }, (response: any) => {
			console.log('Update scheduled message response:', response);
			if (response.success) {
				// Convert string dates to Date objects for Redux state
				const reduxUpdates: Partial<TScheduledMessage> = {
					...updates,
					scheduledTime: updates.scheduledTime ? new Date(updates.scheduledTime) : undefined
				};
				dispatch(updateScheduledMessageState({ id: scheduledMessageId, updates: reduxUpdates }));
			}
		});
	}
};

export const deleteScheduledMessage = (scheduledMessageId: string, userUid: string): AppThunk => (dispatch, getState) => {
	const { socket } = getState().socket;
	if (socket) {
		socket.emit('delete_scheduled_message', { scheduledMessageId, userUid }, (response: any) => {
			console.log('Delete scheduled message response:', response);
			if (response.success) {
				dispatch(removeScheduledMessage(scheduledMessageId));
			}
		});
	}
};