'use client'

// @ts-ignore - libsodium.js doesn't have official type declarations
import sodium from 'libsodium-wrappers-sumo';
import { EncryptedData, SodiumBoxKeypair } from './e2ee-types';

// Initialize sodium (call once at app startup)
let sodiumReady = false;

// Defer variant initialization until runtime to avoid server-side import issues
const getBase64Variants = () => {
	try {
		return {
			ORIGINAL: sodium.base64_variants.ORIGINAL,
			URLSAFE: sodium.base64_variants.URLSAFE,
		};
	} catch (_error) {
		// Return falsy defaults if sodium not available (e.g., on server)
		return { ORIGINAL: null, URLSAFE: null };
	}
};

const toBase64 = (data: Uint8Array): string => {
	const variants = getBase64Variants();
	return variants.ORIGINAL ? sodium.to_base64(data, variants.ORIGINAL) : sodium.to_base64(data);
};

const fromBase64 = (value: string): Uint8Array => {
	const variants = getBase64Variants();
	try {
		return variants.ORIGINAL ? sodium.from_base64(value, variants.ORIGINAL) : sodium.from_base64(value);
	} catch (_error) {
		return variants.URLSAFE ? sodium.from_base64(value, variants.URLSAFE) : sodium.from_base64(value);
	}
};

export const normalizeBase64Key = (value: string): string => {
	return toBase64(fromBase64(value));
};

export const initiateSodium = async (): Promise<void> => {
	if (!sodiumReady) {
		await sodium.ready;
		sodiumReady = true;
	}
};

/**
 * Generate a box keypair (public + private key) for identity or group keys
 * Returns { publicKey, privateKey } in base64 format
 */
export const generateBoxKeypair = (): {
	publicKey: string;
	privateKey: string;
} => {
	if (!sodiumReady) {
		throw new Error('Sodium not initialized. Call initiateSodium() first.');
	}

	const keypair = sodium.crypto_box_keypair();

	const publicKeyBase64 = toBase64(keypair.publicKey);
	const privateKeyBase64 = toBase64(keypair.privateKey);

	// Validate that keys are properly encoded
	if (!publicKeyBase64 || typeof publicKeyBase64 !== 'string') {
		throw new Error(`Invalid public key encoding: ${typeof publicKeyBase64}`);
	}
	if (!privateKeyBase64 || typeof privateKeyBase64 !== 'string') {
		throw new Error(`Invalid private key encoding: ${typeof privateKeyBase64}`);
	}

	console.log('Generated keypair:', {
		publicKeyType: typeof publicKeyBase64,
		publicKeyLength: publicKeyBase64.length,
		publicKeyPreview: publicKeyBase64.substring(0, 20) + '...',
		privateKeyType: typeof privateKeyBase64,
		privateKeyLength: privateKeyBase64.length,
	});

	return {
		publicKey: publicKeyBase64,
		privateKey: privateKeyBase64,
	};
};

/**
 * Encrypt a message for a recipient using their public key
 * Uses the combined public key approach
 *
 * @param message - The message to encrypt
 * @param recipientPublicKeyBase64 - Recipient's public key in base64
 * @returns Object with ciphertext and iv in base64
 */
export const encryptMessageForRecipient = (
	message: string,
	recipientPublicKeyBase64: string
): EncryptedData => {
	if (!sodiumReady) {
		throw new Error('Sodium not initialized. Call initiateSodium() first.');
	}

	try {
		const recipientPublicKey = fromBase64(recipientPublicKeyBase64);
		const messageBytes = sodium.from_string(message);

		// Anonymous public key encryption (no sender key required)
		const ciphertext = sodium.crypto_box_seal(
			messageBytes,
			recipientPublicKey
		);

		return {
			ciphertext: toBase64(ciphertext),
			iv: '',
		};
	} catch (error) {
		console.error('Encryption failed:', error);
		throw new Error(`Failed to encrypt message: ${error}`);
	}
};

/**
 * Encrypt a message for multiple recipients
 * Returns a map of encrypted messages per recipient
 *
 * @param message - The message to encrypt
 * @param recipientPublicKeys - Map of userId/deviceId to public key (base64)
 * @returns Object with encrypted data per recipient
 */
export const encryptMessageForMultipleRecipients = (
	message: string,
	recipientPublicKeys: { [key: string]: string }
): { [key: string]: EncryptedData } => {
	if (!sodiumReady) {
		throw new Error('Sodium not initialized. Call initiateSodium() first.');
	}

	const encrypted: { [key: string]: EncryptedData } = {};

	for (const [recipientKey, publicKeyBase64] of Object.entries(
		recipientPublicKeys
	)) {
		encrypted[recipientKey] = encryptMessageForRecipient(
			message,
			publicKeyBase64
		);
	}

	return encrypted;
};

