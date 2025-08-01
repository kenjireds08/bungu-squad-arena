// Safe logging utility that prevents console spam in production
export const logger = {
  log: (...args: any[]) => {
    if (import.meta.env.DEV || localStorage.getItem('DEBUG') === '1') {
      console.log(...args);
    }
  },
  
  error: (...args: any[]) => {
    if (import.meta.env.DEV || localStorage.getItem('DEBUG') === '1') {
      console.error(...args);
    }
  },
  
  warn: (...args: any[]) => {
    if (import.meta.env.DEV || localStorage.getItem('DEBUG') === '1') {
      console.warn(...args);
    }
  },
  
  info: (...args: any[]) => {
    if (import.meta.env.DEV || localStorage.getItem('DEBUG') === '1') {
      console.info(...args);
    }
  },
  
  debug: (...args: any[]) => {
    if (import.meta.env.DEV || localStorage.getItem('DEBUG') === '1') {
      console.debug(...args);
    }
  }
};

// Throttled logger for frequent logs
export const throttledLog = (() => {
  let lastLog = 0;
  return (...args: any[]) => {
    const now = Date.now();
    if (now - lastLog > 5000) { // Log at most once every 5 seconds
      lastLog = now;
      logger.log(...args);
    }
  };
})();