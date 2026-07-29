import "dotenv/config";
import { closeDatabaseConnections } from "../src/db";
import { ensureSeeded } from "../src/lib/seed";

async function main() {
  try {
    console.log("[db:seed] starting");
    await ensureSeeded();
    console.log("[db:seed] complete");
  } finally {
    await closeDatabaseConnections();
  }
}

main().catch((error) => {
  console.error("[db:seed] failed", error);
  process.exitCode = 1;
});
