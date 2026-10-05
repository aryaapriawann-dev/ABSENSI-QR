import Database from "better-sqlite3";
import path from "node:path";

let db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (db) return db;

  const dbPath =
    process.env.SQLITE_PATH || path.join(process.cwd(), "absensi.db");
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK (role IN ('admin', 'petugas')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sesi_absensi (
      id TEXT PRIMARY KEY,
      judul TEXT NOT NULL,
      dibuat TEXT NOT NULL DEFAULT (datetime('now')),
      kedaluwarsa TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS log_hadir (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sesi_id TEXT NOT NULL REFERENCES sesi_absensi(id),
      user_id TEXT NOT NULL,
      nama TEXT NOT NULL DEFAULT '',
      tanggal TEXT NOT NULL,
      waktu TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(sesi_id, user_id, tanggal)
    );
  `);

  return db;
}

export type User = {
  id: number;
  email: string;
  password_hash: string;
  role: "admin" | "petugas";
  created_at: string;
};

export function findUserByEmail(email: string): User | undefined {
  const row = getDb()
    .prepare("SELECT * FROM users WHERE email = ?")
    .get(email.toLowerCase().trim()) as User | undefined;
  return row;
}

export function findUserById(id: number): User | undefined {
  const row = getDb()
    .prepare("SELECT * FROM users WHERE id = ?")
    .get(id) as User | undefined;
  return row;
}

export function createUser(
  email: string,
  passwordHash: string,
  role: "admin" | "petugas"
): User {
  const result = getDb()
    .prepare("INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)")
    .run(email.toLowerCase().trim(), passwordHash, role);
  const user = findUserById(Number(result.lastInsertRowid));
  if (!user) throw new Error("Gagal membuat pengguna");
  return user;
}
