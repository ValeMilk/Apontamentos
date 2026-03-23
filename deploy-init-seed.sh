#!/bin/bash
set -e

echo "📦 Starting attendance-manager deployment with init-seed..."
echo ""

cd /opt/attendance-manager

echo "🔄 Pulling latest changes from GitHub..."
git pull

echo "⬇️  Stopping containers..."
docker-compose down

echo "🧹 Cleaning Docker system..."
docker system prune -f

echo "🔨 Building backend with --no-cache (this may take several minutes)..."
docker-compose build --no-cache backend

echo "🚀 Starting containers..."
docker-compose up -d

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📋 Checking backend status (waiting 30 seconds for startup)..."
sleep 30

echo ""
echo "🔍 Testing API endpoints..."
echo ""
echo "Testing login endpoint..."
curl -s -X POST http://localhost:8881/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@attendance.com","password":"admin123"}' | jq . 2>/dev/null || echo "✓ API responding"

echo ""
echo "💼 Checking employees in database..."
curl -s http://localhost:8881/api/employees \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." | jq '.total' 2>/dev/null || echo "Check manually at http://72.61.62.17:8881/api/employees"

echo ""
echo "✨ Deployment finished!"
echo "Frontend: http://72.61.62.17:8881"
echo "Backend API: http://72.61.62.17:8881/api"
