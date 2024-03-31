import { ChatMessage, TRoomData } from "@/lib/types";
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
						messages: [],
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
			const lastMessage = state.rooms[action.payload.roomId].messages[state.rooms[action.payload.roomId].messages.length - 1];
			action.payload.isUserInfoDisplayed = true;
			if (lastMessage != null && lastMessage.userUid == action.payload.userUid) {
				action.payload.isUserInfoDisplayed = false;
			}


			state.rooms[action.payload.roomId].messages = [...state.rooms[action.payload.roomId].messages, action.payload]
		},
		clearRoomData: (state) => {
			state = initialState;
		}
	}
})

export const { setActiveRoomId, addMessage, joinRooms, clearRoomData } = chatSlice.actions
export const chatReducer = chatSlice.reducer