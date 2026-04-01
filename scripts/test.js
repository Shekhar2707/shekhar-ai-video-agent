#!/usr/bin/env node
/**
 * ShekarAI - Test Runner
 * Run: node scripts/test.js
 * Tests: config loading, resource check, FFmpeg availability, Python/gTTS, folder setup
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ResourceMonitor = require('../config/resources');
const config = require('../config/config');

let passed = 0, failed = 0;

function test(name, fn) {
  try {
    const result = fn();
    if (result instanceof Promise) {
      return result
        .then(() => { console.log(`  ✅ ${name}`); passed++; })
        .catch(e => { console.log(`  ❌ ${name}: ${e.message}`); failed++; });
    }
    console.log(`  ✅ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ❌ ${name}: ${e.message}`);
    failed++;
  }
}

async function run() {
  console.log('\n══════════════════════════════════════════════');
  console.log('   ShekarAI — Test Suite');
  console.log('══════════════════════════════════════════════\n');

  // Test 1: Config
  console.log('📋 1. Config Tests');
  test('Config loads without error', () => { require('../config/config'); });
  test('TEMP_DIR configured', () => { if (!config.paths.temp) throw new Error('not set'); });
  test('OUTPUT_DIR configured', () => { if (!config.paths.output) throw new Error('not set'); });

  // Test 2: FFmpeg
  console.log('\n🎬 2. FFmpeg Tests');
  test('FFmpeg installed', () => {
    const out = execSync('ffmpeg -version 2>&1').toString();
    if (!out.includes('ffmpeg version')) throw new Error('FFmpeg not found');
  });
  test('FFprobe installed', () => {
    execSync('ffprobe -version 2>&1');
  });

  // Test 3: Python + gTTS
  console.log('\n🐍 3. Python / gTTS Tests');
  test('Python3 installed', () => {
    execSync(`${config.tts.python} --version 2>&1`);
  });
  test('gTTS module available', () => {
    execSync(`${config.tts.python} -c "import gtts" 2>&1`);
  });

  // Test 4: Resources
  console.log('\n💻 4. Resource Tests');
  await test('Resource monitor works', async () => {
    const status = await ResourceMonitor.getStatus();
    if (!status.ram || !status.cpu) throw new Error('Missing fields');
    console.log(`     RAM available: ${status.ram.availableMB}MB | CPU load: ${status.cpu.currentLoadPercent}%`);
  });
  await test('Server has enough RAM for a job', async () => {
    const status = await ResourceMonitor.getStatus();
    const needed = config.processing.maxRamMB + config.processing.reservedBufferMB;
    if (status.ram.availableMB < needed)
      throw new Error(`Only ${status.ram.availableMB}MB available, need ${needed}MB`);
  });

  // Test 5: Directories
  console.log('\n📁 5. Directory Tests');
  test('Temp dir creatable', () => {
    const p = path.join(config.paths.temp, 'test_' + Date.now());
    fs.mkdirSync(p, { recursive: true });
    fs.rmdirSync(p);
  });
  test('Output dir exists or creatable', () => {
    fs.mkdirSync(config.paths.output, { recursive: true });
  });

  // Test 6: OpenAI (optional)
  console.log('\n🤖 6. OpenAI Tests');
  test('OpenAI API key set in .env', () => {
    if (!config.openai.apiKey || config.openai.apiKey.startsWith('sk-your'))
      throw new Error('Set OPENAI_API_KEY in .env');
  });

  console.log('\n══════════════════════════════════════════════');
  console.log(`   Results: ✅ ${passed} passed  ❌ ${failed} failed`);
  console.log('══════════════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
