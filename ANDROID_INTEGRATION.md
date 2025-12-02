# Android Integration Guide

## Overview

Your backend is now configured to work with the Android app. The `register-device` endpoint has been updated to accept `userId` directly from the Android app without requiring authentication headers.

## Backend Endpoint

### Register Device Token

**URL:** `https://mnukqmhitjuduheckcjl.supabase.co/functions/v1/register-device`

**Method:** `POST`

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "userId": "user-uuid-here",
  "token": "fcm-device-token",
  "deviceInfo": {
    "platform": "android",
    "model": "Device Model",
    "osVersion": "14"
  }
}
```

**Response:**
```json
{
  "ok": true
}
```

## Android App Configuration

### 1. Update MyFirebaseMessagingService

In your `MyFirebaseMessagingService.kt`, update the `sendTokenToBackend` function:

```kotlin
private fun sendTokenToBackend(token: String) {
    // TODO: Replace with your actual user's UUID from Supabase auth.users table
    val userId = "YOUR_SUPABASE_USER_UUID"

    val json = """
        {
          "userId": "$userId",
          "token": "$token",
          "deviceInfo": {
            "platform": "android",
            "model": "${android.os.Build.MODEL}",
            "osVersion": "${android.os.Build.VERSION.RELEASE}"
          }
        }
    """.trimIndent()

    val request = Request.Builder()
        .url("https://mnukqmhitjuduheckcjl.supabase.co/functions/v1/register-device")
        .post(json.toRequestBody("application/json".toMediaType()))
        .build()

    client.newCall(request).enqueue(object : Callback {
        override fun onFailure(call: Call, e: IOException) {
            Log.e(TAG, "Failed to send token to backend", e)
        }

        override fun onResponse(call: Call, response: Response) {
            if (response.isSuccessful) {
                Log.d(TAG, "Token sent to backend successfully")
            } else {
                Log.e(TAG, "Backend returned error: ${response.code}")
            }
        }
    })
}
```

### 2. Get Your User UUID

To get your Supabase user UUID:

1. Go to [Supabase Dashboard](https://supabase.com/dashboard/project/mnukqmhitjuduheckcjl/auth/users)
2. Click on "Authentication" → "Users"
3. Find your user and copy the UUID
4. Replace `YOUR_SUPABASE_USER_UUID` in the code above

For a 2-person app, you can:
- Hardcode User 1's UUID in one build
- Hardcode User 2's UUID in another build
- Or create two separate APKs (one for each person)

### 3. Test the Registration

After updating the code:

1. Rebuild and install the Android app
2. Launch the app (this triggers `onNewToken`)
3. Check Supabase logs:
   ```bash
   npx supabase functions logs register-device --tail
   ```
4. Verify in database:
   ```sql
   SELECT * FROM device_tokens;
   ```

You should see a row with your `user_id` and FCM token.

## Push Notification Flow

Once the device is registered:

1. **User shares content** (image/note) in the web app
2. **Backend automatically sends push** to all friends via `send-push` Edge Function
3. **FCM delivers** to Android device
4. **MyFirebaseMessagingService.onMessageReceived** is called
5. **Widget updates** with the new content

## Testing Push Notifications

### Manual Test (via curl)

```bash
curl -X POST https://mnukqmhitjuduheckcjl.supabase.co/functions/v1/send-push \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "YOUR_USER_UUID",
    "type": "note",
    "content": "Test notification from backend!",
    "fromName": "Test Sender",
    "timestamp": "2025-12-02T10:30:00Z"
  }'
```

### Automatic Test (share content in app)

1. Login to the web app as User A
2. Add User B as a friend
3. Share an image or note
4. User B's Android device should receive a push notification
5. User B's widget should update

## Troubleshooting

### Device Token Not Registering

**Check logs:**
```bash
npx supabase functions logs register-device --tail
```

**Common issues:**
- Wrong `userId` format (must be a valid UUID)
- Network error (check Android logcat)
- Function not deployed (redeploy with `npx supabase functions deploy register-device`)

### Push Notifications Not Received

**Check:**
1. Device token is in `device_tokens` table:
   ```sql
   SELECT * FROM device_tokens WHERE user_id = 'YOUR_UUID';
   ```

2. Firebase Cloud Messaging is enabled in Firebase Console

3. `google-services.json` is in the correct location (`app/` directory)

4. Check send-push logs:
   ```bash
   npx supabase functions logs send-push --tail
   ```

### Widget Not Updating

**Check:**
1. `onMessageReceived` is being called (add logs)
2. Data payload is correct format
3. Widget provider is registered in AndroidManifest.xml
4. Widget refresh logic is working

## Important URLs

- **Register Device Endpoint:** `https://mnukqmhitjuduheckcjl.supabase.co/functions/v1/register-device`
- **Send Push Endpoint:** `https://mnukqmhitjuduheckcjl.supabase.co/functions/v1/send-push`
- **Supabase Dashboard:** https://supabase.com/dashboard/project/mnukqmhitjuduheckcjl
- **Firebase Console:** https://console.firebase.google.com/project/maps-a9f90

## Security Note

For a production app with many users, you would:
- Use proper authentication (Supabase JWT)
- Let the app get `userId` from the logged-in session
- Add rate limiting
- Validate `userId` exists in your database

But for a 2-person app, hardcoding the UUIDs is perfectly fine and much simpler!

## Next Steps

1. ✅ Get your user UUID from Supabase
2. ✅ Update Android code with the correct endpoint and userId
3. ✅ Rebuild and install the app
4. ✅ Test device registration
5. ✅ Test push notifications
6. ✅ Test widget updates

Your backend is ready! Just update the Android app and you're good to go.
