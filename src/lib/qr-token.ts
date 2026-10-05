import * as jose from "jose";

const SECRET = new TextEncoder().encode(
  process.env.QR_SECRET || "absensi-qr-dev-secret-key-32chars!"
);

export interface QrPayload {
  sesi_id: string;
  user_id: string;
  nama: string;
  /** ISO timestamp — batas kedaluwarsa token QR */
  exp_at: string;
}

/**
 * Buat token QR (JWS compact) berisi info absensi.
 * Token berlaku sesuai `exp_at` (maks dari sesi, bukan dari clock).
 */
export async function buatTokenQr(data: QrPayload): Promise<string> {
  const exp = Math.floor(new Date(data.exp_at).getTime() / 1000);
  return new jose.SignJWT({
    sesi_id: data.sesi_id,
    user_id: data.user_id,
    nama: data.nama,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime(exp)
    .setIssuedAt()
    .sign(SECRET);
}

/**
 * Verifikasi token QR. Throw kalau expired / invalid signature.
 * Return payload asli.
 */
export async function verifikasiTokenQr(
  token: string
): Promise<{ sesi_id: string; user_id: string; nama: string }> {
  const { payload } = await jose.jwtVerify(token, SECRET, {
    algorithms: ["HS256"],
  });

  const sesi_id = payload.sesi_id as string;
  const user_id = payload.user_id as string;
  const nama = (payload.nama as string) || "";

  if (!sesi_id || !user_id) {
    throw new Error("Token tidak valid: sesi_id atau user_id kosong");
  }

  return { sesi_id, user_id, nama };
}
