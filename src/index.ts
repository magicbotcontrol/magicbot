import { startWorker } from './bootstrap/startWorker.js';

startWorker().catch((error) => {
  console.error('[worker] bootstrap failed:', error);
  process.exit(1);
});
