import React from 'react'
import { Loader2 } from 'lucide-react'

export default function LoadingScreen() {
    return (
        <div className='fixed inset-0 z-[99] flex items-center justify-center bg-background/80 backdrop-blur-sm'>
            <div className='flex flex-col items-center gap-4 px-6 py-8 rounded-xl border border-border/60 shadow-lg bg-card/60'>
                <Loader2 className='h-8 w-8 animate-spin text-primary' />
                <div className='text-center'>
                    <p className='text-xl font-semibold tracking-tight'>Chatify</p>
                    <p className='text-sm text-muted-foreground mt-1'>Getting things ready...</p>
                </div>
            </div>
        </div>
    )
}
