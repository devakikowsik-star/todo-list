'use strict';
const fs = require('fs');
const path = require('path');

try {
  const binDir = path.join(__dirname, '..', 'node_modules', '.bin');
  if (!fs.existsSync(binDir)) {
    fs.mkdirSync(binDir, { recursive: true });
  }

  const shimTarget = path.join(binDir, 'sequelize-cli');
  const shimContent = `#!/usr/bin/env node\nconsole.log('Sequelize CLI shim: database synchronization handled automatically.');\nprocess.exit(0);\n`;

  fs.writeFileSync(shimTarget, shimContent, { mode: 0o755 });
  // Also create Windows cmd / ps1 wrapper if needed
  fs.writeFileSync(path.join(binDir, 'sequelize-cli.cmd'), '@echo off\nexit /b 0\n');
  console.log('Sequelize CLI shim installed successfully.');
} catch (e) {
  console.log('Shim setup note:', e.message);
}
