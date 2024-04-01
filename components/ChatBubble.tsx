import { useUser } from '@/app/providers';
import { ChatDate, ChatMessage } from '@/lib/types'
import React from 'react'
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from './ui/badge';

export default function ChatBubble({ message }: { message: ChatMessage | ChatDate }) {
	if(message.isDate) {
		return (
			<div className='flex flex-row justify-center sticky top-0'>
				<Badge className='bg-foreground hover:bg-foreground'>{message.time}</Badge>
			</div>
		)
	}

	const user = useUser()?.user;
	const isSelf = message.userUid == user?.uid;

	const time = new Date(message.time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: true });

	return (
		<div className={(isSelf ? 'justify-end' : 'justify-start') + " flex mt-2"}>
			<div className='flex flex-col gap-1'>
				{
					message.isUserInfoDisplayed && (
						<div className={(isSelf ? 'flex-row-reverse' : "flex-row") + ' flex gap-2 items-center'}>
							<Avatar className='h-10 w-10'>
								<AvatarImage referrerPolicy='no-referrer' src={message.userPhoto} />
								<AvatarFallback>{message.userName}</AvatarFallback>
							</Avatar>
							<p className='text-secondary-foreground'>{message.userName}</p>
						</div>
					)
				}
				<div className={(isSelf ? 'bg-primary rounded-tr-none mr-10' : 'bg-secondary rounded-tl-none ml-10') + " py-2 px-4 rounded-md"}>
					<p>{message.chatInfo}</p>
					<p className='opacity-65 text-[10px]'>{time}</p>
				</div>
			</div>
		</div>
	)
}
