import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea'
import React, { useEffect, useRef, useState } from 'react'
import io from 'socket.io-client';
import {
	Send
} from 'lucide-react'
import { useToast } from "@/components/ui/use-toast"
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { addChatDoc, addMessage } from '@/redux/chatSlice';
import { useUser } from '../providers';
import { ChatMessage } from '@/lib/types';
import ChatBubble from '@/components/ChatBubble';
import { sendMessageToServer } from '@/redux/socketSlice';
import { Avatar, AvatarImage } from '@radix-ui/react-avatar';

export default function Room() {
	const { toast } = useToast();
	const activeChatRoomId = useAppSelector(state => state.chat.activeChatRoomId);

	const activeRoom = useAppSelector(state => state.chat.rooms[activeChatRoomId]);
	const socket = useAppSelector(state => state.socket.socket);

	const dispatch = useAppDispatch();
	const user = useUser()?.user;

	const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const messagesContainerRef = useRef<HTMLDivElement>(null);

	const [input, setInput] = useState<string>("");
	const [prevMsgCnt, setPrevMsgCnt] = useState<number>(activeRoom.messages.length);

	useEffect(() => {
		if (activeChatRoomId != "") {
			textAreaRef.current?.focus();

		}
	}, [activeChatRoomId]);

	useEffect(() => {
		if(!isBottomScrollRequired()) return;

		setTimeout(() => {
			scrollToBottom();
			setPrevMsgCnt(activeRoom.messages.length);
		}, 200);
	}, [activeRoom.messages]);

	const sendMessage = () => {
		if (input.trim() == "" || input == null) return;

		if (!user) {
			toast({
				title: "Error",
				description: "User not logged in"
			})
			return;
		}

		const chatMessage: ChatMessage = {
			chatId: (Date.now() * Math.floor(Math.random() * 1000)),
			roomId: activeChatRoomId,
			type: 'text',
			chatInfo: input,
			userUid: user.uid,
			userName: user.name,
			userPhoto: user.photo_url,
			time: new Date()
		}

		dispatch(sendMessageToServer(chatMessage))
		setInput("");
	}

	const scrollToBottom = () => {
		if (messagesEndRef.current) {
			messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
		}
	};

	const handleScroll = () => {
		if (messagesContainerRef.current) {
			const container = messagesContainerRef.current;
			if (container.scrollTop === 0) {
				console.log('Scrolled to the top');
				if(!socket) return;

				const roomId = activeChatRoomId;
				const curChatDocId = activeRoom.messages[1].chatDocId;
				socket.emit('load_chat_doc_from_db', { roomId, curChatDocId }, (response : any) => {
					if(response.success) {
						dispatch(addChatDoc({ messages: response.chat_history, roomId }))
					} else {
						console.log(response);
					}
				})
			}
		}
	};

	const isBottomScrollRequired = () => {
		if(activeRoom.messages.length - prevMsgCnt <= 1) {
			return true;
		}


		return false;
	}

	return (
		<div className='w-full flex flex-col relative pb-4'>
			<div className='bg-card w-full h-[10vh] px-2 flex flex-row items-center justify-start gap-4 absolute top-0'>
				<Avatar>
					<AvatarImage src={activeRoom.photo_url} className='h-10 w-10 rounded-full' />
				</Avatar>
				<p>{activeRoom.name}</p>
			</div>
			<div
				ref={messagesContainerRef}
				onScroll={handleScroll}
				className='mt-[12vh] h-[70vh] overflow-y-auto mx-4 mb-3'>
				{
					activeRoom.messages.map((message, index) => (
						<ChatBubble
							key={index}
							message={message}
							isGroup={activeRoom.is_group}
						/>
					))
				}
				<div ref={messagesEndRef} />
			</div>
			<div className="mx-4 h-[10vh]">
				<Textarea
					ref={textAreaRef}
					onKeyDown={e => { if (e.key == "Enter") sendMessage() }}
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder='Type your message here'
				/>
				<div className='flex justify-end mt-4'>
					<Button onClick={sendMessage}>
						<Send />
					</Button>

				</div>
			</div>
		</div>
	)
}
