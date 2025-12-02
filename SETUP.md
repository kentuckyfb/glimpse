# Glimpse Setup Guide

## Prerequisites

- Node.js 18+ installed
- Supabase account
- Firebase account (for push notifications)
- Vercel account (for deployment)

## 1. Clone and Install

```bash
git clone https://github.com/yourusername/glimpse-live.git
cd glimpse-live
npm install
```

## 2. Set Up Supabase

### Create Supabase Project

1. Go to [https://supabase.com/dashboard](https://supabase.com/dashboard)
2. Click "New Project"
3. Note your project URL and anon key

### Run Database Migrations

```bash
# Login to Supabase CLI
npx supabase login

# Link your project
npx supabase link --project-ref YOUR_PROJECT_REF

# Apply migrations
npx supabase db push
```

Or manually run the SQL files in `supabase/migrations/` in the Supabase SQL Editor.

### Deploy Edge Functions

```bash
npx supabase functions deploy register-device --no-verify-jwt
npx supabase functions deploy send-push --no-verify-jwt
```

## 3. Set Up Firebase (For Push Notifications)

### Create Firebase Project

1. Go to [https://console.firebase.google.com](https://console.firebase.google.com)
2. Create a new project
3. Enable Cloud Messaging

### Download Service Account Key

1. Go to Project Settings → Service Accounts
2. Click "Generate New Private Key"
3. Save the JSON file (DO NOT commit this to Git!)

### Set Supabase Secrets

```bash
npx supabase secrets set FIREBASE_PROJECT_ID=your-project-id
npx supabase secrets set FIREBASE_CLIENT_EMAIL=your-service-account-email
npx supabase secrets set FIREBASE_PRIVATE_KEY="$(cat path/to/serviceAccountKey.json | jq -r .private_key)"
```

## 4. Configure Environment Variables

### Frontend (.env)

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

Fill in your Supabase credentials:

```env
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key
VITE_SUPABASE_URL=https://your-project.supabase.co
```

## 5. Run Locally

```bash
npm run dev
```

The app will be available at http://localhost:8080

## 6. Deploy to Vercel

```bash
npm run build
vercel --prod
```

Or connect your GitHub repo to Vercel for automatic deployments.

## 7. Android App Setup

See [ANDROID_INTEGRATION.md](ANDROID_INTEGRATION.md) for instructions on setting up the Android app.

### Quick Android Setup:

1. Download `google-services.json` from Firebase Console
2. Place it in your Android app's `app/` directory
3. Update `MyFirebaseMessagingService.kt` with your Supabase endpoint
4. Get your user UUID from Supabase Dashboard → Auth → Users
5. Hardcode your UUID in the Android app

## Security Notes

### Files to NEVER Commit:

- `.env` (contains Supabase keys)
- `firebase-key.json` (contains Firebase private key)
- `google-services.json` (contains Firebase Android config)
- `supabase/.env` (contains Firebase credentials)

These are already in `.gitignore` - keep them there!

### Environment Variables for Vercel:

Add these in Vercel Dashboard → Project Settings → Environment Variables:

```
VITE_SUPABASE_PROJECT_ID
VITE_SUPABASE_PUBLISHABLE_KEY
VITE_SUPABASE_URL
```

## Troubleshooting

### Edge Functions Not Working

Check logs:
```bash
npx supabase functions logs register-device
npx supabase functions logs send-push
```

### Database Issues

Reset and reapply migrations:
```bash
npx supabase db reset
npx supabase db push
```

### Push Notifications Not Sending

1. Verify Firebase secrets are set: `npx supabase secrets list`
2. Check Cloud Messaging is enabled in Firebase Console
3. Verify device tokens are being registered in `device_tokens` table

## Documentation

- [ANDROID_SETUP.md](ANDROID_SETUP.md) - Full Android integration guide
- [ANDROID_INTEGRATION.md](ANDROID_INTEGRATION.md) - Android technical details
- [ANDROID_QUICK_START.md](ANDROID_QUICK_START.md) - Quick start for Android
- [TEST_PUSH.md](TEST_PUSH.md) - Testing push notifications
- [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md) - Current deployment status

## Support

For issues, please open a GitHub issue or check the documentation files listed above.
