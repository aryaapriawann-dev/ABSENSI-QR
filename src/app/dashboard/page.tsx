import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { QrCode, ShieldCheck, ClipboardList, LogOut } from "lucide-react";

export default async function DashboardPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard");

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <QrCode className="h-6 w-6 text-emerald-400" />
          <h1 className="text-xl font-bold">Dasbor Absensi QR</h1>
        </div>
        <form action="/api/auth/logout" method="post">
          <LogoutButton />
        </form>
      </header>

      <div className="mb-6 rounded-xl border border-zinc-800 bg-zinc-900/60 p-5">
        <p className="text-sm text-zinc-400">Masuk sebagai</p>
        <p className="font-semibold">{user.email}</p>
        <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-600/15 px-3 py-1 text-xs font-medium text-emerald-300">
          <ShieldCheck className="h-3.5 w-3.5" />
          Peran: {user.role === "admin" ? "Admin" : "Petugas"}
        </span>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {user.role === "admin" && (
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
            <ShieldCheck className="mb-2 h-6 w-6 text-emerald-400" />
            <h2 className="font-semibold">Kelola Pengguna</h2>
            <p className="text-sm text-zinc-400">
              Tambah admin &amp; petugas, atur peran dan akses.
            </p>
          </div>
        )}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-5">
          <ClipboardList className="mb-2 h-6 w-6 text-emerald-400" />
          <h2 className="font-semibold">Verifikasi Kehadiran</h2>
          <p className="text-sm text-zinc-400">
            Pindai QR karyawan dan catat kehadiran harian.
          </p>
        </div>
      </div>
    </div>
  );
}

function LogoutButton() {
  return (
    <button
      formAction={async () => {
        "use server";
        const { clearSessionCookie } = await import("@/lib/auth");
        await clearSessionCookie();
        redirect("/login");
      }}
      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-700 px-3 py-1.5 text-sm text-zinc-300 transition hover:border-zinc-500"
    >
      <LogOut className="h-4 w-4" />
      Keluar
    </button>
  );
}
