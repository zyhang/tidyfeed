import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const token = request.cookies.get('auth_token')
  const { pathname } = request.nextUrl
  
  if (pathname.startsWith('/dashboard')) {
    if (!token) {
      return NextResponse.redirect('http://localhost:8787/auth/login/google')
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
