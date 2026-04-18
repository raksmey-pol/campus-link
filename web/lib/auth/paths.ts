const AUTH_PAGES = new Set(["/login", "/register"]);
const PROTECTED_PREFIXES = ["/admin"];

export function isAuthPage(pathname: string) {
  return AUTH_PAGES.has(pathname);
}

export function isProtectedPath(pathname: string) {
  return PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export function shouldBypassProxy(pathname: string) {
  if (pathname.startsWith("/api/auth/")) {
    return true;
  }

  return pathname.startsWith("/_next") || pathname === "/favicon.ico";
}
