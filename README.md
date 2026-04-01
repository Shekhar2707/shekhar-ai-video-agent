# ShekarAI — Automated Short Film Generator

> 🎬 Generates 10-minute Hindi short films automatically for **Digital Shekhar** YouTube channel.

---

## Features

| Feature | Technology |
|---|---|
| AI Script Generation | OpenAI GPT-4o-mini |
| Hindi Voiceover (TTS) | gTTS (Google TTS, free) |
| Character Animation | FFmpeg Ken Burns + Unsplash images |
| Background Music | Local royalty-free MP3 files |
| Subtitles | Auto-generated .SRT → burned into video |
| Video Encoding | FFmpeg H.264 / 720p / 30fps |
| YouTube Upload | YouTube Data API v3 |
| Scheduling | node-cron (1 AM IST daily) |
| Resource Safety | systeminformation → auto guards BookMySalon |

---

## Server Requirements

- Ubuntu Linux 18.04+
- Node.js 18+
- FFmpeg (`apt install ffmpeg`)
- Python3 + gTTS (`pip3 install gtts pydub`)
- RAM: 2.3 GB available minimum
- Storage: 2 GB free per video (temp + output)

---

## Quick Start

### 1. Clone & Install
```bash
git clone https://github.com/Shekhar2707kya/shekhar-ai-video-agent.git
cd shekhar-ai-video-agent
npm install
pip3 install gtts pydub
```

### 2. Configure
```bash
cp .env.example .env
# Edit .env — add OPENAI_API_KEY at minimum
nano .env
```

### 3. Add Background Music
```bash
# Put royalty-free .mp3 files here — they will be randomly selected
cp your_music.mp3 assets/music/
```

### 4. Test Setup
```bash
node scripts/test.js
```

### 5. Run
```bash
# Start server (with scheduler)
npm start

# Manual video generation
curl -X POST http://localhost:4000/generate \
  -H "Content-Type: application/json" \
  -d '{"topic": "एक गरीब बच्चे की सफलता की कहानी"}'

# Check status
curl http://localhost:4000/health
curl http://localhost:4000/status

# Monitor resources
node scripts/monitor.js
```

---

## Deploy to Ubuntu Server

```bash
# Option A: Direct deploy script
bash scripts/deploy.sh

# Option B: Docker
docker-compose up -d
```

### GitHub Secrets needed for CI/CD:
| Secret | Value |
|---|---|
| `SERVER_HOST` | `178.104.15.106` |
| `SSH_PRIVATE_KEY` | Your SSH private key |
| `SHEKARAI_ENV` | Full .env file contents |

---

## YouTube Setup (One Time)

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create project → Enable **YouTube Data API v3**
3. Create OAuth2 credentials → download (web application type)
4. Add to .env: `YOUTUBE_CLIENT_ID` and `YOUTUBE_CLIENT_SECRET`
5. Run auth helper once:
```bash
node scripts/get-youtube-token.js
```
6. Paste returned `refresh_token` into `.env`

---

## Safety Constraints

| Limit | Value |
|---|---|
| Max RAM per job | 1.5 GB |
| Max CPU usage | 60% |
| Processing window | 12 AM – 5 AM IST |
| Buffer (reserved) | 500 MB |
| BookMySalon floor | 200 MB always free |
| Concurrency | 1 video at a time |

---

## Project Structure

```
shekhar-ai-video-agent/
├── index.js                        ← Main entry & HTTP server
├── config/
│   ├── config.js                   ← All settings
│   ├── resources.js                ← RAM/CPU monitor & guard
│   ├── logger.js                   ← Winston logger
│   └── topics.json                 ← Video topic queue
├── src/
│   ├── agent/
│   │   ├── coordinator.js          ← Pipeline orchestrator (1→8 stages)
│   │   ├── script-generator.js     ← OpenAI Hindi script generation
│   │   └── character-animator.js   ← FFmpeg Ken Burns scene animation
│   ├── video-processor/
│   │   ├── renderer.js             ← Scene concat → raw video
│   │   └── encoder.js              ← Final H.264 encode + subtitles
│   ├── audio-processor/
│   │   ├── voiceover.js            ← Hindi gTTS per scene
│   │   ├── music-mixer.js          ← Voice + BG music mix
│   │   └── subtitle-generator.js   ← SRT file generation
│   └── upload-manager/
│       └── youtube-uploader.js     ← YouTube Data API v3 upload
├── scripts/
│   ├── deploy.sh                   ← SSH deploy to Ubuntu
│   ├── monitor.js                  ← Resource status check
│   ├── test.js                     ← Full test suite
│   └── get-youtube-token.js        ← One-time YouTube OAuth setup
├── assets/
│   └── music/                      ← Place royalty-free .mp3 files here
├── docker/
│   └── Dockerfile
├── docker-compose.yml
└── .github/workflows/deploy.yml    ← Auto-deploy on git push
```

---

## Adding New Topics

Edit `config/topics.json`:
```json
{
  "queue": [
    "आपकी नई कहानी का topic यहाँ",
    "दूसरा topic"
  ],
  "completed": []
}
```
Cron job रात 1 बजे queue का पहला topic pick करेगा।

---

## Monitoring

```bash
# Live resource check
node scripts/monitor.js

# PM2 logs
pm2 logs shekarai-agent

# Log files
tail -f logs/shekarai.log
tail -f logs/error.log
```

---

**Owner:** Shekhar2707kya | **Channel:** Digital Shekhar | **Version:** 1.0.0
