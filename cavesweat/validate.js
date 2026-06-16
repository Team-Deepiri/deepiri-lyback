#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const { validateConfig } = require('./config.js');

const configPath = process.argv[2] || path.join(__dirname, 'world.json');
const raw = fs.readFileSync(configPath, 'utf8');
const config = JSON.parse(raw);
const errors = validateConfig(config);

if (errors.length) {
  console.error(`Invalid config (${path.basename(configPath)}):`);
  errors.forEach((e) => console.error(`  - ${e}`));
  process.exit(1);
}

console.log(`OK: ${config.name || 'Cavesweat'} (${path.basename(configPath)})`);
