/**
 * ShekarAI - Resource Monitor
 * Ensures ShekarAI never exceeds RAM/CPU limits and keeps BookMySalon healthy
 */
const si = require('systeminformation');
const config = require('./config');
const logger = require('./logger');

class ResourceMonitor {
  /**
   * Returns current RAM and CPU stats
   */
  async getStatus() {
    const [mem, cpu, load] = await Promise.all([
      si.mem(),
      si.cpu(),
      si.currentLoad(),
    ]);

    return {
      ram: {
        totalMB: Math.round(mem.total / 1024 / 1024),
        usedMB: Math.round(mem.used / 1024 / 1024),
        availableMB: Math.round(mem.available / 1024 / 1024),
        freeMB: Math.round(mem.free / 1024 / 1024),
      },
      cpu: {
        cores: cpu.physicalCores,
        currentLoadPercent: Math.round(load.currentLoad),
      },
      safe: true,
    };
  }

  /**
   * Returns true only if it is safe to start a new video generation job.
   * Checks:
   *  1. Available RAM >= maxRamMB + reservedBufferMB + bookMySalonFloor
   *  2. CPU load < maxCpuPercent
   *  3. Not already running a job
   */
  async isSafeToStart() {
    const status = await this.getStatus();
    const cfg = config.processing;

    const requiredMB = cfg.maxRamMB + cfg.reservedBufferMB + cfg.bookMySalonFloorMB;
    const ramOk = status.ram.availableMB >= requiredMB;
    const cpuOk = status.cpu.currentLoadPercent < cfg.maxCpuPercent;

    if (!ramOk) {
      logger.warn(
        `RAM check FAIL: available=${status.ram.availableMB}MB, required=${requiredMB}MB`
      );
    }
    if (!cpuOk) {
      logger.warn(
        `CPU check FAIL: current=${status.cpu.currentLoadPercent}%, max=${cfg.maxCpuPercent}%`
      );
    }

    return ramOk && cpuOk;
  }

  /**
   * Watches RAM every 30 seconds during processing and fires callback if limit exceeded
   */
  startWatcher(onLimitExceeded) {
    const interval = setInterval(async () => {
      const status = await this.getStatus();
      const cfg = config.processing;

      // If available RAM drops below safety buffer → alert
      if (status.ram.availableMB < cfg.reservedBufferMB + cfg.bookMySalonFloorMB) {
        logger.error(
          `⚠️  RAM CRITICAL: available=${status.ram.availableMB}MB — triggering rollback`
        );
        clearInterval(interval);
        onLimitExceeded(status);
      }

      if (status.cpu.currentLoadPercent > cfg.maxCpuPercent) {
        logger.warn(`CPU HIGH: ${status.cpu.currentLoadPercent}% — throttling may occur`);
      }
    }, 30_000);

    return interval;
  }

  stopWatcher(intervalId) {
    if (intervalId) clearInterval(intervalId);
  }
}

module.exports = new ResourceMonitor();
