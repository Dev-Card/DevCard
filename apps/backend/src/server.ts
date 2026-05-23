import './env.js';
import { buildApp } from './app.js';
import { config } from './config.js';

async function start() {
  const app = await buildApp();

  try {
    await app.listen({ port: config.server.port, host: '0.0.0.0' });
    app.log.info(`🚀 DevCard API running at ${config.app.backendUrl}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

start();