/**
 * Decrypt a message using your private key
 *
 * @param ciphertext - The encrypted message (base64)
 * @param iv - The nonce used for encryption (base64)
 * @param senderPublicKeyBase64 - Sender's public key (base64)
 * @param yourPrivateKeyBase64 - Your private key (base64)
 * @returns The decrypted message
 */
export const decryptMessage = (
	ciphertext: string,
	iv: string,
	senderPublicKeyBase64: string,
	yourPrivateKeyBase64: string
): string => {
	if (!sodiumReady) {
		throw new Error('Sodium not initialized. Call initiateSodium() first.');
	}

	try {
		const ciphertextBytes = fromBase64(ciphertext);
		const yourPrivateKey = fromBase64(yourPrivateKeyBase64);
		let decrypted: Uint8Array;

		if (iv) {
			const nonce = fromBase64(iv);
			const senderPublicKey = fromBase64(senderPublicKeyBase64);

			// Decrypt using sender's public key and your private key
			decrypted = sodium.crypto_box_open_easy(
				ciphertextBytes,
				nonce,
				senderPublicKey,
				yourPrivateKey
			);
		} else {
			const yourPublicKey = sodium.crypto_scalarmult_base(yourPrivateKey);

			// Decrypt anonymous sealed box using recipient keypair
			decrypted = sodium.crypto_box_seal_open(
				ciphertextBytes,
				yourPublicKey,
				yourPrivateKey
			);
		}

		return sodium.to_string(decrypted);
	} catch (error) {
		console.error('Decryption failed:', error);
		throw new Error(`Failed to decrypt message: ${error}`);
	}
};

/**
 * Generate a random IV (nonce) for encryption
 * Should be unique for each message encrypted with the same keys
 *
 * @returns Random IV in base64
 */
export const generateRandomNonce = (): string => {
	if (!sodiumReady) {
		throw new Error('Sodium not initialized. Call initiateSodium() first.');
	}

	const nonce = sodium.randombytes_buf(sodium.crypto_box_NONCEBYTES);
	return toBase64(nonce);
};

/**
 * Convert base64 string to Uint8Array
 */
export const base64ToUint8Array = (base64: string): Uint8Array => {
	return fromBase64(base64);
};

/**
 * Convert Uint8Array to base64 string
 */
export const uint8ArrayToBase64 = (data: Uint8Array): string => {
	return toBase64(data);
};

/**
 * Convert string to Uint8Array
 */
export const stringToUint8Array = (str: string): Uint8Array => {
	return sodium.from_string(str);
};

/**
 * Convert Uint8Array to string
 */
export const uint8ArrayToString = (data: Uint8Array): string => {
	return sodium.to_string(data);
};

/**
 * Hash a string using BLAKE2b
 * Useful for deriving deterministic values
 */
export const hashString = (input: string): string => {
	if (!sodiumReady) {
		throw new Error('Sodium not initialized. Call initiateSodium() first.');
	}

	const hash = sodium.crypto_generichash(
		64,
		sodium.from_string(input),
		null
	);
	return toBase64(hash);
};

/**
 * Derive a key from a password using Argon2
 * Useful for deriving group keys from a group secret
 */
export const deriveKeyFromPassword = (
	password: string,
	salt?: Uint8Array
): { key: string; salt: string } => {
	if (!sodiumReady) {
		throw new Error('Sodium not initialized. Call initiateSodium() first.');
	}

	const saltBytes = salt || sodium.randombytes_buf(sodium.crypto_pwhash_SALTBYTES);

	const key = sodium.crypto_pwhash(
		32, // key length
		sodium.from_string(password),
		saltBytes,
		sodium.crypto_pwhash_OPSLIMIT_INTERACTIVE,
		sodium.crypto_pwhash_MEMLIMIT_INTERACTIVE,
		sodium.crypto_pwhash_ALG_DEFAULT
	);

	return {
		key: toBase64(key),
		salt: toBase64(saltBytes),
	};
};

/**
 * Sign a message using a secret key (signing keypair)
 * Note: For E2EE, public key encryption is used; this is for integrity checking
 */
export const signMessage = (
	message: string,
	secretKeyBase64: string
): string => {
	if (!sodiumReady) {
		throw new Error('Sodium not initialized. Call initiateSodium() first.');
	}

	const secretKey = fromBase64(secretKeyBase64);
	const signature = sodium.crypto_sign_detached(
		sodium.from_string(message),
		secretKey
	);

	return toBase64(signature);
};

/**
 * Verify a signed message
 */
export const verifySignature = (
	message: string,
	signature: string,
	publicKeyBase64: string
): boolean => {
	if (!sodiumReady) {
		throw new Error('Sodium not initialized. Call initiateSodium() first.');
	}

	try {
		const publicKey = fromBase64(publicKeyBase64);
		const signatureBytes = fromBase64(signature);
		const messageBytes = sodium.from_string(message);

		return sodium.crypto_sign_verify_detached(
			signatureBytes,
			messageBytes,
			publicKey
		);
	} catch (_error) {
		return false;
	}
};

