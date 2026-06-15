import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decode } from 'jsonwebtoken';

export function proxy(request: NextRequest) {
    const token = request.cookies.get('access_token')?.value || request.cookies.get('admin_token')?.value;

    const publicPaths = ['/login'];
    const isPublicPath = publicPaths.some((path) => request.nextUrl.pathname.startsWith(path));

    if (!token && !isPublicPath) {
        return NextResponse.redirect(new URL('/login', request.url));
    }

    if (token) {
        try {
            decode(token) as { sub?: string };

            if (isPublicPath) {
                return NextResponse.redirect(new URL('/admin', request.url));
            }

            const role = request.cookies.get('user_role')?.value;

            if (role === 'support') {
                const restrictedPaths = ['/admin/finance', '/admin/settings'];
                if (restrictedPaths.some(path => request.nextUrl.pathname.startsWith(path))) {
                    return NextResponse.redirect(new URL('/admin', request.url));
                }
            }

        } catch {
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
