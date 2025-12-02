# Security & Sensitive Files

## ⚠️ Important Security Information

This project has been configured to **exclude sensitive files** from Git. The following files contain API keys, private keys, and credentials that must NEVER be committed to a public repository.

## Protected Files (Already in .gitignore)

### Environment Variables
- `.env` - Contains Supabase API keys
- `.env.local`, `.env.production`, `.env.development`
- `supabase/.env` - Contains Firebase private key and credentials

### Firebase Credentials
- `firebase-key.json` - Firebase service account key (CRITICAL)
- `*firebase-adminsdk*.json` - Any Firebase admin SDK keys
- `google-services.json` - Android Firebase configuration
- `serviceAccountKey.json` - Alternative service account key name

### Supabase Configuration
- `.supabase/` - Local Supabase development files
- `supabase/.temp/` - Temporary Supabase files
- `supabase/config.toml` - Local configuration

## What's Safe to Commit

✅ **These files are safe and should be committed:**
- `.env.example` - Template for environment variables (no actual keys)
- `supabase/.env.example` - Template for Firebase credentials (no actual keys)
- `supabase/migrations/*.sql` - Database schema migrations
- `supabase/functions/*/index.ts` - Edge function code
- All source code in `src/`
- Documentation files (*.md)

## Setup for New Developers

If you're setting up this project:

1. **Copy example files:**
   ```bash
   cp .env.example .env
   cp supabase/.env.example supabase/.env
   ```

2. **Fill in your own credentials:**
   - Get Supabase keys from your Supabase dashboard
   - Download Firebase service account key from Firebase Console
   - See [SETUP.md](SETUP.md) for detailed instructions

3. **NEVER commit these files:**
   - The `.gitignore` is configured to protect you
   - Double-check before pushing: `git status`

## What to Do If You Accidentally Commit Secrets

If you accidentally commit sensitive files:

1. **Immediately rotate all credentials:**
   - Generate new Supabase API keys
   - Generate new Firebase service account key
   - Update all deployed services with new keys

2. **Remove from Git history:**
   ```bash
   # Remove the file from all history
   git filter-branch --force --index-filter \
   "git rm --cached --ignore-unmatch PATH/TO/FILE" \
   --prune-empty --tag-name-filter cat -- --all

   # Force push (if already pushed)
   git push origin --force --all
   ```

3. **Report the incident:**
   - Contact your team immediately
   - Document what was exposed and for how long

## Current Status

✅ **Sensitive files have been removed from Git tracking**

The following files were previously tracked and have been removed:
- `.env`
- `supabase/.env`

These files still exist locally but will no longer be committed to Git.

## Verification

To verify sensitive files are properly ignored:

```bash
# Check what's ignored
git check-ignore .env supabase/.env firebase-key.json

# Verify they're not tracked
git ls-files .env supabase/.env

# Should return nothing if properly untracked
```

## Environment Variables Reference

### Frontend (.env)
```env
VITE_SUPABASE_PROJECT_ID=your-project-id
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-public-key
VITE_SUPABASE_URL=https://your-project.supabase.co
```

**Note:** These are public keys and can be exposed in the frontend. They're still in `.gitignore` for consistency, but they're not as critical as backend secrets.

### Backend (supabase/.env - Edge Functions)
```env
FIREBASE_PROJECT_ID=your-firebase-project-id
FIREBASE_CLIENT_EMAIL=your-service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

**CRITICAL:** These are set as Supabase secrets and should NEVER be in Git:
```bash
npx supabase secrets set FIREBASE_PROJECT_ID=...
npx supabase secrets set FIREBASE_CLIENT_EMAIL=...
npx supabase secrets set FIREBASE_PRIVATE_KEY="..."
```

## Best Practices

1. ✅ Always use `.example` files for templates
2. ✅ Keep `.gitignore` updated
3. ✅ Use environment variables for all secrets
4. ✅ Use secret management systems (Supabase secrets, Vercel env vars)
5. ✅ Rotate credentials regularly
6. ✅ Never hardcode API keys in source code
7. ✅ Review commits before pushing
8. ✅ Use pre-commit hooks to detect secrets

## Questions?

See [SETUP.md](SETUP.md) for detailed setup instructions.
