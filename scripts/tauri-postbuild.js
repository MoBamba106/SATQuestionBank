const fs = require("fs");
const path = require("path");

const api = path.join(__dirname, "..", "src", "app", "api");
const bak = path.join(__dirname, "..", "src", "app", "_api_disabled");

if (fs.existsSync(bak) && !fs.existsSync(api)) {
  fs.renameSync(bak, api);
  console.log("→ restored src/app/api");
}
