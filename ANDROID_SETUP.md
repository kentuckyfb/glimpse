# Android App Setup Guide for Glimpse

This guide explains how to deploy your Glimpse backend and prepare it for Android integration.

## Overview

Your Glimpse project is now ready for Android integration with:
- ✅ Device token registration endpoint
- ✅ Push notification system using Firebase Cloud Messaging (FCM)
- ✅ Automatic notifications when friends share images or notes
- ✅ Database schema for storing device tokens

## Architecture

```
┌─────────────────────────────────────────┐
│   Vite/React Web App (Glimpse)          │
│   - Runs in browser or Android WebView  │
│   - Calls Supabase Edge Functions       │
└─────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│   Supabase (Backend)                     │
│   - PostgreSQL Database                  │
│   - Storage (images)                     │
│   - Auth                                 │
│   - Edge Functions:                      │
│     • register-device                    │
│     • send-push                          │
└─────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│   Firebase Cloud Messaging (FCM)         │
│   - Sends push notifications             │
│   - Uses your Firebase project:          │
│     maps-a9f90                           │
└─────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────┐
│   Android App (To be built)              │
│   - WebView loads your deployed site     │
│   - Receives FCM push notifications      │
│   - Displays home screen widget          │
└─────────────────────────────────────────┘
```

## Part 1: Deploy the Backend

### Step 1: Run Database Migration

Apply the new database migration to add the `device_tokens` table:

```bash
# If using Supabase CLI locally
npx supabase db push

# Or apply manually in Supabase Dashboard
# Go to SQL Editor and run the migration file:
# supabase/migrations/20251202000000_add_device_tokens.sql
```

### Step 2: Deploy Supabase Edge Functions

Deploy the two Edge Functions to your Supabase project:

```bash
# Login to Supabase CLI (if not already logged in)
npx supabase login

# Link to your project
npx supabase link --project-ref mnukqmhitjuduheckcjl

# Deploy the functions
npx supabase functions deploy register-device
npx supabase functions deploy send-push
```

### Step 3: Set Environment Variables for Edge Functions

Set the Firebase credentials as secrets for your Edge Functions:

```bash
# Set Firebase credentials
npx supabase secrets set FIREBASE_PROJECT_ID=maps-a9f90
npx supabase secrets set FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@maps-a9f90.iam.gserviceaccount.com
npx supabase secrets set FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----
MIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCQOBgJ9bFPSQIC
e8xAWK0a6zMTz48RGdsceKt/sRajuhDfXX8l8xvm6gi21WJMJwuAZC+FbZKQOd5E
kAWgaZObxo9Eznjj1+3hndIqcP6G93O2AMgQyFhBZsfDN/BGufogXCaCe4r4L/6P
OUCbZyiJyI8NdM2uMt+27lDenfi31k5cCwERPLrSby9exKn0NVrlb6oup373KnHh
9AEG9Fvi2JKXJdygnPnSzhYrNlRZPOjn9ljw7LYGoArb8j8TC5ErWit0wpGCkoQ1
lODqEtDTplEn+rUH1bmzTyLuUJTlReHarnTpVQjWYC7mxVoffV4LCf414z5bpnPK
jKQJ2/IhAgMBAAECggEAHyof97cCE9IA/yxlXNpMve5pYTSPA/EEakihNry72bGR
h9MacMbyFpooO+osjaw6TgpYQosFCumWYFaHAL0Pyq/Dsei0MvgsTX7fNZCpT90V
QhU1JntEpw1gyYzC/WWe6XNAVx3/T9Z/Oc/zaCGInw2Z7Bx7fdM8iLlC/HhCkOcJ
b5HPsTJZlRZcKU6PNs626WpA7VNGY8AZjTnDplvhSAyWLSFTaU70SsrPD7LItowb
scjGtHu1Ip5BCi54/wmKFznx94+in6J7BXVUGl69tiw/xVq6k6IFCW/zcX43nFHk
YbeU7NXvhT68ibqU9MrbT6emY85KsV/JqwvB7wGkSQKBgQDJtwyU/xRYLWHtMhMx
LdAhqhjRlAi3hEF2loj3dPpJsso6IKdZALWHmCxQ146z21edgc1nr4lujfAxSRVB
2e1/Vp0vyG0Z9Rwf9S99LTZGQIy40b+8Ua3g9wDIiG+Ry0Xp62kjCY7YbNOEx4kj
veL4xn/jOb6yOZwcCS/0ADuRFwKBgQC3B+wbGx96Q0t91UxXmQ+LuxVLXIqu4eQm
VDc21OeaczHYBB1lrav7Sjrq/Tcu8nA5+afweTNiHEEnw9LFzy3iYmKmr6rI8kYB
xYqinQgRcfwF2gkU3kZZBDucImMkrZX0eJSzTJRT221S4E7/6O1v9bVX/Cql88q7
DYLGeZBphwKBgQC6pIUf2GYasONLdmoLtzg97gXI5hCqvdVUxTU2wyZTyvsTjeNK
lz1gmY1nwAxqnyoSs2g76FBh2zPEZrskk2EN0jbfX7STsBi1+UhXqt3tYwzSdkHT
HkClR+eRpayWWl/2cbx2jwF9gDS3R2m9iJXbWtA6j9PDVUr9JgMY4p47QQKBgEby
rzcioGUISO8SC3G5Rylm764yxR9dOM8SvgRnKw/Xr26IycxsMcpKz+PfG9D68T3H
5K12jdBuG2OKqN08nhCvCoaKea1DHJf7Nu4p6MK6aHLsPbD1KFfBKEoxmjTRhNsr
EpkeCjEnUY1ancTdSYyotg7RFMcXZXJ0nkjJPo1pAoGAQFaZKQGZ/zjALhxyOSdo
GSQ8uXWde+ln/BLcvUn2iSFVQVBAA7m1L44RPk9j8QP/eSNGDvUVJKguL8BobsVB
6D/qbAECHlDQVDXOS55y3Nt+NT93WL3KwIcIlTl4fcsI9pqOjEW10LeucDtNP+zL
fvhhQfnpFlXoomv5LIch4Wk=
-----END PRIVATE KEY-----"
```

