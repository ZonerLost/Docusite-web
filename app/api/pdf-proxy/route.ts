// app/api/pdf-proxy/route.ts
import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs"; // ensure proper streaming & Range support

// Allowlist to avoid open-proxy abuse. Add/remove hosts as needed.
const ALLOWED_HOSTS = new Set([
  "firebasestorage.googleapis.com",
  "storage.googleapis.com",
  "drive.google.com",
  "www.googleapis.com",
]);

export async function GET(req: NextRequest) {
  const fileUrl = req.nextUrl.searchParams.get("url");
  if (!fileUrl) return new NextResponse("Missing url", { status: 400 });

  let target: URL;
  try {
    target = new URL(fileUrl);
  } catch {
    return new NextResponse("Bad url", { status: 400 });
  }

  if (!ALLOWED_HOSTS.has(target.hostname)) {
    return new NextResponse("Host not allowed", { status: 400 });
  }

  // Forward Range header so pdf.js can stream partial content
  const range = req.headers.get("range") || undefined;

  const upstream = await fetch(target.toString(), {
    headers: {
      ...(range ? { range } : {}),
      accept: "application/pdf,*/*",
    },
    redirect: "follow",
    cache: "no-store",
  });

  const res = new NextResponse(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
  });

  // Pass through key headers
  const pass = (k: string) => {
    const v = upstream.headers.get(k);
    if (v) res.headers.set(k, v);
  };
  pass("content-type");
  pass("content-range");
  pass("accept-ranges");
  pass("content-length");
  pass("last-modified");
  pass("etag");
  pass("content-disposition");

  // Let the browser read range headers
  res.headers.set("access-control-allow-origin", "*");
  res.headers.set(
    "access-control-expose-headers",
    "Content-Range, Accept-Ranges, Content-Length, ETag, Last-Modified, Content-Disposition"
  );

  return res;
}
