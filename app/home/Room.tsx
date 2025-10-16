import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea'
import React, { KeyboardEventHandler, useEffect, useRef, useState } from 'react'
import {
	Send,
	SmileIcon,
	ArrowLeft,
	ImageIcon,
	FileCode
} from 'lucide-react'
import { useToast } from "@/components/ui/use-toast"
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { addChatDoc, addMessage, setActiveRoomId } from '@/redux/chatSlice';
import { useUser } from '../providers';
import { ChatMessage, TGiphy, TPreviewImage } from '@/lib/types';
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
import { Input } from '@/components/ui/input';
import Image from 'next/image';
import { saveFileToStorage, sleep } from '@/lib/utils';
import { config } from '@/lib/config';
import AIFeatures from '@/components/AIFeatures';
import ManageGroupDialog from '@/components/ManageGroupDialog';

export default function Room() {
	const { toast } = useToast();
	const { theme } = useTheme();

	const activeChatRoomId = useAppSelector(state => state.chat.activeChatRoomId);
	const activeRoom = useAppSelector(state => state.chat.rooms[activeChatRoomId] || {});
	const socket = useAppSelector(state => state.socket.socket);

	const dispatch = useAppDispatch();

	const user = useUser()?.user;

	const textAreaRef = useRef<HTMLTextAreaElement | null>(null);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const messagesContainerRef = useRef<HTMLDivElement>(null);
	const imageRef = useRef<HTMLInputElement | null>(null);

	const [input, setInput] = useState<string>("");
	const [prevMsgCnt, setPrevMsgCnt] = useState<number>(activeRoom?.messages?.length || 0);
	const [isNewChatDocLoading, setIsNewChatDocLoading] = useState<Boolean>(false);
	const [previewImages, setPreviewImages] = useState<TPreviewImage[]>([]);

	const [giphySearchText, setGiphySearchText] = useState('');
	const [gifList, setGifList] = useState<TGiphy[]>([]);
	const [lastMessageContent, setLastMessageContent] = useState<string>('');

	useEffect(() => {
		searchGiphy();
	}, []);

	// Track last message for smart replies
	useEffect(() => {
		if (activeRoom && activeRoom?.messages?.length > 0) {
			const lastMsg = activeRoom.messages[activeRoom.messages.length - 1];
			if (lastMsg && !lastMsg.isDate && lastMsg.chatInfo) {
				setLastMessageContent(lastMsg.chatInfo);
			}
		}
	}, [activeRoom?.messages]);

	useEffect(() => {
		if (activeChatRoomId != "") {
			textAreaRef.current?.focus();

		}
	}, [activeChatRoomId]);

	useEffect(() => {
		setTimeout(() => {
			if(!messagesContainerRef.current || isNewChatDocLoading) return;
			setPrevMsgCnt(activeRoom.messages.length);

			scrollToBottom();
		}, 500);
	}, [activeRoom?.messages]);

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
			const id = (Date.now() * Math.floor(Math.random() * 1000));
			const storagePath = `${activeChatRoomId}/${id}`;
			const downloadUrl = await saveFileToStorage(data.file, storagePath, user.uid);

			const chatMessage: ChatMessage = {
				id,
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

		if ((input.trim() == "" || input == null)) return;

		const chatMessage: ChatMessage = {
			id: (Date.now() * Math.floor(Math.random() * 1000)),
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

	const sendGiphy = (url: string) => {
		if (!user) {
			toast({
				title: "Error",
				description: "User not logged in"
			})
			return;
		}

		const chatMessage: ChatMessage = {
			id: (Date.now() * Math.floor(Math.random() * 1000)),
			roomId: activeChatRoomId,
			type: 'gif',
			chatInfo: url,
			userUid: user.uid,
			userName: user.name,
			userPhoto: user.photo_url,
			time: new Date()
		}

		dispatch(sendMessageToServer(chatMessage))
	}

	const scrollToBottom = () => {
		if (messagesEndRef.current) {
			messagesEndRef.current.scrollIntoView({ behavior: 'smooth' })
		}
	};

	const handleScroll = () => {
		if (messagesContainerRef.current) {
			const container = messagesContainerRef.current;

			if (container.scrollTop === 0) {				
				const currentPosition = container.scrollHeight;
				if (!socket) return;

				setIsNewChatDocLoading(true);
				const roomId = activeChatRoomId;
				const curChatDocId = activeRoom?.messages?.[1]?.chatDocId;
				socket.emit('load_chat_doc_from_db', { roomId, curChatDocId }, async (response: any) => {
					if (response.success) {
						dispatch(addChatDoc({ messages: response.chat_history, roomId }))
						await sleep(100)
						container.scrollTop = container.scrollHeight - currentPosition
						setIsNewChatDocLoading(false);
					} else {
						console.log(response);
					}
				})
			}
		}
	};

	function onEmojiClick(e: EmojiClickData) {
		if (textAreaRef.current == null) return;

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

		imageRef.current.onchange = (e: any) => {
			const files = e.target?.files;
			if (files) {
				const imageData: TPreviewImage[] = Array.from(files).map((file: any) => {
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

	function removePreviewImage(index: number) {
		let newPreviewImages = [...previewImages]
		newPreviewImages.splice(index, 1);
		setPreviewImages(newPreviewImages);
	}


	async function searchGiphy() {
		const search = giphySearchText.trim()
		const url = search.length == 0
			? `https://api.giphy.com/v1/gifs/trending?api_key=${config.giphyApiKey}`
			: `https://api.giphy.com/v1/gifs/search?api_key=${config.giphyApiKey}&q=${search}`


		const res = await fetch(url).then(res => res.json());
		const newGifList: TGiphy[] = res.data.map((data: any) => {
			return {
				url: data.images.fixed_width_downsampled.url,
				height: data.images.fixed_width_downsampled.height,
				width: data.images.fixed_width_downsampled.width
			}
		})

		setGifList(newGifList)
	}

	async function handleSearchGiphyWithEnter(e: React.KeyboardEvent<HTMLInputElement>) {
		if (e.keyCode === 13 && !e.shiftKey) {
			e.preventDefault();
			searchGiphy();
		}
	}

	return (
		<div className='w-full h-full flex flex-col overflow-hidden'>
			{/* Header */}
			<div className='bg-card w-full px-2 py-3 flex flex-row items-center justify-start gap-4 flex-shrink-0 border-b'>
				<Button onClick={handleBackButton} variant={'ghost'} className='block sm:hidden'>
					<ArrowLeft />
				</Button>
				<Avatar>
					<AvatarImage src={activeRoom.photo_url} className='h-10 w-10 rounded-full' />
				</Avatar>
				<p>{activeRoom.name}</p>
				{activeRoom.is_group && (
					<div className='ml-auto'>
						<ManageGroupDialog room={activeRoom} allFriends={useUser()?.user?.friend_list || []} />
					</div>
				)}
			</div>
			
			{/* Messages Container */}
			<div
				ref={messagesContainerRef}
				onScroll={handleScroll}
				className='flex-1 overflow-y-auto px-4 py-3'>
				{
					activeRoom?.messages?.map((message, index) => (
						<ChatBubble
							key={index}
							message={message}
							isGroup={activeRoom.is_group}
						/>
					))
				}
				<div ref={messagesEndRef} />
			</div>
			
			{/* Input Section - Fixed at bottom */}
			<div className='flex-shrink-0 border-t bg-card'>
				{/* Preview Images */}
				{previewImages.length > 0 && (
					<div className='px-4 pt-2 flex flex-row gap-4 overflow-x-auto'>
						{
							previewImages.map((data, index) => (
								<div key={index} className='group relative flex-shrink-0'>
									<Image className='rounded-md' width={64} height={64} alt='Image' src={data.url} />
									<div onClick={() => removePreviewImage(index)} className='hidden group-hover:flex absolute top-0 right-0 cursor-pointer'>X</div>
								</div>
							))
						}
					</div>
				)}
				
				{/* AI Features Component */}
				<AIFeatures 
					input={input}
					setInput={setInput}
					onAISend={scrollToBottom}
					lastMessage={lastMessageContent}
				/>
				
				{/* Input Area */}
				<div className='px-4 pb-3'>
					<Textarea
						ref={textAreaRef}
						onKeyDown={e => { if (e.key == "Enter") sendMessage() }}
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder='Type your message here'
						className='min-h-[60px] max-h-[120px]'
					/>
					<div className='flex justify-between mt-2'>
						<div className='gap-2 flex flex-row'>
							<Popover>
								<PopoverTrigger asChild>
									<Button variant={'outline'} size='sm'>
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
							<Button onClick={openImageChoose} variant={'outline'} size='sm'>
								<ImageIcon />
								<Input className='hidden' ref={imageRef} type='file' accept='image/*' multiple />
							</Button>
							<Popover>
								<PopoverTrigger asChild>
									<Button variant={'outline'} size='sm'>
										<FileCode />
									</Button>
								</PopoverTrigger>
								<PopoverContent className='w-80'>
									<Input
										placeholder='Search'
										value={giphySearchText}
										onChange={e => setGiphySearchText(e.target.value)}
										onKeyDown={e => handleSearchGiphyWithEnter(e)} />
									<div id='giphy-grid' className='grid h-80 overflow-y-auto grid-cols-3 mt-4 gap-4'>
										{
											gifList.map((gif, index) => (
												<div key={index} onClick={() => sendGiphy(gif.url)} className='hover:cursor-pointer'>
													<Image unoptimized alt='gif' key={index} src={gif.url} height={gif.height} width={gif.width} />
												</div>
											))
										}
									</div>
								</PopoverContent>
							</Popover>
						</div>
						<Button disabled={(input.trim() == "" || input == null) && previewImages.length == 0}
							onClick={sendMessage}
							size='sm'>
							<Send />
						</Button>
					</div>
				</div>
			</div>
		</div>
	)
}
