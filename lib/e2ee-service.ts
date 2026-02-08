'use client'

/**
 * E2EE Service - High-level E2EE operations
 * This service provides a clean API for common E2EE operations
 */

import * as crypto from './crypto';
import * as deviceManager from './device-manager';
import * as e2eeApi from './e2ee-api';
import { RecipientEncryptedMessages, EncryptedGroupMessage } from './e2ee-types';

/**
 * E2EE Service - Main interface for E2EE operations
 */
export class E2EEService {
	private static instance: E2EEService;

	private constructor() {}

	static getInstance(): E2EEService {
		if (!E2EEService.instance) {
			E2EEService.instance = new E2EEService();
		}
		return E2EEService.instance;
	}

	/**
	 * Initialize E2EE (call once per app startup)
	 */
	async initialize(): Promise<void> {
		await crypto.initiateSodium();
		const isInitialized = deviceManager.isDeviceInitialized();
		if (!isInitialized) {
			deviceManager.initializeDevice();
		}
	}

	/**
	 * Complete setup flow: register keys on backend
	 */
	async setupDeviceKeys(userId: string, groupIds: string[]): Promise<void> {
		try {
			// 1. Register identity key
			const deviceId = deviceManager.getDeviceId();
			const deviceName = deviceManager.getDeviceName();
			const identityPublicKey = deviceManager.getIdentityPublicKey();

			if (!deviceId || !identityPublicKey) {
				throw new Error('Device not properly initialized');
			}

			const normalizedIdentityPublicKey = crypto.normalizeBase64Key(identityPublicKey);

			// Debug logging for base64 validation
			const isValidKey = crypto.isValidBase64Key(normalizedIdentityPublicKey);
			console.log('Device keys debug info:', {
				userId,
				deviceId,
				identityPublicKey: normalizedIdentityPublicKey.substring(0, 30) + '...',
				keyType: typeof identityPublicKey,
				keyLength: normalizedIdentityPublicKey?.length,
				isValidBase64Key: isValidKey,
				keyIsBase64Pattern: /^[A-Za-z0-9+/=]+$/.test(normalizedIdentityPublicKey || ''),
				trimmedLength: normalizedIdentityPublicKey?.trim().length,
				hasWhitespace: normalizedIdentityPublicKey !== normalizedIdentityPublicKey?.trim()
			});

			if (!isValidKey) {
				throw new Error(`Invalid base64 identityPublicKey: ${normalizedIdentityPublicKey.substring(0, 50)}...`);
			}

			console.log('Registering device keys with backend...', {
				userId,
				deviceId,
				identityPublicKey: normalizedIdentityPublicKey.substring(0, 30) + '...'
			});

			await e2eeApi.registerDeviceIdentityKey({
				userId,
				deviceId,
				deviceName: deviceName || 'Web Device',
				identityPublicKey: normalizedIdentityPublicKey,
			});

			// 2. Register group keys for each group
			for (const groupId of groupIds) {
				let groupKeyPair = deviceManager.getGroupKeyPair(groupId);
				if (!groupKeyPair) {
					const keypair = crypto.generateBoxKeypair();
					groupKeyPair = {
						groupId,
						publicKey: keypair.publicKey,
						privateKey: keypair.privateKey,
					};
					deviceManager.setGroupKeyPair(groupKeyPair);
				}

				// Validate group public key before sending
				const normalizedGroupPublicKey = crypto.normalizeBase64Key(groupKeyPair.publicKey);
				const isValidGroupKey = crypto.isValidBase64Key(normalizedGroupPublicKey);
				if (!isValidGroupKey) {
					throw new Error(`Invalid base64 group public key for group ${groupId}: ${normalizedGroupPublicKey.substring(0, 50)}...`);
				}

				await e2eeApi.registerDeviceGroupKey(groupId, {
					userId,
					deviceId,
					deviceName: deviceName || 'Web Device',
					groupPublicKey: normalizedGroupPublicKey,
				});
			}
		} catch (error) {
			console.error('Device key setup failed:', error);
			throw error;
		}
	}

