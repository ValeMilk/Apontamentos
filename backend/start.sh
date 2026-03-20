#!/bin/sh
echo "Running employee seed..."
npm run init-seed || true
echo "Starting application..."
node dist/index.js
