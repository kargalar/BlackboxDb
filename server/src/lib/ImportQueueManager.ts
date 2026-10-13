import { PrismaClient } from "@prisma/client";
import { logger } from "./logger";

// A simple in-memory queue to process imports sequentially
type JobFunction = () => Promise<void>;

class QueueManager {
  private queue: JobFunction[] = [];
  private isProcessing = false;

  addJob(job: JobFunction): number {
    this.queue.push(job);
    if (!this.isProcessing) {
      void this.processQueue();
    }
    return this.queue.length;
  }

  private async processQueue() {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;

    while (this.queue.length > 0) {
      const nextJob = this.queue.shift();
      if (!nextJob) {
        continue;
      }

      try {
        await nextJob();
      } catch (error) {
        logger.error("[QueueManager] Job failed with error:", error);
      }

      // Brief gap between imports so external API bursts do not stack too aggressively.
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    this.isProcessing = false;
  }
}

export const importQueue = new QueueManager();
