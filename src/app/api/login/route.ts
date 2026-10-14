import { NextResponse } from "next/server";
import { SESSION_COOKIE, checkPassword, sessionToken } from "@/lib/auth";

export async function POST(request: Request) {
  const { password } = await request.json();
  const token = sessionToken();
  if (!token) return NextResponse.json({ ok: true });
  if (!checkPassword(String(password ?? ""))) {
    return NextResponse.json({ error: "That password doesn't match." }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 180,
    path: "/",
  });
  return res;
}
