'use client'

/**
 * Device Manager for handling device information and keypairs
 * Stores device data locally in localStorage
 */

import { DeviceKeyPair, GroupKeyPair, E2EEDeviceState } from './e2ee-types';
import { generateBoxKeypair, generateDeviceId } from './crypto';

const DEVICE_STORAGE_KEY = 'e2ee_device_state';
const DEVICE_IDENTITY_KEY = 'e2ee_identity_keypair';
const DEVICE_GROUP_KEYS_KEY = 'e2ee_group_keypairs';

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
			groupKeyPairs: {},
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
 * Get group key pair for a specific group
 */
export const getGroupKeyPair = (groupId: string): GroupKeyPair | null => {
	const state = getDeviceState();
	return state?.groupKeyPairs[groupId] || null;
};

/**
 * Get all group key pairs
 */
export const getAllGroupKeyPairs = (): { [groupId: string]: GroupKeyPair } => {
	const state = getDeviceState();
	return state?.groupKeyPairs || {};
};

/**
 * Get group public key
 */
export const getGroupPublicKey = (groupId: string): string | null => {
	const keypair = getGroupKeyPair(groupId);
	return keypair?.publicKey || null;
};

/**
 * Get group private key
 */
export const getGroupPrivateKey = (groupId: string): string | null => {
	const keypair = getGroupKeyPair(groupId);
	return keypair?.privateKey || null;
};

/**
 * Add or update group key pair
 */
export const setGroupKeyPair = (groupKeyPair: GroupKeyPair): void => {
	try {
		const state = getDeviceState();
		if (!state) {
			throw new Error('Device not initialized');
		}

		state.groupKeyPairs[groupKeyPair.groupId] = groupKeyPair;
		saveDeviceState(state);
	} catch (error) {
		console.error('Failed to set group key pair:', error);
		throw new Error(`Failed to save group key pair: ${error}`);
	}
};

/**
 * Remove group key pair
 */
export const removeGroupKeyPair = (groupId: string): void => {
	try {
		const state = getDeviceState();
		if (!state) {
			throw new Error('Device not initialized');
		}

		delete state.groupKeyPairs[groupId];
		saveDeviceState(state);
	} catch (error) {
		console.error('Failed to remove group key pair:', error);
		throw new Error(`Failed to remove group key pair: ${error}`);
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
 * Rotate group key pair for a specific group
 */
export const rotateGroupKeyPair = (groupId: string): GroupKeyPair => {
	try {
		const state = getDeviceState();
		if (!state || !state.deviceId) {
			throw new Error('Device not initialized');
		}

		const newKeypair = generateBoxKeypair();
		const newGroupKeyPair: GroupKeyPair = {
			groupId,
			publicKey: newKeypair.publicKey,
			privateKey: newKeypair.privateKey,
		};

		state.groupKeyPairs[groupId] = newGroupKeyPair;
		saveDeviceState(state);

		return newGroupKeyPair;
	} catch (error) {
		console.error('Failed to rotate group key pair:', error);
		throw new Error(`Failed to rotate group key pair: ${error}`);
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
			localStorage.removeItem(DEVICE_GROUP_KEYS_KEY);
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
	groupPublicKeys: { [groupId: string]: string };
} => {
	const state = getDeviceState();
	if (!state || !state.identityKeyPair) {
		throw new Error('Device not initialized');
	}

	const groupPublicKeys: { [groupId: string]: string } = {};
	for (const [groupId, keypair] of Object.entries(state.groupKeyPairs)) {
		groupPublicKeys[groupId] = keypair.publicKey;
	}

	return {
		identityPublicKey: state.identityKeyPair.publicKey,
		groupPublicKeys,
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
		groupsWithKeys: Object.keys(state.groupKeyPairs).length,
	};
};


