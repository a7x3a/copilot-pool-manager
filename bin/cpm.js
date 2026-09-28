#!/usr/bin/env node

const path = require('path');
const fs = require('fs');

const distEntry = path.join(__dirname, '..', 'dist', 'cli', 'index.js');

if (fs.existsSync(distEntry)) {
  require(distEntry);
} else {
  // If not built yet, fallback to tsx if available or error with instructions
  try {
    require('tsx/cjs');
    require(path.join(__dirname, '..', 'src', 'cli', 'index.ts'));
  } catch (err) {
    console.error('CPM build not found. Please run "npm run build" first.');
    process.exit(1);
  }
}
