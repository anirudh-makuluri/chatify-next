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
import { useAppDispatch } from '@/redux/store'
import { removeRoom, setActiveRoomId } from '@/redux/chatSlice'

type Props = {
    room: TRoomData
    allFriends?: TUser[]
}

export default function ManageGroupDialog({ room, allFriends = [] }: Props) {
    const { user } = useUser()
    const { toast } = useToast()
    const dispatch = useAppDispatch()

    const [open, setOpen] = useState(false)
    const [name, setName] = useState(room.name)
    const [photoFile, setPhotoFile] = useState<File | null>(null)
    const [selected, setSelected] = useState<Record<string, boolean>>(() => {
        const init: Record<string, boolean> = {}
        ;(room.membersData || []).forEach(m => { init[m.uid] = true })
        return init
    })
    const currentMemberUids = useMemo(() => Object.keys(selected).filter(uid => selected[uid]), [selected])

    async function onSaveInfo() {
        if (!user) return
        try {
            let photoUrl: string | undefined
            if (photoFile) {
                const storagePath = `group_photos/${room.roomId}`
                photoUrl = await saveFileToStorage(photoFile, storagePath, user.uid)
            }
            await groupApi.updateInfo(user.uid, room.roomId, { name, photoUrl })
            toast({ description: 'Group updated' })
        } catch (e: any) {
            toast({ title: 'Update failed', description: e?.message || 'Unknown error', variant: 'destructive' })
        }
    }

    async function onToggleMember(uid: string) {
        if (!user) return
        const isMember = !!selected[uid]
        try {
            if (isMember) {
                await groupApi.removeMember(user.uid, room.roomId, uid)
            } else {
                await groupApi.addMembers(user.uid, room.roomId, [uid])
            }
            setSelected(prev => ({ ...prev, [uid]: !prev[uid] }))
        } catch (e: any) {
            toast({ title: 'Member update failed', description: e?.message || 'Unknown error', variant: 'destructive' })
        }
    }

    async function onDeleteGroup() {
        if (!user) return
        try {
            const res = await groupApi.deleteGroup(user.uid, room.roomId)
            if (res?.success) {
                dispatch(removeRoom(room.roomId))
                dispatch(setActiveRoomId(''))
                toast({ description: 'Group deleted' })
                setOpen(false)
            } else {
                toast({ title: 'Delete failed', description: res?.error || 'Unknown error', variant: 'destructive' })
            }
        } catch (e: any) {
            toast({ title: 'Delete failed', description: e?.message || 'Unknown error', variant: 'destructive' })
        }
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant={'outline'} size={'sm'}>Group settings</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Manage Group</DialogTitle>
                </DialogHeader>
                <div className='space-y-4'>
                    <div className='flex items-center gap-3'>
                        <label className='cursor-pointer'>
                            <input type='file' accept='image/*' className='hidden' onChange={e => setPhotoFile(e.target.files?.[0] || null)} />
                            <Avatar className='h-12 w-12'>
                                <AvatarImage src={photoFile ? URL.createObjectURL(photoFile) : room.photo_url} />
                            </Avatar>
                        </label>
                        <Input placeholder='Group name' value={name} onChange={e => setName(e.target.value)} />
                        <Button onClick={onSaveInfo}>Save</Button>
                    </div>
                    <div>
                        <p className='text-sm mb-2'>Members</p>
                        <div className='max-h-64 overflow-y-auto space-y-2'>
                            {allFriends.map(f => {
                                const checked = !!selected[f.uid]
                                return (
                                    <div key={f.uid} className='flex items-center justify-between'>
                                        <div className='flex items-center gap-2'>
                                            <Avatar className='h-6 w-6'><AvatarImage src={f.photo_url} /></Avatar>
                                            <span className='text-sm'>{f.name}</span>
                                        </div>
                                        <input type='checkbox' checked={checked} onChange={() => onToggleMember(f.uid)} />
                                    </div>
                                )
                            })}
                            {allFriends.length === 0 && <p className='text-xs opacity-70'>No friends to manage.</p>}
                        </div>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant={'destructive'} onClick={onDeleteGroup}>Delete group</Button>
                    <Button onClick={() => setOpen(false)}>Close</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}


