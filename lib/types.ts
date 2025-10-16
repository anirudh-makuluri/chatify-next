export type ChatMessage = {
	id: number;
	roomId: string;
	chatDocId?: string
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
	isConsecutiveMessage?: boolean,
	isDate?: boolean;
	reactions?: {id: string, reactors: { uid: string, name: string }[]}[]
};

export type ChatDate = {
	id?: undefined;
	roomId?: undefined;
	chatDocId?: undefined
	type?: undefined;
	chatInfo?: undefined;
	fileName?: undefined;
	isMsgEdited?: undefined;
	isMsgSaved?: undefined;
	userUid?: undefined;
	userName?: undefined;
	userPhoto?: undefined;
	time: string;
	isUserInfoDisplayed?: undefined,
	isConsecutiveMessage?: undefined,
	isDate?: boolean
	reactions?: undefined
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
	photo_url: string,
	membersData: TUser[],
	saved_messages: (ChatMessage | ChatDate)[],
	is_ai_room?: boolean
}

export type TPreviewImage = {
	url: string,
	file : File
}

export type TGiphy = {
	url: string,
	height: number,
	width: number
}

export type TReactionEvent = {
	reactionId: string,
	id: number,
	chatDocId: string,
	userUid: string,
	roomId: string,
	userName: string
}

export type TDeleteEvent = {
	id: number,
	chatDocId: string,
	roomId: string,
}

export type TEditEvent = {
	id: number,
	chatDocId: string,
	roomId: string,
	newText: string
}

export type TSaveEvent = {
	id: number,
	chatDocId: string,
	roomId: string,
}

// AI Assistant Types
export type TAIResponse = {
	success: boolean,
	response?: string,
	messageId?: string,
	error?: string
}

export type TAISummaryResponse = {
	success: boolean,
	summary?: string,
	timestamp?: string,
	error?: string
}

export type TAISentimentResponse = {
	success: boolean,
	sentiment?: 'positive' | 'negative' | 'neutral',
	timestamp?: string,
	error?: string
}

export type TAISmartRepliesResponse = {
	success: boolean,
	replies?: string[],
	timestamp?: string,
	error?: string
}

export type TAIRoomResponse = {
	success: boolean,
	roomId?: string,
	message?: string,
	room?: TRoomData,
	error?: string
}