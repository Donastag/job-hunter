# Job Hunter - Production Setup Guide

This guide walks you through setting up the Job Hunter application for production deployment on Vercel with PostgreSQL database.

## 🚀 Quick Start

### 1. Database Setup

#### Option A: Vercel Postgres (Recommended)
1. In your Vercel project, go to **Storage** → **Postgres**
2. Click **Add Storage** and create a new PostgreSQL database
3. Copy the connection string from the database settings

#### Option B: External PostgreSQL
1. Set up a PostgreSQL database (e.g., on Supabase, Railway, or your own server)
2. Ensure the database is accessible from Vercel

### 2. Environment Variables

Set these environment variables in your Vercel project dashboard:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# Authentication
NEXTAUTH_SECRET="your-secure-secret-here"  # Generate with: openssl rand -base64 32
NEXTAUTH_URL="https://your-app.vercel.app"

# OAuth Providers (optional but recommended)
GITHUB_ID="your-github-oauth-client-id"
GITHUB_SECRET="your-github-oauth-client-secret"
GOOGLE_ID="your-google-oauth-client-id"
GOOGLE_SECRET="your-google-oauth-client-secret"

# Production Environment
NODE_ENV="production"
```

### 3. Database Migration

Run the database migration to set up your production database:

```bash
# Locally (if you have access to your production database)
npm run db:deploy

# Or via Vercel CLI
vercel --prod
```

### 4. Deploy to Production

```bash
# Deploy to production
vercel --prod
```

## 🔧 Platform Integrations

### Upwork RSS Integration

To connect real Upwork RSS feeds:

1. Go to Upwork and find your RSS feed URL for job searches
2. Update the RSS feed URL in `lib/platforms/upwork.ts`
3. Set the RSS feed URL as an environment variable:

```bash
UPWORK_RSS_URL="https://www.upwork.com/ab/feed/jobs/rss?q=your-search-terms"
```

### LinkedIn Integration

For LinkedIn job integration:

1. Set up LinkedIn Developer account
2. Create an app and get API credentials
3. Set environment variables:

```bash
LINKEDIN_API_KEY="your-linkedin-api-key"
LINKEDIN_API_SECRET="your-linkedin-api-secret"
```

### Other Platforms

Similar setup for:
- **Contra**: Set up webhooks or API integration
- **Toptal**: Use their API or RSS feeds
- **Manual**: Continue using the manual job entry system

## 🛡️ Production Hardening

### Security Headers

The application includes basic security headers. For production, consider adding:

```javascript
// In next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'origin-when-cross-origin',
          },
        ],
      },
    ]
  },
}
```

### Rate Limiting

Consider implementing rate limiting for API endpoints:

```bash
# Install rate limiting package
npm install express-rate-limit
```

### Monitoring

Set up monitoring with:
- **Vercel Analytics** for performance monitoring
- **Sentry** for error tracking
- **LogRocket** for session replay

### Backup Strategy

1. **Database Backups**: Set up automated backups in your PostgreSQL provider
2. **Application Backups**: Use Vercel's deployment history
3. **Environment Variables**: Store secrets securely in Vercel dashboard

## 📊 Performance Optimization

### Image Optimization

- Use WebP format for images
- Implement lazy loading for job listings
- Compress images before upload

### Caching

- Enable Vercel's edge caching
- Implement SWR caching for API calls
- Use Redis for session storage (if needed)

### Bundle Optimization

- Analyze bundle size with `next build --analyze`
- Implement code splitting
- Use dynamic imports for heavy components

## 🔍 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Verify DATABASE_URL format
   - Check database accessibility from Vercel
   - Ensure proper database permissions

2. **OAuth Not Working**
   - Verify callback URLs in OAuth provider settings
   - Check NEXTAUTH_URL is correct
   - Ensure secrets are properly set

3. **Build Failures**
   - Check Node.js version compatibility
   - Verify all dependencies are installed
   - Check for TypeScript compilation errors

### Debug Commands

```bash
# Check environment variables
vercel env ls

# View deployment logs
vercel logs

# Test database connection
npm run db:setup:prod

# Generate new migration
npm run db:migrate
```

## 📈 Scaling Considerations

### Database Scaling

- Use connection pooling
- Consider read replicas for high traffic
- Monitor query performance

### Application Scaling

- Use Vercel's automatic scaling
- Implement proper caching strategies
- Monitor resource usage

### Cost Optimization

- Use appropriate database tier
- Monitor Vercel usage metrics
- Implement efficient data fetching

## 🚨 Security Checklist

- [ ] Change default NEXTAUTH_SECRET
- [ ] Enable HTTPS (automatic on Vercel)
- [ ] Set up proper CORS policies
- [ ] Validate and sanitize all inputs
- [ ] Implement proper error handling
- [ ] Regular security updates
- [ ] Monitor for suspicious activity

## 📞 Support

For issues or questions:
1. Check the [GitHub Issues](https://github.com/your-repo/job-hunter/issues)
2. Review Vercel documentation
3. Check Prisma documentation for database issues
4. Consult Next.js documentation for framework issues

---

**Note**: Always test changes in a staging environment before deploying to production.