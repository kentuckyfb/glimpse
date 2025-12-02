# Quick Reference Card

## Your Project Info

### Supabase
- **Project ID:** `mnukqmhitjuduheckcjl`
- **URL:** https://mnukqmhitjuduheckcjl.supabase.co
- **Dashboard:** https://supabase.com/dashboard/project/mnukqmhitjuduheckcjl

### Firebase
- **Project ID:** `maps-a9f90`
- **Console:** https://console.firebase.google.com/project/maps-a9f90

### Your User
- **UUID:** `a4e96b26-46b4-4cee-959a-8ca9ed28dd41`

## Key Endpoints

### Device Registration
```
POST https://mnukqmhitjuduheckcjl.supabase.co/functions/v1/register-device
Content-Type: application/json

{
  "userId": "a4e96b26-46b4-4cee-959a-8ca9ed28dd41",
  "token": "fcm-device-token",
  "deviceInfo": { "platform": "android" }
}
```

### Send Push Notification
```
POST https://mnukqmhitjuduheckcjl.supabase.co/functions/v1/send-push
Content-Type: application/json

{
  "recipientId": "a4e96b26-46b4-4cee-959a-8ca9ed28dd41",
  "type": "note",
  "content": "Your message",
  "fromName": "Sender Name"
}
```

## Quick Commands

### Development
```bash
npm run dev              # Start dev server
npm run build            # Build for production
```

### Supabase
```bash
npx supabase login       # Login to Supabase
npx supabase link        # Link project
npx supabase db push     # Apply migrations
npx supabase functions deploy register-device --no-verify-jwt
npx supabase functions deploy send-push --no-verify-jwt
npx supabase secrets list # View secrets
```

### Git
```bash
git status               # Check status
git add .                # Stage all changes
git commit -m "message"  # Commit
git push origin main     # Push to GitHub
```

## Files Location

### Local (Not in Git)
- `.env` - Your Supabase keys
- `supabase/.env` - Your Firebase credentials
- `firebase-key.json` - Firebase service account

### In Git
- `.env.example` - Template
- `src/` - Source code
- `supabase/functions/` - Edge Functions
- `supabase/migrations/` - Database schema

## Troubleshooting

### App won't start
```bash
# Check .env exists
ls .env

# Reinstall dependencies
rm -rf node_modules
npm install
```

### Edge Functions failing
```bash
# Check secrets
npx supabase secrets list

# View logs
npx supabase functions logs register-device
```

### Push notifications not working
1. Check device token is registered: `SELECT * FROM device_tokens;`
2. Verify Firebase secrets are set
3. Check Firebase Cloud Messaging is enabled

## Documentation Index

- 📱 [ANDROID_QUICK_START.md](ANDROID_QUICK_START.md) - Start here for Android
- 🔒 [SECURITY.md](SECURITY.md) - Security guidelines
- ⚙️ [SETUP.md](SETUP.md) - Complete setup
- 🚀 [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md) - Current status
- 📝 [GIT_COMMIT_GUIDE.md](GIT_COMMIT_GUIDE.md) - How to commit safely
- 🧪 [TEST_PUSH.md](TEST_PUSH.md) - Testing notifications

## Android Integration

### Update MyFirebaseMessagingService.kt
```kotlin
val userId = "a4e96b26-46b4-4cee-959a-8ca9ed28dd41"

val request = Request.Builder()
    .url("https://mnukqmhitjuduheckcjl.supabase.co/functions/v1/register-device")
    .post(json.toRequestBody("application/json".toMediaType()))
    .build()
```

See [ANDROID_QUICK_START.md](ANDROID_QUICK_START.md) for full details.

## Status

✅ Backend deployed
✅ Database configured
✅ Edge Functions live
✅ Security configured
✅ Ready for Android integration

Last Updated: December 2, 2025
