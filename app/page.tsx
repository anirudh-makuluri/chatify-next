"use client"
import firebase from "firebase/compat/app";
import "firebase/compat/auth"
import { useRouter } from 'next/navigation';
import { config } from "@/lib/config";
import { useUser } from "@/app/providers";
import { Button } from "@/components/ui/button";


firebase.initializeApp(config.firebaseConfig)
const provider = new firebase.auth.GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" })

export default function Home() {
	const router = useRouter();
	const { user } = useUser();

	function navigateToNextPage() {
		if(user) {
			router.push('/home')
		} else {
			router.push('/auth');
		}
	}


	return (
		<div className="flex items-center justify-center min-h-screen flex-col gap-6">
			<h1 className="text-[32px]">Welcome to Chatify!</h1>
			<Button onClick={navigateToNextPage}>
				Continue
			</Button>
		</div>
	)
}
