import { useUser } from '@/app/providers';
import { ChatDate, ChatMessage } from '@/lib/types'
import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from './ui/badge';
import Image from 'next/image';
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

export default function ChatBubble({ message, isGroup }: { message: ChatMessage | ChatDate, isGroup: boolean }) {
	const user = useUser()?.user;

	if (message.isDate) {
		return (
			<div className='flex flex-row justify-center sticky top-0'>
				<Badge className='bg-foreground hover:bg-foreground w-28 flex justify-center'>{message.time}</Badge>
			</div>
		)
	}

	const isSelf = message.userUid == user?.uid;

	const time = new Date(message.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });


	function returnRequiredFormat() {
		switch (message.type) {
			case 'text':
				return <TextMessage message={message}/>
			case 'image':
				return <ImageMessage message={message}/>
			case 'gif':
				return <GiphyMessage message={message}/>		
			default:
				return <p>Invalid format</p>
		}
	}

	return (
		<div className={(isSelf ? 'justify-end' : 'justify-start') + " flex mt-2"}>
			<div className='flex flex-col gap-1'>
				{
					(!message.isConsecutiveMessage && isGroup) && (
						<div className={(isSelf ? 'flex-row-reverse' : "flex-row") + ' flex gap-2 items-center'}>
							<Avatar className='h-10 w-10'>
								<AvatarImage referrerPolicy='no-referrer' src={message.userPhoto} />
								<AvatarFallback>{message.userName}</AvatarFallback>
							</Avatar>
							<p className='text-secondary-foreground'>{message.userName}</p>
						</div>
					)
				}
				<div className={(isSelf
					? (message.isConsecutiveMessage
						? 'bg-primary mr-10' :
						'bg-primary mr-10 rounded-tr-none') :
					(message.isConsecutiveMessage
						? 'bg-secondary ml-10' :
						'bg-secondary ml-10 rounded-tl-none'))
					+ " py-2 px-4 rounded-md"}>
					{returnRequiredFormat()}
					<p className='opacity-65 text-[10px]'>{time}</p>
				</div>
			</div>
		</div>
	)
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
