import { TUser } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar'
import React from 'react'
import { Button } from './ui/button'
import { useUser } from '@/app/providers'
import { customFetch } from '@/lib/utils'

export default function FriendRequest({ invitedUser } : { invitedUser: TUser }) {
	const user = useUser()?.user

	function respondToRequest(accepted : boolean) {
		if(!user) return;

		customFetch({
			pathName: `users/${user.uid}/respond-request`,
			method: "POST",
			body: {
				isAccepted: accepted,
				uid: invitedUser.uid
			}
		}).then(res => {
			console.log(res);
		})

		console.log(`${user.name} ${accepted ? "Accepted" : "Declined"} ${invitedUser.name}'s request`);
	}


	return (
		<div className='flex flex-row items-center justify-between'>
			<div className='flex flex-row items-center gap-2'>
				<Avatar className='rounded-xl border border-foreground p-2'>
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
