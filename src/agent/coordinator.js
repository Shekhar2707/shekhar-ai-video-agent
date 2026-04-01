/**
 * ShekarAI - Video Generation Coordinator
 * Orchestrates the full pipeline: script → voice → animation → render → encode → upload
 */
const path = require('path');
const fs = require('fs');

const logger = require('../../config/logger');
const config = require('../../config/config');
const ResourceMonitor = require('../../config/resources');
const ScriptGenerator = require('./script-generator');
const CharacterAnimator = require('./character-animator');
const VoiceOver = require('../audio-processor/voiceover');
const MusicMixer = require('../audio-processor/music-mixer');
const SubtitleGenerator = require('../audio-processor/subtitle-generator');
const Renderer = require('../video-processor/renderer');
const Encoder = require('../video-processor/encoder');
const YoutubeUploader = require('../upload-manager/youtube-uploader');

class VideoCoordinator {
  constructor() {
    this._running = false;
    this._currentJob = null;
    this._watcherInterval = null;
  }

  getStatus() {
    return {
      running: this._running,
      job: this._currentJob,
    };
  }

  /**
   * Full pipeline execution
   * @param {{ topic: string, jobId: string }} opts
   */
  async generate({ topic, jobId }) {
    if (this._running) {
      logger.warn(`Job already running (${this._currentJob?.jobId}) — new request rejected`);
      return;
    }

    // ── 0. Resource Check ──────────────────────────────────────
    const safe = await ResourceMonitor.isSafeToStart();
    if (!safe) {
      logger.error('Insufficient resources — generation aborted');
      return;
    }

    this._running = true;
    this._currentJob = { jobId, topic, startedAt: new Date().toISOString(), stage: 'init' };

    const tempDir = path.join(config.paths.temp, jobId);
    fs.mkdirSync(tempDir, { recursive: true });

    // Start resource watcher — auto-rollback if RAM critical
    this._watcherInterval = ResourceMonitor.startWatcher(async (status) => {
      logger.error(`Resource limit hit during job ${jobId} — rolling back`);
      await this._cleanup(tempDir);
      this._running = false;
    });

    try {
      logger.info(`🎬 Pipeline start | jobId=${jobId} | topic="${topic}"`);

      // ── 1. Script Generation ───────────────────────────────
      this._currentJob.stage = 'script';
      logger.info(`[1/8] Generating script...`);
      const script = await ScriptGenerator.generate(topic);
      const scriptPath = path.join(tempDir, 'script.json');
      fs.writeFileSync(scriptPath, JSON.stringify(script, null, 2), 'utf8');
      logger.info(`Script generated | scenes=${script.scenes.length}`);

      // ── 2. Hindi TTS Voiceover ─────────────────────────────
      this._currentJob.stage = 'voiceover';
      logger.info(`[2/8] Generating Hindi voiceover...`);
      const audioPaths = await VoiceOver.generateForScript(script, tempDir);
      logger.info(`Voiceover done | ${audioPaths.length} audio segments`);

      // ── 3. Subtitle Generation ─────────────────────────────
      this._currentJob.stage = 'subtitles';
      logger.info(`[3/8] Generating subtitles...`);
      const subtitlePath = await SubtitleGenerator.generate(script, audioPaths, tempDir);
      logger.info(`Subtitles saved | ${subtitlePath}`);

      // ── 4. Character Animation (image frames) ─────────────
      this._currentJob.stage = 'animation';
      logger.info(`[4/8] Generating character animations...`);
      const frameDirs = await CharacterAnimator.animateScript(script, tempDir);
      logger.info(`Animation done | ${frameDirs.length} scene frame sets`);

      // ── 5. Background Music ────────────────────────────────
      this._currentJob.stage = 'music';
      logger.info(`[5/8] Mixing background music...`);
      const mixedAudioPath = await MusicMixer.mix(audioPaths, tempDir);
      logger.info(`Audio mix done | ${mixedAudioPath}`);

      // ── 6. Video Render ────────────────────────────────────
      this._currentJob.stage = 'render';
      logger.info(`[6/8] Rendering scenes to video...`);
      const rawVideoPath = await Renderer.render(frameDirs, script, tempDir);
      logger.info(`Raw render done | ${rawVideoPath}`);

      // ── 7. Final Encode (720p H.264, subtitles burned in) ──
      this._currentJob.stage = 'encode';
      logger.info(`[7/8] Encoding final video...`);
      const finalVideo = await Encoder.encode({
        rawVideoPath,
        audioPath: mixedAudioPath,
        subtitlePath,
        outputDir: config.paths.output,
        jobId,
      });
      logger.info(`Final encode done | ${finalVideo}`);

      // ── 8. YouTube Upload ──────────────────────────────────
      this._currentJob.stage = 'upload';
      logger.info(`[8/8] Uploading to YouTube...`);
      const uploadResult = await YoutubeUploader.upload({
        filePath: finalVideo,
        topic,
        jobId,
      });
      logger.info(`✅ Upload complete | videoId=${uploadResult.videoId} | url=${uploadResult.url}`);

      this._currentJob.stage = 'done';
      this._currentJob.completedAt = new Date().toISOString();

    } catch (err) {
      logger.error(`Pipeline error at stage "${this._currentJob?.stage}": ${err.message}`, {
        stack: err.stack,
      });
    } finally {
      // Always cleanup temp files
      await this._cleanup(tempDir);
      ResourceMonitor.stopWatcher(this._watcherInterval);
      this._running = false;
      logger.info(`Pipeline finished | jobId=${jobId}`);
    }
  }

  async _cleanup(tempDir) {
    try {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
        logger.info(`Temp dir cleaned | ${tempDir}`);
      }
    } catch (e) {
      logger.warn(`Cleanup warning: ${e.message}`);
    }
  }
}

module.exports = new VideoCoordinator();
