#!/bin/sh
set -e

echo "==========================================";
echo "🌱 Running employee seed..."
echo "==========================================";

node dist/scripts/seed-employees.js || {
  echo "⚠ Seed script failed, but continuing...";
}

echo "";
echo "==========================================";
echo "🚀 Starting attendance-manager API..."
echo "==========================================";
echo "";

node dist/index.js
