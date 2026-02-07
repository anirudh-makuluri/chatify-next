/**
 * E2EE API Client
 * Handles all E2EE-related API calls
 */

import { customFetch } from './utils';
import {
	RegisterDeviceIdentityKeyRequest,
	RegisterDeviceIdentityKeyResponse,
	RegisterDeviceGroupKeyRequest,
	RegisterDeviceGroupKeyResponse,
	GetGroupPublicKeysResponse,
	GetIdentityKeyResponse,
	RotateKeysRequest,
	RotateKeysResponse,
	RemoveGroupKeyResponse,
	StoreEncryptedGroupMessageRequest,
	StoreEncryptedGroupMessageResponse,
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
 * Register device group key with the server
 */
export const registerDeviceGroupKey = async (
	groupId: string,
	request: RegisterDeviceGroupKeyRequest
): Promise<RegisterDeviceGroupKeyResponse> => {
	return customFetch({
		pathName: `groups/${groupId}/members/add-key`,
		method: 'POST',
		body: request,
	});
};

/**
 * Get all group public keys (all members + devices)
 */
export const getGroupPublicKeys = async (
	groupId: string
): Promise<GetGroupPublicKeysResponse> => {
	return customFetch({
		pathName: `groups/${groupId}/members/public-keys`,
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
 * Remove group key for a specific device
 */
export const removeDeviceGroupKey = async (
	groupId: string,
	userId: string,
	deviceId: string
): Promise<RemoveGroupKeyResponse> => {
	return customFetch({
		pathName: `groups/${groupId}/members/${userId}/key?deviceId=${encodeURIComponent(deviceId)}`,
		method: 'DELETE',
	});
};

/**
 * Remove user group key (full member removal)
 */
export const removeUserGroupKey = async (
	groupId: string,
	userId: string
): Promise<RemoveGroupKeyResponse> => {
	return customFetch({
		pathName: `groups/${groupId}/members/${userId}/key`,
		method: 'DELETE',
	});
};

/**
 * Store encrypted group message
 */
export const storeEncryptedGroupMessage = async (
	groupId: string,
	request: StoreEncryptedGroupMessageRequest
): Promise<StoreEncryptedGroupMessageResponse> => {
	return customFetch({
		pathName: `groups/${groupId}/messages`,
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
