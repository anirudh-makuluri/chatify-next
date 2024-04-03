import React, { useEffect, useState } from 'react'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { customFetch, genRoomId } from '@/lib/utils';
import { TRoomData, TUser } from '@/lib/types';
import FetchedUser from '@/components/FetchedUser';
import { useUser } from '../providers';
import SidebarUser from '@/components/SidebarRoomDisplay';
import { useToast } from '@/components/ui/use-toast';

export default function Sidebar() {
	const user = useUser()?.user;
	const { toast } = useToast();

	const [searchUser, setSearchUser] = useState<string>("");
	const [fetchedUsers, setFetchedUsers] = useState<TUser[]>([]);
	const [openFetchedUsersDialog, setOpenFetchedUsersDialog] = useState(false);

	function handleSubmitSearch() {
		customFetch({
			pathName: 'users/search-user?searchuser=' + searchUser
		}).then(res => {
			if (res.requiredUsers) {
				setFetchedUsers(res.requiredUsers);
				if(res.requiredUsers.length > 0) setOpenFetchedUsersDialog(true);
				else toast({
					title: "Error",
					description: "No users found"
				})
			}
		})
	}

	function closeDialog() {
		setOpenFetchedUsersDialog(false);
	}

	return (
		<div className='w-1/4'>
			<div className='flex flex-row gap-2 my-2 px-4'>
				<Input value={searchUser} onChange={(e) => setSearchUser(e.target.value)} placeholder='Search or start a new chat' className='text-xs' />
				<Button onClick={handleSubmitSearch}>Search</Button>
			</div>
			<Dialog open={openFetchedUsersDialog} onOpenChange={setOpenFetchedUsersDialog}>
				<DialogContent className="sm:max-w-[425px]">
					<DialogHeader>
						<DialogTitle>Fetched Users</DialogTitle>
						<DialogDescription>
							We've found the following users according to your search
						</DialogDescription>
					</DialogHeader>
					<div className="grid gap-4 py-4">
						{
							fetchedUsers.map((user, index) => (
								<FetchedUser
									fetchedUser={user}
									key={index}
									closeDialog={closeDialog}
								/>
							))
						}
					</div>
				</DialogContent>
			</Dialog>
			{
				user?.rooms.map((roomData, index) => (
					<SidebarUser
						roomData={roomData}
						key={index}
					/>
				))
			}
			{
				user?.rooms.length == 0 && 
					<div className='flex flex-col justify-center items-center text-center gap-5 h-full'>
						<p>You have no friends :(</p>
						<p>Search for friends using the above search bar</p>
					</div>
			}

		</div>
	)
}
