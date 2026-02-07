/**
 * Example Component: Encrypted Chat Room with E2EE
 * This demonstrates how to use the E2EE system in a real component
 */

'use client';

import React, { useEffect, useState } from 'react';
import {
	useE2EEInitialization,
	useFetchGroupMemberPublicKeys,
	useEncryptGroupMessage,
	useSendEncryptedGroupMessage,
	useDecryptMessage,
	useDeviceId,
	useE2EEError,
} from '@/lib/hooks/useE2EE';
import { useAppSelector } from '@/redux/store';
import { selectGroupMemberPublicKeys } from '@/redux/e2eeSlice';
import { toast } from '@/components/ui/use-toast';

interface EncryptedChatMessage {
	id: string;
	senderId: string;
	senderName: string;
	timestamp: Date;
	encryptedContent: {
		ciphertext: string;
		iv: string;
	};
}

interface ChatRoomProps {
	groupId: string;
	userId: string;
	userName: string;
	messages: EncryptedChatMessage[];
	memberPublicKeys: { [userId: string]: { [deviceId: string]: string } };
}

/**
 * Example: Encrypted Chat Input Component
 */
export function EncryptedChatInput({
	groupId,
	userId,
	onMessageSent,
}: {
	groupId: string;
	userId: string;
	onMessageSent: (messageId: string) => void;
}) {
	const [message, setMessage] = useState('');
	const [isSending, setIsSending] = useState(false);

	const { encrypt, loading: encryptLoading } = useEncryptGroupMessage(groupId);
	const { send, loading: sendLoading } = useSendEncryptedGroupMessage(groupId);
	const { memberPublicKeys, fetch: fetchKeys } = useFetchGroupMemberPublicKeys(groupId);
	const e2eeError = useE2EEError();

	// Fetch keys when component mounts
	useEffect(() => {
		const loadKeys = async () => {
			try {
				await fetchKeys();
			} catch (error) {
				console.error('Failed to load encryption keys:', error);
				toast({ 
					title: 'Error', 
					description: 'Failed to load encryption keys',
					variant: 'destructive'
				});
			}
		};
		loadKeys();
	}, [groupId, fetchKeys]);

	const handleSendMessage = async () => {
		if (!message.trim()) return;

		try {
			setIsSending(true);

			// Step 1: Encrypt message for all recipient devices
			const encrypted = encrypt(message);

			if (!encrypted || Object.keys(encrypted).length === 0) {
				throw new Error('No recipients available. Encryption failed.');
			}

			// Step 2: Send encrypted message to server
			const response = await send(message, encrypted, userId);

			// Step 3: Clear input and show success
			setMessage('');
			toast({ 
				description: 'Message sent securely' 
			});
			onMessageSent(response.messageId);
		} catch (error) {
			console.error('Failed to send encrypted message:', error);
			toast({ 
				title: 'Error',
				description: error instanceof Error ? error.message : 'Failed to send message',
				variant: 'destructive'
			});
		} finally {
			setIsSending(false);
		}
	};

	const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === 'Enter' && e.ctrlKey) {
			handleSendMessage();
		}
	};

	return (
		<div className="chat-input-container">
			<textarea
				value={message}
				onChange={(e) => setMessage(e.target.value)}
				onKeyPress={handleKeyPress}
				placeholder="Type a message... (Ctrl+Enter to send securely)"
				disabled={encryptLoading || sendLoading || isSending}
				rows={3}
				className="w-full p-2 border rounded text-black"
			/>

			<div className="flex gap-2 mt-2">
				<button
					onClick={handleSendMessage}
					disabled={
						!message.trim() ||
						encryptLoading ||
						sendLoading ||
						isSending ||
						!memberPublicKeys
					}
					className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
				>
					{isSending || sendLoading ? 'Sending...' : '🔒 Send Encrypted'}
				</button>

				<span className="text-sm text-gray-500 mt-2">
					{memberPublicKeys
						? `Encrypting for ${Object.keys(memberPublicKeys).length} members`
						: 'Loading encryption keys...'}
				</span>
			</div>

			{e2eeError && (
				<div className="mt-2 p-2 bg-red-100 text-red-800 rounded">
					Encryption Error: {e2eeError}
				</div>
			)}
		</div>
	);
}

/**
 * Example: Encrypted Chat Message Display Component
 */
