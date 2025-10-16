"use client"
import firebase from "firebase/compat/app";
import "firebase/compat/auth"
import { useRouter } from 'next/navigation';
import { config } from "@/lib/config";
import { useUser } from "@/app/providers";
import { Button } from "@/components/ui/button";
import { MessageCircle, Users, Zap, Sparkles, ArrowRight, Bot } from "lucide-react";
import { useEffect, useState } from "react";


firebase.initializeApp(config.firebaseConfig)
const provider = new firebase.auth.GoogleAuthProvider();
provider.setCustomParameters({ prompt: "select_account" })

export default function Home() {
	const router = useRouter();
	const { user } = useUser();
	const [isVisible, setIsVisible] = useState(false);

	useEffect(() => {
		setIsVisible(true);
	}, []);

	function navigateToNextPage() {
		if(user) {
			router.push('/home')
		} else {
			router.push('/auth');
		}
	}

	const features = [
		{
			icon: MessageCircle,
			title: "Real-time Messaging",
			description: "Chat instantly with friends and colleagues"
		},
		{
			icon: Bot,
			title: "AI Assistant",
			description: "Get smart replies and conversation summaries"
		},
		{
			icon: Users,
			title: "Group Chats",
			description: "Connect with multiple people at once"
		},
		{
			icon: Zap,
			title: "Lightning Fast",
			description: "Experience seamless, lag-free conversations"
		}
	];

	return (
		<div className="relative flex items-center justify-center min-h-screen overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-500">
			{/* Animated Background Elements */}
			<div className="absolute inset-0 overflow-hidden">
				<div className="absolute -top-40 -right-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
				<div className="absolute -bottom-40 -left-40 w-80 h-80 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
				<div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-indigo-400 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
			</div>

			{/* Content */}
			<div className="relative z-10 flex flex-col items-center justify-center px-4 py-16 max-w-6xl mx-auto">
				{/* Hero Section */}
				<div className={`text-center mb-16 transition-all duration-1000 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
					<div className="inline-flex items-center gap-2 px-4 py-2 mb-6 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 animate-fade-in">
						<Sparkles className="w-4 h-4 text-yellow-300 animate-pulse" />
						<span className="text-sm font-medium text-white">Powered by AI</span>
					</div>
					
					<h1 className="text-5xl md:text-7xl font-bold text-white mb-6 animate-slide-up">
						Welcome to{" "}
						<span className="bg-gradient-to-r from-yellow-300 via-pink-300 to-purple-300 text-transparent bg-clip-text animate-gradient">
							Chatify
						</span>
					</h1>
					
					<p className="text-xl md:text-2xl text-white/90 mb-8 max-w-2xl mx-auto animate-slide-up animation-delay-200">
						Connect, collaborate, and chat effortlessly with intelligent conversations
					</p>

					<div className="flex flex-col sm:flex-row gap-4 justify-center animate-slide-up animation-delay-400">
						<Button 
							onClick={navigateToNextPage}
							size="lg"
							className="group relative px-8 py-6 text-lg font-semibold bg-white text-purple-600 hover:bg-white/90 transform hover:scale-105 transition-all duration-300 shadow-2xl hover:shadow-purple-500/50"
						>
							{user ? "Continue to Chat" : "Get Started"}
							<ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
						</Button>
						
						<Button 
							variant="outline"
							size="lg"
							className="px-8 py-6 text-lg font-semibold bg-transparent text-white border-2 border-white/30 hover:bg-white/10 hover:border-white/50 backdrop-blur-sm transform hover:scale-105 transition-all duration-300"
							onClick={() => {
								const featuresSection = document.getElementById('features');
								featuresSection?.scrollIntoView({ behavior: 'smooth' });
							}}
						>
							Learn More
						</Button>
					</div>
				</div>

				{/* Features Grid */}
				<div id="features" className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full transition-all duration-1000 delay-500 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
					{features.map((feature, index) => (
						<div
							key={index}
							className="group p-6 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 hover:bg-white/20 transition-all duration-300 transform hover:scale-105 hover:-translate-y-2 cursor-pointer"
							style={{ animationDelay: `${index * 100}ms` }}
						>
							<div className="w-12 h-12 mb-4 rounded-lg bg-gradient-to-br from-purple-400 to-pink-400 flex items-center justify-center transform group-hover:rotate-12 transition-transform duration-300">
								<feature.icon className="w-6 h-6 text-white" />
							</div>
							<h3 className="text-lg font-semibold text-white mb-2">
								{feature.title}
							</h3>
							<p className="text-white/70 text-sm">
								{feature.description}
							</p>
						</div>
					))}
				</div>

				{/* Stats Section */}
				<div className={`mt-16 grid grid-cols-3 gap-8 w-full max-w-3xl transition-all duration-1000 delay-700 transform ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10'}`}>
					<div className="text-center">
						<div className="text-4xl md:text-5xl font-bold text-white mb-2 animate-count-up">
							Fast
						</div>
						<div className="text-white/70 text-sm">Response Time</div>
					</div>
					<div className="text-center">
						<div className="text-4xl md:text-5xl font-bold text-white mb-2 animate-count-up">
							Secure
						</div>
						<div className="text-white/70 text-sm">End-to-End</div>
					</div>
					<div className="text-center">
						<div className="text-4xl md:text-5xl font-bold text-white mb-2 animate-count-up">
							Smart
						</div>
						<div className="text-white/70 text-sm">AI Powered</div>
					</div>
				</div>
			</div>
		</div>
	)
}
