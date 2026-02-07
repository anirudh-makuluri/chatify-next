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

			await e2eeApi.registerDeviceIdentityKey({
				userId,
				deviceId,
				deviceName: deviceName || 'Web Device',
				identityPublicKey,
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

				await e2eeApi.registerDeviceGroupKey(groupId, {
					userId,
					deviceId,
					deviceName: deviceName || 'Web Device',
					groupPublicKey: groupKeyPair.publicKey,
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
