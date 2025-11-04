# Chatify Next

A modern, feature-rich real-time chat application built with Next.js, featuring AI-powered assistance, group management, and seamless messaging capabilities.

## 🚀 Features

### 🔐 Authentication & User Management
- **Multiple Authentication Methods**
  - Google OAuth integration
  - Email/Password authentication
  - Secure session management with Firebase
- **Profile Management**
  - Upload profile photos
  - Edit display name
  - View and manage user settings

### 💬 Real-Time Messaging
- **Instant Messaging**
  - Real-time message delivery using Socket.IO
  - One-on-one private conversations
  - Group chat support
  - Message history with infinite scroll
  - Auto-scroll to latest messages
- **Message Types**
  - Text messages
  - Image sharing with preview
  - GIF support via Giphy integration
  - Emoji picker for emoji support
- **Message Features**
  - Edit sent messages
  - Delete messages
  - Star/Save important messages
  - React to messages with emojis
  - View message reactions and reactors
  - Message timestamps
  - Edited message indicators

### 🤖 AI-Powered Features
- **AI Assistant Chat**
  - Dedicated AI assistant room
  - Interactive conversations with AI
  - Ask questions and get intelligent responses
- **Smart Replies**
  - AI-generated quick reply suggestions
  - Context-aware response recommendations
  - One-click reply insertion
- **Conversation Summarization**
  - Generate AI summaries of conversations
  - Quick overview of chat history
  - Understand conversation context at a glance

### 👥 Social Features
- **Friend System**
  - Search for users by name or email
  - Send friend requests
  - Accept/decline friend requests
  - View friend list
  - Friend request notifications
- **User Presence**
  - Real-time online/offline status
  - Last seen timestamps
  - Live presence updates

### 👨‍👩‍👧‍👦 Group Management
- **Create Groups**
  - Create group chats with custom names
  - Upload group photos
  - Add multiple members
- **Manage Groups**
  - Edit group name and photo
  - Add new members
  - Remove members
  - Delete groups
  - View group members

### ⏰ Scheduled Messages
- **Message Scheduling**
  - Schedule messages for future delivery
  - Set custom date and time
  - One-time scheduled messages
  - Recurring messages (daily, weekly, monthly)
  - Timezone-aware scheduling
  - View and manage scheduled messages

### 🎨 User Experience
- **Modern UI/UX**
  - Beautiful, responsive design
  - Dark/Light theme toggle
  - Smooth animations and transitions
  - Mobile-responsive layout
  - Intuitive navigation
- **Chat Interface**
  - Message bubbles with distinct styling
  - Avatar display for users
  - Group message indicators
  - Date separators in chat history
  - Context menu for message actions
  - Image preview and full-screen viewing

### 📱 Responsive Design
- **Mobile & Desktop Support**
  - Optimized for mobile devices
  - Desktop-friendly interface
  - Adaptive sidebar navigation
  - Touch-friendly interactions

### 🔄 Real-Time Updates
- **Live Synchronization**
  - Real-time message delivery
  - Instant presence updates
  - Live friend request notifications
  - Synchronized group changes
  - Real-time reaction updates

## 🚀 Getting Started

### Installation

1. Clone the repository:
```bash
git clone https://github.com/anirudh-makuluri/chatify-next
cd chatify-next
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
   - Set up Firebase configuration
   - Configure backend API URL
   - Add Giphy API key (optional)

4. Run the development server:
```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

### Build for Production

```bash
npm run build
npm start
```

**Note**: This application requires a backend server to function properly. Make sure the backend is running and properly configured before starting the frontend.


