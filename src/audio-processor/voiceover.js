/**
 * ShekarAI - Hindi Voiceover Generator
 * Generates Hindi TTS audio for each scene using gTTS (Google Text-to-Speech via Python subprocess)
 * gTTS is free and works well for Hindi - no API key required
 *
 * Requires on server: pip3 install gTTS pydub
 */
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const config = require('../../config/config');
const logger = require('../../config/logger');

class VoiceOver {
  /**
   * Generate audio for each scene in the script
   * @returns {Array<{sceneNumber, audioPath, durationSec}>}
   */
  async generateForScript(script, tempDir) {
    const results = [];
    for (const scene of script.scenes) {
      logger.info(`  TTS scene ${scene.sceneNumber}/${script.scenes.length}...`);
      const audioPath = await this.generateAudio(scene, tempDir);
      results.push({
        sceneNumber: scene.sceneNumber,
        audioPath,
        narration: scene.narration,
        dialogue: scene.dialogue || [],
        durationSec: scene.durationSec,
      });
    }
    return results;
  }

  /**
   * Build full text for one scene (narration + dialogue combined)
   */
  _buildSceneText(scene) {
    let text = scene.narration || '';
    if (scene.dialogue && scene.dialogue.length > 0) {
      const dialogueText = scene.dialogue.map(d => `${d.character}: ${d.text}`).join(' ');
      text = `${text} ${dialogueText}`;
    }
    return text.trim();
  }

  /**
   * Run Python gTTS script to generate .mp3 for a scene
   */
  async generateAudio(scene, tempDir) {
    const text = this._buildSceneText(scene);
    const outputPath = path.join(tempDir, `audio_scene_${scene.sceneNumber}.mp3`);

    const pythonScript = `
import sys
from gtts import gTTS
import os

text = sys.argv[1]
output = sys.argv[2]

tts = gTTS(text=text, lang='hi', slow=False)
tts.save(output)
print(f"Saved: {output}")
`;

    const scriptPath = path.join(tempDir, 'tts_helper.py');
    fs.writeFileSync(scriptPath, pythonScript, 'utf8');

    await this._runPython(scriptPath, text, outputPath);
    return outputPath;
  }

  _runPython(scriptPath, text, outputPath) {
    return new Promise((resolve, reject) => {
      const python = config.tts.python;
      const proc = spawn(python, [scriptPath, text, outputPath], {
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      let stderr = '';
      proc.stderr.on('data', d => { stderr += d.toString(); });
      proc.on('close', (code) => {
        if (code === 0 && fs.existsSync(outputPath)) {
          resolve(outputPath);
        } else {
          logger.warn(`gTTS failed (${stderr.slice(0, 200)}) — using silent audio`);
          this._generateSilentAudio(outputPath).then(resolve).catch(reject);
        }
      });
    });
  }

  /** Fallback: generate silent audio of correct duration using FFmpeg */
  _generateSilentAudio(outputPath, durationSec = 75) {
    return new Promise((resolve, reject) => {
      const args = ['-y', '-f', 'lavfi', '-i', `anullsrc=r=44100:cl=stereo`, '-t',
                    String(durationSec), '-c:a', 'libmp3lame', '-b:a', '192k', outputPath];
      const proc = spawn('ffmpeg', args, { stdio: 'ignore' });
      proc.on('close', (code) => code === 0 ? resolve(outputPath) : reject(new Error(`Silent audio failed: ${code}`)));
    });
  }
}

module.exports = new VoiceOver();
