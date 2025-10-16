import { useUser } from '@/app/providers';
import { ChatDate, ChatMessage } from '@/lib/types'
import React, { useState } from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from './ui/badge';
import Image from 'next/image';
import {
	Dialog,
	DialogContent,
	DialogTrigger,
} from "@/components/ui/dialog"
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip';
import ChatFeatures from './ChatFeatures';
import { ContextMenu, ContextMenuContent, ContextMenuTrigger } from './ui/context-menu';
import { Emoji } from 'emoji-picker-react';
import { CheckIcon, PlusIcon, StarIcon, X } from 'lucide-react';
import { useAppSelector } from '@/redux/store';
import { Input } from './ui/input';
import { Button } from './ui/button';

export default function ChatBubble({ message, isGroup }: { message: ChatMessage | ChatDate, isGroup: boolean }) {
	const user = useUser()?.user;
	const socket = useAppSelector(state => state.socket.socket)
	const activeChatRoomId = useAppSelector(state => state.chat.activeChatRoomId);

	const [isMsgEditing, setMsgEditing] = useState(false);
	const [editText, setEditText] = useState<string | undefined>(message.chatInfo)

	if (message.isDate) {
		return (
			<div className='flex flex-row justify-center sticky top-0'>
				<Badge className='bg-foreground hover:bg-foreground w-28 flex justify-center'>{message.time}</Badge>
			</div>
		)
	}

	const isSelf = message.userUid == user?.uid;
	const isAIMessage = message.userUid === 'ai-assistant';

	const time = new Date(message.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });


	function returnRequiredFormat() {
		switch (message.type) {
			case 'text':
				return <TextMessage message={message} />
			case 'image':
				return <ImageMessage message={message} />
			case 'gif':
				return <GiphyMessage message={message} />
			default:
				return <p>Invalid format</p>
		}
	}

	function handleEmojiClick(data: {
		id: string;
		reactors: {
			uid: string;
			name: string;
		}[];
	}) {
		if (!socket || !user) return;

		const reqUserIdx = data.reactors.findIndex(d => d.uid == user.uid);

		if(reqUserIdx == -1) return;

		const reqUser = data.reactors[reqUserIdx];


		socket.emit('chat_reaction_client_to_server', {
			reactionId : data.id,
			id: message.id,
			chatDocId: message.chatDocId,
			roomId: activeChatRoomId,
			userUid: reqUser.uid,
			userName: reqUser.name
		}, (response: any) => {
			console.log(response)
		})
	}


	function toggleEditMode() {
		setMsgEditing(prev => !prev);
	}

	function handleEditText() {
		if(!socket || !user) return;

		toggleEditMode();

		if(user.uid != message.userUid) return;

		socket.emit('chat_edit_client_to_server', {
			id: message.id,
			chatDocId: message.chatDocId,
			roomId: activeChatRoomId,
			newText: editText
		}, (response: any) => {
			console.log(response)
		})

	}

	return (
		<div className={(isSelf ? 'justify-end' : 'justify-start') + " flex my-3 relative"}>
			<ContextMenu>
				<ContextMenuTrigger asChild>
					<div className='flex flex-col gap-1'>
						{
							(!message.isConsecutiveMessage && (isGroup || isAIMessage)) && (
								<div className={(isSelf ? 'flex-row-reverse' : "flex-row") + ' flex gap-2 items-center'}>
									<Avatar className={(isAIMessage ? 'ring-2 ring-purple-500 ' : '') + 'h-10 w-10'}>
										<AvatarImage referrerPolicy='no-referrer' src={message.userPhoto} />
										<AvatarFallback>{message.userName}</AvatarFallback>
									</Avatar>
									<div className='flex items-center gap-2'>
										<p className='text-secondary-foreground'>{message.userName}</p>
										{isAIMessage && (
											<Badge className='bg-gradient-to-r from-purple-500 to-indigo-500 text-white text-[10px] px-2 py-0'>
												AI
											</Badge>
										)}
									</div>
								</div>
							)
						}
						<div className={(isAIMessage
							? (message.isConsecutiveMessage
								? 'ai-message-bubble ml-10' :
								'ai-message-bubble ml-10 rounded-tl-none') :
							(isSelf
								? (message.isConsecutiveMessage
									? 'bg-primary mr-10' :
									'bg-primary mr-10 rounded-tr-none') :
								(message.isConsecutiveMessage
									? 'bg-secondary ml-10' :
									'bg-secondary ml-10 rounded-tl-none')))
							+ " py-2 px-4 rounded-md"}>
							{
								isMsgEditing ?
									<div className='flex flex-col gap-1'>
										<Input 
											value={editText} 
											onChange={(e => setEditText(e.target.value))}
											onKeyDown={(e) => e.keyCode === 13 && !e.shiftKey ? handleEditText() : 
												e.keyCode === 27 ? toggleEditMode() : null
											}
										/>
										<div className='flex flex-row gap-2'>
											<Button onClick={handleEditText} className='w-12' variant={'secondary'}>
												<CheckIcon/>
											</Button>
											<Button onClick={toggleEditMode} className='w-12' variant={'destructive'}>
												<X/>
											</Button>
										</div>
									</div>
									:
									returnRequiredFormat()
							}
							<div className='flex flex-row gap-1 items-center'>
								<p className='opacity-65 text-[10px]'>{time}</p>
								{message.isMsgEdited && <p className='opacity-65 text-[10px] italic'>(Edited)</p>}
								{message.isMsgSaved && <StarIcon size={10} fill='#fff'/>}
							</div>
						</div>
					</div>
				</ContextMenuTrigger>
				<ContextMenuContent className='bg-card'>
					<ChatFeatures message={message} toggleEditMode={toggleEditMode}/>
				</ContextMenuContent>
			</ContextMenu>
			<div className={(isSelf ? 'right-10' : 'left-10') + ' absolute -bottom-5 flex flex-row gap-1 max-w-full overflow-x-auto'}>
				{
					message.reactions?.slice(0, 3).map((data, index) => (
						<Tooltip key={index}>
							<TooltipTrigger>
								<Badge onClick={() => handleEmojiClick(data)} key={index} variant={'secondary'}>
									<Emoji unified={data.id} size={12} />
									<p className='ml-1'>{data.reactors.length}</p>
								</Badge>
							</TooltipTrigger>
							<TooltipContent className='bg-card text-foreground'>
								<p>Reacted by : {getTooltipText(data.reactors)}</p>
							</TooltipContent>
						</Tooltip>
					))
				}
				{
					message.reactions && message.reactions?.length > 3 &&
					<Badge key={'extra'} variant={'secondary'}>
						<PlusIcon size={12} />
						<p className='ml-1'>{message.reactions.length - 3}</p>
					</Badge>
				}
			</div>
		</div>
	)
}

