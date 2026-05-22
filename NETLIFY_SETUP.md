# Netlify Deployment Setup

To deploy this application successfully on Netlify, you need to configure the following Environment Variables in the Netlify Dashboard (**Site settings > Build & deploy > Environment > Environment variables**).

## Required Variables

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Your Supabase Project URL (e.g., `https://xyz.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase Anonymous Key |
| `LINE_CHANNEL_ACCESS_TOKEN` | (Optional) For LINE Messaging API notifications. **DO NOT include quotes.** |
| `LINE_GROUP_ID` | (Optional) The Group ID. **DO NOT include quotes.** |
| `APP_URL` | The URL of your site (e.g., `https://your-site.netlify.app`) |

## ⚠️ Important Note on 401 Unauthorized (LINE API)
If you get a 401 error, it usually means:
1. Your `LINE_CHANNEL_ACCESS_TOKEN` is incorrectly pasted in Netlify UI (check for leading/trailing spaces or quotes).
2. The token has expired.
3. You didn't set the variables in the Netlify Dashboard correctly.

### Check your Netlify Logs
Go to **Functions > api** on Netlify to see the real-time logs. The application now includes robust logging to help you identify if keys are missing or malformed.

## Build Settings

- **Build command:** `npm run build`
- **Publish directory:** `dist`

## Supabase Database Initialization

Make sure you have run the SQL commands in `supabase_schema.sql` in your Supabase SQL Editor and initialized the data using `seed_supabase.ts` if needed.