export function EncryptedChatMessage({
	message,
	senderPublicKey,
	groupId,
	isOwnMessage,
}: {
	message: EncryptedChatMessage;
	senderPublicKey: string;
	groupId: string;
	isOwnMessage: boolean;
}) {
	const [decryptedText, setDecryptedText] = useState<string | null>(null);
	const [decryptError, setDecryptError] = useState<string | null>(null);
	const { decrypt } = useDecryptMessage();

	useEffect(() => {
		const decryptAsync = async () => {
			try {
				setDecryptError(null);

				const decrypted = decrypt(
					message.encryptedContent.ciphertext,
					message.encryptedContent.iv,
					senderPublicKey,
					groupId
				);

				if (decrypted) {
					setDecryptedText(decrypted);
				} else {
					setDecryptError('Decryption returned empty');
				}
			} catch (error) {
				const errorMsg = error instanceof Error ? error.message : 'Decryption failed';
				setDecryptError(errorMsg);
				console.error('Message decryption failed:', error);
			}
		};

		decryptAsync();
	}, [message, senderPublicKey, groupId, decrypt]);

	return (
		<div className={`chat-message ${isOwnMessage ? 'own-message' : 'other-message'}`}>
			<div className="flex gap-2">
				<div className="flex-1">
					{decryptError ? (
						<div className="p-2 bg-red-100 text-red-800 rounded">
							🔓 Failed to decrypt: {decryptError}
						</div>
					) : decryptedText === null ? (
						<div className="p-2 bg-gray-100 text-gray-600 rounded">
							🔒 Decrypting... (end-to-end encrypted)
						</div>
					) : (
						<div className="p-2 bg-white rounded border">
							<p>{decryptedText}</p>
							<small className="text-gray-500">
								{message.timestamp.toLocaleTimeString()}
							</small>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

/**
 * Example: Main Encrypted Chat Room Component
 */
export function EncryptedChatRoom({
	groupId,
	userId,
	userName,
	messages,
	memberPublicKeys,
}: ChatRoomProps) {
	// Initialize E2EE on mount
	const e2eeInitialized = useE2EEInitialization();
	const deviceId = useDeviceId();
	const groupMemberKeys = useAppSelector(selectGroupMemberPublicKeys(groupId));
	const [messageList, setMessageList] = useState(messages);

	useEffect(() => {
		setMessageList(messages);
	}, [messages]);

	if (!e2eeInitialized) {
		return <div>Initializing encryption...</div>;
	}

	return (
		<div className="flex flex-col h-full bg-white">
			{/* Header */}
			<div className="bg-blue-600 text-white p-4">
				<h1 className="text-xl font-bold">Encrypted Chat: {groupId}</h1>
				<p className="text-sm">
					🔒 End-to-end encrypted | Device ID: {deviceId?.slice(0, 8)}...
				</p>
			</div>

			{/* Messages Container */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4">
				{messageList.length === 0 ? (
					<div className="text-center text-gray-500 mt-8">
						No messages yet. Start the conversation!
					</div>
				) : (
					messageList.map((msg) => {
						const senderPublicKey =
							groupMemberKeys?.[msg.senderId]?.[msg.senderId];

						return (
							<div key={msg.id}>
								<div className="font-semibold text-sm text-gray-700">
									{msg.senderName}
									{msg.senderId === userId && (
										<span className="ml-2 text-xs bg-blue-200 px-2 py-1 rounded">
											You
										</span>
									)}
								</div>
								{senderPublicKey ? (
									<EncryptedChatMessage
										message={msg}
										senderPublicKey={senderPublicKey}
										groupId={groupId}
										isOwnMessage={msg.senderId === userId}
									/>
								) : (
									<div className="text-red-500 text-sm">
										⚠️ Sender's public key not found
									</div>
								)}
							</div>
						);
					})
				)}
			</div>

			{/* Input Area */}
			<div className="border-t p-4 bg-gray-50">
				<EncryptedChatInput
					groupId={groupId}
					userId={userId}
					onMessageSent={(messageId) => {
						console.log('Message sent with ID:', messageId);
						// Optionally refresh messages
					}}
				/>
			</div>
		</div>
	);
}

/**
 * Example: Component Integration in Session
 * 
 * Usage in your page component:
 * 
 * ```tsx
 * import { EncryptedChatRoom } from '@/components/examples/EncryptedChatRoom';
 * 
 * export default function ChatPage() {
 *   const [messages, setMessages] = useState<EncryptedChatMessage[]>([]);
 *   const { user } = useAuth();
 *   const { room } = useParams();
 * 
 *   return (
 *     <EncryptedChatRoom
 *       groupId={room as string}
 *       userId={user.id}
 *       userName={user.name}
 *       messages={messages}
 *       memberPublicKeys={room.memberPublicKeys}
 *     />
 *   );
 * }
 * ```
 */
