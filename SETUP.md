# Setup Guide for Enhanced Features

## Quick Start

Follow these steps to set up all the new enhanced features:

### Step 1: Update Package Dependencies
```bash
# Install required packages
pnpm add pusher pusher-js

# Or if you prefer npm
npm install pusher pusher-js
```

### Step 2: Run Database Migration
```bash
# Create migration from updated schema
npx prisma migrate dev --name add_enhanced_features

# If migration fails, you can reset and reseed
npx prisma migrate reset

# Generate Prisma client
npx prisma generate
```

### Step 3: Update Environment Variables

Create or update your `.env` file with these new variables:

```env
# Existing variables...
DATABASE_URL="your_database_url"
NEXTAUTH_SECRET="your_secret"
# ... other existing vars

# NEW: Pusher Configuration (Optional but Recommended)
# Sign up at https://pusher.com for free account
PUSHER_APP_ID="your_pusher_app_id"
PUSHER_KEY="your_pusher_key"
PUSHER_SECRET="your_pusher_secret"
NEXT_PUBLIC_PUSHER_KEY="your_pusher_key"
NEXT_PUBLIC_PUSHER_CLUSTER="your_cluster"  # e.g., "us2", "eu", "ap1"
```

### Step 4: Update env.mjs

**Location**: `src/env.mjs`

Add these to your environment schema:

```javascript
export const env = createEnv({
  server: {
    // ...existing server variables
    
    // Add these:
    PUSHER_APP_ID: z.string().optional(),
    PUSHER_KEY: z.string().optional(),
    PUSHER_SECRET: z.string().optional(),
  },

  client: {
    // ...existing client variables
    
    // Add these:
    NEXT_PUBLIC_PUSHER_KEY: z.string().optional(),
    NEXT_PUBLIC_PUSHER_CLUSTER: z.string().optional(),
  },

  runtimeEnv: {
    // ...existing runtimeEnv mappings
    
    // Add these:
    PUSHER_APP_ID: process.env.PUSHER_APP_ID,
    PUSHER_KEY: process.env.PUSHER_KEY,
    PUSHER_SECRET: process.env.PUSHER_SECRET,
    NEXT_PUBLIC_PUSHER_KEY: process.env.NEXT_PUBLIC_PUSHER_KEY,
    NEXT_PUBLIC_PUSHER_CLUSTER: process.env.NEXT_PUBLIC_PUSHER_CLUSTER,
  },
});
```

### Step 5: Update Your Call Component

Replace old components with enhanced versions in your call page:

**Location**: `src/app/(call)/call/[id]/page.tsx` (or wherever your call component is)

```tsx
// OLD imports - remove these
import { FileTransfer } from "~/components/call/file-transfer";
import { CallChat } from "~/components/call/call-chat";

// NEW imports - use these instead
import { FileTransferEnhanced } from "~/components/call/file-transfer-enhanced";
import { CallChatEnhanced } from "~/components/call/call-chat-enhanced";

// In your component:
export default function CallPage({ params }: { params: { id: string } }) {
  return (
    <>
      {/* Replace FileTransfer with FileTransferEnhanced */}
      <FileTransferEnhanced callId={callId} roomId={roomId} />
      
      {/* Replace CallChat with CallChatEnhanced */}
      <CallChatEnhanced callId={callId} roomId={roomId} />
    </>
  );
}
```

### Step 6: Add Notification Center

Add to your main layout or navbar:

**Location**: `src/components/layout/navbar.tsx` or `src/app/layout.tsx`

```tsx
import { getServerSession } from "next-auth";
import { authOptions } from "~/server/auth";
import { NotificationCenter } from "~/components/notifications/notification-center";

export default async function Layout({ children }) {
  const session = await getServerSession(authOptions);
  
  return (
    <div>
      <nav>
        {/* Your existing navbar items */}
        
        {/* Add notification center */}
        {session && <NotificationCenter userId={session.user.id} />}
      </nav>
      
      {children}
    </div>
  );
}
```

### Step 7: Add Analytics Dashboard

