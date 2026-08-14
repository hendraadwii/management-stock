#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="/home/application/management-stock"
APP_DIR="$REPO_DIR/frontend"
APP="stock-app"

cd "$REPO_DIR"

echo "[1/5] Git pull..."
git pull

echo "[2/5] Install dependencies..."
cd "$APP_DIR"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

echo "[3/5] Stop app (biar .next tidak korup saat build)..."
pm2 stop "$APP"

echo "[4/5] Build..."
npm run build

echo "[5/5] Start app via pm2..."
pm2 restart "$APP" --update-env
pm2 save

echo "Selesai. Status:"
pm2 status "$APP"
