import { type NextRequest, NextResponse } from 'next/server'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isAuthRoute = pathname.startsWith('/login')
  const isApiRoute = pathname.startsWith('/api')

  // Verifica se existe cookie de sessão Supabase
  const projectRef = process.env.NEXT_PUBLIC_SUPABASE_URL
    ?.replace('https://', '')
    .split('.')[0] ?? ''

  const sessionCookie =
    request.cookies.get(`sb-${projectRef}-auth-token`) ??
    request.cookies.get(`sb-${projectRef}-auth-token.0`)

  const hasSession = !!sessionCookie

  // Rota protegida sem sessão → redireciona para login
  if (!hasSession && !isAuthRoute && !isApiRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Tem sessão e está no login → redireciona para dashboard
  if (hasSession && isAuthRoute) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
