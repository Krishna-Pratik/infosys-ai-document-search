# Vercel Deployment Guide

## Steps:

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Login:**
   ```bash
   vercel login
   ```

3. **Deploy:**
   ```bash
   cd frontend
   vercel
   ```

4. **Update API URL:**
   - After Render deployment, copy backend URL
   - Edit `index.html` line 202:
   ```javascript
   const API_URL = 'https://your-render-url.onrender.com';
   ```

5. **Redeploy:**
   ```bash
   vercel --prod
   ```

## OR GitHub Integration:
1. Push `frontend/` folder to GitHub
2. Go to vercel.com → Import Project
3. Select repo → Root Directory: `frontend`
4. Deploy
5. Add environment variable in Vercel dashboard:
   ```
   VITE_API_URL=https://your-render-url.onrender.com
   ```
