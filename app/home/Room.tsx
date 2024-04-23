import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea'
import React, { useEffect, useRef, useState } from 'react'
import {
	Send,
	SmileIcon,
	ArrowLeft,
	ImageIcon
} from 'lucide-react'
import { useToast } from "@/components/ui/use-toast"
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { addChatDoc, addMessage, setActiveRoomId } from '@/redux/chatSlice';
import { useUser } from '../providers';
import { ChatMessage, TPreviewImage } from '@/lib/types';
import ChatBubble from '@/components/ChatBubble';
import { sendMessageToServer } from '@/redux/socketSlice';
import { Avatar, AvatarImage } from '@radix-ui/react-avatar';
import EmojiPicker, { EmojiClickData, Theme } from 'emoji-picker-react';
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/ui/popover"
import { useTheme } from "next-themes"
import { MouseDownEvent } from 'emoji-picker-react/dist/config/config';
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { saveFileToStorage } from '@/lib/utils';

export default function Room() {
	const { toast } = useToast();
	const { theme } = useTheme();

	const activeChatRoomId = useAppSelector(state => state.chat.activeChatRoomId);
	const activeRoom = useAppSelector(state => state.chat.rooms[activeChatRoomId]);
	const socket = useAppSelector(state => state.socket.socket);

	const dispatch = useAppDispatch();

	const user = useUser()?.user;

	const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const messagesContainerRef = useRef<HTMLDivElement>(null);
	const imageRef = useRef<HTMLInputElement | null>(null);

	const [input, setInput] = useState<string>("");
	const [prevMsgCnt, setPrevMsgCnt] = useState<number>(activeRoom.messages.length);
	const [previewImages, setPreviewImages] = useState<TPreviewImage[]>([]);

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
		if ((input.trim() == "" || input == null) && previewImages.length == 0) return;

		if (!user) {
			toast({
				title: "Error",
				description: "User not logged in"
			})
			return;
		}

		previewImages.forEach(async (data) => {
			const chatId = (Date.now() * Math.floor(Math.random() * 1000));
			const storagePath = `${activeChatRoomId}/${chatId}`;
			const downloadUrl = await saveFileToStorage(data.file, storagePath, user.uid);

			const chatMessage : ChatMessage = {
				chatId,
				roomId: activeChatRoomId,
				type: 'image',
				chatInfo: downloadUrl,
				userUid: user.uid,
				userPhoto: user.photo_url,
				time: new Date(),
				userName: user.name,
				fileName: data.file.name
			}

			dispatch(sendMessageToServer(chatMessage));
		});

		if((input.trim() == "" || input == null)) return;

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
		setPreviewImages([])
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

	function onEmojiClick(e : EmojiClickData) {
		if(textAreaRef.current == null) return;

		const cursorPosition = textAreaRef.current.selectionStart;
		const newInput = input.slice(0, cursorPosition) + e.emoji + input.slice(cursorPosition);
        setInput(newInput);
	}

	function handleBackButton() {
		dispatch(setActiveRoomId(''));
	}

	function openImageChoose() {
		if (!imageRef.current) return;

		imageRef.current.click();

		imageRef.current.onchange = (e : any) => {
			const files = e.target?.files;
			if (files) {
				const imageData : TPreviewImage[] = Array.from(files).map((file : any) => {
					return {
						url: URL.createObjectURL(file),
						file: file
					}
				});
				
				const newPreviewImages = [...previewImages, ...imageData];
				setPreviewImages(newPreviewImages);
			}
		}
	}

	function removePreviewImage(index : number) {
		let newPreviewImages = [...previewImages]
		newPreviewImages.splice(index, 1);
		setPreviewImages(newPreviewImages);
	}

	return (
		<div className='w-full flex flex-col relative pb-4'>
			<div className='bg-card w-full h-[10vh] px-2 flex flex-row items-center justify-start gap-4 absolute top-0'>
				<Button onClick={handleBackButton} variant={'ghost'} className='block sm:hidden'>
					<ArrowLeft/>
				</Button>
				<Avatar>
					<AvatarImage src={activeRoom.photo_url} className='h-10 w-10 rounded-full' />
				</Avatar>
				<p>{activeRoom.name}</p>
			</div>
			<div
				ref={messagesContainerRef}
				onScroll={handleScroll}
				className='mt-[12vh] h-[60vh] overflow-y-auto mx-4 mb-3'>
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
			<div style={{ display: previewImages.length > 0 ? "flex" : "none" }} className='mx-4 mb-2 h-[8vh] flex flex-row gap-4'>
				{
					previewImages.map((data, index) => (
						<div className='group relative'>
							<Image className='rounded-md' width={64} height={64} alt='Image' src={data.url}/>
							<div onClick={() => removePreviewImage(index)} className='hidden group-hover:flex absolute top-0 right-0 cursor-pointer'>X</div>
						</div>
					))
				}
			</div>
			<div className={(previewImages.length == 0 && "mt-[8vh] ") + "mx-4 h-[10vh]"}>
				<Textarea
					ref={textAreaRef}
					onKeyDown={e => { if (e.key == "Enter") sendMessage() }}
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder='Type your message here'
				/>
				<div className='flex justify-between my-2'>
					<div className='gap-2 flex flex-row'>
						<Popover>
							<PopoverTrigger asChild>
								<Button variant={'outline'}>
									<SmileIcon />
								</Button>
							</PopoverTrigger>
							<PopoverContent className='bg-transparent border-0'>
								<EmojiPicker
									onEmojiClick={(e) => onEmojiClick(e)}
									theme={theme == undefined ? Theme.AUTO : theme == 'system' ? Theme.AUTO : theme as Theme}
								/>
							</PopoverContent>
						</Popover>
						<Button onClick={openImageChoose} variant={'outline'}>
							<ImageIcon/>
							<Input className='hidden' ref={imageRef} type='file' accept='image/*' multiple/>
						</Button>
					</div>
					<Button disabled={(input.trim() == "" || input == null) && previewImages.length == 0}
						onClick={sendMessage}>
						<Send />
					</Button>

				</div>
			</div>
		</div>
	)
}