	/**
	 * Encrypt a message for group members
	 */
	async encryptMessageForGroup(
		groupId: string,
		message: string,
		memberPublicKeys: { [userId: string]: { [deviceId: string]: string } }
	): Promise<RecipientEncryptedMessages> {
		try {
			const encrypted: RecipientEncryptedMessages = {};

			for (const [userId, devices] of Object.entries(memberPublicKeys)) {
				encrypted[userId] = {};
				for (const [deviceId, publicKey] of Object.entries(devices)) {
					encrypted[userId][deviceId] = crypto.encryptMessageForRecipient(
						message,
						publicKey
					);
				}
			}

			return encrypted;
		} catch (error) {
			console.error('Message encryption failed:', error);
			throw error;
		}
	}

	/**
	 * Decrypt a message received from a group
	 */
	async decryptGroupMessage(
		ciphertext: string,
		iv: string,
		senderPublicKey: string,
		groupId?: string
	): Promise<string> {
		try {
			const yourPrivateKey = groupId
				? deviceManager.getGroupPrivateKey(groupId)
				: deviceManager.getIdentityPrivateKey();

			if (!yourPrivateKey) {
				throw new Error('Private key not found for decryption');
			}

			return crypto.decryptMessage(ciphertext, iv, senderPublicKey, yourPrivateKey);
		} catch (error) {
			console.error('Message decryption failed:', error);
			throw error;
		}
	}

	/**
	 * Send encrypted message to group
	 */
	async sendEncryptedMessage(
		groupId: string,
		userId: string,
		message: string,
		recipientPublicKeys: { [userId: string]: { [deviceId: string]: string } }
	): Promise<string> {
		try {
			// 1. Encrypt message
			const encrypted = await this.encryptMessageForGroup(
				groupId,
				message,
				recipientPublicKeys
			);

			// 2. Send encrypted message
			const response = await e2eeApi.storeEncryptedGroupMessage(groupId, {
				senderId: userId,
				recipients: encrypted,
				senderKeys: undefined,
			});

			if (!response.success) {
				throw new Error('Failed to store encrypted message');
			}

			return response.messageId;
		} catch (error) {
			console.error('Failed to send encrypted message:', error);
			throw error;
		}
	}

	/**
	 * Rotate device identity keys
	 */
	async rotateIdentityKeys(userId: string): Promise<void> {
		try {
			const newKeypair = deviceManager.rotateIdentityKeyPair();
			const deviceId = deviceManager.getDeviceId();
			const groupKeys = deviceManager.getAllGroupKeyPairs();

			if (!deviceId) {
				throw new Error('Device not initialized');
			}

			const groupKeysMap: { [groupId: string]: string } = {};
			for (const [groupId, keypair] of Object.entries(groupKeys)) {
				groupKeysMap[groupId] = keypair.publicKey;
			}

			await e2eeApi.rotateDeviceKeys(userId, {
				deviceId,
				deviceName: deviceManager.getDeviceName() || 'Web Device',
				newIdentityPublicKey: newKeypair.publicKey,
				groupKeys: groupKeysMap,
			});
		} catch (error) {
			console.error('Key rotation failed:', error);
			throw error;
		}
	}

	/**
	 * Get member public keys for a group
	 */
	async getMemberPublicKeys(
		groupId: string
	): Promise<{ [userId: string]: { [deviceId: string]: string } }> {
		try {
			const response = await e2eeApi.getGroupPublicKeys(groupId);
			if (!response.success) {
				throw new Error('Failed to fetch member public keys');
			}
			return response.members;
		} catch (error) {
			console.error('Failed to get member public keys:', error);
			throw error;
		}
	}

	/**
	 * Remove yourself from a group (remove your keys)
	 */
	async removeFromGroup(groupId: string, userId: string): Promise<void> {
		try {
			const deviceId = deviceManager.getDeviceId();
			if (!deviceId) {
				throw new Error('Device not initialized');
			}

			// Remove device key first
			await e2eeApi.removeDeviceGroupKey(groupId, userId, deviceId);

			// Remove from local storage
			deviceManager.removeGroupKeyPair(groupId);
		} catch (error) {
			console.error('Failed to remove from group:', error);
			throw error;
		}
	}

	/**
	 * Get device info
	 */
	getDeviceInfo() {
		return {
			deviceId: deviceManager.getDeviceId(),
			deviceName: deviceManager.getDeviceName(),
			initialized: deviceManager.isDeviceInitialized(),
		};
	}

	/**
	 * Export public keys (safe to share)
	 */
	getPublicKeys() {
		return deviceManager.exportPublicKeys();
	}

	/**
	 * Clear all E2EE data (use on logout)
	 */
	clearAllData(): void {
		deviceManager.clearDeviceData();
	}
}

