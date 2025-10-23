import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { 
	Clock, 
	Edit, 
	Trash2, 
	Repeat, 
	Calendar,
	MessageSquare,
	AlertCircle
} from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { getScheduledMessages, updateScheduledMessage, deleteScheduledMessage } from '@/redux/socketSlice';
import { setScheduledMessages, removeScheduledMessage, updateScheduledMessage as updateScheduledMessageState } from '@/redux/scheduledMessagesSlice';
import { TScheduledMessage, TUpdateScheduledMessageRequest } from '@/lib/types';

interface ScheduledMessagesListProps {
	roomId?: string;
	userUid: string;
}

export default function ScheduledMessagesList({ roomId, userUid }: ScheduledMessagesListProps) {
	const { toast } = useToast();
	const dispatch = useAppDispatch();
	const scheduledMessages = useAppSelector(state => state.scheduledMessages.scheduledMessages);
	const loading = useAppSelector(state => state.scheduledMessages.loading);
	
	const [open, setOpen] = useState(false);
	const [editingMessage, setEditingMessage] = useState<TScheduledMessage | null>(null);
	const [editForm, setEditForm] = useState({
		message: '',
		scheduledTime: '',
		recurring: false,
		recurringPattern: 'daily' as 'daily' | 'weekly' | 'monthly',
		timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
	});

	useEffect(() => {
		if (open) {
			loadScheduledMessages();
		}
	}, [open, roomId]);

	const loadScheduledMessages = () => {
		dispatch(getScheduledMessages(userUid, roomId));
	};

	const getMinDateTime = () => {
		const now = new Date();
		now.setMinutes(now.getMinutes() + 1); // At least 1 minute in the future
		// Convert to local datetime-local format (YYYY-MM-DDTHH:MM)
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		const hours = String(now.getHours()).padStart(2, '0');
		const minutes = String(now.getMinutes()).padStart(2, '0');
		return `${year}-${month}-${day}T${hours}:${minutes}`;
	};

	const handleEdit = (message: TScheduledMessage) => {
		setEditingMessage(message);
		// Convert the scheduled time to local datetime-local format
		const localDateTime = new Date(message.scheduledTime);
		// Format as YYYY-MM-DDTHH:MM for datetime-local input
		const year = localDateTime.getFullYear();
		const month = String(localDateTime.getMonth() + 1).padStart(2, '0');
		const day = String(localDateTime.getDate()).padStart(2, '0');
		const hours = String(localDateTime.getHours()).padStart(2, '0');
		const minutes = String(localDateTime.getMinutes()).padStart(2, '0');
		const localDateTimeString = `${year}-${month}-${day}T${hours}:${minutes}`;
		
		setEditForm({
			message: message.message,
			scheduledTime: localDateTimeString,
			recurring: message.recurring,
			recurringPattern: message.recurringPattern || 'daily',
			timezone: message.timezone
		});
	};

	const handleUpdate = async () => {
		if (!editingMessage) return;

		if (!editForm.message.trim()) {
			toast({
				title: "Error",
				description: "Message cannot be empty"
			});
			return;
		}

		if (!editForm.scheduledTime) {
			toast({
				title: "Error",
				description: "Please select a scheduled time"
			});
			return;
		}

		const scheduledDateTime = new Date(editForm.scheduledTime);
		if (scheduledDateTime <= new Date()) {
			toast({
				title: "Error",
				description: "Scheduled time must be in the future"
			});
			return;
		}

		try {
			const updates: TUpdateScheduledMessageRequest = {
				message: editForm.message.trim(),
				scheduledTime: scheduledDateTime.toISOString(),
				recurring: editForm.recurring,
				recurringPattern: editForm.recurring ? editForm.recurringPattern : undefined,
				timezone: editForm.timezone
			};

			dispatch(updateScheduledMessage(editingMessage.id, updates, userUid));
			
			toast({
				title: "Success",
				description: "Scheduled message updated successfully"
			});

			setEditingMessage(null);
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to update scheduled message"
			});
		}
	};

	const handleDelete = async (messageId: string) => {
		try {
			dispatch(deleteScheduledMessage(messageId, userUid));
			
			toast({
				title: "Success",
				description: "Scheduled message deleted successfully"
			});
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to delete scheduled message"
			});
		}
	};

	const formatDateTime = (date: Date | string) => {
		// Ensure we have a valid Date object
		let dateObj: Date;
		if (date instanceof Date) {
			dateObj = date;
		} else if (typeof date === 'string') {
			dateObj = new Date(date);
		} else {
			console.error('Invalid date type:', typeof date, date);
			return 'Invalid date';
		}
		
		// Check if the date is valid
		if (isNaN(dateObj.getTime())) {
			console.error('Invalid date value:', date);
			return 'Invalid date';
		}
		
		return new Intl.DateTimeFormat('en-US', {
			year: 'numeric',
			month: 'short',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit',
			timeZoneName: 'short'
		}).format(dateObj);
	};

	const getStatusColor = (status: string) => {
		switch (status) {
			case 'pending':
				return 'bg-yellow-100 text-yellow-800';
			case 'sent':
				return 'bg-green-100 text-green-800';
			case 'cancelled':
				return 'bg-red-100 text-red-800';
			default:
				return 'bg-gray-100 text-gray-800';
		}
	};

	const filteredMessages = roomId 
		? scheduledMessages.filter(msg => msg.roomId === roomId)
		: scheduledMessages;

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button variant="outline" size="sm" className="flex items-center gap-2">
					<Clock className="h-4 w-4" />
					Scheduled Messages
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-hidden flex flex-col">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Clock className="h-5 w-5" />
						Scheduled Messages
					</DialogTitle>
					<DialogDescription>
						Manage your scheduled messages
					</DialogDescription>
				</DialogHeader>
				
				<div className="flex-1 overflow-y-auto">
					{loading ? (
						<div className="flex items-center justify-center py-8">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
						</div>
					) : filteredMessages.length === 0 ? (
						<div className="flex flex-col items-center justify-center py-8 text-center">
							<MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
							<p className="text-muted-foreground">No scheduled messages found</p>
						</div>
					) : (
						<div className="space-y-4">
							{filteredMessages.map((message) => (
								<Card key={message.id} className="relative">
									<CardHeader className="pb-3">
										<div className="flex items-start justify-between">
											<div className="flex-1">
												<CardTitle className="text-sm font-medium line-clamp-2">
													{message.message}
												</CardTitle>
												<CardDescription className="flex items-center gap-2 mt-1">
													<Calendar className="h-3 w-3" />
													{formatDateTime(message.scheduledTime)}
													{message.recurring && (
														<>
															<Repeat className="h-3 w-3" />
															<span className="capitalize">{message.recurringPattern}</span>
														</>
													)}
												</CardDescription>
											</div>
											<div className="flex items-center gap-2 ml-4">
												<Badge className={getStatusColor(message.status)}>
													{message.status}
												</Badge>
												{message.status === 'pending' && (
													<div className="flex gap-1">
														<Button
															variant="ghost"
															size="sm"
															onClick={() => handleEdit(message)}
															className="h-8 w-8 p-0"
														>
															<Edit className="h-3 w-3" />
														</Button>
														<Button
															variant="ghost"
															size="sm"
															onClick={() => handleDelete(message.id)}
															className="h-8 w-8 p-0 text-destructive hover:text-destructive"
														>
															<Trash2 className="h-3 w-3" />
														</Button>
													</div>
												)}
											</div>
										</div>
									</CardHeader>
								</Card>
							))}
						</div>
					)}
				</div>

				{/* Edit Message Dialog */}
				<Dialog open={!!editingMessage} onOpenChange={() => setEditingMessage(null)}>
					<DialogContent className="sm:max-w-[425px]">
						<DialogHeader>
							<DialogTitle>Edit Scheduled Message</DialogTitle>
							<DialogDescription>
								Update your scheduled message details.
							</DialogDescription>
						</DialogHeader>
						<div className="grid gap-4 py-4">
							<div className="grid gap-2">
								<Label htmlFor="edit-message">Message</Label>
								<Textarea
									id="edit-message"
									placeholder="Type your message here..."
									value={editForm.message}
									onChange={(e) => setEditForm({ ...editForm, message: e.target.value })}
									className="min-h-[80px]"
								/>
							</div>
							
							<div className="grid gap-2">
								<Label htmlFor="edit-scheduledTime">Scheduled Time</Label>
								<Input
									id="edit-scheduledTime"
									type="datetime-local"
									value={editForm.scheduledTime}
									onChange={(e) => setEditForm({ ...editForm, scheduledTime: e.target.value })}
									min={getMinDateTime()}
								/>
							</div>

							<div className="flex items-center space-x-2">
								<input
									type="checkbox"
									id="edit-recurring"
									checked={editForm.recurring}
									onChange={(e) => setEditForm({ ...editForm, recurring: e.target.checked })}
									className="rounded"
								/>
								<Label htmlFor="edit-recurring" className="flex items-center gap-2">
									<Repeat className="h-4 w-4" />
									Recurring Message
								</Label>
							</div>

							{editForm.recurring && (
								<div className="grid gap-2">
									<Label htmlFor="edit-recurringPattern">Repeat Pattern</Label>
									<Select 
										value={editForm.recurringPattern} 
										onValueChange={(value: 'daily' | 'weekly' | 'monthly') => 
											setEditForm({ ...editForm, recurringPattern: value })
										}
									>
										<SelectTrigger>
											<SelectValue placeholder="Select repeat pattern" />
										</SelectTrigger>
										<SelectContent>
											<SelectItem value="daily">Daily</SelectItem>
											<SelectItem value="weekly">Weekly</SelectItem>
											<SelectItem value="monthly">Monthly</SelectItem>
										</SelectContent>
									</Select>
								</div>
							)}

							<div className="grid gap-2">
								<Label htmlFor="edit-timezone">Timezone</Label>
								<div className="flex items-center gap-2 p-2 bg-muted rounded-md">
									<Clock className="h-4 w-4 text-muted-foreground" />
									<span className="text-sm text-muted-foreground">
										{editForm.timezone} (Auto-detected)
									</span>
								</div>
							</div>
						</div>
						<div className="flex justify-end gap-2">
							<Button variant="outline" onClick={() => setEditingMessage(null)}>
								Cancel
							</Button>
							<Button onClick={handleUpdate}>
								Update Message
							</Button>
						</div>
					</DialogContent>
				</Dialog>
			</DialogContent>
		</Dialog>
	);
}

