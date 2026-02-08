'use client'

/**
 * Device Manager for handling device information and keypairs
 * Stores device data locally in localStorage
 */

import { DeviceKeyPair, RoomKeyPair, E2EEDeviceState } from './e2ee-types';
import { generateBoxKeypair, generateDeviceId } from './crypto';

const DEVICE_STORAGE_KEY = 'e2ee_device_state';
const DEVICE_IDENTITY_KEY = 'e2ee_identity_keypair';
const DEVICE_ROOM_KEYS_KEY = 'e2ee_room_keypairs';

/**
 * Initialize device state
 * Creates a new device identity if one doesn't exist
 */
export const initializeDevice = (deviceName?: string): E2EEDeviceState => {
	try {
		// Check if device already exists
		const existing = getDeviceState();
		if (existing && existing.initialized && existing.deviceId) {
			return existing;
		}

		// Generate new device
		const deviceId = generateDeviceId('web');
		const identityKeypair = generateBoxKeypair();

		const deviceState: E2EEDeviceState = {
			initialized: true,
			deviceId,
			deviceName: deviceName || `Web Device`,
			identityKeyPair: {
				deviceId,
				publicKey: identityKeypair.publicKey,
				privateKey: identityKeypair.privateKey,
				deviceName: deviceName || `Web Device`,
			},
			roomKeyPairs: {},
		};

		saveDeviceState(deviceState);
		return deviceState;
	} catch (error) {
		console.error('Failed to initialize device:', error);
		throw new Error(`Device initialization failed: ${error}`);
	}
};

/**
 * Get current device state
 */
export const getDeviceState = (): E2EEDeviceState | null => {
	try {
		if (typeof window === 'undefined') return null; // SSR check

		const stored = localStorage.getItem(DEVICE_STORAGE_KEY);
		if (!stored) return null;

		return JSON.parse(stored) as E2EEDeviceState;
	} catch (error) {
		console.error('Failed to retrieve device state:', error);
		return null;
	}
};

/**
 * Get device ID
 */
export const getDeviceId = (): string | null => {
	const state = getDeviceState();
	return state?.deviceId || null;
};

/**
 * Get device name
 */
export const getDeviceName = (): string | null => {
	const state = getDeviceState();
	return state?.deviceName || null;
};

/**
 * Get identity key pair (public + private)
 */
export const getIdentityKeyPair = (): DeviceKeyPair | null => {
	const state = getDeviceState();
	return state?.identityKeyPair || null;
};

/**
 * Get identity public key
 */
export const getIdentityPublicKey = (): string | null => {
	const keypair = getIdentityKeyPair();
	return keypair?.publicKey || null;
};

/**
 * Get identity private key
 */
export const getIdentityPrivateKey = (): string | null => {
	const keypair = getIdentityKeyPair();
	return keypair?.privateKey || null;
};

/**
 * Get room key pair for a specific room
 */
export const getRoomKeyPair = (roomId: string): RoomKeyPair | null => {
	const state = getDeviceState();
	return state?.roomKeyPairs[roomId] || null;
};

/**
 * Get all room key pairs
 */
export const getAllRoomKeyPairs = (): { [roomId: string]: RoomKeyPair } => {
	const state = getDeviceState();
	return state?.roomKeyPairs || {};
};

/**
 * Get room public key
 */
export const getRoomPublicKey = (roomId: string): string | null => {
	const keypair = getRoomKeyPair(roomId);
	return keypair?.publicKey || null;
};

/**
 * Get room private key
 */
export const getRoomPrivateKey = (roomId: string): string | null => {
	const keypair = getRoomKeyPair(roomId);
	return keypair?.privateKey || null;
};

/**
 * Add or update room key pair
 */
export const setRoomKeyPair = (roomKeyPair: RoomKeyPair): void => {
	try {
		const state = getDeviceState();
		if (!state) {
			throw new Error('Device not initialized');
		}

		state.roomKeyPairs[roomKeyPair.roomId] = roomKeyPair;
		saveDeviceState(state);
	} catch (error) {
		console.error('Failed to set room key pair:', error);
		throw new Error(`Failed to save room key pair: ${error}`);
	}
};

/**
 * Remove room key pair
 */
export const removeRoomKeyPair = (roomId: string): void => {
	try {
		const state = getDeviceState();
		if (!state) {
			throw new Error('Device not initialized');
		}

		delete state.roomKeyPairs[roomId];
		saveDeviceState(state);
	} catch (error) {
		console.error('Failed to remove room key pair:', error);
		throw new Error(`Failed to remove room key pair: ${error}`);
	}
};

