import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock, Repeat, Send } from 'lucide-react';
import { useToast } from "@/components/ui/use-toast";
import { useAppDispatch, useAppSelector } from '@/redux/store';
import { scheduleMessage } from '@/redux/socketSlice';
import { TScheduleMessageRequest } from '@/lib/types';
import { useUser } from '@/app/providers';

interface ScheduleMessageDialogProps {
	roomId: string;
	children: React.ReactNode;
}

export default function ScheduleMessageDialog({ roomId, children }: ScheduleMessageDialogProps) {
	const { toast } = useToast();
	const dispatch = useAppDispatch();
	const user = useUser()?.user;
	
	const [open, setOpen] = useState(false);
	const [message, setMessage] = useState('');
	const [scheduledTime, setScheduledTime] = useState('');
	const [recurring, setRecurring] = useState(false);
	const [recurringPattern, setRecurringPattern] = useState<'daily' | 'weekly' | 'monthly'>('daily');
	const [timezone, setTimezone] = useState('UTC');
	const [loading, setLoading] = useState(false);

	// Auto-detect user's timezone
	useEffect(() => {
		const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
		setTimezone(userTimezone);
	}, []);

	const handleSchedule = async () => {
		if (!user) {
			toast({
				title: "Error",
				description: "User not found"
			});
			return;
		}
		const userUid = user.uid;
		if (!message.trim()) {
			toast({
				title: "Error",
				description: "Message cannot be empty"
			});
			return;
		}

		if (!scheduledTime) {
			toast({
				title: "Error",
				description: "Please select a scheduled time"
			});
			return;
		}

		const scheduledDateTime = new Date(scheduledTime);
		if (scheduledDateTime <= new Date()) {
			toast({
				title: "Error",
				description: "Scheduled time must be in the future"
			});
			return;
		}

		setLoading(true);

		try {
			const scheduledMessageData: TScheduleMessageRequest = {
				userUid: userUid,
				roomId,
				message: message.trim(),
				messageType: 'text',
				scheduledTime: scheduledDateTime.toISOString(),
				recurring,
				recurringPattern: recurring ? recurringPattern : undefined,
				timezone
			};

			dispatch(scheduleMessage(scheduledMessageData));

			toast({
				title: "Success",
				description: "Message scheduled successfully"
			});

			// Reset form
			setMessage('');
			setScheduledTime('');
			setRecurring(false);
			setRecurringPattern('daily');
			setOpen(false);
		} catch (error) {
			toast({
				title: "Error",
				description: "Failed to schedule message"
			});
		} finally {
			setLoading(false);
		}
	};

	const getMinDateTime = () => {
		const now = new Date();
		now.setMinutes(now.getMinutes() + 1); // At least 1 minute in the future
		// Convert to local datetime-local format (YYYY-MM-DDTHH:MM)
		// Use toLocaleString to get the local time in the correct format
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		const hours = String(now.getHours()).padStart(2, '0');
		const minutes = String(now.getMinutes()).padStart(2, '0');
		return `${year}-${month}-${day}T${hours}:${minutes}`;
	};

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				{children}
			</DialogTrigger>
			<DialogContent className="sm:max-w-[425px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<Clock className="h-5 w-5" />
						Schedule Message
					</DialogTitle>
					<DialogDescription>
						Schedule a message to be sent at a specific time in the future.
					</DialogDescription>
				</DialogHeader>
				<div className="grid gap-4 py-4">
					<div className="grid gap-2">
						<Label htmlFor="message">Message</Label>
						<Textarea
							id="message"
							placeholder="Type your message here..."
							value={message}
							onChange={(e) => setMessage(e.target.value)}
							className="min-h-[80px]"
						/>
					</div>
					
					<div className="grid gap-2">
						<Label htmlFor="scheduledTime">Scheduled Time</Label>
						<Input
							id="scheduledTime"
							type="datetime-local"
							value={scheduledTime}
							onChange={(e) => setScheduledTime(e.target.value)}
							min={getMinDateTime()}
						/>
					</div>

					<div className="flex items-center space-x-2">
						<input
							type="checkbox"
							id="recurring"
							checked={recurring}
							onChange={(e) => setRecurring(e.target.checked)}
							className="rounded"
						/>
						<Label htmlFor="recurring" className="flex items-center gap-2">
							<Repeat className="h-4 w-4" />
							Recurring Message
						</Label>
					</div>

					{recurring && (
						<div className="grid gap-2">
							<Label htmlFor="recurringPattern">Repeat Pattern</Label>
							<Select value={recurringPattern} onValueChange={(value: 'daily' | 'weekly' | 'monthly') => setRecurringPattern(value)}>
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
						<Label htmlFor="timezone">Timezone</Label>
						<div className="flex items-center gap-2 p-2 bg-muted rounded-md">
							<Clock className="h-4 w-4 text-muted-foreground" />
							<span className="text-sm text-muted-foreground">
								{timezone} (Auto-detected)
							</span>
						</div>
					</div>
				</div>
				<DialogFooter>
					<Button variant="outline" onClick={() => setOpen(false)}>
						Cancel
					</Button>
					<Button onClick={handleSchedule} disabled={loading || !message.trim() || !scheduledTime}>
						{loading ? 'Scheduling...' : 'Schedule Message'}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

