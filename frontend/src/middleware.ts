import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const publicPaths = ["/login", "/signup", "/reset-password", "/auth/callback", "/taste-quiz"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always refresh session
  const response = await updateSession(request);

  // Allow public paths
  if (publicPaths.some((path) => pathname.startsWith(path))) {
    return response;
  }

  // Check for auth session via cookie presence
  const hasSession = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-") && cookie.name.endsWith("-auth-token"));

  if (!hasSession && pathname !== "/") {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  // Redirect authenticated users to taste quiz if they haven't completed it
  // Check for taste-quiz-complete cookie
  const hasTasteQuizComplete = request.cookies.get("taste-quiz-complete")?.value === "true";

  if (hasSession && !hasTasteQuizComplete && pathname !== "/taste-quiz" && pathname !== "/") {
    const tasteQuizUrl = request.nextUrl.clone();
    tasteQuizUrl.pathname = "/taste-quiz";
    return NextResponse.redirect(tasteQuizUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
