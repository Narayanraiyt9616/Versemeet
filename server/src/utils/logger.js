export const logger = {
  info: (msg, meta = '') => {
    console.log(`[INFO] [${new Date().toISOString()}] ${msg}`, meta ? meta : '');
  },
  warn: (msg, meta = '') => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${msg}`, meta ? meta : '');
  },
  error: (msg, err = '') => {
    console.error(`[ERROR] [${new Date().toISOString()}] ${msg}`, err ? err : '');
  },
  debug: (msg, meta = '') => {
    if (process.env.DEBUG === 'true') {
      console.log(`[DEBUG] [${new Date().toISOString()}] ${msg}`, meta ? meta : '');
    }
  }
};
