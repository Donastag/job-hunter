import { NextRequest, NextResponse } from 'next/server'

/**
 * Security middleware for production deployment
 */
export class SecurityMiddleware {
  private static readonly ALLOWED_ORIGINS = [
    'https://job-hunter-two-beta.vercel.app',
    'https://your-app.vercel.app'
  ]

  private static readonly RATE_LIMIT_WINDOW = 15 * 60 * 1000 // 15 minutes
  private static readonly MAX_REQUESTS_PER_WINDOW = 100
  private static readonly rateLimitMap = new Map<string, number[]>()

  /**
   * Apply security headers to all responses
   */
  static applySecurityHeaders(response: NextResponse): NextResponse {
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('X-XSS-Protection', '1; mode=block')
    response.headers.set('Referrer-Policy', 'origin-when-cross-origin')
    response.headers.set('Content-Security-Policy', 
      "default-src 'self'; " +
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
      "style-src 'self' 'unsafe-inline'; " +
      "img-src 'self' data: https:; " +
      "font-src 'self' https:; " +
      "connect-src 'self' https:; " +
      "frame-ancestors 'none';"
    )
    response.headers.set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains')
    
    return response
  }

  /**
   * Rate limiting middleware
   */
  static async rateLimit(request: NextRequest): Promise<NextResponse | null> {
    const ip = this.getClientIp(request)
    const now = Date.now()
    const windowStart = now - this.RATE_LIMIT_WINDOW

    // Clean old entries
    if (this.rateLimitMap.has(ip)) {
      const requests = this.rateLimitMap.get(ip)!
      const validRequests = requests.filter(time => time > windowStart)
      this.rateLimitMap.set(ip, validRequests)
    }

    // Check current window requests
    const currentRequests = this.rateLimitMap.get(ip) || []
    if (currentRequests.length >= this.MAX_REQUESTS_PER_WINDOW) {
      return new NextResponse('Too Many Requests', {
        status: 429,
        headers: {
          'Retry-After': '900' // 15 minutes
        }
      })
    }

    // Add current request
    currentRequests.push(now)
    this.rateLimitMap.set(ip, currentRequests)

    return null
  }

  /**
   * CORS middleware
   */
  static handleCors(request: NextRequest): NextResponse | null {
    const origin = request.headers.get('origin')
    
    if (origin && this.ALLOWED_ORIGINS.includes(origin)) {
      const response = NextResponse.next()
      response.headers.set('Access-Control-Allow-Origin', origin)
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS')
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization')
      response.headers.set('Access-Control-Allow-Credentials', 'true')
      
      if (request.method === 'OPTIONS') {
        return new NextResponse(null, { status: 200 })
      }
      
      return response
    }

    return null
  }

  /**
   * Input validation and sanitization
   */
  static sanitizeInput(input: string): string {
    return input
      .replace(/[<>]/g, '') // Remove potential XSS characters
      .trim()
      .slice(0, 1000) // Limit length
  }

  /**
   * Validate email format
   */
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email) && email.length <= 254
  }

  /**
   * Validate URL format
   */
  static isValidUrl(url: string): boolean {
    try {
      const urlObj = new URL(url)
      return ['http:', 'https:'].includes(urlObj.protocol)
    } catch {
      return false
    }
  }

  /**
   * Get client IP address
   */
  private static getClientIp(request: NextRequest): string {
    // Check for forwarded headers first (for reverse proxies)
    const forwarded = request.headers.get('x-forwarded-for')
    if (forwarded) {
      return forwarded.split(',')[0].trim()
    }

    // Check for CF-Connecting-IP (Cloudflare)
    const cfConnectingIp = request.headers.get('cf-connecting-ip')
    if (cfConnectingIp) {
      return cfConnectingIp
    }

    // Fallback to remote address
    return 'unknown'
  }

  /**
   * Log security events
   */
  static logSecurityEvent(event: string, details: any) {
    if (process.env.NODE_ENV === 'production') {
      // In production, send to your logging service
      console.log(`[SECURITY] ${event}:`, JSON.stringify(details))
    } else {
      // In development, just log to console
      console.warn(`[SECURITY] ${event}:`, details)
    }
  }
}

/**
 * Environment validation
 */
export class EnvironmentValidator {
  static validateRequiredEnvVars(): void {
    const requiredVars = [
      'DATABASE_URL',
      'BETTER_AUTH_SECRET',
      'BETTER_AUTH_URL'
    ]

    const missingVars = requiredVars.filter(varName => !process.env[varName])

    if (missingVars.length > 0) {
      throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`)
    }

    // Validate database URL format
    if (process.env.DATABASE_URL && !this.isValidDatabaseUrl(process.env.DATABASE_URL)) {
      throw new Error('Invalid DATABASE_URL format')
    }

    // Validate Better Auth secret strength
    if (process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_SECRET.length < 32) {
      console.warn('[SECURITY] BETTER_AUTH_SECRET should be at least 32 characters long')
    }
  }

  private static isValidDatabaseUrl(url: string): boolean {
    return url.startsWith('postgresql://') || 
           url.startsWith('mysql://') || 
           url.startsWith('sqlite:') ||
           url.startsWith('file:')
  }
}

/**
 * Error handling for production
 */
export class ProductionErrorHandler {
  static handle(error: Error, request: NextRequest): NextResponse {
    // Log the error
    console.error('[ERROR]', error.message, {
      url: request.url,
      method: request.method,
      timestamp: new Date().toISOString()
    })

    // Don't expose error details in production
    if (process.env.NODE_ENV === 'production') {
      return new NextResponse('Internal Server Error', { status: 500 })
    }

    // In development, show error details
    return new NextResponse(error.message, { status: 500 })
  }
}