/**
 * ShekarAI - Music Mixer
 * Mixes all scene voiceover audio segments with background music
 *
 * Strategy:
 * 1. Concatenate all scene audio clips → full voice track
 * 2. Select random background music from /assets/music/
 * 3. Loop music to full duration, reduce volume to 0.12 (12%)
 * 4. Merge voice + music → final mixed_audio.mp3
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const config = require('../../config/config');
const logger = require('../../config/logger');

class MusicMixer {
  /**
   * @param {Array<{sceneNumber, audioPath}>} audioPaths
   * @param {string} tempDir
   * @returns {string} path to mixed audio
   */
  async mix(audioPaths, tempDir) {
    // Step 1: Concatenate all scene audio into full voice track
    const voiceTrackPath = await this._concatAudio(audioPaths, tempDir);
    logger.info(`  Voice track concatenated | ${voiceTrackPath}`);

    // Step 2: Pick background music
    const musicTrack = this._selectMusicTrack();
    if (!musicTrack) {
      logger.warn('  No background music found — using voice-only audio');
      return voiceTrackPath;
    }
    logger.info(`  BG Music: ${path.basename(musicTrack)}`);

    // Step 3: Mix voice + music
    const mixedPath = path.join(tempDir, 'mixed_audio.mp3');
    await this._mixTracks(voiceTrackPath, musicTrack, mixedPath);
    logger.info(`  Mixed audio ready | ${mixedPath}`);
    return mixedPath;
  }

  /** Concatenate ordered scene audios using FFmpeg concat */
  _concatAudio(audioPaths, tempDir) {
    return new Promise((resolve, reject) => {
      const sorted = audioPaths.sort((a, b) => a.sceneNumber - b.sceneNumber);
      const concatFile = path.join(tempDir, 'audio_concat.txt');
      fs.writeFileSync(concatFile,
        sorted.map(a => `file '${a.audioPath.replace(/'/g, "'\\''")}'`).join('\n'), 'utf8');

      const outputPath = path.join(tempDir, 'voice_track.mp3');
      const args = ['-y', '-f', 'concat', '-safe', '0', '-i', concatFile,
                    '-c:a', 'libmp3lame', '-b:a', '192k', outputPath];
      const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
      let err = '';
      proc.stderr.on('data', d => err += d);
      proc.on('close', code => code === 0 ? resolve(outputPath)
        : reject(new Error(`Audio concat failed: ${err.slice(-200)}`)));
    });
  }

  /** Mix voice (100%) + background music (12%) */
  _mixTracks(voicePath, musicPath, outputPath) {
    return new Promise((resolve, reject) => {
      // amix: inputs=2, duration=first (follow voice length), volume 0.12 for music
      const args = [
        '-y',
        '-i', voicePath,
        '-stream_loop', '-1', '-i', musicPath,   // loop music
        '-filter_complex', '[0:a]volume=1.0[v];[1:a]volume=0.12[m];[v][m]amix=inputs=2:duration=first:dropout_transition=2[aout]',
        '-map', '[aout]',
        '-c:a', 'libmp3lame',
        '-b:a', '192k',
        '-ar', '44100',
        outputPath,
      ];

      const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
      let err = '';
      proc.stderr.on('data', d => err += d);
      proc.on('close', code => code === 0 ? resolve(outputPath)
        : reject(new Error(`Audio mix failed: ${err.slice(-200)}`)));
    });
  }

  /** Pick a random .mp3 from assets/music/ directory */
  _selectMusicTrack() {
    const musicDir = path.join(config.paths.assets, 'music');
    if (!fs.existsSync(musicDir)) return null;
    const files = fs.readdirSync(musicDir).filter(f => f.endsWith('.mp3') || f.endsWith('.wav'));
    if (files.length === 0) return null;
    return path.join(musicDir, files[Math.floor(Math.random() * files.length)]);
  }
}

module.exports = new MusicMixer();
