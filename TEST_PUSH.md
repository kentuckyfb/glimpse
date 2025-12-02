# Testing Push Notifications

Once you've deployed the Edge Functions and set the secrets, you can test the push notification system.

## Test 1: Register a Device Token

```bash
# Replace YOUR_USER_TOKEN with a real Supabase auth token
# You can get this from your browser's localStorage after logging in
# Look for: sb-mnukqmhitjuduheckcjl-auth-token

curl -X POST https://mnukqmhitjuduheckcjl.supabase.co/functions/v1/register-device \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "token": "test-fcm-token-12345",
    "deviceInfo": {
      "model": "Test Device",
      "os": "Android 14"
    }
  }'
```

Expected response:
```json
{"ok": true}
```

## Test 2: Send a Push Notification

```bash
# Replace YOUR_USER_TOKEN with your auth token
# Replace RECIPIENT_USER_ID with the UUID of the user who should receive the push

curl -X POST https://mnukqmhitjuduheckcjl.supabase.co/functions/v1/send-push \
  -H "Authorization: Bearer YOUR_USER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "RECIPIENT_USER_ID",
    "type": "note",
    "content": "Test notification from curl!",
    "fromName": "Test Sender",
    "timestamp": "2025-12-02T10:30:00Z"
  }'
```

Expected response:
```json
{
  "ok": true,
  "sentTo": 1,
  "results": ["sent"]
}
```

## Test 3: Check Database

Verify the device token was stored:

```sql
-- Run this in Supabase SQL Editor
SELECT * FROM device_tokens;
```

You should see your test token in the database.

## Test 4: End-to-End Test (After Android App is Built)

1. Install the Android app on your phone
2. Login to your account
3. The app will automatically register its FCM token
4. Have a friend share an image or note
5. You should receive a push notification
6. The widget should update automatically

## Troubleshooting

### Function Logs

Check logs for errors:

```bash
npx supabase functions logs register-device --tail
npx supabase functions logs send-push --tail
```

### Check Secrets

Verify secrets are set:

```bash
npx supabase secrets list
```

You should see:
- FIREBASE_PROJECT_ID
- FIREBASE_CLIENT_EMAIL
- FIREBASE_PRIVATE_KEY

### Common Errors

**"No device tokens found for user"**
- User hasn't registered their device yet
- Check the device_tokens table

**"Failed to send FCM notification"**
- Check Firebase credentials are correct
- Verify Cloud Messaging is enabled in Firebase Console
- Check the FCM token is valid (not expired)

**"Unauthorized"**
- The Authorization header is missing or invalid
- Get a fresh token from Supabase auth
