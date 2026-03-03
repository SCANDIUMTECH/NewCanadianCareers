#!/bin/bash

# Test script for Admin Support endpoints

echo "=== Admin Support Endpoints Test ==="
echo ""

# Get access token
echo "=== Logging in as admin ==="
LOGIN_RESPONSE=$(curl -s -X POST http://localhost/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@orion.com", "password": "admin123"}')

TOKEN=$(echo $LOGIN_RESPONSE | python3 -c "import sys, json; print(json.load(sys.stdin).get('access', ''))")

if [ -z "$TOKEN" ]; then
  echo "Failed to get access token"
  echo $LOGIN_RESPONSE
  exit 1
fi

echo "Access token obtained: ${TOKEN:0:50}..."
echo ""

# Test 1: User search
echo "=== Test 1: User Search ==="
curl -s -X GET "http://localhost/api/admin/support/users/?q=admin" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20
echo ""

# Test 2: User detail
echo "=== Test 2: User Detail (ID: 1) ==="
curl -s -X GET "http://localhost/api/admin/support/users/1/" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -20
echo ""

# Test 3: User timeline
echo "=== Test 3: User Timeline (ID: 1) ==="
curl -s -X GET "http://localhost/api/admin/support/users/1/timeline/" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -15
echo ""

# Test 4: Impersonation status
echo "=== Test 4: Impersonation Status ==="
curl -s -X GET "http://localhost/api/admin/support/impersonate/status/" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo ""

# Test 5: Export jobs list
echo "=== Test 5: Export Jobs List ==="
curl -s -X GET "http://localhost/api/admin/support/export/" \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool
echo ""

echo "=== All tests completed ==="
