"use client"
import { Button } from "@/components/ui/button";
import firebase from "firebase/compat/app";
import "firebase/compat/auth"
import "firebase/compat/auth"
import { config } from "@/lib/config";
import { useRouter } from 'next/navigation';
import { useUser } from "../providers";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import { Separator } from "@radix-ui/react-dropdown-menu";
import { useToast } from "@/components/ui/use-toast";


firebase.initializeApp(config.firebaseConfig)
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" })


export default function Page() {
	const { toast } = useToast();
	const { user, isLoading, login } = useUser();
	const router = useRouter();
	const [isSignIn, setSignIn] = useState(true);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");

	useEffect(() => {
		if(user && !isLoading) {
			router.replace('/home');
			return;
		}
	}, [user, isLoading])


	async function authWithGoogle() {
		try {
			const { user } = await auth.signInWithPopup(provider);
			setSession(user);
		} catch (error) {
			console.error(error);
			toast({
				title: "Error occured while trying to authenticate using google"
			})
		}

	}

	async function authWithEmailAndPassword() {
		if (email == null || email.trim() == "" || password == null || password.trim() == "") {
			toast({
				title: "Email or Password not given"
			})
			return;
		}

		try {
			if (isSignIn) {
				const { user } = await firebase.auth().signInWithEmailAndPassword(email, password)
				setSession(user);
			} else {
				const { user } = await firebase.auth().createUserWithEmailAndPassword(email, password);
				setSession(user);
			}
		} catch (error: any) {
			const errorCode = error.code;
			let errorMessage = error.message;

			switch (errorCode) {
				case "auth/email-already-in-use":
					errorMessage = "The email address is already in use by another account.";
					break;
				case "auth/invalid-email":
					errorMessage = "The email address is invalid.";
					break;
				case "auth/weak-password":
					errorMessage = "The password is too weak.";
					break;
				case "auth/invalid-credential":
					errorMessage = "Account not found";
					break;
				default:
					
					break;
			}

			toast({
				title: errorMessage,
				variant: 'destructive'
			})
		}
	}


	async function setSession(user: firebase.User | null) {
		if (!user) throw "User not found";

		const idToken = await user?.getIdToken();

		fetch('http://localhost:5000/session', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			credentials: "include",
			body: JSON.stringify({
				idToken
			})
		}).then(res => res.json())
			.then(res => {
				auth.signOut();
				login();
			})
	}

	return (
		<div className="flex items-center justify-center min-h-screen">
			<Card className="p-8 w-[400px]">
				<CardHeader className="flex flex-col justify-center items-center space-y-4">
					<CardTitle className="text-2xl">Chatify</CardTitle>
					<CardDescription>Upgrading your chatting experience!</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4 flex flex-col items-center my-6">
					<Button onClick={authWithGoogle} className="bg-transparent rounded-sm w-full" variant={'outline'}>
						<span>{isSignIn ? "Continue" : "Sign Up"} With Google</span>
					</Button>
					<div className="flex flex-row w-full items-center justify-center space-x-2 rounded-xl overflow-hidden">
						<Separator className="h-[1px] w-1/2 bg-primary" />
						<p>or</p>
						<Separator className="h-[1px] w-1/2 bg-primary" />
					</div>
					<Input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter Email" />
					<Input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter Password" />
					<Button onClick={authWithEmailAndPassword} className="w-full">{isSignIn ? "Continue" : "Sign Up"}</Button>
				</CardContent>
				<CardFooter className="flex flex-row items-center justify-center space-x-2">
					<i className="text-[12px] text-center">{isSignIn ? "Don't have an account?" : "Already have an account?"}</i>
					<Button onClick={() => setSignIn(prevState => !prevState)} variant={'link'}>{isSignIn ? "Create account" : "Sign in"}</Button>
				</CardFooter>
			</Card>
		</div>
	)
}
