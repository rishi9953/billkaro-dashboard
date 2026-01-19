# GitHub Pages Deployment Guide

This guide will help you deploy your Bill Karo Dashboard to GitHub Pages.

## Prerequisites

1. A GitHub account
2. Your code pushed to a GitHub repository
3. GitHub Pages enabled in your repository settings

## Setup Steps

### 1. Enable GitHub Pages

1. Go to your repository on GitHub
2. Click on **Settings** → **Pages**
3. Under **Source**, select **GitHub Actions** (not "Deploy from a branch")
4. Save the settings

### 2. Push Your Code

The GitHub Actions workflow will automatically deploy your site when you push to the `main` or `master` branch:

```bash
git add .
git commit -m "Configure GitHub Pages deployment"
git push origin main
```

### 3. Monitor Deployment

1. Go to the **Actions** tab in your GitHub repository
2. You'll see the "Deploy to GitHub Pages" workflow running
3. Wait for it to complete (usually 2-3 minutes)
4. Once complete, your site will be available at:
   - `https://rishi9953.github.io/billkaro-dashboard/`
   - Or your custom domain if configured

## Important Notes

### API Configuration

⚠️ **GitHub Pages doesn't support server-side proxies**, so the API calls go directly to `https://65.2.81.212/api`. 

**CORS Requirements:**
- Your backend server must allow CORS requests from your GitHub Pages domain
- Add the following headers to your backend API:
  ```
  Access-Control-Allow-Origin: https://rishi9953.github.io
  Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
  Access-Control-Allow-Headers: Content-Type, Authorization
  ```

### Custom Domain

If you want to use a custom domain:

1. Add a `CNAME` file in the `public` folder with your domain name
2. Configure DNS settings as per GitHub Pages documentation
3. Update the CORS headers on your backend to include your custom domain

### Repository Name Considerations

Your repository is configured for: `https://rishi9953.github.io/billkaro-dashboard/`

The `baseHref` in `angular.json` is set to `/billkaro-dashboard/` which matches your repository name.

If you want to use a custom domain:
- Update the `baseHref` to `/` in `angular.json`
- Add a `CNAME` file in the `public` folder

## Manual Deployment (Alternative)

If you prefer to deploy manually:

```bash
# Build the project
npm run build

# The output will be in dist/billkaro-dashboard/browser/
# You can then push this folder to the gh-pages branch
```

## Troubleshooting

### Build Fails
- Check the Actions tab for error messages
- Ensure Node.js version 20 is compatible
- Verify all dependencies are in `package.json`

### 404 Errors on Routes
- The `404.html` file handles SPA routing
- Ensure it's in the `public` folder (it will be copied during build)

### API Calls Fail (CORS Errors)
- Verify your backend allows CORS from your GitHub Pages domain
- Check browser console for specific CORS error messages
- Update backend CORS configuration if needed

### Site Not Updating
- Clear browser cache
- Check if the GitHub Actions workflow completed successfully
- Verify the deployment was successful in the Actions tab

## Files Created/Modified

- `.github/workflows/deploy.yml` - GitHub Actions workflow for automatic deployment
- `public/404.html` - Handles SPA routing for GitHub Pages
- `angular.json` - Updated with `baseHref` configuration
- `src/app/utilities/constant/api-url.constant.ts` - Updated to use direct API URL
- `src/app/app.config.ts` - Added GitHub Pages routing support

