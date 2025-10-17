import { TRoomData } from '@/lib/types'
import React from 'react'
import { Card, CardTitle, CardHeader, CardContent } from './ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar'
import { useAppDispatch, useAppSelector } from '@/redux/store'
import { setActiveRoomId } from '@/redux/chatSlice'
import { genRoomId } from '@/lib/utils'
import { useUser } from '@/app/providers'
import { formatLastSeen } from '@/lib/utils'


export default function SidebarRoomDisplay({ roomData }: { roomData: TRoomData }) {
	const dispatch = useAppDispatch();
	const {	user } = useUser();
	const rooms = useAppSelector(state => state.chat.rooms);

	function changeActiveRoom() {
		if(!user) return;

		dispatch(setActiveRoomId(roomData.roomId));
	}

	function getLastMessage() {
		if(!user || rooms[roomData.roomId] == null) return "Start a conversation"

		const currentMessages = rooms[roomData.roomId].messages;
		if(currentMessages.length == 0) return "Start a conversation";

		const lastMesage = currentMessages[currentMessages.length - 1];

		switch (lastMesage.type) {
			case 'text':
				return `${lastMesage.userUid == user.uid ? "You" : lastMesage.userName} : ${lastMesage.chatInfo}`
			case 'image':
				return `${lastMesage.userUid == user.uid ? "You" : lastMesage.userName} : Uploaded an image`
			case 'gif':
				return `${lastMesage.userUid == user.uid ? "You" : lastMesage.userName} : Uploaded a GIF`		
			default:
				return `${lastMesage.userUid == user.uid ? "You" : lastMesage.userName} : Sent a message`
		}
	}

	function isOtherOnline() {
		if (roomData.is_group) return false;
		if (!user) return false;
		const other = roomData.membersData.find(m => m.uid !== user.uid);
		return !!other?.is_online;
	}

	if(!user) {
		return;
	}

	return (
		<Card onClick={changeActiveRoom} className='cursor-pointer hover:bg-primary duration-300 rounded-none border-r-0 border-l-0'>
			<CardHeader>
				<CardTitle className='flex flex-row gap-2 items-center'>
					<div className='relative'>
						<Avatar>
							<AvatarImage className='h-6 w-6 rounded-full' src={roomData.photo_url} referrerPolicy='no-referrer' />
						</Avatar>
						{isOtherOnline() && (
							<span className='absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500 ring-2 ring-background'></span>
						)}
					</div>
					<p>{roomData.name}</p>
				</CardTitle>
			</CardHeader>
			<CardContent>
				<p className='text-sm opacity-50'>{getLastMessage()}</p>
			</CardContent>
		</Card>
	)
}
