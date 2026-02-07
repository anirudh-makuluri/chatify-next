// @ts-ignore - libsodium.js doesn't have official type declarations
import sodium from 'libsodium-wrappers-sumo';
import { EncryptedData, SodiumBoxKeypair } from './e2ee-types';

// Initialize sodium (call once at app startup)
let sodiumReady = false;

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

	return {
		publicKey: sodium.to_base64(keypair.publicKey),
		privateKey: sodium.to_base64(keypair.privateKey),
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
		const recipientPublicKey = sodium.from_base64(recipientPublicKeyBase64);
		const messageBytes = sodium.from_string(message);

		// Anonymous public key encryption (no sender key required)
		const ciphertext = sodium.crypto_box_seal(
			messageBytes,
			recipientPublicKey
		);

		return {
			ciphertext: sodium.to_base64(ciphertext),
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
		const ciphertextBytes = sodium.from_base64(ciphertext);
		const yourPrivateKey = sodium.from_base64(yourPrivateKeyBase64);
		let decrypted: Uint8Array;

		if (iv) {
			const nonce = sodium.from_base64(iv);
			const senderPublicKey = sodium.from_base64(senderPublicKeyBase64);

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
	return sodium.to_base64(nonce);
};

/**
 * Convert base64 string to Uint8Array
 */
export const base64ToUint8Array = (base64: string): Uint8Array => {
	return sodium.from_base64(base64);
};

/**
 * Convert Uint8Array to base64 string
 */
export const uint8ArrayToBase64 = (data: Uint8Array): string => {
	return sodium.to_base64(data);
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
	return sodium.to_base64(hash);
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
		key: sodium.to_base64(key),
		salt: sodium.to_base64(saltBytes),
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

	const secretKey = sodium.from_base64(secretKeyBase64);
	const signature = sodium.crypto_sign_detached(
		sodium.from_string(message),
		secretKey
	);

	return sodium.to_base64(signature);
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
		const publicKey = sodium.from_base64(publicKeyBase64);
		const signatureBytes = sodium.from_base64(signature);
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
