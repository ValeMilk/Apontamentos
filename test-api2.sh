#!/bin/bash
TOKEN=$(curl -s -X POST http://localhost:5551/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["accessToken"])')

echo "=== EMPLOYEES FOR RODNEY ==="
curl -s "http://localhost:5551/api/employees?supervisorUserId=69c19d3e604055be2bb89b68" \
  -H "Authorization: Bearer $TOKEN"
