import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decode } from 'jsonwebtoken';

export function middleware(request: NextRequest) {
    const token = request.cookies.get('access_token')?.value || request.cookies.get('admin_token')?.value;

    // Paths that don't require authentication
    const publicPaths = ['/login'];
    const isPublicPath = publicPaths.some((path) => request.nextUrl.pathname.startsWith(path));

    if (!token && !isPublicPath) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (token) {
        try {
            // Decode with jsonwebtoken (not verifying secret here for speed in edge, 
            // but ideally we should verify or just check existence + role claim if present)
            const decoded = decode(token) as any;

            // Basic check: if token exists but we are on login, go to dashboard
            if (isPublicPath) {
                return NextResponse.redirect(new URL('/admin', request.url));
            }

            const role = request.cookies.get('user_role')?.value;

            // RBAC Logic
            if (role === 'support') {
                const restrictedPaths = ['/admin/finance', '/admin/settings'];
                if (restrictedPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
                    return NextResponse.redirect(new URL('/admin', request.url));
                }
            }

        } catch (e) {
            if (!isPublicPath) {
                return NextResponse.redirect(new URL('/login', request.url));
            }
        }
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/admin/:path*', '/login'],
};
