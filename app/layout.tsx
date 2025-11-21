import type { Metadata } from "next";
import { Sora, Outfit } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { Toaster } from "@/components/ui/toaster"

const sora = Sora({ 
	subsets: ["latin"],
	variable: "--font-sora",
	display: "swap",
});

const outfit = Outfit({ 
	subsets: ["latin"],
	variable: "--font-outfit",
	display: "swap",
});

export const metadata: Metadata = {
	title: "Chatify",
	description: "Upgrading your chatting experience!",
};

export default function RootLayout({
	children,
}: Readonly<{
	children: React.ReactNode;
}>) {
	return (
		<html lang="en">
			<body className={`${sora.variable} ${outfit.variable} font-sans`}>
				<Providers>
					{children}
				</Providers>
				<Toaster />
			</body>
		</html>
	);
}
