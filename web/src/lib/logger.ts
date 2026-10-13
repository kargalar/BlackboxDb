export const logger = {
  info: (message: string, data?: any) => {
    console.log(
      `%c[INFO] %c${message}`,
      'color: #3b82f6; font-weight: bold;',
      'color: inherit;',
      data ? data : ''
    );
  },
  success: (message: string, data?: any) => {
    console.log(
      `%c[SUCCESS] %c${message}`,
      'color: #22c55e; font-weight: bold;',
      'color: inherit;',
      data ? data : ''
    );
  },
  warn: (message: string, data?: any) => {
    console.warn(
      `%c[WARN] %c${message}`,
      'color: #eab308; font-weight: bold;',
      'color: inherit;',
      data ? data : ''
    );
  },
  error: (message: string, error?: any) => {
    console.error(
      `%c[ERROR] %c${message}`,
      'color: #ef4444; font-weight: bold;',
      'color: inherit;',
      error ? error : ''
    );
  },
  debug: (message: string, data?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.debug(
        `%c[DEBUG] %c${message}`,
        'color: #a855f7; font-weight: bold;',
        'color: inherit;',
        data ? data : ''
      );
    }
  },
};
