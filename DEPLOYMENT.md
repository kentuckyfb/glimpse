# Glimpse Deployment Guide

## Prerequisites
- Vercel account
- Supabase project (already set up at `mnukqmhitjuduheckcjl.supabase.co`)

## Step 1: Configure Vercel Environment Variables

In your Vercel project settings, add these environment variables:

### Environment Variables (Settings → Environment Variables)

```
VITE_SUPABASE_URL=https://mnukqmhitjuduheckcjl.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1udWtxbWhpdGp1ZHVoZWNrY2psIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MDYzMjIsImV4cCI6MjA3MDk4MjMyMn0.rDHHCeqTJfuzKHl6xKE4q7GyVih1sQ8GHXsEW_hIzFU
VITE_SUPABASE_PROJECT_ID=mnukqmhitjuduheckcjl
```

**Important:** Make sure to set these for all environments (Production, Preview, Development)

## Step 2: Configure Supabase Authentication URLs

Go to your Supabase Dashboard:
1. Navigate to **Authentication** → **URL Configuration**
2. Update the **Site URL** to your Vercel production URL (e.g., `https://glimpse-peach-three.vercel.app`)
3. Add your Vercel URLs to **Redirect URLs**:
   - `https://your-app-name.vercel.app/*`
   - `https://your-app-name.vercel.app`
   - Any preview deployment URLs if needed (e.g., `https://*.vercel.app/*`)

### Current Redirect URLs (from your screenshot):
You already have some URLs configured. Make sure your current deployment URL is in the list:
- ✅ `https://glimpse-peach-three.vercel.app`
- ✅ `https://glimpse-peach-three.vercel.app/*`

## Step 3: Deploy to Vercel

### Option A: Via Vercel CLI
```bash
npm install -g vercel
vercel login
vercel --prod
```

### Option B: Via Vercel Dashboard
1. Go to [vercel.com](https://vercel.com)
2. Click "Import Project"
3. Select your GitHub repository
4. Vercel will auto-detect Vite configuration
5. Click "Deploy"

## Step 4: Verify Deployment

After deployment:
1. Visit your Vercel URL
2. Try to sign up for a new account
3. Try to log in with existing credentials
4. Check browser console for any errors

## Troubleshooting

### Error: 400 Bad Request on Login
**Cause:** Redirect URL not configured in Supabase

**Solution:**
1. Go to Supabase Dashboard → Authentication → URL Configuration
2. Add your exact Vercel URL to Redirect URLs
3. Make sure to include both:
   - `https://your-app.vercel.app`
   - `https://your-app.vercel.app/*`

### Error: 404 on Routes
**Cause:** SPA routing not configured

**Solution:**
- Already fixed with `vercel.json` file that redirects all routes to `index.html`

### Environment Variables Not Working
**Cause:** Environment variables not set in Vercel or not prefixed with `VITE_`

**Solution:**
1. Go to Vercel Dashboard → Settings → Environment Variables
2. Add all variables with `VITE_` prefix
3. Redeploy the application

### Authentication Works Locally but Not on Vercel
**Cause:** Localhost URL is in Supabase Site URL

**Solution:**
- Change Site URL in Supabase to your production Vercel URL
- Keep localhost in Redirect URLs for local development

## Important Notes

1. **Never commit `.env` file** - It's already in `.gitignore`
2. **Environment variables must start with `VITE_`** - This is required for Vite to expose them to the client
3. **Redeploy after changing environment variables** - Vercel needs to rebuild with new variables
4. **Wildcard URLs in Supabase** - Using `https://*.vercel.app/*` allows all preview deployments

## Security Checklist

- ✅ Environment variables are set in Vercel (not hardcoded)
- ✅ Supabase Anon Key is safe to expose (it's client-safe)
- ✅ RLS policies are enabled in Supabase
- ✅ `.env` file is in `.gitignore`
- ✅ Site URL matches production domain
- ✅ Redirect URLs include production and preview domains

## Need Help?

Common issues:
1. **CORS errors** → Check Supabase URL Configuration
2. **404 on refresh** → Check `vercel.json` is deployed
3. **Auth not persisting** → Check localStorage is enabled
4. **Token errors** → Check environment variables are correct
