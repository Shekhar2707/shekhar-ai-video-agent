#!/usr/bin/env node
/**
 * ShekarAI - YouTube OAuth2 Token Setup (One-Time)
 * Run ONCE locally: node scripts/get-youtube-token.js
 * Follow the URL printed → authorize → paste code → paste refresh_token in .env
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { google } = require('googleapis');
const readline = require('readline');

const oauth2 = new google.auth.OAuth2(
  process.env.YOUTUBE_CLIENT_ID,
  process.env.YOUTUBE_CLIENT_SECRET,
  'urn:ietf:wg:oauth:2.0:oob'
);

const SCOPES = ['https://www.googleapis.com/auth/youtube.upload'];
const url = oauth2.generateAuthUrl({ access_type: 'offline', scope: SCOPES });

console.log('\n════════════════════════════════════════════════');
console.log('  ShekarAI — YouTube OAuth2 Token Setup');
console.log('════════════════════════════════════════════════');
console.log('\n1. Open this URL in browser:\n');
console.log(url);
console.log('\n2. Authorize "Digital Shekhar" channel');
console.log('3. Paste the code below\n');

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
rl.question('Enter authorization code: ', async (code) => {
  try {
    const { tokens } = await oauth2.getToken(code.trim());
    console.log('\n✅ Tokens received!');
    console.log('\nAdd this to your .env file:');
    console.log(`YOUTUBE_REFRESH_TOKEN=${tokens.refresh_token}`);
  } catch (e) {
    console.error('Token exchange failed:', e.message);
  }
  rl.close();
});
