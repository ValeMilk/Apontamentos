#!/bin/bash
TOKEN=$(curl -s -X POST http://localhost:5551/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin"}' | python3 -c 'import sys,json;print(json.load(sys.stdin)["accessToken"])')

echo "=== SUPERVISORS ==="
curl -s "http://localhost:5551/api/supervisors" \
  -H "Authorization: Bearer $TOKEN" | python3 -c '
import sys,json
data=json.load(sys.stdin)
for s in data:
    print(s.get("_id","?"), s.get("name","?"), s.get("role","?"))
'

# Get Rodney's _id
RODNEY_ID=$(curl -s "http://localhost:5551/api/supervisors" \
  -H "Authorization: Bearer $TOKEN" | python3 -c '
import sys,json
data=json.load(sys.stdin)
for s in data:
    if "rodney" in s.get("name","").lower():
        print(s["_id"])
        break
')

echo ""
echo "=== RODNEY ID: $RODNEY_ID ==="
echo ""
echo "=== EMPLOYEES FOR RODNEY ==="
curl -s "http://localhost:5551/api/employees?supervisorUserId=$RODNEY_ID" \
  -H "Authorization: Bearer $TOKEN" | python3 -c '
import sys,json
data=json.load(sys.stdin)
if isinstance(data, list):
    for e in data:
        print(e.get("id","?"), e.get("name","?"), e.get("role","?"))
elif isinstance(data, dict):
    emps = data.get("employees", [])
    print(f"Total: {data.get(\"total\",0)}")
    for e in emps:
        print(e.get("id","?"), e.get("name","?"), e.get("role","?"))
else:
    print(data)
'
