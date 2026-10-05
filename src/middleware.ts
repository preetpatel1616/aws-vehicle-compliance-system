// Runs before every API route and rejects requests without a valid JWT.
// Next.js middleware runs on the Edge runtime, where `jsonwebtoken` does not work,
// so tokens are verified with `jose` (they are still issued by `jsonwebtoken` in /api/login).

import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const publicRoutes = ["/api/login"];

export async function middleware(request: NextRequest) {
  if (publicRoutes.some((route) => request.nextUrl.pathname.startsWith(route))) {
    return NextResponse.next();
  }

  const token = request.headers.get("Authorization")?.split(" ")[1];
  if (!token) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const secret = new TextEncoder().encode(process.env.JWT_SECRET);
    const { payload } = await jwtVerify(token, secret);

    // Pass the caller's identity on to the route handlers.
    const headers = new Headers(request.headers);
    headers.set("x-user-id", String(payload.id));
    headers.set("x-user-role", String(payload.role));
    return NextResponse.next({ request: { headers } });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export const config = {
  matcher: "/api/:path*",
};
