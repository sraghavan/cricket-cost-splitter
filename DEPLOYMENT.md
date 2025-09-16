# Cricket Cost Splitter - Deployment Guide

## 🚀 Quick Deploy to Vercel

### Step 1: Push to GitHub
```bash
# If you don't have a GitHub repository yet:
# 1. Create a new repository on GitHub
# 2. Add the remote origin:
git remote add origin https://github.com/yourusername/cricket-cost-splitter.git
git branch -M main
git push -u origin main
```

### Step 2: Deploy to Vercel
1. Go to [Vercel](https://vercel.com)
2. Sign in with GitHub
3. Click "New Project"
4. Import your GitHub repository
5. Vercel will automatically detect it's a React app
6. Click "Deploy"

Your app will be live at: `https://your-project-name.vercel.app`

## 📱 Database Setup (Optional but Recommended)

To sync data across devices, set up Firebase:

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com)
2. Click "Create a project"
3. Enter project name: `cricket-cost-splitter`
4. Enable Google Analytics (optional)
5. Click "Create project"

### Step 2: Set up Firestore Database
1. In Firebase Console, click "Firestore Database"
2. Click "Create database"
3. Choose "Start in test mode" (for now)
4. Select a region close to you
5. Click "Done"

### Step 3: Get Firebase Configuration
1. In Firebase Console, click the gear icon → "Project settings"
2. Scroll down to "Your apps"
3. Click the web icon `</>`
4. Register app with nickname: `cricket-cost-splitter`
5. Copy the config values

### Step 4: Configure Environment Variables

#### For Local Development:
1. Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

2. Edit `.env.local` with your Firebase config:
```env
REACT_APP_FIREBASE_API_KEY=your_api_key_here
REACT_APP_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
REACT_APP_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
REACT_APP_FIREBASE_APP_ID=your_app_id
```

#### For Vercel Deployment:
1. Go to your Vercel project dashboard
2. Click "Settings" → "Environment Variables"
3. Add each variable:
   - `REACT_APP_FIREBASE_API_KEY` → your_api_key_here
   - `REACT_APP_FIREBASE_AUTH_DOMAIN` → your_project_id.firebaseapp.com
   - `REACT_APP_FIREBASE_PROJECT_ID` → your_project_id
   - `REACT_APP_FIREBASE_STORAGE_BUCKET` → your_project_id.appspot.com
   - `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` → your_sender_id
   - `REACT_APP_FIREBASE_APP_ID` → your_app_id

4. Redeploy the project (Vercel will auto-deploy on next push)

### Step 5: Set Firebase Security Rules
1. Go to Firestore Database → Rules
2. Update rules to allow read/write:
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow read/write access to cricket-cost-splitter collection
    match /cricket-cost-splitter/{document} {
      allow read, write: if true;
    }
    // Allow read/write access to backups
    match /cricket-cost-splitter-backups/{document} {
      allow read, write: if true;
    }
  }
}
```
3. Click "Publish"

## ✨ Features with Database Sync

Once Firebase is configured, your app will have:

- ✅ **Real-time sync** across all devices
- ✅ **Offline support** - works without internet
- ✅ **Automatic backups** 
- ✅ **Data persistence** - never lose your data
- ✅ **Multi-device access** - phone, tablet, laptop

## 🔧 Development Commands

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Test the build locally
npx serve -s build
```

## 📋 Environment Setup Checklist

- [ ] GitHub repository created and code pushed
- [ ] Vercel project deployed
- [ ] Firebase project created
- [ ] Firestore database enabled
- [ ] Firebase config copied
- [ ] Environment variables set in Vercel
- [ ] Firebase security rules updated
- [ ] App tested on multiple devices

## 🆘 Troubleshooting

### Firebase not working?
1. Check environment variables are set correctly
2. Verify Firebase project ID matches
3. Ensure Firestore rules allow read/write
4. Check browser console for errors

### Vercel deployment failed?
1. Check build logs in Vercel dashboard
2. Ensure all dependencies are in package.json
3. Verify environment variables are set

### Data not syncing?
1. Check internet connection
2. Open browser dev tools → Console for errors
3. Verify Firebase configuration
4. Try refreshing the page

## 🔒 Security Notes

- Current setup uses test mode for Firestore (anyone can read/write)
- For production, implement proper authentication
- Consider user-specific data isolation
- Regular backup your data

---

Happy cricket cost splitting! 🏏