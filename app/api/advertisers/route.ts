import { NextResponse } from "next/server";
import { ADVERTISERS } from "@/lib/advertisers";

export const runtime = "nodejs";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "https://chatgpt.com",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export function GET() {
  return NextResponse.json({ advertisers: ADVERTISERS });
}
