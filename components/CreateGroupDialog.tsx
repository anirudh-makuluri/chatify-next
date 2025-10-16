import React, { useMemo, useState } from 'react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { useUser } from '@/app/providers'
import { useToast } from './ui/use-toast'
import { groupApi, saveFileToStorage } from '@/lib/utils'
import { Avatar } from './ui/avatar'
import { AvatarImage } from '@radix-ui/react-avatar'
import { TRoomData, TUser } from '@/lib/types'
import { useAppDispatch, useAppSelector } from '@/redux/store'
import { joinChatRoom, setActiveRoomId } from '@/redux/chatSlice'
import { joinSocketRoom } from '@/redux/socketSlice'

type Props = {
    friends?: TUser[]
}

export default function CreateGroupDialog({ friends = [] }: Props) {
    const { user } = useUser()
    const { toast } = useToast()
    const dispatch = useAppDispatch()
    const rooms = useAppSelector(s => s.chat.rooms)

    const [open, setOpen] = useState(false)
    const [name, setName] = useState('')
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [selected, setSelected] = useState<Record<string, boolean>>({})
    const [isSubmitting, setSubmitting] = useState(false)

    const members = useMemo(() => Object.keys(selected).filter(uid => selected[uid]), [selected])

    function toggle(uid: string) {
        setSelected(prev => ({ ...prev, [uid]: !prev[uid] }))
    }

    async function onCreate() {
        if (!user) return
        if (!name.trim()) {
            toast({ title: 'Group name required', variant: 'destructive' })
            return
        }
        setSubmitting(true)
        try {
            let photoUrl: string | undefined
            if (photoFile) {
                const storagePath = `group_photos/${Date.now()}`
                photoUrl = await saveFileToStorage(photoFile, storagePath, user.uid)
            }

            const res = await groupApi.createGroup(user.uid, { name: name.trim(), photoUrl, memberUids: members })

            if (res?.success && res.room && res.roomId) {
                // Normalize room to ensure arrays exist
                const safeRoom: TRoomData = {
                    is_group: !!res.room.is_group,
                    roomId: res.room.roomId,
                    name: res.room.name,
                    photo_url: res.room.photo_url,
                    messages: Array.isArray(res.room.messages) ? res.room.messages : [],
                    membersData: Array.isArray(res.room.membersData) ? res.room.membersData : [],
                    saved_messages: Array.isArray(res.room.saved_messages) ? res.room.saved_messages : [],
                    is_ai_room: res.room.is_ai_room,
                }
                // Socket join and Redux add
                dispatch(joinSocketRoom(res.roomId))
                dispatch(joinChatRoom(safeRoom))
                dispatch(setActiveRoomId(res.roomId))
                setOpen(false)
                setName('')
                setSelected({})
                setPhotoFile(null)
                toast({ description: 'Group created' })
            } else {
                toast({ title: 'Failed to create group', description: res?.error || 'Unknown error', variant: 'destructive' })
            }
        } catch (e: any) {
            toast({ title: 'Error', description: e?.message || 'Unable to create group', variant: 'destructive' })
        } finally {
            setSubmitting(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={'outline'}>New Group</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Create Group</DialogTitle>
                </DialogHeader>
                <div className='space-y-3'>
                    <div className='flex items-center gap-3'>
                        <label className='cursor-pointer'>
                            <input type='file' accept='image/*' className='hidden' onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
                            <Avatar className='h-12 w-12'>
                                <AvatarImage src={photoFile ? URL.createObjectURL(photoFile) : undefined} />
                            </Avatar>
                        </label>
                        <Input placeholder='Group name' value={name} onChange={e => setName(e.target.value)} />
                    </div>
                    <div className='max-h-64 overflow-y-auto space-y-2'>
                        {friends.map(f => (
                            <div key={f.uid} className='flex items-center justify-between'>
                                <div className='flex items-center gap-2'>
                                    <Avatar className='h-6 w-6'><AvatarImage src={f.photo_url} /></Avatar>
                                    <span className='text-sm'>{f.name}</span>
                                </div>
                                <input type='checkbox' checked={!!selected[f.uid]} onChange={() => toggle(f.uid)} />
                            </div>
                        ))}
                        {friends.length === 0 && <p className='text-xs opacity-70'>No friends to add.</p>}
                    </div>
                </div>
                <DialogFooter>
                    <Button disabled={isSubmitting} onClick={onCreate}>Create</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


