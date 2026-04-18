import { NextRequest, NextResponse } from "next/server";
import {
	clearSessionCookies,
	getSessionCookieNames,
	setSessionCookies,
} from "@/lib/auth/session";
import { refreshSessionFromCookie } from "@/lib/auth/refresh";
import {
	isAuthPage,
	isProtectedPath,
	shouldBypassProxy,
} from "@/lib/auth/paths";
import { getLoginRedirectPath, isTokenExpired } from "@/lib/auth/token";

export async function proxy(request: NextRequest) {
	const { pathname } = request.nextUrl;

	if (shouldBypassProxy(pathname)) {
		return NextResponse.next();
	}

	const cookieNames = getSessionCookieNames();
	const accessToken = request.cookies.get(cookieNames.access)?.value;
	const refreshToken = request.cookies.get(cookieNames.refresh)?.value;
	const needsRefresh = Boolean(accessToken && isTokenExpired(accessToken));

	if (isAuthPage(pathname)) {
		if (accessToken && !needsRefresh) {
			return NextResponse.redirect(new URL(getLoginRedirectPath(accessToken), request.url));
		}

		if ((needsRefresh || !accessToken) && refreshToken) {
			const refreshed = await refreshSessionFromCookie(request);

			if (refreshed) {
				const response = NextResponse.redirect(
					new URL(getLoginRedirectPath(refreshed.accessToken), request.url),
				);

				setSessionCookies(response, refreshed);
				return response;
			}

			const response = NextResponse.next();
			clearSessionCookies(response);
			return response;
		}

		return NextResponse.next();
	}

	if (!isProtectedPath(pathname)) {
		return NextResponse.next();
	}

	if (!accessToken || needsRefresh) {
		if (refreshToken) {
			const refreshed = await refreshSessionFromCookie(request);

			if (refreshed) {
				const response = NextResponse.next();
				setSessionCookies(response, refreshed);
				return response;
			}
		}

		const response = NextResponse.redirect(new URL("/login", request.url));
		clearSessionCookies(response);
		return response;
	}

	return NextResponse.next();
}

export default proxy;

export const config = {
	matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
