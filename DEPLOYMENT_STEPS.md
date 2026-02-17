# 🚀 Quick Deployment Steps

## Step 1: Configure Git with Your Account

Run these commands (replace with YOUR GitHub credentials):

```bash
# Set your GitHub username
git config --local user.name "YourGitHubUsername"

# Set your GitHub email
git config --local user.email "your-email@example.com"
```

## Step 2: Commit Your Code

```bash
git commit -m "Initial commit: Video calling app with chat and recording"
```

## Step 3: Create New GitHub Repository

1. **Go to GitHub**: https://github.com/new
2. **Repository name**: `cambliss-video-call` (or any name)
3. **Description** (optional): "Video calling application with chat and recording"
4. **Visibility**: Private or Public (your choice)
5. **DO NOT** check "Initialize with README, .gitignore, or license"
6. **Click**: "Create repository"

## Step 4: Push to Your New Repository

GitHub will show you commands. Use these:

```bash
# Replace YOUR_USERNAME and YOUR_REPO_NAME with actual values
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
git branch -M main
git push -u origin main
```

**Example:**
```bash
git remote add origin https://github.com/sunaina/cambliss-video-call.git
git branch -M main
git push -u origin main
```

You'll be prompted for credentials:
- Username: Your GitHub username
- Password: Use a **Personal Access Token** (not your GitHub password)

### How to Create GitHub Personal Access Token:

1. Go to: https://github.com/settings/tokens
2. Click "Generate new token" → "Generate new token (classic)"
3. Name: "Render Deployment"
4. Select scopes: ✅ **repo** (all)
5. Click "Generate token"
6. **COPY THE TOKEN** (you won't see it again!)
7. Use this token as your password when pushing

## Step 5: Deploy to Render

Follow the complete guide in [RENDER_DEPLOYMENT.md](RENDER_DEPLOYMENT.md)

Quick summary:
1. **Create PostgreSQL Database** on Render
2. **Create Web Service** on Render
3. **Connect your GitHub repository**
4. **Add environment variables**
5. **Deploy!**

---

## ⚡ Quick Commands Summary

```bash
# 1. Configure git
git config --local user.name "YourUsername"
git config --local user.email "your-email@example.com"

# 2. Commit
git commit -m "Initial commit: Video calling app"

# 3. Add remote (after creating GitHub repo)
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main

# 4. Done! Now deploy on Render
```

---

## 🔐 Important Security Notes

- ✅ `.env.local` is already in `.gitignore` (won't be pushed)
- ✅ Your secrets are safe
- ✅ Set environment variables in Render dashboard
- ⚠️ Never commit `.env` files to GitHub

---

Ready to deploy? Follow these steps in order! 🚀