Create a new analytics page:

**Location**: `src/app/(account)/analytics/page.tsx`

```tsx
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "~/server/auth";
import { AnalyticsDashboard } from "~/components/analytics/analytics-dashboard";

export const metadata = {
  title: "Analytics | Cambliss",
  description: "View your call analytics and statistics",
};

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/login");
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-neutral-400">
          View your call statistics and usage patterns
        </p>
      </div>

      <AnalyticsDashboard />
    </div>
  );
}
```

### Step 8: Test Everything

```bash
# Start development server
pnpm dev

# Test the following:
# 1. Create a call
# 2. Send messages with reactions
# 3. Upload files with drag & drop
# 4. Edit/delete your messages
# 5. Check notification center
# 6. View analytics dashboard
# 7. Export call history
```

---

## Common Issues & Solutions

### Issue: Pusher not working
**Solution**: 
- Check if environment variables are set correctly
- Verify Pusher credentials at https://dashboard.pusher.com
- The app will fall back to polling if Pusher fails

### Issue: Database migration fails
**Solution**:
```bash
# Reset database (WARNING: This deletes all data)
npx prisma migrate reset

# Or manually update schema and create migration
npx prisma migrate dev --create-only
# Edit the migration file
npx prisma migrate dev
```

### Issue: TypeScript errors
**Solution**:
```bash
# Regenerate Prisma client
npx prisma generate

# Clear Next.js cache
rm -rf .next

# Restart dev server
pnpm dev
```

### Issue: File upload not working
**Solution**:
- Check file size limits (default 50MB)
- Verify `public/uploads` directory exists and is writable
- Check Next.js config for file upload limits

---

## Feature Toggles

You can disable features by commenting them out:

### Disable Real-time (use polling instead)
Just don't set the Pusher environment variables. The app will automatically fall back to polling.

### Disable Notifications
Remove `<NotificationCenter />` component from your layout.

### Disable Analytics
Don't add the analytics page.

---

## Performance Tips

1. **Database Indexing**: Already added in schema (callId indexes)
2. **File Storage**: Consider moving to cloud storage (S3, Cloudflare R2) for production
3. **Pusher Limits**: Free tier has limits; upgrade for production
4. **Caching**: Consider Redis for caching analytics data

---

## Security Checklist

- [ ] Set strong `NEXTAUTH_SECRET`
- [ ] Use HTTPS in production
- [ ] Secure Pusher credentials
- [ ] Validate file uploads server-side
- [ ] Implement rate limiting
- [ ] Enable CORS appropriately
- [ ] Add file type restrictions if needed

---

## Production Deployment

### Before deploying:

1. ✅ Run all database migrations
2. ✅ Test all features locally
3. ✅ Set up Pusher account
4. ✅ Configure environment variables in your hosting platform
5. ✅ Set up cloud file storage (optional)
6. ✅ Enable HTTPS
7. ✅ Test on staging environment

### Vercel Deployment:

```bash
# Add environment variables in Vercel dashboard
vercel env add PUSHER_APP_ID
vercel env add PUSHER_KEY
vercel env add PUSHER_SECRET
vercel env add NEXT_PUBLIC_PUSHER_KEY
vercel env add NEXT_PUBLIC_PUSHER_CLUSTER

# Deploy
vercel --prod
```

---

## What's Next?

After setup, you can:

1. **Customize Emoji Reactions**: Edit `EMOJI_REACTIONS` in `call-chat-enhanced.tsx`
2. **Adjust File Size Limits**: Change `maxSize` in `file-transfer-enhanced.tsx`
3. **Add More Notification Types**: Extend notification types in schema
4. **Custom Analytics**: Add more metrics to analytics dashboard
5. **Branding**: Customize colors and styles

---

## Support

Need help? Check:
- 📖 Main documentation: `ENHANCED_FEATURES.md`
- 🔍 Component code for implementation details
- 🗄️ Schema: `prisma/schema.prisma`

---

**Ready to go! Your Cambliss app now has enterprise-grade features! 🚀**
