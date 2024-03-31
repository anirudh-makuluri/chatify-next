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
	time: Date;
	isUserInfoDisplayed?: boolean
};


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
	messages: ChatMessage[],
	name: string,
	photo_url: string
}