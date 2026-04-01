/**
 * ShekarAI - Central Configuration
 */
const path = require('path');

module.exports = {
  app: {
    port: parseInt(process.env.PORT) || 4000,
    env: process.env.NODE_ENV || 'development',
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
    maxTokens: 3000,
  },

  youtube: {
    clientId: process.env.YOUTUBE_CLIENT_ID,
    clientSecret: process.env.YOUTUBE_CLIENT_SECRET,
    redirectUri: process.env.YOUTUBE_REDIRECT_URI,
    refreshToken: process.env.YOUTUBE_REFRESH_TOKEN,
    channelName: process.env.YOUTUBE_CHANNEL_NAME || 'Digital Shekhar',
    categoryId: process.env.YOUTUBE_CATEGORY_ID || '22', // 22 = People & Blogs
    defaultTags: ['Digital Shekhar', 'ShekarAI', 'Hindi Story', 'AI Generated', 'Short Film'],
  },

  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/shekarai',
  },

  processing: {
    maxRamMB: parseInt(process.env.MAX_RAM_MB) || 1536,
    maxCpuPercent: parseInt(process.env.MAX_CPU_PERCENT) || 60,
    safeHourStart: parseInt(process.env.SAFE_HOUR_START) || 0,
    safeHourEnd: parseInt(process.env.SAFE_HOUR_END) || 5,
    reservedBufferMB: 500,
    bookMySalonFloorMB: 200,
  },

  video: {
    duration: 600,          // 10 minutes in seconds
    fps: 30,
    width: 1280,
    height: 720,
    codec: 'libx264',
    audioCodec: 'aac',
    audioBitrate: '192k',
    videoBitrate: '2500k',
    preset: 'medium',
    crf: 23,
    format: 'mp4',
  },

  paths: {
    temp: process.env.TEMP_DIR || '/tmp/shekarai',
    output: process.env.OUTPUT_DIR || '/var/www/shekarai/output',
    music: process.env.MUSIC_DIR || '/var/www/shekarai/music',
    assets: process.env.ASSETS_DIR || path.join(__dirname, '..', 'assets'),
    scripts: path.join(__dirname, '..', 'scripts'),
  },

  tts: {
    lang: 'hi',           // Hindi
    slow: false,
    python: process.env.PYTHON_BIN || 'python3',
  },
};
