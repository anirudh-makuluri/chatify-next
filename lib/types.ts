export type ChatMessage = {
	chatId: number;
	roomId: string;
	type: 'text' | 'image' | 'gif' | 'file';
	chatInfo: string;
	fileName?: string;
	isMsgEdited?: boolean;
	isMsgSaved?: boolean;
	userUid: string;
	userName: string;
	userPhoto: string;
	time: any; //TODO: fix
	isUserInfoDisplayed?: boolean,
	isDate?: boolean
};

export type ChatDate = {
	chatId?: null;
	roomId?: null;
	type?: null;
	chatInfo?: null;
	fileName?: null;
	isMsgEdited?: null;
	isMsgSaved?: null;
	userUid?: null;
	userName?: null;
	userPhoto?: null;
	time: any;
	isUserInfoDisplayed?: null,
	isDate?: boolean
}

export type TUser = {
	name: string,
	email: string,
	photo_url: string,
	uid: string
}

export type TAuthUser = {
	email: string,
	name: string,
	photo_url: string,
	received_friend_requests: TUser[],
	friend_list: TUser[],
	sent_friend_requests: TUser[],
	uid: string,
	rooms: TRoomData[],
}

export type TRoomData = {
	is_group: boolean
	roomId: string,
	messages: (ChatMessage | ChatDate)[],
	name: string,
	photo_url: string
}