/**
 * Generate a random device ID in the format: deviceType:model:uuid
 * Example: web:chrome:abcd1234567890ab
 */
export const generateDeviceId = (deviceType: 'web' | 'ios' | 'android' = 'web'): string => {
	if (!sodiumReady) {
		throw new Error('Sodium not initialized. Call initiateSodium() first.');
	}

	const randomBytes = sodium.randombytes_buf(8);
	const randomHex = sodium.to_hex(randomBytes);

	// For web, we can use browser info
	let model = 'unknown';
	if (typeof navigator !== 'undefined') {
		const ua = navigator.userAgent;
		if (ua.includes('Chrome')) model = 'chrome';
		else if (ua.includes('Firefox')) model = 'firefox';
		else if (ua.includes('Safari')) model = 'safari';
		else if (ua.includes('Edge')) model = 'edge';
	}

	return `${deviceType}:${model}:${randomHex}`;
};

/**
 * Check if sodium is initialized
 */
export const isSodiumReady = (): boolean => {
	return sodiumReady;
};
/**
 * Validate if a string is a valid base64-encoded key
 * Libsodium box keys should be 32 bytes = 43 characters in base64 (with padding)
 */
export const isValidBase64Key = (value: string, minLength: number = 40, maxLength: number = 45): boolean => {
	if (typeof value !== 'string') {
		console.warn('Key validation failed: not a string', { type: typeof value });
		return false;
	}

	const trimmed = value.trim();
	let normalized: string;

	try {
		normalized = normalizeBase64Key(trimmed);
	} catch (error) {
		console.warn('Key validation failed: unable to normalize base64', { error });
		return false;
	}

	// Check length
	if (normalized.length < minLength || normalized.length > maxLength) {
		console.warn('Key validation failed: invalid length', {
			length: normalized.length,
			minLength,
			maxLength,
		});
		return false;
	}

	// Check characters
	if (!/^[A-Za-z0-9+/=]+$/.test(normalized)) {
		console.warn('Key validation failed: invalid base64 characters', {
			value: normalized.substring(0, 20) + '...',
		});
		return false;
	}

	// Test round-trip: decode and re-encode
	try {
		const decoded = Buffer.from(normalized, 'base64');
		const reencoded = decoded.toString('base64');

		// Strip padding for comparison
		const strippedInput = normalized.replace(/=+$/, '');
		const strippedReencoded = reencoded.replace(/=+$/, '');

		if (strippedInput !== strippedReencoded) {
			console.warn('Key validation failed: encoding mismatch', {
				original: strippedInput.substring(0, 20),
				reencoded: strippedReencoded.substring(0, 20),
			});
			return false;
		}

		return true;
	} catch (error) {
		console.warn('Key validation failed: exception during decode/encode', { error });
		return false;
	}
};

/**
 * Debug utility: Inspect a base64 key for encoding issues
 */
export const inspectBase64Key = (key: string): Record<string, any> => {
	const inspection: Record<string, any> = {
		rawString: key,
		length: key.length,
		trimmedLength: key.trim().length,
		hasWhitespace: key !== key.trim(),
		hasNewlines: /\n|\r/.test(key),
		hasTabs: /\t/.test(key),
		isString: typeof key === 'string',
		isEmpty: key === '',
		isNull: key === null,
		isUndefined: key === undefined,
	};

	// Check character composition
	const chars = {
		uppercase: /[A-Z]/.test(key),
		lowercase: /[a-z]/.test(key),
		digits: /[0-9]/.test(key),
		plus: /\+/.test(key),
		slash: /\//.test(key),
		equals: /=/.test(key),
		others: !/^[A-Za-z0-9+/=\s\n\r\t]*$/.test(key),
	};
	inspection.characters = chars;

	// Try to decode
	try {
		const decoded = Buffer.from(key.trim(), 'base64');
		inspection.decodedLength = decoded.length;
		inspection.decodedHex = decoded.toString('hex').substring(0, 32) + '...';
		inspection.expectedLength = decoded.length === 32 ? 'VALID (32 bytes)' : `INVALID (${decoded.length} bytes, expected 32)`;
	} catch (error) {
		inspection.decodeError = String(error);
	}

	// Check base64 padding
	const paddingMatch = key.match(/=+$/);
	inspection.padding = paddingMatch ? paddingMatch[0].length : 0;

	// Round-trip test
	try {
		const trimmed = key.trim();
		const reencoded = Buffer.from(trimmed, 'base64').toString('base64');
		const strippedInput = trimmed.replace(/=+$/, '');
		const strippedReencoded = reencoded.replace(/=+$/, '');
		inspection.roundTripMatch = strippedInput === strippedReencoded;
	} catch (error) {
		inspection.roundTripError = String(error);
	}

	return inspection;
};