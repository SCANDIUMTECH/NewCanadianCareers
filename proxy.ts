import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PROTECTED_ROUTES = ['/admin', '/company', '/candidate', '/agency']

const AUTH_PAGES = ['/login', '/signup', '/forgot-password', '/reset-password']

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  // Check both plain and __Secure- prefixed cookie names (dev vs production)
  const hasToken = !!(
    request.cookies.get('ncc_has_session')?.value ||
    request.cookies.get('__Secure-ncc_has_session')?.value
  )

  const isProtectedRoute = PROTECTED_ROUTES.some(route => pathname.startsWith(route))
  const isAuthPage = AUTH_PAGES.some(page => pathname.startsWith(page))

  // Redirect unauthenticated users away from protected routes
  if (isProtectedRoute && !hasToken) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirect', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // Redirect authenticated users away from auth pages (login, signup, etc.)
  // Role-based routing is handled client-side after API validates the token.
  // Skip redirect if session_expired flag is set — the user is here because
  // their token was invalidated and they need to re-authenticate.
  if (isAuthPage && hasToken && !request.nextUrl.searchParams.has('session_expired')) {
    return NextResponse.redirect(new URL('/', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (images, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)' ,
  ],
}
