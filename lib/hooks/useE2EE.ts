/**
 * E2EE Hooks - Convenient hooks for E2EE operations in components
 */

import { useCallback, useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import {
	setDeviceState,
	setError,
	setInitializing,
	setGroupMemberPublicKeys,
	setGroupKeyPair,
	clearE2EEData,
	rotateIdentityKey,
	selectDeviceState,
	selectDeviceId,
	selectGroupMemberPublicKeys,
	selectE2EEError,
	selectIsInitializing,
	selectIdentityPublicKey,
	selectGroupPrivateKey,
} from '@/redux/e2eeSlice';
import { getDeviceState, initializeDevice } from '@/lib/device-manager';
import * as deviceManager from '@/lib/device-manager';
import * as crypto from '@/lib/crypto';
import * as e2eeApi from '@/lib/e2ee-api';
import { RecipientEncryptedMessages } from '@/lib/e2ee-types';

/**
 * Initialize E2EE on app startup
 * Call this once in your root component
 */
export const useE2EEInitialization = () => {
	const dispatch = useAppDispatch();
	const [initialized, setInitialized] = useState(false);

	useEffect(() => {
		const initE2EE = async () => {
			try {
				dispatch(setInitializing(true));

				// Initialize sodium
				await crypto.initiateSodium();

				// Initialize or load device
				const deviceState = deviceManager.isDeviceInitialized()
					? getDeviceState()
					: initializeDevice();

				if (deviceState) {
					dispatch(setDeviceState(deviceState));
					setInitialized(true);
				} else {
					throw new Error('Failed to initialize device');
				}
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : 'E2EE initialization failed';
				dispatch(setError(errorMsg));
				console.error('E2EE initialization error:', error);
			} finally {
				dispatch(setInitializing(false));
			}
		};

		initE2EE();
	}, [dispatch]);

	return initialized;
};

/**
 * Get current device state
 */
export const useDeviceState = () => {
	return useAppSelector(selectDeviceState);
};

/**
 * Get device ID
 */
export const useDeviceId = () => {
	return useAppSelector(selectDeviceId);
};

/**
 * Get identity public key
 */
export const useIdentityPublicKey = () => {
	return useAppSelector(selectIdentityPublicKey);
};

/**
 * Register device identity key with backend
 */
export const useRegisterDeviceIdentityKey = () => {
	const dispatch = useAppDispatch();
	const [loading, setLoading] = useState(false);
	const [error, setErrorMsg] = useState<string | null>(null);

	const register = useCallback(
		async (userId: string) => {
			try {
				setLoading(true);
				setErrorMsg(null);

				const deviceId = deviceManager.getDeviceId();
				const deviceName = deviceManager.getDeviceName();
				const publicKey = deviceManager.getIdentityPublicKey();

				if (!deviceId || !publicKey) {
					throw new Error('Device not initialized');
				}

				const response = await e2eeApi.registerDeviceIdentityKey({
					userId,
					deviceId,
					deviceName: deviceName || 'Web Device',
					identityPublicKey: publicKey,
				});

				if (!response.success) {
					throw new Error(response.message || 'Failed to register identity key');
				}

				dispatch(setError(null));
				return response;
			} catch (err) {
				const errorMsg = err instanceof Error ? err.message : 'Registration failed';
				setErrorMsg(errorMsg);
				dispatch(setError(errorMsg));
				throw err;
			} finally {
				setLoading(false);
			}
		},
		[dispatch]
	);

	return { register, loading, error };
};

/**
 * Register device group key
 */
export const useRegisterDeviceGroupKey = () => {
	const dispatch = useAppDispatch();
	const [loading, setLoading] = useState(false);
	const [error, setErrorMsg] = useState<string | null>(null);

	const register = useCallback(
		async (groupId: string, userId: string) => {
			try {
				setLoading(true);
				setErrorMsg(null);

				// Derive or generate group keypair if not exists
				let groupKeyPair = deviceManager.getGroupKeyPair(groupId);
				if (!groupKeyPair) {
					const keypair = crypto.generateBoxKeypair();
					groupKeyPair = {
						groupId,
						publicKey: keypair.publicKey,
						privateKey: keypair.privateKey,
					};
					deviceManager.setGroupKeyPair(groupKeyPair);
					dispatch(setGroupKeyPair(groupKeyPair));
				}

				const deviceId = deviceManager.getDeviceId();
				const deviceName = deviceManager.getDeviceName();

				if (!deviceId) {
					throw new Error('Device not initialized');
				}

				const response = await e2eeApi.registerDeviceGroupKey(groupId, {
					userId,
					deviceId,
					deviceName: deviceName || 'Web Device',
					groupPublicKey: groupKeyPair.publicKey,
				});

				if (!response.success) {
					throw new Error(response.message || 'Failed to register group key');
				}

				dispatch(setError(null));
				return response;
			} catch (err) {
				const errorMsg = err instanceof Error ? err.message : 'Registration failed';
				setErrorMsg(errorMsg);
				dispatch(setError(errorMsg));
				throw err;
			} finally {
				setLoading(false);
			}
		},
		[dispatch]
	);

	return { register, loading, error };
};

/**
 * Fetch and cache group member public keys
 */
export const useFetchGroupMemberPublicKeys = (groupId: string) => {
	const dispatch = useAppDispatch();
	const [loading, setLoading] = useState(false);
	const [error, setErrorMsg] = useState<string | null>(null);

	const memberPublicKeys = useAppSelector(selectGroupMemberPublicKeys(groupId));

	const fetch = useCallback(async () => {
		try {
			setLoading(true);
			setErrorMsg(null);

			const response = await e2eeApi.getGroupPublicKeys(groupId);


			if (!response.success) {
				throw new Error('Failed to fetch group keys');
			}

			dispatch(
				setGroupMemberPublicKeys({
					groupId,
					memberPublicKeys: response.members,
				})
			);

			dispatch(setError(null));
			return response.members;
		} catch (err) {
			const errorMsg = err instanceof Error ? err.message : 'Fetch failed';
			setErrorMsg(errorMsg);
			dispatch(setError(errorMsg));
			throw err;
		} finally {
			setLoading(false);
		}
	}, [groupId, dispatch]);

	return { memberPublicKeys, fetch, loading, error };
};

/**
 * Encrypt a message for group recipients
 */
export const useEncryptGroupMessage = (groupId: string) => {
	const [loading, setLoading] = useState(false);
	const [error, setErrorMsg] = useState<string | null>(null);
	const memberPublicKeys = useAppSelector(selectGroupMemberPublicKeys(groupId));

	const encrypt = useCallback(
		(message: string): RecipientEncryptedMessages | null => {
			try {
				setLoading(true);
				setErrorMsg(null);

				if (!memberPublicKeys || Object.keys(memberPublicKeys).length === 0) {
					throw new Error('Member public keys not available. Fetch them first.');
				}

				const encrypted: RecipientEncryptedMessages = {};

				// Encrypt for each recipient's devices
				for (const [userId, devices] of Object.entries(memberPublicKeys)) {
					encrypted[userId] = {};
					for (const [deviceId, publicKey] of Object.entries(devices as Record<string, string>)) {
						encrypted[userId][deviceId] = crypto.encryptMessageForRecipient(
							message,
							publicKey as string
						);
					}
				}

				setErrorMsg(null);
				return encrypted;
			} catch (err) {
				const errorMsg = err instanceof Error ? err.message : 'Encryption failed';
				setErrorMsg(errorMsg);
				throw err;
			} finally {
				setLoading(false);
			}
		},
		[memberPublicKeys]
	);

	return { encrypt, loading, error };
};

/**
 * Decrypt a message
 */
export const useDecryptMessage = () => {
	const [loading, setLoading] = useState(false);
	const [error, setErrorMsg] = useState<string | null>(null);

	const decrypt = useCallback(
		(
			ciphertext: string,
			iv: string,
			senderPublicKey: string,
			groupId?: string
		): string | null => {
			try {
				setLoading(true);
				setErrorMsg(null);

				const yourPrivateKey = groupId
					? deviceManager.getGroupPrivateKey(groupId)
					: deviceManager.getIdentityPrivateKey();

				if (!yourPrivateKey) {
					throw new Error('Private key not found');
				}

				const decrypted = crypto.decryptMessage(
					ciphertext,
					iv,
					senderPublicKey,
					yourPrivateKey
				);

				setErrorMsg(null);
				return decrypted;
			} catch (err) {
				const errorMsg = err instanceof Error ? err.message : 'Decryption failed';
				setErrorMsg(errorMsg);
				throw err;
			} finally {
				setLoading(false);
			}
		},
		[]
	);

	return { decrypt, loading, error };
};

/**
 * Send encrypted group message
 */
export const useSendEncryptedGroupMessage = (groupId: string) => {
	const dispatch = useAppDispatch();
	const [loading, setLoading] = useState(false);
	const [error, setErrorMsg] = useState<string | null>(null);

	const send = useCallback(
		async (
			message: string,
			encryptedFor: RecipientEncryptedMessages,
			userId: string
		) => {
			try {
				setLoading(true);
				setErrorMsg(null);

				const response = await e2eeApi.storeEncryptedGroupMessage(groupId, {
					senderId: userId,
					recipients: encryptedFor,
					senderKeys: undefined, // Phase 2 optimization
				});

				if (!response.success) {
					throw new Error('Failed to send message');
				}

				dispatch(setError(null));
				return response;
			} catch (err) {
				const errorMsg = err instanceof Error ? err.message : 'Send failed';
				setErrorMsg(errorMsg);
				dispatch(setError(errorMsg));
				throw err;
			} finally {
				setLoading(false);
			}
		},
		[groupId, dispatch]
	);

	return { send, loading, error };
};

/**
 * Rotate device identity keys
 */
export const useRotateIdentityKeys = () => {
	const dispatch = useAppDispatch();
	const [loading, setLoading] = useState(false);
	const [error, setErrorMsg] = useState<string | null>(null);

	const rotate = useCallback(
		async (userId: string) => {
			try {
				setLoading(true);
				setErrorMsg(null);

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

				const response = await e2eeApi.rotateDeviceKeys(userId, {
					deviceId,
					deviceName: deviceManager.getDeviceName() || 'Web Device',
					newIdentityPublicKey: newKeypair.publicKey,
					groupKeys: groupKeysMap,
				});

				if (!response.success) {
					throw new Error(response.message || 'Failed to rotate keys');
				}

				dispatch(rotateIdentityKey(newKeypair));
				dispatch(setError(null));
				return response;
			} catch (err) {
				const errorMsg = err instanceof Error ? err.message : 'Rotation failed';
				setErrorMsg(errorMsg);
				dispatch(setError(errorMsg));
				throw err;
			} finally {
				setLoading(false);
			}
		},
		[dispatch]
	);

	return { rotate, loading, error };
};

/**
 * Get E2EE error state
 */
export const useE2EEError = () => {
	return useAppSelector(selectE2EEError);
};

/**
 * Get E2EE initialization status
 */
export const useE2EEInitializing = () => {
	return useAppSelector(selectIsInitializing);
};

/**
 * Clear all E2EE data (logout)
 */
export const useClearE2EEData = () => {
	const dispatch = useAppDispatch();

	const clear = useCallback(() => {
		deviceManager.clearDeviceData();
		dispatch(clearE2EEData());
	}, [dispatch]);

	return { clear };
};

/**
 * Get encrypted message ready for sending
 * Combines encryption and preparation for API
 */
export const usePrepareEncryptedMessage = (groupId: string, userId: string) => {
	const { encrypt, loading, error } = useEncryptGroupMessage(groupId);
	const { send } = useSendEncryptedGroupMessage(groupId);

	const prepare = useCallback(
		async (message: string) => {
			try {
				const encrypted = encrypt(message);
				if (!encrypted) {
					throw new Error('Failed to encrypt message');
				}

				const response = await send(message, encrypted, userId);
				return { encrypted, response };
			} catch (err) {
				throw err;
			}
		},
		[encrypt, send, userId]
	);

	return { prepare, loading, error };
};
