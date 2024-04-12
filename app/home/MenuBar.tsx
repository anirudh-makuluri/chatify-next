import React, { useEffect, useState } from 'react'
import { ThemeToggle } from '../../components/theme-toggle'
import { useUser } from '@/app/providers'
import {
	UserRoundPlus,
	PencilIcon,
	Send
} from 'lucide-react'
import { Button } from '../../components/ui/button';
import {
	Dialog,
	DialogClose,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog"
import FriendRequest from '../../components/FriendRequest';
import { Avatar } from '@/components/ui/avatar';
import { AvatarImage } from '@radix-ui/react-avatar';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import { clearRoomData } from '@/redux/chatSlice';
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';


export default function MenuBar() {
	const { user, logout, updateUser } = useUser();
	const dispatch = useAppDispatch();
	const socket = useAppSelector(state => state.socket.socket);
	const { toast } = useToast();

	const [isUserNameEditable, setUserNameEditable] = useState<boolean>(false);
	const [newUserName, setNewUserName] = useState<string>(user?.name || "");

	useEffect(() => {
		if(!user || !socket) return;

		if(!isUserNameEditable && newUserName != user.name && newUserName.trim() != "") {
			const newData = {
				name: newUserName
			}
			socket.emit('update_user_data', { uid: user.uid, newData }, (response : any) => {
				console.log(response);
				if(response.success) {
					updateUser(newData);
					toast({
						description: "User name updated"
					})
				} else {
					toast({
						description: JSON.stringify(response.error)
					})
				}
			})
		} else {
			setNewUserName(user.name)
		}

	}, [isUserNameEditable]);

	function logOut() {
		dispatch(clearRoomData());
		logout();
	}

	return (
		<div className='min-h-screen w-[2vw] flex flex-col justify-between items-center px-6 py-4'>
			<Dialog>
				<DialogTrigger asChild>
					<Button disabled={user?.received_friend_requests?.length == 0} size='icon' variant={'outline'} className='relative'>
						<div style={{ display: user?.received_friend_requests?.length || 0 > 0 ? "flex" : "none" }} className='bg-red-700 h-[0.8rem] w-[0.8rem] rounded-full absolute -top-1 -left-1 text-[10px] text-center flex justify-center items-center'>{user?.received_friend_requests?.length}</div>
						<UserRoundPlus className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all" />
					</Button>
				</DialogTrigger>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Friend Requests</DialogTitle>
					</DialogHeader>
					<div className='flex flex-col gap-4 max-h-[50vh] overflow-y-auto px-2'>
						{
							user?.received_friend_requests.map((invitedUser, index) => (
								<FriendRequest
									invitedUser={invitedUser}
									key={index}
								/>
							))
						}
					</div>
				</DialogContent>
			</Dialog>
			<div className='flex flex-col gap-2 items-center'>
				<ThemeToggle />
				<Popover>
					<PopoverTrigger asChild>
						<Button variant={'outline'} size={'icon'}>
							<Avatar className='h-[1.2rem] w-[1.2rem] '>
								<AvatarImage src={user?.photo_url} />
							</Avatar>
						</Button>
					</PopoverTrigger>
					<PopoverContent className='space-y-6'>
						<Avatar className='w-20 h-20'>
							<AvatarImage src={user?.photo_url}/>
						</Avatar>
						<div className='flex flex-row w-full justify-between items-center'>
							{
								isUserNameEditable ? 
									<Input className='text-lg' value={newUserName} onChange={e => setNewUserName(e.target.value)}/>
									:
									<p className='text-lg'>{user?.name}</p>
							}
							<Button className='ml-2' onClick={() =>	setUserNameEditable(prev => !prev)} variant={isUserNameEditable ? 'default' : 'ghost'}>
								{
									isUserNameEditable ? 
										<Send size={18}/>
										:
										<PencilIcon size={18}/>
								}
							</Button>
						</div>
						<div className='w-full flex justify-center items-center'>
							<Button onClick={logOut} variant={'destructive'}>
								<p>Log out</p>
							</Button>
						</div>
					</PopoverContent>
				</Popover>
			</div>
		</div>
	)
}
