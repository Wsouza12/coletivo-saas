import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

const ADMIN_PREFIX = "/admin";
const LOJISTA_PATHS = [
  "/dashboard",
  "/catalogo",
  "/meus-anuncios",
  "/pedidos",
  "/financeiro",
  "/integracoes",
  "/devolucoes",
  "/configuracoes",
];
const PUBLIC_PATHS = ["/", "/login", "/register", "/aguardando-aprovacao"];

export default auth((req) => {
  const { pathname } = req.nextUrl;

  const isPublic =
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/webhooks");

  if (isPublic) return NextResponse.next();

  const session = req.auth;

  const isAdminRoute = pathname.startsWith(ADMIN_PREFIX);
  const isLojistaRoute = LOJISTA_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`)
  );

  if (!isAdminRoute && !isLojistaRoute) return NextResponse.next();

  if (!session?.user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isAdminRoute && session.user.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  if (isLojistaRoute) {
    if (session.user.role !== "LOJISTA") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
    if (session.user.status === "PENDING") {
      return NextResponse.redirect(new URL("/aguardando-aprovacao", req.url));
    }
    if (session.user.status !== "ACTIVE") {
      return NextResponse.redirect(new URL("/login", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
