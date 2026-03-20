#!/bin/sh
echo "Running employee seed..."
node dist/scripts/init-seed.js 2>&1 || true
echo "Starting application..."
node dist/index.js
