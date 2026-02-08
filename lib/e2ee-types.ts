/**
 * E2EE Types for multi-device end-to-end encryption
 */

// Device Information
export type DeviceInfo = {
	deviceId: string;
	deviceName: string;
	publicKey: string; // base64
	version: number;
	createdAt: string; // ISO-8601
};

export type DeviceKeyPair = {
	deviceId: string;
	publicKey: string; // base64
	privateKey: string; // base64 (stored locally only)
	deviceName: string;
};

export type RoomKeyPair = {
	roomId: string;
	publicKey: string; // base64
	privateKey: string; // base64 (stored locally only)
};

// API Endpoint Types
export type RegisterDeviceIdentityKeyRequest = {
	userId: string;
	deviceId: string;
	deviceName: string;
	identityPublicKey: string; // base64
};

export type RegisterDeviceIdentityKeyResponse = {
	success: boolean;
	message: string;
	deviceId: string;
};

export type RegisterDeviceRoomKeyRequest = {
	userId: string;
	deviceId: string;
	deviceName: string;
	roomPublicKey: string; // base64
};

export type RegisterDeviceRoomKeyResponse = {
	success: boolean;
	message: string;
	deviceId: string;
};

export type GetRoomPublicKeysResponse = {
	success: boolean;
	roomId: string;
	members: {
		[userId: string]: {
			[deviceId: string]: string; // base64 public key
		};
	};
	updatedAt: string; // ISO-8601
};

export type GetIdentityKeyResponse = {
	success: boolean;
	userId: string;
	deviceId?: string;
	publicKey?: string; // base64 (single device query)
	version?: number;
	deviceName?: string;
	updatedAt?: string;
	devices?: {
		[deviceId: string]: {
			publicKey: string; // base64
			version: number;
			deviceName: string;
			updatedAt: string; // ISO-8601
		};
	};
};

export type RotateKeysRequest = {
	deviceId: string;
	deviceName: string;
	newIdentityPublicKey: string; // base64
	roomKeys: {
		[roomId: string]: string; // base64 room public key
	};
};

export type RotateKeysResponse = {
	success: boolean;
	message: string;
	version: number;
	deviceId: string;
};

export type RemoveRoomKeyResponse = {
	success: boolean;
	message: string;
	deviceId?: string;
};

// Encryption/Decryption Types
export type EncryptedData = {
	ciphertext: string; // base64
	iv: string; // base64
};

export type DeviceEncryptedMessage = {
	[deviceId: string]: EncryptedData;
};

export type RecipientEncryptedMessages = {
	[userId: string]: DeviceEncryptedMessage;
};

export type EncryptedRoomMessage = {
	senderId: string;
	recipients: RecipientEncryptedMessages;
	senderKeys?: {
		chainKey: string; // base64
		signatureKey: string; // base64
	};
};

export type StoreEncryptedRoomMessageRequest = EncryptedRoomMessage;

export type StoreEncryptedRoomMessageResponse = {
	success: boolean;
	messageId: string;
};

// Local Storage / Redux State Types
export type E2EEDeviceState = {
	initialized: boolean;
	deviceId: string | null;
	deviceName: string | null;
	identityKeyPair: DeviceKeyPair | null; // private key stored locally
	roomKeyPairs: {
		[roomId: string]: RoomKeyPair;
	};
};

export type MemberPublicKeys = {
	[userId: string]: {
		[deviceId: string]: string; // base64 public key
	};
};

export type RoomWithE2EE = {
	id: string;
	members: string[];
	memberPublicKeys: MemberPublicKeys;
	[key: string]: any;
};

// Encrypted Message Type
export type EncryptedMessagePayload = {
	ciphertext: string; // base64
	iv: string; // base64
	senderId: string;
	senderDeviceId: string;
	recipientUserId: string;
	recipientDeviceId: string;
};

export type SodiumBoxKeypair = {
	publicKey: Uint8Array;
	privateKey: Uint8Array;
	keyType: string;
};

export type SodiumSecretBox = {
	key: Uint8Array;
	keyType: string;
};
