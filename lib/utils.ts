import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { ChatMessage, ChatDate } from "./types"
import { globals } from "@/globals"

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

		if (method == 'POST') {
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