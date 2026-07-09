import { NextResponse } from "next/server";
import { getConfig } from "@/lib/evolution";
import { auth } from "@/lib/auth";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const config = await getConfig();
  if (!config) {
    return NextResponse.json({ state: "unconfigured" });
  }

  try {
    const { baseUrl, instance, apiKey } = config;
    const r = await fetch(`${baseUrl}/instance/connectionState/${instance}`, {
      headers: { apikey: apiKey },
      // Cache bust pra ter o dado em tempo real
      cache: "no-store",
    });

    if (!r.ok) {
      return NextResponse.json({ state: "error" });
    }

    const data = await r.json();
    return NextResponse.json({ state: data?.instance?.state || "unknown" });
  } catch (e) {
    return NextResponse.json({ state: "error" });
  }
}
