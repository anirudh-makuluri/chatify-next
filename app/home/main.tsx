"use client"
import React, { useEffect } from 'react'
import { useUser } from '../providers'
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import { Separator } from "@/components/ui/separator"
import Room from './Room';
import Menubar from '@/app/home/MenuBar';
import { useAppSelector, useAppDispatch } from '@/redux/store';
import NoActiveRoom from '@/components/NoActiveRoom';
import { initAndJoinRooms } from '@/redux/socketSlice';
import { addMessage, joinRooms } from '@/redux/chatSlice';
import { ChatMessage } from '@/lib/types';


export default function Main() {
	const { isLoading, user } = useUser();
	const router = useRouter();
	const activeChatRoomId = useAppSelector(state => state.chat.activeChatRoomId);
	const socket = useAppSelector(state => state.socket.socket);
	const dispatch = useAppDispatch();

	useEffect(() => {
		if (!isLoading && !user) {
			router.replace("/auth")
		}

		if(!user) return;

		const roomIds: string[] = user.rooms.map(u => u.roomId);

		dispatch(initAndJoinRooms(roomIds, {
			email: user.email,
			name: user.name,
			photo_url: user.photo_url,
			uid: user.uid
		}));

		dispatch(joinRooms(user.rooms));
		
	}, [user, isLoading])

	useEffect(() => {
		if(!socket) return;

		socket.on('chat_event_server_to_client', (msg : ChatMessage) => {
			dispatch(addMessage(msg))
		})

		socket.on('send_friend_request_server_to_client', () => {
			
		})

		return () => {
			socket.off("chat_event_server_to_client");
		}

	}, [socket]);

	return (
		<div className='min-h-screen flex flex-row'>
			<Menubar />
			<Separator orientation='vertical' className='min-h-screen' />
			<Sidebar />
			<Separator orientation='vertical' className='min-h-screen' />
			{ activeChatRoomId != '' ? <Room /> : <NoActiveRoom/> }
		</div>
	)
}
