# Glimpse <

> Share authentic moments privately with your partner

Glimpse is a beautifully designed, mobile-first web app built for couples to share photos and notes with each other. Built with modern web technologies and designed for intimacy and simplicity.

## ✨ Features

### Core Features
- **Partner-only sharing**: Designed exclusively for two people. Connect using friend codes or usernames
- **Photo & Note sharing**: Capture and share moments instantly or send colorful notes
- **Unread notifications**: Get notified when your partner shares something new
- **Calendar feed**: View your shared moments in a beautiful calendar view
- **Media gallery**: Browse all your shared photos and notes with advanced filters
- **Customizable notes**: Choose from 16 background colors and 16 text colors for personalized notes
- **Anniversary tracking**: Celebrate monthly anniversaries automatically

### Technical Features
- **Realtime updates**: Instant synchronization via Supabase Realtime
- **Dark theme**: Beautiful deep navy theme throughout the app
- **Responsive design**: Optimized for mobile and desktop
- **Offline-capable**: LocalStorage-based read tracking
- **Glass morphism UI**: Modern, tactile interface with smooth animations

## 🚀 Tech Stack

- **Frontend**: Vite + React 18 + TypeScript
- **Styling**: Tailwind CSS + shadcn/ui components
- **Backend**: Supabase (Auth, PostgreSQL, Realtime, Storage)
- **State Management**: React Query (@tanstack/react-query)
- **Routing**: React Router v6
- **Date handling**: date-fns
- **Icons**: Lucide React

## 📦 Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase project ([create one for free](https://supabase.com))

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/kentuckyfb/glimpse.git
cd glimpse
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. **Run the development server**
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## 🗄️ Supabase Setup

### Database Tables

**profiles**
- `id` (uuid, references auth.users)
- `username` (text, unique)
- `friend_code` (text, unique)
- `created_at` (timestamp)

**friend_connections**
- `id` (uuid, primary key)
- `requester_id` (uuid, references profiles)
- `addressee_id` (uuid, references profiles)
- `status` (text: 'pending' | 'accepted' | 'rejected')
- `created_at` (timestamp)

**posts**
- `id` (uuid, primary key)
- `user_id` (uuid, references profiles)
- `type` (text: 'photo' | 'note')
- `image_path` (text, nullable)
- `note_text` (text, nullable)
- `caption` (text, nullable) - stores color data for notes as JSON: `{"bg": "#fff", "text": "#000"}`
- `created_at` (timestamp)

### Storage Bucket

Create a storage bucket named `glimpses`:
- Used for photo uploads
- Set up appropriate RLS policies for privacy

### Row Level Security (RLS)

Enable RLS on all tables and create policies to ensure users can only:
- Read their own data and their partner's data
- Write their own data
- Accept/reject incoming friend requests

## 📱 Features Overview

### Photo Sharing
- Capture photos using device camera
- Add captions and edit images
- View in grid or fullscreen mode
- Filter by date (today, week, month, year)

### Note Sharing
- Compose colorful notes
- Choose from 16 background colors
- Choose from 16 text colors
- Character limit: 500

### Unread Media Widget
- Automatically shows new content from your partner
- Slider navigation for multiple items
- Disappears after viewing
- 24-hour time window

### Anniversary Celebrations
- Automatic monthly anniversary notifications
- Displays on the 1st of each month
- Shows total months together
- Starting date: June 1, 2025

## 🎨 Project Structure

```
glimpse/
├── src/
│   ├── components/          # Reusable UI components
│   │   ├── UnreadMediaWidget.tsx
│   │   ├── NoteComposer.tsx
│   │   ├── ImageEditor.tsx
│   │   └── FriendRequestManager.tsx
│   ├── hooks/              # Custom React hooks
│   │   ├── useMedia.ts
│   │   ├── usePartner.ts
│   │   ├── useUnreadMedia.ts
│   │   └── useRecentPost.ts
│   ├── pages/              # Page components
│   │   ├── Index.tsx       # Home page
│   │   ├── Camera.tsx      # Photo/note capture
│   │   ├── Media.tsx       # Media gallery
│   │   ├── Feed.tsx        # Calendar feed
│   │   ├── Friends.tsx     # Partner management
│   │   └── Settings.tsx    # User settings
│   ├── integrations/       # External integrations
│   │   └── supabase/
│   ├── index.css          # Global styles & Tailwind
│   └── App.tsx            # Root component
├── public/                # Static assets
└── index.html            # HTML entry point
```

## 📜 Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run build:dev` - Build in development mode
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🌐 Deployment

Glimpse can be deployed to any static hosting service:

### Recommended Platforms
- **Vercel** (recommended)
- **Netlify**
- **Cloudflare Pages**
- **GitHub Pages**

### Deployment Steps

1. Build the project:
```bash
npm run build
```

2. Deploy the `dist/` directory

3. Set environment variables in your hosting platform:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`

## 🔧 Configuration

### Theme Customization
The app uses a custom dark theme defined in `src/index.css`. Key colors:
- Background: `hsl(222 47% 5%)` - Deep navy blue
- Primary: `hsl(217 91% 60%)` - Bright blue
- Foreground: `hsl(0 0% 98%)` - Almost white

### Date Configuration
Anniversary start date is set to June 1, 2025 in `src/pages/Index.tsx`:
```typescript
const anniversaryStart = new Date('2025-06-01');
```

## 🤝 Contributing

This is a personal project, but suggestions and bug reports are welcome!

## 📄 License

MIT License - feel free to use this project for your own couple's app!

## 💝 Made with Love

Glimpse was built to help couples share their moments in a private, beautiful, and intimate way.

---

**Version**: 1.2.1
**Built with**: React, TypeScript, Tailwind CSS, and Supabase
**Status**: Active Development
