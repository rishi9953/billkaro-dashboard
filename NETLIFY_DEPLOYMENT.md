# Netlify Deployment Guide

This guide will help you deploy your Bill Karo Dashboard to Netlify.

## Prerequisites

1. A Netlify account (sign up at https://netlify.com)
2. Your code pushed to a Git repository (GitHub, GitLab, or Bitbucket)

## Deployment Steps

### Option 1: Deploy via Netlify UI (Recommended)

1. **Push your code to GitHub/GitLab/Bitbucket**
   ```bash
   git add .
   git commit -m "Prepare for Netlify deployment"
   git push origin main
   ```

2. **Go to Netlify Dashboard**
   - Visit https://app.netlify.com
   - Click "Add new site" → "Import an existing project"
   - Connect your Git provider and select your repository

3. **Configure Build Settings**
   - **Build command:** `npm run build`
   - **Publish directory:** `dist/billkaro-dashboard/browser`
   - Netlify will automatically detect the `netlify.toml` file, so these settings should be pre-filled

4. **Deploy**
   - Click "Deploy site"
   - Wait for the build to complete
   - Your site will be live at a URL like `https://your-site-name.netlify.app`

### Option 2: Deploy via Netlify CLI

1. **Install Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **Login to Netlify**
   ```bash
   netlify login
   ```

3. **Initialize and Deploy**
   ```bash
   netlify init
   netlify deploy --prod
   ```

## Important Notes

### Build Output Directory
If the default publish directory doesn't work, check your build output:
```bash
npm run build
```
Then check the `dist` folder to see the exact structure and update `netlify.toml` accordingly.

### Environment Variables
If you need to set environment variables (like API URLs):
1. Go to Site settings → Environment variables
2. Add your variables there
3. Access them in your Angular app using `process.env['VARIABLE_NAME']`

### Custom Domain
1. Go to Site settings → Domain management
2. Add your custom domain
3. Follow Netlify's DNS configuration instructions

## Troubleshooting

### Build Fails
- Check the build logs in Netlify dashboard
- Ensure Node.js version is compatible (set in `netlify.toml`)
- Verify all dependencies are in `package.json`

### Routing Issues
- The `_redirects` file in the `public` folder handles SPA routing
- All routes redirect to `index.html` for client-side routing

### Assets Not Loading
- Ensure `angular.json` has assets configured correctly
- Check that image paths use relative paths (e.g., `assets/images/logo.jpeg`)

## Files Created for Deployment

- `netlify.toml` - Netlify configuration file
- `public/_redirects` - SPA routing redirects
- Updated `package.json` - Production build script