/**
 * Rotate identity key pair
 * Generates and stores a new identity keypair
 */
export const rotateIdentityKeyPair = (deviceName?: string): DeviceKeyPair => {
	try {
		const state = getDeviceState();
		if (!state || !state.deviceId) {
			throw new Error('Device not initialized');
		}

		const newKeypair = generateBoxKeypair();
		const newDeviceKeyPair: DeviceKeyPair = {
			deviceId: state.deviceId,
			publicKey: newKeypair.publicKey,
			privateKey: newKeypair.privateKey,
			deviceName: deviceName || state.deviceName || 'Web Device',
		};

		state.identityKeyPair = newDeviceKeyPair;
		state.deviceName = deviceName || state.deviceName;
		saveDeviceState(state);

		return newDeviceKeyPair;
	} catch (error) {
		console.error('Failed to rotate identity key pair:', error);
		throw new Error(`Failed to rotate identity keys: ${error}`);
	}
};

/**
 * Rotate room key pair for a specific room
 */
export const rotateRoomKeyPair = (roomId: string): RoomKeyPair => {
	try {
		const state = getDeviceState();
		if (!state || !state.deviceId) {
			throw new Error('Device not initialized');
		}

		const newKeypair = generateBoxKeypair();
		const newRoomKeyPair: RoomKeyPair = {
			roomId,
			publicKey: newKeypair.publicKey,
			privateKey: newKeypair.privateKey,
		};

		state.roomKeyPairs[roomId] = newRoomKeyPair;
		saveDeviceState(state);

		return newRoomKeyPair;
	} catch (error) {
		console.error('Failed to rotate room key pair:', error);
		throw new Error(`Failed to rotate room key pair: ${error}`);
	}
};

/**
 * Update device name
 */
export const updateDeviceName = (newName: string): void => {
	try {
		const state = getDeviceState();
		if (!state) {
			throw new Error('Device not initialized');
		}

		state.deviceName = newName;
		if (state.identityKeyPair) {
			state.identityKeyPair.deviceName = newName;
		}

		saveDeviceState(state);
	} catch (error) {
		console.error('Failed to update device name:', error);
		throw new Error(`Failed to update device name: ${error}`);
	}
};

/**
 * Clear all device data (use with caution!)
 */
export const clearDeviceData = (): void => {
	try {
		if (typeof window !== 'undefined') {
			localStorage.removeItem(DEVICE_STORAGE_KEY);
			localStorage.removeItem(DEVICE_IDENTITY_KEY);
			localStorage.removeItem(DEVICE_ROOM_KEYS_KEY);
		}
	} catch (error) {
		console.error('Failed to clear device data:', error);
		throw new Error(`Failed to clear device data: ${error}`);
	}
};

/**
 * Export device public keys (safe to share)
 */
export const exportPublicKeys = (): {
	identityPublicKey: string;
	roomPublicKeys: { [roomId: string]: string };
} => {
	const state = getDeviceState();
	if (!state || !state.identityKeyPair) {
		throw new Error('Device not initialized');
	}

	const roomPublicKeys: { [roomId: string]: string } = {};
	for (const [roomId, keypair] of Object.entries(state.roomKeyPairs)) {
		roomPublicKeys[roomId] = keypair.publicKey;
	}

	return {
		identityPublicKey: state.identityKeyPair.publicKey,
		roomPublicKeys,
	};
};

/**
 * Check if device is initialized
 */
export const isDeviceInitialized = (): boolean => {
	const state = getDeviceState();
	return !!(state && state.initialized && state.deviceId);
};

/**
 * Save device state to localStorage
 */
const saveDeviceState = (state: E2EEDeviceState): void => {
	try {
		if (typeof window !== 'undefined') {
			localStorage.setItem(DEVICE_STORAGE_KEY, JSON.stringify(state));
		}
	} catch (error) {
		console.error('Failed to save device state to localStorage:', error);
		throw new Error(`Storage error: ${error}`);
	}
};

/**
 * Get detailed device info for display
 */
export const getDeviceInfo = () => {
	const state = getDeviceState();
	if (!state) return null;

	return {
		deviceId: state.deviceId,
		deviceName: state.deviceName,
		initialized: state.initialized,
		identityKeyRegistered: !!state.identityKeyPair?.publicKey,
		roomsWithKeys: Object.keys(state.roomKeyPairs).length,
	};
};


