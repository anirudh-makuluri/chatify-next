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
		<div className="flex items-center justify-center min-h-screen flex-col gap-6 bg-gradient-to-r from-blue-500 to-purple-500 text-white">
			<h1 className="text-4xl md:text-6xl font-bold">Welcome to Chatify!</h1>
			<p className="text-lg md:text-xl">Connect, collaborate, and chat effortlessly with Chatify.</p>
			<Button onClick={navigateToNextPage}>
				{ user ? "Continue" : "Welcome" }
			</Button>
		</div>
	)
}
