import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getMlAuthUrl } from "@/lib/mercadolivre";

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "LOJISTA" || !session.user.lojistaId) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  return NextResponse.redirect(getMlAuthUrl(session.user.lojistaId));
}
