import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from '@reduxjs/toolkit';
import { TScheduledMessage } from "@/lib/types";

interface ScheduledMessagesState {
	scheduledMessages: TScheduledMessage[];
	loading: boolean;
	error: string | null;
}

const initialState: ScheduledMessagesState = {
	scheduledMessages: [],
	loading: false,
	error: null
};

const scheduledMessagesSlice = createSlice({
	name: 'scheduledMessages',
	initialState,
	reducers: {
		setScheduledMessages: (state, action: PayloadAction<TScheduledMessage[]>) => {
			state.scheduledMessages = action.payload;
			state.loading = false;
			state.error = null;
		},
		addScheduledMessage: (state, action: PayloadAction<TScheduledMessage>) => {
			state.scheduledMessages.push(action.payload);
		},
		updateScheduledMessage: (state, action: PayloadAction<{ id: string; updates: Partial<TScheduledMessage> }>) => {
			const { id, updates } = action.payload;
			const index = state.scheduledMessages.findIndex(msg => msg.id === id);
			if (index !== -1) {
				state.scheduledMessages[index] = { ...state.scheduledMessages[index], ...updates };
			}
		},
		removeScheduledMessage: (state, action: PayloadAction<string>) => {
			state.scheduledMessages = state.scheduledMessages.filter(msg => msg.id !== action.payload);
		},
		setLoading: (state, action: PayloadAction<boolean>) => {
			state.loading = action.payload;
		},
		setError: (state, action: PayloadAction<string | null>) => {
			state.error = action.payload;
			state.loading = false;
		},
		clearError: (state) => {
			state.error = null;
		}
	}
});

export const { 
	setScheduledMessages, 
	addScheduledMessage, 
	updateScheduledMessage, 
	removeScheduledMessage, 
	setLoading, 
	setError, 
	clearError 
} = scheduledMessagesSlice.actions;

export const scheduledMessagesReducer = scheduledMessagesSlice.reducer;

