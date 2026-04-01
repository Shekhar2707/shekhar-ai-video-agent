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

async function test(name, fn) {
  try {
    await fn();
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
  await test('Config loads without error', () => { require('../config/config'); });
  await test('TEMP_DIR configured', () => { if (!config.paths.temp) throw new Error('not set'); });
  await test('OUTPUT_DIR configured', () => { if (!config.paths.output) throw new Error('not set'); });

  // Test 2: FFmpeg (server-side tools - expected to fail on Windows dev machine)
  console.log('\n🎬 2. FFmpeg Tests  [NOTE: Required on Ubuntu server, not Windows]');
  await test('FFmpeg installed', () => {
    const out = execSync('ffmpeg -version 2>&1').toString();
    if (!out.includes('ffmpeg version')) throw new Error('Not installed - run: apt install ffmpeg on server');
  });
  await test('FFprobe installed', () => {
    execSync('ffprobe -version 2>&1');
  });

  // Test 3: Python + gTTS (server-side - may not be on Windows)
  console.log('\n🐍 3. Python / gTTS Tests  [NOTE: pip3 install gtts needed on server]');
  await test('Python installed', () => {
    execSync(`${config.tts.python} --version 2>&1`);
  });
  await test('gTTS module available', () => {
    execSync(`${config.tts.python} -c "import gtts" 2>&1`);
  });

  // Test 4: Resources
  console.log('\n💻 4. Resource Tests');
  await test('Resource monitor works', async () => {
    const mem = await require('../config/resources').getStatus();
    if (!mem.ram || !mem.cpu) throw new Error('Missing fields');
    console.log(`     RAM available: ${mem.ram.availableMB}MB | CPU: ${mem.cpu.currentLoadPercent}% load | Cores: ${mem.cpu.cores}`);
  });
  await test('RAM check (Server needs 2GB+ free)', async () => {
    const mem = await require('../config/resources').getStatus();
    const needed = config.processing.maxRamMB + config.processing.reservedBufferMB;
    console.log(`     Needed: ${needed}MB | Available: ${mem.ram.availableMB}MB`);
    if (mem.ram.availableMB < needed)
      throw new Error(`Need ${needed}MB free, only ${mem.ram.availableMB}MB available (OK on local Windows dev)`);
  });

  // Test 5: Directories
  console.log('\n📁 5. Directory Tests');
  await test('Temp dir creatable', () => {
    const p = path.join(config.paths.temp, 'test_' + Date.now());
    fs.mkdirSync(p, { recursive: true });
    fs.rmdirSync(p);
  });
  await test('Output dir creatable', () => {
    fs.mkdirSync(config.paths.output, { recursive: true });
  });

  // Test 6: OpenAI key
  console.log('\n🤖 6. OpenAI / API Tests');
  await test('OpenAI API key set in .env', () => {
    if (!config.openai.apiKey || config.openai.apiKey.startsWith('sk-placeholder'))
      throw new Error('Replace OPENAI_API_KEY in .env with your real key');
  });

  console.log('\n══════════════════════════════════════════════');
  console.log(`   Results: ✅ ${passed} passed  ❌ ${failed} failed`);
  console.log('══════════════════════════════════════════════\n');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(e => { console.error(e); process.exit(1); });
