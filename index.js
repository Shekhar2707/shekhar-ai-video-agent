/**
 * ShekarAI - Main Entry Point
 * Automated 10-minute short film generator for "Digital Shekhar" YouTube channel
 */
require('dotenv').config();
const cron = require('node-cron');
const express = require('express');
const { v4: uuidv4 } = require('uuid');

const ResourceMonitor = require('./config/resources');
const VideoCoordinator = require('./src/agent/coordinator');
const logger = require('./config/logger');

const app = express();
const PORT = process.env.PORT || 4000;
app.use(express.json());

// ─────────────────────────────────────────────────────────
// HTTP Endpoints
// ─────────────────────────────────────────────────────────

/** Health check */
app.get('/health', async (req, res) => {
  const resources = await ResourceMonitor.getStatus();
  res.json({
    status: 'ok',
    service: 'ShekarAI',
    version: '1.0.0',
    resources,
    timestamp: new Date().toISOString()
  });
});

/** Manually trigger video generation */
app.post('/generate', async (req, res) => {
  const { topic } = req.body;
  if (!topic) return res.status(400).json({ error: '"topic" field is required' });

  const jobId = uuidv4();
  logger.info(`Manual generate request | jobId=${jobId} | topic="${topic}"`);
  res.json({ message: 'Video generation started', jobId, topic });

  // Run asynchronously — do not block HTTP response
  VideoCoordinator.generate({ topic, jobId }).catch(err =>
    logger.error(`Generation failed | jobId=${jobId} | ${err.message}`)
  );
});

/** Current job status */
app.get('/status', (req, res) => {
  res.json(VideoCoordinator.getStatus());
});

// ─────────────────────────────────────────────────────────
// Scheduled Jobs (IST safe window: 1 AM daily)
// ─────────────────────────────────────────────────────────
cron.schedule('0 1 * * *', async () => {
  const hour = new Date().getHours();
  if (hour < parseInt(process.env.SAFE_HOUR_START ?? 0) ||
      hour >= parseInt(process.env.SAFE_HOUR_END ?? 5)) {
    logger.warn('Cron triggered outside safe window — skipped');
    return;
  }

  const ok = await ResourceMonitor.isSafeToStart();
  if (!ok) {
    logger.warn('Insufficient resources — scheduled generation skipped');
    return;
  }

  // Load next topic from queue
  const topicsFile = require('./config/topics.json');
  const nextTopic = topicsFile.queue?.[0];
  if (!nextTopic) {
    logger.warn('No topics in queue — add topics to config/topics.json');
    return;
  }

  const jobId = uuidv4();
  logger.info(`Scheduled generation | jobId=${jobId} | topic="${nextTopic}"`);
  VideoCoordinator.generate({ topic: nextTopic, jobId }).catch(err =>
    logger.error(`Scheduled job failed | jobId=${jobId} | ${err.message}`)
  );
}, { timezone: 'Asia/Kolkata' });

// ─────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────
app.listen(PORT, () => {
  logger.info(`✅ ShekarAI Agent started on port ${PORT}`);
  logger.info('⏰ Scheduled: 1:00 AM IST daily (12 AM - 5 AM window)');

  if (process.argv.includes('--generate')) {
    const testTopic = process.argv[process.argv.indexOf('--generate') + 1] || 'एक प्रेरणादायक कहानी';
    const jobId = uuidv4();
    logger.info(`CLI generate trigger | topic="${testTopic}"`);
    VideoCoordinator.generate({ topic: testTopic, jobId });
  }
});
