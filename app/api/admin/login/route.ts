import { NextResponse } from "next/server";
import { createHmac, timingSafeEqual } from "crypto";

function sessionToken() {
  const id = process.env.ADMIN_ID ?? "";
  const password = process.env.ADMIN_PASSWORD ?? "";
  const secret = process.env.ADMIN_SESSION_SECRET ?? "local-dev-secret";
  return createHmac("sha256", secret).update(`${id}:${password}`).digest("hex");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const id = String(body?.id ?? "");
  const password = String(body?.password ?? "");

  const validId = process.env.ADMIN_ID ?? "";
  const validPassword = process.env.ADMIN_PASSWORD ?? "";

  if (!safeEqual(id, validId) || !safeEqual(password, validPassword)) {
    return NextResponse.json({ error: "Invalid admin credentials" }, { status: 401 });
  }

  return NextResponse.json({ token: sessionToken() });
}
