/**
 * ShekarAI - Subtitle Generator
 * Generates SRT subtitle file from script narration + dialogue
 * Timings are estimated based on scene durationSec and character count
 */
const path = require('path');
const fs = require('fs');
const logger = require('../../config/logger');

class SubtitleGenerator {
  /**
   * @param {Object} script  - Full script object
   * @param {Array}  audioPaths - Not used for timing here (we use estimated timing)
   * @param {string} tempDir
   * @returns {string} Path to .srt file
   */
  async generate(script, audioPaths, tempDir) {
    const subtitlePath = path.join(tempDir, 'subtitles.srt');
    const lines = [];
    let index = 1;
    let currentTimeSec = 0;

    for (const scene of script.scenes) {
      const sceneDuration = scene.durationSec || 75;

      // Collect all text blocks for this scene
      const blocks = [];
      if (scene.narration) blocks.push(scene.narration);
      if (scene.dialogue) {
        for (const d of scene.dialogue) {
          blocks.push(`[${d.character}]: ${d.text}`);
        }
      }

      if (blocks.length === 0) {
        currentTimeSec += sceneDuration;
        continue;
      }

      // Distribute scene duration equally among text blocks
      const blockDuration = sceneDuration / blocks.length;

      for (const text of blocks) {
        const start = currentTimeSec;
        const end = currentTimeSec + blockDuration;

        // Split long text into chunks of ≤ 60 chars per subtitle card
        const chunks = this._splitToChunks(text, 60);
        const chunkDuration = blockDuration / chunks.length;
        let chunkStart = start;

        for (const chunk of chunks) {
          const chunkEnd = chunkStart + chunkDuration;
          lines.push(String(index++));
          lines.push(`${this._toSrtTime(chunkStart)} --> ${this._toSrtTime(chunkEnd)}`);
          lines.push(chunk);
          lines.push('');
          chunkStart = chunkEnd;
        }

        currentTimeSec = end;
      }
    }

    fs.writeFileSync(subtitlePath, lines.join('\n'), 'utf8');
    logger.info(`Subtitle file: ${subtitlePath} | ${index - 1} entries`);
    return subtitlePath;
  }

  /** Convert seconds to SRT timestamp format: HH:MM:SS,mmm */
  _toSrtTime(totalSec) {
    const ms = Math.round((totalSec % 1) * 1000).toString().padStart(3, '0');
    const s = Math.floor(totalSec % 60).toString().padStart(2, '0');
    const m = Math.floor((totalSec / 60) % 60).toString().padStart(2, '0');
    const h = Math.floor(totalSec / 3600).toString().padStart(2, '0');
    return `${h}:${m}:${s},${ms}`;
  }

  /** Split text into readable subtitle chunks */
  _splitToChunks(text, maxLen) {
    const words = text.split(' ');
    const chunks = [];
    let current = '';
    for (const word of words) {
      if ((current + ' ' + word).trim().length > maxLen) {
        if (current) chunks.push(current.trim());
        current = word;
      } else {
        current = (current + ' ' + word).trim();
      }
    }
    if (current) chunks.push(current.trim());
    return chunks.length > 0 ? chunks : [text];
  }
}

module.exports = new SubtitleGenerator();
