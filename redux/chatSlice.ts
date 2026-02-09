import { ChatDate, ChatMessage, TDeleteEvent, TEditEvent, TReactionEvent, TRoomData, TSaveEvent } from "@/lib/types";
import { formatChatMessages, decryptChatMessage } from "@/lib/utils";
import * as deviceManager from "@/lib/device-manager";
import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from '@reduxjs/toolkit'

export interface IChatState {
	activeChatRoomId: string,
	rooms: {
		[roomId: string]: TRoomData
	},
	//unreadmessages
}

const initialState: IChatState = {
	activeChatRoomId: '',
	rooms: {}
}

export const chatSlice = createSlice({
	name: 'chat',
	initialState,
	reducers: {
			joinChatRoom: (state, action: PayloadAction<{ roomData: TRoomData, userId?: string, deviceId?: string }>) => {
			const { roomData, userId, deviceId } = action.payload;
			if(state.rooms[roomData.roomId] != null) return;
			
			// Get room keypair once for batch decryption
			const roomKeyPair = deviceManager.getRoomKeyPair(roomData.roomId);
			
			// Type guard to filter only ChatMessage objects (exclude ChatDate)
			const isChatMessage = (msg: ChatMessage | ChatDate): msg is ChatMessage => 
				typeof msg.id === 'number';
			
			// Decrypt all messages and saved messages (filter out ChatDate objects)
			const decryptedMessages = (roomData.messages || []).map(msg => 
				isChatMessage(msg) ? decryptChatMessage(msg, roomKeyPair, userId, deviceId) : msg
			);
			const decryptedSavedMessages = (roomData.saved_messages || []).map(msg => 
				isChatMessage(msg) ? decryptChatMessage(msg, roomKeyPair, userId, deviceId) : msg
			);
				
			state.rooms[roomData.roomId] = {
				is_group: roomData.is_group,
				is_ai_room: roomData.roomId.startsWith('ai-assistant-'),
				messages: formatChatMessages(decryptedMessages),
				name: roomData.name,
				photo_url: roomData.photo_url,
				roomId: roomData.roomId,
				membersData: roomData.membersData || [],
				saved_messages: decryptedSavedMessages
			}
		},
		setActiveRoomId: (state, action: PayloadAction<string>) => {
			state.activeChatRoomId = action.payload
			//unreadmessages = 0
		},
		addMessage: (state, action: PayloadAction<{ message: ChatMessage, userId?: string, deviceId?: string }>) => {
			const { message, userId, deviceId } = action.payload;
			// Get room keypair once for decryption
			const roomKeyPair = deviceManager.getRoomKeyPair(message.roomId);
			// Decrypt message if encrypted
			const decryptedMessage = decryptChatMessage(message, roomKeyPair, userId, deviceId);
			
			const chatMessages = state.rooms[decryptedMessage.roomId].messages;
			let lastMessage = chatMessages[chatMessages.length - 1];

			const newChatDate: ChatDate = {
				time: 'Today',
				isDate: true,
			}

			if (lastMessage == null) {
				decryptedMessage.isConsecutiveMessage = false;
				chatMessages.push(newChatDate);
			} else {
				if (lastMessage.isDate) lastMessage = chatMessages[chatMessages.length - 2];

				decryptedMessage.isConsecutiveMessage = false;
				if (lastMessage.userUid == decryptedMessage.userUid) {
					decryptedMessage.isConsecutiveMessage = true;
				}


				const newMessageDate = new Date(decryptedMessage.time);
				const lastMessageDate = new Date(lastMessage.time);

				const isToday = newMessageDate.getDate() === lastMessageDate.getDate() &&
					newMessageDate.getMonth() === lastMessageDate.getMonth() &&
					newMessageDate.getFullYear() === lastMessageDate.getFullYear();

				if (!isToday) {
					chatMessages.push(newChatDate);
				}
			}

			//Send push notification here

			state.rooms[decryptedMessage.roomId].messages = [...chatMessages, decryptedMessage]
		},
		addChatDoc: (state, action: PayloadAction<{ messages: ChatMessage[], roomId: string, userId?: string, deviceId?: string }>) => {
			const { messages: rawMessages, roomId, userId, deviceId } = action.payload;
			
			// Get room keypair once for batch decryption (performance optimization)
			const roomKeyPair = deviceManager.getRoomKeyPair(roomId);
			// Decrypt all messages
			const decryptedMessages = rawMessages.map(msg => 
				decryptChatMessage(msg, roomKeyPair, userId, deviceId)
			);
			
			const formattedMessages = formatChatMessages(decryptedMessages);
			const currentMessages = state.rooms[roomId].messages

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

			state.rooms[roomId].messages = [...formattedMessages, ...currentMessages];
		},
		updateChatReaction: (state, action : PayloadAction<TReactionEvent>) => {
			const currentRoom = state.rooms[action.payload.roomId];

			const messages = currentRoom.messages

			const reqIdx = messages.findIndex(msg => msg.id == action.payload.id);
			if(reqIdx == -1) return

			const reactions = messages[reqIdx].reactions || []

			const reqReactionIdx = reactions.findIndex(data => data.id == action.payload.reactionId)

			if(reqReactionIdx == -1) {
				const newReactionItem = {
					id: action.payload.reactionId,
					reactors: [{
						uid: action.payload.userUid,
						name: action.payload.userName
					}]
				}
				reactions.push(newReactionItem);
			} else {
				const reqReactorIdx = reactions[reqReactionIdx].reactors.findIndex(data => data.uid == action.payload.userUid)

				if (reqReactorIdx == -1) {
					reactions[reqReactionIdx].reactors.push({
						name: action.payload.userName,
						uid: action.payload.userUid
					});
				} else {
					reactions[reqReactionIdx].reactors.splice(reqReactorIdx, 1);
					if(reactions[reqReactionIdx].reactors.length == 0) {
						reactions.splice(reqReactionIdx, 1)
					}
				}
			}

			messages[reqIdx].reactions = reactions;

			state.rooms[action.payload.roomId].messages = messages		
		},
		deleteChatMessage: (state, action : PayloadAction<TDeleteEvent>) => {
			const currentRoom = state.rooms[action.payload.roomId];

			const messages = currentRoom.messages

			const reqIdx = messages.findIndex(msg => msg.id == action.payload.id);
			if(reqIdx == -1) return

			messages.splice(reqIdx, 1);
			if(messages[messages.length - 1].isDate) {
				messages.pop();
			}

			state.rooms[action.payload.roomId].messages = messages
		},
		editChatMessage: (state, action : PayloadAction<TEditEvent>) => {
			const currentRoom = state.rooms[action.payload.roomId];

			const messages = currentRoom.messages

			const reqIdx = messages.findIndex(msg => msg.id == action.payload.id);
			if(reqIdx == -1) return

			messages[reqIdx].chatInfo = action.payload.newText
			messages[reqIdx].isMsgEdited = true

			state.rooms[action.payload.roomId].messages = messages
		},
		saveChatMessage: (state, action : PayloadAction<TSaveEvent>) => {
			const currentRoom = state.rooms[action.payload.roomId];

			const messages = currentRoom.messages
			const savedMessages = currentRoom.saved_messages;

			const reqIdx = messages.findIndex(msg => msg.id == action.payload.id);
			if(reqIdx == -1) return

			const isMsgSaved = messages[reqIdx].isMsgSaved || false;

			if(isMsgSaved) {
				messages[reqIdx].isMsgSaved = false;

				const reqSavedMsgIdx = savedMessages.findIndex(msg => msg.id == action.payload.id);

				if(reqSavedMsgIdx != -1) {
					savedMessages.splice(reqSavedMsgIdx, 1);
				}
			} else {
				messages[reqIdx].isMsgSaved = true;

				savedMessages.push(messages[reqIdx])
			}

			state.rooms[action.payload.roomId].messages = messages
			state.rooms[action.payload.roomId].saved_messages = savedMessages
		},
		clearRoomData: (state) => {
			state = initialState;
		},
		removeRoom: (state, action: PayloadAction<string>) => {
			const roomId = action.payload
			if (state.activeChatRoomId === roomId) {
				state.activeChatRoomId = ''
			}
			delete state.rooms[roomId]
		},
		incrementUnreadMessages: () => {
			
		}
	}
})

export const { 
	setActiveRoomId, 
	addMessage, 
	joinChatRoom, 
	clearRoomData, 
	removeRoom, 
	addChatDoc, 
	updateChatReaction, 
	deleteChatMessage, 
	editChatMessage,
	saveChatMessage
} = chatSlice.actions

export const chatReducer = chatSlice.reducer