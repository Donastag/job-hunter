# Job Hunter - Production-Ready Freelance Job Management

A modern, production-ready application for managing freelance job applications with real-time job platform integrations.

## 🚀 Features

### Core Functionality
- **Job Management**: Track jobs from multiple platforms (Upwork, LinkedIn, manual entry)
- **Lead Tracking**: Manage client leads and communication history
- **Template System**: Reusable proposal templates with performance analytics
- **Smart Filtering**: Advanced search and filtering across all job sources
- **Priority System**: Tier-based job prioritization (Priority, Alert, Normal)

### Platform Integrations
- **Upwork RSS Integration**: Real-time job feeds from Upwork
- **LinkedIn API Integration**: Professional job listings
- **Manual Entry**: Traditional job entry for any platform
- **Auto-Sync**: Background synchronization with platform APIs

### Production Features
- **Multi-Database Support**: SQLite (dev) + PostgreSQL (production)
- **OAuth Authentication**: GitHub and Google OAuth integration
- **Security Hardening**: Rate limiting, CORS, security headers
- **Mobile Responsive**: Fully responsive design
- **Performance Optimized**: SWR caching, image optimization

## 🛠️ Tech Stack

### Frontend
- **Next.js 16** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first styling
- **Zustand** - State management
- **SWR** - Data fetching and caching

### Backend
- **Next.js API Routes** - Serverless functions
- **Prisma ORM** - Database ORM
- **SQLite** - Development database
- **PostgreSQL** - Production database
- **NextAuth.js** - Authentication

### Platform Integrations
- **RSS Parser** - Upwork job feeds
- **LinkedIn API** - Professional job listings
- **Platform Manager** - Unified job aggregation

### Production Infrastructure
- **Vercel** - Hosting and deployment
- **Security Middleware** - Production security measures
- **Environment Validation** - Configuration validation
- **Error Handling** - Production error management

## 📦 Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- PostgreSQL (for production)

### Development Setup

1. **Clone and Install**
```bash
git clone <your-repo-url>
cd job-hunter
npm install
```

2. **Environment Setup**
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

3. **Database Setup**
```bash
# Development (SQLite)
npm run db:push

# Production (PostgreSQL)
npm run db:migrate
```

4. **Start Development**
```bash
npm run dev
```

## 🚀 Production Deployment

### Vercel Deployment

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin <your-github-repo>
git push -u origin main
```

2. **Connect to Vercel**
- Import your GitHub repository
- Environment variables will be auto-detected
- Deploy!

3. **Environment Variables**
Set these in Vercel dashboard:

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/database"

# Authentication
NEXTAUTH_SECRET="your-secure-secret"
NEXTAUTH_URL="https://your-app.vercel.app"

# OAuth Providers
GITHUB_ID="your-github-client-id"
GITHUB_SECRET="your-github-client-secret"
GOOGLE_ID="your-google-client-id"
GOOGLE_SECRET="your-google-client-secret"

# Platform Integrations
UPWORK_RSS_URL="https://www.upwork.com/ab/feed/jobs/rss?q=your-search"
LINKEDIN_API_KEY="your-linkedin-api-key"
LINKEDIN_API_SECRET="your-linkedin-api-secret"
```

### Database Migration
```bash
# Deploy database changes
npm run db:deploy
```

## 🔧 Configuration

### Environment Variables

#### Required
- `DATABASE_URL` - Database connection string
- `NEXTAUTH_SECRET` - NextAuth secret key
- `NEXTAUTH_URL` - Application URL

#### OAuth (Optional but Recommended)
- `GITHUB_ID` - GitHub OAuth client ID
- `GITHUB_SECRET` - GitHub OAuth client secret
- `GOOGLE_ID` - Google OAuth client ID
- `GOOGLE_SECRET` - Google OAuth client secret

#### Platform Integrations
- `UPWORK_RSS_URL` - Upwork RSS feed URL
- `LINKEDIN_API_KEY` - LinkedIn API key
- `LINKEDIN_API_SECRET` - LinkedIn API secret

### Database Configuration

