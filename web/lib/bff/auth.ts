export type AuthUserProfile = {
  id: number;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  role: string;
  civicPoints: number;
};

export type AuthResponse = {
  accessToken: string;
  refreshToken: string;
  user: AuthUserProfile;
};

export function getAuthResponse(payload: unknown): Partial<AuthResponse> | null {
  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  if ("accessToken" in payload) {
    return payload as Partial<AuthResponse>;
  }

  if ("data" in payload && typeof payload.data === "object" && payload.data !== null) {
    return payload.data as Partial<AuthResponse>;
  }

  return null;
}

export function extractErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "object" && payload !== null && "message" in payload) {
    const message = payload.message;

    if (typeof message === "string") {
      return message;
    }

    if (Array.isArray(message)) {
      const validationMessages = message.filter((value): value is string => typeof value === "string");

      if (validationMessages.length > 0) {
        return validationMessages.join(", ");
      }
    }
  }

  return fallback;
}
