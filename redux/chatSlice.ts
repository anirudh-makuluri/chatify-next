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

			const newChatDate: ChatDate = {
				time: 'Today',
				isDate: true,
			}

			if (lastMessage == null) {
				action.payload.isConsecutiveMessage = false;
				chatMessages.push(newChatDate);
			} else {
				if (lastMessage.isDate) lastMessage = chatMessages[chatMessages.length - 2];

				action.payload.isConsecutiveMessage = false;
				if (lastMessage.userUid == action.payload.userUid) {
					action.payload.isConsecutiveMessage = true;
				}


				const newMessageDate = new Date(action.payload.time);
				const lastMessageDate = new Date(lastMessage.time);

				const isToday = newMessageDate.getDate() === lastMessageDate.getDate() &&
					newMessageDate.getMonth() === lastMessageDate.getMonth() &&
					newMessageDate.getFullYear() === lastMessageDate.getFullYear();

				if (!isToday) {
					chatMessages.push(newChatDate);
				}
			}

			state.rooms[action.payload.roomId].messages = [...chatMessages, action.payload]
		},
		addChatDoc: (state, action: PayloadAction<{ messages: ChatMessage[], roomId: string }>) => {
			const formattedMessages = formatChatMessages(action.payload.messages);
			const currentMessages = state.rooms[action.payload.roomId].messages

			const curChatDocFirstMsg = currentMessages[1];
			const newChatDocLastMsg = formattedMessages[formattedMessages.length - 1];
			
			const firstMsgDate = new Date(curChatDocFirstMsg.time);
			const lastMsgDate = new Date(newChatDocLastMsg.time);

			const isSameDay = firstMsgDate.getDate() === lastMsgDate.getDate() &&
			firstMsgDate.getMonth() === lastMsgDate.getMonth() &&
			firstMsgDate.getFullYear() === lastMsgDate.getFullYear();

			if(isSameDay) {
				currentMessages.shift();
			}

			state.rooms[action.payload.roomId].messages = [...formattedMessages, ...currentMessages];
		},
		clearRoomData: (state) => {
			state = initialState;
		}
	}
})

export const { setActiveRoomId, addMessage, joinRooms, clearRoomData, addChatDoc } = chatSlice.actions
export const chatReducer = chatSlice.reducer