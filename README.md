# Glimpse

Share authentic moments privately with your partner. Glimpse is a minimal, fast, mobile-friendly web app built with Vite, React, TypeScript, Tailwind CSS, and shadcn-ui, powered by Supabase for auth, database, and storage.

## Features

- **Partner-only sharing**: Designed for two people. Send and accept partner requests with friend codes or usernames.
- **Realtime updates**: Partner requests and connections update live via Supabase Realtime.
- **Media sharing**: Upload and browse recent photos stored in Supabase Storage.
- **Clean UI**: Tailwind + shadcn-ui components with a polished dark theme.

## Tech Stack

- Vite + React + TypeScript
- Tailwind CSS + shadcn-ui
- Supabase (Auth, Postgres, Realtime, Storage)
- React Router

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase project (free tier works)

### 1) Clone and install

```bash
git clone <your_repo_url>
npm install
```

### 2) Configure environment variables

Create a `.env` file in the project root:

```bash
VITE_SUPABASE_URL=<your_supabase_project_url>
VITE_SUPABASE_ANON_KEY=<your_supabase_anon_key>
```

### 3) Run the app

```bash
npm run dev
```

App runs at http://localhost:5173 by default.

## Project Scripts

- `npm run dev` – start the Vite dev server
- `npm run build` – production build
- `npm run build:dev` – development-mode build
- `npm run preview` – preview the production build
- `npm run lint` – run ESLint

## Folder Structure (key paths)

- `src/pages/Index.tsx` – home screen: partner state, recent media, requests
- `src/pages/Friends.tsx` – partner management, adding by code/username
- `src/components/FriendRequestManager.tsx` – realtime pending request UI
- `src/index.css` – Tailwind layers and custom utilities
- `tailwind.config.ts` – Tailwind theme config
- `index.html` – base HTML shell

## Supabase Setup

Tables (suggested):

- `profiles`: `id (uuid, auth.uid)`, `username (text)`, `friend_code (text)`
- `friend_connections`: `id (uuid)`, `requester_id`, `addressee_id`, `status (pending|accepted|rejected)`
- `posts`: `id`, `user_id`, `type (photo)`, `image_path (text)`, `created_at`

Storage bucket:

- `glimpses` – for photo uploads. Ensure public read or signed URLs per your privacy needs.

Policies: add RLS policies to restrict access so users can only read their content and their partner’s content.

## Deployment

You can deploy to any static host (Netlify, Vercel, Cloudflare Pages, etc.).

1) Set environment variables in your hosting provider.
2) Build and deploy:

```bash
npm run build
```

Serve the `dist/` output.

## License

MIT. Do what you like—at your own risk.


