'use client'
import React, { useState, useEffect } from 'react'
import { Button } from './ui/button'
import { Sparkles, MessageSquare, Lightbulb } from 'lucide-react'
import { useAppSelector } from '@/redux/store'
import { useUser } from '@/app/providers'
import { TAISmartRepliesResponse, TAISummaryResponse, TAIResponse } from '@/lib/types'
import { Badge } from './ui/badge'
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog"
import { useToast } from './ui/use-toast'

interface AIFeaturesProps {
	input: string
	setInput: (value: string) => void
	onAISend?: () => void
	lastMessage?: string
}

export default function AIFeatures({ input, setInput, onAISend, lastMessage }: AIFeaturesProps) {
	const socket = useAppSelector(state => state.socket.socket)
	const activeChatRoomId = useAppSelector(state => state.chat.activeChatRoomId)
	const activeRoom = useAppSelector(state => state.chat.rooms[activeChatRoomId])
	const user = useUser()?.user
	const { toast } = useToast()

	const [smartReplies, setSmartReplies] = useState<string[]>([])
	const [isAIThinking, setIsAIThinking] = useState(false)
	const [showSummaryDialog, setShowSummaryDialog] = useState(false)
	const [summary, setSummary] = useState('')
	const [isGeneratingSummary, setIsGeneratingSummary] = useState(false)

	// Generate smart replies when a new message arrives from someone else
	useEffect(() => {
		if (!lastMessage || !socket || !activeChatRoomId) return

		// Only generate smart replies if the last message is not from the current user or AI
		const messages = activeRoom?.messages || []
		const lastMsg = messages[messages.length - 1]
		
		if (lastMsg && !lastMsg.isDate && lastMsg.userUid !== user?.uid && lastMsg.userUid !== 'ai-assistant') {
			generateSmartReplies(lastMsg.chatInfo)
		}
	}, [lastMessage])

	const generateSmartReplies = (message?: string) => {
		if (!socket || !message) return

		socket.emit('ai_smart_replies', {
			message: message,
			roomId: activeChatRoomId
		}, (response: TAISmartRepliesResponse) => {
			if (response.success && response.replies) {
				setSmartReplies(response.replies)
			}
		})
	}

	const handleAskAI = () => {
		if (!socket || !user) return
		if (!input.trim()) {
			toast({
				title: "Empty message",
				description: "Please type a message to send to AI",
				variant: "destructive"
			})
			return
		}

		setIsAIThinking(true)
		setSmartReplies([]) // Clear smart replies when asking AI

		socket.emit('ai_chat_request', {
			message: input,
			roomId: activeChatRoomId
		}, (response: TAIResponse) => {
			setIsAIThinking(false)

			if (response.success) {
				setInput('') // Clear input on success
				if (onAISend) onAISend()
				toast({
					title: "AI is responding",
					description: "The AI assistant is typing a response...",
				})
			} else {
				toast({
					title: "AI Error",
					description: response.error || "Failed to get AI response",
					variant: "destructive"
				})
			}
		})
	}

	const handleSmartReply = (reply: string) => {
		setInput(reply)
		setSmartReplies([])
	}

	const handleSummarize = () => {
		if (!socket) return

		setIsGeneratingSummary(true)
		setShowSummaryDialog(true)

		socket.emit('ai_summarize_conversation', {
			roomId: activeChatRoomId
		}, (response: TAISummaryResponse) => {
			setIsGeneratingSummary(false)

			if (response.success && response.summary) {
				setSummary(response.summary)
			} else {
				setSummary('Failed to generate summary: ' + (response.error || 'Unknown error'))
			}
		})
	}

	// Don't show AI features if the room itself is an AI room (to avoid recursion)
	const isAIRoom = activeRoom?.is_ai_room || false

	return (
		<div className="ai-features-container pt-2">
			{/* Smart Replies */}
			{smartReplies.length > 0 && !isAIRoom && (
				<div className="smart-replies-container mb-2 px-4">
					<div className="flex items-center gap-2 mb-1">
						<Lightbulb size={14} className="text-purple-500" />
						<span className="text-xs text-muted-foreground">Quick replies:</span>
					</div>
					<div className="flex flex-wrap gap-2">
						{smartReplies.map((reply, index) => (
							<Badge
								key={index}
								variant="outline"
								className="cursor-pointer hover:bg-purple-500 hover:text-white transition-all duration-200 hover:scale-105 px-2 py-0.5 text-xs"
								onClick={() => handleSmartReply(reply)}
							>
								{reply}
							</Badge>
						))}
					</div>
				</div>
			)}

			{/* AI Action Buttons */}
			<div className="ai-actions flex gap-2 px-4 pb-2">
				{!isAIRoom && (
					<Button
						variant="outline"
						size="sm"
						onClick={handleAskAI}
						disabled={isAIThinking || !input.trim()}
						className="hidden ask-ai-btn group border-purple-500/50 hover:bg-gradient-to-r hover:from-purple-500 hover:to-indigo-500 hover:text-white transition-all duration-300"
					>
						<Sparkles size={16} className="mr-1" />
						{isAIThinking ? '🤔 AI Thinking...' : 'Ask AI'}
					</Button>
				)}
				
				<Button
					variant="outline"
					size="sm"
					onClick={handleSummarize}
					className="group border-blue-500/50 hover:bg-gradient-to-r hover:from-blue-500 hover:to-cyan-500 hover:text-white transition-all duration-300"
					title="Summarize conversation"
				>
					<MessageSquare size={16} className="mr-1" />
					Summarize
				</Button>
			</div>

			{/* AI Thinking Indicator */}
			{isAIThinking && (
				<div className="ai-thinking-indicator flex items-center gap-2 px-4 pb-2">
					<div className="typing-dots flex gap-1">
						<span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
						<span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
						<span className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
					</div>
					<span className="text-xs text-muted-foreground">AI is thinking...</span>
				</div>
			)}

			{/* Summary Dialog */}
			<Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
				<DialogContent className="sm:max-w-[600px]">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							<MessageSquare className="text-blue-500" />
							Conversation Summary
						</DialogTitle>
						<DialogDescription>
							AI-generated summary of your conversation
						</DialogDescription>
					</DialogHeader>
					<div className="py-4">
						{isGeneratingSummary ? (
							<div className="flex flex-col items-center justify-center gap-4 py-8">
								<div className="typing-dots flex gap-2">
									<span className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
									<span className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
									<span className="w-3 h-3 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
								</div>
								<p className="text-sm text-muted-foreground">Generating summary...</p>
							</div>
						) : (
							<div className="bg-secondary/50 rounded-lg p-4">
								<p className="text-sm leading-relaxed">{summary}</p>
							</div>
						)}
					</div>
					<div className="flex justify-end">
						<Button onClick={() => setShowSummaryDialog(false)}>
							Close
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</div>
	)
}

