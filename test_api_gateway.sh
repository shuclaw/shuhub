#!/bin/bash
# Test API Gateway

echo "=== Health Check ==="
curl -s http://localhost:3099/health | head -c 200
echo ""

echo -e "\n\n=== Models ==="
curl -s http://localhost:3099/v1/models | head -c 300
echo ""

echo -e "\n\n=== Chat Test ==="
curl -s -X POST http://localhost:3099/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"qwen3-coder-plus","messages":[{"role":"user","content":"Hello"}]}' | head -c 500
echo ""