function getTooltipText(reactors : {uid: string, name: string}[]) {
	let text = "";

	const reactorsLength = reactors.length;

	switch (reactorsLength) {
		case 1:
			text = reactors[0].name
			break;
		case 2:
			text = `${reactors[0].name} and ${reactors[1].name}`
			break;	
		default:
			text = `${reactors[0].name} , ${reactors[1].name} and ${reactorsLength - 2} others`
			break
	}

	return text;
}


function TextMessage({ message }: { message: ChatMessage | ChatDate }) {
	return <p>{message.chatInfo}</p>
}


function ImageMessage({ message }: { message: ChatMessage | ChatDate }) {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Image
					src={message.chatInfo || ""}
					alt={message.fileName || ""}
					width={250}
					height={250}
					className='rounded-md'
				/>
			</DialogTrigger>
			<DialogContent className='h-[75vh] w-[75vw]'>
				<Image
					src={message.chatInfo || ""}
					alt={message.fileName || ""}
					className='rounded-md mb-2'
					fill
				/>
			</DialogContent>
		</Dialog>
	)
}

function GiphyMessage({ message }: { message: ChatMessage | ChatDate }) {
	return (
		<Dialog>
			<DialogTrigger asChild>
				<Image
					src={message.chatInfo || ""}
					alt={message.chatInfo || ""}
					width={250}
					height={250}
					className='rounded-md'
				/>
			</DialogTrigger>
			<DialogContent className='h-[75vh] w-[75vw]'>
				<Image
					src={message.chatInfo || ""}
					alt={message.chatInfo || ""}
					className='rounded-md mb-2'
					fill
				/>
			</DialogContent>
		</Dialog>
	)
}
