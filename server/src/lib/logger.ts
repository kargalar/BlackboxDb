export const logger = {
  info: (message: string, data?: any) => {
    console.log(`\x1b[34m[INFO]\x1b[0m ${message}`, data ? data : "");
  },
  success: (message: string, data?: any) => {
    console.log(`\x1b[32m[SUCCESS]\x1b[0m ${message}`, data ? data : "");
  },
  warn: (message: string, data?: any) => {
    console.warn(`\x1b[33m[WARN]\x1b[0m ${message}`, data ? data : "");
  },
  error: (message: string, error?: any) => {
    console.error(`\x1b[31m[ERROR]\x1b[0m ${message}`, error ? error : "");
  },
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV !== "production") {
      console.debug(`\x1b[35m[DEBUG]\x1b[0m ${message}`, data ? data : "");
    }
  },
};