/**
 * Get singleton instance
 */
export const getE2EEService = (): E2EEService => {
	return E2EEService.getInstance();
};
/**
 * Diagnostic function - can be called from browser console for debugging
 * Returns detailed information about E2EE state and key validation
 */
export const diagnoseE2EEState = async () => {
	try {
		const result: any = {
			timestamp: new Date().toISOString(),
			steps: []
		};

		// Step 1: Check if sodium is ready
		const sodiumReady = crypto.isSodiumReady();
		result.steps.push({
			step: 'Check Sodium',
			success: sodiumReady,
			sodiumReady
		});

		if (!sodiumReady) {
			await crypto.initiateSodium();
			result.steps.push({
				step: 'Initialize Sodium',
				success: true,
				message: 'Sodium initialized'
			});
		}

		// Step 2: Check device state
		const deviceState = deviceManager.getDeviceState();
		result.steps.push({
			step: 'Get Device State',
			success: !!deviceState,
			deviceState: deviceState ? {
				initialized: deviceState.initialized,
				deviceId: deviceState.deviceId,
				hasIdentityKeypair: !!deviceState.identityKeyPair,
				groupKeyCount: Object.keys(deviceState.groupKeyPairs || {}).length
			} : null
		});

		// Step 3: Get identity public key
		const identityPublicKey = deviceManager.getIdentityPublicKey();
		const identityKeyValid = identityPublicKey ? crypto.isValidBase64Key(identityPublicKey) : false;
		
		// Detailed inspection if key exists
		let keyInspection = null;
		if (identityPublicKey) {
			keyInspection = crypto.inspectBase64Key(identityPublicKey);
		}
		
		result.steps.push({
			step: 'Get Identity Public Key',
			success: !!identityPublicKey,
			identityPublicKey: identityPublicKey ? identityPublicKey.substring(0, 40) + '...' : 'NULL',
			keyLength: identityPublicKey?.length || 0,
			isValidBase64: identityKeyValid,
			keyInspection: keyInspection
		});

		// Step 4: Try generating a test keypair
		try {
			const testKeypair = crypto.generateBoxKeypair();
			const testPubKeyValid = crypto.isValidBase64Key(testKeypair.publicKey);
			const testPrivKeyValid = crypto.isValidBase64Key(testKeypair.privateKey);

			result.steps.push({
				step: 'Generate Test Keypair',
				success: true,
				publicKeyLength: testKeypair.publicKey.length,
				publicKeyValid: testPubKeyValid,
				publicKeyPreview: testKeypair.publicKey.substring(0, 40) + '...',
				privateKeyLength: testKeypair.privateKey.length,
				privateKeyValid: testPrivKeyValid,
				publicKeyCharacters: {
					hasLetters: /[A-Za-z]/.test(testKeypair.publicKey),
					hasNumbers: /[0-9]/.test(testKeypair.publicKey),
					hasSpecial: /[+/=]/.test(testKeypair.publicKey),
					onlyBase64: /^[A-Za-z0-9+/=]+$/.test(testKeypair.publicKey)
				}
			});
		} catch (keyError) {
			result.steps.push({
				step: 'Generate Test Keypair',
				success: false,
				error: String(keyError)
			});
		}

		// Step 5: localStorage check
		try {
			const stored = localStorage.getItem('e2ee_device_state');
			result.steps.push({
				step: 'localStorage Check',
				success: !!stored,
				deviceStoreSize: stored?.length || 0,
				hasDeviceState: !!stored
			});
		} catch (storageError) {
			result.steps.push({
				step: 'localStorage Check',
				success: false,
				error: String(storageError)
			});
		}

		result.summary = {
			sodiumWorking: sodiumReady,
			deviceInitialized: !!deviceState?.initialized,
			identityKeyValid,
			readyForRegistration: !!identityPublicKey && identityKeyValid
		};

		console.log('=== E2EE Diagnostics ===', result);
		return result;
	} catch (error) {
		console.error('Diagnostic failed:', error);
		const result = { error: String(error), timestamp: new Date().toISOString() };
		console.log('=== E2EE Diagnostics (Failed) ===', result);
		return result;
	}
};

// Make diagnostic function available globally for browser console debugging
if (typeof window !== 'undefined') {
	(window as any).__e2eeDiagnostics = diagnoseE2EEState;
	console.log('E2EE diagnostics available: call window.__e2eeDiagnostics()');
}