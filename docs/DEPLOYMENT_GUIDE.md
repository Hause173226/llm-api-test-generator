# Deployment Guide

## LLM-Assisted API Test Generator - Frontend

**Version**: 1.0.0  
**Status**: Production Ready  
**Date**: March 27, 2026

---

## 📋 Pre-Deployment Checklist

### Environment Setup

- [ ] Configure production API URL
- [ ] Configure production SignalR hub URL
- [ ] Set up SSL certificates
- [ ] Configure CORS on backend
- [ ] Set up CDN (optional)

### Build Configuration

- [ ] Update `.env.production` file
- [ ] Test production build locally
- [ ] Verify bundle size
- [ ] Check for console errors
- [ ] Test all pages in production mode

### Security

- [ ] Review API endpoints
- [ ] Verify JWT token handling
- [ ] Check for exposed secrets
- [ ] Enable HTTPS only
- [ ] Configure CSP headers

---

## 🔧 Environment Configuration

### Development (.env)

```env
VITE_API_BASE_URL=https://localhost:44312/api
VITE_SIGNALR_HUB_URL=https://localhost:44312/hubs/testrun
```

### Production (.env.production)

```env
VITE_API_BASE_URL=https://api.yourdomain.com/api
VITE_SIGNALR_HUB_URL=https://api.yourdomain.com/hubs/testrun
```

### Staging (.env.staging)

```env
VITE_API_BASE_URL=https://staging-api.yourdomain.com/api
VITE_SIGNALR_HUB_URL=https://staging-api.yourdomain.com/hubs/testrun
```

---

## 🏗️ Build Process

### Install Dependencies

```bash
cd FE/llm-api-test-generator
npm install
```

### Development Build

```bash
npm run dev
```

Access at: `http://localhost:5173`

### Production Build

```bash
npm run build
```

Output directory: `dist/`

### Preview Production Build

```bash
npm run preview
```

---

## 🚀 Deployment Options

### Option 1: Static Hosting (Vercel, Netlify)

**Vercel**:

```bash
npm install -g vercel
vercel --prod
```

**Netlify**:

```bash
npm install -g netlify-cli
netlify deploy --prod --dir=dist
```

### Option 2: Docker

**Dockerfile**:

```dockerfile
FROM node:20-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

**Build and Run**:

```bash
docker build -t llm-api-test-frontend .
docker run -p 80:80 llm-api-test-frontend
```

### Option 3: AWS S3 + CloudFront

```bash
# Build
npm run build

# Upload to S3
aws s3 sync dist/ s3://your-bucket-name --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation --distribution-id YOUR_DIST_ID --paths "/*"
```

### Option 4: Azure Static Web Apps

```bash
# Install Azure CLI
npm install -g @azure/static-web-apps-cli

# Deploy
swa deploy --app-location ./dist --api-location "" --output-location ""
```

---

## 🔒 Security Configuration

### CORS Setup (Backend)

Ensure backend allows your frontend domain:

```csharp
builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowFrontend", policy =>
    {
        policy.WithOrigins("https://yourdomain.com")
              .AllowAnyMethod()
              .AllowAnyHeader()
              .AllowCredentials();
    });
});
```

### Content Security Policy

Add to `index.html`:

```html
<meta
  http-equiv="Content-Security-Policy"
  content="default-src 'self'; 
               script-src 'self' 'unsafe-inline'; 
               style-src 'self' 'unsafe-inline'; 
               connect-src 'self' https://api.yourdomain.com;"
/>
```

---

## 📊 Monitoring Setup

### Error Tracking (Sentry)

```bash
npm install @sentry/react
```

**src/main.tsx**:

```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: import.meta.env.MODE,
  tracesSampleRate: 1.0,
});
```

### Analytics (Google Analytics)

```bash
npm install react-ga4
```

**src/main.tsx**:

```typescript
import ReactGA from "react-ga4";

ReactGA.initialize("YOUR_GA_MEASUREMENT_ID");
```

---

## 🧪 Testing Before Deployment

### Manual Testing Checklist

- [ ] Login/logout flow
- [ ] Create/edit/delete project
- [ ] Upload specification
- [ ] Create test suite
- [ ] Run test case
- [ ] View reports
- [ ] Real-time notifications
- [ ] Dark mode toggle
- [ ] Responsive design (mobile/tablet)
- [ ] All pages load correctly

### Automated Testing

```bash
# Unit tests
npm run test

# E2E tests (if configured)
npm run test:e2e

# Build test
npm run build
```

---

## 🔄 CI/CD Pipeline

### GitHub Actions Example

**.github/workflows/deploy.yml**:

```yaml
name: Deploy Frontend

on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: "20"

      - name: Install dependencies
        run: |
          cd FE/llm-api-test-generator
          npm ci

      - name: Build
        run: |
          cd FE/llm-api-test-generator
          npm run build
        env:
          VITE_API_BASE_URL: ${{ secrets.API_BASE_URL }}
          VITE_SIGNALR_HUB_URL: ${{ secrets.SIGNALR_HUB_URL }}

      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v20
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.ORG_ID }}
          vercel-project-id: ${{ secrets.PROJECT_ID }}
          working-directory: FE/llm-api-test-generator
```

---

## 📱 Post-Deployment

### Verification Steps

1. **Access the application**
   - Open production URL
   - Verify SSL certificate
   - Check console for errors

2. **Test core functionality**
   - Login with test account
   - Create a test project
   - Run a test case
   - Check real-time updates

3. **Monitor performance**
   - Check page load times
   - Verify API response times
   - Monitor error rates

4. **Check analytics**
   - Verify tracking is working
   - Check user sessions
   - Monitor page views

### Rollback Plan

If issues occur:

1. **Immediate rollback**:

   ```bash
   # Vercel
   vercel rollback

   # Netlify
   netlify rollback
   ```

2. **Manual rollback**:
   - Redeploy previous version
   - Update DNS if needed
   - Notify users

---

## 🐛 Troubleshooting

### Common Issues

**Issue**: API calls failing

- Check CORS configuration
- Verify API URL in environment variables
- Check network tab in browser DevTools

**Issue**: SignalR not connecting

- Verify SignalR hub URL
- Check WebSocket support
- Review browser console logs

**Issue**: Build fails

- Clear node_modules and reinstall
- Check Node.js version (requires 18+)
- Verify all dependencies are installed

**Issue**: White screen after deployment

- Check browser console for errors
- Verify base URL in vite.config.ts
- Check if assets are loading correctly

---

## 📞 Support

### Resources

- **Documentation**: `/docs` folder
- **API Docs**: Backend API documentation
- **Issue Tracker**: GitHub Issues
- **Team Contact**: [Your contact info]

### Monitoring Dashboards

- **Uptime**: [Uptime monitor URL]
- **Analytics**: [Analytics dashboard URL]
- **Errors**: [Error tracking dashboard URL]
- **Performance**: [Performance monitoring URL]

---

## 🎉 Success Criteria

Deployment is successful when:

- ✅ Application loads without errors
- ✅ All pages are accessible
- ✅ API calls work correctly
- ✅ SignalR connects successfully
- ✅ Authentication flow works
- ✅ Real-time notifications appear
- ✅ No console errors
- ✅ Performance metrics are acceptable
- ✅ Mobile/tablet views work correctly
- ✅ Dark mode functions properly

---

**Deployment Guide Version**: 1.0.0  
**Last Updated**: March 27, 2026  
**Status**: Ready for Production 🚀
