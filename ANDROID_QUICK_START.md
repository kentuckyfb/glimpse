# Android Quick Start Guide

## Backend is Ready! ✅

Your Glimpse backend is fully configured and ready for Android integration.

## What You Need to Do in Your Android App

### Step 1: Update the Endpoint URL

In `MyFirebaseMessagingService.kt`, change:

```kotlin
// OLD (won't work):
.url("https://glimpse-peach-three.vercel.app/api/register-device")

// NEW (correct):
.url("https://mnukqmhitjuduheckcjl.supabase.co/functions/v1/register-device")
```

### Step 2: Update Request Body Format

Change the request body to include `userId`:

```kotlin
private fun sendTokenToBackend(token: String) {
    // TODO: Get your actual UUID from Supabase Dashboard
    val userId = "YOUR_USER_UUID_HERE"

    val json = """
        {
          "userId": "$userId",
          "token": "$token",
          "deviceInfo": {
            "platform": "android"
          }
        }
    """.trimIndent()

    val request = Request.Builder()
        .url("https://mnukqmhitjuduheckcjl.supabase.co/functions/v1/register-device")
        .post(json.toRequestBody("application/json".toMediaType()))
        .build()

    client.newCall(request).enqueue(object : Callback {
        override fun onFailure(call: Call, e: IOException) {
            Log.e(TAG, "Failed to register device: ${e.message}")
        }

        override fun onResponse(call: Call, response: Response) {
            if (response.isSuccessful) {
                Log.d(TAG, "Device registered successfully!")
            } else {
                Log.e(TAG, "Registration failed: ${response.code}")
            }
        }
    })
}
```

### Step 3: Get Your User UUID

1. Go to: https://supabase.com/dashboard/project/mnukqmhitjuduheckcjl/auth/users
2. Find your user account
3. Copy the UUID (looks like: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)
4. Replace `YOUR_USER_UUID_HERE` in the code above

### Step 4: Rebuild and Test

```bash
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

### Step 5: Verify It Works

Check the logs:

```bash
# Android logs
adb logcat | grep FirebaseMessaging

# Backend logs
npx supabase functions logs register-device --tail
```

You should see:
- "Device registered successfully!" in Android logs
- Device token stored in Supabase database

## Testing Push Notifications

Once your device is registered, test the full flow:

### Option 1: Share Content in Web App

1. Open your web app at http://localhost:8080
2. Login and share an image or note
3. Your Android device should receive a push notification
4. Widget should update

### Option 2: Manual Test with curl

```bash
curl -X POST https://mnukqmhitjuduheckcjl.supabase.co/functions/v1/send-push \
  -H "Content-Type: application/json" \
  -d '{
    "recipientId": "YOUR_USER_UUID",
    "type": "note",
    "content": "Test from backend!",
    "fromName": "Test Sender"
  }'
```

## Troubleshooting

### "Failed to register device"

**Check:**
- Endpoint URL is correct
- User UUID is valid (copied from Supabase)
- Internet connection is working
- View backend logs: `npx supabase functions logs register-device`

### "Push notifications not received"

**Check:**
1. Device is registered:
   ```sql
   SELECT * FROM device_tokens WHERE user_id = 'YOUR_UUID';
   ```

2. Firebase Cloud Messaging is enabled in Firebase Console

3. `google-services.json` is in `app/` directory

4. Check push logs:
   ```bash
   npx supabase functions logs send-push --tail
   ```

## Complete Documentation

For more details, see:
- [ANDROID_INTEGRATION.md](ANDROID_INTEGRATION.md) - Full integration guide
- [DEPLOYMENT_STATUS.md](DEPLOYMENT_STATUS.md) - Backend status
- [TEST_PUSH.md](TEST_PUSH.md) - Testing instructions

## That's It!

Your backend is ready. Just update those 3 things in your Android app:
1. ✅ Endpoint URL
2. ✅ Request body format
3. ✅ User UUID

Then rebuild and you're good to go! 🚀
