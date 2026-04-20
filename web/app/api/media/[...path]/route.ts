import { NextRequest, NextResponse } from "next/server";
import { getApiUrl } from "@/lib/config";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

function getBackendOrigin(request: NextRequest) {
  try {
    return new URL(getApiUrl()).origin;
  } catch {
    // Supports relative API URL setups by falling back to current origin.
    return request.nextUrl.origin;
  }
}

function pickForwardedHeaders(source: Headers) {
  const headers = new Headers();
  const allowList = [
    "content-type",
    "content-length",
    "cache-control",
    "etag",
    "last-modified",
    "accept-ranges",
    "content-disposition",
  ];

  for (const key of allowList) {
    const value = source.get(key);
    if (value) {
      headers.set(key, value);
    }
  }

  return headers;
}

export async function GET(request: NextRequest, { params }: RouteContext) {
  const resolved = await params;
  const pathSegments = resolved.path ?? [];

  if (pathSegments.length === 0) {
    return NextResponse.json(
      {
        success: false,
        message: "Missing media path",
      },
      { status: 400 },
    );
  }

  if (pathSegments[0] !== "uploads") {
    return NextResponse.json(
      {
        success: false,
        message: "Unsupported media path",
      },
      { status: 404 },
    );
  }

  const encodedPath = pathSegments.map(encodeURIComponent).join("/");
  const query = request.nextUrl.search;
  const upstreamUrl = `${getBackendOrigin(request)}/${encodedPath}${query}`;

  try {
    const upstream = await fetch(upstreamUrl, {
      method: "GET",
      headers: {
        accept: "image/*,*/*",
      },
      cache: "no-store",
    });

    if (!upstream.ok || !upstream.body) {
      return NextResponse.json(
        {
          success: false,
          message: "Media not found",
        },
        { status: upstream.status || 404 },
      );
    }

    return new NextResponse(upstream.body, {
      status: upstream.status,
      headers: pickForwardedHeaders(upstream.headers),
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        message: "Unable to load media",
      },
      { status: 502 },
    );
  }
}
