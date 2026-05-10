#!/bin/bash
set -e

echo "=== [1/3] Frontend typecheck ==="
cd frontend && npm run typecheck
cd ..

echo "=== [2/3] Backend typecheck ==="
cd backend && npm run build
cd ..

echo "=== [3/3] Frontend build ==="
cd frontend && npm run build
cd ..

echo "✅ All checks passed"
