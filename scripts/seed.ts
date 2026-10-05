import { createUser, findUserByEmail, getDb } from "../src/lib/db";
import { hashPassword } from "../src/lib/auth";

const ADMIN_EMAIL = "admin@absensi.test";
const ADMIN_PASSWORD = "Admin123!";

async function main() {
  // Pastikan tabel ada sebelum seed
  getDb();

  const existing = findUserByEmail(ADMIN_EMAIL);
  if (existing) {
    console.log(`Seed: admin sudah ada (${existing.email}, id=${existing.id})`);
    return;
  }

  const passwordHash = await hashPassword(ADMIN_PASSWORD);
  const admin = createUser(ADMIN_EMAIL, passwordHash, "admin");
  console.log(`Seed: admin dibuat (${admin.email}, id=${admin.id})`);
}

main().catch((err) => {
  console.error("Seed gagal:", err);
  process.exit(1);
});
