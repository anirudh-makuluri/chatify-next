"use client"
import ReduxProvider from '@/redux/redux-provider';
import Main from './main';


export default function Page() {
	return (
		<ReduxProvider>
			<Main/>
		</ReduxProvider>
	)
}
