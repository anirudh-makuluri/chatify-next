import { ChatDate, ChatMessage } from '@/lib/types'
import React from 'react'
import { Button } from './ui/button'
import { PencilIcon, StarIcon, TrashIcon } from 'lucide-react'
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import { useTheme } from "next-themes"
import { useAppSelector } from '@/redux/store';
import { useUser } from '@/app/providers';
import { ContextMenuItem } from './ui/context-menu';

export default function ChatFeatures({ message, toggleEditMode }: { message: ChatMessage | ChatDate, toggleEditMode: Function }) {
	const { theme } = useTheme();
	const { user } = useUser();

	const socket = useAppSelector(state => state.socket.socket)
	const activeChatRoomId = useAppSelector(state => state.chat.activeChatRoomId);

	function handleEmojiClick(e: EmojiClickData) {
		if (!socket || !user) return;

		socket.emit('chat_reaction_client_to_server', {
			reactionId: e.unified,
			id: message.id,
			chatDocId: message.chatDocId,
			roomId: activeChatRoomId,
			userUid: user.uid,
			userName: user.name
		}, (response: any) => {
			console.log(response)
		})
	}

	function handleDeleteClick() {
		if (!socket || !user) return;

		if (message.userUid != user.uid) return;

		socket.emit('chat_delete_client_to_server', {
			id: message.id,
			chatDocId: message.chatDocId,
			roomId: activeChatRoomId,
		}, (response: any) => {
			console.log(response)
		})
	}

	function handleStarClick() {
		if (!socket || !user) return;

		socket.emit('chat_save_client_to_server', {
			id: message.id,
			chatDocId: message.chatDocId,
			roomId: activeChatRoomId,
		}, (response: any) => {
			console.log(response)
		})
	}

	return (
		<div>
			<EmojiPicker
				lazyLoadEmojis={true}
				reactionsDefaultOpen={true}
				onEmojiClick={handleEmojiClick}
				theme={theme == undefined ? Theme.AUTO : theme == 'system' ? Theme.AUTO : theme as Theme}
			/>
			<div className='flex flex-col text-foreground mt-2'>
				{
					message.type == "text" && message.userUid == user?.uid &&
					<ContextMenuItem onClick={() => toggleEditMode()} className='flex flex-row justify-start gap-2'>
						<PencilIcon />
						<p>Edit</p>
					</ContextMenuItem>
				}
				{
					message.userUid == user?.uid &&
					<ContextMenuItem onClick={handleDeleteClick} className='flex flex-row justify-start gap-2'>
						<TrashIcon />
						<p>Delete</p>
					</ContextMenuItem>
				}
				<ContextMenuItem onClick={handleStarClick} className='flex flex-row justify-start gap-2'>
					<StarIcon/>
					<p>{message.isMsgSaved ? "UnStar" : "Star"}</p>
				</ContextMenuItem>
			</div>

		</div>
	)
}
