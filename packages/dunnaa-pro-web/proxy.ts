import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(req: NextRequest) {
  const token = req.cookies.get("pro_token")?.value;
  const path = req.nextUrl.pathname;
  const protectedPaths = [
    "/dashboard", "/agenda", "/queue", "/check-in", "/qr-code", "/finance",
    "/services", "/products", "/reviews", "/notifications", "/staff", "/settings",
    "/destaque", "/promotions", "/subscriptions", "/onboarding", "/escolha",
    // Módulo B2B (fornecedor / comprador)
    "/fornecedor", "/fornecedores", "/pedidos-fornecedor",
  ];
  const isProtected = protectedPaths.some((p) => path === p || path.startsWith(p + "/"));
  if (isProtected && !token) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
  if ((path === "/" || path === "/login" || path === "/register") && token) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const response = NextResponse.next();

  // Evita HTML antigo (modo dev) preso no CDN/navegador
  if (
    !path.startsWith("/_next") &&
    !path.startsWith("/brand") &&
    !path.includes(".")
  ) {
    response.headers.set("Cache-Control", "no-store, must-revalidate");
  }

  return response;
}

export const config = {
  matcher: [
    "/", "/dashboard", "/agenda", "/queue", "/check-in", "/qr-code", "/finance",
    "/services", "/products", "/reviews", "/notifications", "/staff", "/settings",
    "/destaque", "/promotions", "/subscriptions", "/onboarding", "/escolha",
    "/login", "/register",
    // Módulo B2B + subrotas
    "/fornecedor", "/fornecedor/:path*",
    "/fornecedores", "/fornecedores/:path*",
    "/pedidos-fornecedor", "/pedidos-fornecedor/:path*",
  ],
};
