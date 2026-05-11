#!/bin/bash
set -e

echo "=== [1/7] Frontend typecheck ==="
cd frontend && npm run typecheck
cd ..

echo "=== [2/7] Frontend lint ==="
cd frontend && npm run lint
cd ..

echo "=== [3/7] Frontend build ==="
cd frontend && npm run build
cd ..

echo "=== [4/7] Backend prisma generate ==="
cd backend && npx prisma generate
cd ..

echo "=== [5/7] Backend lint ==="
cd backend && npm run lint
cd ..

echo "=== [6/7] Backend build (tsc via nest build) ==="
cd backend && npm run build
cd ..

echo "=== [7/7] Backend tests ==="
cd backend && npm test
cd ..

echo "✅ All checks passed"
