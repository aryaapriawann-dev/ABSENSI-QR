import { NextRequest, NextResponse } from "next/server";
import { buatTokenQr } from "@/lib/qr-token";
import { seedDemoSesi } from "@/lib/db";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * POST /api/buat-qr — ADMIN ONLY
 * Body: { sesi_id, user_id, nama?, exp_menit? }
 * Buat token QR bertandatangan untuk testing/demo.
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, pesan: "Belum login" },
      { status: 401 }
    );
  }
  if (session.role !== "admin") {
    return NextResponse.json(
      { ok: false, pesan: "Hanya admin yang boleh membuat QR" },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const sesi_id = (body?.sesi_id as string) || "demo-001";
    const user_id = (body?.user_id as string) || "user-001";
    const nama = (body?.nama as string) || "Peserta Demo";
    const exp_menit = Number(body?.exp_menit) || 60;

    // Seed demo sesi
    seedDemoSesi();

    const exp_at = new Date(Date.now() + exp_menit * 60_000).toISOString();
    const token = await buatTokenQr({ sesi_id, user_id, nama, exp_at });

    return NextResponse.json({
      ok: true,
      token,
      info: {
        sesi_id,
        user_id,
        nama,
        kedaluwarsa: exp_at,
      },
    });
  } catch (err) {
    console.error("POST /api/buat-qr error:", err);
    return NextResponse.json(
      { ok: false, pesan: "Gagal membuat token" },
      { status: 500 }
    );
  }
}
