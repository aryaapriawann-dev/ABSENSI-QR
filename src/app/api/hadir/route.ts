import { NextRequest, NextResponse } from "next/server";
import { getDb, seedDemoSesi } from "@/lib/db";
import { verifikasiTokenQr } from "@/lib/qr-token";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

/**
 * POST /api/hadir — butuh login (admin / pegawai)
 * Body: { token: string }
 *
 * Validasi:
 * 1. Token signature + expiry (jose)
 * 2. sesi_id ada di DB
 * 3. Sesi belum kedaluwarsa
 * 4. Belum absen hari ini (unique sesi+user+tanggal)
 */
export async function POST(req: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json(
      { ok: false, pesan: "Belum login" },
      { status: 401 }
    );
  }

  try {
    const body = await req.json();
    const token = body?.token as string;

    if (!token) {
      return NextResponse.json(
        { ok: false, pesan: "Token QR wajib diisi" },
        { status: 400 }
      );
    }

    // 1. Verifikasi tanda tangan + expiry
    let payload: { sesi_id: string; user_id: string; nama: string };
    try {
      payload = await verifikasiTokenQr(token);
    } catch (err) {
      const msg =
        err instanceof Error && err.message.includes("expired")
          ? "QR sudah kedaluwarsa (basi)"
          : "QR tidak valid";
      return NextResponse.json({ ok: false, pesan: msg }, { status: 401 });
    }

    // Seed demo kalau belum
    seedDemoSesi();

    const db = getDb();

    // 2. Cek sesi ada
    const sesi = db
      .prepare("SELECT id, kedaluwarsa FROM sesi_absensi WHERE id = ?")
      .get(payload.sesi_id) as
      | { id: string; kedaluwarsa: string }
      | undefined;

    if (!sesi) {
      return NextResponse.json(
        { ok: false, pesan: "Sesi absensi tidak ditemukan" },
        { status: 404 }
      );
    }

    // 3. Cek sesi belum kedaluwarsa
    if (new Date(sesi.kedaluwarsa) < new Date()) {
      return NextResponse.json(
        { ok: false, pesan: "Sesi absensi sudah berakhir" },
        { status: 410 }
      );
    }

    // 4. Anti-duplikat: unique sesi + user + tanggal (YYYY-MM-DD)
    const tanggal = new Date().toISOString().slice(0, 10);

    try {
      db.prepare(
        "INSERT INTO log_hadir (sesi_id, user_id, nama, tanggal) VALUES (?, ?, ?, ?)"
      ).run(payload.sesi_id, payload.user_id, payload.nama, tanggal);
    } catch (err) {
      if (
        err instanceof Error &&
        err.message.includes("UNIQUE constraint failed")
      ) {
        return NextResponse.json(
          { ok: false, pesan: "Anda sudah absen hari ini pada sesi ini" },
          { status: 409 }
        );
      }
      throw err;
    }

    return NextResponse.json({
      ok: true,
      pesan: "Absensi berhasil dicatat!",
      data: {
        sesi_id: payload.sesi_id,
        user_id: payload.user_id,
        nama: payload.nama,
        tanggal,
      },
    });
  } catch (err) {
    console.error("POST /api/hadir error:", err);
    return NextResponse.json(
      { ok: false, pesan: "Kesalahan server" },
      { status: 500 }
    );
  }
}

/** GET /api/hadir — info endpoint */
export async function GET() {
  return NextResponse.json({
    endpoint: "/api/hadir",
    method: "POST",
    body: "{ token: string }",
    deskripsi: "Kirim token QR untuk mencatat kehadiran",
  });
}
