type JwtPayload = {
  exp?: number;
  role?: string;
};

function normalizeRole(role?: string) {
  return role?.trim().toUpperCase();
}

function decodeJwtPayload(token: string): JwtPayload | null {
  const parts = token.split(".");

  if (parts.length < 2) {
    return null;
  }

  try {
    const base64Url = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64Url.padEnd(Math.ceil(base64Url.length / 4) * 4, "=");
    const json = atob(padded);
    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

export function isTokenExpired(token: string, skewSeconds = 30) {
  const payload = decodeJwtPayload(token);

  if (!payload?.exp) {
    return false;
  }

  return payload.exp * 1000 <= Date.now() + skewSeconds * 1000;
}

export function getLoginRedirectPath(accessToken?: string) {
  const role = normalizeRole(accessToken ? decodeJwtPayload(accessToken)?.role : undefined);
  return role === "ADMIN" || role === "MODERATOR" ? "/admin" : "/";
}
