'use client'

/**
 * E2EE Hooks - Convenient hooks for E2EE operations in components
 */

import { useCallback, useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import {
	setDeviceState,
	setError,
	setInitializing,
	setRoomMemberPublicKeys,
	setRoomKeyPair,
	clearE2EEData,
	rotateIdentityKey,
	selectDeviceState,
	selectDeviceId,
	selectRoomMemberPublicKeys,
	selectE2EEError,
	selectIsInitializing,
	selectIdentityPublicKey,
	selectRoomPrivateKey,
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
		async (roomId: string, userId: string) => {
			try {
				setLoading(true);
				setErrorMsg(null);

				// Derive or generate room keypair if not exists
				let roomKeyPair = deviceManager.getRoomKeyPair(roomId);
				if (!roomKeyPair) {
					const keypair = crypto.generateBoxKeypair();
					roomKeyPair = {
						roomId,
						publicKey: keypair.publicKey,
						privateKey: keypair.privateKey,
					};
					deviceManager.setRoomKeyPair(roomKeyPair);
					dispatch(setRoomKeyPair(roomKeyPair));
				}

				const deviceId = deviceManager.getDeviceId();
				const deviceName = deviceManager.getDeviceName();

				if (!deviceId) {
					throw new Error('Device not initialized');
				}

				const response = await e2eeApi.registerDeviceRoomKey(roomId, {
					userId,
					deviceId,
					deviceName: deviceName || 'Web Device',
					roomPublicKey: roomKeyPair.publicKey,
				});

				if (!response.success) {
					throw new Error(response.message || 'Failed to register room key');
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
 * Fetch and cache room member public keys
 */
export const useFetchRoomMemberPublicKeys = (roomId: string) => {
	const dispatch = useAppDispatch();
	const [loading, setLoading] = useState(false);
	const [error, setErrorMsg] = useState<string | null>(null);

	const memberPublicKeys = useAppSelector(selectRoomMemberPublicKeys(roomId));

	const fetch = useCallback(async () => {
		try {
			setLoading(true);
			setErrorMsg(null);

			const response = await e2eeApi.getRoomPublicKeys(roomId);


			if (!response.success) {
				throw new Error('Failed to fetch room keys');
			}

			dispatch(
				setRoomMemberPublicKeys({
					roomId,
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
	}, [roomId, dispatch]);

	return { memberPublicKeys, fetch, loading, error };
};

/**
 * Encrypt a message for room recipients
 */
export const useEncryptRoomMessage = (roomId: string) => {
	const [loading, setLoading] = useState(false);
	const [error, setErrorMsg] = useState<string | null>(null);
	const memberPublicKeys = useAppSelector(selectRoomMemberPublicKeys(roomId));

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
			roomId?: string
		): string | null => {
			try {
				setLoading(true);
				setErrorMsg(null);

				const yourPrivateKey = roomId
					? deviceManager.getRoomPrivateKey(roomId)
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
 * Send encrypted room message
 */
export const useSendEncryptedRoomMessage = (roomId: string) => {
	const dispatch = useAppDispatch();
	const [loading, setLoading] = useState(false);
	const [error, setErrorMsg] = useState<string | null>(null);

	const send = useCallback(
		async (
			encryptedFor: RecipientEncryptedMessages,
			userId: string
		) => {
			try {
				setLoading(true);
				setErrorMsg(null);

				const response = await e2eeApi.storeEncryptedRoomMessage(roomId, {
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
		[roomId, dispatch]
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
				const roomKeys = deviceManager.getAllRoomKeyPairs();

				if (!deviceId) {
					throw new Error('Device not initialized');
				}

				const roomKeysMap: { [roomId: string]: string } = {};
				for (const [roomId, keypair] of Object.entries(roomKeys)) {
					roomKeysMap[roomId] = keypair.publicKey;
				}

				const response = await e2eeApi.rotateDeviceKeys(userId, {
					deviceId,
					deviceName: deviceManager.getDeviceName() || 'Web Device',
					newIdentityPublicKey: newKeypair.publicKey,
					roomKeys: roomKeysMap,
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
export const usePrepareEncryptedMessage = (roomId: string, userId: string) => {
	const { encrypt, loading, error } = useEncryptRoomMessage(roomId);
	const { send } = useSendEncryptedRoomMessage(roomId);

	const prepare = useCallback(
		async (message: string) => {
			try {
				const encrypted = encrypt(message);
				if (!encrypted) {
					throw new Error('Failed to encrypt message');
				}

				const response = await send(encrypted, userId);
				return { encrypted, response };
			} catch (err) {
				throw err;
			}
		},
		[encrypt, send, userId]
	);

	return { prepare, loading, error };
};
