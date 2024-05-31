import { TRoomData, TUser } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar'
import React from 'react'
import { Button } from './ui/button'
import { useUser } from '@/app/providers'
import { genRoomId } from '@/lib/utils'
import { useAppDispatch, useAppSelector } from '@/redux/store'
import { joinSocketRoom } from '@/redux/socketSlice'
import { joinChatRoom } from '@/redux/chatSlice'
import { useToast } from './ui/use-toast'

export default function FriendRequest({ invitedUser } : { invitedUser: TUser }) {
	const { user, updateUser } = useUser();
	const socket = useAppSelector(state => state.socket.socket);
	const dispatch = useAppDispatch();
	const { toast } = useToast();



	function respondToRequest(accepted : boolean) {
		if(!user || !socket) return;

		socket.emit('respond_friend_request_client_to_server', { 
			uid: user.uid,
			requestUid: invitedUser.uid,
			isAccepted: accepted
		}, (response : any) => {
			if(response.success) {
				const receivedReqs = user.received_friend_requests;
				const reqIdx = receivedReqs.findIndex(user => user.uid == invitedUser.uid);
				if(reqIdx != -1) {
					receivedReqs.splice(reqIdx, 1);
				}

				const friendList = user.friend_list;
				const rooms = user.rooms;

				if(accepted) {					
					friendList.push(invitedUser);

					const newRoomId : string = genRoomId(invitedUser.uid, user.uid)
					const newRoomData : TRoomData = {
						is_group: false,
						messages: [],
						name: invitedUser.name,
						photo_url: invitedUser.photo_url,
						roomId: newRoomId,
						membersData: [
							invitedUser,
							{
								email: user.email,
								name: user.name,
								photo_url: user.photo_url,
								uid: user.uid
							}
						],
						saved_messages: []
					}
					rooms.push(newRoomData);

					dispatch(joinSocketRoom(newRoomId))
					dispatch(joinChatRoom(newRoomData))
				}

				updateUser({
					received_friend_requests: receivedReqs,
					friend_list: friendList,
					rooms
				})
				

				toast({
					title: "Success",
					description: `${user.name} ${accepted ? "accepted" : "declined"} ${invitedUser.name}'s request`
				})
			} else {
				toast({
					title: "Error",
					description: response.error
				})
			}
		})
	}


	return (
		<div className='flex flex-row items-center justify-between'>
			<div className='flex flex-row items-center gap-2'>
				<Avatar className='rounded-full overflow-hidden'>
					<AvatarImage referrerPolicy='no-referrer' src={invitedUser.photo_url}/>
					<AvatarFallback>{invitedUser.name[0]}</AvatarFallback>					
				</Avatar>
				<p>{invitedUser.name}</p>
			</div>
			<div className='flex flex-row gap-2'>
				<Button onClick={() => respondToRequest(true)}>Accept</Button>
				<Button onClick={() => respondToRequest(false)} variant={'outline'}>Decline</Button>
			</div>
		</div>
	)
}
