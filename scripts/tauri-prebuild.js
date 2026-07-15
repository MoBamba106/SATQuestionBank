const fs = require('fs');
const path = require('path');
const api = path.join(__dirname, '..', 'app', 'api');
const bak = path.join(__dirname, '..', 'app', '_api_disabled');
if (fs.existsSync(api)) {
  if (fs.existsSync(bak)) fs.rmSync(bak, { recursive: true, force: true });
  fs.renameSync(api, bak);
  console.log('→ app/api → app/_api_disabled (for static export)');
} else {
  console.log('app/api already disabled');
}
