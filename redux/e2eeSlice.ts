'use client'

/**
 * Redux Slice for E2EE State Management
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
	DeviceKeyPair,
	GroupKeyPair,
	MemberPublicKeys,
	E2EEDeviceState,
} from '@/lib/e2ee-types';

export interface E2EEState {
	deviceState: E2EEDeviceState | null;
	memberPublicKeys: {
		[groupId: string]: MemberPublicKeys;
	};
	keyRotationInProgress: {
		[deviceId: string]: boolean;
	};
	error: string | null;
	isInitializing: boolean;
}

const initialState: E2EEState = {
	deviceState: null,
	memberPublicKeys: {},
	keyRotationInProgress: {},
	error: null,
	isInitializing: false,
};

export const e2eeSlice = createSlice({
	name: 'e2ee',
	initialState,
	reducers: {
		// Initialize device
		setDeviceState: (state, action: PayloadAction<E2EEDeviceState>) => {
			state.deviceState = action.payload;
			state.error = null;
		},

		// Set device initialization status
		setInitializing: (state, action: PayloadAction<boolean>) => {
			state.isInitializing = action.payload;
		},

		// Update device name
		updateDeviceName: (state, action: PayloadAction<string>) => {
			if (state.deviceState) {
				state.deviceState.deviceName = action.payload;
				if (state.deviceState.identityKeyPair) {
					state.deviceState.identityKeyPair.deviceName = action.payload;
				}
			}
		},

		// Add or update group keypair
		setGroupKeyPair: (state, action: PayloadAction<GroupKeyPair>) => {
			if (state.deviceState) {
				state.deviceState.groupKeyPairs[action.payload.groupId] = action.payload;
			}
		},

		// Remove group keypair
		removeGroupKeyPair: (state, action: PayloadAction<string>) => {
			if (state.deviceState) {
				delete state.deviceState.groupKeyPairs[action.payload];
			}
		},

		// Set member public keys for a group
		setGroupMemberPublicKeys: (
			state,
			action: PayloadAction<{ groupId: string; memberPublicKeys: MemberPublicKeys }>
		) => {
			state.memberPublicKeys[action.payload.groupId] =
				action.payload.memberPublicKeys;
			state.error = null;
		},

		// Update specific member public keys
		updateMemberPublicKey: (
			state,
			action: PayloadAction<{
				groupId: string;
				userId: string;
				deviceId: string;
				publicKey: string;
			}>
		) => {
			if (!state.memberPublicKeys[action.payload.groupId]) {
				state.memberPublicKeys[action.payload.groupId] = {};
			}
			if (!state.memberPublicKeys[action.payload.groupId][action.payload.userId]) {
				state.memberPublicKeys[action.payload.groupId][action.payload.userId] = {};
			}
			state.memberPublicKeys[action.payload.groupId][
				action.payload.userId
			][action.payload.deviceId] = action.payload.publicKey;
			state.error = null;
		},

		// Remove member public keys
		removeMemberPublicKeys: (
			state,
			action: PayloadAction<{ groupId: string; userId: string }>
		) => {
			if (state.memberPublicKeys[action.payload.groupId]) {
				delete state.memberPublicKeys[action.payload.groupId][
					action.payload.userId
				];
			}
		},

		// Remove device public key from group
		removeDevicePublicKey: (
			state,
			action: PayloadAction<{
				groupId: string;
				userId: string;
				deviceId: string;
			}>
		) => {
			if (
				state.memberPublicKeys[action.payload.groupId]?.[
					action.payload.userId
				]?.[action.payload.deviceId]
			) {
				delete state.memberPublicKeys[action.payload.groupId][
					action.payload.userId
				][action.payload.deviceId];
			}
		},

		// Set key rotation in progress
		setKeyRotationInProgress: (
			state,
			action: PayloadAction<{ deviceId: string; inProgress: boolean }>
		) => {
			state.keyRotationInProgress[action.payload.deviceId] =
				action.payload.inProgress;
			if (!action.payload.inProgress) {
				state.error = null;
			}
		},

		// Set error
		setError: (state, action: PayloadAction<string | null>) => {
			state.error = action.payload;
		},

		// Clear all E2EE data
		clearE2EEData: (state) => {
			state.deviceState = null;
			state.memberPublicKeys = {};
			state.keyRotationInProgress = {};
			state.error = null;
			state.isInitializing = false;
		},

		// Rotate identity key
		rotateIdentityKey: (state, action: PayloadAction<DeviceKeyPair>) => {
			if (state.deviceState) {
				state.deviceState.identityKeyPair = action.payload;
			}
		},

		// Clear rotation history
		clearKeyRotationProgress: (state, action: PayloadAction<string>) => {
			delete state.keyRotationInProgress[action.payload];
		},
	},
});

export const {
	setDeviceState,
	setInitializing,
	updateDeviceName,
	setGroupKeyPair,
	removeGroupKeyPair,
	setGroupMemberPublicKeys,
	updateMemberPublicKey,
	removeMemberPublicKeys,
	removeDevicePublicKey,
	setKeyRotationInProgress,
	setError,
	clearE2EEData,
	rotateIdentityKey,
	clearKeyRotationProgress,
} = e2eeSlice.actions;

export const e2eeReducer = e2eeSlice.reducer;

// Selectors
export const selectDeviceState = (state: any) => state.e2ee.deviceState;
export const selectDeviceId = (state: any) => state.e2ee.deviceState?.deviceId;
export const selectIdentityPublicKey = (state: any) =>
	state.e2ee.deviceState?.identityKeyPair?.publicKey;
export const selectGroupMemberPublicKeys = (groupId: string) => (state: any) =>
	state.e2ee.memberPublicKeys[groupId];
export const selectE2EEError = (state: any) => state.e2ee.error;
export const selectIsInitializing = (state: any) => state.e2ee.isInitializing;
export const selectKeyRotationInProgress = (deviceId: string) => (state: any) =>
	state.e2ee.keyRotationInProgress[deviceId];
export const selectGroupPrivateKey = (groupId: string) => (state: any) =>
	state.e2ee.deviceState?.groupKeyPairs[groupId]?.privateKey;
