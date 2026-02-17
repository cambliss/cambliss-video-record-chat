# 🚀 Render Deployment Guide

This guide will walk you through deploying your video calling app to Render so that recording functionality works.

## 📋 Prerequisites

- [Render Account](https://render.com) (Free tier is fine)
- [GitHub Account](https://github.com)
- Your local code ready to deploy

---

## Step 1: Set Up Git Repository

### 1.1 Initialize Git (if not already done)

```bash
# In your project root
git init
git add .
git commit -m "Initial commit - video calling app with chat and recording"
```

### 1.2 Create GitHub Repository

1. Go to [GitHub](https://github.com/new)
2. Create a new repository (e.g., `cambliss-video-call`)
3. **Don't** initialize with README (your code already has one)
4. Copy the repository URL

### 1.3 Push Code to GitHub

```bash
# Replace with your GitHub username and repo name
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

---

## Step 2: Create PostgreSQL Database on Render

1. **Go to Render Dashboard** → https://dashboard.render.com
2. **Click "New +"** → Select **"PostgreSQL"**
3. **Configure Database:**
   - **Name**: `cambliss-video-db` (or any name)
   - **Database**: `camblissvideomeet`
   - **User**: `cambliss` (auto-generated is fine)
   - **Region**: Choose closest to you
   - **Plan**: Free (or paid if you prefer)
4. **Click "Create Database"**
5. **Save the Connection String:**
   - Go to database info page
   - Copy **"Internal Database URL"** (starts with `postgresql://`)
   - Keep this handy for Step 3

---

## Step 3: Deploy Web Service on Render

### 3.1 Create Web Service

1. **Go to Render Dashboard** → Click **"New +"** → Select **"Web Service"**
2. **Connect Repository:**
   - Choose "Connect GitHub"
   - Authorize Render
   - Select your repository

### 3.2 Configure Web Service

**Basic Settings:**
- **Name**: `cambliss-video-call` (or any name)
- **Region**: Same as your database
- **Branch**: `main`
- **Root Directory**: (leave empty)
- **Runtime**: `Node`
- **Build Command**: 
  ```
  npm install && npx prisma generate && npx prisma db push && npm run build
  ```
- **Start Command**: 
  ```
  npm start
  ```
- **Plan**: Free (or paid)

### 3.3 Add Environment Variables

Click **"Advanced"** → **"Add Environment Variable"** and add these:

| Key | Value | Notes |
|-----|-------|-------|
| `ACCESS_KEY` | Your 100ms access key | From your .env.local |
| `APP_SECRET` | Your 100ms app secret | From your .env.local |
| `DATABASE_URL` | PostgreSQL connection string | From Step 2 |
| `GOOGLE_CLIENT_ID` | Your Google OAuth ID | From your .env.local |
| `GOOGLE_CLIENT_SECRET` | Your Google OAuth secret | From your .env.local |
| `HMS_MANAGEMENT_TOKEN` | Your HMS token | From your .env.local |
| `HMS_ROOM_ID` | Your HMS room ID | From your .env.local |
| `NEXTAUTH_SECRET` | Generate new: `openssl rand -base64 32` | Security token |
| `NEXTAUTH_URL` | `https://your-app-name.onrender.com` | Will get after deploy |
| `NEXT_PUBLIC_APP_URL` | `https://your-app-name.onrender.com` | Same as NEXTAUTH_URL |
| `NODE_VERSION` | `18.17.0` | Specify Node version |
| `PORT` | `10000` | Render default port |
| `RAZORPAY_KEY` | Your Razorpay key | From your .env.local |
| `RAZORPAY_SECRET` | Your Razorpay secret | From your .env.local |
| `RESEND_API_KEY` | Your Resend API key | From your .env.local |
| `SMTP_PASS` | Your SMTP password | From your .env.local |
| `SMTP_USER` | Your SMTP email | From your .env.local |
| `TEMPLATE_ID` | Your template ID | From your .env.local |
| `TOKEN_ENDPOINT` | `https://api.100ms.live/v2` | 100ms endpoint |

**Important Notes:**
- Replace `your-app-name` with your actual Render app name
- After first deploy, update `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL` with your actual Render URL
- Generate a new `NEXTAUTH_SECRET` for production security

### 3.4 Deploy

1. Click **"Create Web Service"**
2. Wait for deployment (5-10 minutes first time)
3. Watch the logs for any errors

---

## Step 4: Update OAuth URLs

### 4.1 Get Your Render URL

After deployment completes, you'll see your URL: `https://your-app-name.onrender.com`

### 4.2 Update Google OAuth Settings

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Navigate to **APIs & Services** → **Credentials**
3. Click your OAuth 2.0 Client ID
4. Add to **Authorized JavaScript origins**:
   ```
   https://your-app-name.onrender.com
   ```
5. Add to **Authorized redirect URIs**:
   ```
   https://your-app-name.onrender.com/api/auth/callback/google
   ```
6. Click **Save**

### 4.3 Update Environment Variables on Render

1. Go back to your Render dashboard
2. Click your web service
3. Go to **Environment** tab
4. Update these variables with your actual Render URL:
   - `NEXTAUTH_URL` → `https://your-app-name.onrender.com`
   - `NEXT_PUBLIC_APP_URL` → `https://your-app-name.onrender.com`
5. Click **Save Changes** (app will redeploy automatically)

---

## Step 5: Test Recording

1. **Open your deployed app**: `https://your-app-name.onrender.com`
2. **Sign in with Google**
3. **Create a new call**
4. **Join the call**
5. **Click the record button** 🔴
6. **You should see:**
   - ✅ "Recording started" message
   - ✅ Timer appears: "REC 00:00"
   - ✅ Button turns red and pulses
7. **Click record button again to stop**
8. **Check recordings**: Profile → Recordings

---

## 🐛 Troubleshooting

### Build Fails

**Error: "prisma generate failed"**
- Check DATABASE_URL is correct
- Try build command: `npm install && npx prisma generate && npm run build`

**Error: "Module not found"**
- Clear Render cache: Settings → Clear build cache
- Redeploy

### Google OAuth Not Working

**Error: "redirect_uri_mismatch"**
- Check Google OAuth settings have correct Render URL
- Ensure NEXTAUTH_URL in Render matches your app URL
- Allow 5-10 minutes for Google to update settings

### Recording Still Doesn't Work

**Check these:**
1. Are you accessing via HTTPS? (Render URL, not localhost)
2. Is `NEXTAUTH_URL` set to your Render URL?
3. Check browser console for errors
4. Verify HMS_MANAGEMENT_TOKEN is correct
5. Check Render logs for API errors

### Database Connection Issues

**Error: "Can't reach database server"**
- Verify DATABASE_URL is the Internal Database URL from Render
- Check database is in same region as web service
- Ensure database is running (Render dashboard)

---

## 📊 Free Tier Limits

Render Free Tier includes:
- ✅ Web Service: 750 hours/month
- ✅ PostgreSQL: 90 days free, then $7/month
- ✅ Automatic deploys from GitHub
- ⚠️ App spins down after 15 min inactivity (takes ~30s to wake up)

---

## 🔄 Making Updates

After initial deployment, to update your app:

```bash
# Make your changes locally
git add .
git commit -m "Your commit message"
git push origin main
```

Render will automatically detect the push and redeploy!

---

## 🎉 Success Checklist

- [ ] Git repository created and pushed to GitHub
- [ ] PostgreSQL database created on Render
- [ ] Web service deployed on Render
- [ ] All environment variables added
- [ ] Google OAuth redirect URIs updated
- [ ] NEXTAUTH_URL and NEXT_PUBLIC_APP_URL updated with Render URL
- [ ] App accessible via HTTPS
- [ ] Google login works
- [ ] Recording works with timer
- [ ] Recordings visible in dashboard

---

## 💡 Pro Tips

1. **Use Render Dashboard** to monitor logs in real-time
2. **Set up custom domain** in Render settings (optional)
3. **Enable auto-deploy** for automatic updates on git push
4. **Monitor database usage** to avoid running out of space
5. **Upgrade to paid plan** if you need 24/7 uptime

---

## 📞 Need Help?

- **Render Docs**: https://render.com/docs
- **100ms Docs**: https://www.100ms.live/docs
- **Issues**: Check your browser console and Render logs

Happy deploying! 🚀
