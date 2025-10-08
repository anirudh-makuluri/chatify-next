"use client"
import React, { useEffect, useState } from 'react'
import { useUser } from '../providers'
import { useRouter } from 'next/navigation';
import Sidebar from './Sidebar';
import { Separator } from "@/components/ui/separator"
import Room from './Room';
import Menubar from '@/app/home/MenuBar';
import { useAppSelector, useAppDispatch } from '@/redux/store';
import NoActiveRoom from '@/components/NoActiveRoom';
import { initAndJoinSocketRooms, joinSocketRoom } from '@/redux/socketSlice';
import { addMessage, deleteChatMessage, editChatMessage, joinChatRoom, saveChatMessage, updateChatReaction } from '@/redux/chatSlice';
import { ChatMessage, TDeleteEvent, TEditEvent, TReactionEvent, TRoomData, TSaveEvent, TUser } from '@/lib/types';
import { genRoomId } from '@/lib/utils';
import { useClientMediaQuery } from '@/lib/hooks/useClientMediaQuery';
import LoadingScreen from '@/components/LoadingScreen';


export default function Page() {
	const { isLoading, user, updateUser } = useUser();
	const router = useRouter();
	const activeChatRoomId = useAppSelector(state => state.chat.activeChatRoomId);
	const socket = useAppSelector(state => state.socket.socket);
	const dispatch = useAppDispatch();
	const isMobile = useClientMediaQuery('(max-width: 600px)');

	const [isLoadingScreenVisible, setLoadingScreenVisibility] = useState(true);

	const [areRoomsInited, setRoomsInited] = useState(false);

	useEffect(() => {
		if (!isLoading && !user) {
			router.replace("/auth")
		}

		if (!user || areRoomsInited) return;
		setLoadingScreenVisibility(false);

		const roomIds: string[] = user.rooms.map(u => u.roomId);

		dispatch(initAndJoinSocketRooms(roomIds, {
			email: user.email,
			name: user.name,
			photo_url: user.photo_url,
			uid: user.uid
		}));

		user.rooms.forEach((roomData) => {
			dispatch(joinChatRoom(roomData));
		});

		setRoomsInited(true);

	}, [user, isLoading])

	useEffect(() => {
		if (!socket) return;

		socket.on('chat_event_server_to_client', (msg: ChatMessage) => {
			console.log("Received message from " + msg);
			dispatch(addMessage(msg))
			//if activechatroomid != msg.roomid dispatch(inrecementunreadmessages)
		})

		socket.on('send_friend_request_server_to_client', (data: TUser) => {
			console.log("Received friend request from " + data.name);
			const receivedFriendRequests = user?.received_friend_requests || [];
			receivedFriendRequests.push(data);
			updateUser({ received_friend_requests: receivedFriendRequests });
		})

		socket.on('respond_friend_request_server_to_client', (data: TUser) => {
			if (!user) return;

			//For now, socket is emitted only when the request is accepted. Might have to handle the other case in the future.

			const friendList = user.friend_list;
			const rooms = user.rooms;

			friendList.push(data);

			const newRoomId: string = genRoomId(data.uid, user.uid)
			const newRoomData: TRoomData = {
				is_group: false,
				messages: [],
				name: data.name,
				photo_url: data.photo_url,
				roomId: newRoomId,
				membersData: [data, {
					email: user.email,
					name: user.name,
					photo_url: user.photo_url,
					uid: user.uid
				}],
				saved_messages: []
			}
			rooms.push(newRoomData);

			dispatch(joinSocketRoom(newRoomId))
			dispatch(joinChatRoom(newRoomData))

			updateUser({
				friend_list: friendList,
				rooms
			})
		});

		socket.on('chat_reaction_server_to_client', (data : TReactionEvent) => {
			dispatch(updateChatReaction(data))
		})

		socket.on('chat_delete_server_to_client', (data : TDeleteEvent) => {
			dispatch(deleteChatMessage(data))
		})

		socket.on('chat_edit_server_to_client', (data : TEditEvent) => {
			dispatch(editChatMessage(data))
		})

		socket.on('chat_save_server_to_client', (data : TSaveEvent) => {
			dispatch(saveChatMessage(data))
		})

		return () => {
			socket.off("chat_event_server_to_client");
			socket.off("send_friend_request_server_to_client")
			socket.off('respond_friend_request_server_to_client');
			socket.off('chat_reaction_server_to_client');
			socket.off('chat_delete_server_to_client');
			socket.off('chat_edit_server_to_client');
			socket.off('chat_save_server_to_client');
		}

	}, [socket]);

	return (
		<div className='h-screen flex flex-row overflow-hidden'>
			{isLoadingScreenVisible && <LoadingScreen/>}
			<div style={{ display: activeChatRoomId == '' || !isMobile ? "flex" : "none" }} className="flex flex-row sm:w-1/4 w-full h-full">
				<Menubar />
				<Separator orientation='vertical' className='h-full' />
				<Sidebar />
				<Separator orientation='vertical' className='h-full' />
			</div>
			{isMobile && activeChatRoomId != '' && <Room/>}
			{!isMobile && (activeChatRoomId != '' ? <Room /> : <NoActiveRoom />)}
		</div>
	)
}
