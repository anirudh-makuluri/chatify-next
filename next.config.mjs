/** @type {import('next').NextConfig} */
const nextConfig = {
	output: "standalone",
	images: {
		remotePatterns: [
			{
				protocol: "https",
				hostname: "firebasestorage.googleapis.com",
				port: "",
				pathname: "/**",
			},
			{
				protocol: "https",
				hostname: "*.giphy.com",
				port: "",
				pathname: "/**",	
			}
		],
	},
};

export default nextConfig;