**Note:** The private key contains newlines. Make sure to wrap it in quotes and keep the `\n` characters.

### Step 4: Deploy Your Web App

Deploy your Vite/React app (already configured for Vercel):

```bash
# If using Vercel
npm run build
vercel --prod

# Or deploy via Vercel dashboard
# Your app is already configured with vercel.json
```

Your app will be deployed to something like: `https://glimpse-yourdomain.vercel.app`

## Part 2: Test the Backend

### Test Device Registration

```bash
# Get an auth token from your Supabase dashboard or login
# Then test the register-device endpoint:

curl -X POST https://mnukqmhitjuduheckcjl.supabase.co/functions/v1/register-device \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "test-fcm-token-123",
    "deviceInfo": {
      "model": "Test Device",
      "os": "Android 14"
    }
  }'
```

### Test Push Notification

```bash
curl -X POST https://mnukqmhitjuduheckcjl.supabase.co/functions/v1/send-push \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "USER_UUID_HERE",
    "type": "note",
    "content": "Test notification",
    "fromName": "Test User"
  }'
```

## Part 3: What's Been Added

### Database

**New Table: `device_tokens`**
- `id`: UUID primary key
- `user_id`: User who owns this device
- `token`: FCM device registration token
- `device_info`: JSON with device metadata
- `created_at`, `updated_at`: Timestamps

### API Endpoints (Supabase Edge Functions)

**1. `/functions/v1/register-device` (POST)**
- Registers a device's FCM token for a user
- Called from Android app when it gets an FCM token
- Request body:
  ```json
  {
    "token": "fcm-device-token",
    "deviceInfo": { "model": "Pixel 6", "os": "Android 14" }
  }
  ```

**2. `/functions/v1/send-push` (POST)**
- Sends push notification to a user's devices
- Called automatically when images/notes are shared
- Request body:
  ```json
  {
    "recipientId": "user-uuid",
    "type": "image" | "note",
    "content": "Text content",
    "imageUrl": "https://...",
    "fromName": "Sender Name"
  }
  ```

### Frontend Changes

**Modified: `src/pages/Camera.tsx`**
- Added push notification calls after sharing images/notes
- Sends notifications to all friends automatically

