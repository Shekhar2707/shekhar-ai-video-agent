#!/bin/bash
# =============================================
# ShekarAI - Server Deployment Script
# Run: bash scripts/deploy.sh
# Deploys ShekarAI to Ubuntu server
# =============================================

set -e

SERVER="root@178.104.15.106"
APP_DIR="/var/www/shekarai"
REPO="https://github.com/Shekhar2707kya/shekhar-ai-video-agent.git"
PM2_APP="shekarai-agent"

echo "════════════════════════════════════════"
echo "   ShekarAI — Server Deployment"
echo "════════════════════════════════════════"

echo ""
echo "→ [1/7] Installing system dependencies..."
ssh "$SERVER" "
  apt-get update -q &&
  apt-get install -y ffmpeg python3 python3-pip nodejs npm git &&
  pip3 install gtts pydub &&
  echo '✅ System deps done'
"

echo ""
echo "→ [2/7] Setting up directories..."
ssh "$SERVER" "
  mkdir -p ${APP_DIR}/{output,music,assets/music} &&
  chmod 755 ${APP_DIR}/{output,music} &&
  echo '✅ Dirs done'
"

echo ""
echo "→ [3/7] Cloning/pulling repo..."
ssh "$SERVER" "
  if [ -d '${APP_DIR}/app' ]; then
    cd ${APP_DIR}/app && git pull origin main
  else
    git clone ${REPO} ${APP_DIR}/app
  fi &&
  echo '✅ Repo done'
"

echo ""
echo "→ [4/7] Installing Node.js dependencies..."
ssh "$SERVER" "
  cd ${APP_DIR}/app &&
  npm install --production &&
  echo '✅ npm done'
"

echo ""
echo "→ [5/7] Configuring .env..."
echo "⚠️  Remember to set .env on server: scp .env ${SERVER}:${APP_DIR}/app/.env"

echo ""
echo "→ [6/7] Setting up PM2..."
ssh "$SERVER" "
  npm install -g pm2 2>/dev/null || true &&
  cd ${APP_DIR}/app &&
  pm2 describe ${PM2_APP} > /dev/null 2>&1 && pm2 delete ${PM2_APP} || true &&
  pm2 start index.js --name ${PM2_APP} --max-memory-restart 1500M &&
  pm2 save &&
  pm2 startup 2>/dev/null || true &&
  echo '✅ PM2 done'
"

echo ""
echo "→ [7/7] Verifying deployment..."
sleep 3
ssh "$SERVER" "
  pm2 status ${PM2_APP} &&
  curl -s http://localhost:4000/health | head -c 200
"

echo ""
echo "════════════════════════════════════════"
echo "   ✅ ShekarAI deployed successfully!"
echo "   Health: http://178.104.15.106:4000/health"
echo "════════════════════════════════════════"
