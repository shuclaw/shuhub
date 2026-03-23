#!/bin/bash
# Test TeamHub API endpoints

BASE_URL="http://localhost:3005"

echo "=========================================="
echo "TeamHub API Test"
echo "=========================================="

echo -e "\n[1] Health Check"
curl -s "$BASE_URL/health" | head -c 200
echo ""

echo -e "\n[2] Status"
curl -s "$BASE_URL/status" | head -c 200
echo ""

echo -e "\n[3] Ports"
curl -s "$BASE_URL/ports" | head -c 200
echo ""

echo -e "\n[4] Process Task"
curl -s -X POST "$BASE_URL/tasks" \
  -H "Content-Type: application/json" \
  -d '{"message":"测试","userId":"test_user"}' | head -c 500
echo ""

echo -e "\n[5] Intent Classify"
curl -s -X POST "$BASE_URL/intent/classify" \
  -H "Content-Type: application/json" \
  -d '{"message":"帮我写代码"}' | head -c 200
echo ""

echo -e "\n[6] Routing"
curl -s -X POST "$BASE_URL/routing/route" \
  -H "Content-Type: application/json" \
  -d '{"intent":"code","category":"技术开发"}' | head -c 200
echo ""

echo -e "\n=========================================="
echo "Test Complete"
echo "=========================================="
