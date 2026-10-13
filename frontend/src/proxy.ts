import { NextRequest, NextResponse } from "next/server";
import { getSession } from "./lib/jwt";

const protectedRoutes = ["/chat", "/documents"];

export async function proxy(request: NextRequest) {
  const session = await getSession();
  const { pathname } = request.nextUrl;
  const isProtectedRoute = protectedRoutes.some(
    (route) =>
      pathname === route ||
      pathname.startsWith(`${route}/`),
  );

  if (!session && isProtectedRoute)
    return NextResponse.redirect(new URL("/", request.url));

  if (session && pathname === "/")
    return NextResponse.redirect(
      new URL("/chat", request.url),
    );

  return NextResponse.next();
}

export const config = {
  matcher:
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
};
