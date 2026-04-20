import { NextRequest, NextResponse } from "next/server";
import { getApiUrl } from "@/lib/config";

type ProxyMethod = "GET" | "POST" | "PATCH" | "PUT" | "DELETE";

type ProxyOptions = {
  request: NextRequest;
  method: ProxyMethod;
  path: string;
  searchParams?: URLSearchParams;
  jsonBody?: unknown;
};

type ProxyFormDataOptions = {
  request: NextRequest;
  method: "POST" | "PATCH" | "PUT";
  path: string;
  searchParams?: URLSearchParams;
};

function buildForwardHeaders(request: NextRequest, hasJsonBody: boolean) {
  const headers = new Headers();
  headers.set("accept", "application/json");

  const authorization = request.headers.get("authorization");
  const cookieAccessToken = request.cookies.get("cl_access_token")?.value;

  if (authorization) {
    headers.set("authorization", authorization);
  } else if (cookieAccessToken) {
    headers.set("authorization", `Bearer ${cookieAccessToken}`);
  }

  const cookie = request.headers.get("cookie");
  if (cookie) {
    headers.set("cookie", cookie);
  }

  if (hasJsonBody) {
    headers.set("content-type", "application/json");
  }

  return headers;
}

type ProxyFileOptions = {
  request: NextRequest;
  method: "GET";
  path: string;
  searchParams?: URLSearchParams;
};

export async function proxyBackendJson({
  request,
  method,
  path,
  searchParams,
  jsonBody,
}: ProxyOptions) {
  try {
    const backendBaseUrl = getApiUrl();
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const queryString = searchParams?.toString();
    const targetUrl = `${backendBaseUrl}${normalizedPath}${queryString ? `?${queryString}` : ""}`;

    const response = await fetch(targetUrl, {
      method,
      headers: buildForwardHeaders(request, jsonBody !== undefined),
      body: jsonBody !== undefined ? JSON.stringify(jsonBody) : undefined,
      cache: "no-store",
    });

    const text = await response.text();
    let payload: unknown = null;

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = {
          success: response.ok,
          message: text,
        };
      }
    }

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected BFF proxy error";
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}

export async function proxyBackendFormData({
  request,
  method,
  path,
  searchParams,
}: ProxyFormDataOptions) {
  try {
    const backendBaseUrl = getApiUrl();
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const queryString = searchParams?.toString();
    const targetUrl = `${backendBaseUrl}${normalizedPath}${queryString ? `?${queryString}` : ""}`;

    const formData = await request.formData();

    const response = await fetch(targetUrl, {
      method,
      headers: buildForwardHeaders(request, false),
      body: formData,
      cache: "no-store",
    });

    const text = await response.text();
    let payload: unknown = null;

    if (text) {
      try {
        payload = JSON.parse(text);
      } catch {
        payload = {
          success: response.ok,
          message: text,
        };
      }
    }

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected BFF proxy error";
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}

export async function proxyBackendFile({
  request,
  method,
  path,
  searchParams,
}: ProxyFileOptions) {
  try {
    const backendBaseUrl = getApiUrl();
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const queryString = searchParams?.toString();
    const targetUrl = `${backendBaseUrl}${normalizedPath}${queryString ? `?${queryString}` : ""}`;

    const headers = buildForwardHeaders(request, false);
    headers.set("accept", "text/csv,application/json");

    const response = await fetch(targetUrl, {
      method,
      headers,
      cache: "no-store",
    });

    const passthroughHeaders = new Headers();
    const contentType = response.headers.get("content-type");
    const contentDisposition = response.headers.get("content-disposition");

    if (contentType) {
      passthroughHeaders.set("content-type", contentType);
    }
    if (contentDisposition) {
      passthroughHeaders.set("content-disposition", contentDisposition);
    }

    const body = await response.arrayBuffer();
    return new NextResponse(body, {
      status: response.status,
      headers: passthroughHeaders,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected BFF proxy error";
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 },
    );
  }
}
