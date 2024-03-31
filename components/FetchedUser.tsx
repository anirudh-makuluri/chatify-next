import { TUser } from '@/lib/types'
import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from './ui/button'
import { useUser } from '@/app/providers'
import { customFetch } from '@/lib/utils'
import { useToast } from "@/components/ui/use-toast"

export default function FetchedUser({ fetchedUser, closeDialog }: { fetchedUser: TUser, closeDialog: () => void }) {
	const user = useUser()?.user;
	const { toast } = useToast();

	function handleAddFriend() {
		if(!user) {
			toast({
				title: "Error",
				description: "User not logged in"
			})
			return;
		}

		customFetch({
			pathName: `users/${user.uid}/friend-request?receiveruid=${fetchedUser.uid}`,
			method: 'PUT'
		}).then(res => {

			if(res.success) {
				toast({
					title: "Success",
					description: res.sucsess
				})
			} else {
				toast({
					title: "Error",
					description: res.error
				})
			}

			closeDialog();
		})
	}


	return (
		<div className='flex flex-row justify-between items-center gap-6'>
			<div className='flex flex-row gap-2'>
				<Avatar>
					<AvatarImage src={fetchedUser.photo_url} referrerPolicy='no-referrer' />
					<AvatarFallback>{fetchedUser.name}</AvatarFallback>
				</Avatar>
				<div className='flex flex-col'>
					<p className='text-sm'>{fetchedUser.name}</p>
					<p className='text-xs'>{fetchedUser.email}</p>
				</div>
			</div>
			<Button onClick={handleAddFriend}>Add Friend</Button>
		</div>
	)
}
