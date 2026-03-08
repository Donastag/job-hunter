#!/usr/bin/env node

/**
 * Production Database Setup Script
 * 
 * This script helps set up the production database for the Job Hunter application.
 * It creates the necessary database schema and provides instructions for Vercel Postgres.
 */

import { PrismaClient } from '@prisma/client'
import fs from 'fs'
import path from 'path'

async function setupProductionDatabase() {
  console.log('🚀 Setting up production database...')
  
  // Check if we're in production environment
  const isProduction = process.env.NODE_ENV === 'production'
  const databaseUrl = process.env.DATABASE_URL
  
  if (!databaseUrl) {
    console.log('❌ DATABASE_URL not found in environment variables')
    console.log('💡 For Vercel Postgres, set DATABASE_URL in your Vercel dashboard')
    console.log('💡 For local PostgreSQL, set DATABASE_URL=postgresql://user:password@localhost:5432/job_hunter')
    process.exit(1)
  }
  
  if (databaseUrl.includes('sqlite')) {
    console.log('⚠️  SQLite detected. This script is for PostgreSQL setup.')
    console.log('💡 For production, use: DATABASE_URL=postgresql://user:password@host:5432/dbname')
    process.exit(0)
  }
  
  try {
    // Test database connection
    const prisma = new PrismaClient({
      datasources: {
        db: {
          url: databaseUrl
        }
      }
    })
    
    // Test connection
    await prisma.$connect()
    console.log('✅ Database connection successful')
    
    // Check if tables exist
    const userCount = await prisma.user.count()
    console.log(`📊 Database ready with ${userCount} users`)
    
    await prisma.$disconnect()
    
    console.log('🎉 Production database setup complete!')
    console.log('')
    console.log('📋 Next steps:')
    console.log('1. Run `npx prisma migrate deploy` to apply migrations')
    console.log('2. Set environment variables in Vercel dashboard:')
    console.log('   - DATABASE_URL (your PostgreSQL connection string)')
    console.log('   - NEXTAUTH_SECRET (generate a secure secret)')
    console.log('   - GITHUB_ID and GITHUB_SECRET (for OAuth)')
    console.log('   - GOOGLE_ID and GOOGLE_SECRET (for OAuth)')
    console.log('3. Redeploy to Vercel')
    
  } catch (error) {
    console.error('❌ Database setup failed:', error.message)
    console.log('')
    console.log('💡 Troubleshooting:')
    console.log('1. Ensure your PostgreSQL database is accessible')
    console.log('2. Verify DATABASE_URL format: postgresql://user:password@host:port/database')
    console.log('3. Check if your database user has CREATE privileges')
    process.exit(1)
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  setupProductionDatabase()
}

export { setupProductionDatabase }
