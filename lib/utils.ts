import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { ChatMessage, ChatDate } from "./types"
import { globals } from "@/globals"
import * as crypto from "./crypto"
import * as deviceManager from "./device-manager"
import { RecipientEncryptedMessages, EncryptedData } from "./e2ee-types"

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs))
}


export const customFetch = async ({ pathName, method = 'GET', body }: {
    pathName: string,
    method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE',
    body?: Object
}): Promise<any> => {
	return new Promise(async (resolve, reject) => {
		const requestObj: RequestInit = {
			method,
			credentials: 'include',
			cache: 'no-store'
		}

        if (method !== 'GET' && body != null) {
            requestObj.body = JSON.stringify(body);
            requestObj.headers = {
                "Content-Type": "application/json",
            }
        }

		try {
			const response = await fetch(`${globals.BACKEND_URL}/${pathName}`, requestObj);

			if (!response.ok) {
				return reject(response);
			}

			const data = await response.json();
			resolve(data);

		} catch (error) {
			reject(error)
		}
	})
}

export function genRoomId(uid1: string, uid2: string): string {
	const sortedUids = [uid1, uid2].sort();


	const roomId = sortedUids.join('_');

	return roomId;
}

/**
 * Decrypt a ChatMessage if it's encrypted
 * Returns a new message with decrypted chatInfo, or original if decryption fails
 * This is used in Redux reducers to decrypt messages as they're added
 * 
 * @param roomKeyPair - Pass the room keypair to avoid repeated lookups (performance optimization for batch operations)
 */
export function decryptChatMessage(
	message: ChatMessage, 
	roomKeyPair: { publicKey: string; privateKey: string } | null,
	userId?: string, 
	deviceId?: string
): ChatMessage {
	if (!message.isEncrypted || !message.encrypted) {
		return message;
	}

	try {
		// Initialize crypto if needed
		if (!crypto.isSodiumReady()) {
			console.warn('Crypto not initialized, skipping decryption');
			return message;
		}

		// Get the ciphertext for this user/device
		let ciphertext: string | null = null;

		// Check if encrypted is a single EncryptedData object
		if ((message.encrypted as EncryptedData).ciphertext) {
			ciphertext = (message.encrypted as EncryptedData).ciphertext;
		} else if (userId && deviceId) {
			// It's a RecipientEncryptedMessages structure
			const recipientMap = message.encrypted as RecipientEncryptedMessages;
			const userEntry = recipientMap[userId];
			if (userEntry && userEntry[deviceId]) {
				ciphertext = userEntry[deviceId].ciphertext;
			}
		}

		if (!ciphertext) {
			console.warn('No matching ciphertext found for this user/device');
			return message;
		}

		// Check if room keypair is available
		if (!roomKeyPair) {
			console.warn('Room keypair not provided');
			return message;
		}

		// Decrypt the message
		const decryptedText = crypto.decryptMessage(ciphertext, roomKeyPair);

		
		// Return message with decrypted chatInfo
		return {
			...message,
			chatInfo: decryptedText
		};
	} catch (error) {
		console.error('Failed to decrypt message in Redux:', error);
		// Return original message on decryption failure
		return message;
	}
}

export function formatChatMessages(messages: (ChatDate | ChatMessage)[]) {
	const formattedMessages: (ChatDate | ChatMessage)[] = [];

	let lastDate: null | string = null;
	messages.forEach((chatEvent, index) => {
		let lastMessage = messages[index - 1];
		if (lastMessage == null) {
			chatEvent.isConsecutiveMessage = false;
		} else {
			if (lastMessage.isDate) lastMessage = messages[index - 2];

			chatEvent.isConsecutiveMessage = false;
			if (chatEvent.userUid == lastMessage.userUid) {
				chatEvent.isConsecutiveMessage = true;
			}
		}

		chatEvent.time = new Date(chatEvent.time?._seconds * 1000);

		const day = String(chatEvent.time.getDate()).padStart(2, '0');
		const month = String(chatEvent.time.getMonth() + 1).padStart(2, '0');
		const year = chatEvent.time.getFullYear();

		if (lastDate == null || lastDate != `${day}-${month}-${year}`) {
			lastDate = `${day}-${month}-${year}`;
			if (lastDate) {
				formattedMessages.push({
					time: formatDateForChat(chatEvent.time),
					isDate: true,
				})
			}
		}

		formattedMessages.push(chatEvent);
	})


	return formattedMessages;
}


function formatDateForChat(date: Date) {
	const today = new Date();
	const yesterday = new Date(today);
	yesterday.setDate(yesterday.getDate() - 1);

	const isToday = date.getDate() === today.getDate() &&
		date.getMonth() === today.getMonth() &&
		date.getFullYear() === today.getFullYear();

	const isYesterday = date.getDate() === yesterday.getDate() &&
		date.getMonth() === yesterday.getMonth() &&
		date.getFullYear() === yesterday.getFullYear();

	if (isToday) {
		return 'Today';
	} else if (isYesterday) {
		return 'Yesterday';
	} else {
		const day = String(date.getDate()).padStart(2, '0');
		const month = String(date.getMonth() + 1).padStart(2, '0');
		const year = date.getFullYear();
		return `${day}-${month}-${year}`;
	}
}

export function dataURIToBlob(dataURI: string) {
	const mime = dataURI.split(',')[0].split(':')[1].split(';')[0];
	const binary = atob(dataURI.split(',')[1]);
	const array = [];
	for (var i = 0; i < binary.length; i++) {
		array.push(binary.charCodeAt(i));
	}
	return new Blob([new Uint8Array(array)], { type: mime });
}

export async function saveFileToStorage(file: File, storagePath : string, uid : string) {	

	const formData = new FormData();
	formData.append("file", file);

	return fetch(`${globals.BACKEND_URL}/users/${uid}/files?storagePath=${storagePath}`, {
		method: 'POST',
		body: formData
	}).then(res => res.json())
		.then((response: any) => {
			if (response.success) {
				const downloadUrl = response.downloadUrl;

				return downloadUrl;
			} else {
				throw response;
			}
		})
}

export async function sleep(ms : number) {
	return new Promise(async (resolve) => {
		setTimeout(() => {
			resolve("")
		}, ms);
	})
}

// Group API helpers
export const groupApi = {
    createGroup: (uid: string, { name, photoUrl, memberUids }: { name: string, photoUrl?: string, memberUids: string[] }) =>
        customFetch({ pathName: `users/${uid}/groups`, method: 'POST', body: { name, photoUrl, memberUids } }),

    addMembers: (uid: string, roomId: string, memberUids: string[]) =>
        customFetch({ pathName: `users/${uid}/groups/${roomId}/members`, method: 'POST', body: { memberUids } }),

    removeMember: (uid: string, roomId: string, memberUid: string) =>
        customFetch({ pathName: `users/${uid}/groups/${roomId}/members/${memberUid}`, method: 'DELETE' }),

    updateInfo: (uid: string, roomId: string, { name, photoUrl }: { name?: string, photoUrl?: string }) =>
        customFetch({ pathName: `users/${uid}/groups/${roomId}`, method: 'PATCH', body: { name, photoUrl } }),
    
    deleteGroup: (uid: string, roomId: string) =>
        customFetch({ pathName: `users/${uid}/groups/${roomId}`, method: 'DELETE' }),
}

export function formatLastSeen(input: string | number | Date | null | undefined) {
    if (!input) return '';
    const date = (input instanceof Date) ? input : new Date(typeof input === 'number' ? input : input);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const minutes = Math.floor(diffMs / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hr${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
}