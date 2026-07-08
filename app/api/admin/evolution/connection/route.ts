import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getConnectionState, getConnectQrCode, logoutInstance } from "@/lib/evolution";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  try {
    const { state } = await getConnectionState();
    let qrCodeBase64 = null;
    
    if (state !== "open") {
      const qrData = await getConnectQrCode();
      qrCodeBase64 = qrData.base64;
    }

    return NextResponse.json({ data: { state, qrCodeBase64 } }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "EVOLUTION_API_ERROR", message: error instanceof Error ? error.message : "Erro desconhecido" } },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 });
  }

  try {
    await logoutInstance();
    return NextResponse.json({ data: { ok: true } }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { error: { code: "EVOLUTION_API_ERROR", message: error instanceof Error ? error.message : "Erro desconhecido" } },
      { status: 500 }
    );
  }
}
