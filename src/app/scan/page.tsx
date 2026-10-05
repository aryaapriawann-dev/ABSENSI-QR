"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Camera, KeyboardIcon, CheckCircle2, XCircle, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";

type Status = "idle" | "scanning" | "loading" | "sukses" | "gagal";

interface HasilAbsen {
  ok: boolean;
  pesan: string;
  data?: {
    sesi_id: string;
    user_id: string;
    nama: string;
    tanggal: string;
  };
}

export default function ScanPage() {
  const [mode, setMode] = useState<"kamera" | "manual">("kamera");
  const [status, setStatus] = useState<Status>("idle");
  const [hasil, setHasil] = useState<HasilAbsen | null>(null);
  const [inputToken, setInputToken] = useState("");
  const videoRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<unknown>(null);

  // Kirim token ke API
  const kirimAbsen = useCallback(async (token: string) => {
    setStatus("loading");
    setHasil(null);

    try {
      const res = await fetch("/api/hadir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data: HasilAbsen = await res.json();
      setHasil(data);
      setStatus(data.ok ? "sukses" : "gagal");
    } catch {
      setHasil({ ok: false, pesan: "Gagal terhubung ke server" });
      setStatus("gagal");
    }
  }, []);

  // Start / stop kamera scanner
  useEffect(() => {
    if (mode !== "kamera" || status === "loading" || status === "sukses") return;

    let html5QrCode: InstanceType<typeof import("html5-qrcode").Html5Qrcode> | null = null;
    let mounted = true;

    (async () => {
      const { Html5Qrcode } = await import("html5-qrcode");
      if (!mounted || !videoRef.current) return;

      // Buat container div kalau belum ada
      const containerId = "qr-reader";
      let el = document.getElementById(containerId);
      if (!el) {
        el = document.createElement("div");
        el.id = containerId;
        videoRef.current.appendChild(el);
      }

      html5QrCode = new Html5Qrcode(containerId);
      scannerRef.current = html5QrCode;
      setStatus("scanning");

      try {
        await html5QrCode.start(
          { facingMode: "environment" },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          (decodedText) => {
            // Otomatis kirim saat berhasil scan
            html5QrCode?.stop().catch(() => {});
            kirimAbsen(decodedText);
          },
          () => {} // ignore error per frame
        );
      } catch (err) {
        console.warn("Kamera tidak tersedia:", err);
        if (mounted) setMode("manual");
      }
    })();

    return () => {
      mounted = false;
      if (html5QrCode) {
        html5QrCode.stop().catch(() => {});
        html5QrCode.clear();
      }
    };
  }, [mode, status, kirimAbsen]);

  // Reset
  const reset = () => {
    setStatus("idle");
    setHasil(null);
    setInputToken("");
  };

  return (
    <main className="flex min-h-screen flex-col items-center p-6">
      {/* Header */}
      <div className="w-full max-w-md mb-6">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-slate-400 hover:text-slate-200 transition"
        >
          <ArrowLeft className="h-4 w-4" /> Beranda
        </Link>
        <h1 className="text-2xl font-bold mt-2">Scan QR Absensi</h1>
        <p className="text-slate-400 text-sm mt-1">
          Arahkan kamera ke kode QR atau masukkan token manual.
        </p>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => { reset(); setMode("kamera"); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            mode === "kamera"
              ? "bg-emerald-600 text-white"
              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          }`}
        >
          <Camera className="h-4 w-4" /> Kamera
        </button>
        <button
          onClick={() => { reset(); setMode("manual"); }}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
            mode === "manual"
              ? "bg-emerald-600 text-white"
              : "bg-slate-800 text-slate-400 hover:bg-slate-700"
          }`}
        >
          <KeyboardIcon className="h-4 w-4" /> Manual
        </button>
      </div>

      {/* Scanner / Input area */}
      <div className="w-full max-w-md">
        {/* Status: loading / sukses / gagal */}
        {status === "loading" && (
          <div className="flex flex-col items-center gap-3 py-12">
            <Loader2 className="h-10 w-10 text-emerald-400 animate-spin" />
            <p className="text-slate-400">Memproses absensi...</p>
          </div>
        )}

        {status === "sukses" && hasil && (
          <div className="flex flex-col items-center gap-4 py-8">
            <CheckCircle2 className="h-14 w-14 text-emerald-400" />
            <div className="text-center">
              <p className="text-lg font-semibold text-emerald-300">{hasil.pesan}</p>
              {hasil.data && (
                <div className="mt-3 text-sm text-slate-400 space-y-1">
                  <p>Sesi: {hasil.data.sesi_id}</p>
                  <p>User: {hasil.data.user_id}</p>
                  {hasil.data.nama && <p>Nama: {hasil.data.nama}</p>}
                  <p>Tanggal: {hasil.data.tanggal}</p>
                </div>
              )}
            </div>
            <button
              onClick={reset}
              className="mt-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition"
            >
              Scan Lagi
            </button>
          </div>
        )}

        {status === "gagal" && hasil && (
          <div className="flex flex-col items-center gap-4 py-8">
            <XCircle className="h-14 w-14 text-red-400" />
            <div className="text-center">
              <p className="text-lg font-semibold text-red-300">{hasil.pesan}</p>
            </div>
            <button
              onClick={reset}
              className="mt-2 px-6 py-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-sm transition"
            >
              Coba Lagi
            </button>
          </div>
        )}

        {/* Kamera mode */}
        {mode === "kamera" && (status === "idle" || status === "scanning") && (
          <div className="relative">
            <div
              ref={videoRef}
              className="w-full rounded-xl overflow-hidden border border-slate-800 bg-black min-h-[300px]"
            />
            {status === "scanning" && (
              <div className="absolute bottom-3 left-0 right-0 text-center">
                <span className="text-xs text-emerald-400 bg-black/60 px-3 py-1 rounded-full">
                  Menunggu QR...
                </span>
              </div>
            )}
          </div>
        )}

        {/* Manual mode */}
        {mode === "manual" && (status === "idle" || status === "scanning") && (
          <div className="flex flex-col gap-4">
            <label className="text-sm text-slate-400">Token QR</label>
            <textarea
              value={inputToken}
              onChange={(e) => setInputToken(e.target.value)}
              placeholder="Tempel token QR di sini..."
              className="w-full h-32 rounded-xl border border-slate-800 bg-slate-900 p-4 text-sm font-mono focus:border-emerald-500 focus:outline-none resize-none"
            />
            <button
              onClick={() => {
                if (inputToken.trim()) kirimAbsen(inputToken.trim());
              }}
              disabled={!inputToken.trim()}
              className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed font-medium transition"
            >
              Kirim Absensi
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
