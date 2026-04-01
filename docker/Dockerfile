# =============================================
# ShekarAI — Dockerfile
# Multi-stage: installs FFmpeg, Python/gTTS, Node.js
# =============================================
FROM node:20-slim AS base

# System dependencies
RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    wget \
    curl \
    --no-install-recommends \
  && pip3 install --no-cache-dir gtts pydub \
  && apt-get clean \
  && rm -rf /var/lib/apt/lists/*

# App setup
WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

# Create required directories
RUN mkdir -p /tmp/shekarai /var/www/shekarai/output /var/www/shekarai/music /var/www/shekarai/assets/music

EXPOSE 4000

# Memory limit enforced at runtime (Docker --memory flag or PM2)
CMD ["node", "index.js"]
