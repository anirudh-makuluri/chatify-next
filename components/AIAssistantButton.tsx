'use client'
import React, { useState } from 'react'
import { Button } from './ui/button'
import { Bot, Loader2 } from 'lucide-react'
import { useUser } from '@/app/providers'
import { useAppDispatch, useAppSelector } from '@/redux/store'
import { joinChatRoom, setActiveRoomId } from '@/redux/chatSlice'
import { joinSocketRoom } from '@/redux/socketSlice'
import { TAIRoomResponse, TRoomData } from '@/lib/types'
import { globals } from '@/globals'
import { useToast } from './ui/use-toast'

export default function AIAssistantButton() {
	const user = useUser()?.user
	const dispatch = useAppDispatch()
	const rooms = useAppSelector(state => state.chat.rooms)
	const { toast } = useToast()
	
	const [isCreating, setIsCreating] = useState(false)

	// Check if AI room already exists
	const aiRoom = user?.rooms?.find(room => room.is_ai_room === true)

	const createAndOpenAIRoom = async () => {
		if (!user) {
			toast({
				title: "Error",
				description: "You must be logged in to chat with AI",
				variant: "destructive"
			})
			return
		}

		// If AI room already exists, just open it
		if (aiRoom) {
			// Check if room is already in Redux state
			if (rooms[aiRoom.roomId]) {
				dispatch(setActiveRoomId(aiRoom.roomId))
				return
			}

			// If not in Redux, join it first
			dispatch(joinSocketRoom(aiRoom.roomId))
			dispatch(joinChatRoom(aiRoom))
			dispatch(setActiveRoomId(aiRoom.roomId))
			return
		}

		// Create new AI room
		setIsCreating(true)

		try {
			const response = await fetch(`${globals.BACKEND_URL}/users/${user.uid}/ai-assistant/room`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				}
			})

			const data: TAIRoomResponse = await response.json()

			if (data.success && data.room) {
				// Add room to Redux state
				dispatch(joinSocketRoom(data.roomId!))
				dispatch(joinChatRoom(data.room))
				dispatch(setActiveRoomId(data.roomId!))

				// Update user's rooms list locally
				const updatedRooms = [...(user.rooms || []), data.room]
				// You might want to update the user context here as well
				// updateUser({ rooms: updatedRooms })

				toast({
					title: "AI Assistant Ready",
					description: "You can now chat with the AI assistant!",
				})
			} else {
				toast({
					title: "Error",
					description: data.error || "Failed to create AI assistant room",
					variant: "destructive"
				})
			}
		} catch (error) {
			console.error('Error creating AI room:', error)
			toast({
				title: "Error",
				description: "Failed to create AI assistant room",
				variant: "destructive"
			})
		} finally {
			setIsCreating(false)
		}
	}

	return (
		<Button
			onClick={createAndOpenAIRoom}
			disabled={isCreating}
			className="w-full mb-2 bg-gradient-to-r from-purple-500 to-indigo-500 hover:from-purple-600 hover:to-indigo-600 text-white shadow-lg hover:shadow-xl transition-all duration-300"
			size="lg"
		>
			{isCreating ? (
				<>
					<Loader2 className="mr-2 h-4 w-4 animate-spin" />
					Creating...
				</>
			) : (
				<>
					<Bot className="mr-2 h-4 w-4" />
					{aiRoom ? 'Chat with AI Assistant' : '✨ New AI Assistant'}
				</>
			)}
		</Button>
	)
}

