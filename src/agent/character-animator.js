/**
 * ShekarAI - Character Animator
 * Generates per-scene frame sets using FFmpeg Ken Burns effect on static images.
 * For each scene: creates a 75s video segment from a single image with pan/zoom motion.
 * Image source: Downloads Unsplash images based on scene description, or uses fallback.
 */
const path = require('path');
const fs = require('fs');
const { execSync, spawn } = require('child_process');
const axios = require('axios');
const config = require('../../config/config');
const logger = require('../../config/logger');

class CharacterAnimator {
  /**
   * Animate all scenes in a script
   * Returns array of { sceneNumber, videoPath, durationSec }
   */
  async animateScript(script, tempDir) {
    const results = [];
    for (const scene of script.scenes) {
      logger.info(`  Animating scene ${scene.sceneNumber}/${script.scenes.length}...`);
      const result = await this.animateScene(scene, tempDir);
      results.push(result);
    }
    return results;
  }

  async animateScene(scene, tempDir) {
    const sceneDir = path.join(tempDir, `scene_${scene.sceneNumber}`);
    fs.mkdirSync(sceneDir, { recursive: true });

    // Step 1: Get background image
    const imagePath = path.join(sceneDir, 'background.jpg');
    await this._fetchImage(scene.visualDescription, imagePath);

    // Step 2: Apply Ken Burns (pan + zoom) effect with FFmpeg → scene video
    const videoPath = path.join(sceneDir, 'scene.mp4');
    await this._applyKenBurns(imagePath, videoPath, scene.durationSec);

    return {
      sceneNumber: scene.sceneNumber,
      videoPath,
      durationSec: scene.durationSec,
      mood: scene.mood,
    };
  }

  /**
   * Fetch image from Unsplash (free, no API key for basic usage)
   * Falls back to a gradient if image fetch fails
   */
  async _fetchImage(description, outputPath) {
    // Use only the first 3 words as Unsplash search query (English)
    const query = description.split(' ').slice(0, 5).join('+');
    const url = `https://source.unsplash.com/1280x720/?${encodeURIComponent(query)}`;

    try {
      const response = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout: 15000,
        headers: { 'User-Agent': 'ShekarAI/1.0' },
      });
      fs.writeFileSync(outputPath, Buffer.from(response.data));
      logger.info(`    Image downloaded for scene`);
    } catch (err) {
      logger.warn(`    Image download failed (${err.message}) — using gradient fallback`);
      await this._generateGradientImage(outputPath);
    }
  }

  /** Generate a solid gradient image using FFmpeg as fallback */
  async _generateGradientImage(outputPath) {
    return new Promise((resolve, reject) => {
      const colors = [
        ['0x1a1a2e', '0x16213e'],
        ['0x0f3460', '0x533483'],
        ['0xe94560', '0x0f3460'],
      ];
      const [c1, c2] = colors[Math.floor(Math.random() * colors.length)];
      const args = ['-y', '-f', 'lavfi',
        '-i', `gradients=size=1280x720:x0=0:y0=0:x1=1280:y1=720:c0=${c1}:c1=${c2}`,
        '-frames:v', '1', outputPath];
      const proc = spawn('ffmpeg', args);
      proc.on('close', (code) => code === 0 ? resolve() : reject(new Error(`FFmpeg gradient exit ${code}`)));
    });
  }

  /**
   * Apply Ken Burns effect using FFmpeg zoompan filter
   * zoompan: gradually zooms in (1x → 1.3x) over duration
   */
  async _applyKenBurns(imagePath, outputPath, durationSec) {
    return new Promise((resolve, reject) => {
      const fps = config.video.fps;
      const totalFrames = durationSec * fps;

      // Choose random effect variant
      const effects = [
        `zoompan=z='min(zoom+0.0015,1.5)':d=${totalFrames}:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1280x720:fps=${fps}`,
        `zoompan=z='1.5-on/${totalFrames}*0.5':d=${totalFrames}:x='if(gte(zoom,1.5),x,x+1)':y='if(gte(zoom,1.5),y,y+0.5)':s=1280x720:fps=${fps}`,
        `zoompan=z='1.3':d=${totalFrames}:x='(iw-iw/zoom)/2*on/${totalFrames}':y='ih/2-(ih/zoom/2)':s=1280x720:fps=${fps}`,
      ];
      const zoomFilter = effects[Math.floor(Math.random() * effects.length)];

      const args = [
        '-y',
        '-loop', '1',
        '-i', imagePath,
        '-vf', zoomFilter,
        '-t', String(durationSec),
        '-c:v', 'libx264',
        '-preset', 'fast',
        '-crf', '28',
        '-pix_fmt', 'yuv420p',
        outputPath,
      ];

      const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
      let stderr = '';
      proc.stderr.on('data', d => { stderr += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg Ken Burns failed (exit ${code}): ${stderr.slice(-300)}`));
      });
    });
  }
}

module.exports = new CharacterAnimator();
