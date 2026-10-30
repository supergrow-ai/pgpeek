import { NextRequest, NextResponse } from "next/server";
import { isLocalRequest } from "@/lib/local-only";

export function proxy(req: NextRequest) {
  if (isLocalRequest(req.headers)) return NextResponse.next();

  return NextResponse.json({ error: "Blocked: this request didn't come from pgpeek." }, { status: 403 });
}

export const config = { matcher: "/api/:path*" };