**New: `src/lib/pushNotifications.ts`**
- Helper functions for sending push notifications
- Gets list of friends who should receive notifications

## Part 4: Build the Android App

Now that your backend is ready, you need to create the Android app. Here's what it needs:

### Android App Structure

```
GlimpseApp/
├── WebView (loads your deployed web app)
├── Firebase Messaging Service (receives push)
└── Home Screen Widget (displays latest glimpse)
```

### Key Components to Build

1. **MainActivity.java** - WebView that loads your deployed URL
2. **MyFirebaseMessagingService.java** - Handles incoming FCM messages
3. **GlimpseWidget.java** - Home screen widget
4. **AndroidManifest.xml** - App configuration

### What the Android App Does

1. **On first launch:**
   - Opens WebView to your deployed Glimpse site
   - Gets FCM token from Firebase
   - Calls `/functions/v1/register-device` to register the token

2. **When user shares image/note:**
   - Done in the WebView (your existing web app)
   - Backend automatically sends push to friends

3. **When push notification arrives:**
   - `MyFirebaseMessagingService` receives it
   - Updates home screen widget
   - Shows notification to user

4. **Home screen widget:**
   - Displays latest image/note from friends
   - Updates when push notification arrives

### Firebase Setup for Android

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project: `maps-a9f90`
3. Add Android app:
   - Package name: `com.company.glimpse` (as shown in your google-services.json)
   - Download `google-services.json` (you already have this!)
   - Place it in `android/app/` directory

### Files You Already Have

- ✅ `google-services.json` - Firebase Android config
- ✅ Firebase Admin SDK credentials (for backend)

### Files You Need to Create

Would you like me to help you create the Android app files? I can generate:

1. **Basic Android Project Structure**
2. **MainActivity.java** with WebView
3. **FirebaseMessagingService** implementation
4. **Home Screen Widget** code
5. **AndroidManifest.xml** configuration
6. **build.gradle** files with dependencies

## API Reference

### Device Token Registration

**Endpoint:** `POST /functions/v1/register-device`

**Headers:**
```
Authorization: Bearer <supabase-user-token>
Content-Type: application/json
```

**Body:**
```json
{
  "token": "fcm-device-token-string",
  "deviceInfo": {
    "model": "Device Model",
    "os": "Android Version",
    "appVersion": "1.0.0"
  }
}
```

**Response:**
```json
{
  "ok": true
}
```

### Send Push Notification

**Endpoint:** `POST /functions/v1/send-push`

**Headers:**
```
Authorization: Bearer <supabase-user-token>
Content-Type: application/json
```

**Body:**
```json
{
  "recipientId": "uuid-of-recipient",
  "type": "image" | "note",
  "content": "Text content or caption",
  "imageUrl": "https://supabase.co/storage/...",
  "fromName": "Sender Display Name",
  "timestamp": "2025-12-02T10:30:00Z"
}
```

**Response:**
```json
{
  "ok": true,
  "sentTo": 2,
  "results": ["sent", "sent"]
}
```

## Environment Variables

### For Supabase Edge Functions (via secrets)

```bash
FIREBASE_PROJECT_ID=maps-a9f90
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@maps-a9f90.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### For Your Web App (.env)

```bash
VITE_SUPABASE_PROJECT_ID=mnukqmhitjuduheckcjl
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGc...
VITE_SUPABASE_URL=https://mnukqmhitjuduheckcjl.supabase.co
```

## Troubleshooting

### Edge Functions Not Working

```bash
# Check function logs
npx supabase functions logs register-device
npx supabase functions logs send-push

# Verify secrets are set
npx supabase secrets list
```

### Push Notifications Not Sending

1. Check Firebase Console → Cloud Messaging is enabled
2. Verify FCM tokens are being saved in `device_tokens` table
3. Check Edge Function logs for errors
4. Verify Firebase credentials are correct

### Database Migration Failed

```bash
# Reset and reapply migrations
npx supabase db reset
npx supabase db push
```

## Next Steps

1. ✅ Deploy backend (Steps 1-4 above)
2. ⏳ Build Android app
3. ⏳ Test end-to-end flow
4. ⏳ Publish to Google Play Store

Would you like help with creating the Android app files?
