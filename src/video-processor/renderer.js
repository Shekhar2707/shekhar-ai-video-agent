/**
 * ShekarAI - Video Renderer
 * Concatenates all scene video segments into a single raw video file
 * using FFmpeg concat demuxer
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const logger = require('../../config/logger');

class Renderer {
  /**
   * Concatenate all scene video clips into one raw video (no audio).
   * @param {Array<{sceneNumber, videoPath, durationSec}>} frameDirs
   * @param {Object} script  - Used for metadata
   * @param {string} tempDir
   * @returns {string} Path to the concatenated video
   */
  async render(frameDirs, script, tempDir) {
    logger.info(`Rendering ${frameDirs.length} scenes into single video...`);

    // Validate all scene videos exist
    for (const scene of frameDirs) {
      if (!fs.existsSync(scene.videoPath)) {
        throw new Error(`Scene video missing: ${scene.videoPath}`);
      }
    }

    // Build concat list file
    const concatListPath = path.join(tempDir, 'concat.txt');
    const lines = frameDirs
      .sort((a, b) => a.sceneNumber - b.sceneNumber)
      .map(s => `file '${s.videoPath.replace(/'/g, "'\\''")}'`);
    fs.writeFileSync(concatListPath, lines.join('\n'), 'utf8');

    const rawVideoPath = path.join(tempDir, 'raw_video.mp4');
    await this._concat(concatListPath, rawVideoPath);
    logger.info(`Raw video ready | ${rawVideoPath}`);
    return rawVideoPath;
  }

  _concat(concatListPath, outputPath) {
    return new Promise((resolve, reject) => {
      const args = [
        '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', concatListPath,
        '-c', 'copy',
        outputPath,
      ];

      const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
      let stderr = '';
      proc.stderr.on('data', d => { stderr += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0) resolve(outputPath);
        else reject(new Error(`FFmpeg concat failed (exit ${code}): ${stderr.slice(-400)}`));
      });
    });
  }
}

module.exports = new Renderer();
