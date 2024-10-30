import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  // Handle root path redirections and protect routes
  try {
    // Redirect root path to signin page
    if (request.nextUrl.pathname === "/") {
      return NextResponse.redirect(new URL("/signin", request.url));
    }
    
    // Allow all other routes to proceed
    return NextResponse.next();
  } catch (error) {
    // Fallback error handling to prevent middleware crashes
    return NextResponse.next();
  }
}

// Configure middleware to run on all routes except Next.js system routes
export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
