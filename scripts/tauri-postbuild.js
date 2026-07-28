const fs = require("fs");
const path = require("path");

const api = path.join(__dirname, "..", "src", "app", "api");
const bak = path.join(__dirname, "..", "src", "app", "_api_disabled");

if (fs.existsSync(bak)) {
  if (fs.existsSync(api)) {
    // Prefer keeping the live api tree; drop the backup.
    fs.rmSync(bak, { recursive: true, force: true });
    console.log("→ cleaned leftover src/app/_api_disabled");
  } else {
    fs.renameSync(bak, api);
    console.log("→ restored src/app/api");
  }
}
