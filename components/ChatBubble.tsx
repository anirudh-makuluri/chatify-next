import { useUser } from '@/app/providers';
import { ChatDate, ChatMessage } from '@/lib/types'
import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from './ui/badge';

export default function ChatBubble({ message, isGroup }: { message: ChatMessage | ChatDate, isGroup: boolean }) {
	const user = useUser()?.user;

	if(message.isDate) {
		return (
			<div className='flex flex-row justify-center sticky top-0'>
				<Badge className='bg-foreground hover:bg-foreground w-22 flex justify-center'>{message.time}</Badge>
			</div>
		)
	}

	const isSelf = message.userUid == user?.uid;

	const time = new Date(message.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

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
					<p>{message.chatInfo}</p>
					<p className='opacity-65 text-[10px]'>{time}</p>
				</div>
			</div>
		</div>
	)
}
