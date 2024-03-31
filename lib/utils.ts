import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

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
			const response = await fetch(`http://localhost:5000/${pathName}`, requestObj);

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

export function genRoomId(uid1: string, uid2: string) : string {
	const sortedUids = [uid1, uid2].sort();
  
  
  const roomId = sortedUids.join('_');
  
  return roomId;
}