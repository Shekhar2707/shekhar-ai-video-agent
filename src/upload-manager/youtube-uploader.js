/**
 * ShekarAI - YouTube Uploader
 * Uploads final video to "Digital Shekhar" channel using YouTube Data API v3
 *
 * First-time setup:
 *  1. Go to: https://console.cloud.google.com → create project → enable YouTube Data API v3
 *  2. Create OAuth2 credentials → download as credentials.json
 *  3. Run: node scripts/get-youtube-token.js   (one-time browser auth)
 *  4. Copy refresh_token to .env YOUTUBE_REFRESH_TOKEN
 */
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');
const config = require('../../config/config');
const logger = require('../../config/logger');

class YoutubeUploader {
  constructor() {
    this._oauth2 = new google.auth.OAuth2(
      config.youtube.clientId,
      config.youtube.clientSecret,
      config.youtube.redirectUri
    );
    if (config.youtube.refreshToken) {
      this._oauth2.setCredentials({ refresh_token: config.youtube.refreshToken });
    }
  }

  /**
   * Upload video to YouTube
   * @param {{ filePath: string, topic: string, jobId: string }} opts
   * @returns {{ videoId: string, url: string }}
   */
  async upload({ filePath, topic, jobId }) {
    if (!config.youtube.clientId || !config.youtube.refreshToken) {
      logger.warn('YouTube credentials not configured — skipping upload (file saved locally)');
      return { videoId: null, url: null, localPath: filePath };
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`Video file not found: ${filePath}`);
    }

    const youtube = google.youtube({ version: 'v3', auth: this._oauth2 });
    const fileSize = fs.statSync(filePath).size;

    const title = `AI Generated - ${topic} - ${new Date().toISOString().slice(0, 10)}`;
    const description = [
      `यह वीडियो ShekarAI द्वारा ऑटोमैटिकली generate किया गया है।`,
      ``,
      `About Digital Shekhar:`,
      `AI-powered Hindi short films, automatically created by ShekarAI.`,
      ``,
      `#DigitalShekhar #ShekarAI #HindiStory #AIGenerated #ShortFilm`,
    ].join('\n');

    logger.info(`Uploading to YouTube | title="${title}" | size=${(fileSize / 1024 / 1024).toFixed(1)}MB`);

    const response = await youtube.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title,
          description,
          tags: config.youtube.defaultTags,
          categoryId: config.youtube.categoryId,
          defaultLanguage: 'hi',
        },
        status: {
          privacyStatus: 'public',
          selfDeclaredMadeForKids: false,
        },
      },
      media: {
        mimeType: 'video/mp4',
        body: fs.createReadStream(filePath),
      },
    }, {
      onUploadProgress: (evt) => {
        const pct = Math.round(evt.bytesRead / fileSize * 100);
        if (pct % 10 === 0) logger.info(`  Upload progress: ${pct}%`);
      },
    });

    const videoId = response.data.id;
    const url = `https://www.youtube.com/watch?v=${videoId}`;
    logger.info(`✅ YouTube upload complete | videoId=${videoId} | ${url}`);
    return { videoId, url };
  }
}

module.exports = new YoutubeUploader();
