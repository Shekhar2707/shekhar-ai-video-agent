/**
 * ShekarAI - Video Encoder
 * Mixes raw video + audio, burns subtitles, encodes to YouTube-ready 720p H.264 MP4
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const config = require('../../config/config');
const logger = require('../../config/logger');

class Encoder {
  /**
   * Final encode pass:
   *  - Mix video with audio
   *  - Burn in subtitles
   *  - Encode to 720p H.264 / AAC
   * @returns {string} Path to final .mp4 file
   */
  async encode({ rawVideoPath, audioPath, subtitlePath, outputDir, jobId }) {
    fs.mkdirSync(outputDir, { recursive: true });

    const date = new Date().toISOString().slice(0, 10);
    const outputFile = path.join(outputDir, `shekarai_${jobId}_${date}.mp4`);

    logger.info(`Encoding final video...`);
    logger.info(`  Input video : ${rawVideoPath}`);
    logger.info(`  Input audio : ${audioPath}`);
    logger.info(`  Subtitles   : ${subtitlePath}`);
    logger.info(`  Output      : ${outputFile}`);

    await this._encode({ rawVideoPath, audioPath, subtitlePath, outputFile });
    logger.info(`Encode complete | ${outputFile}`);
    return outputFile;
  }

  _encode({ rawVideoPath, audioPath, subtitlePath, outputFile }) {
    return new Promise((resolve, reject) => {
      const cfg = config.video;

      // Subtitle filter — escape colons in Windows-style paths
      const escapedSubPath = subtitlePath.replace(/\\/g, '/').replace(/:/g, '\\:');
      const vfFilter = `scale=${cfg.width}:${cfg.height},subtitles='${escapedSubPath}':force_style='FontName=Arial,FontSize=20,PrimaryColour=&Hffffff,OutlineColour=&H000000,Outline=2,Alignment=2'`;

      const args = [
        '-y',
        '-i', rawVideoPath,
        '-i', audioPath,
        '-c:v', cfg.codec,
        '-preset', cfg.preset,
        '-crf', String(cfg.crf),
        '-b:v', cfg.videoBitrate,
        '-vf', vfFilter,
        '-c:a', cfg.audioCodec,
        '-b:a', cfg.audioBitrate,
        '-ar', '44100',
        '-map', '0:v:0',
        '-map', '1:a:0',
        '-shortest',
        '-movflags', '+faststart',   // YouTube optimized
        '-pix_fmt', 'yuv420p',
        outputFile,
      ];

      const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
      let stderr = '';
      proc.stderr.on('data', d => { stderr += d.toString(); });

      // Log FFmpeg progress
      proc.stderr.on('data', (d) => {
        const line = d.toString();
        if (line.includes('time=')) {
          const match = line.match(/time=(\S+)/);
          if (match) logger.info(`  Encoding... ${match[1]}`);
        }
      });

      proc.on('close', (code) => {
        if (code === 0) resolve(outputFile);
        else reject(new Error(`FFmpeg encode failed (exit ${code}): ${stderr.slice(-400)}`));
      });
    });
  }
}

module.exports = new Encoder();
