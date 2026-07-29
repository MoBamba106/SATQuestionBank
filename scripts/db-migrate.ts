import "dotenv/config";
import {
  closeDatabaseConnections,
  databaseConnectionInfo,
  databaseKind,
  databaseMigrationConnectionInfo,
  migrateDatabase,
} from "../src/db";

async function main() {
  try {
    console.log(
      `[db:migrate] kind=${databaseKind} runtime=${JSON.stringify(databaseConnectionInfo)} migration=${JSON.stringify(databaseMigrationConnectionInfo)}`,
    );
    await migrateDatabase();
    console.log("[db:migrate] complete");
  } finally {
    await closeDatabaseConnections();
  }
}

main().catch((error) => {
  console.error("[db:migrate] failed", error);
  process.exitCode = 1;
});
