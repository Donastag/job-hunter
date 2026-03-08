import { NextRequest, NextResponse } from 'next/server'
import { SecurityMiddleware, EnvironmentValidator, ProductionErrorHandler } from './lib/security'

export default async function proxy(request: NextRequest) {
  try {
    // Validate environment variables
    EnvironmentValidator.validateRequiredEnvVars()

    // Apply CORS handling
    const corsResponse = SecurityMiddleware.handleCors(request)
    if (corsResponse) {
      return SecurityMiddleware.applySecurityHeaders(corsResponse)
    }

    // Apply rate limiting
    const rateLimitResponse = await SecurityMiddleware.rateLimit(request)
    if (rateLimitResponse) {
      return SecurityMiddleware.applySecurityHeaders(rateLimitResponse)
    }

    // Apply security headers to all responses
    const response = NextResponse.next()
    return SecurityMiddleware.applySecurityHeaders(response)

  } catch (error) {
    return ProductionErrorHandler.handle(error as Error, request)
  }
}

// Configure which paths the proxy should run on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
