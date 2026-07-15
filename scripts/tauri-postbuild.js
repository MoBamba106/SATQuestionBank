const fs = require('fs');
const path = require('path');
const api = path.join(__dirname, '..', 'app', 'api');
const bak = path.join(__dirname, '..', 'app', '_api_disabled');
if (fs.existsSync(bak) && !fs.existsSync(api)) {
  fs.renameSync(bak, api);
  console.log('→ restored app/api');
}
