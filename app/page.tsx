"use client"
import firebase from "firebase/compat/app";
import "firebase/compat/auth"
import { useRouter } from 'next/navigation';
import { config } from "@/lib/config";
import { useUser } from "@/app/providers";
import { Button } from "@/components/ui/button";
import { MessageCircle, Users, Zap, Sparkles, ArrowRight, Bot, Clock, Brain } from "lucide-react";
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
			description: "Instant communication with zero latency",
			color: "from-cyan-400 to-blue-500"
		},
		{
			icon: Bot,
			title: "AI Assistant",
			description: "Intelligent conversations powered by AI",
			color: "from-blue-500 to-indigo-500"
		},
		{
			icon: Users,
			title: "Group Chats",
			description: "Connect with teams and communities",
			color: "from-blue-400 to-cyan-500"
		},
		{
			icon: Zap,
			title: "Lightning Fast",
			description: "Optimized for speed and performance",
			color: "from-indigo-500 to-blue-600"
		}
	];

	const stats = [
		{ icon: Clock, label: "Response Time", value: "< 50ms" },
		{ icon: Brain, label: "Intelligence", value: "AI Powered" }
	];

	return (
		<div className="relative flex items-center justify-center min-h-screen overflow-auto">
			{/* Unique Mesh Gradient Background */}
			<div 
				className="absolute inset-0 animate-mesh dark:opacity-100 opacity-50"
				style={{
					background: `
						radial-gradient(at 0% 0%, hsl(217, 91%, 25%) 0px, transparent 50%),
						radial-gradient(at 100% 0%, hsl(239, 84%, 35%) 0px, transparent 50%),
						radial-gradient(at 100% 100%, hsl(195, 85%, 30%) 0px, transparent 50%),
						radial-gradient(at 0% 100%, hsl(217, 91%, 20%) 0px, transparent 50%),
						linear-gradient(135deg, hsl(var(--background)) 0%, hsl(var(--background)) 50%, hsl(var(--background)) 100%)
					`
				}}
			/>

			{/* Animated Geometric Shapes */}
			<div className="absolute inset-0 overflow-hidden pointer-events-none">
				{/* Floating Orbs */}
				<div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl animate-float" />
				<div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl animate-float animation-delay-2000" />
				<div className="absolute top-1/2 left-1/3 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl animate-float animation-delay-4000" />
				
				{/* Grid Pattern Overlay */}
				<div 
					className="absolute inset-0 opacity-[0.03]"
					style={{
						backgroundImage: `
							linear-gradient(rgba(195, 85%, 55%, 0.1) 1px, transparent 1px),
							linear-gradient(90deg, rgba(195, 85%, 55%, 0.1) 1px, transparent 1px)
						`,
						backgroundSize: '50px 50px'
					}}
				/>
			</div>

			{/* Content */}
			<div className="relative z-10 flex flex-col items-center justify-center px-4 py-16 max-w-7xl mx-auto w-full">
				{/* Hero Section */}
				<div className={`text-center mb-20 transition-all duration-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
					{/* Badge */}
					<div 
						className={`inline-flex items-center gap-2 px-5 py-2.5 mb-8 rounded-full bg-gradient-to-r from-cyan-500/20 to-blue-500/20 backdrop-blur-md border border-cyan-500/30 animate-scale-in ${isVisible ? 'animate-scale-in' : ''}`}
						style={{ animationDelay: '0ms' }}
					>
						<Sparkles className="w-4 h-4 dark:text-cyan-300 text-cyan-600 animate-pulse-glow" />
						<span className="text-sm font-medium text-cyan-600 dark:text-cyan-300 font-heading">
							Powered by Advanced AI
						</span>
					</div>
					
					{/* Main Heading */}
					<h1 
						className={`text-6xl md:text-8xl lg:text-9xl font-bold mb-8 animate-slide-up font-heading ${isVisible ? 'animate-slide-up' : ''}`}
						style={{ 
							animationDelay: '200ms',
							background: 'linear-gradient(135deg, hsl(217, 91%, 65%) 0%, hsl(239, 84%, 70%) 50%, hsl(195, 85%, 65%) 100%)',
							WebkitBackgroundClip: 'text',
							WebkitTextFillColor: 'transparent',
							backgroundClip: 'text',
							textShadow: '0 0 40px rgba(217, 91%, 60%, 0.3)'
						}}
					>
						Chatify
					</h1>
					
					{/* Subtitle */}
					<p 
						className={`text-xl md:text-2xl lg:text-3xl text-foreground/80 mb-12 max-w-3xl mx-auto font-light leading-relaxed animate-slide-up ${isVisible ? 'animate-slide-up' : ''}`}
						style={{ 
							animationDelay: '400ms'
						}}
					>
						Where conversations come alive with intelligence, speed, and seamless connection
					</p>

					{/* CTA Button */}
					<div 
						className={`flex flex-col sm:flex-row gap-5 justify-center items-center animate-slide-up ${isVisible ? 'animate-slide-up' : ''}`}
						style={{ animationDelay: '600ms' }}
					>
						<Button 
							onClick={navigateToNextPage}
							size="lg"
							className="group relative px-10 py-7 text-lg font-semibold overflow-hidden rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-900 hover:from-cyan-400 hover:to-blue-500 transform hover:scale-105 transition-all duration-300 shadow-2xl shadow-cyan-500/50 hover:shadow-cyan-500/70 font-heading"
						>
							<span className="relative z-10 flex items-center gap-2">
								{user ? "Continue to Chat" : "Get Started"}
								<ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
							</span>
							<div className="absolute inset-0 animate-shimmer" />
						</Button>
					</div>
				</div>

				{/* Features Grid */}
				<div 
					id="features" 
					className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full mb-20 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
				>
					{features.map((feature, index) => (
						<div
							key={index}
							className="group relative p-8 rounded-2xl bg-card/80 backdrop-blur-xl border border-primary/20 hover:border-primary/40 transition-all duration-500 transform hover:scale-105 hover:-translate-y-2 cursor-pointer overflow-hidden animate-scale-in"
							style={{ 
								animationDelay: `${800 + index * 100}ms`
							}}
						>
							{/* Gradient Overlay on Hover */}
							<div className={`absolute inset-0 bg-gradient-to-br ${feature.color} opacity-0 group-hover:opacity-10 transition-opacity duration-500`} />
							
							{/* Icon */}
							<div className={`relative w-14 h-14 mb-6 rounded-xl bg-gradient-to-br ${feature.color} flex items-center justify-center transform group-hover:rotate-12 group-hover:scale-110 transition-all duration-500 shadow-lg`}>
								<feature.icon className="w-7 h-7 text-white" />
							</div>
							
							{/* Content */}
							<h3 
								className="text-xl font-bold text-foreground mb-3 group-hover:text-primary transition-colors font-heading"
							>
								{feature.title}
							</h3>
							<p className="text-muted-foreground text-sm leading-relaxed">
								{feature.description}
							</p>
						</div>
					))}
				</div>

				{/* Stats Section */}
				<div 
					className={`grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl mb-20 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
				>
					{stats.map((stat, index) => (
						<div 
							key={index}
							className="text-center p-8 rounded-2xl bg-card/60 backdrop-blur-xl border border-primary/10 hover:border-primary/30 transition-all duration-500 animate-scale-in"
							style={{ 
								animationDelay: `${1200 + index * 100}ms`
							}}
						>
							<div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center border border-cyan-500/30">
								<stat.icon className="w-8 h-8 text-primary" />
							</div>
							<div className="text-3xl md:text-4xl font-bold text-primary mb-2 font-heading">
								{stat.value}
							</div>
							<div className="text-muted-foreground text-sm uppercase tracking-wider">
								{stat.label}
							</div>
						</div>
					))}
				</div>
			</div>
		</div>
	)
}
