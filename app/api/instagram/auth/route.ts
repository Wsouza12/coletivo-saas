import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getInstagramAuthUrl } from "@/lib/instagram";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  if (session.user.role !== "ADMIN") return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 });

  const url = getInstagramAuthUrl();
  const { searchParams } = new URL(req.url);
  if (searchParams.get("debug") === "1") {
    return NextResponse.json({ url, env: { INSTAGRAM_APP_ID: process.env.INSTAGRAM_APP_ID, META_REDIRECT_URI: process.env.META_REDIRECT_URI } });
  }
  return NextResponse.redirect(url);
}