#### Development (SQLite)
```bash
DATABASE_URL="file:./dev.db"
```

#### Production (PostgreSQL)
```bash
DATABASE_URL="postgresql://user:password@host:5432/database"
```

## 📊 Platform Integrations

### Upwork Integration

1. **Get RSS Feed URL**
   - Go to Upwork job search
   - Find your search RSS feed URL
   - Set as `UPWORK_RSS_URL` environment variable

2. **Auto-Sync Jobs**
```bash
# Sync jobs from Upwork
npm run sync:jobs
```

### LinkedIn Integration

1. **Set Up LinkedIn Developer Account**
   - Create app at https://www.linkedin.com/developers/
   - Get API key and secret
   - Set as environment variables

2. **Job Search**
```typescript
import { PlatformManager } from './lib/platforms/manager'

const manager = new PlatformManager()
const jobs = await manager.searchJobs('React Developer', {
  platform: ['linkedin'],
  type: ['Full-time']
})
```

## 🛡️ Security Features

### Built-in Security
- **Rate Limiting**: 100 requests per 15 minutes per IP
- **CORS Protection**: Whitelist-based CORS
- **Security Headers**: XSS, CSRF, and content security protection
- **Input Validation**: Email and URL validation
- **Environment Validation**: Required variable checking

### Security Headers
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `X-XSS-Protection: 1; mode=block`
- `Content-Security-Policy`: Strict CSP
- `Strict-Transport-Security`: HSTS

### Rate Limiting
- 100 requests per 15-minute window
- IP-based tracking
- Automatic cleanup of old requests
- 429 response with Retry-After header

## 📈 Performance Optimization

### Caching Strategy
- **SWR Caching**: Client-side data caching
- **Database Indexing**: Optimized queries
- **Image Optimization**: Next.js image optimization
- **Bundle Splitting**: Code splitting for faster loads

### Database Optimization
- **Connection Pooling**: Efficient database connections
- **Query Optimization**: Indexed queries
- **Migration Management**: Schema versioning

### Frontend Optimization
- **Lazy Loading**: Component lazy loading
- **Bundle Analysis**: `npm run analyze` for bundle size
- **Image Optimization**: WebP format support

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run linting
npm run db:generate  # Generate Prisma client
npm run db:push      # Push schema to database
npm run db:migrate   # Create and run migrations
npm run db:deploy    # Deploy to production database
npm run db:setup:prod # Production database setup
```

### Database Commands

```bash
# Development
npm run db:push

# Production
npm run db:migrate
npm run db:deploy

# Production setup
npm run db:setup:prod
```

### Platform Management

```bash
# Sync jobs from all platforms
npm run sync:jobs

# Check platform stats
npm run platform:stats
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**
   - Check `DATABASE_URL` format
   - Verify database accessibility
   - Ensure proper permissions

2. **OAuth Not Working**
   - Verify callback URLs in OAuth provider settings
   - Check `NEXTAUTH_URL` is correct
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

## 📚 API Documentation

### Job Management API

```typescript
// Create job
POST /api/jobs
{
  "title": "React Developer",
  "description": "Build amazing apps",
  "platform": "upwork",
  "budget": "$500",
  "skills": ["React", "TypeScript"]
}

// Get jobs with filters
GET /api/jobs?platform=upwork&type=fixed&minBudget=100

// Update job status
PUT /api/jobs/:id
{
  "status": "applied",
  "score": 85
}
```

### Platform Integration API

```typescript
// Sync jobs from platforms
POST /api/platforms/sync
{
  "searchTerms": "React Developer",
  "platforms": ["upwork", "linkedin"]
}

// Get platform stats
GET /api/platforms/stats
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests
5. Submit a pull request

## 📄 License

MIT License - see LICENSE file for details.

## 🙏 Support

For issues and questions:
1. Check the [GitHub Issues](https://github.com/your-repo/job-hunter/issues)
2. Review the [documentation](./docs/)
3. Join our [Discord community](https://discord.gg/your-invite)

---

**Built with ❤️ for freelancers everywhere**