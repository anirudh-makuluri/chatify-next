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
import Image from 'next/image'
import { customFetch } from "@/lib/utils";
import LoadingScreen from "@/components/LoadingScreen";
import { Loader2 } from 'lucide-react'


firebase.initializeApp(config.firebaseConfig)
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.NONE);
const auth = firebase.auth();
const provider = new firebase.auth.GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" })


export default function Page() {
	const { toast } = useToast();
	const { user, isLoading, login } = useUser();
	const router = useRouter();

	const [isLoadingScreenVisible, setLoadingScreenVisibility] = useState(true);
	const [isSignIn, setSignIn] = useState(true);
	const [email, setEmail] = useState("");
	const [password, setPassword] = useState("");
	const [isAuthenticating, setIsAuthenticating] = useState(false);

	useEffect(() => {
		if(user && !isLoading) {
			router.replace('/home');
			return;
		}

		if(!isLoading) {
			setLoadingScreenVisibility(false);
		}
	}, [user, isLoading])


	async function authWithGoogle() {
		try {
			setIsAuthenticating(true);
			setLoadingScreenVisibility(true);
			const { user } = await auth.signInWithPopup(provider);
			setSession(user);
		} catch (error) {
			console.error(error);
			toast({
				title: "Error occured while trying to authenticate using google"
			})
		} finally {
			// keep overlay on; login() will flip isLoading later which hides it
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
			setIsAuthenticating(true);
			setLoadingScreenVisibility(true);
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
			setIsAuthenticating(false);
			setLoadingScreenVisibility(false);
		}
	}


	async function setSession(user: firebase.User | null) {
		if (!user) throw "User not found";

		const idToken = await user?.getIdToken();

		customFetch({
			pathName: 'session',
			method: 'POST',
			body: { idToken }
		}).then(res => {
				auth.signOut();
				login();
			})
	}

	return (
		<div className="min-h-screen w-full flex items-center justify-center bg-gradient-to-br from-background to-muted/40 px-4">
			{(isLoadingScreenVisible || isAuthenticating) && <LoadingScreen/>}
			<Card className="p-8 w-full max-w-[420px] shadow-xl border border-border/60">
				<CardHeader className="flex flex-col justify-center items-center space-y-2">
					<CardTitle className="text-3xl font-semibold tracking-tight">Chatify</CardTitle>
					<CardDescription className="text-center">Sign {isSignIn ? 'in' : 'up'} to supercharge your conversations</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4 flex flex-col items-center my-6">
					<Button onClick={authWithGoogle} disabled={isAuthenticating} className="bg-transparent rounded-sm w-full gap-2" variant={'outline'}>
						{isAuthenticating ? <Loader2 className="h-4 w-4 animate-spin"/> : (
							<Image
								className="rounded-full"
								src={'/google_logo.webp'}
								width={20}
								height={20}
								alt="Google logo"
							/>
						)}
						<span>{isSignIn ? "Continue" : "Sign Up"} With Google</span>
					</Button>
					<div className="flex flex-row w-full items-center justify-center space-x-2 rounded-xl overflow-hidden">
						<Separator className="h-[1px] w-1/2 bg-primary" />
						<p>or</p>
						<Separator className="h-[1px] w-1/2 bg-primary" />
					</div>
					<Input disabled={isAuthenticating} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter Email" />
					<Input disabled={isAuthenticating} type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter Password" />
					<Button disabled={isAuthenticating} onClick={authWithEmailAndPassword} className="w-full">
						{isAuthenticating ? <><Loader2 className="mr-2 h-4 w-4 animate-spin"/>Processing...</> : (isSignIn ? "Continue" : "Sign Up")}
					</Button>
					<p className="text-xs text-muted-foreground text-center">By continuing, you agree to our Terms and Privacy Policy.</p>
				</CardContent>
				<CardFooter className="flex flex-row items-center justify-center space-x-2">
					<i className="text-[12px] text-center">{isSignIn ? "Don't have an account?" : "Already have an account?"}</i>
					<Button onClick={() => setSignIn(prevState => !prevState)} variant={'link'}>{isSignIn ? "Create account" : "Sign in"}</Button>
				</CardFooter>
			</Card>
		</div>
	)
}
