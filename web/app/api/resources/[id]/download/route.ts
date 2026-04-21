import { NextRequest, NextResponse } from "next/server";
import { getApiUrl } from "@/lib/config";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const backendBaseUrl = getApiUrl();
    const targetUrl = `${backendBaseUrl}/resources/${id}/download`;

    const headers = new Headers();
    headers.set("accept", "*/*");

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

    const backendResponse = await fetch(targetUrl, {
      method: "GET",
      headers,
      cache: "no-store",
    });

    if (!backendResponse.ok) {
      const errorText = await backendResponse.text();
      return new NextResponse(errorText || "Download failed", {
        status: backendResponse.status,
        headers: {
          "content-type":
            backendResponse.headers.get("content-type") || "text/plain",
        },
      });
    }

    const responseHeaders = new Headers();
    responseHeaders.set(
      "content-type",
      backendResponse.headers.get("content-type") || "application/octet-stream"
    );

    const contentDisposition = backendResponse.headers.get("content-disposition");
    if (contentDisposition) {
      responseHeaders.set("content-disposition", contentDisposition);
    }

    const contentLength = backendResponse.headers.get("content-length");
    if (contentLength) {
      responseHeaders.set("content-length", contentLength);
    }

    responseHeaders.set("cache-control", "no-store");

    return new NextResponse(backendResponse.body, {
      status: backendResponse.status,
      headers: responseHeaders,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Download proxy failed";
    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 500 }
    );
  }
}
