import React, { useEffect, useRef, useState } from 'react'
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
import CropperOverlay from '@/components/CropperOverlay';
import { dataURIToBlob } from '@/lib/utils';
import { globals } from '@/globals';


export default function MenuBar() {
	const { user, logout, updateUser } = useUser();
	const dispatch = useAppDispatch();
	const socket = useAppSelector(state => state.socket.socket);
	const { toast } = useToast();

	const imageRef = useRef<HTMLInputElement | null>(null);

	const [isUserNameEditable, setUserNameEditable] = useState<boolean>(false);
	const [newUserName, setNewUserName] = useState<string>(user?.name || "");

	const [isCropperOverlayVisible, setCropperOverlayVisibility] = useState(false);
	const [profileUrl, setProfileUrl] = useState("");

	useEffect(() => {
		if (!user || !socket) return;

		if (!isUserNameEditable && newUserName != user.name && newUserName.trim() != "") {
			const newData = {
				name: newUserName
			}
			socket.emit('update_user_data', { uid: user.uid, newData }, (response: any) => {
				console.log(response);
				if (response.success) {
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

	function openImageChoose() {
		if (!imageRef.current) return;

		imageRef.current.click();

		imageRef.current.onchange = (e: any) => {
			const file = e.target?.files[0];
			const profileUrl = URL.createObjectURL(file);
			setProfileUrl(profileUrl);
			setCropperOverlayVisibility(true);
		}
	}

	function saveProfilePhoto(url: string) {
		if (!user || !socket) return;

		const storagePath = `${encodeURIComponent(user.uid)}-profile_photo`;

		saveFileToStorage(url, storagePath)?.then((downloadUrl) => {
			const newData = {
				photo_url: downloadUrl
			}

			socket.emit('update_user_data', { uid: user.uid, newData }, (response: any) => {
				if (response.success) {
					updateUser(newData);
					toast({
						description: "User photo updated"
					})
				} else {
					toast({
						description: JSON.stringify(response.error)
					})
				}
			})
		}).catch((err : any) => {
			toast({
				description: JSON.stringify(err)
			})
		}).finally(() => {
			setCropperOverlayVisibility(false);
		})

	}

	function saveFileToStorage(url: string, storagePath : string) {
		if (!user || !socket) return;

		const photoBlob = dataURIToBlob(url);
		

		const formData = new FormData();
		formData.append("file", photoBlob);

		return fetch(`${globals.BACKEND_URL}/users/${user.uid}/files?storagePath=${storagePath}`, {
			method: 'POST',
			body: formData
		}).then(res => res.json())
			.then((response: any) => {
				if (response.success) {
					const downloadUrl = response.downloadUrl;

					return downloadUrl;
				} else {
					throw response;
				}
			})
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
						<div onClick={openImageChoose} className='group relative w-20 hover:cursor-pointer'>
							<Avatar className='w-20 h-20'>
								<AvatarImage src={user?.photo_url} />
							</Avatar>
							<div className='bg-slate-500 hidden group-hover:flex rounded-full opacity-40 w-20 h-20 absolute top-0 items-center justify-center'>
								<PencilIcon size={18} />
							</div>
							<Input className='hidden' ref={imageRef} type='file' accept='image/*' />
						</div>
						<div className='flex flex-row w-full justify-between items-center'>
							{
								isUserNameEditable ?
									<Input className='text-lg' value={newUserName} onChange={e => setNewUserName(e.target.value)} />
									:
									<p className='text-lg'>{user?.name}</p>
							}
							<Button className='ml-2' onClick={() => setUserNameEditable(prev => !prev)} variant={isUserNameEditable ? 'default' : 'ghost'}>
								{
									isUserNameEditable ?
										<Send size={18} />
										:
										<PencilIcon size={18} />
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
			<CropperOverlay
				url={profileUrl}
				isCropperOverlayVisible={isCropperOverlayVisible}
				setCropperOverlayVisibility={setCropperOverlayVisibility}
				saveCroppedImage={saveProfilePhoto}
			/>
		</div>
	)
}
