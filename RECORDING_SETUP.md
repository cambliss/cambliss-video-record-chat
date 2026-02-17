# Recording Setup Guide

## Why Recording Doesn't Work on Localhost

100ms recording requires the meeting URL to be **publicly accessible on the internet**. When running on `localhost:3000`, 100ms servers cannot reach your computer to join and record the meeting.

## ✅ Solutions to Enable Recording

### **Option 1: Deploy Your Application (Recommended for Production)**

Deploy your app to a hosting service:

**Popular Options:**
- **Vercel** (Easiest for Next.js)
- **Render**
- **Railway**
- **Netlify**

**Steps:**
1. Push your code to GitHub
2. Connect your repo to Vercel/Render
3. Set environment variables in hosting dashboard
4. Update `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` to your deployed URL
5. Recording will work automatically!

---

### **Option 2: Use ngrok for Local Development Testing**

ngrok creates a secure tunnel to expose your localhost to the internet.

**Steps:**

1. **Install ngrok**
   ```bash
   # Download from https://ngrok.com/download
   # Or install via npm
   npm install -g ngrok
   ```

2. **Start ngrok**
   ```bash
   # In a new terminal, run:
   ngrok http 3000
   ```

3. **Update your .env.local**
   ```env
   # Copy the ngrok HTTPS URL (e.g., https://abc123.ngrok.io)
   NEXTAUTH_URL=https://your-ngrok-url.ngrok.io
   NEXT_PUBLIC_APP_URL=https://your-ngrok-url.ngrok.io
   ```

4. **Restart your dev server**
   ```bash
   npm run dev
   ```

5. **Access your app via ngrok URL**
   - Open browser: `https://your-ngrok-url.ngrok.io`
   - Start a call and test recording

**Note:** ngrok URLs change each restart on free plan. Update `.env.local` each time.

---

### **Option 3: Alternative Recording Methods**

If you need to record locally without deployment:

1. **Client-Side Recording** (Browser-based)
   - Use MediaRecorder API
   - Record locally in user's browser
   - Download recording file directly
   - ⚠️ Requires implementing custom recording logic

2. **Screen Recording Software**
   - OBS Studio
   - ShareX
   - Loom
   - ⚠️ Manual process, not integrated

---

## 🧪 Testing Recording

Once you have a public URL:

1. **Start a call**
2. **Click the record button** (red circle icon)
3. **Timer appears**: "REC 00:00" counting up
4. **Click again to stop**
5. **Check recordings**: Profile → Recordings

---

## ⚙️ Environment Variables Checklist

For recording to work, ensure these are set in `.env.local`:

```env
# 100ms Configuration
ACCESS_KEY=your_access_key
APP_SECRET=your_app_secret
HMS_MANAGEMENT_TOKEN=your_management_token
TOKEN_ENDPOINT=https://api.100ms.live/v2

# Public URL (must be accessible from internet)
NEXTAUTH_URL=https://your-domain.com  # or ngrok URL
NEXT_PUBLIC_APP_URL=https://your-domain.com  # or ngrok URL

# Database
DATABASE_URL=postgresql://...
```

---

## 🔍 Troubleshooting

**"Recording unavailable on localhost"**
- You're running on localhost. Use ngrok or deploy.

**"Beam couldn't connect to Meeting URL"**
- URL is not accessible from internet
- Check if NEXTAUTH_URL is set correctly
- Verify URL is HTTPS (required for recordings)

**Recording starts then stops immediately**
- Check browser console for errors
- Verify 100ms credentials are correct
- Ensure room permissions allow recording

**No timer appears**
- Check browser console logs
- Recording may have failed to start
- Try stopping and restarting

---

## 📚 Additional Resources

- [100ms Recording Docs](https://www.100ms.live/docs/server-side/v2/features/recordings)
- [ngrok Documentation](https://ngrok.com/docs)
- [Vercel Deployment](https://vercel.com/docs)

---

## 💡 Quick Fix for Testing

Want to test quickly? Use ngrok:

```bash
# Terminal 1: Start your app
npm run dev

# Terminal 2: Start ngrok
ngrok http 3000

# Copy the HTTPS URL from ngrok
# Update NEXTAUTH_URL and NEXT_PUBLIC_APP_URL
# Restart dev server
# Access via ngrok URL
```

Recording will now work! 🎉
