#!/usr/bin/env node
/**
 * ShekarAI - Resource Monitor Script
 * Run: node scripts/monitor.js
 * Shows live server resource status and BookMySalon coexistence check
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const ResourceMonitor = require('../config/resources');
const config = require('../config/config');

async function main() {
  console.log('\n══════════════════════════════════════════════');
  console.log('   ShekarAI — Server Resource Monitor');
  console.log('══════════════════════════════════════════════');

  const status = await ResourceMonitor.getStatus();
  const cfg = config.processing;

  const ramUsedPct = Math.round(status.ram.usedMB / status.ram.totalMB * 100);

  console.log('\n📊 RAM:');
  console.log(`   Total    : ${status.ram.totalMB} MB`);
  console.log(`   Used     : ${status.ram.usedMB} MB (${ramUsedPct}%)`);
  console.log(`   Available: ${status.ram.availableMB} MB`);

  console.log('\n💻 CPU:');
  console.log(`   Cores    : ${status.cpu.cores}`);
  console.log(`   Load     : ${status.cpu.currentLoadPercent}%`);

  const requiredMB = cfg.maxRamMB + cfg.reservedBufferMB + cfg.bookMySalonFloorMB;
  const safeToStart = await ResourceMonitor.isSafeToStart();

  console.log('\n🛡️  BookMySalon Safety Check:');
  console.log(`   BMS approx usage : ~163 MB`);
  console.log(`   Reserved buffer  : ${cfg.reservedBufferMB} MB`);
  console.log(`   Max for ShekarAI : ${cfg.maxRamMB} MB`);
  console.log(`   Total required   : ${requiredMB} MB`);
  console.log(`   Available now    : ${status.ram.availableMB} MB`);
  console.log(`   Safe to start    : ${safeToStart ? '✅ YES' : '❌ NO — insufficient resources'}`);

  const hour = new Date().getHours();
  const inWindow = hour >= cfg.safeHourStart && hour < cfg.safeHourEnd;
  console.log('\n⏰  Scheduling:');
  console.log(`   Safe window      : ${cfg.safeHourStart}:00 AM - ${cfg.safeHourEnd}:00 AM IST`);
  console.log(`   Current hour     : ${hour}:00`);
  console.log(`   In safe window   : ${inWindow ? '✅ YES' : '⚠️  NO (outside preferred window)'}`);

  console.log('\n══════════════════════════════════════════════\n');
  process.exit(0);
}

main().catch(e => { console.error(e.message); process.exit(1); });
