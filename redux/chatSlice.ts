import { ChatDate, ChatMessage, TRoomData } from "@/lib/types";
import { formatChatMessages } from "@/lib/utils";
import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from '@reduxjs/toolkit'

export interface IChatState {
	activeChatRoomId: string,
	rooms: {
		[roomId: string]: TRoomData
	}
}

const initialState: IChatState = {
	activeChatRoomId: '',
	rooms: {}
}

export const chatSlice = createSlice({
	name: 'chat',
	initialState,
	reducers: {
		joinRooms: (state, action: PayloadAction<TRoomData[]>) => {
			action.payload.forEach(roomData => {
				if (!state.rooms[roomData.roomId]) {
					state.rooms[roomData.roomId] = {
						is_group: roomData.is_group,
						messages: formatChatMessages(roomData.messages),
						name: roomData.name,
						photo_url: roomData.photo_url,
						roomId: roomData.roomId,
					}
				}
			})
		},
		setActiveRoomId: (state, action: PayloadAction<string>) => {
			state.activeChatRoomId = action.payload
		},
		addMessage: (state, action: PayloadAction<ChatMessage>) => {
			const chatMessages = state.rooms[action.payload.roomId].messages;
			let lastMessage = chatMessages[chatMessages.length - 1];
			if(lastMessage.isDate) lastMessage = chatMessages[chatMessages.length - 2];
			action.payload.isUserInfoDisplayed = true;
			if (lastMessage != null && lastMessage.userUid == action.payload.userUid) {
				action.payload.isUserInfoDisplayed = false;
			}

			const newMessageDate = new Date(action.payload.time);
			const lastMessageDate = new Date(lastMessage.time);

			const isToday = newMessageDate.getDate() === lastMessageDate.getDate() &&
			newMessageDate.getMonth() === lastMessageDate.getMonth() &&
			newMessageDate.getFullYear() === lastMessageDate.getFullYear();

			if(!isToday) {
				const newChatDate : ChatDate = {
					time: 'Today',
					isDate: true
				}

				chatMessages.push(newChatDate);
			}


			state.rooms[action.payload.roomId].messages = [...chatMessages, action.payload]
		},
		clearRoomData: (state) => {
			state = initialState;
		}
	}
})

export const { setActiveRoomId, addMessage, joinRooms, clearRoomData } = chatSlice.actions
export const chatReducer = chatSlice.reducer