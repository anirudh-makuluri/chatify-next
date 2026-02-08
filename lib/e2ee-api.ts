'use client'

/**
 * E2EE API Client
 * Handles all E2EE-related API calls
 */

import { customFetch } from './utils';
import {
	RegisterDeviceIdentityKeyRequest,
	RegisterDeviceIdentityKeyResponse,
	RegisterDeviceRoomKeyRequest,
	RegisterDeviceRoomKeyResponse,
	GetRoomPublicKeysResponse,
	GetIdentityKeyResponse,
	RotateKeysRequest,
	RotateKeysResponse,
	RemoveRoomKeyResponse,
	StoreEncryptedRoomMessageRequest,
	StoreEncryptedRoomMessageResponse,
} from './e2ee-types';

/**
 * Register device identity key with the server
 */
export const registerDeviceIdentityKey = async (
	request: RegisterDeviceIdentityKeyRequest
): Promise<RegisterDeviceIdentityKeyResponse> => {
	return customFetch({
		pathName: 'auth/setup-keys',
		method: 'POST',
		body: request,
	});
};

/**
 * Register device room key with the server
 */
export const registerDeviceRoomKey = async (
	roomId: string,
	request: RegisterDeviceRoomKeyRequest
): Promise<RegisterDeviceRoomKeyResponse> => {
	return customFetch({
		pathName: `rooms/${roomId}/members/add-key`,
		method: 'POST',
		body: request,
	});
};

/**
 * Get all room public keys (all members + devices)
 */
export const getRoomPublicKeys = async (
	roomId: string
): Promise<GetRoomPublicKeysResponse> => {
	return customFetch({
		pathName: `rooms/${roomId}/members/public-keys`,
		method: 'GET',
	});
};

/**
 * Get identity key for a specific device
 */
export const getIdentityKeyForDevice = async (
	userId: string,
	deviceId: string
): Promise<GetIdentityKeyResponse> => {
	return customFetch({
		pathName: `users/${userId}/identity-key?deviceId=${encodeURIComponent(deviceId)}`,
		method: 'GET',
	});
};

/**
 * Get identity keys for all devices of a user
 */
export const getIdentityKeysForAllDevices = async (
	userId: string
): Promise<GetIdentityKeyResponse> => {
	return customFetch({
		pathName: `users/${userId}/identity-key`,
		method: 'GET',
	});
};

/**
 * Rotate device keys
 */
export const rotateDeviceKeys = async (
	userId: string,
	request: RotateKeysRequest
): Promise<RotateKeysResponse> => {
	return customFetch({
		pathName: `users/${userId}/rotate-keys`,
		method: 'POST',
		body: request,
	});
};

/**
 * Remove room key for a specific device
 */
export const removeDeviceRoomKey = async (
	roomId: string,
	userId: string,
	deviceId: string
): Promise<RemoveRoomKeyResponse> => {
	return customFetch({
		pathName: `rooms/${roomId}/members/${userId}/key?deviceId=${encodeURIComponent(deviceId)}`,
		method: 'DELETE',
	});
};

/**
 * Remove user room key (full member removal)
 */
export const removeUserRoomKey = async (
	roomId: string,
	userId: string
): Promise<RemoveRoomKeyResponse> => {
	return customFetch({
		pathName: `rooms/${roomId}/members/${userId}/key`,
		method: 'DELETE',
	});
};

/**
 * Store encrypted room message
 */
export const storeEncryptedRoomMessage = async (
	roomId: string,
	request: StoreEncryptedRoomMessageRequest
): Promise<StoreEncryptedRoomMessageResponse> => {
	return customFetch({
		pathName: `rooms/${roomId}/messages`,
		method: 'POST',
		body: request,
	});
};

/**
 * Get session with member public keys
 * This gets the room data which includes memberPublicKeys
 */
export const getSessionWithE2EE = async (): Promise<any> => {
	return customFetch({
		pathName: 'session',
		method: 'GET',
	});
};
